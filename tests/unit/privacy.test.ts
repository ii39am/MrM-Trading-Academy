import { describe,expect,it } from "vitest";
import { requestDeviceContext } from "@/lib/request-security";
import { sanitizeAuditMetadata } from "@/lib/audit";
describe("privacy controls",()=>{
 it("stores masked and keyed IP data only from a trusted proxy",()=>{process.env.TRUST_PROXY="true";const request=new Request("http://localhost",{headers:{"x-nf-client-connection-ip":"203.0.113.42","user-agent":"Mozilla/5.0 (Windows NT 10.0) Chrome/120.0"}});const context=requestDeviceContext(request);expect(context.maskedIp).toBe("203.0.x.x");expect(context.ipHash).toMatch(/^[a-f0-9]{64}$/);expect(context.ipHash).not.toContain("203.0.113.42");expect(context.userAgentSummary).toBe("Chrome on Windows")});
 it("removes secret-like audit metadata",()=>expect(sanitizeAuditMetadata({purchaseId:"p1",password:"secret",telegramUrl:"https://t.me/private",token:"raw"})).toEqual({purchaseId:"p1"}));
});
