#!/usr/bin/env node
'use strict';
/*
 * تحلیل تب جاری مرورگر کارفرما — بدون هیچ ناوبری/رفرش.
 *   node analyze-current.js <shotPath> [match]
 * فقط خواندن + چند حرکت ماوس ساختگی برای سنجش واکنش صحنه.
 */
const fs = require('fs');
const { Cdp } = require('./lib');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.error('[cur] ' + m + ' @' + Math.round(process.uptime()) + 's');

const PAGE_PROBE = `(() => {
  const out = {};
  out.title = document.title; out.url = location.href; out.ready = document.readyState;
  const h = (sel) => [...document.querySelectorAll(sel)].map(e => e.textContent.trim().replace(/\\s+/g, ' ').slice(0, 140)).filter(Boolean);
  out.h1 = h('h1').slice(0, 4); out.h2 = h('h2').slice(0, 16); out.h3 = h('h3').slice(0, 20);
  out.p = h('p').slice(0, 12).map(s => s.slice(0, 260));
  out.pre = [...document.querySelectorAll('pre,code')].map(e => e.textContent.trim()).filter(t => t.length > 40).slice(0, 3).map(t => t.slice(0, 1500));
  const canvases = [...document.querySelectorAll('canvas')];
  out.canvas = canvases.slice(0, 6).map(c => {
    let gl = null;
    try { const g = c.getContext('webgl2') || c.getContext('webgl'); if (g) gl = String(g.getParameter(g.VERSION)).slice(0, 60); } catch (e) { gl = 'err:' + e.message.slice(0, 40); }
    const fk = Object.getOwnPropertyNames(c).find(k => k.startsWith('__reactFiber'));
    return { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight, gl, fiber: !!fk };
  });
  out.videos = [...document.querySelectorAll('video')].slice(0, 4).map(v => ({ src: (v.currentSrc || v.src || '').slice(0, 120), w: v.videoWidth, h: v.videoHeight, playing: !v.paused }));
  out.globals = Object.keys(window).filter(k => /three|r3f|fiber|ogl|babylon|pixi|gsap|spline|shader|motion|lenis/i.test(k)).slice(0, 24);
  out.scripts = [...document.querySelectorAll('script[src]')].map(s => s.src).filter(s => /three|ogl|babylon|gsap|spline|pixi|lenis/i.test(s)).slice(0, 10);
  out.vp = { w: innerWidth, h: innerHeight, scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight };
  out.bodyStart = document.body.innerText.replace(/\\s+/g, ' ').slice(0, 700);
  return JSON.stringify(out);
})()`;

const SCENE_PROBE = `(() => {
  const res = { threeGlobal: typeof THREE !== 'undefined' };
  const c = document.querySelector('canvas');
  if (!c) { res.noCanvas = true; return JSON.stringify(res); }
  const fk = Object.getOwnPropertyNames(c).find(k => k.startsWith('__reactFiber'));
  function hasGSC(o) { return o && typeof o === 'object' && 'gl' in o && 'scene' in o && 'camera' in o; }
  let state = null;
  if (fk) {
    let f = c[fk];
    for (let i = 0; i < 900 && f && !state; i++) {
      for (const src of [f.stateNode, f.memoizedProps, f.memoizedState]) {
        if (hasGSC(src)) { state = src; break; }
        if (src && typeof src === 'object' && !Array.isArray(src)) {
          for (const k of Object.keys(src).slice(0, 80)) { if (hasGSC(src[k])) { state = src[k]; break; } }
        }
        if (state) break;
      }
      f = f.return;
    }
  }
  if (!state) {
    res.r3fState = 'not found';
    return JSON.stringify(res);
  }
  const gl = state.gl, scene = state.scene;
  const meshes = [], lights = [];
  try {
    scene.traverse((o) => {
      if (o.isMesh || o.isPoints || o.isLine) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        meshes.push({ g: o.geometry ? o.geometry.type : null, m: mats.map(x => x && x.type).join('|'), n: (o.name || '').slice(0, 24), s: [o.scale?.x, o.scale?.y, o.scale?.z].map(v => Math.round((v || 0) * 100) / 100) });
      }
      if (o.isLight) lights.push({ t: o.type, i: o.intensity, c: o.color && o.color.getStyle ? o.color.getStyle() : null });
    });
  } catch (e) { res.traverseErr = String(e).slice(0, 80); }
  res.r3f = {
    triangles: gl.info && gl.info.render ? gl.info.render.triangles : null,
    drawCalls: gl.info && gl.info.render ? gl.info.render.calls : null,
    geometries: gl.info && gl.info.memory ? gl.info.memory.geometries : null,
    textures: gl.info && gl.info.memory ? gl.info.memory.textures : null,
    shadowMap: gl.shadowMap ? gl.shadowMap.enabled : null,
    toneMapping: gl.toneMapping,
    meshCount: meshes.length,
    meshTypes: meshes.slice(0, 34),
    lights,
    cameraType: state.camera ? state.camera.type : null,
    cameraPos: state.camera && state.camera.position ? [state.camera.position.x, state.camera.position.y, state.camera.position.z].map(v => Math.round(v * 100) / 100) : null,
    controls: !!state.controls,
    env: !!(scene.environment),
    bg: scene.background ? (scene.background.isColor ? scene.background.getStyle() : 'texture/other') : null,
    fog: scene.fog ? scene.fog.type : null,
  };
  return JSON.stringify(res);
})()`;

