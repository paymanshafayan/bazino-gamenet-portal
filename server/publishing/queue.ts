import { randomUUID } from 'node:crypto';
import { OpsCore, fingerprint, nowISO } from '../management/core';
import { PublishingSettings } from './settings';
import { ZernioClient, ProviderFailure } from './provider';
export interface InboxEvent {type:string;accountId:string;nativeId?:string;commentId?:string;authorId?:string;username?:string;text?:string;createdAt?:string;conversationId?:string;participantId?:string;button?:string;direction?:string;providerPostId?:string;publicationId?:string;platform?:string;status?:string;timestamp:string;cursor?:string;messageId?:string;mediaType?:'post'|'reel'|'story'|'unknown';targets?:Array<{accountId:string;platform:string;nativeId:string;status:string}>;}
export class DurableQueue {
  settings:PublishingSettings;
  client:ZernioClient;
  constructor(public core:OpsCore,fetcher?:typeof fetch){this.settings=new PublishingSettings(core);this.client=new ZernioClient(this.settings,fetcher);}
  async ingest(eventId:string,hash:string,event:InboxEvent,stream='main'){
    const id=fingerprint({provider:'zernio',eventId});
    return this.core.store.runInTransaction(async()=>{
      const old=await this.core.read('pub-inbox',id);
      if(old){if(old.data.hash!==hash)return {conflict:true,duplicate:false};return {duplicate:true,id};}
      await this.core.save('pub-inbox',id,{hash,event,stream,status:'pending',receivedAt:nowISO(),attempts:0,nextAt:0},0);
      return {duplicate:false,id};
    });
  }
  async enqueue(input:any,stage:string){
    // The private-reply key is independent of campaign, language and message role.
    const id=fingerprint(input.kind==='private_reply'?{account:input.accountId,comment:input.commentId,kind:'private_reply'}:{member:input.memberId,stage});
    if(await this.core.read('pub-outbox',id))return id;
    await this.core.save('pub-outbox',id,{...input,stage,status:'queued',createdAt:nowISO(),attempts:0,nextAt:0},0,`pr:${id}`);
    return id;
  }
  async processInbox(handler:(event:InboxEvent)=>Promise<any>,stream='main',limit=30){
    const rows=(await this.core.list('pub-inbox')).filter(r=>r.data.stream===stream&&(['pending','processing','waiting_media'].includes(r.data.status)))
      .sort((a,b)=>a.data.receivedAt.localeCompare(b.data.receivedAt)).slice(0,limit);
    for(const row of rows){
      const token=randomUUID();
      const claimed=await this.core.store.runInTransaction(async()=>{
        const fresh=await this.core.read('pub-inbox',row.id);if(!fresh||!['pending','processing','waiting_media'].includes(fresh.data.status)||fresh.data.nextAt>Date.now()||fresh.data.leaseUntil>Date.now())return false;
        await this.core.save('pub-inbox',row.id,{...fresh.data,status:'processing',leaseToken:token,leaseUntil:Date.now()+60000},fresh.version);return true;
      });if(!claimed)continue;
      let status='done',error='';try{const r=await handler(row.data.event);if(r?.ignored)status='ignored';if(r?.wait)status='waiting_media';}catch(e:any){status='pending';error=/^[A-Z0-9_]+$/.test(e?.code)?e.code:'PROCESSING_ERROR';}
      await this.core.store.runInTransaction(async()=>{
        const fresh=await this.core.read('pub-inbox',row.id);if(!fresh||fresh.data.leaseToken!==token)return;
        const attempts=fresh.data.attempts+1;
        if((status==='pending'||status==='waiting_media')&&(attempts>=8||Date.now()-Date.parse(fresh.data.receivedAt)>86400000))status='failed';
        await this.core.save('pub-inbox',row.id,{...fresh.data,status,error,attempts,nextAt:Date.now()+Math.min(3600000,1000*2**attempts),leaseUntil:0,leaseToken:null},fresh.version);
      });
    }
  }
  async sendOutbox(beforeSend?:(data:any)=>Promise<boolean>,afterSend?:(data:any,result:any)=>Promise<void>,prepare?:(data:any)=>Promise<any>){
    if(!(await this.settings.config()).data.outboundEnabled)return;
    const rows=(await this.core.list('pub-outbox')).filter(r=>['queued','sending'].includes(r.data.status)).sort((a,b)=>a.data.createdAt.localeCompare(b.data.createdAt)).slice(0,10);
    for(const row of rows){
      const token=randomUUID();
      const input=await this.core.store.runInTransaction(async()=>{
        const r=await this.core.read('pub-outbox',row.id);if(!r||!['queued','sending'].includes(r.data.status)||r.data.nextAt>Date.now())return null;
        if(r.data.status==='sending'){
          if(r.data.leaseUntil<Date.now())await this.core.save('pub-outbox',r.id,{...r.data,status:'delivery_unknown',error:'WORKER_INTERRUPTED'},r.version);
          return null;
        }
        if(r.data.expiresAt && Date.parse(r.data.expiresAt)<Date.now()){await this.core.save('pub-outbox',r.id,{...r.data,status:'expired',error:'MESSAGE_WINDOW_EXPIRED'},r.version);return null;}
        const health=await this.core.read('pub-account',r.data.accountId);if(health?.data.connected===false)return null;
        await this.core.save('pub-outbox',r.id,{...r.data,status:'sending',leaseToken:token,leaseUntil:Date.now()+60000,attemptedAt:nowISO()},r.version);return r.data;
      });if(!input)continue;
      let status='sent',error='',result:any,delay=0;
      try{
        if(beforeSend && !await beforeSend(input)){status='blocked';error='MEDIA_OR_POLICY_INACTIVE';}
        else result=await this.client.send(prepare?await prepare(input):input,row.id);
      }catch(e:any){status=e instanceof ProviderFailure&&e.uncertain?'delivery_unknown':'failed';error=e.code||'SEND_ERROR';if(e.retryAfter){status='queued';delay=e.retryAfter*1000;}}
      await this.core.store.runInTransaction(async()=>{
        const r=await this.core.read('pub-outbox',row.id);if(!r||r.data.leaseToken!==token)return;
        if(status==='sent'&&result&&afterSend)await afterSend(input,result);
        await this.core.save('pub-outbox',r.id,{...r.data,status,error,providerMessageId:result?.messageId,attempts:(r.data.attempts||0)+1,nextAt:Date.now()+delay,leaseUntil:0,leaseToken:null,sentAt:status==='sent'?nowISO():undefined},r.version);
      });
    }
  }
  async report(){
    const inbox=await this.core.list('pub-inbox'),outbox=await this.core.list('pub-outbox');
    return {inbox:inbox.slice(0,100).map(r=>({id:r.id,type:r.data.event.type,status:r.data.status,error:r.data.error,at:r.data.receivedAt})),outbox:outbox.slice(0,100).map(r=>({id:r.id,status:r.data.status,stage:r.data.stage,error:r.data.error,at:r.data.createdAt})),counts:{received:inbox.length,sent:outbox.filter(r=>r.data.status==='sent').length,unknown:outbox.filter(r=>r.data.status==='delivery_unknown').length,queued:outbox.filter(r=>r.data.status==='queued').length}};
  }
}
