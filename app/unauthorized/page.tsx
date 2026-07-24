import { Button } from "@/components/ui";
export const metadata={title:"Access denied",robots:{index:false,follow:false}};
export default function Unauthorized(){return <section className="container-pad flex min-h-[700px] items-center justify-center text-center"><div><p className="eyebrow">403</p><h1 className="mt-3 text-4xl font-semibold">Access denied.</h1><p className="mt-4 text-white/45">Your account does not have permission to open this area.</p><Button href="/dashboard" className="mt-7">Return to dashboard</Button></div></section>}
