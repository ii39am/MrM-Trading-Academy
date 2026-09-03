import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, placement = "nav" }: { className?: string; placement?: "nav" | "footer" }) {
  return (
    <Link
      href="/"
      className={cn(
        "brand-logo-shell group relative inline-flex shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300",
        className,
      )}
      aria-label="Mr.ME Trading Academy home"
    >
      <Image
        src="/brand/mrme-trading-academy.svg"
        alt=""
        width={420}
        height={96}
        priority
        unoptimized
        className={cn(
          "relative z-10 h-auto transition duration-300 group-hover:brightness-110 group-hover:drop-shadow-[0_0_10px_rgba(168,85,247,.25)]",
          placement === "footer" ? "w-[205px] sm:w-[226px]" : "w-[178px] sm:w-[205px]",
        )}
      />
    </Link>
  );
}
