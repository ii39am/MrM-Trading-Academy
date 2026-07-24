"use client";
import Link from "next/link";
import { useRouter,useSearchParams } from "next/navigation";
import { useRef,useState } from "react";
import { Eye,EyeOff,LockKeyhole } from "lucide-react";
import { api } from "@/lib/api";
import { Button,Spinner } from "@/components/ui";

const safeNext=(value:string|null)=>value?.startsWith("/")&&!value.startsWith("//")?value:"/dashboard";

export function AuthForm({mode}:{mode:"login"|"register"}){
 const router=useRouter(),search=useSearchParams(),formRef=useRef<HTMLFormElement>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[show,setShow]=useState(false);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;setBusy(true);setError("");const data=new FormData(event.currentTarget);
  const password=String(data.get("password"));
  if(mode==="register"&&password!==String(data.get("passwordConfirmation"))){setError("Passwords do not match.");formRef.current?.querySelector<HTMLInputElement>('[name="passwordConfirmation"]')?.focus();setBusy(false);return}
  try{
   if(mode==="login"){await api.login(String(data.get("email")),password);router.replace(safeNext(search.get("next")))}
   else{
    const email=String(data.get("email")).trim().toLowerCase();
    await api.register(String(data.get("name")),email,password,String(data.get("passwordConfirmation")),data.get("termsAccepted")==="on");
    router.replace(`/verify-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(safeNext(search.get("next")))}`);
   }
   router.refresh();
  }catch(cause){setError(cause instanceof Error?cause.message:"The service is temporarily unavailable.")}finally{setBusy(false)}
 }
 return <div className="w-full max-w-md">
  <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/25"><LockKeyhole className="h-5 w-5"/></div>
  <p className="eyebrow">{mode==="login"?"Welcome back":"Create your account"}</p>
  <h1 className="mt-3 text-3xl font-semibold tracking-tight">{mode==="login"?"Continue your progress.":"Start building your edge."}</h1>
  <p className="mt-3 text-sm text-white/40">{mode==="login"?"Sign in with your verified email.":"We will verify your email before creating a session."}</p>
  <form ref={formRef} onSubmit={submit} className="mt-8 space-y-5" noValidate>
   {mode==="register"&&<label className="block text-xs text-white/45">Full name<input name="name" required autoComplete="name" className="input mt-2" placeholder="Your name"/></label>}
   <label className="block text-xs text-white/45">Email address<input name="email" type="email" required autoComplete="email" inputMode="email" className="input mt-2" placeholder="you@example.com"/></label>
   <label className="block text-xs text-white/45"><span className="flex justify-between">Password{mode==="login"&&<Link href="/forgot-password" className="text-blue-400">Forgot password?</Link>}</span><span className="relative mt-2 block"><input name="password" type={show?"text":"password"} required minLength={10} autoComplete={mode==="login"?"current-password":"new-password"} className="input pr-12"/><button type="button" onClick={()=>setShow(!show)} className="absolute right-4 top-3.5 text-white/30" aria-label={show?"Hide password":"Show password"}>{show?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></span>{mode==="register"&&<span className="mt-2 block text-[11px] text-white/30">10+ characters with uppercase, lowercase, and a number.</span>}</label>
   {mode==="register"&&<><label className="block text-xs text-white/45">Confirm password<input name="passwordConfirmation" type="password" required minLength={10} autoComplete="new-password" className="input mt-2"/></label><label className="flex items-start gap-3 text-xs text-white/55"><input name="termsAccepted" type="checkbox" required className="mt-0.5 h-4 w-4 accent-blue-600"/><span>I accept the <Link href="/terms" className="text-blue-400">Terms</Link> and acknowledge the <Link href="/risk" className="text-blue-400">Risk Disclosure</Link>.</span></label></>}
   <div aria-live="polite">{error&&<p role="alert" tabIndex={-1} className="rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}</div>
   <Button type="submit" disabled={busy} className="w-full">{busy&&<Spinner/>}{mode==="login"?"Sign in":"Send verification code"}</Button>
  </form>
  <p className="mt-7 text-center text-sm text-white/40">{mode==="login"?"New to the academy? ":"Already verified? "}<Link className="font-medium text-blue-400" href={mode==="login"?"/register":"/login"}>{mode==="login"?"Create account":"Sign in"}</Link></p>
 </div>;
}
