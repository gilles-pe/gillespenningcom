import * as THREE from 'three';

// Indiana-Jones-style flight route across the antique shelf globe.
// Coordinates are exact WGS-84 (lat, lon) mapped to Three.js SphereGeometry's equirectangular UV layout.
const STOPS = [
  { id: 'malta',   lat: 35.90, lon: 14.51 },
  { id: 'porto',   lat: 41.15, lon: -8.61 },
  { id: 'hamburg', lat: 53.55, lon:  9.99 },
  { id: 'yerevan', lat: 40.18, lon: 44.51 },
  { id: 'cairo',   lat: 30.04, lon: 31.24 },
];

// Gentle per-stop earth rotation offsets (0 extra polygons) keeping each leg well centered & lit.
const STOP_ROT_OFFSET = [0.0, 0.28, 0.04, -0.34, -0.18];

// Leg timing in seconds (synced to the 60s theme; full journey completes in ~18.4s and stays visible).
const START_HOLD = 0.85;
const LEG_DUR = [3.8, 3.6, 4.2, 3.2];
const STOP_HOLD = 0.90;
const SEGMENTS_PER_LEG = 48;
const BASE_ALT = 0.0014;
const ARC_ALT = 0.0048;
const WORLD_SUN_DIR = new THREE.Vector3(-7, 10, 6).normalize();

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

