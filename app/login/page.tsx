import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { getLocale } from "@/lib/i18n";
export default async function LoginPage(){return <section className="container-pad flex min-h-[820px] items-center justify-center pt-20 pb-16"><Suspense><AuthForm mode="login" locale={await getLocale()}/></Suspense></section>}
