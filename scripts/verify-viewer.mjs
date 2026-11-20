import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';
import * as Three from 'three';
const context2d = new Proxy({}, { get: (o,k) => k in o ? o[k] : k === 'measureText' ? text => ({width: String(text).length*24}) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({addColorStop(){}}) : () => {}, set:(o,k,v)=>(o[k]=v,true) });
let clockOffset=0;
let active, viewport={width:740,height:580};
class Element {
  constructor(tag='div') { this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={};this.attrs={};this.listeners={};this.hidden=false;this.inert=false;this._classes=new Set();this.classList={add:(...a)=>a.forEach(x=>this._classes.add(x)),remove:(...a)=>a.forEach(x=>this._classes.delete(x)),contains:x=>this._classes.has(x),toggle:(x,on)=>{on ??= !this._classes.has(x);on?this._classes.add(x):this._classes.delete(x);return on;}}; }
  set className(s){this._classes=new Set(s.split(' '));}get className(){return [...this._classes].join(' ');}
  setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}
  append(...a){a.forEach(x=>{x.parentElement=this;this.children.push(x);});}replaceChildren(...a){this.children=[];this.append(...a);}
  addEventListener(k,f){(this.listeners[k]??=[]).push(f);}fire(k,e={}){for(const f of this.listeners[k]||[])f({target:this,...e});}
  contains(el){return el===this||this.children.some(x=>x.contains(el));}focus(){active=this;}
  closest(q){return q==='.hero'?hero:null;}querySelector(q){return q==='.panel'?panel:null;}
  getBoundingClientRect(){return {left:0,top:0,width:viewport.width,height:viewport.height,bottom:viewport.height,right:viewport.width};}
  get offsetHeight(){return this.classList.contains('pop-card')?Math.min(viewport.height*.45,this.classList.contains('rack-card')?180:110):40;}
  get offsetWidth(){return this.classList.contains('pop-card')?viewport.width-16:100;}
  getContext(){return context2d;}toDataURL(){return '';}
  setPointerCapture(){}scrollIntoView(){}remove(){}
}
const hero=new Element(),column=new Element(),stage=new Element(),panel=new Element();panel.hidden=true;hero.append(column,panel);column.append(stage);
const canvas=new Element('canvas'),spotsEl=new Element();stage.append(canvas,spotsEl);
const globalListeners={};let frame,resize;
const document={createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag),get activeElement(){return active;},hidden:false,documentElement:{scrollHeight:1800}};
class Renderer{constructor(){this.shadowMap={};}getPixelRatio(){return 1;}setPixelRatio(){}setSize(){}render(scene){scene.updateMatrixWorld(true);}}
const textureRequests=[];
class TextureLoader {setCrossOrigin(){return this;}load(url,onLoad,onProgress,onError){textureRequests.push({url,onLoad,onError});return new Three.Texture();}}
let openedTabs=[];
const window={addEventListener(){},dispatchEvent(){},open(url,target){const tab={url,target,focused:false,opener:{},focus(){this.focused=true;}};openedTabs.push(tab);return tab;}};
const globals={console,document,window,Event:class{constructor(type){this.type=type;}},Image:class{},performance:{now:()=>performance.now()+clockOffset},devicePixelRatio:1,innerHeight:900,Path2D:class{},setTimeout,clearTimeout,requestAnimationFrame:f=>{frame=f;},addEventListener:(k,f)=>(globalListeners[k]??=[]).push(f),ResizeObserver:class{constructor(f){resize=f;}observe(){}},IntersectionObserver:class{observe(){}},URL,URLSearchParams};
const ctx=vm.createContext(globals);const cache=new Map();
// Synthetic paths exercise the loader independently of which covers are rights-cleared.
function testCatalog() {
  const data=JSON.parse(readFileSync('src/data/books.json','utf8'));
  for(const b of data.books) if(['the-wright-brothers','the-last-unicorn','the-wandering-earth','red-plenty','factfulness'].includes(b.id)) b.coverImages={small:`/books/${b.id}/cover-sm.webp`,large:`/books/${b.id}/cover-lg.webp`};
  return data;
}
async function external(name){const ns=name==='three'?{...Three,WebGLRenderer:Renderer,TextureLoader}:await import(name);return new vm.SyntheticModule(Object.keys(ns),function(){for(const [key,val]of Object.entries(ns))this.setExport(key,val);},{context:ctx,identifier:name});}
async function getModule(file){if(cache.has(file))return cache.get(file);if(file.endsWith('.json')){const data=file.endsWith('/data/books.json')?testCatalog():JSON.parse(readFileSync(file,'utf8'));const mod=new vm.SyntheticModule(['default'],function(){this.setExport('default',data);},{context:ctx,identifier:file});cache.set(file,mod);return mod;}const mod=new vm.SourceTextModule(readFileSync(file,'utf8'),{context:ctx,identifier:file,initializeImportMeta:meta=>{meta.env={BASE_URL:'/',DEV:true};}});cache.set(file,mod);return mod;}
const module=await getModule(resolve('src/viewer.js'));
await module.link(async(spec,mod)=>{if(spec.startsWith('.'))return getModule(resolve(dirname(mod.identifier),spec));if(!cache.has(spec))cache.set(spec,await external(spec));return cache.get(spec);});await module.evaluate();
const labels=Object.fromEntries(['projects','about','ai','writing'].map(key=>[key,new Element('button')]));
let api,zoomEvents=0;
api=module.namespace.startViewer({canvas,stage,labels,spotsEl,reduced:true,lang:'en',onPick:id=>api.open(id),onAway(){},onZoom:()=>zoomEvents++});assert(api);
function draw(){frame(performance.now()+1000);}
const covers = () => textureRequests.filter(r => r.url.includes('/books/'));
const finishCover = suffix => { const request = covers().find(r => r.url.endsWith(suffix)); assert(request, `missing cover request ${suffix}`); const t = new Three.Texture({width:256,height:384}); request.onLoad(t); return t; };
const catalog=testCatalog().books;
assert.equal(covers().length, 0, 'Overview must not request any book covers');
// The physical book catalog is resolved from the scene, not decorative proxies.
assert.equal(api.debug.bookUI.bookCount,25);
const wright=api.debug.bookUI.getMesh('the-wright-brothers');
assert(wright && wright.isMesh);
const initialWright=wright.position.clone();
api.open('about');draw();
const aboutCovers=catalog.filter(b=>b.room==='about'&&b.coverImages?.small);
assert.equal(covers().filter(r=>r.url.includes('cover-sm')).length, aboutCovers.length, 'Only local small covers for this room should load');
assert(covers().every(r=>aboutCovers.some(book=>r.url.includes(`/books/${book.id}/`))));
api.debug.tapShelfBook('the-wright-brothers');draw();
assert(!covers().some(r=>r.url.includes('cover-lg')), 'Framing must not load the large cover');
assert(api.debug.bookUI.isFocused('the-wright-brothers'));
assert(!api.debug.bookUI.isExtracted());
api.debug.tapShelfBook('the-wright-brothers');draw();
assert.equal(covers().filter(r=>r.url.includes('cover-lg')).length, 1, 'Extracting must request only the selected large cover');
const wrightFront=wright.material[2];
const largeWright=finishCover('the-wright-brothers/cover-lg.webp');
assert.equal(wrightFront.map,largeWright,'Large cover should appear once loaded');
const smallWright=finishCover('the-wright-brothers/cover-sm.webp');
assert.equal(wrightFront.map,largeWright,'A late small image must not replace the large image');
assert(api.debug.bookUI.isExtracted());
assert(wright.position.distanceTo(initialWright)>0.30, 'Flat book must clear the cabinet before turning');
assert(wright.position.z-initialWright.z>0.25, 'Flat book must move towards the front of the shelf');
assert(api.debug.goal.dist>=1.28, 'Book camera must not clip the presented cover');
const pulledWright=wright.getWorldPosition(new Three.Vector3()).project(api.debug.camera);
assert(Math.abs(pulledWright.x)<0.8 && Math.abs(pulledWright.y)<0.8, 'Lifted cover must be inside the camera frame');
api.debug.bookUI.showFace('back');draw();
assert(api.debug.bookUI.isExtracted());
assert(api.back());draw();
assert.equal(wrightFront.map,smallWright,'Returning to shelf restores small cover');
const unicorn=api.debug.bookUI.getMesh('the-last-unicorn');
const unicornSmall=finishCover('the-last-unicorn/cover-sm.webp');
api.debug.tapShelfBook('the-last-unicorn');draw();
api.debug.tapShelfBook('the-last-unicorn');draw();
const unicornRequest=covers().find(r=>r.url.endsWith('the-last-unicorn/cover-lg.webp'));
assert(unicornRequest);unicornRequest.onError(new Error('simulated image failure'));
assert.equal(unicorn.material[0].map,unicornSmall,'A failed large cover must leave the small one visible');
assert(api.back());draw();
assert(!api.debug.bookUI.isActive());
assert(wright.position.distanceTo(initialWright)<1e-8);
console.log('books: 25 real meshes, zoom-first, lift, face, BACK: passed');
api.open('writing');draw();
assert.equal(covers().filter(r=>r.url.includes('factfulness/cover-sm')).length,1,'Only small covers for newly entered room load');
const standing=api.debug.bookUI.getMesh('factfulness');
const standingStart=standing.position.clone();
api.debug.tapShelfBook('factfulness');draw();
assert(api.debug.bookUI.isFocused('factfulness') && !api.debug.bookUI.isExtracted(), 'Initial shelf click only frames book');
api.debug.tapShelfBook('factfulness');draw();
assert(standing.position.z-standingStart.z>0.25, 'Upright book must move outside its shelf');
assert.equal(api.debug.bookUI.activeFace, 'front', 'First presented book state must show cover');
api.debug.tapShelfBook('factfulness');draw();
assert.equal(api.debug.bookUI.activeFace, 'spine', 'Next book click must show spine');
api.debug.tapShelfBook('factfulness');draw();
assert.equal(api.debug.bookUI.activeFace, 'back', 'Third presented state must show back cover');
api.debug.tapShelfBook('factfulness');draw();
assert(!api.debug.bookUI.isActive(), 'Fourth action on presented book must put it back, not loop to cover');
assert(standing.position.distanceTo(standingStart)<1e-8, 'Fourth click must restore original shelf position');
assert(!stage.classList.contains('object-focused'), 'Fourth click must restore inspection camera state');
// Re-entering the same book starts the cycle from the cover, without stale face state.
api.debug.tapShelfBook('factfulness');draw();
api.debug.tapShelfBook('factfulness');draw();
assert.equal(api.debug.bookUI.activeFace, 'front', 'After returning, next inspection starts with the cover');
assert(api.closeNote());draw();
assert(standing.position.distanceTo(standingStart)<1e-8, 'Escape must still return upright books');
api.open('about');draw();
const leaning=api.debug.bookUI.getMesh('project-hail-mary');
const originalLean=leaning.quaternion.clone(), originalLeanPos=leaning.position.clone();
api.debug.tapShelfBook('project-hail-mary');draw();
api.debug.tapShelfBook('project-hail-mary');draw();
assert(api.debug.bookUI.isExtracted());
api.reset();draw();
assert(leaning.position.distanceTo(originalLeanPos)<1e-8);
assert(1-Math.abs(leaning.quaternion.dot(originalLean))<1e-8, 'Reset must restore leaning-book angle');
console.log('books: hand-like extraction clearance, held-cover framing, upright/leaning restoration: passed');
for(const [width,height]of [[740,580],[390,420],[320,295]]){
 viewport={width,height};resize();
 for(const room of ['projects','about','ai','writing']){
  api.open(room);draw();
  const baseline=api.debug.goal.t.clone(),distance=api.debug.goal.dist;
  for(const target of api.debug.inspectionTargets.filter(t=>t.room===room)){api.debug.inspect(target.key);draw();assert(Number.isFinite(api.debug.goal.dist));assert(stage.classList.contains('object-focused'),`${room}:${target.key}`);assert(api.closeNote());draw();assert(api.debug.goal.t.distanceTo(baseline)<1e-8);assert(Math.abs(api.debug.goal.dist-distance)<1e-8);}
 }
}
// Check actual scene geometry, including room walls, rather than proxy boxes.
const visibility=[];
for(const [width,height] of [[740,580],[390,420],[320,295]]) {
viewport={width,height};resize();
for(const target of api.debug.inspectionTargets){
 api.open(target.room);api.debug.inspect(target.key);draw();
 let scene=target.objects[0];while(scene.parent)scene=scene.parent;
 const owned=new Set();for(const root of target.objects)root.traverse(o=>{if(o.isMesh)owned.add(o);});
 const surfaces=[];scene.traverse(o=>{if(o.isMesh){const ms=Array.isArray(o.material)?o.material:[o.material];if(ms.some(m=>m.visible&&!(m.transparent&&m.opacity<.85)))surfaces.push(o);}});
 let visible=0,sampled=0,point;
 for(const mesh of [...owned].filter((_,i)=>i%Math.max(1,Math.floor(owned.size/40))===0)){
  const box=new Three.Box3().setFromObject(mesh);if(box.isEmpty())continue;
  const centre=box.getCenter(new Three.Vector3());const ray=new Three.Raycaster(api.debug.camera.position,centre.clone().sub(api.debug.camera.position).normalize());
  const first=ray.intersectObjects(surfaces,false)[0];sampled++;
  if(first&&owned.has(first.object)){visible++;point??=centre;}
 }
 visibility.push(`${target.id}:${visible}/${sampled}`);
 assert(visible>0,`object hidden behind another surface: ${target.id}`);
 // A physical click must open a card, including when entered from overview.
 api.closeNote();api.open(target.room);draw();
 // Locate a visible point in the room's initial view by casting to its meshes.
 point=null;
 for(const mesh of owned){const centre=new Three.Box3().setFromObject(mesh).getCenter(new Three.Vector3());const ray=new Three.Raycaster(api.debug.camera.position,centre.clone().sub(api.debug.camera.position).normalize());const first=ray.intersectObjects(surfaces,false)[0];if(first&&owned.has(first.object)){point=centre;break;}}
 if(point){
  const n=point.project(api.debug.camera);const e={target:stage,pointerId:1,pointerType:'mouse',button:0,clientX:(n.x+1)*viewport.width/2,clientY:(1-n.y)*viewport.height/2};
  stage.fire('pointerdown',e);for(const fn of globalListeners.pointerup||[])fn(e);draw();
  assert(stage.classList.contains('object-focused'),`click did not inspect ${target.id}`);api.closeNote();
 }
}
}
console.log('Geometry visibility: '+visibility.length+' object/view combinations checked');
api.open('about');api.debug.inspect('story');draw();
const card=stage.children.find(element=>element.classList.contains('pop-card'));
const body=card.children.find(element=>element.classList.contains('pop-body'));
assert.equal(body.href,'#leadership-deepdive');
assert('openLeadership' in body.dataset);
assert(body.children.some(element=>element.classList.contains('pop-more') && !element.hidden));
assert(body.children.some(element=>element.textContent?.includes('Leading teams through change')));
api.closeNote();
api.open('projects');api.debug.inspect('monitor');draw();assert(card.classList.contains('project-link'));api.closeNote();
api.debug.inspect('praxisfaden');draw();assert(!card.classList.contains('project-link'));api.closeNote();
api.open('about');api.debug.inspect('enterprise');draw();assert(stage.classList.contains('object-focused'));api.setLanguage('de');draw();assert(stage.classList.contains('object-focused'));api.open('about',{keepView:true});assert(stage.classList.contains('object-focused'));api.reset();draw();assert(!stage.classList.contains('object-focused'));assert.equal(api.debug.zoom,1);
let prevented=false;const before=api.debug.zoom;stage.fire('wheel',{deltaX:0,deltaY:-100,deltaMode:0,preventDefault(){prevented=true;}});assert(prevented);assert(api.debug.zoom<before);
prevented=false;stage.fire('wheel',{ctrlKey:true,preventDefault(){prevented=true;}});assert(!prevented);
api.setZoom(1000);assert.equal(api.debug.zoom,1.8);api.setZoom(0);assert(api.debug.goal.dist>=.7);
console.log(`viewer checks: framing at 3 sizes; return view; ship/language/reset; wheel on scrolling page; browser shortcut; slider limits (${zoomEvents} zoom updates)`);

