import { createHash,createHmac,timingSafeEqual } from "node:crypto";
export interface SignedPlayback {token:string;expiresAt:Date;provider:"cloudflare-stream";manifestUrl:string;iframeUrl:string}
export interface DirectUpload {uid:string;uploadUrl:string;expiresAt:Date}
export interface StreamWebhookEvent {uid:string;ready:boolean;state:"PROCESSING"|"READY"|"ERROR";durationSeconds?:number;thumbnailUrl?:string;errorMessage?:string}
export interface VideoDeliveryProvider {
 readonly name:string;
 createDirectUpload(lessonId:string,maxDurationSeconds:number):Promise<DirectUpload>;
 createSignedPlayback(assetId:string,userId:string,ttlSeconds:number):Promise<SignedPlayback>;
 deleteAsset(assetId:string):Promise<void>;
 verifyWebhook(payload:string,signature:string):StreamWebhookEvent;
}
const videoRegistry=globalThis as typeof globalThis&{__academyVideoProvider?:VideoDeliveryProvider};
export function registerVideoProvider(value:VideoDeliveryProvider){videoRegistry.__academyVideoProvider=value}
export function getVideoProvider(){if(!videoRegistry.__academyVideoProvider)throw new Error("Video provider is not configured");return videoRegistry.__academyVideoProvider}
export function maskEmail(email:string){const [local,domain]=email.split("@");return `${local.slice(0,2)}•••@${domain}`}
export function hashRequestValue(value:string|undefined){return value?createHash("sha256").update(value).digest("hex"):undefined}
export function verifyStreamWebhookSignature(payload:string,header:string,secret:string,maxAgeSeconds=300){
 const parts=Object.fromEntries(header.split(",").map(part=>part.trim().split("=")));const timestamp=parts.time??parts.t,signature=parts.sig1??parts.v1;
 if(!timestamp||!signature||Math.abs(Date.now()/1000-Number(timestamp))>maxAgeSeconds)return false;
 const expected=createHmac("sha256",secret).update(`${timestamp}.${payload}`).digest("hex");
 if(!/^[a-f0-9]+$/i.test(signature)||signature.length!==expected.length)return false;
 return timingSafeEqual(Buffer.from(signature,"hex"),Buffer.from(expected,"hex"));
}
