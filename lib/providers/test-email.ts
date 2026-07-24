import type { EmailProvider,TransactionalEmail } from "@/lib/email";

const outbox=globalThis as typeof globalThis&{__academyTestEmails?:TransactionalEmail[]};

export class TestEmailProvider implements EmailProvider{
  readonly name="test";
  constructor(){if(process.env.NODE_ENV==="production")throw new Error("Test email provider is forbidden in production")}
  async send(message:TransactionalEmail){(outbox.__academyTestEmails??=[]).push(message)}
}

export function readTestEmails(){
  if(process.env.NODE_ENV==="production")throw new Error("Test email outbox is forbidden in production");
  return [...(outbox.__academyTestEmails??[])];
}