// Album entry must frame closed book on 1st click, open 3D book onto Page 1 instructions on 2nd click,
// flip forward/backward across photos, and step cleanly through BACK.
api.open('about'); api.debug.openAlbum(); draw();
const hud=stage.children.find(element=>element.classList.contains('album-hud'));
const promptRow=hud.children[0], navRow=hud.children[1];
const nextBtn=navRow.children[2], prevBtn=navRow.children[0];
assert(!hud.hidden, 'album prompt HUD missing after 1st click');
assert(promptRow.hidden===false && navRow.hidden===true, '1st click must keep book closed');
assert(api.debug.albumBook.isClosed(), '1st click must never open the book');
assert.equal(api.debug.albumBook.getLoadedFaces().length, 0, 'inner page textures must not load before opening');
const coverBoxClosed = new Three.Box3().setFromObject(api.debug.albumBook.picks[0]);
for (let i = 1; i < api.debug.albumBook.picks.length - 3; i++) {
  const leafBox = new Three.Box3().setFromObject(api.debug.albumBook.picks[i]);
  assert(leafBox.max.y <= coverBoxClosed.min.y + 0.002, `closed sheet ${i} protrudes above front cover (${leafBox.max.y.toFixed(4)} vs cover ${coverBoxClosed.min.y.toFixed(4)})`);
}

