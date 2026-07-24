"use client";
import { Suspense,useState } from "react";
import { useRouter,useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button,Spinner } from "@/components/ui";
function Verify(){
 const search=useSearchParams(),router=useRouter(),email=search.get("email")??"",[code,setCode]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const next=search.get("next")?.startsWith("/")&&!search.get("next")?.startsWith("//")?search.get("next")!:"/dashboard";
 async function submit(event:React.FormEvent){event.preventDefault();if(busy)return;setError("");setBusy(true);try{await api.verifyEmail(email,code);router.replace(next);router.refresh()}catch(cause){setError(cause instanceof Error?cause.message:"Invalid or expired verification code.")}finally{setBusy(false)}}
 async function resend(){if(busy)return;setError("");setNotice("");setBusy(true);try{await api.resendVerification(email);setNotice("If eligible, a new code has been sent.");setCode("")}catch{setError("Please wait before requesting another code.")}finally{setBusy(false)}}
 return <div className="w-full max-w-md"><p className="eyebrow">Email verification</p><h1 className="mt-3 text-3xl font-semibold">Enter your email code.</h1><p className="mt-3 text-sm text-white/45">We sent a six-digit code to {email}.</p><form onSubmit={submit} className="mt-8"><input value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" aria-label="Verification code" className="input text-center text-xl tracking-[.4em]" maxLength={6}/><div aria-live="polite">{error&&<p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}{notice&&<p role="status" className="mt-3 text-xs text-emerald-300">{notice}</p>}</div><Button type="submit" disabled={busy||code.length!==6} className="mt-4 w-full">{busy&&<Spinner/>}Verify email</Button><Button type="button" variant="ghost" disabled={busy} onClick={resend} className="mt-2 w-full">Resend code</Button></form></div>
}
export default function VerifyEmailPage(){return <section className="container-pad flex min-h-[780px] items-center justify-center pt-20"><Suspense><Verify/></Suspense></section>}