async function main() {
  const shotPath = process.argv[2];
  const match = process.argv[3] || '';
  const cdp = new Cdp({ match });
  const { sessionId, target } = await cdp.attach();
  log('attached: «' + target.title.slice(0, 50) + '» ' + target.url.slice(0, 70));
  await cdp.send('Page.enable', {}, { sessionId });

  const probe = JSON.parse(await cdp.evalRaw(sessionId, PAGE_PROBE, 30000));
  log('probe ok');
  const out = { url: probe.url, title: probe.title };

  const listeners = {};
  for (const [name, expr] of [['canvas', `document.querySelector('canvas')`], ['window', `window`], ['document', `document`]]) {
    try {
      const r = await cdp.send('Runtime.evaluate', { expression: expr, objectGroup: 'probe' }, { sessionId });
      const oid = r.result && r.result.objectId;
      if (!oid) { listeners[name] = null; continue; }
      const l = await cdp.send('DOMDebugger.getEventListeners', { objectId: oid, depth: 0 }, { sessionId, timeoutMs: 20000 });
      listeners[name] = (l.listeners || []).map(x => x.type + (x.passive ? '(p)' : '')).sort();
    } catch (e) { listeners[name] = 'err:' + String(e.message).slice(0, 40); }
  }
  log('listeners ok');
  out.listeners = listeners;

  async function shotData() {
    const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 55 }, { sessionId, timeoutMs: 90000 });
    return r.data;
  }
  let s0 = null, s1 = null, s2 = null;
  try {
    s0 = await shotData(); log('shot0');
    await sleep(1200);
    s1 = await shotData(); log('shot1');
  } catch (e) { log('shot err: ' + String(e.message).slice(0, 80)); }
  const vpW = (probe.vp && probe.vp.w) || 900, vpH = (probe.vp && probe.vp.h) || 600;
  try {
    for (const [fx, fy] of [[0.4, 0.4], [0.62, 0.3], [0.5, 0.55], [0.35, 0.6], [0.55, 0.35], [0.5, 0.45]]) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(vpW * fx), y: Math.round(vpH * fy), button: 'none', buttons: 0 }, { sessionId, timeoutMs: 15000 });
      await sleep(240);
    }
    await sleep(800);
  } catch (e) { log('mouse err: ' + String(e.message).slice(0, 60)); }
  try { s2 = await shotData(); log('shot2'); } catch (e) { log('shot2 err: ' + String(e.message).slice(0, 80)); }
  out.anim = { selfAnimating: !!(s0 && s1 && s0 !== s1), reactsToMouse: !!(s1 && s2 && s1 !== s2) };
  if (s2 && shotPath) { fs.writeFileSync(shotPath, Buffer.from(s2, 'base64')); out.shot = shotPath; out.shotBytes = Buffer.from(s2, 'base64').length; }

  try { out.scene = JSON.parse(await cdp.evalRaw(sessionId, SCENE_PROBE, 30000)); log('scene ok'); }
  catch (e) { out.scene = { err: String(e.message || e).slice(0, 140) }; }

  out.probe = probe;
  console.log(JSON.stringify(out, null, 1));
}

main().catch((e) => { console.error('ANALYZE FAILED:', e.message); process.exit(1); });