// 2nd click once settled opens the 3D book onto Page 1 (Instructions)
api.debug.openAlbumBook(); draw();
assert(api.debug.albumOpen && api.debug.albumBook.getSpread()===1, '2nd click must open onto Page 1 instructions');
assert(promptRow.hidden===true && navRow.hidden===false);
assert(api.debug.albumBook.getState().isInstructions===true);
assert.equal(prevBtn.disabled, true);
assert.equal(nextBtn.disabled, false);
const openFacesSpread1 = api.debug.albumBook.getLoadedFaces();
assert(openFacesSpread1.includes('cover-in') && openFacesSpread1.includes('face-0'), 'instructions spread must allocate Page 1 & inner cover');
assert(!openFacesSpread1.includes('face-9'), 'far pages must remain unloaded until needed');

// Open book must clear laptop & coffee mug cleanly and stay on desk surface
{
  let rootScene = api.debug.albumBook.root; while (rootScene.parent) rootScene = rootScene.parent;
  const openBookBox = new Three.Box3();
  for (const m of api.debug.albumBook.picks) openBookBox.expandByObject(m);
  const laptopBox = new Three.Box3();
  rootScene.traverse(o => { if (o.isMesh && o.userData?.story) laptopBox.expandByObject(o); });
  const mugBox = new Three.Box3().setFromObject(rootScene.getObjectByName('coffeeMug'));
  const deskBox = new Three.Box3().setFromObject(rootScene.getObjectByName('studyDeskTop'));
  assert(openBookBox.min.x > laptopBox.max.x + 0.02, `open book collides with laptop (book.min.x=${openBookBox.min.x.toFixed(4)} vs laptop.max.x=${laptopBox.max.x.toFixed(4)})`);
  const mugOverlapXZ = !(openBookBox.max.x < mugBox.min.x - 0.02 || openBookBox.min.x > mugBox.max.x + 0.02 || openBookBox.max.z < mugBox.min.z - 0.02 || openBookBox.min.z > mugBox.max.z + 0.02);
  assert(!mugOverlapXZ, `open book collides with coffee mug (book z=${openBookBox.min.z.toFixed(3)}..${openBookBox.max.z.toFixed(3)}, mug z=${mugBox.min.z.toFixed(3)}..${mugBox.max.z.toFixed(3)})`);
  assert(openBookBox.max.x <= deskBox.max.x && openBookBox.max.z <= deskBox.max.z && openBookBox.min.x >= deskBox.min.x && openBookBox.min.z >= deskBox.min.z, 'open book overhangs desk top');
}

