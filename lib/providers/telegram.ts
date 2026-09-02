import { z } from "zod";

const MAX_RESPONSE_BYTES = 128 * 1024;
const telegramInvite = z
  .object({
    invite_link: z.string().url().refine((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "t.me";
    }),
    name: z.string().max(32).optional(),
    expire_date: z.number().int().positive().optional(),
    member_limit: z.number().int().min(1).max(99_999).optional(),
    is_revoked: z.boolean().optional(),
  })
  .passthrough();
const telegramChat = z.object({
  id: z.number().int(),
  type: z.enum(["private","group","supergroup","channel"]),
}).passthrough();
const rejected = z
  .object({ ok: z.literal(false), error_code: z.number().int().optional() })
  .passthrough();

export type TelegramErrorCode =
  | "TIMEOUT"
  | "NETWORK"
  | "HTTP_4XX"
  | "HTTP_5XX"
  | "RATE_LIMITED"
  | "MALFORMED_JSON"
  | "INVALID_RESPONSE"
  | "API_REJECTED"
  | "RESPONSE_TOO_LARGE";

export class TelegramClientError extends Error {
  readonly name = "TelegramClientError";
  constructor(
    readonly code: TelegramErrorCode,
    readonly statusCode?: number,
  ) {
    super("Telegram access provider request failed");
  }
}

export type CreateTelegramInviteInput = {
  chatId: string;
  name: string;
  expiresAt: Date;
  memberLimit: 1;
};
export type TelegramInvite = {
  inviteUrl: string;
  expiresAt: Date;
  memberLimit: number;
  name: string;
};
export interface TelegramAccessProvider {
  createInvite(input: CreateTelegramInviteInput): Promise<TelegramInvite>;
  revokeInvite(chatId: string, inviteUrl: string): Promise<void>;
  checkChat(chatId: string): Promise<void>;
}

export class TelegramBotClient implements TelegramAccessProvider {
  constructor(
    private readonly token: string,
    private readonly timeoutMs = 10_000,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async request<T>(method: string, body: Record<string, unknown>, resultSchema: z.ZodType<T>):Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      let response: Response;
      try {
        response = await this.fetchImpl(
          `https://api.telegram.org/bot${this.token}/${method}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
          },
        );
      } catch (error) {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError"))
          throw new TelegramClientError("TIMEOUT");
        throw new TelegramClientError("NETWORK");
      }
      if (!response.ok)
        throw new TelegramClientError(
          response.status === 429
            ? "RATE_LIMITED"
            : response.status >= 500
              ? "HTTP_5XX"
              : "HTTP_4XX",
          response.status,
        );
      const declared = response.headers.get("content-length");
      if (declared && Number(declared) > MAX_RESPONSE_BYTES)
        throw new TelegramClientError("RESPONSE_TOO_LARGE");
      let text: string;
      try {
        text = await response.text();
      } catch {
        throw new TelegramClientError(controller.signal.aborted ? "TIMEOUT" : "NETWORK");
      }
      if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES)
        throw new TelegramClientError("RESPONSE_TOO_LARGE");
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new TelegramClientError("MALFORMED_JSON");
      }
      const denied = rejected.safeParse(json);
      if (denied.success)
        throw new TelegramClientError(
          denied.data.error_code === 429 ? "RATE_LIMITED" : "API_REJECTED",
          denied.data.error_code,
        );
      const envelope = z.object({ ok: z.literal(true), result: z.unknown() }).safeParse(json);
      if (!envelope.success) throw new TelegramClientError("INVALID_RESPONSE");
      const result = resultSchema.safeParse(envelope.data.result);
      if (!result.success) throw new TelegramClientError("INVALID_RESPONSE");
      return result.data;
    } finally {
      clearTimeout(timer);
    }
  }

  async createInvite(input: CreateTelegramInviteInput): Promise<TelegramInvite> {
    const expireDate = Math.floor(input.expiresAt.getTime() / 1000);
    const result = await this.request("createChatInviteLink", {
      chat_id: input.chatId,
      name: input.name,
      expire_date: expireDate,
      member_limit: input.memberLimit,
    },telegramInvite);
    if (
      result.name !== input.name ||
      result.expire_date !== expireDate ||
      result.member_limit !== input.memberLimit ||
      result.is_revoked === true
    )
      throw new TelegramClientError("INVALID_RESPONSE");
    return {
      inviteUrl: result.invite_link,
      expiresAt: new Date(result.expire_date * 1000),
      memberLimit: result.member_limit,
      name: result.name,
    };
  }

  async revokeInvite(chatId: string, inviteUrl: string) {
    const result = await this.request("revokeChatInviteLink", {
      chat_id: chatId,
      invite_link: inviteUrl,
    },telegramInvite);
    if (!result.is_revoked) throw new TelegramClientError("INVALID_RESPONSE");
  }

  async checkChat(chatId:string){await this.request("getChat",{chat_id:chatId},telegramChat)}
}
