import { Activity, BookOpenCheck, CandlestickChart, Layers3 } from "lucide-react";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

type Candle = { x: number; open: number; close: number; high: number; low: number; volume: number };

const heroCandles: Candle[] = [
  { x: 44, open: 150, close: 132, high: 119, low: 163, volume: 30 },
  { x: 70, open: 132, close: 139, high: 124, low: 151, volume: 24 },
  { x: 96, open: 140, close: 115, high: 107, low: 147, volume: 42 },
  { x: 122, open: 114, close: 102, high: 91, low: 128, volume: 37 },
  { x: 148, open: 103, close: 120, high: 96, low: 132, volume: 29 },
  { x: 174, open: 120, close: 94, high: 86, low: 126, volume: 46 },
  { x: 200, open: 94, close: 81, high: 71, low: 107, volume: 54 },
  { x: 226, open: 82, close: 91, high: 75, low: 103, volume: 28 },
  { x: 252, open: 91, close: 68, high: 59, low: 98, volume: 61 },
  { x: 278, open: 68, close: 76, high: 61, low: 88, volume: 35 },
  { x: 304, open: 76, close: 55, high: 46, low: 84, volume: 58 },
  { x: 330, open: 55, close: 43, high: 34, low: 64, volume: 68 },
  { x: 356, open: 43, close: 50, high: 35, low: 61, volume: 33 },
  { x: 382, open: 50, close: 37, high: 27, low: 57, volume: 64 },
  { x: 408, open: 37, close: 29, high: 20, low: 48, volume: 71 },
  { x: 434, open: 29, close: 39, high: 22, low: 52, volume: 41 },
];

function CandleSeries({ candles, compact = false }: { candles: Candle[]; compact?: boolean }) {
  const candleWidth = compact ? 7 : 10;
  return (
    <g>
      {candles.map((candle, index) => {
        const rising = candle.close < candle.open;
        const top = Math.min(candle.open, candle.close);
        const height = Math.max(4, Math.abs(candle.close - candle.open));
        const color = rising ? "#34D399" : "#FB7185";
        return (
          <g key={candle.x} className="market-candle" style={{ animationDelay: `${index * 45}ms` }}>
            <line x1={candle.x} y1={candle.high} x2={candle.x} y2={candle.low} stroke={color} strokeWidth="1.5" opacity=".85" />
            <rect x={candle.x - candleWidth / 2} y={top} width={candleWidth} height={height} rx="1.5" fill={color} opacity=".9" />
          </g>
        );
      })}
    </g>
  );
}

function ChartGrid() {
  return (
    <g stroke="#C4B5FD" strokeOpacity=".09" strokeWidth="1">
      {[40, 80, 120, 160, 200].map((y) => <line key={`h-${y}`} x1="24" x2="456" y1={y} y2={y} />)}
      {[56, 108, 160, 212, 264, 316, 368, 420].map((x) => <line key={`v-${x}`} x1={x} x2={x} y1="18" y2="210" />)}
    </g>
  );
}