// Check open 3D book framing across Desktop, Portrait Phone, Landscape Phone, 5:4 Foldable, Tablet
for (const [w, h, label] of [[1280,800,'desktop'], [390,844,'mobile-portrait'], [844,390,'mobile-landscape'], [884,717,'foldable-5:4'], [768,1024,'tablet']]) {
  viewport = { width: w, height: h }; resize(); draw();
  const corners = api.debug.albumBook.getOpenCorners();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of corners) {
    const p = new Three.Vector3(...c).project(api.debug.camera);
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  assert(minX >= -1 && maxX <= 1, `open book clipped horizontally on ${label}`);
  assert(maxY <= 1 && minY >= -0.95, `open book clipped vertically on ${label}`);
  const spanW = (maxX - minX) / 2, spanH = (maxY - minY) / 2;
  assert(Math.max(spanW, spanH) >= 0.45, `open book rendered too small on ${label} (${spanW.toFixed(2)}x${spanH.toFixed(2)})`);
}
viewport = { width: 740, height: 580 }; resize(); draw();

// Turning forward reveals photos in order & disposes far textures; language switch updates live HUD
nextBtn.fire('click'); draw();
assert.equal(api.debug.albumBook.getSpread(), 2);
assert.equal(api.debug.albumBook.getState().isInstructions, false);
assert.equal(prevBtn.disabled, false);
assert(api.debug.albumBook.getState().label.startsWith('1–4'));
api.debug.albumBook.setSpread(6, true); draw();
assert(!api.debug.albumBook.getLoadedFaces().includes('face-0'), 'distant page 1 texture must be disposed when flipping away');
api.setLanguage('de'); draw();
assert.equal(prevBtn.textContent, '‹ Zurück');
api.setLanguage('en'); draw();
api.debug.albumBook.setSpread(1, true); draw();

