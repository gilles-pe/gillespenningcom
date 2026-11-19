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
class TextureLoader {load(){return new Three.Texture();}}
let openedTabs=[];
const window={open(url,target){const tab={url,target,focused:false,opener:{},focus(){this.focused=true;}};openedTabs.push(tab);return tab;}};
const globals={console,document,window,Image:class{},performance:{now:()=>performance.now()+clockOffset},devicePixelRatio:1,innerHeight:900,Path2D:class{},setTimeout,clearTimeout,requestAnimationFrame:f=>{frame=f;},addEventListener:(k,f)=>(globalListeners[k]??=[]).push(f),ResizeObserver:class{constructor(f){resize=f;}observe(){}},IntersectionObserver:class{observe(){}},URL,URLSearchParams};
const ctx=vm.createContext(globals);const cache=new Map();
async function external(name){const ns=name==='three'?{...Three,WebGLRenderer:Renderer,TextureLoader}:await import(name);return new vm.SyntheticModule(Object.keys(ns),function(){for(const [key,val]of Object.entries(ns))this.setExport(key,val);},{context:ctx,identifier:name});}
async function getModule(file){if(cache.has(file))return cache.get(file);const mod=new vm.SourceTextModule(readFileSync(file,'utf8'),{context:ctx,identifier:file,initializeImportMeta:meta=>{meta.env={BASE_URL:'/',DEV:true};}});cache.set(file,mod);return mod;}
const module=await getModule(resolve('src/viewer.js'));
await module.link(async(spec,mod)=>{if(spec.startsWith('.'))return getModule(resolve(dirname(mod.identifier),spec));if(!cache.has(spec))cache.set(spec,await external(spec));return cache.get(spec);});await module.evaluate();
const labels=Object.fromEntries(['projects','about','ai','writing'].map(key=>[key,new Element('button')]));
let api,zoomEvents=0;
api=module.namespace.startViewer({canvas,stage,labels,spotsEl,reduced:true,lang:'en',onPick:id=>api.open(id),onAway(){},onZoom:()=>zoomEvents++});assert(api);
function draw(){frame(performance.now()+1000);}
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
