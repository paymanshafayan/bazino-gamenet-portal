/** Prevent documenting the obsolete double-header admin shell again. */
export async function assertCurrentPanel(page) {
  const bars=page.locator('#admin-bar');
  if(await bars.count()!==1)throw Error('Expected exactly one admin bar');
  const box=await bars.boundingBox();
  if(!box||Math.abs(box.height-50)>1)throw Error('Approved 50px admin bar missing');
  if(await page.getByText('پنل مدیریت بازینو پرو',{exact:true}).count())throw Error('Obsolete purple admin header detected');
  if(await page.locator('#admin-wrap').count()!==1)throw Error('Admin shell missing');
}
