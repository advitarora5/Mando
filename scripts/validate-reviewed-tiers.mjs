// Pure validation shared by HTTPS and legacy offline SQL import preparation.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {evaluateTier} from '../src/domain/scoring/tier-rules.ts';
import {displayTier} from '../src/domain/scoring/display.ts';
export function assertReviewedTiers(entries){
 assert(Array.isArray(entries),'Reviewed assessments must be an array');
 for(const e of entries){const result=evaluateTier(e.row);assert.equal(e.total,result.total,'Reviewed total differs from category points');assert.equal(e.row.tier,result.tier,'Reviewed tier differs from shared evaluator; regenerate and review before importing');if(e.display_tier!==undefined)assert.equal(e.display_tier,displayTier({...e.row,...result}),'Reviewed display tier differs from unchanged evidence rules');}
 return true;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))assertReviewedTiers(JSON.parse(fs.readFileSync(0,'utf8')).companies);
