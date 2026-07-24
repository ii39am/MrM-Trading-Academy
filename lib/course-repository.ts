import { z } from "zod";
import { db } from "@/lib/db";
import type { Course } from "@/lib/types";
import type { Prisma } from "@prisma/client";

const lesson=z.object({id:z.string(),title:z.string(),duration:z.string(),preview:z.boolean().optional()}).strict();
const course=z.object({id:z.string(),slug:z.string(),title:z.string(),eyebrow:z.string(),description:z.string(),longDescription:z.string(),instructor:z.string(),difficulty:z.enum(["Beginner","Intermediate","Advanced"]),duration:z.string(),lessons:z.number().int().nonnegative(),price:z.number().nonnegative(),rating:z.number(),reviews:z.number().int(),image:z.string().url(),accent:z.string(),outcomes:z.array(z.string()),requirements:z.array(z.string()),curriculum:z.array(z.object({title:z.string(),lessons:z.array(lesson)}).strict()),featured:z.boolean().optional(),status:z.literal("PUBLISHED"),publishedAt:z.string().datetime()}).strict();
const publicCourse=course.omit({status:true,publishedAt:true});

type CourseRecord=Prisma.CourseGetPayload<{include:{modules:{include:{lessons:true}}}}>;
function fromDb(record:CourseRecord, includeProtected=false):Course {
 return {id:record.id,slug:record.slug,title:record.title,eyebrow:record.eyebrow,description:record.description,longDescription:record.longDescription,instructor:record.instructor,difficulty:record.difficulty as Course["difficulty"],duration:record.duration,lessons:record.lessonCount,price:record.priceCents/100,rating:record.rating,reviews:record.reviewCount,image:record.image,accent:record.accent,outcomes:record.outcomes,requirements:record.requirements,curriculum:record.modules.map(m=>({title:m.title,lessons:m.lessons.filter(l=>includeProtected||l.isPreview).map(l=>({id:l.id,title:l.title,duration:l.duration,preview:l.isPreview}))}))};
}
const include={modules:{orderBy:{position:"asc" as const},include:{lessons:{where:{publishedAt:{not:null}},orderBy:{position:"asc" as const}}}}};
async function remote(path:string){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);
 try{
  let last:unknown;
  for(let attempt=0;attempt<2;attempt++){try{const response=await fetch(`${process.env.COURSE_API_URL}${path}`,{signal:controller.signal,next:{revalidate:300}});if(!response.ok)throw new Error(`CMS ${response.status}`);return await response.json()}catch(error){last=error;if(attempt===0)await new Promise(r=>setTimeout(r,150))}}
  throw last;
 }finally{clearTimeout(timer)}
}
export const courseRepository={
 async list():Promise<Course[]>{
  if(process.env.COURSE_API_URL){const parsed=z.array(course).safeParse(await remote("/courses"));if(!parsed.success)throw new Error("Invalid CMS response");return parsed.data.map(value=>{const c=publicCourse.parse(value);return {...c,curriculum:c.curriculum.map(m=>({...m,lessons:m.lessons.filter(l=>l.preview)}))}});}
  return (await db.course.findMany({where:{status:"PUBLISHED",publishedAt:{lte:new Date()}},include,orderBy:{publishedAt:"desc"}})).map(x=>fromDb(x));
 },
 async getBySlug(slug:string):Promise<Course|null>{
  if(process.env.COURSE_API_URL){const parsed=course.safeParse(await remote(`/courses/${encodeURIComponent(slug)}`));if(!parsed.success)return null;const c=publicCourse.parse(parsed.data);return {...c,curriculum:c.curriculum.map(m=>({...m,lessons:m.lessons.filter(l=>l.preview)}))};}
  const record=await db.course.findFirst({where:{slug,status:"PUBLISHED",publishedAt:{lte:new Date()}},include});return record?fromDb(record):null;
 },
 async getProtectedBySlug(slug:string):Promise<Course|null>{
  const record=await db.course.findFirst({where:{slug,status:"PUBLISHED",publishedAt:{lte:new Date()}},include});return record?fromDb(record,true):null;
 }
};
