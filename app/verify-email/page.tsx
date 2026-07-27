import { Suspense } from "react";
import { getLocale } from "@/lib/i18n";
import { VerifyEmailForm } from "@/components/verify-email-form";
export default async function VerifyEmailPage(){return <section className="container-pad flex min-h-[780px] items-center justify-center pt-20"><Suspense><VerifyEmailForm locale={await getLocale()}/></Suspense></section>}
