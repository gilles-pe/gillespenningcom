import { enterpriseCopy, labelShipAction } from './enterprise-copy.js';
import { loadEnterpriseGlb, createRoomWarp } from './enterprise.js';
import { createGlobeFlight } from './globe-flight.js';
import substackData from './data/substack-articles.json';
import booksCatalog from './data/books.json';
import * as THREE from 'three';
import { buildScene, setModelLanguage, HOTSPOTS } from './scene.js';
import { loadBookCoversForRoom } from './book-jackets.js';
import { createBookInteraction } from './book-interaction.js';
import { t } from './i18n.js';
import { createEgg } from './egg.js';
import { PATHS } from './icons.js';
import { openExternal } from './external-links.js';
import { inspectionPose, clampZoom } from './inspection.js';

// The globe theme (a small synth player and 5 KB of notes) is fetched only when the globe is framed.
const loadGlobeMusic = async () => {
  const [mod, buf] = await Promise.all([import('./globe-music.js'), fetch(`${import.meta.env.BASE_URL}audio/indy-theme.bin`).then(r => r.arrayBuffer())]);
  return (ctx, onEnd) => mod.playGlobeTheme(ctx, buf, onEnd);
};

// The warp flight sounds (about 220 KB of audio and a small scheduler) are fetched when the Enterprise card opens or the flight starts.
const loadWarpSound = async () => {
  const mod = await import('./warp-sound.js');
  const data = await mod.fetchWarpSound(import.meta.env.BASE_URL);
  return (ctx, t0) => mod.playWarpSound(ctx, data, t0);
};

