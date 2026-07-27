import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
const db=new PrismaClient(),courses=JSON.parse(await readFile(new URL("../data/courses.json",import.meta.url),"utf8"));
for(const item of courses)await db.course.upsert({where:{id:item.id},update:{...item},create:{...item,status:"DRAFT"}});
await db.$disconnect();
