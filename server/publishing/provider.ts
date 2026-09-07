import { PublishingSettings } from './settings';
import { fail } from '../management/core';
export class ProviderFailure extends Error {
  constructor(public code:string,public uncertain=false,public retryAfter=0){super(code);}
}
export class ZernioClient {
  constructor(public settings:PublishingSettings,public fetcher:typeof fetch=fetch){}
  async request(path:string,method='GET',body?:unknown,key?:string):Promise<any>{
    const apiKey=await this.settings.vault.zernio('zernio_api_key');if(!apiKey)fail('ZERNIO_NOT_CONFIGURED',409);
    try{
      const r=await this.fetcher(`https://zernio.com/api${path}`,{method,headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000),redirect:'error'});
      if(!r.ok)throw new ProviderFailure(`ZERNIO_HTTP_${r.status}`,method!=='GET'&&r.status>=500,r.status===429?Math.min(3600,Number(r.headers.get('retry-after'))||60):0);
      const json=await r.json().catch(()=>{throw new ProviderFailure('ZERNIO_INVALID_RESPONSE',method!=='GET');});
      return json;
    }catch(e){if(e instanceof ProviderFailure)throw e;throw new ProviderFailure('ZERNIO_CONNECTION_ERROR',method!=='GET');}
  }
  async follow(accountId:string,userId:string):Promise<'verified'|'not_following'|'unknown'>{
    try{const r=await this.request(`/v1/accounts/${encodeURIComponent(accountId)}/follow-status/${encodeURIComponent(userId)}`);const d=r.data||r;return d.isFollower===true?'verified':d.isFollower===false?'not_following':'unknown';}catch{return 'unknown';}
  }
  async send(input:any,key:string){
    const path=input.kind==='private_reply'?`/v1/inbox/comments/${encodeURIComponent(input.mediaId)}/${encodeURIComponent(input.commentId)}/private-reply`:`/v1/inbox/conversations/${encodeURIComponent(input.conversationId)}/messages`;
    if(input.kind==='dm'&&!input.conversationId)fail('CONVERSATION_REQUIRED',409);
    const response=await this.request(path,'POST',{accountId:input.accountId,message:input.text,...(input.buttons?.length?{buttons:input.buttons}:{})},key);
    const d=response.data||response;
    const messageId=d.messageId||d.message?.id||d.id;
    if(d.success===false||!messageId)throw new ProviderFailure('ZERNIO_SEND_UNCONFIRMED',true);
    return {messageId:String(messageId),conversationId:d.conversationId?String(d.conversationId):input.conversationId};
  }
}
