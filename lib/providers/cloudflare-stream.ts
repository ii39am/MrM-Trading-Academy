import type { DirectUpload,SignedPlayback,StreamWebhookEvent,VideoDeliveryProvider } from "@/lib/video";
import { verifyStreamWebhookSignature } from "@/lib/video";
export class CloudflareStreamProvider implements VideoDeliveryProvider{
 readonly name="cloudflare-stream";
 constructor(private accountId:string,private apiToken:string,private webhookSecret:string,private customerCode?:string){}
 private url(path:string){return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.accountId)}/stream${path}`}
 private headers(){return {Authorization:`Bearer ${this.apiToken}`,"Content-Type":"application/json"}}
 async createDirectUpload(lessonId:string,maxDurationSeconds:number):Promise<DirectUpload>{
  const response=await fetch(this.url("/direct_upload"),{method:"POST",headers:this.headers(),body:JSON.stringify({maxDurationSeconds,requireSignedURLs:true,meta:{lessonId}}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error("Cloudflare upload creation failed");
  const body=await response.json() as {success:boolean;result:{uid:string;uploadURL:string}};if(!body.success)throw new Error("Cloudflare rejected upload");
  return {uid:body.result.uid,uploadUrl:body.result.uploadURL,expiresAt:new Date(Date.now()+30*60_000)};
 }
 async createSignedPlayback(assetId:string,userId:string,ttlSeconds:number):Promise<SignedPlayback>{
  const expiresAt=new Date(Date.now()+Math.min(ttlSeconds,300)*1000);
  const response=await fetch(this.url(`/${encodeURIComponent(assetId)}/token`),{method:"POST",headers:this.headers(),body:JSON.stringify({exp:Math.floor(expiresAt.getTime()/1000),sub:userId}),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error("Cloudflare token creation failed");
  const body=await response.json() as {success:boolean;result:{token:string}};if(!body.success)throw new Error("Cloudflare rejected token");
  const host=this.customerCode?`customer-${this.customerCode}.cloudflarestream.com`:`videodelivery.net`;
  return {token:body.result.token,expiresAt,provider:"cloudflare-stream",manifestUrl:`https://${host}/${body.result.token}/manifest/video.m3u8`,iframeUrl:`https://${host}/${body.result.token}/iframe`};
 }
 async deleteAsset(assetId:string){const response=await fetch(this.url(`/${encodeURIComponent(assetId)}`),{method:"DELETE",headers:this.headers(),signal:AbortSignal.timeout(8000)});if(!response.ok&&response.status!==404)throw new Error("Cloudflare delete failed")}
 verifyWebhook(payload:string,signature:string):StreamWebhookEvent{
  if(!verifyStreamWebhookSignature(payload,signature,this.webhookSecret))throw new Error("Invalid Stream webhook signature");
  const body=JSON.parse(payload) as {uid:string;readyToStream?:boolean;status?:{state?:string;errorReasonCode?:string;errorReasonText?:string};duration?:number;thumbnail?:string};
  const failed=body.status?.state==="error",ready=body.readyToStream===true;
  return {uid:body.uid,ready,state:failed?"ERROR":ready?"READY":"PROCESSING",durationSeconds:body.duration,thumbnailUrl:body.thumbnail,errorMessage:failed?(body.status?.errorReasonText??body.status?.errorReasonCode):undefined};
 }
}
