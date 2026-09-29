import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {loadTypeScript} from './helpers/load-typescript.mjs';
const root=path.resolve('.');
async function fixture({status='SUBMITTED',missing=false,fail=null}={}){
 const calls=[];const tx={};const error=new Error('operation unavailable');const session={userId:'u1',role:'SALES_REP'};
 const updated={id:'d1',status:'SALES_APPROVED'};
 function attempt(name,data,client){assert.equal(client,tx);calls.push([name,data]);if(fail===name)throw error;}
 const {dealRegistrationService}=await loadTypeScript('src/services/dealRegistrationService.ts',{root,stubs:{
  zod:{ZodError:class extends Error{}},
  '@/lib/db':{db:{$transaction:async fn=>{calls.push(['tx']);return fn(tx);}}},
  '@/lib/audit/auditLogger':{recordAuditEvent:async(actor,data,client)=>{assert.equal(actor.userId,'u1');attempt('audit',data,client);}},
  '@/repositories/dealRepository':{dealRepository:{findVisibleById:async(actor,id)=>{assert.equal(id,'d1');calls.push(['find',actor]);return missing?null:{id:'d1',status};},updateStatus:async(data,client)=>{attempt('update',data,client);updated.status=data.nextStatus;return updated;},createApproval:async(data,client)=>attempt('approval',data,client)}},
  '@/repositories/backgroundJobRepository':{backgroundJobRepository:{create:async(data,client)=>attempt('job',data,client)}},
  '@/repositories/partnerRepository':{partnerRepository:{}}
 }});
 return {calls,error,updated,run:(nextStatus='SALES_APPROVED',role='SALES_REP')=>dealRegistrationService.transitionDeal({...session,role},'d1',{nextStatus,note:'reviewed'})};
}
test('sales approval updates and records exact history/audit using one transaction client',async()=>{
 const f=await fixture();assert.equal(await f.run(),f.updated);assert.deepEqual(f.calls.map(x=>x[0]),['find','tx','update','approval','audit']);
 assert.equal(f.calls[2][1].dealId,'d1');assert.equal(f.calls[2][1].nextStatus,'SALES_APPROVED');assert.equal(f.calls[3][1].fromStatus,'SUBMITTED');assert.equal(f.calls[3][1].toStatus,'SALES_APPROVED');assert.equal(f.calls[3][1].actorUserId,'u1');assert.equal(f.calls[3][1].note,'reviewed');assert.equal(f.calls[4][1].action,'deal.transitioned');
});
test('channel approval schedules leaderboard job with source identity and real quarter format',async()=>{
 const f=await fixture({status:'SALES_APPROVED'});await f.run('APPROVED','CHANNEL_MANAGER');assert.deepEqual(f.calls.map(x=>x[0]),['find','tx','update','approval','audit','job']);
 const job=f.calls[5][1];assert.equal(job.type,'LEADERBOARD_REFRESH');assert.equal(job.status,'QUEUED');assert.equal(job.payload.sourceEntityId,'d1');assert.equal(job.payload.sourceEntity,'DealRegistration');assert.match(job.payload.quarter,/^\d{4}-Q[1-4]$/);
});
test('real role, adjacency and missing-deal refusals happen before transaction',async()=>{
 for(const [opts,next,role,code] of [[{},'SALES_APPROVED','PARTNER_SELLER',403],[{},'APPROVED','CHANNEL_MANAGER',409],[{missing:true},'SALES_APPROVED','SALES_REP',404]]){const f=await fixture(opts);await assert.rejects(()=>f.run(next,role),e=>e.statusCode===code);assert.deepEqual(f.calls.map(x=>x[0]),['find']);}
});
test('update failure preserves identity and stops approval and audit',async()=>{
 const f=await fixture({fail:'update'});await assert.rejects(()=>f.run(),e=>e===f.error);assert.deepEqual(f.calls.map(x=>x[0]),['find','tx','update']);
});
test('audit failure stops approved job after update and history attempts',async()=>{
 const f=await fixture({status:'SALES_APPROVED',fail:'audit'});await assert.rejects(()=>f.run('APPROVED','CHANNEL_MANAGER'),e=>e===f.error);assert.deepEqual(f.calls.map(x=>x[0]),['find','tx','update','approval','audit']);
});
