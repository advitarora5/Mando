import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { assertReviewedTiers } from './validate-reviewed-tiers.mjs';
import { parseEvidence } from '../src/domain/scoring/evidence.ts';

// Background REST import: no browser, password extraction, schema changes or historical rewrites.
// Preview by default. Supply credentials via an external --env-file, never committed to Git.
const args=process.argv.slice(2);
const files=args.filter(a=>!a.startsWith('--'));
if(files.length!==2 || args.some(a=>a.startsWith('--')&&!['--apply','--validate-only'].includes(a)))
  throw new Error('Usage: node --env-file=/private/supabase.env scripts/save-reviewed-evidence.mjs assessments.json /private/backup-directory [--apply | --validate-only]');
if(args.includes('--apply')&&args.includes('--validate-only')) throw new Error('Choose apply or validate-only.');
const input=JSON.parse(readFileSync(files[0],'utf8'));
const entries=input.companies;
const categories=['authority','reachability','budget','release','timing'];
const maxima=[25,25,20,15,15];
if(input.policy!=='consultant-public-route-v1'||!Array.isArray(entries)||entries.length!==23) throw new Error('Expected the reviewed 23-company consultant batch.');
const ids=new Set(),companyIds=new Set();
for(const e of entries){
  const r=e.row;
  if(!r||ids.has(r.id)||companyIds.has(r.company_id)||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(r.id)||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(r.company_id)) throw new Error('Invalid or duplicate assessment/company identity.');
  ids.add(r.id);companyIds.add(r.company_id);
  if(!Number.isFinite(Date.parse(r.assessed_at))||!r.rubric_version.endsWith(':consultant-public-route-v1')||!['Qualified','Maybe','Disqualified'].includes(r.tier)) throw new Error('Invalid assessment metadata.');
  for(const [i,c] of categories.entries()){
    if(!Number.isFinite(r[c+'_score'])||r[c+'_score']<0||r[c+'_score']>maxima[i]||!parseEvidence(r[c+'_evidence'])) throw new Error('Invalid category score/evidence.');
  }
  if(categories.reduce((s,c)=>s+r[c+'_score'],0)!==e.total) throw new Error('Total does not match category points.');

}
assertReviewedTiers(entries);
if(args.includes('--validate-only')){
  console.log(JSON.stringify({validated:entries.length,policy:input.policy,database_written:false}));
  process.exit(0);
}
if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SECRET_KEY) throw new Error('Configure SUPABASE_URL and SUPABASE_SECRET_KEY in a private external env file.');
if(new URL(process.env.SUPABASE_URL).hostname!=='fkhychihxpregusklggo.supabase.co') throw new Error('Unexpected Supabase project; nothing written.');
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
async function all(table){
  const rows=[];
  for(let offset=0;;offset+=500){
    const {data,error}=await db.from(table).select('*').order(table==='company_insights'?'company_id':'id').range(offset,offset+499);
    if(error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);if(data.length<500)return rows;
  }
}
async function snapshot(){
  const result={};for(const table of ['companies','contacts','scores','company_insights','weekly_snapshots']) result[table]=await all(table);
  return result;
}
function canonical(value){
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
function matches(actual,row){
  return Object.keys(row).every(k=>k==='assessed_at'?Date.parse(actual[k])===Date.parse(row[k]):actual[k]===row[k]);
}
const before=await snapshot();
if(before.companies.filter(c=>companyIds.has(c.id)).length!==23) throw new Error('Cohort does not match live database.');
for(const e of entries){
  const existing=before.scores.find(s=>s.id===e.row.id);
  if(existing&&!matches(existing,e.row)) throw new Error('Existing assessment ID has conflicting content.');
  const latest=before.scores.filter(s=>s.company_id===e.row.company_id).sort((a,b)=>Date.parse(b.assessed_at)-Date.parse(a.assessed_at))[0];
  if(latest&&Date.parse(latest.assessed_at)>Date.parse(e.row.assessed_at)) throw new Error('A newer live assessment exists; review before importing.');
  if(!before.company_insights.some(i=>i.company_id===e.row.company_id)) throw new Error('Missing research insight row.');
}
const directory=resolve(files[1]);mkdirSync(directory,{recursive:true});
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
writeFileSync(resolve(directory,`consultant-scoring-${stamp}-before.json`),JSON.stringify(before,null,2)+'\n',{flag:'wx'});
if(!args.includes('--apply')){
  console.log(JSON.stringify({preview:entries.length,new_rows:entries.filter(e=>!before.scores.some(s=>s.id===e.row.id)).length,backup_saved:true,database_written:false}));
  process.exit(0);
}
// All scores append in one request. Existing IDs are ignored, never replaced.
const {error:insertError}=await db.from('scores').upsert(entries.map(e=>e.row),{onConflict:'id',ignoreDuplicates:true});
if(insertError)throw new Error(`scores: ${insertError.message}`);
for(const e of entries){
  const i=before.company_insights.find(i=>i.company_id===e.row.company_id);
  const marker=`(assessment ${e.row.id})`;
  if(i.why_now_generated?.includes(marker))continue;
  const note=`Latest qualification review ${input.assessed_at} ${marker}: ${e.display_tier}. Evidence-backed total ${e.total}/100; ${categories.map((c,k)=>`${c} ${e.row[c+'_score']}/${maxima[k]}`).join(', ')}. Unresolved: ${e.unresolved_categories.join(', ')||'none'}. Reachability uses user-authorized general public professional routes and historical systems-action proxies; no team/Adi mutual is required and no Mando buying intent is claimed. Budget proxy credit is partial, release dates are shared/estimated, and unknown zeroes are provisional. This review supersedes older qualification notes. Incomplete dashboard badge requires PR17 deployment.`;
  const why=(i.why_now_generated||'')+'\n\n'+note;
  const {data,error}=await db.from('company_insights').update({why_now_generated:why,generated_at:new Date().toISOString()}).eq('company_id',i.company_id).eq('updated_at',i.updated_at).select('company_id');
  if(error||data?.length!==1)throw new Error(`Insight update stopped for ${e.company_name}; appended scores are retained. Refresh/retry to preserve concurrent edits.`);
}
const after=await snapshot();
writeFileSync(resolve(directory,`consultant-scoring-${stamp}-after.json`),JSON.stringify(after,null,2)+'\n',{flag:'wx'});
for(const e of entries){
  const saved=after.scores.find(s=>s.id===e.row.id);
  if(!saved||!matches(saved,e.row)||saved.total!==e.total)throw new Error('Saved assessment mismatch.');
}
for(const table of ['scores','weekly_snapshots']){
  const current=new Map(after[table].map(r=>[r.id,r]));
  if(before[table].some(r=>canonical(current.get(r.id))!==canonical(r)))throw new Error(`Historical ${table} changed during import; inspect private backups.`);
}
for(const i of before.company_insights.filter(i=>companyIds.has(i.company_id))){
  const current=after.company_insights.find(r=>r.company_id===i.company_id);
  for(const field of ['persona_generated','level_generated','persona_override','level_override','why_now_override'])
    if(current[field]!==i[field])throw new Error('Research/persona or manual override changed during import.');
}
console.log(JSON.stringify({saved_assessments:23,maybe:entries.filter(e=>e.display_tier==='Maybe').length,not_enough_evidence:entries.filter(e=>e.display_tier==='Not Enough Evidence').length,old_scores_preserved:true,weekly_history_preserved:true,manual_overrides_preserved:true,private_backups_saved:true}));
