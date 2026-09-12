import {beforeEach,it,expect,vi} from "vitest";
const mocks=vi.hoisted(()=>({user:vi.fn(),find:vi.fn()}));
vi.mock("@/lib/auth",()=>({getSessionUser:mocks.user}));
vi.mock("@/lib/db",()=>({db:{purchase:{findFirst:mocks.find}}}));
import {GET} from "@/app/api/purchases/[id]/route";
beforeEach(()=>{mocks.user.mockResolvedValue({id:"owner"});mocks.find.mockResolvedValue(null)});
it("scopes every lookup to the authenticated owner and hides foreign purchases",async()=>{
 const response=await GET(new Request("http://localhost/api/purchases/foreign"),{params:Promise.resolve({id:"foreign"})});
 expect(mocks.find).toHaveBeenCalledWith(expect.objectContaining({where:{id:"foreign",userId:"owner"}}));
 expect(response.status).toBe(404);expect(await response.json()).not.toHaveProperty("purchase");
});
it("requires authentication before purchase lookup",async()=>{
 mocks.user.mockResolvedValue(null);
 expect((await GET(new Request("http://localhost"),{params:Promise.resolve({id:"foreign"})})).status).toBe(401);
 expect(mocks.find).not.toHaveBeenCalled();
});
