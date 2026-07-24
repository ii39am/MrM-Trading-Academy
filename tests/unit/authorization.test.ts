import { beforeEach,describe,expect,it,vi } from "vitest";
const findFirst=vi.fn();
vi.mock("@/lib/db",()=>({db:{enrollment:{findFirst}}}));
describe("course authorization",()=>{
 beforeEach(()=>findFirst.mockReset());
 it("requires enrollment belonging to authenticated user",async()=>{findFirst.mockResolvedValue({id:"e1",courseId:"c1"});const {requireEnrollment}=await import("@/lib/authorization");await expect(requireEnrollment("u1","course")).resolves.toEqual({id:"e1",courseId:"c1"});expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({userId:"u1"})}))});
 it("denies absent enrollment",async()=>{findFirst.mockResolvedValue(null);const {requireLessonEnrollment}=await import("@/lib/authorization");await expect(requireLessonEnrollment("u1","l1")).resolves.toBeNull()});
});
