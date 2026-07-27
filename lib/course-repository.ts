import { z } from "zod";
import { db } from "@/lib/db";
import type { Course } from "@/lib/types";

const publicCourse=z.object({
 id:z.string(),slug:z.string(),titleEn:z.string(),titleAr:z.string(),
 shortDescriptionEn:z.string(),shortDescriptionAr:z.string(),
 fullDescriptionEn:z.string(),fullDescriptionAr:z.string(),
 instructor:z.string(),price:z.number().nonnegative(),currency:z.string(),
 image:z.string().url(),accent:z.string()
}).strict();

const selection={id:true,slug:true,titleEn:true,titleAr:true,shortDescriptionEn:true,shortDescriptionAr:true,fullDescriptionEn:true,fullDescriptionAr:true,instructor:true,priceCents:true,currency:true,image:true,accent:true} as const;
function fromDb(value:{id:string;slug:string;titleEn:string;titleAr:string;shortDescriptionEn:string;shortDescriptionAr:string;fullDescriptionEn:string;fullDescriptionAr:string;instructor:string;priceCents:number;currency:string;image:string;accent:string}):Course{
 return {...value,price:value.priceCents/100};
}
async function remote(path:string){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 try{for(let attempt=0;attempt<2;attempt++){try{const response=await fetch(`${process.env.COURSE_API_URL}${path}`,{signal:controller.signal,next:{revalidate:300}});if(!response.ok)throw new Error("CMS request failed");return await response.json()}catch{if(attempt===0)await new Promise(resolve=>setTimeout(resolve,150));else throw new Error("Course service unavailable")}}}
 finally{clearTimeout(timer)}
}
export const courseRepository={
 async list():Promise<Course[]>{
  if(process.env.COURSE_API_URL){const parsed=z.array(publicCourse).safeParse(await remote("/courses"));if(!parsed.success)throw new Error("Invalid CMS response");return parsed.data}
  return (await db.course.findMany({where:{status:"PUBLISHED",publishedAt:{lte:new Date()}},select:selection,orderBy:{publishedAt:"desc"}})).map(fromDb);
 },
 async getBySlug(slug:string):Promise<Course|null>{
  if(process.env.COURSE_API_URL){const parsed=publicCourse.safeParse(await remote(`/courses/${encodeURIComponent(slug)}`));return parsed.success?parsed.data:null}
  const record=await db.course.findFirst({where:{slug,status:"PUBLISHED",publishedAt:{lte:new Date()}},select:selection});return record?fromDb(record):null;
 }
};
