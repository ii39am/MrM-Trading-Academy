import { afterEach,describe,expect,it,vi } from "vitest";
import { TelegramBotClient } from "@/lib/providers/telegram";

const token="123456789:abcdefghijklmnopqrstuvwxyz_ABCDEF";
const input={chatId:"-1001234567890",name:"course-abcd-grant-efgh",expiresAt:new Date("2030-01-01T00:15:00.000Z"),memberLimit:1 as const};
const result={invite_link:"https://t.me/+temporary-secret",name:input.name,expire_date:Math.floor(input.expiresAt.getTime()/1000),member_limit:1,is_revoked:false};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
afterEach(()=>vi.restoreAllMocks());

describe("Telegram Bot API client",()=>{
 it("uses createChatInviteLink with the server chat, 15-minute expiry, member limit one, and safe name",async()=>{const fetchMock=vi.fn().mockResolvedValue(json({ok:true,result})),client=new TelegramBotClient(token,1000,fetchMock);await expect(client.createInvite(input)).resolves.toEqual({inviteUrl:result.invite_link,expiresAt:input.expiresAt,memberLimit:1,name:input.name});expect(fetchMock).toHaveBeenCalledWith(`https://api.telegram.org/bot${token}/createChatInviteLink`,expect.objectContaining({method:"POST"}));expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({chat_id:input.chatId,name:input.name,expire_date:result.expire_date,member_limit:1})});
 it("supports revocation with the official method",async()=>{const fetchMock=vi.fn().mockResolvedValue(json({ok:true,result:{...result,is_revoked:true}})),client=new TelegramBotClient(token,1000,fetchMock);await client.revokeInvite(input.chatId,result.invite_link);expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({chat_id:input.chatId,invite_link:result.invite_link})});
 it.each([
  ["malformed JSON",new Response("not-json",{status:200}),"MALFORMED_JSON"],
  ["HTTP 400",json({ok:false},400),"HTTP_4XX"],
  ["HTTP 401",json({ok:false},401),"HTTP_4XX"],
  ["HTTP 429",json({ok:false},429),"RATE_LIMITED"],
  ["HTTP 500",json({ok:false},500),"HTTP_5XX"],
  ["Telegram ok false",json({ok:false,error_code:400,description:"token-sensitive detail"}),"API_REJECTED"],
 ] as const)("handles %s without leaking response or token",async(_,response,code)=>{const client=new TelegramBotClient(token,1000,vi.fn().mockResolvedValue(response));const promise=client.createInvite(input);await expect(promise).rejects.toMatchObject({code,message:"Telegram access provider request failed"});await expect(promise).rejects.not.toThrow(/token-sensitive|123456789/)});
 it.each([
  ["invalid URL",{ok:true,result:{...result,invite_link:"http://t.me/+unsafe"}}],
  ["wrong member limit",{ok:true,result:{...result,member_limit:2}}],
  ["wrong expiry",{ok:true,result:{...result,expire_date:result.expire_date+60}}],
  ["wrong name",{ok:true,result:{...result,name:"wrong-name"}}],
 ] as const)("rejects provider response with %s",async(label,body)=>{expect(label).toBeTruthy();const client=new TelegramBotClient(token,1000,vi.fn().mockResolvedValue(json(body)));await expect(client.createInvite(input)).rejects.toMatchObject({code:"INVALID_RESPONSE"})});
 it("times out through AbortController",async()=>{const fetchMock=vi.fn((_url:unknown,init?:RequestInit)=>new Promise((_resolve,reject)=>init?.signal?.addEventListener("abort",()=>reject(new DOMException("Aborted","AbortError"))))),client=new TelegramBotClient(token,5,fetchMock as typeof fetch);await expect(client.createInvite(input)).rejects.toMatchObject({code:"TIMEOUT"})});
 it("maps network failures safely",async()=>{const client=new TelegramBotClient(token,1000,vi.fn().mockRejectedValue(new TypeError("DNS token detail")));await expect(client.createInvite(input)).rejects.toMatchObject({code:"NETWORK",message:"Telegram access provider request failed"})});
});