// Drag-to-flip curves turning page smoothly mid-turn (Y elevation arches upward > 0.14m above desk)
api.debug.albumBook.startDrag();
api.debug.albumBook.moveDrag(-90, 740);
api.debug.albumBook.update(0.016);
const pageBoxMid = new Three.Box3().setFromObject(api.debug.albumBook.picks[1]);
assert(pageBoxMid.max.y > 0.10, `turning leaf failed to lift in 3D curve (max.y=${pageBoxMid.max.y})`);
api.debug.albumBook.endDrag(0);

// Inside open 3D book: 1st BACK closes book to zoomed-in closed state; 2nd BACK returns to About room; 3rd BACK exits room
assert(api.back()); draw();
assert(!api.debug.albumOpen && api.debug.albumFramed, 'BACK inside book must return to closed framed book');
assert(api.debug.albumBook.isClosed());
assert.equal(api.debug.albumBook.getLoadedFaces().length, 0, 'closing album must dispose all inner page textures');
const coverBoxAfterClose = new Three.Box3().setFromObject(api.debug.albumBook.picks[0]);
for (let i = 1; i < api.debug.albumBook.picks.length - 3; i++) {
  const leafBox = new Three.Box3().setFromObject(api.debug.albumBook.picks[i]);
  assert(leafBox.max.y <= coverBoxAfterClose.min.y + 0.002, `re-closed sheet ${i} protrudes above front cover (${leafBox.max.y.toFixed(4)} vs cover ${coverBoxAfterClose.min.y.toFixed(4)})`);
}
assert(api.back()); draw();
assert(!api.debug.albumFramed && stage.classList.contains('object-focused')===false);

