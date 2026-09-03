import Link from "next/link";
import { BarChart3, ContactRound, LayoutDashboard, Package, ScrollText, ServerCog, TicketPercent } from "lucide-react";
import { getLocale } from "@/lib/i18n";

const items = [
  [LayoutDashboard, "Overview", "نظرة عامة", "/admin"],
  [Package, "Products", "المنتجات", "/admin/products"],
  [ContactRound, "Customers", "العملاء", "/admin/customers"],
  [BarChart3, "Sales", "المبيعات", "/admin/sales"],
  [TicketPercent, "Coupons", "القسائم", "/admin/coupons"],
  [ScrollText, "Audit logs", "سجل التدقيق", "/admin/audit-logs"],
  [ServerCog, "System", "النظام", "/admin/system"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ar = await getLocale() === "ar";
  return (
    <div className="pt-[4.5rem]">
      <div className="container-pad grid min-h-[calc(100vh-4.5rem)] grid-cols-[minmax(0,1fr)] lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        <aside className="admin-sidebar min-w-0 border-b border-violet-200/10 py-4 lg:sticky lg:top-[4.5rem] lg:h-[calc(100vh-4.5rem)] lg:border-b-0 lg:border-e lg:py-8 lg:pe-5">
          <div className="mb-5 hidden lg:block">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">{ar ? "الإدارة" : "Administration"}</p>
            <p className="mt-2 text-sm text-violet-100/40">{ar ? "عمليات Mr.ME" : "Mr.ME operations"}</p>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible" aria-label={ar ? "تنقل الإدارة" : "Administration"}>
            {items.map(([Icon, en, arabic, href]) => (
              <Link key={href} href={href} className="flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 text-sm text-violet-100/55 transition hover:bg-violet-500/10 hover:text-white">
                <Icon className="h-4 w-4 text-violet-300" aria-hidden="true" />
                {ar ? arabic : en}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 [&>section]:px-0 [&>section]:pt-10">{children}</div>
      </div>
    </div>
  );
}