export function HeroTradingVisual({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  return (
    <div className="terminal-panel relative mx-auto w-full max-w-[620px] overflow-hidden rounded-[1.75rem] border border-violet-300/15 bg-[#0A0713]/95 p-3 shadow-[0_35px_100px_rgba(35,13,72,.52)] sm:p-4">
      <div className="flex items-center justify-between gap-4 border-b border-white/[.07] px-2 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-500/10 text-violet-300">
            <CandlestickChart className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white/80">{ar ? "بنية السوق" : "Market structure"}</p>
            <p className="text-[10px] text-violet-100/35">{ar ? "نموذج تعليمي" : "Illustrative chart"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1" aria-hidden="true">
          {["1H", "4H", "1D"].map((item, index) => (
            <span key={item} className={cn("rounded-md px-2 py-1 text-[10px]", index === 1 ? "bg-violet-500/15 text-violet-200" : "text-white/25")}>{item}</span>
          ))}
        </div>
      </div>
      <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/[.05] bg-[#08060F]">
        <svg viewBox="0 0 480 270" className="h-auto w-full" role="img" aria-label={ar ? "رسم شموع توضيحي لأغراض تعليمية" : "Illustrative candlestick chart for educational purposes"}>
          <defs>
            <linearGradient id="heroChartFade" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#7C3AED" stopOpacity=".18"/><stop offset="1" stopColor="#7C3AED" stopOpacity="0"/></linearGradient>
            <filter id="lineGlow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <rect width="480" height="270" fill="#08060F" />
          <ChartGrid />
          <path d="M24 174 C70 160 82 169 112 140 S164 130 190 109 S244 102 272 80 S330 76 354 51 S410 59 456 25 L456 212 L24 212Z" fill="url(#heroChartFade)" />
          <path className="chart-trace" d="M24 174 C70 160 82 169 112 140 S164 130 190 109 S244 102 272 80 S330 76 354 51 S410 59 456 25" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" filter="url(#lineGlow)" />
          <line x1="24" x2="456" y1="91" y2="91" stroke="#C084FC" strokeOpacity=".28" strokeDasharray="5 6" />
          <CandleSeries candles={heroCandles} />
          <g opacity=".5">
            {heroCandles.map((candle) => <rect key={`v-${candle.x}`} x={candle.x - 5} y={258 - candle.volume * .55} width="10" height={candle.volume * .55} rx="2" fill={candle.close < candle.open ? "#34D399" : "#FB7185"} />)}
          </g>
          <line x1="24" x2="456" y1="218" y2="218" stroke="#C4B5FD" strokeOpacity=".12" />
        </svg>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,6,15,.68),transparent_12%,transparent_88%,rgba(8,6,15,.72))]" aria-hidden="true" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          [ar ? "الاتجاه" : "Trend", ar ? "قراءة الهيكل" : "Read structure"],
          [ar ? "المخاطر" : "Risk", ar ? "خطة واضحة" : "Plan first"],
          [ar ? "التنفيذ" : "Execution", ar ? "قرار منضبط" : "Stay disciplined"],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[.06] bg-white/[.025] px-3 py-2.5"><p className="text-[9px] uppercase tracking-[.14em] text-white/25">{label}</p><p className="mt-1 truncate text-[11px] font-medium text-violet-100/70">{value}</p></div>)}
      </div>
    </div>
  );
}

const miniPaths = [
  "M2 29 C14 28 17 12 30 18 S47 32 62 13 S78 20 94 5",
  "M2 10 C14 8 20 28 35 20 S52 7 64 18 S78 27 94 11",
  "M2 25 C17 12 25 19 35 9 S54 18 64 10 S81 8 94 2",
  "M2 8 C14 18 25 9 37 22 S58 16 69 27 S83 19 94 23",
  "M2 27 C11 25 17 15 28 19 S44 6 55 13 S72 22 94 4",
];

export function InstrumentCards({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const pairs = ["BTC / USDT", "ETH / USDT", "XAU / USD", "EUR / USD", "GBP / USD"];
  return (
    <div>
      <p className="mb-4 flex items-center gap-2 text-xs text-violet-100/35">
        <Activity className="h-3.5 w-3.5 text-violet-400" aria-hidden="true" />
        {ar ? "أدوات توضيحية لأغراض تعليمية — ليست بيانات مباشرة" : "Illustrative instruments for education — not live data"}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {pairs.map((pair, index) => (
          <div key={pair} className="group rounded-2xl border border-white/[.07] bg-[#0C0817] p-4 transition duration-300 hover:border-violet-400/20 hover:bg-[#100A20]">
            <div className="flex items-center justify-between"><span dir="ltr" className="text-xs font-semibold text-white/65">{pair}</span><span className="h-1.5 w-1.5 rounded-full bg-violet-400/55" /></div>
            <svg viewBox="0 0 96 34" className="mt-3 h-9 w-full" aria-hidden="true" focusable="false"><path d={miniPaths[index]} fill="none" stroke={index === 3 ? "#FB7185" : "#A855F7"} strokeWidth="1.5" strokeLinecap="round"/><path d="M2 33H94" stroke="#C4B5FD" strokeOpacity=".08"/></svg>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EducationChart({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const lessons = [
    [Layers3, ar ? "السياق أولاً" : "Context first", ar ? "اقرأ بنية الحركة قبل البحث عن قرار." : "Read market structure before looking for a decision."],
    [CandlestickChart, ar ? "حركة السعر" : "Price action", ar ? "افهم ما تقوله الشموع والمناطق المهمة." : "Understand what candles and key areas communicate."],
    [BookOpenCheck, ar ? "مراجعة منضبطة" : "Disciplined review", ar ? "حوّل الملاحظة إلى عملية تعليمية قابلة للمراجعة." : "Turn observation into a repeatable learning process."],
  ] as const;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.45fr_.75fr]">
      <div className="terminal-panel overflow-hidden rounded-[1.75rem] border border-violet-300/15 bg-[#090612] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm font-semibold">{ar ? "تحليل حركة السعر" : "Price-action study"}</p><p className="mt-1 text-xs text-white/30">{ar ? "نموذج تعليمي — غير مباشر" : "Illustrative model — not live"}</p></div>
          <div className="flex rounded-lg border border-white/[.06] bg-white/[.025] p-1" aria-hidden="true">{["15m", "1H", "4H", "1D"].map((item,index)=><span key={item} className={cn("rounded-md px-2.5 py-1 text-[10px]",index===2?"bg-violet-500/15 text-violet-200":"text-white/25")}>{item}</span>)}</div>
        </div>
        <svg viewBox="0 0 480 245" className="mt-5 h-auto w-full" role="img" aria-label={ar ? "نموذج تعليمي لتحليل حركة السعر" : "Illustrative price-action education chart"}>
          <rect width="480" height="245" rx="16" fill="#07050E" />
          <ChartGrid />
          <rect x="24" y="61" width="432" height="32" fill="#7C3AED" opacity=".07" />
          <rect x="24" y="147" width="432" height="28" fill="#34D399" opacity=".05" />
          <line x1="24" x2="456" y1="93" y2="93" stroke="#A855F7" strokeOpacity=".35" strokeDasharray="6 6" />
          <line x1="24" x2="456" y1="147" y2="147" stroke="#34D399" strokeOpacity=".3" strokeDasharray="6 6" />
          <CandleSeries candles={heroCandles.map((item,index)=>({...item,open:item.open+28+(index%3)*4,close:item.close+28+(index%3)*4,high:item.high+28,low:item.low+28}))} />
          <path className="chart-trace chart-trace-delayed" d="M24 185 C72 167 92 176 126 144 S184 158 218 125 S286 129 316 91 S380 105 456 49" fill="none" stroke="#C084FC" strokeWidth="2" strokeLinecap="round" />
          <g opacity=".5">{heroCandles.map(candle=><rect key={`edu-${candle.x}`} x={candle.x-5} y={238-candle.volume*.36} width="10" height={candle.volume*.36} rx="2" fill="#7C3AED"/>)}</g>
        </svg>
      </div>
      <div className="grid gap-3">
        {lessons.map(([Icon,title,copy], index) => (
          <article key={title} className="rounded-2xl border border-white/[.07] bg-[#0D0918] p-5 sm:p-6">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300"><Icon className="h-4 w-4" aria-hidden="true"/></span><span className="text-xs text-white/25">0{index+1}</span></div>
            <h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-violet-100/45">{copy}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function DecorativeChart({ className }: { className?: string }) {
  return <svg viewBox="0 0 400 120" className={cn("pointer-events-none",className)} aria-hidden="true" focusable="false"><g stroke="#C084FC" strokeOpacity=".08">{[20,60,100].map(y=><line key={y} x1="0" x2="400" y1={y} y2={y}/>)}</g><path className="chart-trace" d="M0 96 C45 83 71 103 110 74 S177 68 210 51 S270 61 304 32 S355 38 400 8" fill="none" stroke="#A855F7" strokeOpacity=".42" strokeWidth="2"/><g fill="#7C3AED" opacity=".17">{[26,70,114,158,202,246,290,334,378].map((x,index)=><rect key={x} x={x} y={55-(index%4)*10} width="7" height={38+(index%3)*8} rx="2"/>)}</g></svg>;
}

export function HeroBackdropChart() {
  return (
    <svg viewBox="0 0 1440 610" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[82%] w-full opacity-70" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="backdropFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#7C3AED" stopOpacity=".18"/><stop offset="1" stopColor="#7C3AED" stopOpacity="0"/></linearGradient>
        <linearGradient id="backdropFade" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#070511"/><stop offset=".15" stopColor="#070511" stopOpacity=".25"/><stop offset=".82" stopColor="#070511" stopOpacity=".08"/><stop offset="1" stopColor="#070511"/></linearGradient>
        <filter id="backdropGlow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <g stroke="#C4B5FD" strokeOpacity=".055">{[90,180,270,360,450,540].map(y=><line key={y} x1="0" x2="1440" y1={y} y2={y}/>)}{[120,240,360,480,600,720,840,960,1080,1200,1320].map(x=><line key={x} x1={x} x2={x} y1="0" y2="610"/>)}</g>
      <path d="M0 490 C90 440 140 510 220 418 S350 430 430 342 S570 366 650 276 S780 315 875 214 S1010 260 1090 152 S1240 176 1440 34 L1440 610 L0 610Z" fill="url(#backdropFill)"/>
      <path className="chart-trace" d="M0 490 C90 440 140 510 220 418 S350 430 430 342 S570 366 650 276 S780 315 875 214 S1010 260 1090 152 S1240 176 1440 34" fill="none" stroke="#9333EA" strokeOpacity=".55" strokeWidth="2.5" filter="url(#backdropGlow)"/>
      <g opacity=".45">{Array.from({length:26},(_,index)=>{const x=28+index*55,base=460-(index*14)+(index%4)*30,height=45+(index%5)*16,rising=index%4!==1;return <g key={x} stroke={rising?"#A855F7":"#FB7185"}><line x1={x} x2={x} y1={base-height-16} y2={base+20}/><rect x={x-8} y={base-height} width="16" height={height} rx="2" fill={rising?"#7C3AED":"#BE123C"} stroke="none"/></g>})}</g>
      <rect width="1440" height="610" fill="url(#backdropFade)"/>
    </svg>
  );
}

export function CourseMarketPanel({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  return (
    <div className="terminal-panel h-full overflow-hidden rounded-[1.65rem] border border-violet-300/14 bg-[#090612] p-4 shadow-[0_28px_85px_rgba(24,8,54,.32)] sm:p-5">
      <div className="flex items-center justify-between gap-3 border-b border-white/[.06] pb-3"><div><p dir="ltr" className="text-xs font-semibold text-white/70">MARKET STRUCTURE</p><p className="mt-1 text-[10px] text-violet-100/30">{ar?"نموذج تعليمي توضيحي":"Illustrative learning model"}</p></div><div className="flex gap-1" aria-hidden="true">{["1H","4H","1D"].map((item,index)=><span key={item} className={cn("rounded-md px-2 py-1 text-[9px]",index===1?"bg-violet-500/16 text-violet-200":"text-white/25")}>{item}</span>)}</div></div>
      <svg viewBox="0 0 620 300" className="mt-3 h-auto w-full" role="img" aria-label={ar?"رسم سوق توضيحي لقسم الدورات":"Illustrative market chart for the courses section"}>
        <defs><linearGradient id="courseArea" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#9333EA" stopOpacity=".22"/><stop offset="1" stopColor="#9333EA" stopOpacity="0"/></linearGradient></defs>
        <rect width="620" height="300" rx="15" fill="#07050E"/>
        <g stroke="#C4B5FD" strokeOpacity=".07">{[48,96,144,192,240].map(y=><line key={y} x1="22" x2="598" y1={y} y2={y}/>)}{[82,154,226,298,370,442,514,586].map(x=><line key={x} x1={x} x2={x} y1="18" y2="264"/>)}</g>
        <rect x="22" y="78" width="576" height="30" fill="#7C3AED" opacity=".07"/>
        <rect x="22" y="187" width="576" height="24" fill="#10B981" opacity=".045"/>
        <path d="M22 224 C74 208 86 229 132 187 S204 196 248 158 S326 183 370 122 S444 142 487 91 S550 88 598 42 L598 266 L22 266Z" fill="url(#courseArea)"/>
        <path className="chart-trace" d="M22 224 C74 208 86 229 132 187 S204 196 248 158 S326 183 370 122 S444 142 487 91 S550 88 598 42" fill="none" stroke="#C084FC" strokeWidth="2.2"/>
        {Array.from({length:19},(_,index)=>{const x=44+index*29,open=213-index*8+(index%4)*18,close=open+(index%3===0?15:-18),high=Math.min(open,close)-11,low=Math.max(open,close)+12,rising=close<open;return <g key={x} className="market-candle" style={{animationDelay:`${index*35}ms`}}><line x1={x} x2={x} y1={high} y2={low} stroke={rising?"#2DD4BF":"#FB7185"} strokeWidth="1.4"/><rect x={x-5} y={Math.min(open,close)} width="10" height={Math.max(5,Math.abs(close-open))} rx="1.5" fill={rising?"#14B8A6":"#E11D48"}/></g>})}
        <g opacity=".45">{Array.from({length:19},(_,index)=><rect key={index} x={39+index*29} y={284-(18+(index%5)*6)} width="10" height={18+(index%5)*6} rx="2" fill={index%3===0?"#14B8A6":"#7C3AED"}/>)}</g>
      </svg>
    </div>
  );
}

export function SecurityVisual({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  return (
    <div className="relative flex min-h-[330px] items-center justify-center overflow-hidden rounded-[1.75rem] border border-violet-300/10 bg-[#090612]">
      <div className="absolute inset-0 bg-premium-grid opacity-35 [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]"/>
      <DecorativeChart className="absolute inset-x-0 bottom-0 h-36 w-full opacity-65"/>
      <svg viewBox="0 0 260 280" className="relative z-10 h-64 w-60 drop-shadow-[0_0_35px_rgba(147,51,234,.35)]" role="img" aria-label={ar?"درع يرمز إلى الوصول المحمي":"Shield representing protected access"}>
        <defs><linearGradient id="shieldMetal" x1="42" y1="28" x2="218" y2="246"><stop stopColor="#E9D5FF"/><stop offset=".22" stopColor="#A855F7"/><stop offset=".58" stopColor="#6D28D9"/><stop offset="1" stopColor="#2E1065"/></linearGradient><radialGradient id="shieldCore"><stop stopColor="#A855F7" stopOpacity=".45"/><stop offset="1" stopColor="#7C3AED" stopOpacity="0"/></radialGradient></defs>
        <circle cx="130" cy="138" r="116" fill="url(#shieldCore)" opacity=".65"/>
        <path d="M130 20 222 57v69c0 67-38 109-92 137-54-28-92-70-92-137V57Z" fill="#0D0820" stroke="url(#shieldMetal)" strokeWidth="7"/>
        <path d="M130 38 204 68v58c0 54-29 91-74 117-45-26-74-63-74-117V68Z" fill="none" stroke="#C084FC" strokeOpacity=".36" strokeWidth="2"/>
        <rect x="88" y="116" width="84" height="73" rx="14" fill="#170B32" stroke="#A855F7" strokeWidth="4"/>
        <path d="M105 116V94c0-17 11-31 25-31s25 14 25 31v22" fill="none" stroke="#C084FC" strokeWidth="7" strokeLinecap="round"/>
        <circle cx="130" cy="148" r="9" fill="#E9D5FF"/><path d="M130 155v15" stroke="#E9D5FF" strokeWidth="6" strokeLinecap="round"/>
      </svg>
    </div>
  );
}
