"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function AdminReconcileButton({purchaseId}:{purchaseId:string}){
 const router=useRouter(),[state,setState]=useState<"idle"|"loading"|"done"|"error">("idle");
 async function reconcile(){if(state==="loading")return;setState("loading");try{const response=await fetch(`/api/admin/purchases/${encodeURIComponent(purchaseId)}/reconcile`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});setState(response.ok?"done":"error");if(response.ok)router.refresh()}catch{setState("error")}}
 return <div><Button onClick={reconcile} disabled={state==="loading"}>{state==="loading"?"Reconciling...":"Reconcile now"}</Button><p aria-live="polite" className="mt-2 text-xs text-white/45">{state==="done"?"Reconciliation completed. Diagnostics refreshed.":state==="error"?"Reconciliation failed. Review the safe error code and retry later.":"Provider evidence is required; this cannot manually mark a Purchase paid."}</p></div>;
}

export function AdminRevokeGrantButton({grantId}:{grantId:string}){
 const router=useRouter(),[state,setState]=useState<"idle"|"loading"|"done"|"error">("idle");
 async function revoke(){if(state==="loading")return;setState("loading");try{const response=await fetch(`/api/admin/access-grants/${encodeURIComponent(grantId)}/revoke`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});setState(response.ok?"done":"error");if(response.ok)router.refresh()}catch{setState("error")}}
 return <div><Button variant="outline" onClick={revoke} disabled={state==="loading"}>{state==="loading"?"Revoking metadata...":"Revoke grant metadata"}</Button><p aria-live="polite" className="mt-2 max-w-md text-xs text-amber-200/70">{state==="done"?"Grant metadata revoked.":state==="error"?"Grant could not be revoked.":"This blocks application reuse only. It cannot invalidate an already-returned Telegram link because invite URLs are not stored."}</p></div>;
}
