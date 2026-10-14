import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessEvidence } from '../src/domain/scoring/evidence-assessment.ts';
import { displayTier } from '../src/domain/scoring/display.ts';
import { evaluateTier } from '../src/domain/scoring/tier-rules.ts';
const source='https://example.com/research';
const fact=verified=>({verified,source,reason:'Synthetic reviewed fact.'});
const base={company_id:'test-company',workforce:{count:3000,source,reason:'Sourced workforce.'},leadership:fact(true),
  one_degree_connection:fact(null),authority_and_willingness:fact(null),adjacent_tool_purchase:fact(null),purchase_timeline:fact(null),financial_stability:fact(null),
  workday_live:fact(true),go_live:{date:'2019-07-01',source,reason:'Verified historical deployment.',historical_window_older_than_year:false}};
const now=new Date('2026-10-12T04:08:13Z');
test('Authority needs leadership and the inclusive 3,000-employee threshold',()=>{
  assert.equal(assessEvidence(base,now).row.authority_score,25);
  assert.equal(assessEvidence({...base,workforce:{...base.workforce,count:2999}},now).row.authority_score,0);
  assert.equal(assessEvidence({...base,leadership:fact(null)},now).row.authority_score,0);
});
test('a public profile does not substitute for a connection and willingness',()=>{
  const result=assessEvidence(base,now);
  assert.equal(result.row.reachability_score,0);
  assert.equal(displayTier(result.row),'Not Enough Evidence');
  assert.equal(assessEvidence({...base,one_degree_connection:fact(true)},now).row.reachability_score,0);
  assert.equal(assessEvidence({...base,one_degree_connection:fact(true),authority_and_willingness:fact(true)},now).row.reachability_score,25);
});
test('adjacent-tool adoption earns only partial Budget credit',()=>{
  const result=assessEvidence({...base,adjacent_tool_purchase:fact(true)},now);
  assert.equal(result.row.budget_score,10);
  assert.equal(result.states.budget,'partial');
  assert.equal(assessEvidence({...base,financial_stability:fact(true)},now).row.budget_score,0);
  assert.equal(assessEvidence({...base,purchase_timeline:fact(true),financial_stability:fact(true)},now).row.budget_score,20);
});
test('a reviewed failure is Disqualified while an unverified fact remains incomplete',()=>{
  const failed=assessEvidence({...base,one_degree_connection:fact(false),authority_and_willingness:fact(false),purchase_timeline:fact(false),financial_stability:fact(false)},now);
  assert.equal(displayTier(failed.row),'Disqualified');
  assert.equal(failed.total,30);
  assert.equal(displayTier(assessEvidence(base,now).row),'Not Enough Evidence');
});
test('an unknown source-linked reachability claim cannot bypass the tier gate',()=>{
  const evidence='https://example.com | Assessment status: met. Synthetic verified evidence.';
  const result=evaluateTier({authority_score:25,reachability_score:25,budget_score:20,release_score:15,timing_score:15,authority_evidence:evidence,reachability_evidence:'https://example.com | Assessment status: unknown. Connection unavailable.'});
  assert.equal(result.total,100);
  assert.equal(result.tier,'Disqualified');
});
test('known old month-level windows score zero without inventing an exact date',()=>{
  const result=assessEvidence({...base,go_live:{...base.go_live,date:null,historical_window_older_than_year:true}},now);
  assert.equal(result.row.timing_score,0);
  assert.equal(result.states.timing,'not_met');
  const unknown=assessEvidence({...base,go_live:{...base.go_live,date:null}},now);
  assert.equal(unknown.states.timing,'unknown');
});
test('malformed or unsupported research inputs fail before any save',()=>{
  assert.throws(()=>assessEvidence({...base,leadership:{...fact(true),source:'javascript:bad'}},now),/source/);
  assert.throws(()=>assessEvidence({...base,leadership:fact('yes')},now),/verification/);
  assert.throws(()=>assessEvidence({...base,go_live:{...base.go_live,date:'2026-02-31'}},now),/real exact/);
});
