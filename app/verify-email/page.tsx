import { Suspense } from "react";
import { getLocale } from "@/lib/i18n";
import { VerifyEmailForm } from "@/components/verify-email-form";
export default async function VerifyEmailPage(){return <section className="container-pad relative flex min-h-screen items-center justify-center overflow-hidden pb-16 pt-28"><div className="absolute start-1/2 top-24 -z-10 h-72 w-[34rem] -translate-x-1/2 rounded-full bg-violet-700/15 blur-[100px] rtl:translate-x-1/2"/><Suspense><VerifyEmailForm locale={await getLocale()}/></Suspense></section>}
