import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots{const base=process.env.APP_URL??process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000";return {rules:{userAgent:"*",allow:"/",disallow:["/dashboard","/learn/","/admin","/api/","/login","/register","/verify-email","/forgot-password"]},sitemap:`${base}/sitemap.xml`}}