while(api.back()){}
api.open('about');draw();const roomPose=api.debug.goal.t.clone();
api.debug.inspect('studyDesk');draw();
api.setZoom(api.debug.zoom*.8);api.setZoom(api.debug.zoom*.8);
assert(api.back());draw();assert(stage.classList.contains('object-focused')===false);
assert(api.back());draw();assert(api.debug.goal.t.distanceTo(roomPose)<1e-8);
assert(api.back());draw();assert(!api.isCustom());assert(!api.back());
console.log('3D book two-step entry, instructions, page turns, BACK steps and grouped history: passed');

const animated=module.namespace.startViewer({canvas,stage,labels,spotsEl,reduced:false,lang:'en',onPick(){},onAway(){}});
animated.open('about');animated.debug.openAlbum();assert(animated.debug.albumPending);
assert(animated.debug.albumBook.isClosed(),'book must remain closed while zooming in');
let tick=performance.now()+clockOffset;
for(let i=0;i<240&&animated.debug.albumPending;i++){tick+=16;frame(tick);}
assert(!animated.debug.albumPending,'closed-book zoom never settled');
assert(animated.debug.albumBook.isClosed(),'arrival at closed book must stay closed until 2nd click');
animated.debug.openAlbum(); // 2nd click opens book!
assert(animated.debug.albumOpen);
for(let i=0;i<180&&animated.debug.albumBook.isAnimating();i++){tick+=16;frame(tick);}
assert(!animated.debug.albumBook.isAnimating(),'3D book open animation settled');
animated.open('writing');
for(let i=0;i<60;i++){tick+=16;frame(tick);}
assert(!animated.debug.albumOpen && animated.debug.albumBook.isClosed(),'room change failed to close 3D book');
console.log('animated 2-step album arrival, opening curve and room cancellation: passed');

const projectViewer=module.namespace.startViewer({canvas,stage,labels,spotsEl,reduced:true,lang:'en',onPick(){},onAway(){}});
projectViewer.open('projects');projectViewer.debug.selectProject('monitor');draw();assert.equal(openedTabs.length,0);
projectViewer.debug.selectProject('monitor');assert.equal(openedTabs.length,1);assert.equal(openedTabs[0].target,'_blank');assert(openedTabs[0].focused);assert.equal(openedTabs[0].opener,null);
projectViewer.closeNote();projectViewer.debug.selectProject('praxisfaden');draw();const badge=stage.children.findLast(element=>element.classList.contains('project-soon-badge'));assert(!badge.hidden);assert.equal(badge.textContent,'Coming Soon');
projectViewer.debug.selectProject('praxisfaden');assert.equal(openedTabs.length,1);assert(!badge.hidden);
console.log('project first/second click, new-tab focus and Coming Soon: passed');

