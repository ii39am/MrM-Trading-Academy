"use client";
import { useState } from "react";
import { Button, Spinner } from "@/components/ui";
import type { Locale } from "@/lib/types";
export function ContactForm({locale}:{locale:Locale}) {
  const ar=locale==="ar";
  const [sent,setSent]=useState(false); const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);const form=new FormData(e.currentTarget);const response=await fetch("/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(form))});setBusy(false);if(response.ok)setSent(true)}
  if(sent)return <div className="glass rounded-2xl p-10 text-center"><h2 className="text-xl font-semibold">{ar?"تم استلام رسالتك.":"Message received."}</h2><p className="mt-2 text-sm text-white/45">{ar?"سيرد فريق الدعم في أقرب وقت ممكن.":"Our support team will reply as soon as possible."}</p></div>;
  return <form onSubmit={submit} className="glass rounded-2xl p-6 sm:p-8"><div className="grid gap-5 sm:grid-cols-2"><label className="text-xs text-white/45">{ar?"الاسم":"Name"}<input name="name" required autoComplete="name" className="input mt-2"/></label><label className="text-xs text-white/45">{ar?"البريد الإلكتروني":"Email"}<input name="email" required type="email" autoComplete="email" className="input mt-2" placeholder="you@example.com"/></label></div><label className="mt-5 block text-xs text-white/45">{ar?"الموضوع":"Topic"}<select name="topic" className="input mt-2"><option value="product">{ar?"سؤال عن عرض":"Product question"}</option><option value="payment">{ar?"دعم الدفع":"Payment support"}</option><option value="account">{ar?"دعم الحساب":"Account support"}</option><option value="other">{ar?"أخرى":"Other"}</option></select></label><label className="mt-5 block text-xs text-white/45">{ar?"الرسالة":"Message"}<textarea name="message" required className="input mt-2 h-36 resize-none py-3"/></label><Button type="submit" className="mt-6 w-full" disabled={busy}>{busy&&<Spinner/>}{ar?"إرسال الرسالة":"Send message"}</Button></form>;
}
