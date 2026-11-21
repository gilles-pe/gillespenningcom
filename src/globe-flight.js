import * as THREE from 'three';

// Indiana-Jones-style flight route across the antique shelf globe (no pins, no globe rotation).
// Coordinates are exact WGS-84 (lat, lon) mapped to Three.js SphereGeometry's equirectangular UV layout.
const STOPS = [
  { id: 'malta',   lat: 35.90, lon: 14.51 },
  { id: 'porto',   lat: 41.15, lon: -8.61 },
  { id: 'hamburg', lat: 53.55, lon:  9.99 },
  { id: 'yerevan', lat: 40.18, lon: 44.51 },
  { id: 'cairo',   lat: 30.04, lon: 31.24 },
];

// Leg timing in seconds (synced to the 60s theme; full journey completes in ~18.4s and stays visible).
const START_HOLD = 0.85;
const LEG_DUR = [3.8, 3.6, 4.2, 3.2];
const STOP_HOLD = 0.90;
const SEGMENTS_PER_LEG = 48;
const RADIAL_SEGMENTS = 6;

function latLonToVec3(latDeg, lonDeg, r) {
  const phi = ((lonDeg + 180) / 360) * Math.PI * 2;
  const theta = ((90 - latDeg) / 180) * Math.PI;
  return new THREE.Vector3(
    -r * Math.cos(phi) * Math.sin(theta),
    r * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

// Great-circle interpolation between two unit vectors on the sphere.
function slerpUnit(a, b, t, out) {
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  const omega = Math.acos(dot);
  if (omega < 1e-5) return out.copy(a);
  const sinO = Math.sin(omega);
  const s0 = Math.sin((1 - t) * omega) / sinO;
  const s1 = Math.sin(t * omega) / sinO;
  return out.set(
    a.x * s0 + b.x * s1,
    a.y * s0 + b.y * s1,
    a.z * s0 + b.z * s1,
  ).normalize();
}

// Tiny stylized 1930s propeller plane (local +Z = forward, +Y = up/outward from globe, +X = right wing).
function buildPropPlane() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1d3b3e, roughness: 0.42, metalness: 0.35 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xd7ad6c, roughness: 0.35, metalness: 0.55 });
  const propMat = new THREE.MeshBasicMaterial({ color: 0xf6eee3, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });

  // Fuselage
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.00055, 0.00105, 0.0088, 10), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  g.add(fuselage);

  // Nose cone
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.00105, 10, 8), trimMat);
  nose.position.set(0, 0, 0.0044);
  nose.scale.set(1, 0.9, 1.3);
  g.add(nose);

  // Main wing
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.0112, 0.00038, 0.0022), bodyMat);
  wing.position.set(0, 0.00015, 0.0008);
  g.add(wing);

  // Tailplane & vertical fin
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.0042, 0.00028, 0.0012), bodyMat);
  tail.position.set(0, 0.0001, -0.0038);
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.0003, 0.0016, 0.0015), trimMat);
  fin.position.set(0, 0.0009, -0.0038);
  g.add(fin);

  // Twin wing-mounted propeller discs
  const props = [];
  for (const sx of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.00038, 0.00042, 0.0016, 8), trimMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(sx * 0.0024, 0.00005, 0.0016);
    g.add(pod);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.00105, 12), propMat);
    disc.position.set(sx * 0.0024, 0.00005, 0.00255);
    g.add(disc);
    props.push(disc);
  }
  g.userData.props = props;
  return g;
}

// Add Malta (and tiny Gozo) directly onto the globe surface since Natural Earth 1:110m omits them.
function addMaltaIsland(earth, radius) {
  const islandMat = new THREE.MeshStandardMaterial({ color: 0x2d695b, roughness: 0.55 });
  const patches = [
    { lat: 35.89, lon: 14.50, rx: 0.00125, ry: 0.00085, rot: -0.55 }, // Malta
    { lat: 36.04, lon: 14.25, rx: 0.00072, ry: 0.00052, rot: -0.45 }, // Gozo
  ];
  const zAxis = new THREE.Vector3(0, 0, 1);
  for (const p of patches) {
    const pos = latLonToVec3(p.lat, p.lon, radius + 0.00022);
    const normal = pos.clone().normalize();
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 16), islandMat);
    mesh.position.copy(pos);
    mesh.quaternion.setFromUnitVectors(zAxis, normal);
    mesh.rotateZ(p.rot);
    mesh.scale.set(p.rx, p.ry, 1);
    mesh.name = 'Malta island';
    earth.add(mesh);
  }
}

