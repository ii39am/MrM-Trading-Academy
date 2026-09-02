import { beforeEach,describe,expect,it,vi } from "vitest";

const mocks=vi.hoisted(()=>{class AccessError extends Error{constructor(readonly code:string){super("access error")}}return {user:vi.fn(),sameOrigin:vi.fn(),issue:vi.fn(),findCourse:vi.fn(),AccessError}});
vi.mock("@/lib/auth",()=>({getSessionUser:mocks.user}));
vi.mock("@/lib/db",()=>({db:{course:{findUnique:mocks.findCourse}}}));
vi.mock("@/lib/security",async()=>{const actual=await vi.importActual<typeof import("@/lib/security")>("@/lib/security");return {...actual,verifySameOrigin:mocks.sameOrigin}});
vi.mock("@/lib/telegram-access",()=>({CourseAccessError:mocks.AccessError,issueCourseAccess:mocks.issue}));
import { POST } from "@/app/api/courses/[slug]/access/route";
import { GET as legacyGet } from "@/app/api/purchases/[id]/access/route";
import { CourseAccessError } from "@/lib/telegram-access";

const params={params:Promise.resolve({slug:"secure-course"})},request=()=>new Request("http://localhost:3000/api/courses/secure-course/access",{method:"POST",headers:{origin:"http://localhost:3000","Content-Type":"application/json"},body:JSON.stringify({userId:"attacker",purchaseId:"other",telegramChatId:"@other"})});
beforeEach(()=>{mocks.sameOrigin.mockReturnValue(true);mocks.user.mockResolvedValue({id:"user-1",status:"ACTIVE",emailVerified:true});mocks.findCourse.mockResolvedValue({id:"course-internal-1"});mocks.issue.mockResolvedValue({grantId:"grant-1",inviteUrl:"https://t.me/+temporary",expiresAt:new Date("2030-01-01T00:15:00.000Z")})});

describe("secure course access route",()=>{
 it("denies unauthenticated and cross-origin requests",async()=>{mocks.user.mockResolvedValue(null);expect((await POST(request(),params)).status).toBe(401);mocks.sameOrigin.mockReturnValue(false);expect((await POST(request(),params)).status).toBe(403);expect(mocks.issue).not.toHaveBeenCalled()});
 it("resolves the route slug and uses only the internal course ID with the session user",async()=>{const response=await POST(request(),params);expect(response.status).toBe(200);expect(mocks.findCourse).toHaveBeenCalledWith({where:{slug:"secure-course"},select:{id:true}});expect(mocks.issue).toHaveBeenCalledWith("user-1","course-internal-1");const body=JSON.stringify(await response.json());expect(body).toContain("https://t.me/+temporary");expect(body).not.toMatch(/bot.?token|telegramChatId|purchaseId|userId/i)});
 it("fails closed for an unknown slug without invoking entitlement logic",async()=>{mocks.findCourse.mockResolvedValue(null);const response=await POST(request(),params);expect(response.status).toBe(404);expect(mocks.issue).not.toHaveBeenCalled()});
 it.each([["ENTITLEMENT_REQUIRED",404],["ACCESS_DISABLED",503],["TELEGRAM_UNAVAILABLE",503],["RATE_LIMITED",429],["ISSUANCE_IN_PROGRESS",409]] as const)("maps %s to a safe response",async(code,status)=>{mocks.issue.mockRejectedValue(new CourseAccessError(code));const response=await POST(request(),params),body=await response.text();expect(response.status).toBe(status);expect(body).not.toMatch(/token|chat.?id|inviteUrl/i)});
 it("retires the legacy permanent-link redirect without disclosing its destination",async()=>{const response=await legacyGet(),body=await response.text();expect(response.status).toBe(410);expect(body).not.toMatch(/t\.me|telegramAccessUrl|invite/i)});
});
