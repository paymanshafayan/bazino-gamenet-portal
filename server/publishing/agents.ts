import { createHash } from 'node:crypto';
import {OpsCore,fail,newId,nowISO,stringValue} from '../management/core';
import {PublishingSettings} from './settings';
import type {AgentProfile} from '../../shared/publishing/types';
export class AgentRegistry {
  settings:PublishingSettings;
  constructor(public core:OpsCore,public fetcher:typeof fetch=fetch){this.settings=new PublishingSettings(core);}
  async get(id:string){return this.core.read<AgentProfile>('pub-agent',id);}
  async view(r:any){
    let configured=false,status='unconfigured',source='panel';
    try{const key=await this.settings.vault.agentKey(r.data);configured=!!key&&key!=='simulator';
      const fingerprint=createHash('sha256').update(key).digest('hex');
      status=configured?(r.data.checkResult==='ready'&&r.data.checkedFingerprint===fingerprint?'ready':r.data.checkResult==='failed'?'connection_failed':'configured_untested'):'unconfigured';
      if(r.data.credentialRef==='agent:manus'&&!await this.core.read('pub-vault',r.data.credentialRef))source=await this.core.store.getSetting('manus_api_key')?'legacy':'host';
    }catch{status='credential_unavailable';}
    if(!r.data.enabled)status='disabled';if(r.data.adapterId!=='manus')status='unsupported';
    return {id:r.id,version:r.version,data:{name:r.data.name,adapterId:r.data.adapterId,enabled:r.data.enabled,projectId:r.data.projectId,profile:r.data.profile},configured,status,source,checkedAt:r.data.checkedAt||null,
      capabilities:{draft:r.data.adapterId==='manus',externalPublish:r.data.adapterId==='manus',requiresExternalAccountAuthorization:true}};
  }
  async list(){await this.settings.seed();return Promise.all((await this.core.list<AgentProfile>('pub-agent')).map(r=>this.view(r)));}
  async save(actor:string,id:string|undefined,b:any){
    if(b.apiKey!==undefined&&typeof b.apiKey!=='string')fail('INVALID_KEY');
    if(typeof b.apiKey==='string'&&b.apiKey!==''&&!b.apiKey.trim())fail('INVALID_KEY');
    if(typeof b.apiKey==='string'&&b.apiKey.startsWith('baz_'))fail('PROVIDER_KEY_NOT_INGEST_TOKEN');
    return this.core.store.runInTransaction(async()=>{
      const old=id?await this.get(id):undefined;if(id&&!old)fail('AGENT_NOT_FOUND',404);
      if(old&&Number(b.version)!==old.version)fail('VERSION_CONFLICT',409);
      const agentId=id||newId('AG'),adapterId=b.adapterId==='manus'?'manus':'unsupported';
      if(agentId==='builtin-manus'&&adapterId!=='manus')fail('BUILTIN_ADAPTER_FIXED');
      const data:AgentProfile={name:stringValue(b.name,100,true),adapterId,enabled:b.enabled!==false,credentialRef:old?.data.credentialRef||`agent:${agentId}`,projectId:stringValue(b.projectId,200),profile:stringValue(b.profile||'standard',80),checkedAt:'',checkResult:undefined};
      // Save first to enforce CAS, then vault in the same transaction. No plaintext enters command/audit data.
      const r=await this.core.save('pub-agent',agentId,data,old?Number(b.version):0);
      if(b.apiKey!==undefined)await this.settings.vault.set(data.credentialRef,b.apiKey.trim(),actor);
      await this.core.audit(actor,'agent.save',agentId,{name:data.name,adapterId,enabled:data.enabled});
      return this.view(r);
    });
  }
  async testConnection(actor:string,id:string,b:any){
    if(b.confirmed!==true)fail('CONFIRMATION_REQUIRED');const r=await this.get(id);if(!r||!r.data.enabled)fail('AGENT_NOT_AVAILABLE',409);
    if(r.data.adapterId!=='manus')fail('AGENT_ADAPTER_UNSUPPORTED',409);
    const key=await this.settings.vault.agentKey(r.data);if(!key||key==='simulator')fail('AGENT_KEY_REQUIRED',409);
    let good=false;
    try{const response=await this.fetcher('https://api.manus.ai/v2/task.list?limit=1',{headers:{'x-manus-api-key':key},signal:AbortSignal.timeout(15000),redirect:'error'});const d=await response.json();good=response.ok&&d.ok===true;}catch{/* Status only: never return provider bodies that can contain secrets. */}
    await this.core.store.runInTransaction(async()=>{const fresh=await this.get(id);if(!fresh||fresh.version!==r.version)fail('VERSION_CONFLICT',409);
      await this.core.save('pub-agent',id,{...r.data,checkedAt:nowISO(),checkResult:good?'ready':'failed',checkedFingerprint:createHash('sha256').update(key).digest('hex')},r.version);
      await this.core.audit(actor,'agent.connection_check',id,{ok:good});
    });return this.view(await this.get(id));
  }
}
