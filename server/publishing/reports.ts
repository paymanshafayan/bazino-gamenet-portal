import {OpsCore,fail,nowISO,newId} from '../management/core';
export class PublishingReports {
  constructor(public core:OpsCore){}
  async report(){
    const store=this.core.store;
    const members=await this.core.list('pub-member'),outbox=await this.core.list('pub-outbox'),clicks=await this.core.list('pub-click'),claims=await this.core.list('pub-claim'),policies=await this.core.list('pub-affiliate-policy'),orders=await store.listOnsiteOrders(),commissions=await store.listAffiliateCommissions(),media=await this.core.list('pub-media'),invoices=await this.core.list('invoice'),metrics=await this.core.list('pub-metrics');
    const campaigns=[];
    for(const c of await this.core.list('pub-campaign')){
      const codes=new Set(policies.filter(p=>p.data.campaignId===c.id).map(p=>p.id)),users=new Set(claims.filter(r=>r.data.campaignId===c.id).map(r=>r.data.username));
      for(const code of codes)for(const a of await store.listAttributionsByCode(code))if(a.username)users.add(a.username);
      const co=commissions.filter(x=>codes.has(x.code));
      const native=orders.filter(o=>{let p:any={};try{p=JSON.parse(o.payload);}catch{}return p.referralCode?codes.has(p.referralCode):users.has(o.username);});
      const paidInvoices=invoices.filter(r=>r.data.receipt?.amount>0&&codes.has(r.data.referralCode));
      const invoiceIds=new Set(paidInvoices.map(x=>x.id));
      const cm=members.filter(m=>m.data.campaignId===c.id),ids=new Set(cm.map(m=>m.id));
      const ob=outbox.filter(r=>ids.has(r.data.memberId));
      const mediaIds=new Set(media.filter(m=>m.data.campaignId===c.id).map(m=>m.id));
      const ms=metrics.filter(m=>mediaIds.has(m.id));
      const total=(status:string)=>co.filter(x=>x.status===status).reduce((s,x)=>s+x.commissionAmount,0);
      campaigns.push({id:c.id,name:c.data.name,partners:cm.filter(x=>x.data.role==='partner').length,friends:cm.filter(x=>x.data.role==='friend').length,
        verifiedFollows:cm.filter(x=>x.data.followMethod==='follow_verified').length,buttonOnly:cm.filter(x=>x.data.followMethod==='button_event_only').length,
        sent:ob.filter(x=>x.data.status==='sent').length,failed:ob.filter(x=>['failed','delivery_unknown'].includes(x.data.status)).length,
        clicks:clicks.filter(x=>x.data.campaignId===c.id).length,leads:claims.filter(x=>x.data.campaignId===c.id).length,
        reserved:native.filter(x=>x.kind==='reservation').length,paid:native.filter(x=>x.status==='settled').length+invoiceIds.size,
        attended:co.filter(x=>x.attendedAt||x.kind==='session').length,netSales:native.filter(x=>x.status==='settled').reduce((s,x)=>s+x.amount,0)+paidInvoices.reduce((s,x)=>s+Number(x.data.newGameCost||0),0),
        pending:total('pending'),approved:total('approved'),walletCredited:total('wallet_credited'),reversed:total('reversed'),
        insights:ms.length?{shares:ms.reduce((s,m)=>s+(m.data.metrics?.shares||0),0),reach:ms.reduce((s,m)=>s+(m.data.metrics?.reach||0),0)}:null,
        payoutsAreWalletCredits:true});
    }
    const credits=commissions.filter(c=>c.status==='wallet_credited').reduce((s,c)=>s+c.commissionAmount,0);
    return {campaigns,financial:{walletCredited:credits,physicalHandoverTotal:(await this.core.list('cashout')).filter(r=>r.data.status==='paid').reduce((s,r)=>s+Number(r.data.amount||0),0),physicalHandoverIsAllWallets:true}};
  }
  async settleMonth(actor:string,b:any){
    if(b.confirmed!==true)fail('CONFIRMATION_REQUIRED');
    if(!/^\d{4}-\d{2}$/.test(b.period))fail('INVALID_PERIOD');
    const start=Date.parse(`${b.period}-01T00:00:00Z`);if(!Number.isFinite(start))fail('INVALID_PERIOD');
    const next=new Date(start);next.setUTCMonth(next.getUTCMonth()+1);if(next.getTime()>Date.now())fail('SETTLEMENT_PERIOD_OPEN',409);
    return this.core.command(actor,b.idempotencyKey,'social-monthly-settlement',{period:b.period,affiliateId:b.affiliateId},async()=>{
      const all=await this.core.store.listAffiliateCommissions({status:'approved'});const approved=[];
      for(const c of all){if(c.createdAt.slice(0,7)!==b.period||b.affiliateId&&c.affiliateId!==b.affiliateId||c.flag)continue;const policy=await this.core.read('pub-commission-policy',c.id);if(policy&&Date.parse(policy.data.holdUntil)<=Date.now())approved.push({c,policy});}
      let credited=0;const reasons:any[]=[];
      for(const id of new Set(approved.map(x=>x.c.affiliateId))){
        const group=approved.filter(x=>x.c.affiliateId===id),aff=await this.core.store.getAffiliateById(id);
        const amount=group.reduce((s,x)=>s+x.c.commissionAmount,0),minimum=Math.max(...group.map(x=>Number(x.policy.data.policy?.payoutMin)||0));
        if(!aff?.username||amount<minimum){reasons.push({affiliateId:id,reason:!aff?.username?'WALLET_USER_REQUIRED':'MINIMUM_NOT_REACHED'});continue;}
        for(const {c} of group){if(aff.username===c.username){reasons.push({affiliateId:id,reason:'SELF_REFERRAL'});continue;}
          const tx=await this.core.store.appendWalletTx({id:newId('TX'),username:aff.username,amount:c.commissionAmount,type:'commission',ref:c.id,operator:actor,note:`Approved campaign commission ${b.period}`,idempotencyKey:`igv4-wallet:${c.id}`,createdAt:nowISO()});
          await this.core.store.updateAffiliateCommission(c.id,{status:'wallet_credited',walletTxId:tx.id,paidOutAt:'',updatedAt:nowISO()});credited+=c.commissionAmount;
          await this.core.audit(actor,'commission.wallet_credit',c.id,{amount:c.commissionAmount,period:b.period});
        }
      }
      return {success:true,credited,skipped:reasons,physicalCashPaid:false};
    });
  }
}
