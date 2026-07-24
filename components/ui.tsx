"use client";

import Link from "next/link";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, ArrowRight, LoaderCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Button({ href, children, variant = "primary", className = "", type, disabled, onClick }: { href?: string; children: React.ReactNode; variant?: "primary" | "secondary" | "ghost"; className?: string; type?: "button" | "submit"; disabled?: boolean; onClick?:()=>void }) {
  const styles = cn("inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500",
    variant === "secondary" && "border border-white/10 bg-white/[.06] text-white hover:bg-white/10",
    variant === "ghost" && "text-white/65 hover:bg-white/5 hover:text-white", className);
  return href ? <Link href={href} className={styles}>{children}</Link> : <button type={type ?? "button"} disabled={disabled} onClick={onClick} className={styles}>{children}</button>;
}

export function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: .55, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>{children}</motion.div>;
}

export function FAQ({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Accordion.Root type="single" collapsible className="divide-y divide-white/10">
      {items.map((item, index) => (
        <Accordion.Item value={`item-${index}`} key={item.q}>
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between py-6 text-left font-medium text-white">
              {item.q}<ChevronDown className="h-4 w-4 text-white/40 transition group-data-[state=open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden text-sm leading-7 text-white/55 data-[state=closed]:animate-none">
            <div className="pb-6 pr-10">{item.a}</div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

export function SectionHeading({ eyebrow, title, copy, align = "left" }: { eyebrow: string; title: string; copy?: string; align?: "left" | "center" }) {
  return <div className={cn(align === "center" && "mx-auto text-center")}>
    <p className="eyebrow">{eyebrow}</p><h2 className={cn("section-title", align === "center" && "mx-auto")}>{title}</h2>
    {copy && <p className={cn("mt-5 max-w-2xl text-base leading-7 text-white/55", align === "center" && "mx-auto")}>{copy}</p>}
  </div>;
}

export function LoadingSkeleton() {
  return <div className="grid gap-6 md:grid-cols-3">{[0,1,2].map(i => <div key={i} className="h-[420px] animate-pulse rounded-3xl bg-white/[.05]" />)}</div>;
}

export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="glass rounded-3xl px-6 py-16 text-center"><h3 className="text-xl font-semibold">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm text-white/50">{copy}</p><Button href="/courses" variant="secondary" className="mt-6">Browse courses <ArrowRight className="h-4 w-4"/></Button></div>;
}

export function Spinner() { return <LoaderCircle className="h-4 w-4 animate-spin" />; }
