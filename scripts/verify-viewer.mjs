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
const globals={console,document,Image:class{},performance:{now:()=>performance.now()+clockOffset},devicePixelRatio:1,innerHeight:900,Path2D:class{},setTimeout,clearTimeout,requestAnimationFrame:f=>{frame=f;},addEventListener:(k,f)=>(globalListeners[k]??=[]).push(f),ResizeObserver:class{constructor(f){resize=f;}observe(){}},IntersectionObserver:class{observe(){}},URL,URLSearchParams};
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

// Album entry must stop at the facing pages, including on a touch click-through.
api.open('about'); api.debug.openAlbum(); draw();
const album=stage.children.find(element=>element.classList.contains('album-modal'));
const book=album.children.find(element=>element.classList.contains('album-book'));
const spread=book.children.find(element=>element.classList.contains('album-spread'));
const photoButton=spread.children[0].children.find(element=>element.classList.contains('album-photo-card'));
const lightbox=album.children.find(element=>element.classList.contains('album-lightbox'));
assert(!album.hidden); assert(lightbox.hidden);
photoButton.fire('click'); assert(lightbox.hidden,'opening click leaked into photo');
clockOffset+=400; photoButton.fire('click'); assert(!lightbox.hidden);
assert(api.back()); assert(lightbox.hidden); assert(!album.hidden);
assert(api.back()); assert(album.hidden);
api.debug.openAlbum();draw();assert(lightbox.hidden,'re-entry retained the lightbox');api.back();api.back();
while(api.back()){}
api.open('about');draw();const roomPose=api.debug.goal.t.clone();
api.debug.inspect('studyDesk');draw();
api.setZoom(api.debug.zoom*.8);api.setZoom(api.debug.zoom*.8);
assert(api.back());draw();assert(stage.classList.contains('object-focused')===false);
assert(api.back());draw();assert(api.debug.goal.t.distanceTo(roomPose)<1e-8);
assert(api.back());draw();assert(!api.isCustom());assert(!api.back());
console.log('album entry/click-through, lightbox/book/back order and grouped view history: passed');

const animated=module.namespace.startViewer({canvas,stage,labels,spotsEl,reduced:false,lang:'en',onPick(){},onAway(){}});
animated.open('about');animated.debug.openAlbum();assert(animated.debug.albumPending);
let tick=performance.now()+clockOffset;
for(let i=0;i<240&&animated.debug.albumPending;i++){tick+=16;frame(tick);}
assert(!animated.debug.albumPending,'album never opened after the camera settled');
animated.back();animated.debug.openAlbum();animated.open('writing');
for(let i=0;i<180;i++){tick+=16;frame(tick);}
assert(!animated.debug.albumPending,'room change failed to cancel album entry');
console.log('animated album arrival and cancellation: passed');
