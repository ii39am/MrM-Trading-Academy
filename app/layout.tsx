import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { getLocale } from "@/lib/i18n";
const inter=Inter({subsets:["latin"],display:"swap",variable:"--font-inter"});
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000"),title:{default:"Mr.ME Trading Academy — Trade with clarity",template:"%s | Mr.ME Trading Academy"},description:"Premium trading education and verified access to private Telegram communities.",alternates:{canonical:"/",languages:{en:"/?lang=en",ar:"/?lang=ar"}},openGraph:{title:"Mr.ME Trading Academy",description:"Learn with clarity. Access with confidence.",type:"website",siteName:"Mr.ME Trading Academy"},twitter:{card:"summary_large_image",title:"Mr.ME Trading Academy",description:"Premium trading education for serious traders."}};
export default async function RootLayout({children}:{children:React.ReactNode}){const locale=await getLocale();return <html lang={locale} dir={locale==="ar"?"rtl":"ltr"} className={inter.variable}><body className="min-h-screen font-sans"><Navbar locale={locale}/><main>{children}</main><Footer locale={locale}/></body></html>}
