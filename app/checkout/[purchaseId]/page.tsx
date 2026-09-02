import { redirect } from "next/navigation";
import { CheckoutClient } from "@/components/checkout-client";
import { getSessionUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n";

export const metadata = {
  title: "Secure checkout",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ purchaseId: string }>;
}) {
  const { purchaseId } = await params,
    user = await getSessionUser();
  if (!user)
    redirect(`/login?next=${encodeURIComponent(`/checkout/${purchaseId}`)}`);
  return <CheckoutClient purchaseId={purchaseId} locale={await getLocale()} />;
}
