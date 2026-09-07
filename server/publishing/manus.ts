import {createHash,createVerify} from 'node:crypto';
import {OpsCore,fail,nowISO} from '../management/core';
import {AgentRegistry} from './agents';
import {ProviderFailure} from './provider';
export function verifyManusRsa(raw:Buffer,url:string,timestamp:string,signature:string,publicKey:string){
  if(!/^\d{10}$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300||!signature||signature.length>4096)return false;
  try{const verifier=createVerify('RSA-SHA256');verifier.update(`${timestamp}.${url}.${createHash('sha256').update(raw).digest('hex')}`);return verifier.verify(publicKey,signature,'base64');}catch{return false;}
}
export class ManusClient {
  agents:AgentRegistry;
  constructor(public core:OpsCore,public fetcher:typeof fetch=fetch){this.agents=new AgentRegistry(core,fetcher);}
  async credential(agentId:string){
    const a=await this.agents.get(agentId);if(!a||!a.data.enabled)fail('AGENT_NOT_AVAILABLE',409);if(a.data.adapterId!=='manus')fail('AGENT_ADAPTER_UNSUPPORTED',409);
    const key=await this.agents.settings.vault.agentKey(a.data);if(!key||key==='simulator')fail('AGENT_KEY_REQUIRED',409);
    return {agent:a,key,fingerprint:createHash('sha256').update(key).digest('hex')};
  }
  async rpc(agentId:string,path:string,method='GET',body?:any){
    const {key}=await this.credential(agentId);
    try{const r=await this.fetcher(`https://api.manus.ai/v2/${path}`,{method,headers:{'x-manus-api-key':key,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000),redirect:'error'});
      if(!r.ok)throw new ProviderFailure(`MANUS_HTTP_${r.status}`,method!=='GET'&&r.status>=500);
      const d=await r.json();if(d.ok!==true)throw new ProviderFailure('MANUS_REQUEST_REJECTED',false);return d;
    }catch(e){if(e instanceof ProviderFailure)throw e;throw new ProviderFailure('MANUS_CONNECTION_ERROR',method!=='GET');}
  }
  async cachePublicKey(agentId:string){
    try{const d=await this.rpc(agentId,'webhook.publicKey');if(d.algorithm!=='RSA-SHA256'||!String(d.public_key).includes('BEGIN PUBLIC KEY'))return;
      await this.core.store.runInTransaction(async()=>{const old=await this.core.read('pub-manus-key',agentId);await this.core.save('pub-manus-key',agentId,{publicKey:d.public_key,at:nowISO()},old?.version||0);});
    }catch{/* Polling remains available. Never bypass signature checks if key retrieval fails. */}
  }
  async create(agentId:string,title:string,language:string,prompt:string,purpose:'generate'|'publish'){
    const {agent}=await this.credential(agentId);
    const schema=purpose==='publish'?{type:'object',properties:{media_id:{type:'string'},error:{type:'string'}},required:['media_id'],additionalProperties:false}:{type:'object',properties:{title:{type:'string'},body:{type:'string'}},required:['title','body'],additionalProperties:false};
    const d=await this.rpc(agentId,'task.create','POST',{title,locale:language,agent_profile:agent.data.profile||'standard',...(agent.data.projectId?{project_id:agent.data.projectId}:{}),share_visibility:'private',interactive_mode:false,message:{content:[{type:'text',text:prompt}]},structured_output_schema:schema});
    if(!d.task_id)throw new ProviderFailure('MANUS_TASK_UNCONFIRMED',true);return String(d.task_id);
  }
  async result(agentId:string,taskId:string){
    const d=await this.rpc(agentId,`task.listMessages?task_id=${encodeURIComponent(taskId)}&order=desc&limit=100`),messages=Array.isArray(d.messages)?d.messages:[];
    const result=messages.find((m:any)=>m.structured_output_result?.success===true)?.structured_output_result?.value;
    const state=messages.find((m:any)=>m.status_update?.agent_status)?.status_update.agent_status;
    if(state==='error')return {state:'failed',error:'AGENT_TASK_FAILED'};
    if(result&&state!=='running'&&state!=='waiting')return {state:'complete',result};
    return {state:state==='waiting'?'needs_input':'running'};
  }
}