export function createGlobeFlight(globe) {
  const earth = globe?.userData?.earth;
  const radius = globe?.userData?.radius || 0.075;
  if (!earth) return null;

  // Ensure Malta is visibly present on the globe surface
  addMaltaIsland(earth, radius);

  const unitStops = STOPS.map(s => latLonToVec3(s.lat, s.lon, 1).normalize());
  const routeGroup = new THREE.Group();
  routeGroup.name = 'Indiana Jones globe flight';
  routeGroup.visible = false;
  earth.add(routeGroup);

  // Build one continuous red TubeGeometry per leg so setDrawRange reveals the inked line behind the plane.
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0xa83b2d,
    emissive: 0x5c1810,
    emissiveIntensity: 0.25,
    roughness: 0.65,
  });
  const lineR = radius + 0.00075;
  const legs = [];
  for (let i = 0; i < STOPS.length - 1; i++) {
    const pts = [];
    for (let k = 0; k <= SEGMENTS_PER_LEG; k++) {
      const u = slerpUnit(unitStops[i], unitStops[i + 1], k / SEGMENTS_PER_LEG, new THREE.Vector3());
      pts.push(u.multiplyScalar(lineR));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, SEGMENTS_PER_LEG, 0.00082, RADIAL_SEGMENTS, false);
    const totalIndices = geo.index ? geo.index.count : 0;
    geo.setDrawRange(0, 0);
    const mesh = new THREE.Mesh(geo, lineMat);
    routeGroup.add(mesh);
    legs.push({ from: unitStops[i], to: unitStops[i + 1], geo, totalIndices, dur: LEG_DUR[i] });
  }

  // Stylized 1930s propeller plane + tiny ground shadow on the sphere
  const plane = buildPropPlane();
  routeGroup.add(plane);

  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x1a1510,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.0032, 16), shadowMat);
  routeGroup.add(shadow);

  // Precompute timeline intervals for each leg
  const timeline = [];
  let cursor = START_HOLD;
  for (let i = 0; i < legs.length; i++) {
    timeline.push({ start: cursor, end: cursor + legs[i].dur });
    cursor += legs[i].dur + STOP_HOLD;
  }

  let active = false;
  let reducedMode = false;
  let startTime = 0;

  const tmpPos = new THREE.Vector3();
  const tmpNext = new THREE.Vector3();
  const tmpFwd = new THREE.Vector3();
  const tmpUp = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();
  const tmpBasis = new THREE.Matrix4();
  const zAxis = new THREE.Vector3(0, 0, 1);

  function placePlane(unitPos, headingUnit, altitude) {
    tmpUp.copy(unitPos).normalize();
    tmpFwd.copy(headingUnit).addScaledVector(tmpUp, -headingUnit.dot(tmpUp));
    if (tmpFwd.lengthSq() < 1e-6) tmpFwd.set(0, 1, 0);
    else tmpFwd.normalize();
    tmpRight.crossVectors(tmpUp, tmpFwd).normalize();
    tmpBasis.makeBasis(tmpRight, tmpUp, tmpFwd);

    plane.position.copy(tmpUp).multiplyScalar(radius + altitude);
    plane.quaternion.setFromRotationMatrix(tmpBasis);

    shadow.position.copy(tmpUp).multiplyScalar(radius + 0.00035);
    shadow.quaternion.setFromUnitVectors(zAxis, tmpUp);
    const shadowScale = Math.max(0.55, 1 - (altitude - 0.0014) * 75);
    shadow.scale.setScalar(shadowScale);
  }

  function start(reduced = false) {
    active = true;
    reducedMode = Boolean(reduced);
    startTime = performance.now();
    routeGroup.visible = true;

    if (reducedMode) {
      for (const leg of legs) leg.geo.setDrawRange(0, leg.totalIndices);
      plane.visible = false;
      shadow.visible = false;
    } else {
      for (const leg of legs) leg.geo.setDrawRange(0, 0);
      plane.visible = true;
      shadow.visible = true;
      const firstDir = slerpUnit(legs[0].from, legs[0].to, 0.05, new THREE.Vector3()).sub(legs[0].from).normalize();
      placePlane(unitStops[0], firstDir, 0.0014);
    }
  }

  function stop() {
    if (!active) return;
    active = false;
    routeGroup.visible = false;
    for (const leg of legs) leg.geo.setDrawRange(0, 0);
  }

  function update(now) {
    if (!active) return false;
    if (reducedMode) return false;

    const t = (now - startTime) / 1000;
    // Spin propellers subtly
    for (const disc of plane.userData.props) disc.rotation.z = t * 28;

    let moving = false;
    let activeLeg = -1;
    for (let i = 0; i < legs.length; i++) {
      const { start: s, end: e } = timeline[i];
      if (t >= e) {
        legs[i].geo.setDrawRange(0, legs[i].totalIndices);
      } else if (t >= s) {
        activeLeg = i;
        moving = true;
        const p = Math.min(Math.max((t - s) / (e - s), 0), 1);
        const eased = p * p * (3 - 2 * p);
        const segCount = Math.floor(eased * SEGMENTS_PER_LEG);
        legs[i].geo.setDrawRange(0, segCount * RADIAL_SEGMENTS * 6);

        slerpUnit(legs[i].from, legs[i].to, eased, tmpPos);
        slerpUnit(legs[i].from, legs[i].to, Math.min(1, eased + 0.02), tmpNext);
        tmpFwd.copy(tmpNext).sub(tmpPos);
        if (tmpFwd.lengthSq() < 1e-8) {
          slerpUnit(legs[i].from, legs[i].to, Math.max(0, eased - 0.02), tmpNext);
          tmpFwd.copy(tmpPos).sub(tmpNext);
        }
        const altitude = 0.0014 + Math.sin(eased * Math.PI) * 0.0038;
        placePlane(tmpPos, tmpFwd, altitude);
        break;
      } else {
        legs[i].geo.setDrawRange(0, 0);
        // Holding at stop i before leg i starts
        const dir = slerpUnit(legs[i].from, legs[i].to, 0.04, tmpNext).sub(legs[i].from);
        placePlane(unitStops[i], dir, 0.0014);
        moving = true;
        break;
      }
    }

    if (activeLeg === -1 && t >= timeline[legs.length - 1].end) {
      // Arrived at Cairo: settle plane cleanly at final stop
      const last = legs[legs.length - 1];
      const dir = slerpUnit(last.from, last.to, 0.96, tmpNext);
      tmpFwd.copy(last.to).sub(dir);
      placePlane(last.to, tmpFwd, 0.0014);
      plane.visible = true;
      shadow.visible = true;
      moving = false;
    }

    return moving;
  }

  return {
    start,
    stop,
    update,
    isActive: () => active,
  };
}