export function startViewer({ canvas, stage, labels, spotsEl, reduced, lang, onPick, onAway, onZoom, onBackState, onViewBack, musicLoader = loadGlobeMusic, warpLoader = loadWarpSound }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return null; }
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;

  let dirty = true;
  const markDirty = () => { dirty = true; };
  // The book jacket materials resolve asynchronously; render again when a front cover arrives.
  window.addEventListener('book-cover-loaded', markDirty);

  setModelLanguage(lang);
  let curLang = lang;
  const { scene, rooms, outline, center, cellar, occluders, photo, speakingPhoto, projectPicks, trophyPicks, storyPicks, albumPicks, albumBook, enterprise, globe, inspectionTargets, projectDisplays } = buildScene();
  const roomWarp = enterprise ? createRoomWarp(scene, enterprise.root) : null;
  const globeFlight = globe ? createGlobeFlight(globe) : null;
  // Default light rig, only if the scene does not bring its own. Room point lights and local fixture spots (the operating light) do not count.
  let sceneLit = false;
  scene.traverse(o => { if (o.isHemisphereLight || o.isDirectionalLight || o.isAmbientLight || o.isRectAreaLight) sceneLit = true; });
  if (!sceneLit) {
    scene.add(new THREE.HemisphereLight(0xfff6e8, 0xe0d0b6, 1.95));
    const sun = new THREE.DirectionalLight(0xffeed8, 1.7);
    sun.position.set(-7, 10, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
    sun.shadow.bias = -0.0004; sun.shadow.radius = 6; sun.shadow.intensity = 0.5; scene.add(sun);
  }

  // Hotspots are real links (or buttons for soon/project cards), placed over the objects they belong to.
  const spots = [];
  const allHotspots = Object.fromEntries(Object.entries(HOTSPOTS).map(([id, list]) => [id, [...list]]));
  scene.updateMatrixWorld(true);
  for (const target of inspectionTargets.filter(target => target.furniture)) {
    const bounds = new THREE.Box3();
    for (const object of target.objects) bounds.expandByObject(object);
    const local = rooms[target.room].group.worldToLocal(bounds.getCenter(new THREE.Vector3()));
    allHotspots[target.room].push([target.key, null, ...local.toArray(), target.key]);
  }
  for (const [id, list] of Object.entries(allHotspots)) for (const [key, href, x, y, z, project] of list) {
    // 3D project/social hotspots always open their preview card first. Keep
    // external navigation on the card, never on the object hit target.
    const el = document.createElement(project ? 'button' : href ? 'a' : 'span');
    if (el.tagName === 'BUTTON') el.type = 'button';
    const isQuiet = id === 'about' && key !== 'album';
    el.className = 'spot' + (isQuiet ? ' quiet-spot' : '') + (href ? '' : ' soon'); el.tabIndex = -1;
    el.dataset.room = id;
    if (href && !project) el.href = href;
    const pos = new THREE.Vector3(x, y, z).add(rooms[id].group.position);
    const sp = { key, el, project, above: id === 'projects' };
    if (project === 'photo') el.addEventListener('click', e => { e.preventDefault(); togglePhoto('photo'); });
    else if (project === 'speaking') el.addEventListener('click', e => { e.preventDefault(); togglePhoto('speaking'); });
    else if (project === 'album') el.addEventListener('click', e => { e.preventDefault(); toggleAlbum(); });
    else if (project) el.addEventListener('click', e => { e.preventDefault(); togglePop(project); });
    // Anchor mark: a small dot on the object and a thin line to the label, so it is clear which label belongs to which object.
    const SVGNS = 'http://www.w3.org/2000/svg', deco = document.createElementNS(SVGNS, 'svg');
    deco.setAttribute('class', 'spot-deco'); deco.setAttribute('aria-hidden', 'true'); deco.setAttribute('focusable', 'false');
    const link = document.createElementNS(SVGNS, 'line'), dot = document.createElementNS(SVGNS, 'circle'); dot.setAttribute('r', '3');
    deco.append(link, dot);
    spotsEl.append(el);
    spots.push({ id, el, sp, above: sp.above, w: 0, h: 0, px: 0, py: 0, pos, deco, link, dot, mark: '' });
  }

  function labelSpots() {
    for (const s of spots) {
      s.el.textContent = t(curLang, `model.spots.${s.sp.key}`) || t(curLang, `model.inspections.${s.sp.key}.title`);
      if (!s.el.href && !s.sp.project) s.el.title = t(curLang, 'ui.soon');
      s.el.append(s.deco);
    }
  }
  labelSpots();

  // Keep picking and framing in the clear stage. Expand only the render camera
  // so pixels continue under the surrounding surfaces at the same scale.
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
  const renderCamera = camera.clone();
  const hero = stage.closest('.hero');
  const column = stage.parentElement;
  const panel = hero.querySelector('.panel');
  const EL = 0.54, AZ = -0.22, TAU = Math.PI * 2;         // overview: lower, slightly from the left
  // view = what is drawn (damped), goal = where it is heading. el is free all the way round (upside down included).
  const view = { az: 0, el: EL, dist: 30, t: new THREE.Vector3(0, 0.2, 0.3) };
  const goal = { az: 0, el: EL, dist: 30, t: view.t.clone() };
  const home = { az: 0, el: EL, dist: 30, t: view.t.clone() };   // the default pose for the current state
  const panOffset = new THREE.Vector3();
  let stageW = 1, stageH = 1, openId = null, hoverId = null;
  let objectFocus = null;
  const bookUI = createBookInteraction({
    stage, scene, camera, reduced, language: lang, markDirty,
    onReturn: () => { bookUI.close(false); if (objectFocus?.target?.bookId) restoreObjectView(); markDirty(); },
  });
  function buildRoomBookOrder() {
    const byRoom = {};
    const box = new THREE.Box3(), itemCenter = new THREE.Vector3();
    for (const room of ['about', 'writing']) {
      const items = [];
      for (const book of booksCatalog.books) {
        if (book.room !== room) continue;
        const mesh = bookUI.getMesh(book.id);
        if (!mesh) continue;
        mesh.updateWorldMatrix(true, false);
        box.setFromObject(mesh).getCenter(itemCenter);
        items.push({ id: book.id, minY: box.min.y, x: itemCenter.x });
      }
      items.sort((a, b) => b.minY - a.minY);
      const tiers = [];
      for (const item of items) {
        const tier = tiers.at(-1);
        if (!tier || tier.topY - item.minY > 0.18) tiers.push({ topY: item.minY, items: [item] });
        else tier.items.push(item);
      }
      byRoom[room] = tiers.flatMap(tier =>
        tier.items
          .sort((a, b) => (Math.abs(a.x - b.x) < 0.04 ? b.minY - a.minY : a.x - b.x))
          .map(item => item.id)
      );
    }
    return byRoom;
  }
  const roomBookOrder = buildRoomBookOrder();
  // Globe theme: the click that frames the globe creates the AudioContext (browser rule) and loads the player;
  // it plays as soon as it is loaded and stops when the view leaves the globe.
  let music = { state: 'idle', ctx: null, play: null, player: null };
  function armGlobeMusic() {
    if (music.state !== 'idle') return;
    let ctx = null;
    try { const AC = window.AudioContext || window.webkitAudioContext; ctx = AC ? new AC() : null; ctx?.resume?.(); } catch { ctx = null; }
    if (!ctx) return;
    music = { state: 'loading', ctx, play: null, player: null };
    const mine = music;
    musicLoader().then(play => { if (music === mine && mine.state === 'loading') { mine.play = play; startGlobeMusic(); } }).catch(() => { if (music === mine) stopGlobeMusic(); });
  }
  function stopGlobeMusic() {
    const m = music; music = { state: 'idle', ctx: null, play: null, player: null };
    globeFlight?.stop();
    markDirty();
    if (m.player) m.player.stop(); else { try { m.ctx?.close(); } catch { /* ignore */ } }
  }
  function startGlobeMusic() {
    const m = music; m.state = 'playing';
    globeFlight?.start(reduced);
    markDirty();
    m.player = m.play(m.ctx, () => {
      if (music === m) {
        music = { state: 'idle', ctx: null, play: null, player: null };
        globeFlight?.stop();
        markDirty();
      }
    });
  }
  // Warp flight sound: the AudioContext is created inside the click, the sounds are scheduled against the flight clock.
  let warpLoad = null, warpSound = null;
  const loadWarp = () => (warpLoad ??= warpLoader().catch(error => { warpLoad = null; throw error; }));
  function prepareWarpSound() {
    stopWarpSound();
    if (reduced) return null;
    let ctx = null;
    try { const AC = window.AudioContext || window.webkitAudioContext; ctx = AC ? new AC() : null; ctx?.resume?.(); } catch { ctx = null; }
    if (!ctx) return null;
    const ws = { ctx, play: null, player: null, t0: null };
    warpSound = ws;
    loadWarp().then(play => { ws.play = play; kickWarpSound(ws); }).catch(() => { if (warpSound === ws) stopWarpSound(); });
    return ws;
  }
  function beginWarpSound(ws) { if (!ws || warpSound !== ws) return; ws.t0 = performance.now(); kickWarpSound(ws); }
  function kickWarpSound(ws) { if (warpSound === ws && ws.play && ws.t0 !== null && !ws.player) ws.player = ws.play(ws.ctx, ws.t0); }
  function stopWarpSound() {
    const ws = warpSound; warpSound = null;
    if (!ws) return;
    if (ws.player) ws.player.stop(); else { try { ws.ctx.close(); } catch { /* ignore */ } }
  }
  function cancelWarp() { roomWarp?.cancel(); stopWarpSound(); }
  document.addEventListener?.('visibilitychange', () => { if (document.hidden && music.state !== 'idle') stopGlobeMusic(); if (document.hidden) stopWarpSound(); });
  let custom = false, zoom = 1, away = false;               // custom: the user turned, panned or zoomed away from the default
  const DMIN = 0.7;
  const near = (a, b) => b - TAU * Math.round((b - a) / TAU);   // angle equal to b that is closest to a
  const viewHistory = [];
  let restoringView = false, navigationGroup = null;
  const snapshot = () => ({ room: openId, az: goal.az, el: goal.el, zoom, custom, pan: panOffset.clone(), point: goal.t.clone(), dist: goal.dist });
  const samePose = (a, b) => a.room === b.room && Math.abs(a.az - b.az) < .001 && Math.abs(a.el - b.el) < .001 && Math.abs(a.dist - b.dist) < .001 && a.point.distanceToSquared(b.point) < .000001;
  function notifyBack() { onBackState?.(viewHistory.length > 0); }
  function rememberView(kind, continuous = false) {
    if (restoringView) return;
    const now = performance.now();
    if (continuous && navigationGroup?.continuous && now - navigationGroup.time < 650) { navigationGroup.time = now; return; }
    navigationGroup = { kind, continuous, time: now };
    const pose = snapshot();
    if (!viewHistory.length || !samePose(viewHistory.at(-1), pose)) viewHistory.push(pose);
    if (viewHistory.length > 60) viewHistory.shift();
    notifyBack();
  }
  function goBack() {
    navigationGroup = null;
    markDirty();
    if (roomWarp?.isActive()) { cancelWarp(); return true; }
    if (bookUI.isActive()) { bookUI.close(false); restoreObjectView(); return true; }
    if (albumLightbox && !albumLightbox.hidden) { closeAlbumPhoto(); return true; }
    if (albumOpen) { closeAlbumBook(true); return true; }
    if (!viewHistory.length) return false;
    const saved = viewHistory.pop();
    restoringView = true;
    try {
      closeAlbum(false); closePhoto(false); closePop(false); restoreObjectView(); egg.close();
      onViewBack?.(saved.room);
      openId = saved.room; custom = false; setGoal();
      custom = saved.custom; zoom = saved.zoom; panOffset.copy(saved.pan);
      goal.az = near(view.az, saved.az); goal.el = near(view.el, saved.el);
      goal.dist = Math.max(DMIN, home.dist * saved.zoom); goal.t.copy(home.t).add(saved.pan);
      if (reduced) { view.az = goal.az; view.el = goal.el; view.dist = goal.dist; view.t.copy(goal.t); }
      checkAway();
    } finally { restoringView = false; notifyBack(); }
    return true;
  }
  const clampTarget = v => {
    v.x = THREE.MathUtils.clamp(v.x, -14, 14);
    v.y = THREE.MathUtils.clamp(v.y, -6, 8);
    v.z = THREE.MathUtils.clamp(v.z, -14, 14);
    return v;
  };
  // Pan leash (D-089): the point the camera aims at may not leave the model, so the model can never be pushed out of view.
  // Overview: the base plate; a room: its floor plus a margin. Past the edge a pan meets growing resistance and springs
  // back when the gesture ends. Orbit and zoom stay free, and the cellar drift in aim() is applied on top.
  const LEASH = { margin: 0.35, soft: 0.6 };
  const overviewLeash = new THREE.Box3().setFromPoints(outline);
  overviewLeash.min.y = -0.8; overviewLeash.max.y += 0.4;
  const leashBox = new THREE.Box3(), leashSoftBox = new THREE.Box3();
  let leashPending = false;                                  // a soft pan may have left the box; settle when the gesture ends
  // The floor area shrinks by half the visible height around the target: from afar most of the model stays in the
  // picture, close up every corner can still be centred.
  function leash() {
    if (!openId) leashBox.copy(overviewLeash);
    else {
      const r = rooms[openId], m = LEASH.margin;
      leashBox.min.set(r.cx - r.w / 2 - m, -0.2, r.cz - r.d / 2 - m);
      leashBox.max.set(r.cx + r.w / 2 + m, r.h + m, r.cz + r.d / 2 + m);
    }
    const seen = 0.5 * goal.dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    for (const k of ['x', 'z']) {
      const mid = (leashBox.min[k] + leashBox.max[k]) / 2, half = (leashBox.max[k] - leashBox.min[k]) / 2;
      const keep = Math.max(half * 0.2, half - seen);
      leashBox.min[k] = mid - keep; leashBox.max[k] = mid + keep;
    }
    return leashBox;
  }

  function resize() {
    markDirty();
    const frame = stage.getBoundingClientRect(), region = hero.getBoundingClientRect();
    const w = frame.width, h = frame.height;
    if (!w || !h) return;

    const details = panel.hidden ? null : panel.getBoundingClientRect();
    const below = column.getBoundingClientRect().bottom;
    const left = region.left - frame.left;
    const top = Math.max(region.top - frame.top, -104);
    const bottom = Math.min(region.bottom, Math.max(below, details ? details.top + 104 : below) + 40);
    const width = Math.ceil(region.width), height = Math.ceil(bottom - frame.top - top);
    Object.assign(canvas.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });

    // Limit the extra raster area on high density and large screens.
    const density = Math.min(devicePixelRatio, 2, Math.sqrt(3_000_000 / (width * height)));
    if (renderer.getPixelRatio() !== density) renderer.setPixelRatio(density);
    renderer.setSize(width, height, false);
    renderCamera.setViewOffset(w, h, left, top, width, height);

    if (stageW !== w || stageH !== h) {
      stageW = w; stageH = h; camera.aspect = w / h; camera.updateProjectionMatrix();
      setGoal();
      if (objectFocus) {
        objectFocus.dist = Math.max(DMIN, home.dist * objectFocus.zoom);
        objectFocus.point.copy(home.t).add(objectFocus.pan);
      }
    }
    if (objectFocus) focusObject(objectFocus.target, false);
  }
  // Camera distance at which all points fit into [leftNdc, rightNdc] x [-below, above] (NDC), seen from azimuth az.
  const fwd = new THREE.Vector3(), rgt = new THREE.Vector3(), upv = new THREE.Vector3(), dv = new THREE.Vector3();
  function fitView(pts, t, az, leftNdc, rightNdc, above, below) {
    fwd.set(-Math.cos(EL) * Math.sin(az), -Math.sin(EL), -Math.cos(EL) * Math.cos(az));
    rgt.set(Math.cos(az), 0, -Math.sin(az)); upv.crossVectors(rgt, fwd);
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), th = tv * camera.aspect;
    const halfW = (rightNdc - leftNdc) / 2, cxNdc = (leftNdc + rightNdc) / 2;
    let dist = 1;
    for (let it = 0; it < 4; it++) {
      dist = 1;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of pts) {
        dv.copy(p).sub(t);
        const x = dv.dot(rgt), y = dv.dot(upv), f = dv.dot(fwd);
        dist = Math.max(dist, Math.abs(x) / (halfW * th) - f, (y >= 0 ? y / (above * tv) : -y / (below * tv)) - f);
      }
      for (const p of pts) {
        dv.copy(p).sub(t);
        const dp = dist + dv.dot(fwd), x = dv.dot(rgt) / (dp * th), y = dv.dot(upv) / (dp * tv);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      t.addScaledVector(rgt, ((x0 + x1) / 2 - cxNdc) * dist * th).addScaledVector(upv, ((y0 + y1) / 2 - (above - below) / 2) * dist * tv);
    }
    return dist;
  }
  const roomPts = {};
  for (const r of Object.values(rooms)) {
    roomPts[r.id] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [0, r.h])
      roomPts[r.id].push(new THREE.Vector3(r.cx + sx * r.w / 2, y, r.cz + sz * r.d / 2));
  }
  function setGoal() {
    markDirty();
    if (openId) {
      const room = rooms[openId];
      home.t.copy(room.center);
      home.az = -room.x * 0.32;
      home.dist = fitView(roomPts[openId], home.t, home.az, -0.94, 0.94, 0.83, 0.90);
    } else {
      home.t.copy(center);
      home.az = AZ;
      home.dist = fitView(outline, home.t, home.az, -0.96, 0.96, 0.94, 0.94);
    }
    if (!custom) { panOffset.set(0, 0, 0); goal.az = near(view.az, home.az); goal.el = near(view.el, EL); goal.dist = home.dist; zoom = 1; }
    else goal.dist = Math.max(DMIN, home.dist * zoom);
    aim(); checkAway();
  }
  // Zoomed in on the underside, the orbit centre drifts to the middle of the recess, so the close view stays on it.
  function aim() {
    // Overview only: zoomed in close to an object in a room (Enterprise, books) a turn below the floor must not jump to the fax.
    const w = custom && !openId ? THREE.MathUtils.clamp((0.6 - zoom) / 0.3, 0, 1) * THREE.MathUtils.clamp(-Math.sin(goal.el) * 3, 0, 1) : 0;
    goal.t.copy(home.t).add(panOffset).lerp(cellar.center, w);
    clampTarget(goal.t);
  }
  function checkAway() {
    onZoom?.(zoom);
    const panned = panOffset.lengthSq() > 0.002;
    const a = custom && (panned || Math.abs(near(goal.az, home.az) - goal.az) > 0.03 || Math.abs(near(goal.el, EL) - goal.el) > 0.03 || Math.abs(zoom - 1) > 0.03);
    if (a !== away) { away = a; onAway?.(a); }
  }
  function resetView() {
    markDirty();
    cancelWarp();
    rememberView('reset'); bookUI.close(true); closeAlbum(false); closePop(false); restoreObjectView(); custom = false; zoom = 1; panOffset.set(0, 0, 0); egg.close(); closePhoto(false); setGoal();
    if (reduced) { view.az = goal.az; view.el = goal.el; view.dist = goal.dist; view.t.copy(goal.t); }
  }
  // Turning: signs are for a drag; when the model is upside down (cos el < 0) the horizontal sense is mirrored.
  function wrap() {
    for (const k of ['az', 'el']) while (Math.abs(goal[k]) > Math.PI) { const d = goal[k] > 0 ? -TAU : TAU; goal[k] += d; view[k] += d; }
  }
  // Room tilt limit (D-112): in a room the camera stays above the floor and does not tip over the top. Past the limit a
  // drag meets growing resistance (at most TILT.soft beyond it) and springs back on release; keyboard turns stop at it.
  // The overview keeps free rotation (D-024) so the cellar can still be found.
  const TILT = { min: 0.15, max: 1.45, soft: 0.12 };
  const normEl = a => a - TAU * Math.round(a / TAU);
  function roomTilt(dEl, soft) {
    const el = normEl(goal.el);
    if (!soft) return THREE.MathUtils.clamp(el + dEl, TILT.min, TILT.max) - el;
    const over = dEl < 0 ? TILT.min - el : dEl > 0 ? el - TILT.max : 0;   // already past the limit, in the direction of travel
    if (over > 0) dEl /= (1 + over / TILT.soft) ** 2;
    leashPending = true;
    return THREE.MathUtils.clamp(el + dEl, TILT.min - TILT.soft, TILT.max + TILT.soft) - el;
  }
  function orbit(dAz, dEl, instant, soft = true) {
    markDirty();
    rememberView('orbit', true);
    if (openId) dEl = roomTilt(dEl, soft);
    const s = Math.cos(instant ? view.el : goal.el) >= 0 ? 1 : -1;
    goal.az -= dAz * s; goal.el += dEl;
    if (instant) { view.az -= dAz * s; view.el += dEl; }
    custom = true; wrap(); aim(); checkAway();
  }
  const panRgt = new THREE.Vector3(), panUp = new THREE.Vector3(), panNext = new THREE.Vector3(), panStep = new THREE.Vector3();
  // soft: drag, pinch and trackpad (rubber band, settled by settleLeash); hard: keyboard steps stop at the edge.
  function panBy(dxPx, dyPx, instant, soft = true) {
    markDirty();
    rememberView('pan', true);
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const scale = (instant ? view.dist : goal.dist) * (2 * tv) / Math.max(stageH, 1);
    panRgt.set(1, 0, 0).applyQuaternion(camera.quaternion);
    panUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    panStep.set(0, 0, 0).addScaledVector(panRgt, -dxPx * scale).addScaledVector(panUp, dyPx * scale);
    panNext.copy(home.t).add(panOffset);
    const box = leash();
    if (soft) {
      for (const k of ['x', 'y', 'z']) {
        const d = panStep[k];
        const over = d > 0 ? panNext[k] - box.max[k] : d < 0 ? box.min[k] - panNext[k] : 0;   // already past the edge, in the direction of travel
        if (over > 0) panStep[k] /= (1 + over / LEASH.soft) ** 2;
      }
      panNext.add(panStep);
      leashSoftBox.copy(box).expandByScalar(LEASH.soft);
      panNext.clamp(leashSoftBox.min, leashSoftBox.max);
      leashPending = true;
    } else panNext.add(panStep).clamp(box.min, box.max);
    clampTarget(panNext);
    panOffset.copy(panNext).sub(home.t);
    custom = true; aim();
    if (instant) view.t.copy(goal.t);
    checkAway();
  }
  // End of a soft pan or room turn: glide back inside the leash and the room tilt limit (jump under reduced motion). No history step of its own.
  let leashTimer = null;
  function settleLeash() {
    clearTimeout(leashTimer); leashTimer = null;
    if (!leashPending) return;
    leashPending = false;
    let moved = false;
    if (openId) {
      const el = normEl(goal.el), kept = THREE.MathUtils.clamp(el, TILT.min, TILT.max);
      if (kept !== el) { goal.el += kept - el; if (reduced) view.el = goal.el; moved = true; }
    }
    panNext.copy(home.t).add(panOffset);
    const box = leash();
    if (!box.containsPoint(panNext)) { panNext.clamp(box.min, box.max); panOffset.copy(panNext).sub(home.t); moved = true; }
    if (!moved) return;
    markDirty(); aim();
    if (reduced) view.t.copy(goal.t);
    checkAway();
  }
  function zoomBy(f, instant) {
    markDirty();
    rememberView('zoom', true);
    zoom = Math.max(DMIN / home.dist, clampZoom(zoom * f)); custom = true;
    goal.dist = Math.max(DMIN, home.dist * zoom);
    if (instant) view.dist = goal.dist;
    aim(); checkAway();
  }
  // Framing for the fax machine and for its sheet: fixed boxes with the sheet fully out, so the close-up does not change while it prints.
  const cornersOf = objects => {
    const box = new THREE.Box3();
    for (const object of objects) { object.updateWorldMatrix(true, true); box.expandByObject(object); }
    const out = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) out.push([x, y, z]);
    return out;
  };
  const egg = createEgg({ cellar, camera, reduced, onDone: () => { if (objectFocus?.target === faxTarget) focusObject(sheetTarget, false); } });
  cellar.feed(1);
  const faxCorners = cornersOf(cellar.frame), sheetCorners = cornersOf([cellar.sheet]);
  cellar.feed(0);
  // Seen from below and past the pole (el < -90 degrees), so the machine, which hangs from the ceiling of the recess, reads upright.
  // The sheet is framed face-on once it is out, so the text and the button can be read and clicked.
  const faxTarget = { id: 'cellar:fax', room: null, key: 'fax', objects: cellar.pick, az: 0, el: -Math.PI / 2 - 0.5, margin: 1.05, captionHeight: 0, getCorners: () => faxCorners };
  const sheetTarget = { id: 'cellar:sheet', room: null, key: 'fax-sheet', objects: [cellar.sheet], az: 0, el: -Math.PI / 2 - 0.26, margin: 1.08, captionHeight: 0, getCorners: () => sheetCorners };
  // First click on the machine zooms in like on the objects in the rooms, the next one starts the fax and, when the sheet is out,
  // the view moves on to the sheet. The button on the sheet opens LinkedIn.
  function eggClick(kind) {
    if (kind === 'button') { egg.send(); return; }
    if (egg.isOpen && !egg.isAnimating) { if (objectFocus?.target !== sheetTarget) focusFax(sheetTarget); return; }
    if (objectFocus?.target === faxTarget) { egg.play(); return; }
    focusFax(faxTarget);
  }
  function focusFax(target) {
    if (!objectFocus) {
      closeAlbum(false); closePhoto(false); closePop(false);
      rememberView('inspect');
      stage.classList.add('object-focused');
    }
    focusObject(target);
  }
  const allPhotoPicks = [...(photo?.pick ?? []), ...(speakingPhoto?.pick ?? [])];
  const photoParts = new Set(allPhotoPicks), photoThings = [...allPhotoPicks, ...occluders];
  const photoRay = new THREE.Raycaster(), pv = new THREE.Vector3(), pDir = new THREE.Vector3();
  let pCard = null, pImg = null, pCap = null, pClose = null, pOpen = false, pTimer = null;
  let currentPhotoKey = 'photo';
  let autoCardTimer = null;
  const stopAutoCard = () => { clearTimeout(autoCardTimer); autoCardTimer = null; };
  const startAutoCard = fn => { stopAutoCard(); autoCardTimer = setTimeout(fn, 6000); };
  const photoHit = ndcPos => {
    photoRay.setFromCamera(ndcPos, camera);
    const h = photoRay.intersectObjects(photoThings, false)[0];
    if (!h) return null;
    if (photo && photo.pick.includes(h.object)) return 'photo';
    if (speakingPhoto && speakingPhoto.pick.includes(h.object)) return 'speaking';
    return null;
  };
  const labelPhoto = () => {
    if (!pCard) return;
    const isSpeaking = currentPhotoKey === 'speaking';
    const altKey = isSpeaking ? 'model.speakingPhoto.alt' : 'model.photo.alt';
    const capKey = isSpeaking ? 'model.speakingPhoto.caption' : 'model.photo.caption';
    const closeKey = isSpeaking ? 'model.speakingPhoto.close' : 'model.photo.close';
    pCard.setAttribute('aria-label', t(curLang, altKey));
    pImg.alt = t(curLang, altKey);
    pCap.textContent = t(curLang, capKey);
    pClose.setAttribute('aria-label', t(curLang, closeKey));
  };
  const closePhoto = (restoreFocus = false) => {
    if (!pCard || !pOpen) return;
    pOpen = false; pCard.classList.remove('on'); pCard.inert = true;
    stopAutoCard();
    clearTimeout(pTimer);
    const had = pCard.contains(document.activeElement);
    if (reduced) pCard.hidden = true;
    else pTimer = setTimeout(() => { if (!pOpen) pCard.hidden = true; }, 280);
    if (had || restoreFocus) stage.focus({ preventScroll: true });
  };
  const openPhoto = (photoKey = 'photo') => {
    currentPhotoKey = photoKey;
    closePop(false);
    closeAlbum(false);
    if (!pCard) {
      pCard = document.createElement('div'); pCard.className = 'photo-card'; pCard.setAttribute('role', 'region'); pCard.hidden = true;
      pImg = document.createElement('img'); pImg.decoding = 'async';
      pImg.addEventListener('click', () => closePhoto(true));
      pCap = document.createElement('p'); pCap.className = 'photo-caption';
      pClose = document.createElement('button'); pClose.type = 'button'; pClose.className = 'card-x'; pClose.textContent = '×';
      pClose.addEventListener('click', () => closePhoto(true));
      pCard.addEventListener('pointerenter', stopAutoCard);
      pCard.addEventListener('pointerleave', () => { if (pOpen) startAutoCard(() => closePhoto(false)); });
      pCard.append(pClose, pImg, pCap); stage.append(pCard);
    }
    const slotFile = photoKey === 'speaking' ? 'slots/writing-shelf-1.webp' : 'slots/about-wall-1.webp';
    pImg.src = `${import.meta.env.BASE_URL}${slotFile}`;
    labelPhoto();
    clearTimeout(pTimer); pOpen = true; pCard.hidden = false; pCard.inert = false; pCard.removeAttribute('aria-hidden');
    updatePhoto();
    void pCard.offsetWidth;
    pCard.classList.add('on');
    pClose.focus({ preventScroll: true });
    startAutoCard(() => closePhoto(false));
  };
  const togglePhoto = (photoKey = 'photo') => ((pOpen && currentPhotoKey === photoKey) ? closePhoto(true) : openPhoto(photoKey));
  function updatePhoto() {
    if (!pCard || pCard.hidden) return;
    const isSpeaking = currentPhotoKey === 'speaking';
    const targetRoom = isSpeaking ? 'writing' : 'about';
    const targetObj = isSpeaking ? speakingPhoto : photo;
    if (openId !== targetRoom || !targetObj) { closePhoto(false); return; }
    targetObj.anchor.getWorldPosition(pv);
    pDir.copy(pv).sub(camera.position).normalize(); photoRay.set(camera.position, pDir);
    const hit = photoRay.intersectObjects(photoThings, false)[0];
    const gone = !hit || !photoParts.has(hit.object);
    pCard.classList.toggle('away', gone);
    pCard.inert = gone;
    pCard.setAttribute('aria-hidden', String(gone));
  }

  // Compact project, social & story card at a fixed position (clicking image or text opens the link; top-right X closes).
  const projParts = new Set(projectPicks), projThings = [...projectPicks, ...occluders];
  const projRay = new THREE.Raycaster();
  const SOCIAL_PLAQUES = new Set(['substack', 'bluesky', 'linkedin']);
  const SOCIAL_CARDS = new Set(['signal', ...SOCIAL_PLAQUES]);
  const ABOUT_CARDS = new Set(['story', 'enterprise', ...SOCIAL_CARDS]);
  const popAllowed = (roomId, key) =>
    roomId === 'projects' || roomId === 'ai'
    || (roomId === 'writing' && SOCIAL_CARDS.has(key))
    || (roomId === 'about' && ABOUT_CARDS.has(key))
    || inspectionTargets.some(target => target.room === roomId && target.key === key);
  let popEl = null, popBody = null, popImg = null, popTitle = null, popText = null, popMore = null, popTimeline = null, popClose = null, shipActions = null;
  let popKey = null, popTimer = null;
  const projectOrder = ['wimmelbild', 'monitor', 'praxisfaden', 'hdrg', 'elbstrand'];
  const projectKeys = new Set(projectOrder);
  const substackOrder = substackData.articles.map(a => a.key);
  const soonBadge = document.createElement('div'); soonBadge.className = 'project-soon-badge';
  soonBadge.setAttribute('role', 'status'); soonBadge.hidden = true; stage.append(soonBadge);
  const badgePos = new THREE.Vector3(), badgeBox = new THREE.Box3();
  const engageGroup = document.createElement('div');
  engageGroup.className = 'ship-engage-group'; engageGroup.hidden = true;
  const engageBtn = document.createElement('button');
  engageBtn.type = 'button'; engageBtn.className = 'ship-engage-btn'; engageBtn.textContent = 'Engage';
  const exploreBtn = document.createElement('button');
  exploreBtn.type = 'button'; exploreBtn.className = 'ship-engage-btn'; exploreBtn.textContent = 'Explore';
  engageGroup.append(engageBtn, exploreBtn);
  stage.append(engageGroup);
  const engagePos = new THREE.Vector3();
  async function openShipInspector() {
    const { showEnterprise } = await import('./enterprise-inspector.js');
    return showEnterprise(enterpriseCopy[curLang], reduced, () => { triggerRoomWarp(); });
  }
  async function triggerRoomWarp() {
    if (reduced) { if (popText) popText.textContent = enterpriseCopy[curLang].reduced; return; }
    const ws = prepareWarpSound();   // still inside the click: browsers only allow audio that starts from a gesture
    try { await ensureEnterpriseGlb(); } catch (error) { if (warpSound === ws) stopWarpSound(); throw error; }
    closePop(false);
    restoreObjectView();
    // Stay inside the About Me room at normal room framing so the entire 180° curve & warp-in stay in view
    openId = 'about'; custom = false; zoom = 1; panOffset.set(0, 0, 0);
    setGoal();
    if (roomWarp?.engage(() => markDirty())) beginWarpSound(ws); else if (warpSound === ws) stopWarpSound();
    markDirty();
  }
  engageBtn.addEventListener('click', () => { triggerRoomWarp(); });
  exploreBtn.addEventListener('click', async () => {
    exploreBtn.disabled = true;
    try { await openShipInspector(); } finally { exploreBtn.disabled = false; }
  });
  function updateEngageBtn() {
    if (!enterprise?.engageAnchor || roomWarp?.isActive() || albumOpen) { engageGroup.hidden = true; return; }
    enterprise.engageAnchor.getWorldPosition(engagePos);
    const camDist = camera.position.distanceTo(engagePos);
    const closeZoom = popKey === 'enterprise' || (openId === 'about' && camDist < 2.8) || (!openId && camDist < 2.3);
    if (!closeZoom) { engageGroup.hidden = true; return; }
    const p = engagePos.clone().project(camera);
    if (p.z < -1 || p.z > 1) { engageGroup.hidden = true; return; }
    const x = (p.x * 0.5 + 0.5) * stageW;
    const y = (-p.y * 0.5 + 0.5) * stageH;
    if (x < 24 || x > stageW - 24 || y < 24 || y > stageH - 24) { engageGroup.hidden = true; return; }
    engageGroup.style.left = `${x}px`;
    engageGroup.style.top = `${y}px`;
    engageGroup.hidden = false;
  }
  function updateSoonBadge() {
    const data = t(curLang, `model.projectCards.${popKey}`);
    const target = openId === 'projects' && projectKeys.has(popKey) && !data?.href ? inspectionFor(popKey) : null;
    if (!target) { soonBadge.hidden = true; return; }
    const board = target.objects[0]; board.updateWorldMatrix(true, false);
    badgeBox.setFromObject(board).getCenter(badgePos); badgePos.project(camera);
    if (soonBadge.textContent !== 'Coming Soon') soonBadge.textContent = 'Coming Soon';
    soonBadge.hidden = badgePos.z >= 1 || Math.abs(badgePos.x) > 1 || Math.abs(badgePos.y) > 1;
    soonBadge.style.left = `${(badgePos.x * .5 + .5) * stageW}px`;
    soonBadge.style.top = `${(-badgePos.y * .5 + .5) * stageH}px`;
  }
  const projectHit = ndcPos => {
    projRay.setFromCamera(ndcPos, camera);
    const h = projRay.intersectObjects(projThings, false)[0];
    return h && projParts.has(h.object) ? h.object : null;
  };
  function drawCardFallback(title) {
    const c = document.createElement('canvas'); c.width = 400; c.height = 300;
    const k = c.getContext('2d');
    k.fillStyle = '#f7f0e2'; k.fillRect(0, 0, 400, 300);
    k.fillStyle = '#b9c7a6';
    k.beginPath(); k.moveTo(0, 300); k.bezierCurveTo(108, 170, 232, 258, 400, 189); k.lineTo(400, 300); k.fill();
    k.fillStyle = '#12383a'; k.textAlign = 'center'; k.textBaseline = 'middle';
    k.font = '600 42px Georgia, serif'; k.fillText(title, 200, 110, 360);
    return c.toDataURL();
  }
  function drawSocialEmblem(iconKey) {
    const c = document.createElement('canvas'); c.width = 400; c.height = 300;
    const k = c.getContext('2d');
    k.fillStyle = '#faf6ee'; k.fillRect(0, 0, 400, 300);
    k.fillStyle = '#efe6d4';
    k.beginPath(); k.arc(200, 145, 82, 0, Math.PI * 2); k.fill();
    k.save(); k.translate(134, 79); k.scale(5.5, 5.5);
    k.fillStyle = '#0f3d42'; k.fill(new Path2D(PATHS[iconKey]));
    k.restore();
    return c.toDataURL();
  }
  function fillPop() {
    if (!popEl || !popKey) return;
    const isShip = popKey === 'enterprise';
    const shipCopy = enterpriseCopy[curLang];
    shipActions.hidden = !isShip;
    labelShipAction(shipActions.children[0], shipCopy.inspect, 'inspect');
    labelShipAction(shipActions.children[1], shipCopy.warp, 'warp');
    popMore.hidden = popKey !== 'story';
    if (popKey === 'story') {
      const title = t(curLang, 'model.spots.story');
      popEl.setAttribute('aria-label', title);
      popClose.setAttribute('aria-label', t(curLang, 'ui.close'));
      popImg.hidden = true; popImg.removeAttribute('src');
      popTitle.textContent = title;
      popText.textContent = t(curLang, 'model.storyCard.text');
      popMore.textContent = t(curLang, 'rooms.about.more') + ' →';
      popTimeline.hidden = true;
      popBody.href = '#leadership-deepdive';
      popBody.dataset.openLeadership = '';
      return;
    }
    delete popBody.dataset.openLeadership;
    const sub = substackByKey.get(popKey);
    const data = t(curLang, `model.projectCards.${popKey}`) || t(curLang, `model.inspections.${popKey}`)
      || (sub && { title: sub.title, text: curLang === 'de' ? 'Den Artikel auf MedTech Signal lesen.' : 'Read the article on MedTech Signal.', href: sub.href });
    if (!data) return;
    popEl.setAttribute('aria-label', data.title);
    popClose.setAttribute('aria-label', t(curLang, 'ui.close'));
    popTitle.textContent = isShip ? 'NCC-1701' : data.title;
    popText.textContent = isShip ? shipCopy.tos : data.text;
    popTimeline.replaceChildren();
    popTimeline.hidden = !Array.isArray(data.timeline);
    for (const entry of data.timeline || []) {
      const row = document.createElement('li');
      const year = document.createElement('span'); year.className = 'pop-timeline-year'; year.textContent = entry.year;
      const label = document.createElement('span'); label.textContent = entry.label;
      row.append(year, label); popTimeline.append(row);
    }
    if (data.timeline || inspectionFor(popKey)) {
      popImg.hidden = true;
      popImg.removeAttribute('src');
    } else if (data.icon && PATHS[data.icon]) {
      popImg.hidden = false;
      popImg.alt = data.title;
      popImg.onerror = null;
      popImg.src = drawSocialEmblem(data.icon);
    } else if (data.img) {
      popImg.hidden = false;
      popImg.alt = data.title;
      popImg.onerror = () => { popImg.onerror = null; popImg.src = drawCardFallback(data.title); };
      popImg.src = `${import.meta.env.BASE_URL}${data.img}`;
    } else {
      popImg.hidden = true;
      popImg.removeAttribute('src');
    }
    if (data.href) popBody.href = data.href;
    else popBody.removeAttribute('href');
  }
  // The same inspection path serves furniture, projects and the miniatures.
  function inspectionFor(key) {
    const exact = inspectionTargets.find(target => target.room === openId && target.key === key);
    if (exact) return exact;
    const alias = openId === 'ai' && key === 'monitor' ? 'practiceDesk'
      : openId === 'about' && key === 'story' ? 'studyDesk' : null;
    if (alias) return inspectionTargets.find(target => target.room === openId && target.key === alias);
    if (openId === 'about') {
      const objects = trophyPicks.filter(object => object.userData.project === key);
      if (objects.length) {
        const miniature = objects[0].userData.miniature;
        return { id: `about:${key}`, room: 'about', key, objects: miniature ? [miniature] : objects, az: -0.20, el: 0.32 };
      }
    }
    return null;
  }
  function focusObject(target, save = true) {
    markDirty();
    if (save && !objectFocus) objectFocus = { target, custom, zoom, pan: panOffset.clone(), az: goal.az, el: goal.el, dist: goal.dist, point: goal.t.clone() };
    if (objectFocus) objectFocus.target = target;
    let poseArgs;
    if (target.getCorners) {
      poseArgs = {
        corners: target.getCorners(),
        az: target.az,
        el: target.el,
        fov: camera.fov,
        width: stageW,
        height: stageH,
        captionHeight: typeof target.captionHeight === 'function' ? target.captionHeight() : (target.captionHeight ?? 0),
        margin: target.margin ?? 1.06,
      };
    } else {
      const bounds = new THREE.Box3();
      for (const object of target.objects) { object.updateWorldMatrix(true, true); bounds.expandByObject(object); }
      poseArgs = {
        min: bounds.min.toArray(),
        max: bounds.max.toArray(),
        az: target.az,
        el: target.el,
        fov: camera.fov,
        width: stageW,
        height: stageH,
        captionHeight: typeof target.captionHeight === 'function' ? target.captionHeight() : (target.album ? (albumHudEl?.offsetHeight || 56) : (popEl?.offsetHeight || 0)),
        margin: target.margin ?? 1.08,
      };
    }
    const pose = inspectionPose(poseArgs);
    panOffset.fromArray(pose.target).sub(home.t); custom = true; zoom = pose.distance / home.dist;
    goal.az = near(view.az, target.az); goal.el = near(view.el, target.el); goal.dist = pose.distance; goal.t.fromArray(pose.target);
    if (reduced) { view.az = goal.az; view.el = goal.el; view.dist = goal.dist; view.t.copy(goal.t); }
    checkAway();
  }
  function restoreObjectView() {
    if (!objectFocus) return;
    const saved = objectFocus; objectFocus = null;
    if (saved.target?.key === 'globe') stopGlobeMusic();
    stage.classList.remove('object-focused', 'ship-focused'); custom = saved.custom; zoom = saved.zoom; panOffset.copy(saved.pan);
    goal.az = near(view.az, saved.az); goal.el = near(view.el, saved.el); goal.dist = saved.dist; goal.t.copy(saved.point);
    if (!restoringView) while (viewHistory.length && samePose(viewHistory.at(-1), snapshot())) viewHistory.pop();
    notifyBack(); checkAway();
  }
  function closePop(restoreFocus = false) {
    if (!popEl || !popKey) return;
    restoreObjectView();
    popKey = null; soonBadge.hidden = true; popEl.classList.remove('on'); popEl.inert = true;
    stopAutoCard();
    clearTimeout(popTimer);
    const had = popEl.contains(document.activeElement);
    if (reduced) popEl.hidden = true;
    else popTimer = setTimeout(() => { if (!popKey) popEl.hidden = true; }, 260);
    if (had || restoreFocus) stage.focus({ preventScroll: true });
  }
  function openPop(key, { replace = false } = {}) {
    if (!replace) rememberView('object');
    closePhoto(false);
    closeAlbum(false);
    if (!inspectionFor(key)) restoreObjectView();
    if (!popEl) {
      popEl = document.createElement('div'); popEl.className = 'pop-card'; popEl.setAttribute('role', 'region'); popEl.hidden = true;
      popClose = document.createElement('button'); popClose.type = 'button'; popClose.className = 'card-x'; popClose.textContent = '×';
      popClose.addEventListener('click', () => closePop(true));
      popBody = document.createElement('a'); popBody.className = 'pop-body'; popBody.rel = 'noopener';
      popImg = document.createElement('img'); popImg.className = 'pop-img'; popImg.decoding = 'async';
      popTitle = document.createElement('h3'); popTitle.className = 'pop-title';
      popText = document.createElement('p'); popText.className = 'pop-text';
      popMore = document.createElement('span'); popMore.className = 'pop-more'; popMore.hidden = true;
      popTimeline = document.createElement('ol'); popTimeline.className = 'pop-timeline'; popTimeline.hidden = true;
      popEl.addEventListener('pointerenter', stopAutoCard);
      popEl.addEventListener('pointerleave', () => { if (popKey && !objectFocus && !['rack', 'enterprise'].includes(popKey)) startAutoCard(() => closePop(false)); });
      popBody.append(popImg, popTitle, popText, popMore, popTimeline);
      shipActions = document.createElement('div'); shipActions.className = 'ship-actions'; shipActions.hidden = true;
      for (const launch of [false, true]) {
        const action = document.createElement('button'); action.type = 'button';
        action.addEventListener('click', async () => {
          const key = popKey; action.disabled = true;
          try {
            if (launch) {
              await triggerRoomWarp();
            } else {
              const { showEnterprise } = await import('./enterprise-inspector.js');
              if (popKey === key && !showEnterprise(enterpriseCopy[curLang], reduced, () => { triggerRoomWarp(); })) popText.textContent = enterpriseCopy[curLang].error;
            }
          } catch { popText.textContent = enterpriseCopy[curLang].error; }
          finally { action.disabled = false; }
        });
        shipActions.append(action);
      }
      popEl.append(popClose, popBody, shipActions);
      stage.append(popEl);
      observer.observe(popEl);
    }
    clearTimeout(popTimer);
    stopAutoCard();
    popKey = key;
    if (key === 'enterprise') { ensureEnterpriseGlb(); if (!reduced) loadWarp().catch(() => {}); }
    popEl.classList.toggle('rack-card', key === 'rack');
    popEl.classList.toggle('ship-card', key === 'enterprise');
    popEl.classList.toggle('inspection-card', Boolean(inspectionFor(key)));
    fillPop();
    const project = t(curLang, `model.projectCards.${key}`);
    popEl.classList.toggle('project-link', projectKeys.has(key) && Boolean(project?.href));
    popEl.hidden = false;
    popEl.inert = false;
    updatePop();
    void popEl.offsetWidth;
    popEl.classList.add('on');
    const target = inspectionFor(key);
    if (target) { stage.classList.add('object-focused'); focusObject(target, !replace); }
    updateSoonBadge();
    popClose.focus({ preventScroll: true });
    if (!objectFocus && !['rack', 'enterprise'].includes(key)) startAutoCard(() => closePop(false));
  }
  function extractCurrentBook(useGoalPose = false) {
    let viewPose = null;
    if (useGoalPose) {
      const ce = Math.cos(goal.el), se = Math.sin(goal.el), sa = Math.sin(goal.az), ca = Math.cos(goal.az);
      viewPose = {
        eye: new THREE.Vector3(
          goal.t.x + goal.dist * ce * sa,
          goal.t.y + goal.dist * se,
          goal.t.z + goal.dist * ce * ca,
        ),
        up: new THREE.Vector3(-se * sa, ce, -se * ca).normalize(),
      };
    }
    if (!bookUI.extract(viewPose)) return false;
    // Reframe the extracted book rather than the old shelf slot. A little
    // breathing room is essential: at the original close-up distance the
    // cover could be clipped by the camera or remain behind the cabinet.
    const presentation = bookUI.getPresentationPoint();
    if (presentation) {
      const screenUp = viewPose ? viewPose.up : new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      goal.t.copy(presentation).addScaledVector(screenUp, -0.09);
      goal.dist = Math.max(goal.dist, 1.28);
      custom = true;
      zoom = clampZoom(goal.dist / home.dist);
      panOffset.copy(goal.t).sub(home.t);
      if (reduced) {
        view.az = goal.az; view.el = goal.el;
        view.dist = goal.dist; view.t.copy(goal.t);
      }
      checkAway();
    }
    return true;
  }
  function tapShelfBook(id) {
    const mesh = bookUI.getMesh(id);
    if (!mesh) return;
    if (bookUI.isFocused(id)) {
      if (bookUI.isExtracted()) bookUI.nextFace();
      else extractCurrentBook(false);
      markDirty();
      return;
    }
    bookUI.close(true);
    if (objectFocus) restoreObjectView();
    closeAlbum(false); closePhoto(false); closePop(false);
    rememberView('book');
    bookUI.start(id);
    stage.classList.add('object-focused');
    focusObject({
      id: `book:${id}`, key: `book:${id}`, bookId: id, room: openId,
      objects: [mesh], az: goal.az, el: Math.max(.25, Math.min(.75, goal.el)),
      margin: 1.16, captionHeight: 0,
    });
  }
  const substackByKey = new Map(substackData.articles.map(a => [a.key, a]));
  function stepFocusedItem(dir) {
    if (!openId) return false;
    const clearHover = () => { hoverTarget = null; hoverTip.hidden = true; };
    const focusedKey = objectFocus?.target?.key;
    if (openId === 'writing' && substackByKey.has(focusedKey)) {
      const idx = substackOrder.indexOf(focusedKey);
      const nextKey = substackOrder[(idx + dir + substackOrder.length) % substackOrder.length];
      const nextTarget = inspectionFor(nextKey);
      if (!nextTarget) return false;
      clearHover();
      focusObject(nextTarget, false);
      return true;
    }
    if (openId === 'projects' && projectKeys.has(popKey)) {
      const idx = projectOrder.indexOf(popKey);
      const nextKey = projectOrder[(idx + dir + projectOrder.length) % projectOrder.length];
      clearHover();
      openPop(nextKey, { replace: true });
      return true;
    }
    const books = roomBookOrder[openId];
    if (bookUI.isActive() && books?.includes(bookUI.activeId)) {
      const idx = books.indexOf(bookUI.activeId);
      const nextId = books[(idx + dir + books.length) % books.length];
      const mesh = bookUI.getMesh(nextId);
      if (!mesh) return false;
      const wasExtracted = bookUI.isExtracted();
      const az = objectFocus?.target?.az ?? goal.az;
      const el = objectFocus?.target?.el ?? Math.max(.25, Math.min(.75, goal.el));
      clearHover();
      bookUI.close(true);
      bookUI.start(nextId);
      stage.classList.add('object-focused');
      focusObject({
        id: `book:${nextId}`, key: `book:${nextId}`, bookId: nextId, room: openId,
        objects: [mesh], az, el, margin: 1.16, captionHeight: 0,
      }, false);
      if (wasExtracted) extractCurrentBook(true);
      markDirty();
      return true;
    }
    return false;
  }
  function togglePop(key) {
    if (openId === 'writing' && (key === 'protein' || substackByKey.has(key))) {
      if (objectFocus?.target?.key === key) {
        if (substackByKey.has(key)) openExternal(substackByKey.get(key).href);
        else if (!popKey) openPop(key);
        else closePop(true);
      } else {
        closePop(false); closePhoto(false); closeAlbum(false);
        if (objectFocus) restoreObjectView();
        rememberView('object');
        stage.classList.add('object-focused');
        focusObject(inspectionFor(key));
      }
      return;
    }
    // The Writing room's MedTech Signal document opens its destination on a
    // second deliberate click after inspection, just like a project object.
    if (popKey === key && (projectKeys.has(key) || (openId === 'writing' && key === 'signal'))) {
      const data = t(curLang, `model.projectCards.${key}`);
      if (data?.href) openExternal(data.href);
      else updateSoonBadge();
    } else if (popKey === key && SOCIAL_PLAQUES.has(key)) {
      const data = t(curLang, `model.projectCards.${key}`);
      if (data?.href) openExternal(data.href, { background: true });
    } else if (popKey === key && key === 'globe') { if (music.state === 'idle') armGlobeMusic(); else stopGlobeMusic(); }
    else if (popKey === key) closePop(true);
    else openPop(key);
  }
  function updatePop() {
    if (!popEl || popEl.hidden || !popKey) return;
    if (!popAllowed(openId, popKey)) closePop(false);
  }
  const observer = new ResizeObserver(resize);
  for (const layout of [hero, stage, column, panel]) observer.observe(layout);
  resize();
  Object.assign(view, { az: goal.az, el: goal.el, dist: goal.dist }); view.t.copy(goal.t);

  // Social trophies and laptop ("My Story") inside About Me
  const trophyParts = new Set(trophyPicks), trophyThings = [...trophyPicks, ...occluders];
  function ensureEnterpriseGlb() {
    if (!enterprise) return Promise.resolve();
    return loadEnterpriseGlb(enterprise.root, { tagMesh: enterprise.tagMesh }).then(meshes => {
      if (!meshes.length) return;
      for (const m of meshes) {
        trophyParts.add(m);
        trophyThings.unshift(m);
      }
      markDirty();
    });
  }
  const trophyRay = new THREE.Raycaster();
  const trophyHit = ndcPos => {
    trophyRay.setFromCamera(ndcPos, camera);
    const h = trophyRay.intersectObjects(trophyThings, false)[0];
    return h && trophyParts.has(h.object) ? h.object.userData : null;
  };
  const storyParts = new Set(storyPicks), storyThings = [...storyPicks, ...occluders];
  const storyRay = new THREE.Raycaster();
  const storyHit = ndcPos => {
    storyRay.setFromCamera(ndcPos, camera);
    const h = storyRay.intersectObjects(storyThings, false)[0];
    return h && storyParts.has(h.object) ? h.object.userData.anchor : null;
  };

  // Interactive 3D Photo Album in About Me (D-039, D-074, D-075)
  const albumParts = new Set(albumPicks ?? []), albumThings = [...(albumPicks ?? []), ...occluders];
  const albumRay = new THREE.Raycaster();
  const albumHit = ndcPos => {
    albumRay.setFromCamera(ndcPos, camera);
    const h = albumRay.intersectObjects(albumThings, false)[0];
    return h && albumParts.has(h.object) ? h.object.userData : null;
  };
  let albumFramed = false, albumZoomSettled = false, albumOpen = false, albumOpenedAt = 0;   // stage gets .album-open while the book is open (touch-action none, see style.css)
  let albumHudEl = null, albumHudPrompt = null, albumHudNav = null, albumPromptTitle = null, albumPromptCloseBtn = null;
  let albumOpenBtn = null, albumPrevBtn = null, albumNextBtn = null, albumCounterEl = null, albumCloseBtn = null;
  let albumLightbox = null, albumLightboxClose = null, albumLightboxImage = null, albumLightboxCaption = null;
  let albumReturnFocus = null, albumPhotoFocus = null;

  const closedAlbumTarget = () => ({
    id: 'about:album',
    room: 'about',
    key: 'album',
    objects: albumPicks,
    az: -0.22,
    el: 0.86,
    album: true,
    captionHeight: () => (albumHudEl && !albumHudEl.hidden ? albumHudEl.offsetHeight : 56),
    margin: 1.08,
  });

  const openAlbumTarget = () => ({
    id: 'about:album:open',
    room: 'about',
    key: 'album',
    objects: albumPicks,
    getCorners: () => albumBook.getOpenCorners(),
    az: -0.22,
    el: 1.06,
    album: true,
    captionHeight: () => (albumHudEl && !albumHudEl.hidden ? albumHudEl.offsetHeight : 56),
    margin: 1.03,
  });

  function buildAlbumHud() {
    if (albumHudEl) return;
    albumHudEl = document.createElement('div');
    albumHudEl.className = 'album-hud';
    albumHudEl.setAttribute('role', 'region');
    albumHudEl.hidden = true;
    albumHudEl.addEventListener('pointerdown', e => e.stopPropagation?.());

    albumHudPrompt = document.createElement('div');
    albumHudPrompt.className = 'album-hud-row';
    albumPromptTitle = document.createElement('span');
    albumPromptTitle.className = 'album-hud-title';
    albumOpenBtn = document.createElement('button');
    albumOpenBtn.type = 'button';
    albumOpenBtn.className = 'album-btn album-open-btn';
    albumOpenBtn.addEventListener('click', e => {
      e.stopPropagation?.();
      if (albumFramed && albumZoomSettled && !albumOpen) openAlbumBook();
    });
    albumPromptCloseBtn = document.createElement('button');
    albumPromptCloseBtn.type = 'button';
    albumPromptCloseBtn.className = 'card-x album-hud-close';
    albumPromptCloseBtn.textContent = '×';
    albumPromptCloseBtn.addEventListener('click', e => {
      e.stopPropagation?.();
      closeAlbum(true);
    });
    albumHudPrompt.append(albumPromptTitle, albumOpenBtn, albumPromptCloseBtn);

    albumHudNav = document.createElement('div');
    albumHudNav.className = 'album-hud-row';
    albumPrevBtn = document.createElement('button');
    albumPrevBtn.type = 'button';
    albumPrevBtn.className = 'album-btn';
    albumPrevBtn.addEventListener('click', e => { e.stopPropagation?.(); albumBook?.prev(reduced); });
    albumCounterEl = document.createElement('span');
    albumCounterEl.className = 'album-counter';
    albumNextBtn = document.createElement('button');
    albumNextBtn.type = 'button';
    albumNextBtn.className = 'album-btn';
    albumNextBtn.addEventListener('click', e => { e.stopPropagation?.(); albumBook?.next(reduced); });
    albumCloseBtn = document.createElement('button');
    albumCloseBtn.type = 'button';
    albumCloseBtn.className = 'card-x album-hud-close';
    albumCloseBtn.textContent = '×';
    albumCloseBtn.addEventListener('click', e => {
      e.stopPropagation?.();
      closeAlbumBook(true);
    });
    albumHudNav.append(albumPrevBtn, albumCounterEl, albumNextBtn, albumCloseBtn);

    albumHudEl.append(albumHudPrompt, albumHudNav);
    stage.append(albumHudEl);

    albumLightbox = document.createElement('div');
    albumLightbox.className = 'album-lightbox';
    albumLightbox.setAttribute('role', 'dialog');
    albumLightbox.setAttribute('aria-modal', 'true');
    albumLightbox.hidden = true;
    albumLightbox.addEventListener('pointerdown', e => e.stopPropagation?.());
    const lightboxBackdrop = document.createElement('div');
    lightboxBackdrop.className = 'album-lightbox-backdrop';
    lightboxBackdrop.addEventListener('click', closeAlbumPhoto);
    const lightboxFigure = document.createElement('figure');
    lightboxFigure.className = 'album-lightbox-figure';
    albumLightboxImage = document.createElement('img');
    albumLightboxImage.className = 'album-lightbox-image';
    albumLightboxCaption = document.createElement('figcaption');
    albumLightboxCaption.className = 'album-lightbox-caption';
    albumLightboxClose = document.createElement('button');
    albumLightboxClose.type = 'button';
    albumLightboxClose.className = 'card-x album-lightbox-close';
    albumLightboxClose.textContent = '×';
    albumLightboxClose.addEventListener('click', closeAlbumPhoto);
    lightboxFigure.append(albumLightboxImage, albumLightboxCaption);
    albumLightbox.append(lightboxBackdrop, lightboxFigure, albumLightboxClose);
    stage.append(albumLightbox);
  }

  function updateAlbumHud(state = albumBook?.getState()) {
    if (!albumHudEl) return;
    const title = t(curLang, 'model.album.title');
    albumHudEl.setAttribute('aria-label', title);
    albumHudEl.hidden = !albumFramed && !albumOpen;
    albumHudPrompt.hidden = !albumFramed || albumOpen;
    albumHudNav.hidden = !albumOpen;

    if (!albumOpen && albumFramed) {
      albumPromptTitle.textContent = albumZoomSettled
        ? `${title} · ${t(curLang, 'model.album.tapToOpen')}`
        : title;
      albumOpenBtn.textContent = t(curLang, 'model.album.openBook');
      albumOpenBtn.hidden = !albumZoomSettled;
      albumPromptCloseBtn.setAttribute('aria-label', t(curLang, 'model.album.close'));
    } else if (albumOpen && state) {
      albumPrevBtn.textContent = `‹ ${t(curLang, 'model.album.prev')}`;
      albumNextBtn.textContent = `${t(curLang, 'model.album.next')} ›`;
      albumPrevBtn.disabled = !state.canPrev;
      albumNextBtn.disabled = !state.canNext;
      albumCounterEl.textContent = state.label;
      albumCloseBtn.setAttribute('aria-label', t(curLang, 'model.album.close'));
    }
  }

  albumBook?.setCallbacks({
    onStateChange: state => updateAlbumHud(state),
    onNeedRender: markDirty,
  });

  function openAlbumPhoto(photo, returnEl) {
    if (!albumOpen || performance.now() < albumOpenedAt) return;
    buildAlbumHud();
    albumPhotoFocus = returnEl || stage;
    albumLightboxImage.src = `${import.meta.env.BASE_URL}${photo.src}`;
    albumLightboxImage.alt = photo.title;
    albumLightboxCaption.textContent = `${photo.title} · ${photo.desc}`;
    albumLightbox.setAttribute('aria-label', `${t(curLang, 'model.album.openImage')}: ${photo.title}`);
    albumLightboxClose.setAttribute('aria-label', t(curLang, 'model.album.closeImage'));
    albumLightbox.hidden = false;
    albumLightboxClose.focus({ preventScroll: true });
    markDirty();
  }

  function closeAlbumPhoto() {
    if (!albumLightbox || albumLightbox.hidden) return;
    albumLightbox.hidden = true;
    (albumPhotoFocus?.isConnected ? albumPhotoFocus : stage).focus({ preventScroll: true });
    markDirty();
  }

  // Step 1: Frame the closed physical album first. Never open pages or photos on first click.
  function openAlbum() {
    if (albumFramed && albumZoomSettled && !albumOpen) {
      openAlbumBook();
      return;
    }
    if (albumFramed || albumOpen) return;
    rememberView('album');
    closePhoto(false); closePop(false);
    buildAlbumHud();
    albumLightbox.hidden = true;
    albumPhotoFocus = null;
    albumReturnFocus = document.activeElement;
    albumFramed = true;
    albumZoomSettled = Boolean(reduced);
    albumOpen = false; stage.classList.toggle('album-open', albumOpen);
    stage.classList.add('object-focused');
    updateAlbumHud();
    focusObject(closedAlbumTarget());
    markDirty();
  }

  // Step 2: Once framed, open the physical 3D book onto Page 1 instructions.
  function openAlbumBook() {
    if (!albumBook || albumOpen) return;
    buildAlbumHud();
    albumLightbox.hidden = true;
    albumPhotoFocus = null;
    albumFramed = true;
    albumZoomSettled = true;
    albumOpen = true; stage.classList.toggle('album-open', albumOpen);
    albumOpenedAt = performance.now() + 340;
    stage.classList.add('object-focused', 'album-open');
    albumBook.open(reduced);
    updateAlbumHud();
    focusObject(openAlbumTarget(), false);
    markDirty();
  }

  // Close open 3D book smoothly back to zoomed-in closed book view (for BACK while in book).
  function closeAlbumBook(restoreFocus = false) {
    if (!albumOpen) return;
    if (albumLightbox && !albumLightbox.hidden) albumLightbox.hidden = true;
    albumOpen = false; stage.classList.toggle('album-open', albumOpen);
    albumFramed = true;
    albumZoomSettled = true;
    stage.classList.remove('album-open');
    albumBook?.close(reduced);
    updateAlbumHud();
    focusObject(closedAlbumTarget(), false);
    if (restoreFocus) (albumOpenBtn?.isConnected && !albumOpenBtn.hidden ? albumOpenBtn : stage).focus({ preventScroll: true });
    markDirty();
  }

  // Leave album framing completely and restore pre-album camera view.
  function closeAlbum(restoreFocus = false) {
    const hadAny = albumFramed || albumOpen;
    albumFramed = false;
    albumZoomSettled = false;
    albumOpen = false; stage.classList.toggle('album-open', albumOpen);
    stage.classList.remove('album-open');
    if (albumLightbox && !albumLightbox.hidden) albumLightbox.hidden = true;
    albumBook?.close(true);
    if (albumHudEl) albumHudEl.hidden = true;
    if (hadAny && objectFocus?.target?.key === 'album') restoreObjectView();
    if (restoreFocus && hadAny) (albumReturnFocus?.isConnected ? albumReturnFocus : stage).focus({ preventScroll: true });
    markDirty();
  }

  function toggleAlbum() {
    if (albumOpen) closeAlbumBook(true);
    else if (albumFramed && albumZoomSettled) openAlbumBook();
    else if (albumFramed) return;
    else openAlbum();
  }

  // Pointer: drag turns the model freely, right/middle/Shift/Space-drag pans, two fingers (or wheel) zoom.
  // (or plays the hidden cellar machine). Touch rule: a one-finger drag that starts mostly vertical is left to the page scroll;
  // one that starts mostly horizontal locks as an orbit (azimuth and elevation); two fingers always orbit and pinch.
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const hits = Object.values(rooms).map(r => r.hit);
  const ndc = e => { const b = stage.getBoundingClientRect(); return ptr.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); };
  const pick = e => {
    ray.setFromCamera(ndc(e), camera);
    // The base and corridor floor hide rooms from below: the first thing the ray meets must be a room.
    const h = ray.intersectObjects([...hits, ...occluders], false)[0];
    return h?.object.userData.room ?? null;
  };
  const K = 0.0055, pts = new Map();
  let drag = null, spaceDown = false, panMode = false, hoverTarget = null;
  const hoverTip = document.createElement('div'); hoverTip.className = 'hover-tip'; hoverTip.hidden = true; stage.append(hoverTip);
  const hoverV = new THREE.Vector3();
  const targetByMesh = new Map();
  for (const target of inspectionTargets) for (const mesh of target.meshes) targetByMesh.set(mesh, target);
  const objectParts = new Map();
  for (const object of [...projectPicks, ...trophyPicks]) objectParts.set(object, { key: object.userData.project, type: 'card', anchor: object.userData.anchor });
  for (const object of storyPicks) objectParts.set(object, { key: 'story', type: 'card', anchor: object.userData.anchor });
  for (const object of albumPicks) objectParts.set(object, { key: 'album', type: 'album', anchor: object.userData.anchor });
  for (const object of photo?.pick || []) objectParts.set(object, { key: 'photo', type: 'photo', anchor: photo.anchor });
  for (const object of speakingPhoto?.pick || []) objectParts.set(object, { key: 'speaking', type: 'photo', anchor: speakingPhoto.anchor });
  // Book meshes take precedence over their containing furniture-inspection surfaces.
  scene.traverse(object => {
    if (object.isMesh && object.userData.bookId) objectParts.set(object, {
      key: object.userData.bookId, type: 'book', anchor: object, customLabel: object.userData.bookTitle,
    });
  });
  const surfaceMeshes = [];
  scene.traverse(object => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    // Glass stays rendered, but does not intercept an object behind the pane.
    if (materials.some(material => material.visible && !(material.transparent && material.opacity < 0.85))) surfaceMeshes.push(object);
  });
  const objectRay = new THREE.Raycaster();
  const hoverObject = n => {
    objectRay.setFromCamera(n, camera);
    const hit = objectRay.intersectObjects(surfaceMeshes, false).find(hit => {
      let object = hit.object;
      while (object) { if (!object.visible) return false; object = object.parent; }
      return true;
    });
    if (!hit) return null;
    const target = targetByMesh.get(hit.object), action = objectParts.get(hit.object);
    if (!target && !action) return null;
    let parent = hit.object, room = target?.room;
    while (!room && parent) { room = Object.values(rooms).find(room => room.group === parent)?.id; parent = parent.parent; }
    return { ...(action || { key: target.key, type: 'card', anchor: target.objects[0] }), room };
  };
  function updateHoverTip() {
    if (!hoverTarget || drag || (albumLightbox && !albumLightbox.hidden)) { hoverTip.hidden = true; return; }
    if (substackByKey.has(hoverTarget.key)) { hoverTip.hidden = true; return; }
    let label = hoverTarget.customLabel;
    if (!label) {
      if (hoverTarget.type === 'album' && albumFramed && albumZoomSettled && !albumOpen) {
        label = t(curLang, 'model.album.openBook');
      } else {
        label = t(curLang, `model.spots.${hoverTarget.key}`) || t(curLang, `model.projectCards.${hoverTarget.key}.title`) || t(curLang, `model.inspections.${hoverTarget.key}.title`);
      }
    }
    if (!label || typeof label !== 'string') { hoverTip.hidden = true; return; }
    hoverTarget.anchor.getWorldPosition(hoverV);
    hoverV.project(camera);
    const tx = (hoverV.x * 0.5 + 0.5) * stageW;
    const ty = (-hoverV.y * 0.5 + 0.5) * stageH;
    hoverTip.textContent = label;
    hoverTip.style.left = `${Math.min(Math.max(tx, 64), stageW - 64)}px`;
    hoverTip.style.top = `${Math.max(40, ty - 14)}px`;
    hoverTip.hidden = false;
  }
  addEventListener('keydown', e => {
    if (albumOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (albumLightbox && !albumLightbox.hidden) closeAlbumPhoto();
        else closeAlbumBook(true);
        return;
      } else if (albumLightbox && !albumLightbox.hidden) {
        if (e.key === 'Tab') { e.preventDefault(); albumLightboxClose.focus(); }
        return;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        albumBook?.prev(reduced);
        return;
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        albumBook?.next(reduced);
        return;
      }
    } else if (albumFramed && albumZoomSettled && e.key === 'Enter' && e.target === stage) {
      e.preventDefault();
      openAlbumBook();
      return;
    }
    if (!e.defaultPrevented && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey
      && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      && !document.activeElement?.isContentEditable
      && !document.querySelector?.('dialog[open]')
      && stepFocusedItem(e.key === 'ArrowRight' ? 1 : -1)) {
      e.preventDefault();
      return;
    }
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      spaceDown = true;
      if (e.target === stage) e.preventDefault();
    }
  });
  addEventListener('keyup', e => { if (e.code === 'Space') spaceDown = false; });
  const pinchState = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  stage.addEventListener('contextmenu', e => { if (e.target === stage) e.preventDefault(); });
  const bookActionAt = ndcPos => {
    if (!albumBook || !albumOpen) return null;
    objectRay.setFromCamera(ndcPos, camera);
    return albumBook.hitAction(objectRay);
  };
  stage.addEventListener('pointerdown', e => {
    if (e.target !== stage) return;
    if (e.pointerType === 'mouse' && ![0, 1, 2].includes(e.button)) return;
    hoverTip.hidden = true;
    markDirty();
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { stage.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (pts.size === 1) {
      if (albumOpen && (!albumLightbox || albumLightbox.hidden) && (e.pointerType !== 'mouse' || e.button === 0)) {
        const bHit = bookActionAt(ndc(e));
        if (bHit) {
          albumBook.startDrag();
          drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, btn: e.button, mode: 'bookFlip', vx: 0, lastT: performance.now() };
          stage.style.cursor = 'grabbing';
          return;
        }
      }
      const pan = panMode || (e.pointerType === 'mouse' && (e.button === 2 || e.button === 1 || e.shiftKey || e.ctrlKey || e.altKey || spaceDown));
      drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, btn: e.button, mode: pan ? 'pan' : e.pointerType === 'touch' ? 'pending' : 'orbit' };
    } else if (pts.size === 2 && drag) {
      if (drag.mode === 'bookFlip') { albumBook.endDrag(0); }
      drag.moved = true; drag.mode = 'pinch'; drag.p = pinchState();
    }
    stage.style.cursor = drag?.mode === 'pan' ? 'move' : 'grabbing';
  });
  addEventListener('pointermove', e => {
    if (drag && pts.has(e.pointerId)) {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (drag.mode === 'pinch') {
        if (pts.size < 2) return;
        const n = pinchState();
        zoomBy(drag.p.d / n.d, true); panBy(n.x - drag.p.x, n.y - drag.p.y, true);
        drag.p = n; return;
      }
      const slop = e.pointerType === 'touch' ? 10 : 5;   // a finger tap always slides a little
      if (!drag.moved && Math.abs(e.clientX - drag.sx) <= slop && Math.abs(e.clientY - drag.sy) <= slop) return;
      drag.moved = true;
      if (drag.mode === 'bookFlip') {
        const nowT = performance.now();
        const dtMs = Math.max(1, nowT - (drag.lastT || nowT));
        const dx = e.clientX - drag.x;
        drag.vx = dx / dtMs;
        drag.lastT = nowT;
        drag.x = e.clientX; drag.y = e.clientY;
        albumBook?.moveDrag(dx, stageW);
        return;
      }
      if (drag.mode === 'pending') drag.mode = Math.abs(e.clientX - drag.sx) >= Math.abs(e.clientY - drag.sy) ? 'orbit' : 'scroll';
      if (drag.mode === 'orbit') { orbit((e.clientX - drag.x) * K, (e.clientY - drag.y) * K, true); drag.x = e.clientX; drag.y = e.clientY; }
      else if (drag.mode === 'pan') { panBy(e.clientX - drag.x, e.clientY - drag.y, true); drag.x = e.clientX; drag.y = e.clientY; }
    } else if (e.target === stage && !drag) {
      const n = ndc(e);
      hoverTarget = e.pointerType === 'mouse' ? hoverObject(n) : null;
      if (hoverTarget && albumOpen) {
        const bHit = bookActionAt(n);
        if (bHit?.type === 'photo') hoverTarget.customLabel = bHit.photo.title;
        else if (bHit?.type === 'prev') hoverTarget.customLabel = albumBook.getState().canPrev ? t(curLang, 'model.album.prev') : null;
        else if (bHit?.type === 'next') hoverTarget.customLabel = albumBook.getState().canNext ? t(curLang, 'model.album.next') : null;
      }
      const overObj = egg.hit(n) || !!hoverTarget;
      const prevHoverId = hoverId;
      hoverId = !openId && !overObj ? pick(e) : null;
      if (hoverId !== prevHoverId) markDirty();
      stage.style.cursor = panMode ? 'move' : hoverId || overObj ? 'pointer' : 'grab';
      updateHoverTip();
    } else if (!drag) {
      hoverTarget = null; hoverTip.hidden = true;
    }
  });
  const endPointer = (e, cancelled) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size === 0) settleLeash();
    if (drag && pts.size === 0) {
      if (drag.mode === 'bookFlip') {
        if (drag.moved) {
          albumBook?.endDrag(drag.vx || 0);
        } else {
          albumBook?.endDrag(0);
          if (!cancelled && e.target === stage && (e.pointerType !== 'mouse' || drag.btn === 0) && performance.now() >= albumOpenedAt) {
            const bHit = bookActionAt(ndc(e));
            if (bHit?.type === 'photo') openAlbumPhoto(bHit.photo, stage);
            else if (bHit?.type === 'next') albumBook?.next(reduced);
            else if (bHit?.type === 'prev') albumBook?.prev(reduced);
          }
        }
        drag = null; navigationGroup = null; stage.style.cursor = panMode ? 'move' : 'grab';
        markDirty();
        return;
      }
      if (!cancelled && !drag.moved && e.target === stage && drag.btn === 0) {
        const object = hoverObject(ndc(e));
        const eggKind = egg.pick(ndc(e));
        if (eggKind) eggClick(eggKind);
        else if (object) {
          if (object.type !== 'book' && bookUI.isActive()) { bookUI.close(true); restoreObjectView(); }
          if (object.room !== openId) onPick(object.room);
          if (object.type === 'book') tapShelfBook(object.key);
          else if (object.type === 'album') toggleAlbum();
          else if (object.type === 'photo') togglePhoto(object.key);
          else togglePop(object.key);
        } else if (!albumOpen && !albumFramed) onPick(pick(e));
      }
      drag = null; navigationGroup = null; stage.style.cursor = panMode ? 'move' : 'grab';
      markDirty();
    } else if (drag && drag.mode === 'pinch' && pts.size === 1) { drag.mode = 'orbit'; const [r] = [...pts.values()]; drag.x = r.x; drag.y = r.y; }
  };
  addEventListener('pointerup', e => endPointer(e, false));
  addEventListener('pointercancel', e => endPointer(e, true));   // the browser took over (vertical page scroll)
  stage.addEventListener('pointerleave', () => { hoverId = null; hoverTarget = null; hoverTip.hidden = true; });
  // Once a touch gesture moves the scene, keep the page from scrolling under it.
  stage.addEventListener('touchmove', e => {
    if (e.target !== stage || !e.cancelable) return;
    if (e.touches.length > 1 || drag?.mode === 'pan' || drag?.mode === 'orbit' || drag?.mode === 'pinch' || drag?.mode === 'bookFlip') e.preventDefault();
  }, { passive: false });
  // Wheel zoom and horizontal trackpad panning in the interactive stage.
  stage.addEventListener('wheel', e => {
    if (e.target !== stage) return;
    if (e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    if (Math.abs(e.deltaX) > 2 && Math.abs(e.deltaX) >= Math.abs(e.deltaY)) {
      panBy(-e.deltaX * 0.8, 0, false);
      clearTimeout(leashTimer); leashTimer = setTimeout(settleLeash, 180);   // a trackpad swipe has no end event
    }
    else zoomBy(Math.exp(e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)), false);
  }, { passive: false });
  // Shift + Arrow keys pan; Arrow keys navigate focused articles/books/projects or orbit the stage.
  stage.addEventListener('keydown', e => {
    if (e.target !== stage) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && stepFocusedItem(e.key === 'ArrowRight' ? 1 : -1)) {
      e.preventDefault();
      e.stopPropagation?.();
      return;
    }
    const S = 0.14, P = 48; let used = true;
    switch (e.key) {
      case 'ArrowLeft': if (e.shiftKey || panMode) panBy(P, 0, false, false); else orbit(-S, 0, false, false); break;
      case 'ArrowRight': if (e.shiftKey || panMode) panBy(-P, 0, false, false); else orbit(S, 0, false, false); break;
      case 'ArrowUp': if (e.shiftKey || panMode) panBy(0, P, false, false); else orbit(0, -S, false, false); break;
      case 'ArrowDown': if (e.shiftKey || panMode) panBy(0, -P, false, false); else orbit(0, S, false, false); break;
      case '+': case '=': zoomBy(0.85); break;
      case '-': case '_': zoomBy(1 / 0.85); break;
      case 'Home': case '0': case 't': case 'T': resetView(); break;
      case 'Enter': if (bookUI.activeId) tapShelfBook(bookUI.activeId); else used = false; break;   // same steps as a click on the book (no card, D-114)
      default: used = false;
    }
    if (used) e.preventDefault();
  });

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(stage);

  const v3 = new THREE.Vector3(); let last = performance.now();
  // Hotspots follow their objects and stay inside the canvas.
  const GAP = 4, LIFT = 14;   // LIFT: gap between the anchor and the label, where the line shows
  function placeSpots() {
    const live = [];
    for (const s of spots) {
      const on = s.id === openId && rooms[s.id].open > 0.7, low = Math.sin(view.el) < 0.12;   // seen from below or edge-on: fade out
      if (on !== s.on || low !== s.low) { s.on = on; s.low = low; s.el.classList.toggle('on', on); s.el.classList.toggle('away', low); if (s.el.href || s.el.tagName === 'BUTTON') s.el.tabIndex = on && !low ? 0 : -1; }
      if (rooms[s.id].open < 0.05) continue;
      v3.copy(s.pos).project(camera);
      s.w = s.el.offsetWidth; s.h = s.el.offsetHeight;
      s.px = (v3.x * 0.5 + 0.5) * stageW; s.py = (-v3.y * 0.5 + 0.5) * stageH;   // anchor: bottom centre
      if (s.id === openId) live.push(s);
    }
    live.sort((a, b) => a.px - b.px);
    const placed = [];
    let aboveIndex = 0;
    for (const s of live) {
      // Prefer a spot just above the anchor; if that is taken, try the rows above and below and slightly to the side,
      // so labels dodge each other and stay close to their object instead of drifting away in a staircase.
      const row = s.h + GAP, side = s.w * 0.55 + GAP, tries = [];
      // Project labels stand above their frame (never below, that would cover the picture). Neighbours alternate between two rows, so no line runs through another label.
      const lift = s.above ? LIFT + 10 : LIFT, stagger = s.above ? (aboveIndex++ % 2) * row : 0, dys = s.above ? [-lift - stagger, -lift - (stagger ? 0 : row), -lift - 2 * row, -lift - row] : [-lift, -lift - row, lift + s.h, -lift - 2 * row];
      for (const dy of dys) for (const dx of [0, side, -side]) tries.push([dx, dy]);
      let pick = null;
      for (const [dx, dy] of tries) {
        const l = s.px - s.w / 2 + dx, b = s.py + dy;
        if (l < GAP || l + s.w > stageW - GAP || b - s.h < GAP || b > stageH - 8) continue;
        if (placed.some(p => l < p.l + p.w + GAP && p.l < l + s.w + GAP && b - s.h < p.b + GAP && p.b - p.h < b + GAP)) continue;
        pick = { l, b }; break;
      }
      if (!pick) pick = { l: Math.min(Math.max(s.px - s.w / 2, GAP), stageW - s.w - GAP), b: Math.min(Math.max(s.py - (s.above ? LIFT + 10 : LIFT), s.h + GAP), stageH - 8) };
      const { l, b } = pick;
      placed.push({ l, b, w: s.w, h: s.h });
      s.el.style.left = `${l + s.w / 2}px`; s.el.style.top = `${b}px`;
      // Line from the nearest label edge to the anchor, relative to the label's own box.
      const ax = s.px - l, ay = s.py - (b - s.h);
      let cx, cy;
      if (ay > s.h) { cx = Math.min(Math.max(ax, 10), s.w - 10); cy = s.h; }
      else if (ay < 0) { cx = Math.min(Math.max(ax, 10), s.w - 10); cy = 0; }
      else { cx = ax < 0 ? 0 : s.w; cy = ay; }
      const mark = `${Math.round(cx)},${Math.round(cy)},${Math.round(ax)},${Math.round(ay)}`;
      if (mark !== s.mark) {
        s.mark = mark;
        s.link.setAttribute('x1', cx.toFixed(1)); s.link.setAttribute('y1', cy.toFixed(1)); s.link.setAttribute('x2', ax.toFixed(1)); s.link.setAttribute('y2', ay.toFixed(1));
        s.dot.setAttribute('cx', ax.toFixed(1)); s.dot.setAttribute('cy', ay.toFixed(1));
      }
    }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const bookMoving = albumBook ? albumBook.update(dt) : false;
    const shelfBookMoving = bookUI.update(dt);
    const warpMoving = roomWarp ? roomWarp.update(now) : false;
    const globeMoving = globeFlight ? globeFlight.update(now) : false;
    let displaysMoving = false;
    for (const display of projectDisplays) {
      const target = openId === 'projects' && popKey === display.key ? 1 : 0;
      if (Math.abs(display.selection - target) < .0001) continue;
      display.selection = reduced ? target : THREE.MathUtils.damp(display.selection, target, 14, dt);
      display.board.position.y = display.restHeight + .035 * display.selection;
      display.frameMaterial.emissiveIntensity = .14 * display.selection;
      display.board.updateMatrixWorld(true);
      displaysMoving = true;
    }
    if (albumBook?.light) {
      const targetLight = albumOpen ? 1.35 : 0;
      if (Math.abs(albumBook.light.intensity - targetLight) > 0.01) {
        albumBook.light.intensity += (targetLight - albumBook.light.intensity) * (reduced ? 1 : Math.min(1, dt * 8));
        dirty = true;
      }
    }
    const camMoving = Math.abs(goal.az - view.az) > 1e-4 || Math.abs(goal.el - view.el) > 1e-4
      || Math.abs(goal.dist - view.dist) > 1e-4 || goal.t.distanceToSquared(view.t) > 1e-7;
    let roomsMoving = false;
    for (const r of Object.values(rooms)) {
      const targetOpen = r.id === openId ? 1 : 0;
      const targetGlow = r.id === openId ? 1 : r.id === hoverId && !openId ? 0.35 : 0;
      if (Math.abs(targetOpen - r.open) > 1e-4 || Math.abs(targetGlow - r.glow) > 1e-4) {
        roomsMoving = true;
        break;
      }
    }
    if (!dirty && !camMoving && !roomsMoving && !bookMoving && !shelfBookMoving && !warpMoving && !globeMoving && !displaysMoving && !egg.isAnimating) return;
    dirty = false;

    const k = reduced ? 1 : 1 - Math.exp(-dt * (objectFocus ? 6 : 2.6));
    view.az += (goal.az - view.az) * k; view.el += (goal.el - view.el) * k; view.dist += (goal.dist - view.dist) * k; view.t.lerp(goal.t, k); clampTarget(view.t);
    if (albumFramed && !albumZoomSettled && !albumOpen
      && Math.abs(view.dist - goal.dist) < 0.025 && view.t.distanceTo(goal.t) < 0.012
      && Math.abs(view.el - goal.el) < 0.015 && Math.abs(view.az - goal.az) < 0.015) {
      albumZoomSettled = true;
      updateAlbumHud();
      dirty = true;
    }
    const ce = Math.cos(view.el), se = Math.sin(view.el), sa = Math.sin(view.az), ca = Math.cos(view.az);
    camera.position.set(view.t.x + view.dist * ce * sa, view.t.y + view.dist * se, view.t.z + view.dist * ce * ca);
    camera.up.set(-se * sa, ce, -se * ca);                    // tangent of the elevation arc: no flip or jump at the poles
    camera.lookAt(view.t);
    camera.updateMatrixWorld();
    egg.update(now);
    const lampOn = THREE.MathUtils.clamp((0.15 - Math.sin(view.el)) / 0.15, 0, 1);   // lit only when seen from below
    // Barely visible mains flicker (about 3 %), calm in reduced motion; a short dip while the fax receives.
    const flick = reduced ? 1 : 1 + 0.018 * Math.sin(now * 0.0071) + 0.012 * Math.sin(now * 0.0193 + 1.3) - (egg.isAnimating ? 0.05 * (Math.floor(now / 350) % 2) : 0);
    cellar.lamp.intensity = cellar.lamp.userData.base * lampOn * flick;
    cellar.lamp.userData.group.visible = lampOn > 0;
    updatePhoto();
    updatePop();
    if (openId !== 'about' && (albumOpen || albumFramed)) closeAlbum(false);

    for (const r of Object.values(rooms)) {
      const isOpen = r.id === openId, isHot = r.id === hoverId && !openId;
      r.open += ((isOpen ? 1 : 0) - r.open) * k;
      r.glow += ((isOpen ? 1 : isHot ? 0.35 : 0) - r.glow) * (reduced ? 1 : 1 - Math.exp(-dt * 6));
      r.door.position.z = r.doorZ - r.open * r.doorSlide;
      r.light.intensity = r.glow * 9;
      if (r.group.userData.opSpot) r.group.userData.opSpot.intensity = r.glow * 11;   // operating light: a pool on the table, only while the room is lit
      r.floor.material.emissiveIntensity = r.glow * 0.12;
      r.hotGeo.setDrawRange(0, Math.floor(r.open * r.hotSegs) * 36);
      labels[r.id].classList.toggle('hot', isHot);
      v3.copy(r.labelAt).project(camera);
      labels[r.id].style.left = `${(v3.x * 0.5 + 0.5) * 100}%`;
      labels[r.id].style.top = `${(-v3.y * 0.5 + 0.5) * 100}%`;
    }
    placeSpots();
    updateSoonBadge();
    updateEngageBtn();
    updateHoverTip();
    renderCamera.position.copy(camera.position);
    renderCamera.quaternion.copy(camera.quaternion);
    renderer.render(scene, renderCamera);
  }
  requestAnimationFrame(frame);

  return {
    open(id, { keepView = false } = {}) {
      markDirty();
      cancelWarp();
      if (id === 'about') ensureEnterpriseGlb();
      bookUI.close(true);
      if (!keepView && (id !== openId || custom)) rememberView('room');
      if (id !== openId) closeAlbum(false);
      if (objectFocus && (id !== openId || !keepView)) { closePop(false); restoreObjectView(); }
      openId = id; hoverId = null; hoverTarget = null; hoverTip.hidden = true;
      if (id === 'about' || id === 'writing') loadBookCoversForRoom(id);
      if (id !== 'about' && currentPhotoKey === 'photo') closePhoto(false);
      if (id !== 'writing' && currentPhotoKey === 'speaking') closePhoto(false);
      if (id !== 'about') closeAlbum(false);
      if (popKey && !popAllowed(id, popKey)) closePop(false);
      if (!keepView) { custom = false; zoom = 1; panOffset.set(0, 0, 0); egg.close(); }
      setGoal();
      if (objectFocus) focusObject(objectFocus.target, false);
    },
    hover(id) { hoverId = id; markDirty(); },
    setPanMode(on) { panMode = Boolean(on); stage.classList.toggle('panning', panMode); if (!drag) stage.style.cursor = panMode ? 'move' : 'grab'; return panMode; },
    getPanMode: () => panMode,
    back: goBack,
    reset: resetView,
    setZoom(value) { if (Number.isFinite(value)) zoomBy(value / zoom, true); },
    closeNote() {
      const faxFocused = objectFocus?.target === faxTarget || objectFocus?.target === sheetTarget;
      const bookFocused = objectFocus?.target?.bookId;
      const had = egg.isOpen || faxFocused || pOpen || Boolean(popKey) || albumOpen || albumFramed || bookUI.isActive() || Boolean(objectFocus) || Boolean(roomWarp?.isActive());
      bookUI.close(true);
      egg.close(true); closePhoto(true); closePop(true); closeAlbum(true); cancelWarp();
      if (objectFocus || faxFocused || bookFocused) { restoreObjectView(); stage.focus({ preventScroll: true }); }
      markDirty();
      return had;
    },
    isCustom: () => custom,
    setLanguage(l) {
      curLang = l;
      setModelLanguage(l);
      labelSpots();
      labelPhoto();
      fillPop();
      albumBook?.refreshLanguage();
      bookUI.setLanguage(l);
      updateAlbumHud();
      if (objectFocus) focusObject(objectFocus.target, false);
      updateHoverTip();
      markDirty();
    },
    ...(import.meta.env.DEV ? {
      debug: {
        scene, camera, view, goal, egg, cellar, albumBook, bookUI, tapShelfBook,
        get music() { return music.state; },
        get custom() { return custom; },
        get zoom() { return zoom; },
        get focusedKey() { return objectFocus?.target?.key ?? null; },
        get popKey() { return popKey; },
        inspectionTargets,
        inspect: key => openPop(key),
        selectProject: key => togglePop(key),
        openAlbum,
        openAlbumBook,
        closeAlbumBook,
        get albumPending() { return albumFramed && !albumZoomSettled; },
        get albumFramed() { return albumFramed; },
        get albumOpen() { return albumOpen; },
        get historyLength() { return viewHistory.length; },
        get leash() { return leash().clone(); },
        panPx: (dx, dy, soft = true) => panBy(dx, dy, true, soft),
        endPan: settleLeash,
        orbitPx: (dx, dy, soft = true) => orbit(dx * K, dy * K, true, soft),
      },
    } : {}),
  };
}