// Stylized 1930s Douglas DC-3 twin-propeller airliner (local +Z = forward, +Y = up, +X = right wing).
function buildPropPlane() {
  const g = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xded9cf, roughness: 0.34, metalness: 0.48 });
  const petrolMat = new THREE.MeshStandardMaterial({ color: 0x1b3b3f, roughness: 0.42, metalness: 0.22 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x12242a, roughness: 0.14, metalness: 0.65 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc99c52, roughness: 0.32, metalness: 0.62 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x26292c, roughness: 0.45, metalness: 0.4 });
  const propMat = new THREE.MeshBasicMaterial({ color: 0xf6eee3, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false });

  // Streamlined DC-3 tapered fuselage (revolved around +Y, then rotated to align +Y -> +Z nose forward)
  const fuseProfile = [
    [0, 0.0048], [0.00038, 0.0045], [0.00074, 0.0038], [0.00096, 0.0026],
    [0.00102, 0.0012], [0.00094, -0.0006], [0.00068, -0.0026], [0.00032, -0.0044],
    [0, -0.0049],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const fuselage = new THREE.Mesh(new THREE.LatheGeometry(fuseProfile, 16), metalMat);
  fuselage.rotation.x = Math.PI / 2;
  g.add(fuselage);

  // Dark cockpit windshield fairing + cabin petrol cheatline stripe
  const cockpit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.00072, 0.00090, 0.00095, 12, 1, false, -Math.PI * 0.42, Math.PI * 0.84),
    glassMat,
  );
  cockpit.rotation.x = Math.PI / 2 - 0.18;
  cockpit.position.set(0, 0.00024, 0.0029);
  g.add(cockpit);

  const stripeShape = new THREE.Shape();
  stripeShape.moveTo(0.00098, 0.0024);
  stripeShape.lineTo(0.00104, 0.0012);
  stripeShape.lineTo(0.00070, -0.0026);
  stripeShape.lineTo(0.00034, -0.0044);
  stripeShape.lineTo(-0.00034, -0.0044);
  stripeShape.lineTo(-0.00070, -0.0026);
  stripeShape.lineTo(-0.00104, 0.0012);
  stripeShape.lineTo(-0.00098, 0.0024);
  stripeShape.closePath();
  const stripeGeo = new THREE.ExtrudeGeometry(stripeShape, { depth: 0.00018, bevelEnabled: false });
  stripeGeo.translate(0, 0, -0.00009);
  const stripe = new THREE.Mesh(stripeGeo, petrolMat);
  stripe.rotation.x = Math.PI / 2;
  stripe.position.set(0, 0.00008, 0);
  g.add(stripe);

  // Swept tapered wing halves with slight positive dihedral
  const makeWing = sign => {
    const shape = new THREE.Shape();
    if (sign > 0) {
      shape.moveTo(0, 0.00135);
      shape.lineTo(0.0052, 0.00045);
      shape.lineTo(0.0057, 0.00005);
      shape.lineTo(0.0054, -0.00045);
      shape.lineTo(0, -0.00125);
    } else {
      shape.moveTo(0, -0.00125);
      shape.lineTo(-0.0054, -0.00045);
      shape.lineTo(-0.0057, 0.00005);
      shape.lineTo(-0.0052, 0.00045);
      shape.lineTo(0, 0.00135);
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.00022, bevelEnabled: true, bevelThickness: 0.00008, bevelSize: 0.00009, bevelSegments: 1,
    });
    geo.translate(0, 0, -0.00011);
    const wing = new THREE.Mesh(geo, metalMat);
    wing.rotation.x = Math.PI / 2;
    wing.rotation.z = sign * 0.065;
    wing.position.set(0, -0.00028, 0.00065);
    g.add(wing);

    // Wingtip petrol trim cap
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.00065, 0.00024, 0.00068), petrolMat);
    tip.position.set(sign * 0.00535, 0.00006, 0.00062);
    tip.rotation.z = sign * 0.065;
    g.add(tip);
  };
  makeWing(1);
  makeWing(-1);

  // Swept horizontal tailplanes
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0.00055);
  tailShape.lineTo(0.0022, 0.00008);
  tailShape.lineTo(0.0021, -0.00042);
  tailShape.lineTo(0, -0.00055);
  tailShape.lineTo(-0.0021, -0.00042);
  tailShape.lineTo(-0.0022, 0.00008);
  tailShape.closePath();
  const tailGeo = new THREE.ExtrudeGeometry(tailShape, {
    depth: 0.00018, bevelEnabled: true, bevelThickness: 0.00005, bevelSize: 0.00006, bevelSegments: 1,
  });
  tailGeo.translate(0, 0, -0.00009);
  const hTail = new THREE.Mesh(tailGeo, metalMat);
  hTail.rotation.x = Math.PI / 2;
  hTail.position.set(0, 0.00018, -0.0039);
  g.add(hTail);

  // Dorsal curved vertical stabilizer & brass rudder accent
  const finShape = new THREE.Shape();
  finShape.moveTo(-0.0010, 0);
  finShape.lineTo(0.0014, 0.00018);
  finShape.lineTo(0.0001, 0.00095);
  finShape.lineTo(-0.00065, 0.00225);
  finShape.lineTo(-0.00125, 0.00215);
  finShape.lineTo(-0.0014, 0.0001);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.00020, bevelEnabled: true, bevelThickness: 0.00004, bevelSize: 0.00005, bevelSegments: 1,
  });
  finGeo.translate(0, 0, -0.00010);
  const vTail = new THREE.Mesh(finGeo, metalMat);
  vTail.rotation.y = -Math.PI / 2;
  vTail.position.set(0, 0.00024, -0.00355);
  g.add(vTail);

  const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.00026, 0.00135, 0.00032), petrolMat);
  rudder.position.set(0, 0.00145, -0.00465);
  rudder.rotation.x = 0.14;
  g.add(rudder);

  // Twin radial engine nacelles with brass cowlings, nose spinners & spinning 2-blade props
  const props = [];
  for (const sx of [-1, 1]) {
    const x = sx * 0.00215;
    const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.00040, 0.00026, 0.0024, 12), metalMat);
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(x, -0.00012, 0.00155);
    g.add(nacelle);

    const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.00038, 0.00043, 0.00052, 12), brassMat);
    cowl.rotation.x = Math.PI / 2;
    cowl.position.set(x, -0.00012, 0.00278);
    g.add(cowl);

    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.00019, 0.00042, 10), brassMat);
    spinner.rotation.x = Math.PI / 2;
    spinner.position.set(x, -0.00012, 0.00318);
    g.add(spinner);

    const propSpin = new THREE.Group();
    propSpin.position.set(x, -0.00012, 0.00305);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.0021, 0.00020, 0.00006), bladeMat);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.00105, 14), propMat);
    propSpin.add(blade, disc);
    g.add(propSpin);
    props.push(propSpin);
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

  // Build a flat ink ribbon hugging the sphere surface per leg, revealed via setDrawRange.
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0xa83b2d,
    emissive: 0x5c1810,
    emissiveIntensity: 0.16,
    roughness: 0.92,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const lineR = radius + 0.00038;
  const ribbonHalfWidth = 0.00072;
  const buildFlatRibbonGeo = (fromUnit, toUnit) => {
    const pos = [], norm = [], idx = [];
    const u = new THREE.Vector3(), nxt = new THREE.Vector3(), prv = new THREE.Vector3();
    const tan = new THREE.Vector3(), side = new THREE.Vector3(), edge = new THREE.Vector3();
    for (let k = 0; k <= SEGMENTS_PER_LEG; k++) {
      const f = k / SEGMENTS_PER_LEG;
      slerpUnit(fromUnit, toUnit, f, u);
      if (k < SEGMENTS_PER_LEG) {
        slerpUnit(fromUnit, toUnit, Math.min(1, f + 0.01), nxt);
        tan.copy(nxt).sub(u);
      } else {
        slerpUnit(fromUnit, toUnit, Math.max(0, f - 0.01), prv);
        tan.copy(u).sub(prv);
      }
      side.crossVectors(u, tan).normalize();
      for (const s of [1, -1]) {
        edge.copy(u).multiplyScalar(lineR).addScaledVector(side, s * ribbonHalfWidth);
        pos.push(edge.x, edge.y, edge.z);
        norm.push(u.x, u.y, u.z);
      }
      if (k < SEGMENTS_PER_LEG) {
        const a = k * 2, b = a + 1, c = a + 2, d = a + 3;
        idx.push(a, b, c, b, d, c);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    geo.setIndex(idx);
    return geo;
  };
  const legs = [];
  for (let i = 0; i < STOPS.length - 1; i++) {
    const geo = buildFlatRibbonGeo(unitStops[i], unitStops[i + 1]);
    const totalIndices = SEGMENTS_PER_LEG * 6;
    geo.setDrawRange(0, 0);
    const mesh = new THREE.Mesh(geo, lineMat);
    routeGroup.add(mesh);
    legs.push({ from: unitStops[i], to: unitStops[i + 1], geo, totalIndices, dur: LEG_DUR[i] });
  }

  // Soft airplane silhouette shadow texture (nose pointing top -Y on canvas -> aligned with +Z forward).
  function buildPlaneShadowTexture() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    const drawSilhouette = (alpha, pad) => {
      ctx.fillStyle = `rgba(26, 21, 16, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(32, 32, 3.2 + pad, 22 + pad, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(32, 27, 25 + pad * 1.4, 4.4 + pad * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(32, 50, 9.5 + pad, 2.6 + pad * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    drawSilhouette(0.22, 2.4);
    drawSilhouette(0.32, 1.0);
    drawSilhouette(0.48, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Stylized 1930s propeller plane + offset silhouette shadow
  const plane = buildPropPlane();
  plane.scale.setScalar(0.92);
  routeGroup.add(plane);

  const shadowGeo = new THREE.PlaneGeometry(0.0115, 0.010);
  shadowGeo.rotateX(-Math.PI / 2);
  shadowGeo.rotateY(Math.PI);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: buildPlaneShadowTexture(),
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  routeGroup.add(shadow);

  // Precompute timeline intervals for each leg and quiet persistent stop dots connecting segments
  const timeline = [];
  let cursor = START_HOLD;
  for (let i = 0; i < legs.length; i++) {
    timeline.push({ start: cursor, end: cursor + legs[i].dur });
    cursor += legs[i].dur + STOP_HOLD;
  }

  const zAxis = new THREE.Vector3(0, 0, 1);
  const dotGeo = new THREE.CircleGeometry(0.00145, 16);
  const stopDots = unitStops.map((unit, i) => {
    const dot = new THREE.Mesh(dotGeo, lineMat);
    dot.position.copy(unit).multiplyScalar(radius + 0.00044);
    dot.quaternion.setFromUnitVectors(zAxis, unit);
    dot.visible = false;
    routeGroup.add(dot);
    return { mesh: dot, revealAt: i === 0 ? 0.05 : timeline[i - 1].end };
  });

  const restRotY = earth.rotation.y;
  let active = false;
  let reducedMode = false;
  let startTime = 0;
  let lastUpdateNow = 0;
  let userSpinning = false;
  let userSpun = false;
  let spinVel = 0;

  const tmpPos = new THREE.Vector3();
  const tmpNext = new THREE.Vector3();
  const tmpFwd = new THREE.Vector3();
  const tmpUp = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();
  const tmpBasis = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpLocalSun = new THREE.Vector3();
  const tmpShadowUp = new THREE.Vector3();
  const tmpShadowRight = new THREE.Vector3();
  const tmpShadowFwd = new THREE.Vector3();
  const tmpPitchQ = new THREE.Quaternion();
  const tmpBankQ = new THREE.Quaternion();
  const localX = new THREE.Vector3(1, 0, 0);
  const localZ = new THREE.Vector3(0, 0, 1);

  function placePlane(unitPos, headingUnit, altitude, pitch = 0, bank = 0) {
    tmpUp.copy(unitPos).normalize();
    tmpFwd.copy(headingUnit).addScaledVector(tmpUp, -headingUnit.dot(tmpUp));
    if (tmpFwd.lengthSq() < 1e-6) tmpFwd.set(0, 1, 0);
    else tmpFwd.normalize();
    tmpRight.crossVectors(tmpUp, tmpFwd).normalize();
    tmpBasis.makeBasis(tmpRight, tmpUp, tmpFwd);

    plane.position.copy(tmpUp).multiplyScalar(radius + altitude);
    plane.quaternion.setFromRotationMatrix(tmpBasis);
    if (pitch !== 0) plane.quaternion.multiply(tmpPitchQ.setFromAxisAngle(localX, -pitch));
    if (bank !== 0) plane.quaternion.multiply(tmpBankQ.setFromAxisAngle(localZ, bank));

    // Cast silhouette shadow diagonally away from the room's directional sun onto the curved sphere surface.
    earth.updateWorldMatrix(true, false);
    earth.getWorldQuaternion(tmpQ);
    tmpLocalSun.copy(WORLD_SUN_DIR).applyQuaternion(tmpQ.invert()).normalize();
    const sunDot = Math.max(0.45, tmpUp.dot(tmpLocalSun));
    tmpShadowUp.copy(tmpLocalSun).addScaledVector(tmpUp, -tmpLocalSun.dot(tmpUp));
    const offsetScale = (altitude * 1.15) / sunDot;
    shadow.position
      .copy(tmpUp).multiplyScalar(radius + altitude)
      .addScaledVector(tmpShadowUp, -offsetScale)
      .normalize()
      .multiplyScalar(radius + 0.00045);

    tmpShadowUp.copy(shadow.position).normalize();
    tmpShadowFwd.copy(tmpFwd).addScaledVector(tmpShadowUp, -tmpFwd.dot(tmpShadowUp));
    if (tmpShadowFwd.lengthSq() < 1e-6) tmpShadowFwd.copy(tmpFwd);
    else tmpShadowFwd.normalize();
    tmpShadowRight.crossVectors(tmpShadowUp, tmpShadowFwd).normalize();
    tmpBasis.makeBasis(tmpShadowRight, tmpShadowUp, tmpShadowFwd);
    shadow.quaternion.setFromRotationMatrix(tmpBasis);
    shadow.scale.setScalar(0.95 + altitude * 36);
    shadowMat.opacity = THREE.MathUtils.clamp(0.42 - altitude * 18, 0.18, 0.42);
  }

  function updateStopDots(t) {
    let settling = false;
    for (const dot of stopDots) {
      if (t < dot.revealAt) {
        dot.mesh.visible = false;
      } else {
        dot.mesh.visible = true;
        const age = t - dot.revealAt;
        if (age < 0.25) {
          const p = age / 0.25;
          dot.mesh.scale.setScalar(0.4 + 0.6 * (1 - (1 - p) * (1 - p)));
          settling = true;
        } else {
          dot.mesh.scale.setScalar(1);
        }
      }
    }
    return settling;
  }

  function beginUserSpin() {
    userSpinning = true;
    spinVel = 0;
  }

  function spinBy(deltaRad) {
    userSpun = true;
    earth.rotation.y += deltaRad;
  }

  function releaseUserSpin(vel) {
    userSpinning = false;
    spinVel = THREE.MathUtils.clamp(vel, -14, 14);
  }

  function start(reduced = false) {
    active = true;
    reducedMode = Boolean(reduced);
    startTime = performance.now();
    lastUpdateNow = startTime;
    userSpinning = false;
    userSpun = false;
    spinVel = 0;
    routeGroup.visible = true;
    earth.rotation.y = restRotY;

    if (reducedMode) {
      for (const leg of legs) leg.geo.setDrawRange(0, leg.totalIndices);
      for (const dot of stopDots) { dot.mesh.visible = true; dot.mesh.scale.setScalar(1); }
      plane.visible = false;
      shadow.visible = false;
    } else {
      for (const leg of legs) leg.geo.setDrawRange(0, 0);
      for (const dot of stopDots) dot.mesh.visible = false;
      plane.visible = true;
      shadow.visible = true;
      const firstDir = slerpUnit(legs[0].from, legs[0].to, 0.05, new THREE.Vector3()).sub(legs[0].from).normalize();
      placePlane(unitStops[0], firstDir, BASE_ALT);
    }
  }

  function stop() {
    userSpinning = false;
    userSpun = false;
    spinVel = 0;
    earth.rotation.y = restRotY;
    if (!active) return;
    active = false;
    routeGroup.visible = false;
    for (const dot of stopDots) dot.mesh.visible = false;
    for (const leg of legs) leg.geo.setDrawRange(0, 0);
  }

  function update(now) {
    const dt = lastUpdateNow ? Math.min(Math.max((now - lastUpdateNow) / 1000, 1 / 240), 0.05) : 1 / 60;
    lastUpdateNow = now;

    let spinning = false;
    if (!userSpinning && Math.abs(spinVel) > 0.002) {
      earth.rotation.y += spinVel * dt;
      spinVel *= Math.exp(-dt * 2.6);
      if (Math.abs(spinVel) <= 0.002) spinVel = 0;
      else spinning = true;
    }
    if (!active || reducedMode) return spinning;

    const t = (now - startTime) / 1000;
    // Spin propellers subtly
    for (const disc of plane.userData.props) disc.rotation.z = t * 28;

    let moving = false;
    let activeLeg = -1;
    let targetRotOffset = STOP_ROT_OFFSET[STOP_ROT_OFFSET.length - 1];
    for (let i = 0; i < legs.length; i++) {
      const { start: s, end: e } = timeline[i];
      if (t >= e) {
        legs[i].geo.setDrawRange(0, legs[i].totalIndices);
      } else if (t >= s) {
        activeLeg = i;
        moving = true;
        const p = Math.min(Math.max((t - s) / (e - s), 0), 1);
        const eased = p * p * (3 - 2 * p);
        targetRotOffset = THREE.MathUtils.lerp(STOP_ROT_OFFSET[i], STOP_ROT_OFFSET[i + 1], eased);
        const segCount = Math.floor(eased * SEGMENTS_PER_LEG);
        legs[i].geo.setDrawRange(0, segCount * 6);

        slerpUnit(legs[i].from, legs[i].to, eased, tmpPos);
        slerpUnit(legs[i].from, legs[i].to, Math.min(1, eased + 0.02), tmpNext);
        tmpFwd.copy(tmpNext).sub(tmpPos);
        if (tmpFwd.lengthSq() < 1e-8) {
          slerpUnit(legs[i].from, legs[i].to, Math.max(0, eased - 0.02), tmpNext);
          tmpFwd.copy(tmpPos).sub(tmpNext);
        }
        const altitude = BASE_ALT + Math.sin(eased * Math.PI) * ARC_ALT;
        const pitch = Math.cos(eased * Math.PI) * 0.18;
        const bank = Math.sin(eased * Math.PI * 2) * 0.10;
        placePlane(tmpPos, tmpFwd, altitude, pitch, bank);
        break;
      } else {
        targetRotOffset = STOP_ROT_OFFSET[i];
        legs[i].geo.setDrawRange(0, 0);
        // Holding at stop i before leg i starts
        const dir = slerpUnit(legs[i].from, legs[i].to, 0.04, tmpNext).sub(legs[i].from);
        placePlane(unitStops[i], dir, BASE_ALT);
        moving = true;
        break;
      }
    }

    let rotating = false;
    if (!userSpun) {
      const targetRotY = restRotY + targetRotOffset;
      earth.rotation.y = THREE.MathUtils.lerp(earth.rotation.y, targetRotY, 1 - Math.exp(-dt * 2.8));
      if (Math.abs(earth.rotation.y - targetRotY) < 0.0002) earth.rotation.y = targetRotY;
      rotating = Math.abs(earth.rotation.y - targetRotY) >= 0.0002;
    }

    if (activeLeg === -1 && t >= timeline[legs.length - 1].end) {
      // Arrived at Cairo: settle plane cleanly at final stop
      const last = legs[legs.length - 1];
      const dir = slerpUnit(last.from, last.to, 0.96, tmpNext);
      tmpFwd.copy(last.to).sub(dir);
      placePlane(last.to, tmpFwd, BASE_ALT);
      plane.visible = true;
      shadow.visible = true;
    }

    const dotsSettling = updateStopDots(t);
    return moving || dotsSettling || rotating || spinning;
  }

  return {
    start,
    stop,
    update,
    beginUserSpin,
    spinBy,
    releaseUserSpin,
    isActive: () => active,
  };
}
