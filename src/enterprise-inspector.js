import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createEnterprise, disposeEnterprise } from './enterprise.js';

export function showEnterprise(era, copy, reduced, launch = false) {
  const dialog=document.createElement('dialog'); dialog.className='ship-dialog';
  const title=document.createElement('h2');title.textContent=era==='tng'?'USS Enterprise NCC-1701-D':'USS Enterprise NCC-1701';
  const close=document.createElement('button');close.type='button';close.textContent='×';close.className='ship-close';close.setAttribute('aria-label',copy.close);
  const viewport=document.createElement('div');viewport.className='ship-viewport';
  const hint=document.createElement('p');hint.textContent=copy.hint;
  const footer=document.createElement('div');footer.className='ship-actions';
  const warp=document.createElement('button');warp.type='button';warp.textContent=copy.warp;
  const reset=document.createElement('button');reset.type='button';reset.textContent=copy.reset;
  const status=document.createElement('p');status.className='ship-status';status.setAttribute('role','status');status.textContent=copy.ready;
  footer.append(warp,reset);dialog.append(close,title,viewport,hint,footer,status);document.body.append(dialog);
  const previous=document.activeElement, previousOverflow=document.body.style.overflow;
  let renderer;
  try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});} catch { dialog.remove();return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  viewport.append(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label',copy.hint);
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(35,1,.1,100);
  scene.add(new THREE.HemisphereLight(0xfff3de,0x536b70,2.6));
  const sun=new THREE.DirectionalLight(0xfff3de,3);sun.position.set(-3,6,-3);scene.add(sun);
  const rim=new THREE.DirectionalLight(0xc2e4f1,1.5);rim.position.set(4,2,3);scene.add(rim);
  const model=createEnterprise(era);scene.add(model);const {ship,blue,red}=model.userData;
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enablePan=false;controls.minDistance=4;controls.maxDistance=11;
  const home=()=>{camera.position.set(4.5,3.5,-5);controls.target.set(0,.55,0);controls.update();}; home();
  // A single reusable line buffer provides short TOS stars or longer TNG trails.
  const positions=new Float32Array(96*6);
  for(let i=0;i<96;i++){const a=i*2.39996,r=2+(i%11)*.3,z=-8+(i%17);positions.set([Math.cos(a)*r,Math.sin(a)*r,z,Math.cos(a)*r,Math.sin(a)*r,z+.05],i*6);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const trailMaterial=new THREE.LineBasicMaterial({color:0x688fa4,transparent:true,opacity:0});const trails=new THREE.LineSegments(geometry,trailMaterial);scene.add(trails);
  const flashMaterial=new THREE.MeshBasicMaterial({color:0xe4f5ff,transparent:true,opacity:0,depthWrite:false});
  const flash=new THREE.Mesh(new THREE.SphereGeometry(.22,16,8),flashMaterial);flash.position.set(0,1.03,-.6);scene.add(flash);
  let start=null, raf=0, disposed=false;
  function restore(){start=null;ship.position.set(0,.63,0);ship.scale.setScalar(1);ship.visible=true;blue.emissiveIntensity=.5;red.emissiveIntensity=.3;trailMaterial.opacity=0;flashMaterial.opacity=0;warp.disabled=false;controls.enabled=true;status.textContent=copy.ready;}
  function engage(){
    if(start!==null)return;
    if(reduced){status.textContent=copy.reduced;return;}
    controls.reset();home();restore();start=performance.now();warp.disabled=true;controls.enabled=false;status.textContent=copy.departing;
  }
  function draw(now){
    if(disposed)return;
    if(!document.hidden){
      if(start!==null){
        const t=(now-start)/1000,d=era==='tng',charge=d?1.35:.65,jump=d?.48:.95;
        ship.position.y=.63+Math.min(t/.65,1)*.4;
        blue.emissiveIntensity=.5+(d?Math.min(t/charge,1)*3:.25);red.emissiveIntensity=.3+Math.min(t/charge,1)*.6;
        flashMaterial.opacity=d?Math.max(0,1-Math.abs(t-charge-.1)/.12)*.65:0;
        if(t>charge){const p=Math.min((t-charge)/jump,1);ship.position.z=-p*p*22;ship.scale.z=d?1+Math.sin(p*Math.PI)*1.7:1;ship.scale.x=ship.scale.y=1-p*.5;ship.scale.z*=1-p*.5;trailMaterial.opacity=(d?.8:.35)*Math.sin(p*Math.PI);for(let i=0;i<96;i++)positions[i*6+5]=positions[i*6+2]+(d?4:.6)*p;geometry.attributes.position.needsUpdate=true;}
        if(t>charge+jump)ship.visible=false;
        if(t>charge+jump+.65)restore();
      }
      controls.update();renderer.render(scene,camera);
    } else if(start!==null) restore();
    raf=requestAnimationFrame(draw);
  }
  const observer=new ResizeObserver(()=>{const w=viewport.clientWidth,h=viewport.clientHeight;if(w&&h){renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}});observer.observe(viewport);
  function cleanup(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();disposeEnterprise(model);geometry.dispose();trailMaterial.dispose();flash.geometry.dispose();flashMaterial.dispose();renderer.dispose();renderer.forceContextLoss();document.body.style.overflow=previousOverflow;dialog.remove();if(previous?.isConnected)previous.focus({preventScroll:true});}
  dialog.addEventListener('close',cleanup);close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();dialog.close();}if(e.target===renderer.domElement&&e.key.startsWith('Arrow')){e.preventDefault();const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);s.theta+=e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0;s.phi=THREE.MathUtils.clamp(s.phi+(e.key==='ArrowUp'?-.15:e.key==='ArrowDown'?.15:0),.1,Math.PI-.1);camera.position.copy(controls.target).add(offset.setFromSpherical(s));controls.update();}});
  warp.addEventListener('click',engage);reset.addEventListener('click',()=>{restore();home();});
  dialog.showModal();document.body.style.overflow='hidden';close.focus();raf=requestAnimationFrame(draw);if(launch)engage();return true;
}
