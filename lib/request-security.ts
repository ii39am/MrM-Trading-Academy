import { createHmac } from "node:crypto";

export type DeviceContext={
 ipHash:string|null;
 maskedIp:string|null;
 userAgentSummary:string;
 deviceType:string;
 browser:string;
 operatingSystem:string;
};

function trustedIp(request:Request){
 if(process.env.TRUST_PROXY!=="true")return null;
 return request.headers.get("x-nf-client-connection-ip")
  ??request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  ??null;
}

function hashIp(value:string|null){
 const secret=process.env.JWT_SECRET;
 if(!value||!secret||secret.length<32)return null;
 return createHmac("sha256",secret).update(`ip:${value}`).digest("hex");
}

function maskIp(value:string|null){
 if(!value)return null;
 if(value.includes(":"))return `${value.split(":").slice(0,3).join(":")}:…`;
 const parts=value.split(".");return parts.length===4?`${parts[0]}.${parts[1]}.x.x`:null;
}

export function parseUserAgent(value:string|null){
 const ua=(value??"").slice(0,512);
 const browser=/Edg\//.test(ua)?"Edge":/Chrome\//.test(ua)?"Chrome":/Firefox\//.test(ua)?"Firefox":/Safari\//.test(ua)&&!/Chrome\//.test(ua)?"Safari":"Unknown";
 const operatingSystem=/Windows/.test(ua)?"Windows":/(iPhone|iPad)/.test(ua)?"iOS":/Android/.test(ua)?"Android":/Mac OS X/.test(ua)?"macOS":/Linux/.test(ua)?"Linux":"Unknown";
 const deviceType=/iPad|Tablet/.test(ua)?"tablet":/Mobile|iPhone|Android/.test(ua)?"mobile":"desktop";
 return {browser,operatingSystem,deviceType,userAgentSummary:`${browser} on ${operatingSystem}`};
}

export function requestDeviceContext(request:Request):DeviceContext{
 const ip=trustedIp(request),agent=parseUserAgent(request.headers.get("user-agent"));
 return {...agent,ipHash:hashIp(ip),maskedIp:maskIp(ip)};
}
