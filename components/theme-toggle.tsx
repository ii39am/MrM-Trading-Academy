"use client";

import { Check, ChevronDown, Moon, Monitor, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

type ThemePreference = "light" | "dark" | "system";

const icons = { light: Sun, dark: Moon, system: Monitor };

function applyTheme(preference: ThemePreference) {
  const resolved = preference === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeToggle({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [preference, setPreference] = useState<ThemePreference>("system");
  const labels = ar
    ? { theme: "المظهر", light: "فاتح", dark: "داكن", system: "حسب النظام" }
    : { theme: "Theme", light: "Light", dark: "Dark", system: "System" };

  useEffect(() => {
    const stored = localStorage.getItem("mrm-theme");
    const initial: ThemePreference = stored === "light" || stored === "dark" ? stored : "system";
    setPreference(initial);
    applyTheme(initial);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystem = () => { if ((localStorage.getItem("mrm-theme") ?? "system") === "system") applyTheme("system"); };
    media.addEventListener("change", syncSystem);
    return () => media.removeEventListener("change", syncSystem);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function choose(value: ThemePreference) {
    if (value === "system") localStorage.removeItem("mrm-theme");
    else localStorage.setItem("mrm-theme", value);
    setPreference(value);
    applyTheme(value);
    setOpen(false);
  }

  const CurrentIcon = icons[preference];
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={labels.theme}
        className="theme-control inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-200/10 bg-violet-100/[.03] px-3 text-sm text-violet-100/65 transition hover:border-violet-300/25 hover:text-white"
      >
        <CurrentIcon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden xl:inline">{labels[preference]}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" aria-label={labels.theme} className="theme-menu absolute end-0 top-[calc(100%+.5rem)] z-[70] min-w-40 rounded-xl border border-violet-200/12 bg-[#0D0918]/95 p-1.5 shadow-2xl backdrop-blur-xl">
          {(Object.keys(icons) as ThemePreference[]).map(value => {
            const Icon = icons[value];
            return (
              <button key={value} type="button" role="menuitemradio" aria-checked={preference === value} onClick={() => choose(value)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm text-violet-100/70 transition hover:bg-violet-500/10 hover:text-white">
                <Icon className="h-4 w-4 text-violet-400" aria-hidden="true" />
                <span className="flex-1">{labels[value]}</span>
                {preference === value && <Check className="h-4 w-4 text-violet-400" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
