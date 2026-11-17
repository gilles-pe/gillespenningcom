import * as THREE from 'three';

// Original, locally generated miniatures. No downloaded game geometry or textures.
export function createEnterprise(era = 'tos', stand = true) {
  const root = new THREE.Group(), ship = new THREE.Group();
  root.add(ship); ship.position.y = .63;
  const d = era === 'tng';
  const hull = new THREE.MeshStandardMaterial({ color: d ? 0xc9d2cf : 0xe1ded2, roughness: .54, metalness: .24 });
  const inset = new THREE.MeshStandardMaterial({ color: 0x899c9d, roughness: .64, metalness: .3 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb49356, metalness: .65, roughness: .4 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x74bed3, emissive: 0x246d9c, emissiveIntensity: .5 });
  const red = new THREE.MeshStandardMaterial({ color: 0xb45c39, emissive: 0x983f1d, emissiveIntensity: .3 });
  const mesh = (geo, material, x, y, z, sx = 1, sy = 1, sz = 1, parent = ship) => {
    const o = new THREE.Mesh(geo, material); o.position.set(x, y, z); o.scale.set(sx, sy, sz);
    o.castShadow = o.receiveShadow = true; parent.add(o); return o;
  };
  const sphere = (x,y,z,sx,sy,sz,material=hull) => mesh(new THREE.SphereGeometry(1,32,16),material,x,y,z,sx,sy,sz);
  const box = (x,y,z,sx,sy,sz,material=hull,parent=ship) => mesh(new THREE.BoxGeometry(sx,sy,sz),material,x,y,z,1,1,1,parent);
  const ring = (r, tube, x,y,z, sx=1,sz=1, material=inset) => {
    const o=mesh(new THREE.TorusGeometry(r,tube,4,64),material,x,y,z); o.rotation.x=Math.PI/2; o.scale.set(sx,sz,1); return o;
  };
  // Turned saucer with an actual bevel profile and concentric hull bands.
  const profile = [[0,-.09],[.35,-.09],[.65,-.045],[.91,-.015],[1,0],[.99,.035],[.72,.065],[.36,.12],[0,.12]];
  const saucer=mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),64),hull,0,.2,-.7,d?1.18:.9,1,d?.86:.9);
  for(const r of [.36,.65,.89]) ring(r,.004,0,.2+(r<.4?.12:r<.7?.075:.04),-.7,d?1.18:.9,d?.86:.9);
  sphere(0,.355,-.7,.17,.055,.22); sphere(0,.4,-.72,.08,.025,.1,inset);
  // TOS's narrow neck and cigar hull; Galaxy's broader integrated neck and body.
  box(0,d?-.02:-.12,d?-.08:.12,d?.36:.10,d?.35:.5,d?.65:.4);
  sphere(0,d?-.21:-.35,.48,d?.38:.23,d?.25:.22,d?.93:.83);
  sphere(0,d?-.2:-.36,-.32,d?.2:.15,.12,.035,brass);
  const deflector=mesh(new THREE.TorusGeometry(d?.19:.14,.015,6,32),inset,0,d?-.2:-.36,-.35);
  sphere(0,d?-.2:-.36,-.358,d?.14:.10,.075,.009,d?blue:brass);
  for(const side of [-1,1]) {
    const strut=box(side*(d?.68:.51),d?.08:.15,d?.75:.83,.075,d?.08:.66,d?1.03:.08,inset);
    strut.rotation.z=side*(d?-.5:-.65); strut.rotation.y=side*(d?-.85:0);
    const nacelle=sphere(side*(d?1.02:.8),d?.12:.48,d?.87:.76,d?.14:.105,d?.11:.105,d?.72:1.02);
    if(!d) { nacelle.scale.z=1.02; }
    sphere(side*(d?1.02:.8),d?.12:.48,d?.2:-.24,d?.135:.102,d?.1:.102,.07,red);
    box(side*(d?1.02:.8),d?.225:.55,d?.92:.85,.12,.022,d?1.12:1.4,blue);
    if (!d) { const collar=mesh(new THREE.TorusGeometry(.105,.012,6,24),inset,side*.8,.48,-.15); } // TOS engine collar
  }
  // Windows use one instanced draw call, rather than many tiny meshes.
  const winMat=new THREE.MeshStandardMaterial({color:0xf5dfaa,emissive:0xc5a876,emissiveIntensity:.2});
  const windows=new THREE.InstancedMesh(new THREE.BoxGeometry(.024,.009,.012),winMat,80), dummy=new THREE.Object3D();
  for(let i=0;i<80;i++) { const a=i/80*Math.PI*2; dummy.position.set(Math.sin(a)*(d?1.12:.86),.225,-.7+Math.cos(a)*(d?.81:.86)); dummy.rotation.y=a; dummy.updateMatrix(); windows.setMatrixAt(i,dummy.matrix); }
  ship.add(windows);
  const label=(text,width,height,color,bg)=>{
    const c=document.createElement('canvas');c.width=1024;c.height=256;const k=c.getContext('2d');
    if(bg){k.fillStyle=bg;k.fillRect(0,0,c.width,c.height);}k.fillStyle=color;k.font='600 84px Georgia';k.textAlign='center';k.textBaseline='middle';k.fillText(text,512,128,970);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,transparent:!bg,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
  };
  const registry=label(d?'NCC-1701-D':'NCC-1701',.68,.17,'#34494d');registry.rotation.x=-Math.PI/2;registry.position.set(0,.29,-1.08);ship.add(registry);
  if(stand) {
    const baseMaterial=new THREE.MeshStandardMaterial({color:0x514438,roughness:.65});
    box(0,.03,.05,1.5,.06,1.2,baseMaterial,root);
    mesh(new THREE.CylinderGeometry(.028,.045,.5,12),brass,0,.31,.35,1,1,1,root);
    const plaque=label(d?'NCC-1701-D · GALAXY':'NCC-1701 · CONSTITUTION',1.2,.21,'#2f332f','#bca16c');
    plaque.rotation.x=-Math.PI/2;plaque.position.set(0,.063,.49);root.add(plaque);
  }
  root.userData={ship,blue,red,era}; return root;
}

export function disposeEnterprise(root) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);if(m.map)textures.add(m.map);}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
}
