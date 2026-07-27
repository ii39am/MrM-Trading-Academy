export interface TransactionalEmail {
  to:string;
  subject:string;
  html:string;
  text:string;
}

export interface EmailProvider {
  readonly name:string;
  send(message:TransactionalEmail):Promise<void>;
}

const registry=globalThis as typeof globalThis&{__academyEmailProvider?:EmailProvider};

export function registerEmailProvider(provider:EmailProvider){registry.__academyEmailProvider=provider}
export function getEmailProvider(){
  if(!registry.__academyEmailProvider)throw new Error("Email provider is not configured");
  return registry.__academyEmailProvider;
}

function escapeHtml(value:string){
  return value.replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]!));
}

export function verificationEmail(code:string,purpose:"EMAIL_VERIFICATION"|"PASSWORD_RESET"|"EMAIL_CHANGE"){
  const action=purpose==="PASSWORD_RESET"?"reset your password":purpose==="EMAIL_CHANGE"?"confirm your new email address":"verify your email address";
  const safeCode=escapeHtml(code);
  return {
    subject:`${code} — Mr.ME Trading Academy security code`,
    text:`Mr.ME Trading Academy\n\nUse code ${code} to ${action}. This code expires in 10 minutes.\n\nNever share this code. If you did not request it, ignore this message.`,
    html:`<!doctype html><html><body style="margin:0;background:#0b0b0f;color:#f7f7f8;font-family:Arial,sans-serif"><div style="max-width:560px;margin:auto;padding:40px 24px"><p style="color:#3b82f6;font-weight:700;letter-spacing:.12em">MR.ME TRADING ACADEMY</p><h1 style="font-size:24px">Security verification</h1><p style="color:#a7a7b0">Use this code to ${action}:</p><div style="margin:28px 0;padding:20px;border:1px solid #2d3442;border-radius:12px;text-align:center;font-size:32px;font-weight:700;letter-spacing:.25em">${safeCode}</div><p style="color:#a7a7b0">The code expires in 10 minutes. Never share it with anyone.</p><p style="color:#777784">If you did not request this message, you can safely ignore it.</p></div></body></html>`
  };
}

export function passwordChangedEmail(){
  return {
    subject:"Your Mr.ME Trading Academy password was changed",
    text:"Your Mr.ME Trading Academy password was changed. If you did not make this change, contact support immediately.",
    html:`<!doctype html><html><body style="margin:0;background:#0b0b0f;color:#f7f7f8;font-family:Arial,sans-serif"><div style="max-width:560px;margin:auto;padding:40px 24px"><p style="color:#3b82f6;font-weight:700">MR.ME TRADING ACADEMY</p><h1>Password changed</h1><p style="color:#a7a7b0">Your password was changed and all previous sessions were revoked.</p><p style="color:#777784">If you did not make this change, contact support immediately.</p></div></body></html>`
  };
}

export function paymentConfirmedEmail(productNames:string[]){
  const names=productNames.join(", ");
  return {
    subject:"Your Mr.ME purchase is confirmed",
    text:`Your payment for ${names} is confirmed. Sign in to your protected Mr.ME dashboard to access your purchase. No Telegram destination is included in this email.`,
    html:`<!doctype html><html><body style="margin:0;background:#0b0b0f;color:#f7f7f8;font-family:Arial,sans-serif"><div style="max-width:560px;margin:auto;padding:40px 24px"><p style="color:#3b82f6;font-weight:700">MR.ME TRADING ACADEMY</p><h1>Payment confirmed</h1><p style="color:#a7a7b0">Your payment for ${escapeHtml(names)} is confirmed.</p><p style="color:#a7a7b0">Sign in to your protected dashboard to access your purchase.</p><p style="color:#777784">For security, private community destinations are not included in email.</p></div></body></html>`
  };
}
