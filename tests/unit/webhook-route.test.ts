import { describe,expect,it } from "vitest";
import { readWebhookBody } from "@/lib/webhook-body";

describe("payment webhook body limits",()=>{
 it("preserves the raw body",async()=>{const raw='{ "payment_id": 1, "payment_status": "finished" }';expect(await readWebhookBody(new Request("http://localhost/webhook",{method:"POST",body:raw}))).toBe(raw)});
 it("rejects declared and streamed oversized bodies",async()=>{await expect(readWebhookBody(new Request("http://localhost/webhook",{method:"POST",headers:{"content-length":"70000"},body:"{}"}))).rejects.toThrow();await expect(readWebhookBody(new Request("http://localhost/webhook",{method:"POST",body:"x".repeat(65*1024)}))).rejects.toThrow()});
});
