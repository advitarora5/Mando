// Preview by default. Reconcile only reviewed latest stored tiers; never rescore categories.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import Papa from 'papaparse';
import {createClient} from '@supabase/supabase-js';
import {applyTierRules} from '../src/domain/scoring/tier-rules.ts';
import {tierForTotal,tierThresholds,RUBRIC_VERSION} from '../src/domain/scoring/rubric.ts';
import {displayTier,incompleteCategories} from '../src/domain/scoring/display.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
export const TABLES=['companies','scores','contacts','company_insights','weekly_snapshots'];
const ordered=v=>Array.isArray(v)?v.map(ordered):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])])):v;
export const hash=v=>createHash('sha256').update(JSON.stringify(ordered(v))).digest('hex');
const bytes=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const blank=v=>v==null||typeof v==='string'&&!v.trim();
export const manualFields=row=>Object.keys(row??{}).filter(k=>/manual|override/i.test(k)&&!blank(row[k])&&row[k]!==false);
const demoIds=new Set([1,20,30,40,50,60,70,80,90].map(n=>`d0000000-0000-4000-8000-${String(n).padStart(12,'0')}`));
const sortRows=rows=>rows.toSorted((a,b)=>String(a.id??a.company_id).localeCompare(String(b.id??b.company_id)));
export function latestDashboard(scores,cid){
 const rows=scores.filter(s=>s.company_id===cid).toSorted((a,b)=>b.assessed_at.localeCompare(a.assessed_at));
 assert(rows.length,`Missing latest assessment ${cid}`);assert(rows.every(s=>Number.isFinite(Date.parse(s.assessed_at))),'Invalid assessment timestamp');
 assert.equal(rows.filter(s=>Date.parse(s.assessed_at)===Date.parse(rows[0].assessed_at)).length,1,`Ambiguous tied latest assessment ${cid}`);return rows[0];
}
export function validatePopulation(manifest,companies){
 assert.equal(manifest.length,127,'Assignment must contain127realcompanies');const ids=new Set(manifest.map(m=>m.company_id));assert.equal(ids.size,127,'Duplicate assigned company');assert.equal(new Set(companies.map(c=>c.id)).size,companies.length,'Duplicate live companies');
 for(const m of manifest){assert(!demoIds.has(m.company_id),'Demo ID in real assignment');assert(!/^Demo Company\b/i.test(m.company_name),'Demo name in real assignment');assert(/^[0-9a-f-]{36}$/i.test(m.company_id),'Invalid assigned company UUID');const row=companies.find(c=>c.id===m.company_id);assert(row,`Assigned company missing live ${m.company_name}`);assert.equal(row.name,m.company_name,`Name/identity mismatch ${m.company_id}; review population before proceeding`);}
 const extra=companies.filter(c=>!ids.has(c.id));assert(extra.every(c=>demoIds.has(c.id)&&/^Demo Company [1-9]$/.test(c.name)),`Ambiguous nonassigned population: ${extra.map(c=>c.id).join(',')}`);return extra.map(c=>({id:c.id,name:c.name}));
}
export function buildTierPlan(manifest,baseline,previous){
 const excluded=validatePopulation(manifest,baseline.companies);const operations=[],held=[],review=[];
 for(const m of manifest){
  const original=latestDashboard(baseline.scores,m.company_id);const result=applyTierRules(original);assert(Number.isFinite(result.total),'Invalid total blocks reconciliation');
  const oldTier=result.tier==='Qualified'&&result.total<previous.Qualified?'Maybe':result.tier;
  const company=baseline.companies.find(c=>c.id===m.company_id),insight=baseline.company_insights.find(c=>c.company_id===m.company_id);
  const explicitManual=[...manualFields(original).map(k=>'scores.'+k),...manualFields(company).filter(k=>/tier|score/i.test(k)).map(k=>'companies.'+k),...manualFields(insight).filter(k=>/tier|score/i.test(k)).map(k=>'company_insights.'+k)];
  const row={...m,assessment_id:original.id,assessed_at:original.assessed_at,total:result.total,stored_total:original.total,stored_tier:original.tier,previous_evaluated_tier:oldTier,new_evaluated_tier:result.tier,previous_display_tier:displayTier({...result,tier:oldTier}),new_display_tier:displayTier(result),threshold_changes_tier:oldTier!==result.tier,stored_tier_needs_reconciliation:original.tier!==result.tier,evidence_gate_exception:result.tier!==tierForTotal(result.total),tier_reason:result.tier_reason,incomplete_categories:incompleteCategories(result).join(';'),manual_score_tier_fields:explicitManual.join(';'),manual_insight_fields:manualFields(insight).join(';'),snapshot_references:baseline.weekly_snapshots.filter(s=>s.score_id===original.id).length};
  assert.equal(Number(original.total),result.total,'Stored generated total differs; investigate without rescoring');
  if(row.stored_tier_needs_reconciliation){const op={id:original.id,company_id:m.company_id,name:m.company_name,table:'scores',patch:{tier:result.tier},before_tier:original.tier};if(explicitManual.length)held.push({...op,reason:'Explicit manual score/tier override: preserve and review'});else operations.push(op);}
  review.push(row);
 }
 return {schema_version:1,rubric_version:RUBRIC_VERSION,thresholds:tierThresholds,previous_config:previous,company_ids:manifest.map(m=>m.company_id),excluded_demos:excluded,operations,held,review};
}
async function readTable(db,table){const rows=[];for(let offset=0;;offset+=500){const {data,error}=await db.from(table).select('*').order(table==='company_insights'?'company_id':'id').range(offset,offset+499);if(error)throw Error(`Read ${table} failed (${error.code??'unknown'})`);rows.push(...data);if(data.length<500)return rows;}}
export async function snapshot(db){return Object.fromEntries(await Promise.all(TABLES.map(async t=>[t,await readTable(db,t)])));}
export function assertReconciliation(plan,baseline,fresh){
 validatePopulation(plan.review.map(r=>({company_id:r.company_id,company_name:r.company_name})),fresh.companies);
 const expected=structuredClone(baseline),done=new Set();
 for(const op of plan.operations){assert(plan.company_ids.includes(op.company_id),'Out-of-scope operation');assert.equal(op.table,'scores');assert.deepEqual(Object.keys(op.patch),['tier']);const original=baseline.scores.find(s=>s.id===op.id);assert.equal(original.company_id,op.company_id);assert.equal(latestDashboard(baseline.scores,op.company_id).id,op.id,'Historical assessment cannot be updated');assert.equal(applyTierRules(original).tier,op.patch.tier,'Operation differs from authoritative evaluator');const live=fresh.scores.find(s=>s.id===op.id);assert(live,'Target assessment disappeared');if(live.tier===op.patch.tier){expected.scores.find(s=>s.id===op.id).tier=op.patch.tier;done.add(op.id);}}
 for(const t of TABLES)assert.equal(hash(sortRows(fresh[t])),hash(sortRows(expected[t])),`Concurrent edit or unexpected ${t} change; stop and re-review`);
 for(const op of plan.operations)assert.equal(latestDashboard(fresh.scores,op.company_id).id,op.id,'Target is no longer latest');return done;
}
function privateFile(directory,label,data){assert(path.isAbsolute(directory)&&!directory.startsWith(root),'Raw backups/logs must be outside Git worktree');fs.mkdirSync(directory,{recursive:true,mode:0o700});const file=path.join(directory,`${label}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{mode:0o600,flag:'wx'});return file;}
function log(file,op,state){fs.appendFileSync(file,JSON.stringify({at:new Date().toISOString(),id:op.id,company_id:op.company_id,state})+'\n',{mode:0o600});fs.chmodSync(file,0o600);}
export async function runTierApply(db,plan,baseline,{apply=false,backupDirectory='/tmp/mando-tier70-private'}={}){
 let fresh=await snapshot(db);const backup=privateFile(backupDirectory,apply?'preapply':'preflight',fresh);let done=assertReconciliation(plan,baseline,fresh);
 if(!apply)return {applied:false,pending:plan.operations.length-done.size,already_done:done.size,backup};
 const logFile=path.join(backupDirectory,'tier-reconciliation-operations.jsonl');
 for(const op of plan.operations){fresh=await snapshot(db);done=assertReconciliation(plan,baseline,fresh);if(done.has(op.id)){log(logFile,op,'already_saved');continue;}log(logFile,op,'pending');try{
   const before=fresh.scores.find(s=>s.id===op.id);let request=db.from('scores').update(op.patch);for(const [k,v]of Object.entries(before))request=v===null?request.is(k,null):request.eq(k,typeof v==='object'?JSON.stringify(v):v);
   const {data,error}=await request.select('*');if(error||data?.length!==1)throw Error('Conditional tier update failed; possible concurrent edit');
   const after=await snapshot(db);const saved=assertReconciliation(plan,baseline,after);assert(saved.has(op.id),'Independent read-back did not confirm stored tier');log(logFile,op,'confirmed');
  }catch(e){log(logFile,op,'uncertain_or_failed');throw Error(`Stopped at ${op.id}; writes are non-atomic. Preserve partial progress and rerun preview to reconcile deterministic tier updates. ${e.message}`);}}
 fresh=await snapshot(db);done=assertReconciliation(plan,baseline,fresh);assert.equal(done.size,plan.operations.length);const afterBackup=privateFile(backupDirectory,'postapply',fresh);return {applied:true,confirmed:done.size,held:plan.held.length,backup,after_backup:afterBackup,log_file:logFile};
}
function config(){assert(process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY,'Existing HTTPS environment configuration required');const u=new URL(process.env.SUPABASE_URL);assert.equal(u.protocol,'https:');assert(!u.username&&!u.password,'URL must not embed credentials');return createClient(u.origin,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});}
function codeHashes(){return Object.fromEntries(['src/domain/scoring/rubric.ts','src/domain/scoring/tier-rules.ts','src/domain/scoring/display.ts','scripts/reconcile-latest-tiers.mjs'].map(f=>[f,bytes(path.join(root,f))]));}
export function parseArgs(args){
 let apply=false,planFile=null;const seen=new Set();
 for(let i=0;i<args.length;i++){const flag=args[i];assert(['--apply','--plan'].includes(flag)&&!seen.has(flag),'Unknown or duplicate flag');seen.add(flag);if(flag==='--apply')apply=true;else {planFile=args[++i];assert(planFile&&!planFile.startsWith('--'),'--plan requires a reviewed file');}}
 assert(!apply||planFile,'--apply requires a reviewed --plan');return {apply,planFile};
}
export async function main(args=process.argv.slice(2)){
 const {apply,planFile}=parseArgs(args);
 const dir=path.join(root,'research/tier70-reconciliation');const db=config();
 if(planFile){const plan=JSON.parse(fs.readFileSync(planFile));assert.equal(plan.rubric_version,RUBRIC_VERSION);assert.deepEqual(plan.thresholds,tierThresholds);assert.deepEqual(plan.code_hashes,codeHashes(),'Evaluator/script changed; regenerate and review');assert.equal(bytes(plan.manifest_file),plan.manifest_sha256,'Frozen manifest changed');assert.equal(bytes(plan.baseline_file),plan.baseline_sha256,'Private baseline changed');assert.equal(hash({...plan,plan_hash:undefined}),plan.plan_hash,'Reviewed plan changed');const baseline=JSON.parse(fs.readFileSync(plan.baseline_file));const reconstructed=buildTierPlan(Papa.parse(fs.readFileSync(plan.manifest_file,'utf8'),{header:true,skipEmptyLines:true}).data,baseline,plan.previous_config);for(const key of Object.keys(reconstructed))assert.equal(hash(plan[key]),hash(reconstructed[key]),'Plan differs from reviewed baseline/evaluator');const result=await runTierApply(db,plan,baseline,{apply});fs.writeFileSync(path.join(dir,apply?'apply-result.json':'preflight.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));return;}
 const manifestFile=path.join(dir,'assignment.csv');const parsed=Papa.parse(fs.readFileSync(manifestFile,'utf8'),{header:true,skipEmptyLines:true});assert.equal(parsed.errors.length,0);const baseline=await snapshot(db);const baselineFile=privateFile('/tmp/mando-tier70-private','review-baseline',baseline);const previous=JSON.parse(fs.readFileSync(path.join(dir,'previous-config.json')));const plan=buildTierPlan(parsed.data,baseline,previous);Object.assign(plan,{prepared_at:new Date().toISOString(),baseline_file:baselineFile,baseline_sha256:bytes(baselineFile),manifest_file:manifestFile,manifest_sha256:bytes(manifestFile),code_hashes:codeHashes()});plan.plan_hash=hash({...plan,plan_hash:undefined});fs.writeFileSync(path.join(dir,'import-plan.json'),JSON.stringify(plan,null,2)+'\n');fs.writeFileSync(path.join(dir,'preview.csv'),Papa.unparse(plan.review)+'\n');console.log(JSON.stringify({preview:true,database_writes:0,real_companies:127,excluded_demos:plan.excluded_demos.length,stored_tier_updates:plan.operations.length,held:plan.held.length,threshold_changes:plan.review.filter(r=>r.threshold_changes_tier).length,evidence_gate_exceptions:plan.review.filter(r=>r.evidence_gate_exception).length,baseline:baselineFile},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message.replaceAll(process.env.SUPABASE_SECRET_KEY??'SECRET_NOT_SET','[REDACTED]'));process.exitCode=1;});
