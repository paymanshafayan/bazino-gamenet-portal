import type express from 'express';
import { createHmac, randomBytes } from 'node:crypto';
import { OpsCore, endpoint, fail, fingerprint, nowISO } from '../management/core';
import { InstagramCampaignService } from './campaignV4';
import { claimAttribution, recordClick } from './engine';
export class FriendGateService {
  campaign:InstagramCampaignService;
  constructor(public core:OpsCore){this.campaign=new InstagramCampaignService(core);}
  async info(id:string,token:string,username?:string){
    const r=await this.campaign.verifyLink(id,token),m=r.data;
    if(m.claimedBy&&m.claimedBy!==username)fail('INVITE_ALREADY_CLAIMED',409);
    const u=username?await this.core.store.getUserByUsername(username):undefined;
    const previous=m.claimedBy===username&&username?await this.core.read('pub-claim',fingerprint({campaign:m.campaignId,username})):undefined;
    return {campaign:m.policy.name,language:m.language,followMethod:m.followMethod,shareStatus:m.shareStatus,requireLikeAttestation:m.policy.requireLikeAttestation,
      expiresAt:m.linkExpiresAt,needsLogin:!u,needsPhoneVerification:!!u&&!u.phoneVerifiedAt,claimed:m.claimedBy===username&&!!username,
      coupon:{enabled:m.policy.couponEnabled&&m.policy.couponValue>0,value:m.policy.couponValue,type:m.policy.couponType,minOrder:m.policy.couponMinOrder,validDays:m.policy.couponDays},
      claimedCoupon:previous?.data.coupon||null,verificationMethod:'link_possession',requiresConsent:true};
  }
  async click(id:string,token:string,ip:string,ua:string){
    const r=await this.campaign.verifyLink(id,token);
    const key=fingerprint({id,visit:createHmac('sha256',await this.campaign.settings.invitationKey()).update(`${ip}:${ua}`).digest('hex'),bucket:Math.floor(Date.now()/900000)});
    return this.core.store.runInTransaction(async()=>{
      if(await this.core.read('pub-click',key))return;
      await this.core.save('pub-click',key,{memberId:id,campaignId:r.data.campaignId,code:r.data.partnerCode,at:nowISO()},0);
      await recordClick(this.core.store,{code:r.data.partnerCode,path:'/ig/invite',ip,ua,visitorId:key.slice(0,32)});
    });
  }
  async claim(id:string,username:string,b:any){
    if(!username)fail('AUTH_REQUIRED',401);
    if(b.consent!==true)fail('CONSENT_REQUIRED');
    if(b.handle!==undefined && !/^@?[A-Za-z0-9._]{0,30}$/.test(String(b.handle)))fail('INVALID_HANDLE');
    return this.core.store.runInTransaction(async()=>{
      const r=await this.campaign.verifyLink(id,String(b.token||'')),m=r.data;
      const u=await this.core.store.getUserByUsername(username);if(!u)fail('AUTH_REQUIRED',401);
      if(!u.phoneVerifiedAt)fail('PHONE_VERIFICATION_REQUIRED',403);
      const staff=await this.core.read('access',username);
      if(u.role==='admin'||staff?.data.permissions?.length)fail('STAFF_NOT_ELIGIBLE',403);
      if(m.claimedBy&&m.claimedBy!==username)fail('INVITE_ALREADY_CLAIMED',409);
      if(m.policy.requireLikeAttestation&&b.likeAttested!==true)fail('LIKE_ATTESTATION_REQUIRED');
      const claimKey=fingerprint({campaign:m.campaignId,username}),igKey=fingerprint({campaign:m.campaignId,igUserId:m.igUserId});
      const igClaim=await this.core.read('pub-ig-claim',igKey);if(igClaim&&igClaim.data.username!==username)fail('INVITE_ALREADY_CLAIMED',409);
      const existing=await this.core.read('pub-claim',claimKey);
      if(existing){if(existing.data.memberId!==id)fail('CAMPAIGN_ALREADY_CLAIMED',409);return {success:true,duplicate:true,coupon:existing.data.coupon,redirect:'/reservations'};}
      const attributed=await claimAttribution(this.core.store,{code:m.partnerCode,username,source:'link'});if(!attributed.ok)fail(attributed.error||'INVALID_REFERRAL');
      let coupon:any=null;
      if(m.policy.couponEnabled&&m.policy.couponValue>0){
        const code=`IG-${randomBytes(8).toString('hex').toUpperCase()}`;
        const expiryDate=new Date(Date.now()+m.policy.couponDays*86400000).toISOString();
        await this.core.store.createCoupon({code,type:m.policy.couponType==='percent'?'Percent':'Fixed',value:m.policy.couponValue,minOrder:m.policy.couponMinOrder,expiry:expiryDate.slice(0,10),expiryDate,maxUsageCount:1,usageCount:0,isActive:true,ownerUsername:username,scopes:JSON.stringify(['reservation'])} as any);
        coupon={code,type:m.policy.couponType,value:m.policy.couponValue,minOrder:m.policy.couponMinOrder,expiresAt:expiryDate};
      }
      await this.core.save('pub-claim',claimKey,{memberId:id,username,campaignId:m.campaignId,coupon,consentedAt:nowISO(),handle:String(b.handle||''),verificationMethod:'link_possession_and_phone_otp',likeMethod:b.likeAttested===true?'self_attested':'not_required'},0);
      await this.core.save('pub-ig-claim',igKey,{username,memberId:id},0);
      await this.core.save('pub-member',id,{...m,status:'activated',claimedBy:username,updatedAt:nowISO()},r.version);
      await this.core.store.updateIgMember(id,{status:'activated',couponCode:coupon?.code||'',updatedAt:nowISO()});
      await this.core.audit(username,'friend.activate',id,{campaignId:m.campaignId,verificationMethod:'link_possession_and_phone_otp',likeMethod:b.likeAttested?'self_attested':'not_required'});
      return {success:true,duplicate:false,coupon,redirect:'/reservations'};
    });
  }
}
export function registerFriendGate(app:express.Express,service:FriendGateService){
  const headers:express.RequestHandler=(_req,res,next)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');next();};
  app.get('/api/instagram/invites/:id',headers,endpoint(async(req,res)=>{
    const id=String(req.params.id),token=String(req.query.token||'');
    const data=await service.info(id,token,(req as any).authUsername);
    await service.click(id,token,req.ip||'',String(req.headers['user-agent']||''));res.json(data);
  }));
  app.post('/api/instagram/invites/:id/claim',headers,endpoint(async(req,res)=>res.json(await service.claim(String(req.params.id),(req as any).authUsername||'',req.body||{}))));
}
