import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {assessTeamCompany} from './team-public-rubric.mjs';
const folder='src/data/research/team43-rubric-20261012';
const input=JSON.parse(fs.readFileSync(`${folder}/facts.json`,'utf8'));
const companies=input.companies.map(c=>{
 const a=assessTeamCompany(c,input.as_of_date);
 const h=createHash('sha256').update(`${c.company_id}:${input.rubric_version}:${input.assessed_at}`).digest('hex');
 a.row.id=`${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
 a.row.assessed_at=input.assessed_at;
 const opportunity=a.detail.timing.score>5?a.detail.timing.reason:a.detail.timing.score===5?'Confirmed ongoing Workday operation creates an operational testing opportunity; recent urgency is unconfirmed.':'Workday selection is documented, but production deployment and urgency remain unconfirmed.';
 a.why_now=`${opportunity} Public professional routes support outreach research, while deliverability and a present Mando purchase commitment remain unconfirmed.`;
 a.next_action=a.detail.timing.score===0?'Confirm production deployment and its module-specific completion date.':'Validate the selected contact’s direct route and ask about the next Workday testing or procurement milestone.';
 return {number:c.number,company_name:c.company_name,company_id:c.company_id,previous:c.previous,...a};
});
const out={assessed_at:input.assessed_at,as_of_date:input.as_of_date,rubric_version:input.rubric_version,policy:'team-public-evidence-v4-screenshot',companies};
fs.writeFileSync(`${folder}/assessments.json`,JSON.stringify(out,null,2)+'\n');
let report=`# Reviewed rescore: 43 companies\n\nAs of ${input.as_of_date}, America/Chicago. Screenshot Timing and Release override the attached v4 document. Previous assessments are retained. Unsourced email verification flags earn no bonuses.\n\n`;
for(const c of companies){
 report+=`## ${c.number}. ${c.company_name}\n\nID: ${c.company_id}. Total ${c.previous.total} → ${c.total}/100; displayed tier **${c.display_tier}**.\n\n|Category|Previous → new|Evidence and arithmetic|Missing|Sources|\n|---|---|---|---|---|\n`;
 for(const [k,e] of Object.entries(c.detail))report+=`|${k}|${c.previous[k+'_score']} → ${e.score}|${e.reason.replaceAll('|','/')}|${e.missing.join(' ')}|${[...new Set([e.source,...e.sources||[]].filter(Boolean))].join(' ; ')}|\n`;
 report+=`\nWhy now: ${c.why_now}\n\nNext action: ${c.next_action}\n\n`;
}
fs.writeFileSync(`${folder}/review.md`,report.trimEnd()+'\n');
console.log(JSON.stringify(companies.map(c=>[c.number,c.company_name,c.total,c.display_tier])));
console.log(JSON.stringify(companies.reduce((a,c)=>(a[c.display_tier]=(a[c.display_tier]||0)+1,a),{})));

