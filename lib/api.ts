import type { Course, User } from "@/lib/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error==="string"?body.error:body.error?.message??"Request failed");
  return body as T;
}

export const api = {
  courses: () => request<Course[]>("/courses"),
  course: (slug: string) => request<Course>(`/courses/${slug}`),
  login: (email: string, password: string) => request<{ user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (name:string,email:string,password:string,passwordConfirmation:string,termsAccepted:boolean) => request<{ok:true;message:string}>("/auth/register",{method:"POST",body:JSON.stringify({name,email,password,passwordConfirmation,termsAccepted})}),
  verifyEmail: (email:string,code:string) => request<{user:User}>("/auth/verify-email",{method:"POST",body:JSON.stringify({email,code})}),
  resendVerification: (email:string) => request<{ok:true;message?:string}>("/auth/resend-code",{method:"POST",body:JSON.stringify({email})}),
  me: () => request<{ user: User }>("/auth/me"),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
};
