import { z } from "zod";

const optionalText = z.string().trim().max(4000).transform(v => v || null);
const optionalUrl = z.string().trim().max(2000).refine(v => !v || /^https?:\/\//i.test(v) && URL.canParse(v), "Use a full http:// or https:// link.").transform(v => v || null);
const optionalEmail = z.string().trim().max(254).refine(v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address.").transform(v => v.toLowerCase() || null);
const optionalPhone = z.string().trim().max(40).refine(v => !v || /^[+()\d][\d\s().\-x+]{4,}$/i.test(v), "Enter a valid phone number.").transform(v => v || null);

export const contactSchema = z.object({
  company_id: z.uuid(), id: z.union([z.uuid(), z.literal("")]),
  name: z.string().trim().min(1, "Contact name is required.").max(200),
  title: optionalText, linkedin_url: optionalUrl, source: optionalUrl, mutual_connection: optionalText,
  email: optionalEmail, email_verified: z.string().optional().transform(v => v === "on"), email_source: optionalUrl,
  phone: optionalPhone, phone_source: optionalUrl,
}).transform(c => ({ ...c, email_verified: c.email_verified && c.email !== null }));
