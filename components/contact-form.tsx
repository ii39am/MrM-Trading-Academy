"use client";
import { useState } from "react";
import { Button, Spinner } from "@/components/ui";
export function ContactForm() {
  const [sent,setSent]=useState(false); const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);const form=new FormData(e.currentTarget);const response=await fetch("/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(form))});setBusy(false);if(response.ok)setSent(true)}
  if(sent)return <div className="glass rounded-2xl p-10 text-center"><h2 className="text-xl font-semibold">Message received.</h2><p className="mt-2 text-sm text-white/45">Our support team will reply within one business day.</p></div>;
  return <form onSubmit={submit} className="glass rounded-2xl p-6 sm:p-8"><div className="grid gap-5 sm:grid-cols-2"><label className="text-xs text-white/45">Name<input name="name" required className="input mt-2" placeholder="Your name"/></label><label className="text-xs text-white/45">Email<input name="email" required type="email" className="input mt-2" placeholder="you@example.com"/></label></div><label className="mt-5 block text-xs text-white/45">Topic<select name="topic" className="input mt-2"><option>Course question</option><option>Account support</option><option>Team access</option><option>Other</option></select></label><label className="mt-5 block text-xs text-white/45">Message<textarea name="message" required className="input mt-2 h-36 resize-none py-3" placeholder="How can we help?"/></label><Button type="submit" className="mt-6 w-full" disabled={busy}>{busy&&<Spinner/>}Send message</Button></form>;
}