// Selection feedback must settle in reduced motion and return to the idle pose.
projectViewer.closeNote();
projectViewer.open('projects');
projectViewer.debug.inspect('wimmelbild');
draw();
const framedProject = projectViewer.debug.inspectionTargets.find(target => target.room === 'projects' && target.key === 'wimmelbild');
const frameBoard = framedProject.objects[0];
assert(Math.abs(frameBoard.position.y - .878) < .00001, 'selected picture did not rise');
for (const root of framedProject.objects) root.traverse(object => {
  if (object.isMesh) assert.equal(object.userData.project, 'wimmelbild', 'display part lost its project action');
});
projectViewer.closeNote();
draw();
assert(Math.abs(frameBoard.position.y - .843) < .00001, 'picture did not return to its stand');
console.log('project frame lift, reduced motion and project actions on display parts: passed');
// Hidden cellar fax: found only from below, first click frames it, second starts it, the button on the sheet opens LinkedIn.
const faxViewer=module.namespace.startViewer({canvas,stage,labels,spotsEl,reduced:true,lang:'en',onPick(){},onAway(){}});
viewport={width:740,height:580};resize();draw();
const {camera:fcam,cellar:fc,egg:fe,goal:fg}=faxViewer.debug;
const bodyCentre=()=>new Three.Box3().setFromObject(fc.pick[1]).getCenter(new Three.Vector3());
const toNdc=p=>p.clone().project(fcam);
const clickAt=p=>{const n=toNdc(p),e={target:stage,pointerId:1,pointerType:'mouse',button:0,clientX:(n.x+1)*viewport.width/2,clientY:(1-n.y)*viewport.height/2};stage.fire('pointerdown',e);for(const fn of globalListeners.pointerup||[])fn(e);};
const lookFrom=(az,el,dist)=>{const ce=Math.cos(el),se=Math.sin(el),sa=Math.sin(az),ca=Math.cos(az);fcam.position.set(fc.center.x+dist*ce*sa,fc.center.y+dist*se,fc.center.z+dist*ce*ca);fcam.up.set(-se*sa,ce,-se*ca);fcam.lookAt(fc.center);fcam.updateMatrixWorld(true);};
// From above the base hides the machine.
lookFrom(0,0.54,6);assert.equal(fe.pick(toNdc(bodyCentre())),null,'machine must not be found from above');
// From below, past the pole, it is found.
lookFrom(0,-Math.PI/2-0.5,2.4);assert.equal(fe.pick(toNdc(bodyCentre())),'machine','machine must be found from below');
stage.classList.remove('object-focused');
// 1st click: frame the machine, upright (elevation past the pole), fax not started.
clickAt(bodyCentre());draw();
assert(stage.classList.contains('object-focused'),'first click must frame the machine');
assert(!fe.isOpen,'first click must not start the fax');
assert(Math.cos(fg.el)<0&&Math.sin(fg.el)<-0.5,'framing must be from below, past the pole');
assert(Number.isFinite(fg.dist)&&fg.dist>0);
// 2nd click: the fax starts (reduced motion: sheet is out at once) and the view moves on to the sheet.
const frameEl=fg.el;lookFrom(0,fg.el,fg.dist);fcam.position.copy(faxViewer.debug.camera.position);
clickAt(bodyCentre());draw();
assert(fe.isOpen&&!fe.isAnimating,'second click must start the fax');
assert(Math.abs(fg.el-frameEl)>0.05,'view must move on to the sheet');
// Button on the sheet.
const b=fc.button(),sh=fc.sheet,W=0.19,H=0.27;
const btn=sh.localToWorld(new Three.Vector3(((b.u0+b.u1)/2-0.5)*W,((b.v0+b.v1)/2)*H,0));
sh.updateWorldMatrix(true,false);
assert.equal(fe.pick(toNdc(btn)),'button','button must be hit on the finished sheet');
const tabs=openedTabs.length;clickAt(btn);
assert.equal(openedTabs.length,tabs+1);assert(openedTabs.at(-1).url.includes('linkedin.com'));assert.equal(openedTabs.at(-1).target,'_blank');
// Reset/BACK restore the view and put the sheet back.
assert(faxViewer.closeNote());draw();
assert(!fe.isOpen&&!stage.classList.contains('object-focused'),'close must restore the view and retract the sheet');
console.log('cellar fax: found only from below, first click frames, second starts, sheet button opens LinkedIn, close restores: passed');

// Fax display: READY when idle, RECEIVING with a blinking text and LED while the sheet comes out, then done; DE texts exist.
const motion=module.namespace.startViewer({canvas,stage,labels,spotsEl,reduced:false,lang:'en',onPick(){},onAway(){}});
const mc=motion.debug.cellar,me=motion.debug.egg;
assert.equal(mc.displayState().state,'idle');
me.play();assert.equal(mc.displayState().state,'receiving');
let mt=performance.now()+clockOffset;const seen=new Set();
for(let i=0;i<700&&me.isAnimating;i++){mt+=16;frame(mt);if(mc.displayState().state==='receiving')seen.add(mc.displayState().blink);}
assert(seen.has(true)&&seen.has(false),'receiving display must blink');
assert(!me.isAnimating&&mc.displayState().state==='done','display must show done when the sheet is out');
me.close();assert.equal(mc.displayState().state,'idle');
const {default:contentData}=await import('../src/content.js');
for(const l of ['en','de'])for(const k of ['ready','receiving','done'])assert(contentData[l].model.egg.display[k],`missing ${l} display text ${k}`);
console.log('cellar fax display: idle, blinking receiving, done, close, both languages: passed');

