import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { OpsCore, fail, nowISO, stringValue } from '../management/core';
import { CAMPAIGN_MESSAGES } from '../../shared/publishing/messages';
import type { AgentProfile, CampaignPolicy, PublishingConfig } from '../../shared/publishing/types';

export const SECRET_NAMES = ['zernio_api_key', 'zernio_webhook_secret', 'zernio_analytics_webhook_secret', 'invite_signing_key'] as const;
export function protectedIntegrationSetting(key: string): boolean {
  return /^(publishing_|zernio_|manus_|agent_|ig_|integration_api_tokens|BAZINO_SECRETS|ZERNIO_|MANUS_)/.test(key);
}
export class SecretVault {
  constructor(public core: OpsCore) {}
  private key(): Buffer {
    const raw = process.env.BAZINO_SECRETS_KEY || '';
    const key = /^[a-f\d]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
    if (key.length !== 32) fail('SECRETS_KEY_REQUIRED', 409);
    return key;
  }
  available() { try { this.key(); return true; } catch { return false; } }
  async set(ref: string, value: string, actor: string) {
    if (!/^[a-zA-Z0-9_.:-]{1,90}$/.test(ref)) fail('INVALID_SECRET_REFERENCE');
    if (value.length > 16000) fail('SECRET_TOO_LONG');
    return this.core.store.runInTransaction(async () => {
      const old = await this.core.read('pub-vault', ref);
      let data: any = { cleared: true };
      if (value) {
        const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key(), nonce);
        cipher.setAAD(Buffer.from(ref));
        const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
        data = { ciphertext: ciphertext.toString('base64'), nonce: nonce.toString('base64'), tag: cipher.getAuthTag().toString('base64'), keyId: createHash('sha256').update(this.key()).digest('hex').slice(0, 12) };
      }
      await this.core.save('pub-vault', ref, data, old?.version || 0);
      await this.core.audit(actor, value ? 'credential.set' : 'credential.clear', ref);
      return { configured: !!value };
    });
  }
  async read(ref: string): Promise<string | undefined> {
    const r = await this.core.read('pub-vault', ref);
    if (!r) return undefined;
    if (r.data.cleared) return '';
    try {
      const d = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(r.data.nonce, 'base64'));
      d.setAAD(Buffer.from(ref)); d.setAuthTag(Buffer.from(r.data.tag, 'base64'));
      return Buffer.concat([d.update(Buffer.from(r.data.ciphertext, 'base64')), d.final()]).toString('utf8');
    } catch { fail('CREDENTIAL_UNAVAILABLE', 409); }
  }
  async zernio(name: typeof SECRET_NAMES[number]): Promise<string> {
    const envName = name === 'invite_signing_key' ? 'IG_INVITE_SIGNING_SECRET' : name.toUpperCase();
    if (process.env[envName]) return process.env[envName]!;
    const value = await this.read(name); if (value !== undefined) return value;
    // Existing server-only key remains usable until explicitly migrated/revoked.
    return name === 'zernio_api_key' ? (await this.core.store.getSetting(name) || '') : '';
  }
  async status(name: typeof SECRET_NAMES[number]) {
    const envName = name === 'invite_signing_key' ? 'IG_INVITE_SIGNING_SECRET' : name.toUpperCase();
    try { return { configured: !!await this.zernio(name), source: process.env[envName] ? 'host' : await this.core.read('pub-vault', name) ? 'panel' : 'legacy', error: '' }; }
    catch { return { configured: false, source: 'panel', error: 'CREDENTIAL_UNAVAILABLE' }; }
  }
  async agentKey(agent: AgentProfile) {
    const value = await this.read(agent.credentialRef);
    if (value !== undefined) return value; // Explicit clear never re-enables legacy/env.
    return agent.credentialRef === 'agent:manus' ? (await this.core.store.getSetting('manus_api_key') || process.env.MANUS_API_KEY || '') : '';
  }
}
export function defaultCampaign(): CampaignPolicy {
  return { name: 'Invite Your Squad', active: false, accountId: '', languages: ['tr','fa','en','ru'], keywords: {fa:'آماده',tr:'Hazır',en:'Ready',ru:'Готово'}, requireVerifiedFollow: false, requireLikeAttestation: true,
    couponEnabled:false,couponValue:0,couponType:'percent',couponDays:30,couponMinOrder:0,
    financialApproved:false,newCustomerOnly:true,commissionPct:0,refundDays:0,attributionDays:30,payoutMin:0,responsible:'',messages:structuredClone(CAMPAIGN_MESSAGES) };
}
export class PublishingSettings {
  vault: SecretVault;
  constructor(public core: OpsCore) { this.vault = new SecretVault(core); }
  async seed() {
    return this.core.store.runInTransaction(async () => {
      if (await this.core.read('pub-config','main')) return;
      if (!await this.core.read('pub-agent','builtin-manus')) await this.core.save('pub-agent','builtin-manus',{
        name:'Manus',adapterId:'manus',enabled:true,credentialRef:'agent:manus',projectId:'',profile:'standard',
      } satisfies AgentProfile,0);
      if (!await this.core.read('pub-campaign','SQUAD26')) await this.core.save('pub-campaign','SQUAD26',defaultCampaign(),0);
      await this.core.save('pub-config','main',{
        selectedMode:null,defaultAgentId:'builtin-manus',defaultCampaignId:'SQUAD26',zernioAccountId:'',zernioProfileId:'',outboundEnabled:false,baseUrl:'https://bazino.pro',timezone:'Asia/Famagusta',
      } satisfies PublishingConfig,0);
    });
  }
  async config() {
    await this.seed();
    const r = (await this.core.read<PublishingConfig>('pub-config','main'))!;
    return { ...r, data: { ...r.data, zernioAccountId:process.env.ZERNIO_IG_ACCOUNT_ID || r.data.zernioAccountId, zernioProfileId:process.env.ZERNIO_IG_PROFILE_ID || r.data.zernioProfileId } };
  }
  async saveConfig(actor:string,b:any) {
    const old=await this.config();
    if (b.selectedMode !== null && !['manual','agent'].includes(b.selectedMode)) fail('INVALID_MODE');
    const agent=await this.core.read<AgentProfile>('pub-agent',String(b.defaultAgentId));
    if(!agent||!agent.data.enabled) fail('AGENT_NOT_AVAILABLE');
    const base=new URL(String(b.baseUrl || old.data.baseUrl));
    if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash) fail('INVALID_BASE_URL');
    const timezone=String(b.timezone||old.data.timezone);try{new Intl.DateTimeFormat('en',{timeZone:timezone});}catch{fail('INVALID_TIMEZONE');}
    if(!await this.core.read('pub-campaign',String(b.defaultCampaignId)))fail('CAMPAIGN_NOT_FOUND');
    const data:PublishingConfig={selectedMode:b.selectedMode,defaultAgentId:agent.id,defaultCampaignId:String(b.defaultCampaignId),
      zernioAccountId:stringValue(b.zernioAccountId,100),zernioProfileId:stringValue(b.zernioProfileId,100),outboundEnabled:b.outboundEnabled===true,baseUrl:base.origin,timezone};
    return this.core.command(actor,b.idempotencyKey,'publishing.settings',data,()=>this.core.save('pub-config','main',data,Number(b.version)));
  }
  async saveCampaign(actor:string,id:string,b:any) {
    if(!/^[\w-]{1,48}$/.test(id))fail('INVALID_CAMPAIGN');
    const base=defaultCampaign(), data:CampaignPolicy={...base};
    data.name=stringValue(b.name,180,true); data.active=b.active===true;data.accountId=stringValue(b.accountId,100);
    data.languages=Array.isArray(b.languages)?[...new Set<string>(b.languages.filter((l:any)=>['fa','tr','en','ru'].includes(l)))] as CampaignPolicy['languages']:[];
    if(!data.languages.length)fail('LANGUAGE_REQUIRED');
    for(const l of ['fa','tr','en','ru'] as const){
      data.keywords[l]=stringValue(b.keywords?.[l]??base.keywords[l],40,true);
      for(const k of ['partner1','partner2','friend','invite','button'] as const) {
        const s=stringValue(b.messages?.[l]?.[k]??base.messages[l][k],k==='button'?20:2200,true);
        if(k.startsWith('partner') && /invite_url|[?&](?:sig|gate|partner_code|token)=|\/ig\/invite|\/invite\//i.test(s))fail('PRIVATE_LINK_FORBIDDEN');
        data.messages[l][k]=s;
      }
    }
    data.requireVerifiedFollow=b.requireVerifiedFollow===true;data.requireLikeAttestation=b.requireLikeAttestation!==false;
    data.couponEnabled=b.couponEnabled===true;data.couponType=b.couponType==='fixed'?'fixed':'percent';
    for(const key of ['couponValue','couponMinOrder','commissionPct','refundDays','payoutMin'] as const) {
      const v=Number(b[key]??base[key]);if(!Number.isFinite(v)||v<0||v>100000)fail('INVALID_POLICY_VALUE');data[key]=v;
    }
    data.couponDays=Number(b.couponDays??30);data.attributionDays=Number(b.attributionDays??30);
    if(!Number.isInteger(data.couponDays)||data.couponDays<1||data.couponDays>365||!Number.isInteger(data.attributionDays)||data.attributionDays<1||data.attributionDays>30||data.commissionPct>100||(data.couponType==='percent'&&data.couponValue>100))fail('INVALID_POLICY_VALUE');
    data.newCustomerOnly=true;data.financialApproved=b.financialApproved===true;data.responsible=stringValue(b.responsible,180);
    if(data.financialApproved&&(!data.responsible||data.refundDays<1||!Number.isInteger(data.refundDays)))fail('FINANCIAL_POLICY_REQUIRED');
    if(data.active&&!data.accountId)fail('ACCOUNT_REQUIRED');
    if(data.active&&!b.policyConfirmed)fail('POLICY_CONFIRMATION_REQUIRED');
    data.approvedAt=data.active?nowISO():undefined;
    return this.core.command(actor,b.idempotencyKey,'publishing.campaign',{id,data},()=>this.core.save('pub-campaign',id,data,Number(b.version)||0));
  }
  async invitationKey():Promise<string> {
    // Freeze legacy effective signing material BEFORE webhook secret rotation. Kept server-side.
    const stored=await this.core.store.getSetting('ig_invite_signing_secret'); if(stored)return stored;
    return this.core.store.runInTransaction(async()=>{
      const existing=await this.core.store.getSetting('ig_invite_signing_secret');if(existing)return existing;
      const key=process.env.IG_INVITE_SIGNING_SECRET || process.env.ZERNIO_WEBHOOK_SECRET || await this.core.store.getSetting('ig_ingest_token') || randomBytes(32).toString('hex');
      await this.core.store.setSetting('ig_invite_signing_secret',key);return key;
    });
  }
}
