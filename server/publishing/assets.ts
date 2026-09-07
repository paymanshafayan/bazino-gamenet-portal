import type express from 'express';
import expressLib from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import sharp from 'sharp';
import ffprobe from '@ffprobe-installer/ffprobe';
import {OpsCore,endpoint,fail,newId,nowISO} from '../management/core';
import {dataPath,DATA_DIR} from '../paths';
import {PublishingSettings} from './settings';
import type {MediaAsset} from '../../shared/publishing/types';
const exec=promisify(execFile);
export const CHUNK_BYTES=4*1024*1024,MAX_VIDEO_BYTES=300*1024*1024,MAX_IMAGE_BYTES=8*1024*1024;
export async function hashFile(file:string){const h=createHash('sha256');for await(const c of fs.createReadStream(file))h.update(c);return h.digest('hex');}
export class AssetLibrary {
  root:string;settings:PublishingSettings;
  constructor(public core:OpsCore,root?:string){this.root=root||dataPath('media-library');this.settings=new PublishingSettings(core);}
  storage(){let writable=false;try{fs.mkdirSync(this.root,{recursive:true,mode:0o700});fs.accessSync(this.root,fs.constants.W_OK);writable=true;}catch{}return {writable,configured:!!process.env.BAZINO_DATA_DIR,durabilityVerified:false,kind:'server-volume',chunkBytes:CHUNK_BYTES,maxImageBytes:MAX_IMAGE_BYTES,maxVideoBytes:MAX_VIDEO_BYTES};}
  file(id:string,render=false){if(!/^AS-[a-f0-9-]+$/i.test(id))fail('INVALID_ASSET_ID');return path.join(this.root,`${id}${render?'.render':'.original'}`);}
  async owned(id:string,actor:string,admin=false){const r=await this.core.read<MediaAsset>('pub-asset',id);if(!r)fail('ASSET_NOT_FOUND',404);if(!admin&&r.data.owner!==actor)fail('FORBIDDEN',403);return r;}
  async list(actor:string,admin=false){return (await this.core.list<MediaAsset>('pub-asset')).filter(r=>admin||r.data.owner===actor);}
  async create(actor:string,b:any){
    if(!['image/jpeg','image/png','video/mp4'].includes(b.mime))fail('MEDIA_FORMAT_UNSUPPORTED');
    const size=Number(b.size),max=b.mime.startsWith('image/')?MAX_IMAGE_BYTES:MAX_VIDEO_BYTES;
    if(!Number.isSafeInteger(size)||size<1||size>max)fail('MEDIA_SIZE_LIMIT');
    if(!this.storage().writable||process.env.NODE_ENV==='production'&&!process.env.BAZINO_DATA_DIR)fail('MEDIA_STORAGE_NOT_CONFIGURED',409);
    return this.core.command(actor,b.idempotencyKey,'asset.create',{name:b.name,mime:b.mime,size},async()=>{
      const assets=await this.list(actor);const bytes=assets.filter(x=>x.data.status!=='cancelled').reduce((n,x)=>n+x.data.size,0);
      if(assets.filter(x=>x.data.status==='uploading').length>=10||bytes+size>2*1024*1024*1024)fail('MEDIA_QUOTA_EXCEEDED',409);
      const id=newId('AS');const data:MediaAsset={owner:actor,name:path.basename(String(b.name||'media')).replace(/[\x00-\x1f]/g,'').slice(0,150),mime:b.mime,size,received:0,status:'uploading',createdAt:nowISO(),expiresAt:new Date(Date.now()+86400000).toISOString()};
      fs.writeFileSync(this.file(id),Buffer.alloc(0),{flag:'wx',mode:0o600});return this.core.save('pub-asset',id,data,0);
    });
  }
  async chunk(actor:string,id:string,offset:number,bytes:Buffer,admin=false){
    if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>CHUNK_BYTES||!Number.isSafeInteger(offset)||offset<0)fail('INVALID_CHUNK');
    return this.core.store.runInTransaction(async()=>{
      const r=await this.owned(id,actor,admin),d=r.data;
      if(d.status!=='uploading'||Date.parse(d.expiresAt)<Date.now())fail('UPLOAD_NOT_OPEN',409);
      if(offset+bytes.length>d.size)fail('MEDIA_SIZE_LIMIT');
      if(offset>d.received)fail('CHUNK_OUT_OF_ORDER',409);
      const fd=fs.openSync(this.file(id),'r+');
      try{
        if(offset<d.received){if(offset+bytes.length>d.received)fail('CHUNK_CONFLICT',409);const old=Buffer.alloc(bytes.length);fs.readSync(fd,old,0,old.length,offset);if(!old.equals(bytes))fail('CHUNK_CONFLICT',409);return {received:d.received,duplicate:true};}
        fs.writeSync(fd,bytes,0,bytes.length,offset);fs.fsyncSync(fd);
      }finally{fs.closeSync(fd);}
      await this.core.save('pub-asset',id,{...d,received:d.received+bytes.length},r.version);
      return {received:d.received+bytes.length,duplicate:false};
    });
  }
  async finalize(actor:string,id:string,admin=false){
    const current=await this.core.store.runInTransaction(async()=>{
      const r=await this.owned(id,actor,admin);if(r.data.status==='ready')return r;
      if(r.data.status!=='uploading'||r.data.received!==r.data.size)fail('UPLOAD_INCOMPLETE',409);
      return this.core.save('pub-asset',id,{...r.data,status:'validating'},r.version);
    });if(current.data.status==='ready')return current;
    let metadata:any={},error='';
    try{
      const file=this.file(id);if(fs.statSync(file).size!==current.data.size)fail('MEDIA_SIZE_MISMATCH');
      if(current.data.mime.startsWith('image/')){
        const meta=await sharp(file,{limitInputPixels:40000000}).metadata();
        if(!meta.width||!meta.height||!['jpeg','png'].includes(meta.format||'')||`image/${meta.format}`!==current.data.mime)fail('MEDIA_CONTENT_MISMATCH');
        if(meta.width<320||meta.height<320)fail('IMAGE_TOO_SMALL');
        // Preserve original. The prepared version is the preview AND the published version.
        await sharp(file,{limitInputPixels:40000000}).rotate().resize({width:1440,height:1920,fit:'inside',withoutEnlargement:true}).toFile(this.file(id,true)+(meta.format==='png'?'.png':'.jpg'));
        const rendered=this.file(id,true)+(meta.format==='png'?'.png':'.jpg');
        fs.renameSync(rendered,this.file(id,true));
        const output=await sharp(this.file(id,true)).metadata();
        metadata={width:output.width,height:output.height,codec:meta.format,preparedSize:fs.statSync(this.file(id,true)).size};
      }else{
        const {stdout}=await exec(process.env.FFPROBE_PATH||ffprobe.path,['-v','error','-protocol_whitelist','file,pipe','-show_streams','-show_format','-of','json',file],{timeout:20000,maxBuffer:1024*1024});
        const probe=JSON.parse(stdout),videos=(probe.streams||[]).filter((s:any)=>s.codec_type==='video'),audio=(probe.streams||[]).filter((s:any)=>s.codec_type==='audio');const video=videos[0];
        if(videos.length!==1||!['h264','hevc'].includes(video.codec_name)||audio.some((a:any)=>a.codec_name!=='aac'))fail('VIDEO_CODEC_UNSUPPORTED');
        const duration=Number(probe.format?.duration||video.duration),[a,b]=String(video.r_frame_rate||'0/1').split('/').map(Number),fps=a/b;
        if(!Number.isFinite(duration)||duration<3||duration>90||!Number.isFinite(fps)||fps<23||fps>60||video.width<320||video.width>3840||video.height>3840)fail('VIDEO_LIMITS');
        fs.copyFileSync(file,this.file(id,true));metadata={width:video.width,height:video.height,duration,codec:video.codec_name,preparedSize:fs.statSync(file).size};
      }
      metadata.hash=await hashFile(this.file(id,true));metadata.originalHash=await hashFile(this.file(id));
    }catch(e:any){error=e.code&&/^[A-Z_]+$/.test(e.code)?e.code:'MEDIA_VALIDATION_FAILED';}
    const saved=await this.core.store.runInTransaction(async()=>{
      const r=await this.owned(id,actor,admin);if(r.data.status!=='validating')return r;
      return this.core.save('pub-asset',id,{...r.data,...metadata,status:error?'failed':'ready',error:error||undefined},r.version);
    });
    if(error)fail(error,422);return saved;
  }
  async cancel(actor:string,id:string,admin=false){
    return this.core.store.runInTransaction(async()=>{
      const r=await this.owned(id,actor,admin);
      if((await this.core.list('pub-draft')).some(d=>d.data.assetIds?.includes(id)||d.data.coverId===id)||(await this.core.list('pub-publication')).some(p=>p.data.snapshot?.assetIds?.includes(id)||p.data.snapshot?.coverId===id))fail('ASSET_IN_USE',409);
      await this.core.save('pub-asset',id,{...r.data,status:'cancelled'},r.version);return {success:true};
    }).then(result=>{for(const render of [false,true])fs.rmSync(this.file(id,render),{force:true});return result;});
  }
  async cleanupExpired(){
    for(const r of (await this.core.list<MediaAsset>('pub-asset')).filter(r=>['uploading','validating'].includes(r.data.status)&&Date.parse(r.data.expiresAt)<Date.now()).slice(0,20)){
      try{await this.cancel(r.data.owner,r.id,true);}catch{/* Referenced assets stay for explicit recovery. */}
    }
  }
  preparedSize(id:string){return fs.statSync(this.file(id,true)).size;}
  openPrepared(id:string){const file=this.file(id,true);return {stream:fs.createReadStream(file),size:fs.statSync(file).size};}
  async ready(id:string){const r=await this.core.read<MediaAsset>('pub-asset',id);if(!r||r.data.status!=='ready')fail('ASSET_NOT_READY',409);if(!fs.existsSync(this.file(id,true)))fail('MEDIA_NEEDS_REUPLOAD',409);return r;}
  async preview(actor:string,id:string,admin=false){const r=await this.owned(id,actor,admin);await this.ready(id);const until=Date.now()+5*60000;
    const sig=createHmac('sha256',await this.settings.invitationKey()).update(`asset:${id}:${r.data.hash}:${until}`).digest('hex');
    return {url:`/api/publishing-media/${id}?until=${until}&sig=${sig}`,expiresAt:until};
  }
  async verifyPreview(id:string,until:string,sig:string){
    if(!/^\d{13}$/.test(until)||Number(until)<Date.now()||Number(until)>Date.now()+6*60000||!/^\p{ASCII}+$/u.test(sig)||!/^([a-f\d]{64})$/i.test(sig))fail('MEDIA_ACCESS_EXPIRED',401);
    const r=await this.ready(id);const expected=createHmac('sha256',await this.settings.invitationKey()).update(`asset:${id}:${r.data.hash}:${until}`).digest();if(!timingSafeEqual(expected,Buffer.from(sig,'hex')))fail('MEDIA_ACCESS_EXPIRED',401);return r;
  }
}
export function registerAssets(app:express.Express,service:AssetLibrary){
 const core=service.core,base='/api/management/publishing/assets',guard=core.guard('content');
 app.get(base,guard,endpoint(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.json({assets:await service.list((req as any).staff.username,(req as any).staff.admin),storage:service.storage()});}));
 app.post(base,guard,endpoint(async(req,res)=>res.json(await service.create((req as any).staff.username,req.body||{}))));
 app.put(`${base}/:id/chunks/:offset`,guard,(req,res,next)=>expressLib.raw({type:'application/octet-stream',limit:CHUNK_BYTES})(req,res,(err)=>err?res.status(err.status||400).json({error:err.status===413?'CHUNK_TOO_LARGE':'INVALID_CHUNK'}):next()),endpoint(async(req,res)=>res.json(await service.chunk((req as any).staff.username,String(req.params.id),Number(req.params.offset),req.body,(req as any).staff.admin))));
 app.post(`${base}/:id/complete`,guard,endpoint(async(req,res)=>res.json(await service.finalize((req as any).staff.username,String(req.params.id),(req as any).staff.admin))));
 app.delete(`${base}/:id`,guard,endpoint(async(req,res)=>res.json(await service.cancel((req as any).staff.username,String(req.params.id),(req as any).staff.admin))));
 app.get(`${base}/:id/preview`,guard,endpoint(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.json(await service.preview((req as any).staff.username,String(req.params.id),(req as any).staff.admin));}));
 app.get('/api/publishing-media/:id',endpoint(async(req,res)=>{
   const r=await service.verifyPreview(String(req.params.id),String(req.query.until||''),String(req.query.sig||''));
   res.setHeader('Cache-Control','private, no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.type(r.data.mime);res.sendFile(service.file(r.id,true));
 }));
}
