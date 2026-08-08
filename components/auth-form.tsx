"use client";
import Link from "next/link";
import { useRouter,useSearchParams } from "next/navigation";
import { useRef,useState } from "react";
import { Eye,EyeOff,LockKeyhole } from "lucide-react";
import { api } from "@/lib/api";
import { Button,Spinner } from "@/components/ui";
import type { Locale } from "@/lib/types";

const safeNext=(value:string|null)=>value?.startsWith("/")&&!value.startsWith("//")?value:"/dashboard";

export function AuthForm({mode,locale}:{mode:"login"|"register";locale:Locale}){
 const ar=locale==="ar";
 const router=useRouter(),search=useSearchParams(),formRef=useRef<HTMLFormElement>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[show,setShow]=useState(false);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;setBusy(true);setError("");const data=new FormData(event.currentTarget);
  const password=String(data.get("password"));
  if(mode==="register"&&password!==String(data.get("passwordConfirmation"))){setError(ar?"كلمتا المرور غير متطابقتين.":"Passwords do not match.");formRef.current?.querySelector<HTMLInputElement>('[name="passwordConfirmation"]')?.focus();setBusy(false);return}
  try{
   if(mode==="login"){await api.login(String(data.get("email")),password);router.replace(safeNext(search.get("next")))}
   else{
    const email=String(data.get("email")).trim().toLowerCase();
    await api.register(String(data.get("name")),email,password,String(data.get("passwordConfirmation")),data.get("termsAccepted")==="on");
    router.replace(`/verify-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(safeNext(search.get("next")))}`);
   }
   router.refresh();
  }catch{setError(ar?"تعذر إكمال الطلب. تحقق من البيانات أو حاول لاحقاً.":"The request could not be completed. Check your details or try again.")}finally{setBusy(false)}
 }
  return <div className="w-full max-w-md bg-card p-8 sm:p-10 rounded-3xl border border-white/[.07] shadow-2xl shadow-brand/10">
  <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand shadow-lg shadow-brand/25"><LockKeyhole className="h-5 w-5 text-white"/></div>
  <p className="eyebrow">{ar?(mode==="login"?"مرحباً بعودتك":"إنشاء حساب"):(mode==="login"?"Welcome back":"Create your account")}</p>
  <h1 className="mt-3 text-3xl font-semibold tracking-tight">{ar?(mode==="login"?"افتح مشترياتك الخاصة.":"ابدأ مع Mr.ME."):(mode==="login"?"Open your private purchases.":"Start with Mr.ME.")}</h1>
  <p className="mt-3 text-sm text-white/40">{ar?(mode==="login"?"سجّل الدخول ببريدك الإلكتروني الموثّق.":"سنرسل رمز تحقق قبل إنشاء الجلسة."):(mode==="login"?"Sign in with your verified email.":"We will verify your email before creating a session.")}</p>
  <form ref={formRef} onSubmit={submit} className="mt-8 space-y-5" noValidate>
   {mode==="register"&&<label className="block text-xs text-white/45">{ar?"الاسم الكامل":"Full name"}<input name="name" required autoComplete="name" className="input mt-2"/></label>}
   <label className="block text-xs text-white/45">{ar?"البريد الإلكتروني":"Email address"}<input name="email" type="email" required autoComplete="email" inputMode="email" className="input mt-2" placeholder="you@example.com"/></label>
   <label className="block text-xs text-white/45"><span className="flex justify-between">{ar?"كلمة المرور":"Password"}{mode==="login"&&<Link href="/forgot-password" className="text-brand-secondary hover:text-white transition">{ar?"نسيت كلمة المرور؟":"Forgot password?"}</Link>}</span><span className="relative mt-2 block"><input name="password" type={show?"text":"password"} required minLength={10} autoComplete={mode==="login"?"current-password":"new-password"} className="input pe-12"/><button type="button" onClick={()=>setShow(!show)} className="absolute end-4 top-3.5 text-white/30" aria-label={show?"Hide password":"Show password"}>{show?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></span></label>
   {mode==="register"&&<><label className="block text-xs text-white/45">{ar?"تأكيد كلمة المرور":"Confirm password"}<input name="passwordConfirmation" type="password" required minLength={10} autoComplete="new-password" className="input mt-2"/></label><label className="flex items-start gap-3 text-xs text-white/55"><input name="termsAccepted" type="checkbox" required className="mt-0.5 h-4 w-4 accent-brand"/><span>{ar?"أوافق على الشروط وإخلاء مسؤولية المخاطر.":"I accept the Terms and acknowledge the Risk Disclosure."}</span></label></>}
   <div aria-live="polite">{error&&<p role="alert" tabIndex={-1} className="rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}</div>
   <Button type="submit" disabled={busy} className="w-full">{busy&&<Spinner/>}{ar?(mode==="login"?"تسجيل الدخول":"إرسال رمز التحقق"):(mode==="login"?"Sign in":"Send verification code")}</Button>
  </form>
  <p className="mt-7 text-center text-sm text-white/40"><Link className="font-medium text-brand-secondary hover:text-white transition" href={mode==="login"?"/register":"/login"}>{ar?(mode==="login"?"إنشاء حساب جديد":"لديك حساب؟ سجّل الدخول"):(mode==="login"?"Create account":"Already verified? Sign in")}</Link></p>
 </div>;
}
