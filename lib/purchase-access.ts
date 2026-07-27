import { db } from "@/lib/db";
export async function getTelegramAccess(userId:string,purchaseId:string,courseId:string){
 const purchase=await db.purchase.findFirst({where:{id:purchaseId,userId,status:"PAID",items:{some:{courseId}}},select:{items:{where:{courseId},take:1,select:{course:{select:{status:true,publishedAt:true,telegramAccessUrl:true}}}}}});
 const product=purchase?.items[0]?.course;
 if(!product||product.status!=="PUBLISHED"||!product.publishedAt||product.publishedAt>new Date()||!product.telegramAccessUrl)return null;
 try{const url=new URL(product.telegramAccessUrl);return url.protocol==="https:"&&["t.me","telegram.me"].includes(url.hostname.toLowerCase())?url:null}catch{return null}
}
