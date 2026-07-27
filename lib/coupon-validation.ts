import { z } from "zod";
export const couponSchema=z.object({
 code:z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/),
 descriptionEn:z.string().trim().min(2).max(240),descriptionAr:z.string().trim().min(2).max(240),
 discountType:z.enum(["PERCENTAGE","FIXED_AMOUNT"]),discountValue:z.number().int().positive(),
 currency:z.string().trim().length(3).toUpperCase().nullable().optional(),active:z.boolean(),
 startsAt:z.string().datetime().nullable().optional(),expiresAt:z.string().datetime().nullable().optional(),
 totalUsageLimit:z.number().int().positive().nullable().optional(),perUserUsageLimit:z.number().int().positive().nullable().optional(),
 minimumOrderAmount:z.number().int().nonnegative().default(0),maximumDiscountAmount:z.number().int().positive().nullable().optional(),
 productIds:z.array(z.string().min(1).max(100)).max(100)
}).strict().superRefine((value,ctx)=>{
 if(value.discountType==="PERCENTAGE"&&value.discountValue>100)ctx.addIssue({code:"custom",path:["discountValue"],message:"Percentage cannot exceed 100"});
 if(value.discountType==="FIXED_AMOUNT"&&!value.currency)ctx.addIssue({code:"custom",path:["currency"],message:"Currency is required"});
 if(value.startsAt&&value.expiresAt&&new Date(value.expiresAt)<=new Date(value.startsAt))ctx.addIssue({code:"custom",path:["expiresAt"],message:"Expiry must follow start"});
});
