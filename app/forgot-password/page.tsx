import { getLocale } from "@/lib/i18n";
import { PasswordResetForm } from "@/components/password-reset-form";
export default async function ForgotPage(){return <PasswordResetForm locale={await getLocale()}/>}
