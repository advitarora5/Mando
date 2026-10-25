import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession:false } });
const { data, error } = await db.from("companies").select("name, lead_status, contacted_at, replied_at, demo_booked_at, contacts(id, email, linkedin_url, outreach_drafts(channel, sent_at)), scores(total, tier, assessed_at)");
if (error) { console.log(error.message); process.exit(); }
const tiers={}, status={}; let contacts=0, withEmail=0, drafts=0, sent=0, coWithContacts=0;
for (const c of data){ const s=c.scores.sort((a,b)=>b.assessed_at.localeCompare(a.assessed_at))[0]; tiers[s?.tier??'unscored']=(tiers[s?.tier??'unscored']||0)+1; status[c.lead_status]=(status[c.lead_status]||0)+1; contacts+=c.contacts.length; if(c.contacts.length)coWithContacts++; for(const k of c.contacts){ if(k.email)withEmail++; for(const d of k.outreach_drafts??[]){drafts++; if(d.sent_at)sent++;}}}
console.log({companies:data.length,tiers,status,contacts,coWithContacts,withEmail,drafts,sent});
