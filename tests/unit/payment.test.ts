import { describe,expect,it } from "vitest";
import { canTransition } from "@/lib/payment";
describe("payment state machine",()=>{
 it("allows only pending terminal transitions",()=>{expect(canTransition("PENDING","PAID")).toBe(true);expect(canTransition("PENDING","FAILED")).toBe(true);expect(canTransition("PENDING","CANCELLED")).toBe(true)});
 it("allows a paid purchase to be refunded",()=>expect(canTransition("PAID","REFUNDED")).toBe(true));
 it("allows a delayed full confirmation after expiry",()=>expect(canTransition("CANCELLED","PAID")).toBe(true));
 it("permits status refreshes but rejects invalid terminal transitions",()=>{expect(canTransition("PAID","PAID")).toBe(true);expect(canTransition("REFUNDED","PAID")).toBe(false);expect(canTransition("FAILED","PAID")).toBe(false)});
});
