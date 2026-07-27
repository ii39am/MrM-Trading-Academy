import { cookies } from "next/headers";
import type { Locale } from "@/lib/types";

export async function getLocale():Promise<Locale>{
 return (await cookies()).get("mrm_locale")?.value==="ar"?"ar":"en";
}
export function localized<T extends {titleEn:string;titleAr:string;shortDescriptionEn:string;shortDescriptionAr:string;fullDescriptionEn:string;fullDescriptionAr:string}>(value:T,locale:Locale){
 return {
  title:locale==="ar"?value.titleAr:value.titleEn,
  shortDescription:locale==="ar"?value.shortDescriptionAr:value.shortDescriptionEn,
  fullDescription:locale==="ar"?value.fullDescriptionAr:value.fullDescriptionEn
 };
}
