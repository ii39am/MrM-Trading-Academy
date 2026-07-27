import { describe,expect,it } from "vitest";
import { calculateDiscount,normalizeCouponCode } from "@/lib/coupons";
describe("coupon calculations",()=>{
 it("normalizes codes",()=>expect(normalizeCouponCode(" summer-25 ")).toBe("SUMMER-25"));
 it("calculates bounded percentage discounts",()=>expect(calculateDiscount({discountType:"PERCENTAGE",discountValue:25,currency:null,minimumOrderAmount:1000,maximumDiscountAmount:2000},10000,"USD")).toBe(2000));
 it("calculates fixed discounts and never becomes negative",()=>expect(calculateDiscount({discountType:"FIXED_AMOUNT",discountValue:15000,currency:"USD",minimumOrderAmount:0,maximumDiscountAmount:null},10000,"USD")).toBe(10000));
 it("rejects currency and minimum-order mismatches",()=>{expect(()=>calculateDiscount({discountType:"FIXED_AMOUNT",discountValue:100,currency:"EUR",minimumOrderAmount:0,maximumDiscountAmount:null},1000,"USD")).toThrow("COUPON_CURRENCY_MISMATCH");expect(()=>calculateDiscount({discountType:"PERCENTAGE",discountValue:10,currency:null,minimumOrderAmount:2000,maximumDiscountAmount:null},1000,"USD")).toThrow("MINIMUM_ORDER_NOT_MET")});
});
