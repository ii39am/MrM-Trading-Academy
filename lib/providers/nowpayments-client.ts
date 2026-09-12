const MAX_RESPONSE_BYTES=256*1024;

export type NowPaymentsErrorCode="AMOUNT_MINIMAL_ERROR"|"TIMEOUT"|"NETWORK"|"HTTP_4XX"|"HTTP_5XX"|"MALFORMED_JSON"|"RESPONSE_TOO_LARGE";

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

   const declared=response.headers.get("content-length");
   if(declared&&Number(declared)>MAX_RESPONSE_BYTES)throw new NowPaymentsHttpError("RESPONSE_TOO_LARGE");
   let text="";
   try {
    const reader=response.body?.getReader();
    if(reader){
     const decoder=new TextDecoder(); let size=0;
     while(true){
      const {done,value}=await reader.read(); if(done)break;
      size+=value.byteLength;
      if(size>MAX_RESPONSE_BYTES){await reader.cancel();throw new NowPaymentsHttpError("RESPONSE_TOO_LARGE")}
      text+=decoder.decode(value,{stream:true});
     }
     text+=decoder.decode();
    }
   } catch(error) {
    if(error instanceof NowPaymentsHttpError)throw error;
    throw new NowPaymentsHttpError(controller.signal.aborted?"TIMEOUT":"NETWORK");
   }
   let body:unknown;
   try{body=JSON.parse(text)}catch{
    if(response.ok)throw new NowPaymentsHttpError("MALFORMED_JSON");
   }
   if(!response.ok){
    // Only an exact allowlisted code is retained, never provider messages.
    if(response.status>=400&&response.status<500&&body&&typeof body==="object"&&
       "code" in body&&body.code==="AMOUNT_MINIMAL_ERROR")
      throw new NowPaymentsHttpError("AMOUNT_MINIMAL_ERROR",response.status);
    throw new NowPaymentsHttpError(response.status>=500?"HTTP_5XX":"HTTP_4XX",response.status);
   }
   return body;
  }finally{clearTimeout(timer)}
 }
}
