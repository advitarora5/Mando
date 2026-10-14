import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consultantReachability } from '../src/domain/scoring/consultant-reachability.ts';

const route={ contact_name:'Synthetic leader', linkedin_url:'https://www.linkedin.com/in/synthetic-leader',
  source:'https://example.com/customer-story',role_source:'https://example.com/leadership',reason:'Synthetic reviewed evidence.',
  current_relevant_role:true,demonstrated_system_action:null };

test('a sourced current professional route earns partial credit without a team mutual',()=>{
  const result=consultantReachability(route);
  assert.equal(result.score,15);
  assert.equal(result.status,'partial');
  assert.match(result.reason,/not verified willingness to buy Mando/);
});
test('full credit additionally needs demonstrated systems action and a current role',()=>{
  assert.equal(consultantReachability({...route,demonstrated_system_action:true}).score,25);
  assert.equal(consultantReachability({...route,current_relevant_role:null,demonstrated_system_action:true}).score,10);
  assert.equal(consultantReachability({...route,current_relevant_role:false,demonstrated_system_action:true}).score,0);
});
test('missing or spoofed identities and unsupported claims fail before scoring',()=>{
  for(const patch of [{linkedin_url:'https://linkedin.com.evil.test/in/person'},{linkedin_url:'https://www.linkedin.com/company/example'},
    {source:'javascript:bad'},{role_source:''},{contact_name:''},{current_relevant_role:'yes'},{demonstrated_system_action:'yes'}]) {
    assert.throws(()=>consultantReachability({...route,...patch}));
  }
});
