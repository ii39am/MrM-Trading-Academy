"use client";
import { useRef,useState } from "react";
import * as tus from "tus-js-client";
import { CloudUpload,RefreshCw,Trash2,Video } from "lucide-react";
import { Button } from "@/components/ui";
export function AdminVideoPanel({lessonId,title,initialState}:{lessonId:string;title:string;initialState:string}){
 const [file,setFile]=useState<File|null>(null),[progress,setProgress]=useState(0),[state,setState]=useState(initialState),[error,setError]=useState(""),uploadRef=useRef<tus.Upload|null>(null);
 async function upload(){
  if(!file)return;setError("");setState("UPLOADING");
  const response=await fetch(`/api/admin/lessons/${lessonId}/video`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({maxDurationSeconds:7200})}),body=await response.json();
  if(!response.ok){setError(body.error?.message??"Unable to start upload");setState("ERROR");return}
  const task=new tus.Upload(file,{uploadUrl:body.upload.url,chunkSize:50*1024*1024,retryDelays:[0,1000,3000,5000],onProgress:(sent,total)=>setProgress(Math.round(sent/total*100)),onError:failure=>{setError(failure.message);setState("ERROR")},onSuccess:()=>{setProgress(100);setState("PROCESSING")}});
  uploadRef.current=task;task.start();
 }
 async function remove(){await uploadRef.current?.abort();await fetch(`/api/admin/lessons/${lessonId}/video`,{method:"DELETE"});setState("CANCELLED");setProgress(0)}
 return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
  <div className="flex items-start justify-between"><div><p className="font-medium">{title}</p><p className="mt-1 text-xs text-white/40">{state} {progress>0&&`· ${progress}%`}</p></div><Video className="h-5 w-5 text-blue-400"/></div>
  <label onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();setFile(event.dataTransfer.files[0]??null)}} className="mt-5 flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-white/15 p-6 text-center hover:bg-white/[.03]"><CloudUpload className="h-6 w-6 text-white/40"/><span className="mt-2 text-sm">{file?file.name:"Drop or choose a video file"}</span><input type="file" accept="video/*" className="sr-only" onChange={event=>setFile(event.target.files?.[0]??null)}/></label>
  {error&&<p className="mt-3 text-xs text-red-300">{error}</p>}<div className="mt-4 flex gap-2"><Button type="button" onClick={upload} disabled={!file||state==="UPLOADING"} className="flex-1"><RefreshCw className="h-4 w-4"/>Upload / replace</Button><button onClick={remove} aria-label="Cancel or delete video" className="rounded-xl border border-white/10 px-4 text-red-300"><Trash2 className="h-4 w-4"/></button></div>
 </div>;
}
