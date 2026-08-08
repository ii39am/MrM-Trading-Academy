import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { getLocale } from "@/lib/i18n";
export default async function RegisterPage(){return <section className="container-pad relative flex min-h-screen items-center justify-center overflow-hidden pb-16 pt-28"><div className="absolute start-1/2 top-24 -z-10 h-72 w-[34rem] -translate-x-1/2 rounded-full bg-violet-700/15 blur-[100px] rtl:translate-x-1/2"/><Suspense><AuthForm mode="register" locale={await getLocale()}/></Suspense></section>}
