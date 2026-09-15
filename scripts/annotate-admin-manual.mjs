// Run ONCE after fresh screenshots. Overlays are callouts, not fabricated UI.
import fs from 'node:fs';import sharp from 'sharp';
const annotations=JSON.parse(fs.readFileSync('docs/admin-manual/annotations.json','utf8'));
for(const [name,boxes]of Object.entries(annotations)){
 const file=`public/admin-manual/assets/${name}.png`,input=fs.readFileSync(file);const {width,height}=await sharp(input).metadata();
 const shapes=boxes.map(b=>`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="5" fill="none" stroke="#c17b00" stroke-width="3"/><circle cx="${b.x+16}" cy="${b.cy??b.y-7}" r="13" fill="#7139ba" stroke="white" stroke-width="2"/><text x="${b.x+16}" y="${(b.cy??b.y-7)+5}" fill="white" font-family="sans-serif" font-size="15" font-weight="bold" text-anchor="middle">${b.n}</text>`).join('');
 const out=await sharp(input).composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${shapes}</svg>`)}]).png().toBuffer();fs.writeFileSync(file,out);
}
