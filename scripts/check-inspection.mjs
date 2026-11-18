import assert from 'node:assert/strict';
import * as THREE from 'three';
import { inspectionPose, zoomToSlider, sliderToZoom, ZOOM_MIN, ZOOM_MAX } from '../src/inspection.js';

// Project the physical corners with Three's camera, independently of the fitting
// equations. A portrait stage and a tall caption are the limiting cases.
let frames = 0;
for (const [width, height, captionHeight] of [[740,580,110],[390,420,160],[320,295,130],[1100,650,160]]) {
  for (const [min,max,az,el] of [
    [[-1.2,0,-.5],[.5,1.1,.6],-.24,.82],
    [[-1,.05,-.2],[.6,1.55,.5],-.16,.30],
    [[1.2,1.3,-4.2],[1.5,1.5,-3.9],-.2,.32],
  ]) {
    const p = inspectionPose({ min,max,az,el,width,height,captionHeight,fov:24 });
    const camera = new THREE.PerspectiveCamera(24,width/height,.1,200);
    const target = new THREE.Vector3(...p.target);
    camera.position.copy(target).add(new THREE.Vector3(Math.cos(el)*Math.sin(az),Math.sin(el),Math.cos(el)*Math.cos(az)).multiplyScalar(p.distance));
    camera.lookAt(target); camera.updateMatrixWorld();
    for (const x of [min[0],max[0]]) for (const y of [min[1],max[1]]) for (const z of [min[2],max[2]]) {
      const v = new THREE.Vector3(x,y,z).project(camera);
      assert(v.x >= p.rect.left && v.x <= p.rect.right, `horizontal clipping at ${width}`);
      assert(v.y >= p.rect.bottom && v.y <= p.rect.top, `caption collision at ${width}`);
      assert(v.z > -1 && v.z < 1);
    }
    frames++;
  }
}
assert(sliderToZoom(100) < sliderToZoom(0));
for (const zoom of [ZOOM_MIN,.1,.3,1,ZOOM_MAX]) assert(Math.abs(sliderToZoom(zoomToSlider(zoom))-zoom)<1e-9);
assert.equal(sliderToZoom(-20),ZOOM_MAX);
assert(Math.abs(sliderToZoom(120)-ZOOM_MIN)<1e-10);
console.log(`inspection checks: ${frames} projected bounds fit above captions; zoom mapping and limits pass`);
