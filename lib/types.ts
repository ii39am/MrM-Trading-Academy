export type Locale = "en" | "ar";

export interface Course {
  id:string;
  slug:string;
  titleEn:string;
  titleAr:string;
  shortDescriptionEn:string;
  shortDescriptionAr:string;
  fullDescriptionEn:string;
  fullDescriptionAr:string;
  instructor:string;
  price:number;
  currency:string;
  image:string;
  accent:string;
}

export interface User {
  id:string;
  name:string;
  email:string;
  emailVerified:boolean;
  role:"STUDENT"|"INSTRUCTOR"|"ADMIN";
  status:"PENDING_VERIFICATION"|"ACTIVE"|"DISABLED"|"SUSPENDED"|"DELETION_PENDING"|"DELETED"|"MIGRATION_REQUIRED";
  sessionVersion:number;
  preferredLanguage:Locale;
}
