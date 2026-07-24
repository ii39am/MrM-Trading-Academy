import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
export default function RegisterPage(){return <section className="container-pad flex min-h-[820px] items-center justify-center pt-20 pb-16"><Suspense><AuthForm mode="register"/></Suspense></section>}
