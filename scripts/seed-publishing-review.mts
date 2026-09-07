/** Local-only browser fixtures. Never accepts a production database. */
import fs from 'node:fs';
import {SqliteStore} from '../server/dataProviders';
import {OpsCore,nowISO} from '../server/management/core';
import {defaultCampaign} from '../server/publishing/settings';
import {InstagramCampaignService} from '../server/affiliate/campaignV4';
if(process.env.PUBLISHING_REVIEW_SEED!=='1'||!String(process.env.BAZINO_DATA_DIR).includes('/.cache/bazino-v4'))throw Error('LOCAL_REVIEW_ONLY');
const store=new SqliteStore();await store.connect();await store.createDatabaseIfNotExist();const core=new OpsCore(()=>store),service=new InstagramCampaignService(core);
if(!await store.getUserByUsername('review_gamer'))await store.createUser({username:'review_gamer',password:process.env.PREVIEW_PASSWORD!,email:'',phone:'+15555552001'});
await store.updateUserFields('review_gamer',{phoneVerifiedAt:nowISO(),displayName:'Review gamer'});
if(!await store.getAffiliateByCode('878787'))await store.createAffiliate({id:'AFF-REVIEW',code:'878787',username:'',name:'Review partner',type:'instagram',language:'fa',destination:'/',parentId:'',status:'active',newPct:0,returnPct:0,tournamentPct:0,overridePct:0,notes:'LOCAL REVIEW FIXTURE',createdAt:nowISO(),updatedAt:nowISO()});
const id='REVIEW-FRIEND',prior=await core.read('pub-member',id),policy={...defaultCampaign(),active:true,accountId:'local-account',couponEnabled:true,couponValue:15,couponMinOrder:100};
const data:any={role:'friend',accountId:'local-account',mediaId:'18109137383324992',campaignId:'SQUAD26',igUserId:'9900555',username:'review_friend',language:'fa',partnerCode:'878787',parentId:'REVIEW-PARTNER',status:'link_sent',policy,policyVersion:1,followMethod:'button_event_only',followStatus:'unknown',shareStatus:'share_confirmed_by_friend_code',buttonNonce:'a'.repeat(32),createdAt:nowISO(),updatedAt:nowISO(),linkExpiresAt:new Date(Date.now()+86400000*30).toISOString()};
await core.save('pub-member',id,data,prior?.version||0);
if(!await store.getIgMemberById(id))await store.createIgMember({id,role:'friend',campaignId:data.campaignId,mediaId:data.mediaId,commentId:'review-friend-comment',igUserId:data.igUserId,igUsername:data.username,partnerCode:data.partnerCode,parentMemberId:data.parentId,affiliateCode:data.partnerCode,status:data.status,followMethod:data.followMethod,shareStatus:data.shareStatus,couponCode:'',inviteUrl:'',createdAt:nowISO(),updatedAt:nowISO()});
fs.writeFileSync('/home/user/.cache/bazino-v4/invite.json',JSON.stringify({id,token:await service.linkToken(id,data)}),{mode:0o600});
console.log('Local gate fixture prepared (no external requests).');
