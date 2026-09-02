const MAX_RESPONSE_BYTES=256*1024;

export type NowPaymentsErrorCode="TIMEOUT"|"NETWORK"|"HTTP_4XX"|"HTTP_5XX"|"MALFORMED_JSON"|"RESPONSE_TOO_LARGE";

export class NowPaymentsHttpError extends Error{
 readonly name="NowPaymentsHttpError";
 constructor(readonly code:NowPaymentsErrorCode,readonly statusCode?:number){
  super("NOWPayments request failed");
 }
}

export class NowPaymentsHttpClient{
 constructor(private readonly apiKey:string,private readonly baseUrl:string,private readonly timeoutMs=10_000){}

 async request(path:string,init:RequestInit={}):Promise<unknown>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),this.timeoutMs);
  try{
   let response:Response;
   try{response=await fetch(`${this.baseUrl}${path}`,{...init,headers:{"x-api-key":this.apiKey,...init.headers},signal:controller.signal})}
   catch(error){if(controller.signal.aborted||error instanceof DOMException&&error.name==="TimeoutError")throw new NowPaymentsHttpError("TIMEOUT");throw new NowPaymentsHttpError("NETWORK")}
   if(!response.ok)throw new NowPaymentsHttpError(response.status>=500?"HTTP_5XX":"HTTP_4XX",response.status);
   const declared=response.headers.get("content-length");
   if(declared&&Number(declared)>MAX_RESPONSE_BYTES)throw new NowPaymentsHttpError("RESPONSE_TOO_LARGE");
   let text:string;try{text=await response.text()}catch{throw new NowPaymentsHttpError(controller.signal.aborted?"TIMEOUT":"NETWORK")}
   if(new TextEncoder().encode(text).byteLength>MAX_RESPONSE_BYTES)throw new NowPaymentsHttpError("RESPONSE_TOO_LARGE");
   try{return JSON.parse(text)}catch{throw new NowPaymentsHttpError("MALFORMED_JSON")}
  }finally{clearTimeout(timer)}
 }
}
