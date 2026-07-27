import type { EmailFailureDetails, EmailProvider, TransactionalEmail } from "@/lib/email";

type ResendErrorBody = {
  message?: unknown;
  name?: unknown;
  code?: unknown;
  type?: unknown;
  statusCode?: unknown;
};

type ResendResponseBody = {
  id?: unknown;
  data?: { id?: unknown } | null;
  error?: ResendErrorBody | null;
  message?: unknown;
  name?: unknown;
  code?: unknown;
  type?: unknown;
  statusCode?: unknown;
};

function safeString(value: unknown) {
  return typeof value === "string" && value.length <= 500 ? value : undefined;
}

function safeStatus(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : fallback;
}

export class ResendEmailError extends Error {
  readonly safeDetails: Omit<EmailFailureDetails, "operation">;

  constructor(details: Omit<EmailFailureDetails, "operation">) {
    super(details.errorMessage);
    this.name = "ResendEmailError";
    this.safeDetails = details;
  }
}

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  constructor(
    private apiKey: string,
    private from: string
  ) {}

  async send(message: TransactionalEmail) {
    const recipient = message.to.trim().toLowerCase();

    console.log("========== RESEND DEBUG ==========");
    console.log("Recipient:", recipient);
    console.log("From:", this.from);
    console.log("API Key Exists:", !!this.apiKey);
    console.log("API Key Prefix:", this.apiKey.substring(0, 8) + "...");
    console.log("==================================");

    let response: Response;

    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: [recipient],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
        signal: AbortSignal.timeout(8000),
      });

      console.log("RESEND STATUS:", response.status);
      console.log("RESEND STATUS TEXT:", response.statusText);
    } catch (error) {
      console.error("RESEND FETCH FAILED");
      console.error(error);
      throw error;
    }

    const body = await response.json().catch(() => null) as ResendResponseBody | null;

    console.log("RESEND BODY:");
    console.log(JSON.stringify(body, null, 2));

    const providerError = body?.error ?? (!response.ok ? body : null);
    const deliveryId = safeString(body?.data?.id) ?? safeString(body?.id);

    if (!response.ok || providerError || !deliveryId) {
      console.error("RESEND DELIVERY FAILED");
      console.error({
        status: response.status,
        requestId: response.headers.get("x-request-id"),
        body,
      });

      throw new ResendEmailError({
        statusCode: safeStatus(providerError?.statusCode, response.status),
        errorName:
          safeString(providerError?.name) ?? "ResendDeliveryError",
        errorMessage:
          safeString(providerError?.message) ??
          "Resend rejected the email request",
        providerCode: safeString(providerError?.code),
        providerType: safeString(providerError?.type),
        requestId: response.headers.get("x-request-id") ?? undefined,
      });
    }

    console.log("RESEND EMAIL SENT SUCCESSFULLY");
    console.log("Delivery ID:", deliveryId);
  }
}