// Globe theme: nothing is created for other objects; the globe arms audio inside the click, plays once the view has settled, stops when the view leaves.
let audioMade=0,audioClosed=0,played=0,playerStopped=0,loaderCalls=0;
window.AudioContext=class{constructor(){audioMade++;}resume(){}close(){audioClosed++;}};
const mv=module.namespace.startViewer({canvas,stage,labels,spotsEl,reduced:true,lang:'en',onPick(){},onAway(){},musicLoader:async()=>{loaderCalls++;return (ctx,onEnd)=>{played++;return {stop(){playerStopped++;}};};}});
stage.classList.remove('object-focused');
mv.open('about');draw();
let ambientRig=false;mv.debug.scene.traverse(o=>{if(o.isHemisphereLight||o.isDirectionalLight)ambientRig=true;});assert(ambientRig,'default hemisphere and sun light must exist: local spot lights (operating light) must not suppress them');
assert(mv.debug.inspectionTargets.some(t=>t.room==='about'&&t.key==='globe'),'globe must be an inspectable object');
mv.debug.inspect('studyDesk');draw();assert.equal(audioMade,0,'other objects must not create audio');assert.equal(loaderCalls,0);mv.closeNote();draw();
mv.debug.inspect('globe');assert.equal(audioMade,0,'first click on the globe only zooms, no audio');assert.equal(mv.debug.music,'idle');assert.equal(loaderCalls,0);
mv.debug.selectProject('globe');assert.equal(audioMade,1,'audio context must be created inside the second click');assert.equal(mv.debug.music,'loading');assert.equal(played,0);
await new Promise(r=>setTimeout(r,0));
assert.equal(mv.debug.music,'playing');assert.equal(played,1,'theme must start on the second click, as soon as it is loaded');
mv.debug.selectProject('globe');assert.equal(playerStopped,1,'click while playing must stop the theme');assert.equal(mv.debug.music,'idle');assert(mv.debug.goal,'view stays on the globe');
mv.debug.selectProject('globe');await new Promise(r=>setTimeout(r,0));assert.equal(played,2,'click again restarts');
assert(Math.cos(mv.debug.goal.el)>0&&mv.debug.goal.dist<2,'globe close-up must be a real zoom');
mv.closeNote();draw();assert.equal(playerStopped,2,'leaving the globe must stop the theme');assert.equal(mv.debug.music,'idle');
console.log('globe theme: lazy, first click zooms only, second click starts, stops on leaving: passed');
delete window.AudioContext;

// Warp flight sound: both sounds are scheduled against the flight clock, late decoding joins at the right position, stop fades and closes.
{
  const { playWarpSound, ARRIVE_AT, LANDING_END } = await import('../src/warp-sound.js');
  const make = (now) => {
    const c = { currentTime: now, started: [], closed: 0, gains: [], ramps: [], stops: [] };
    c.createGain = () => { const g = { gain: { value: 1, setTargetAtTime() {}, setValueAtTime() {}, linearRampToValueAtTime(v, t) { c.ramps.push([v, t]); } }, connect() {} }; c.gains.push(g); return g; };
    c.destination = {};
    c.decodeAudioData = (bytes, ok) => { const n = bytes.byteLength; ok({ duration: n === 1 ? 8.9 : 7.0 }); return Promise.resolve(); };
    c.createBufferSource = () => { const s = { connect() {}, start(when, offset = 0) { c.started.push({ d: s.buffer.duration, when, offset }); }, stop(t) { c.stops.push(t); } }; return s; };
    c.close = () => { c.closed++; };
    return c;
  };
  const data = [new ArrayBuffer(1), new ArrayBuffer(2)], ago = sec => performance.now() - sec * 1000;
  // on time: the departure sound starts now, the arrival sound ARRIVE_AT seconds later
  let c = make(10); playWarpSound(c, data, ago(0)); await new Promise(r => setTimeout(r, 0));
  assert.ok(c.started[0].offset < 0.05); assert.ok(Math.abs(c.started[0].when - 10) < 0.05);
  assert.ok(Math.abs(c.started[1].when - (10 + ARRIVE_AT)) < 0.05); assert.equal(c.started[1].offset, 0);
  // the arrival sound is cut and faded so that it is silent at the landing (LANDING_END), the departure sound plays on
  assert.equal(c.stops.length, 1); assert.ok(Math.abs(c.stops[0] - (10 + LANDING_END)) < 0.05); assert.ok(Math.abs(c.ramps[0][1] - (10 + LANDING_END)) < 0.05); assert.equal(c.ramps[0][0], 0);
  // decoding finished 5 s late: the departure sound joins at 5 s, the arrival sound at 1.3 s
  c = make(10); playWarpSound(c, data, ago(5)); await new Promise(r => setTimeout(r, 0));
  assert.ok(Math.abs(c.started[0].offset - 5) < 0.05); assert.ok(Math.abs(c.started[1].offset - (5 - ARRIVE_AT)) < 0.05);
  // far too late: nothing that has already finished is started, and the context is closed
  c = make(10); playWarpSound(c, data, ago(30)); await new Promise(r => setTimeout(r, 0));
  assert.equal(c.started.length, 0); assert.equal(c.closed, 1);
  // stop before decoding: no sound, context closed after the fade
  c = make(10); const p = playWarpSound(c, data, ago(0)); p.stop(); await new Promise(r => setTimeout(r, 300));
  assert.equal(c.started.length, 0); assert.equal(c.closed, 1);
  console.log('warp sound: scheduled against the flight clock, late join, stop: passed');
}
