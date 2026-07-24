import type { DirectUpload,SignedPlayback,StreamWebhookEvent,VideoDeliveryProvider } from "@/lib/video";
export class TestVideoProvider implements VideoDeliveryProvider{
 readonly name="test-only";
 constructor(){if(process.env.NODE_ENV==="production")throw new Error("Test video provider is forbidden in production")}
 async createDirectUpload():Promise<DirectUpload>{return {uid:`test-${crypto.randomUUID()}`,uploadUrl:"http://127.0.0.1:3000/api/health",expiresAt:new Date(Date.now()+60_000)}}
 async createSignedPlayback(assetId:string):Promise<SignedPlayback>{const expiresAt=new Date(Date.now()+300_000);return {token:`test-${assetId}`,expiresAt,provider:"cloudflare-stream",manifestUrl:"http://127.0.0.1:3000/api/health",iframeUrl:"http://127.0.0.1:3000/api/health"}}
 async deleteAsset(){}
 verifyWebhook(payload:string):StreamWebhookEvent{return JSON.parse(payload) as StreamWebhookEvent}
}
