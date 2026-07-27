"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/types";
import { Button,Spinner } from "@/components/ui";

export function PurchaseButton({courseId,locale}:{courseId:string;locale:Locale}){
 const router=useRouter(),ar=locale==="ar",[busy,setBusy]=useState(false),[error,setError]=useState(""),[couponCode,setCouponCode]=useState(""),[verificationRequired,setVerificationRequired]=useState(false);
 async function purchase(){if(busy)return;setBusy(true);setError("");setVerificationRequired(false);try{const response=await fetch("/api/purchase",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({courseIds:[courseId],couponCode:couponCode.trim()||undefined})});if(response.status===401){router.push(`/login?next=${encodeURIComponent(location.pathname)}`);return}const body=await response.json();if(!response.ok){if(body.error?.code==="EMAIL_VERIFICATION_REQUIRED")setVerificationRequired(true);throw new Error(ar?messageAr(body.error?.code):body.error?.message??"Payment is unavailable")}router.push(`/dashboard/purchases/${body.purchaseId}`)}catch(cause){setError(cause instanceof Error?cause.message:(ar?"تعذّر إنشاء عملية الدفع.":"Payment is unavailable"))}finally{setBusy(false)}}
 return <div className="mt-6"><label className="mb-3 block text-xs text-white/45">{ar?"رمز الخصم":"Coupon code"}<div className="mt-2 flex gap-2"><input value={couponCode} onChange={event=>setCouponCode(event.target.value)} maxLength={40} autoComplete="off" className="input uppercase" placeholder={ar?"أدخل الرمز":"Enter code"}/></div></label><Button onClick={purchase} disabled={busy} className="w-full">{busy&&<Spinner/>}{ar?"المتابعة إلى الدفع الآمن":"Continue to secure payment"}</Button>{error&&<p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}{verificationRequired&&<Link className="mt-3 inline-block text-sm text-blue-300" href="/verify-email">{ar?"إعادة إرسال رمز التحقق":"Resend verification code"}</Link>}</div>;
}
function messageAr(code:string|undefined){const messages:Record<string,string>={EMAIL_VERIFICATION_REQUIRED:"يجب تأكيد بريدك الإلكتروني قبل إتمام عملية الشراء.",INVALID_COUPON:"رمز الخصم غير صالح أو منتهي.",COUPON_USAGE_LIMIT:"تم الوصول إلى الحد الأقصى لاستخدام هذا الرمز.",COUPON_USER_LIMIT:"لقد استخدمت هذا الرمز بالحد المسموح.",MINIMUM_ORDER_NOT_MET:"قيمة الطلب لا تحقق الحد الأدنى لهذا الخصم."};return messages[code??""]??"تعذّر إنشاء عملية الدفع. تحقق من البيانات وحاول مجددًا."}
