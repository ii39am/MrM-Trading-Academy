import type { EmailProvider,TransactionalEmail } from "@/lib/email";

export class ResendEmailProvider implements EmailProvider{
  readonly name="resend";
  constructor(private apiKey:string,private from:string){}
  async send(message:TransactionalEmail){
    const response=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{"Authorization":`Bearer ${this.apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({from:this.from,to:[message.to],subject:message.subject,html:message.html,text:message.text}),
      signal:AbortSignal.timeout(8_000)
    });
    if(!response.ok)throw new Error("Email delivery failed");
  }
}
