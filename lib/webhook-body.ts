const MAX_WEBHOOK_BYTES=64*1024;
export class PayloadTooLargeError extends Error{}
export async function readWebhookBody(request:Request){
 const declared=request.headers.get("content-length");
 if(declared&&(/^\d+$/.test(declared)===false||Number(declared)>MAX_WEBHOOK_BYTES))throw new PayloadTooLargeError();
 if(!request.body)return "";
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_WEBHOOK_BYTES){await reader.cancel();throw new PayloadTooLargeError()}chunks.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 return new TextDecoder("utf-8",{fatal:true}).decode(bytes);
}
