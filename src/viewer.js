import { enterpriseCopy, labelShipAction } from './enterprise-copy.js';
import * as THREE from 'three';
import { buildScene, setModelLanguage, HOTSPOTS } from './scene.js';
import { t } from './i18n.js';
import { createEgg } from './egg.js';
import { PATHS } from './icons.js';
import { albumPages } from './album-pages.js';
import { openExternal } from './external-links.js';
import { inspectionPose, clampZoom } from './inspection.js';

export function startViewer({ canvas, stage, labels, spotsEl, reduced, lang, onPick, onAway, onZoom, onBackState, onViewBack }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return null; }
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;

  setModelLanguage(lang);
  const { scene, rooms, outline, center, cellar, occluders, photo, speakingPhoto, projectPicks, trophyPicks, storyPicks, albumPicks, inspectionTargets } = buildScene();
  // Default light rig, only if the scene does not bring its own (room point lights do not count).
  let sceneLit = false;
  scene.traverse(o => { if (o.isHemisphereLight || o.isDirectionalLight || o.isAmbientLight || o.isSpotLight || o.isRectAreaLight) sceneLit = true; });
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
    const sp = { key, el, project };
    if (project === 'photo') el.addEventListener('click', e => { e.preventDefault(); togglePhoto('photo'); });
    else if (project === 'speaking') el.addEventListener('click', e => { e.preventDefault(); togglePhoto('speaking'); });
    else if (project === 'album') el.addEventListener('click', e => { e.preventDefault(); toggleAlbum(); });
    else if (project) el.addEventListener('click', e => { e.preventDefault(); togglePop(project); });
    spotsEl.append(el);
    spots.push({ id, el, sp, w: 0, h: 0, px: 0, py: 0, pos });
  }

  let curLang = lang;
  function labelSpots() {
    for (const s of spots) {
      s.el.textContent = t(curLang, `model.spots.${s.sp.key}`) || t(curLang, `model.inspections.${s.sp.key}.title`);
      if (!s.el.href && !s.sp.project) s.el.title = t(curLang, 'ui.soon');
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
    if (albumLightbox && !albumLightbox.hidden) { closeAlbumPhoto(); return true; }
    if (albumOpen) { closeAlbum(true); return true; }
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

  function resize() {
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
    const w = custom ? THREE.MathUtils.clamp((0.6 - zoom) / 0.3, 0, 1) * THREE.MathUtils.clamp(-Math.sin(goal.el) * 3, 0, 1) : 0;
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
    rememberView('reset'); closeAlbum(false); closePop(false); restoreObjectView(); custom = false; zoom = 1; panOffset.set(0, 0, 0); egg.close(); closePhoto(false); setGoal();
    if (reduced) { view.az = goal.az; view.el = goal.el; view.dist = goal.dist; view.t.copy(goal.t); }
  }
  // Turning: signs are for a drag; when the model is upside down (cos el < 0) the horizontal sense is mirrored.
  function wrap() {
    for (const k of ['az', 'el']) while (Math.abs(goal[k]) > Math.PI) { const d = goal[k] > 0 ? -TAU : TAU; goal[k] += d; view[k] += d; }
  }
  function orbit(dAz, dEl, instant) {
    rememberView('orbit', true);
    const s = Math.cos(instant ? view.el : goal.el) >= 0 ? 1 : -1;
    goal.az -= dAz * s; goal.el += dEl;
    if (instant) { view.az -= dAz * s; view.el += dEl; }
    custom = true; wrap(); aim(); checkAway();
  }
  const panRgt = new THREE.Vector3(), panUp = new THREE.Vector3(), panNext = new THREE.Vector3();
  function panBy(dxPx, dyPx, instant) {
    rememberView('pan', true);
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const scale = (instant ? view.dist : goal.dist) * (2 * tv) / Math.max(stageH, 1);
    panRgt.set(1, 0, 0).applyQuaternion(camera.quaternion);
    panUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    panOffset.addScaledVector(panRgt, -dxPx * scale).addScaledVector(panUp, dyPx * scale);
    panNext.copy(home.t).add(panOffset);
    clampTarget(panNext);
    panOffset.copy(panNext).sub(home.t);
    custom = true; aim();
    if (instant) view.t.copy(goal.t);
    checkAway();
  }
  function zoomBy(f, instant) {
    rememberView('zoom', true);
    zoom = Math.max(DMIN / home.dist, clampZoom(zoom * f)); custom = true;
    goal.dist = Math.max(DMIN, home.dist * zoom);
    if (instant) view.dist = goal.dist;
    aim(); checkAway();
  }
  const egg = createEgg({ cellar, camera, stage, reduced, lang });
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
  const SOCIAL_CARDS = new Set(['signal', 'bluesky', 'linkedin']);
  const ABOUT_CARDS = new Set(['story', 'enterprise', 'enterpriseD', ...SOCIAL_CARDS]);
  const popAllowed = (roomId, key) =>
    roomId === 'projects' || roomId === 'ai'
    || (roomId === 'writing' && SOCIAL_CARDS.has(key))
    || (roomId === 'about' && ABOUT_CARDS.has(key))
    || inspectionTargets.some(target => target.room === roomId && target.key === key);
  let popEl = null, popBody = null, popImg = null, popTitle = null, popText = null, popMore = null, popTimeline = null, popClose = null, shipActions = null;
  let popKey = null, popTimer = null;
  const projectKeys = new Set(['wimmelbild', 'monitor', 'praxisfaden', 'hdrg', 'elbstrand']);
  const soonBadge = document.createElement('div'); soonBadge.className = 'project-soon-badge';
  soonBadge.setAttribute('role', 'status'); soonBadge.hidden = true; stage.append(soonBadge);
  const badgePos = new THREE.Vector3(), badgeBox = new THREE.Box3();
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
    const isShip = popKey === 'enterprise' || popKey === 'enterpriseD';
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
    const data = t(curLang, `model.projectCards.${popKey}`) || t(curLang, `model.inspections.${popKey}`);
    if (!data) return;
    popEl.setAttribute('aria-label', data.title);
    popClose.setAttribute('aria-label', t(curLang, 'ui.close'));
    popTitle.textContent = isShip ? (popKey === 'enterpriseD' ? 'NCC-1701-D' : 'NCC-1701') : data.title;
    popText.textContent = isShip ? shipCopy[popKey === 'enterpriseD' ? 'tng' : 'tos'] : data.text;
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
    if (save && !objectFocus) objectFocus = { target, custom, zoom, pan: panOffset.clone(), az: goal.az, el: goal.el, dist: goal.dist, point: goal.t.clone() };
    if (objectFocus) objectFocus.target = target;
    const bounds = new THREE.Box3();
    for (const object of target.objects) { object.updateWorldMatrix(true, true); bounds.expandByObject(object); }
    const pose = inspectionPose({ min: bounds.min.toArray(), max: bounds.max.toArray(), az: target.az, el: target.el,
      fov: camera.fov, width: stageW, height: stageH, captionHeight: target.album ? 0 : (popEl?.offsetHeight || 0) });
    panOffset.fromArray(pose.target).sub(home.t); custom = true; zoom = pose.distance / home.dist;
    goal.az = near(view.az, target.az); goal.el = near(view.el, target.el); goal.dist = pose.distance; goal.t.fromArray(pose.target);
    if (reduced) { view.az = goal.az; view.el = goal.el; view.dist = goal.dist; view.t.copy(goal.t); }
    checkAway();
  }
  function restoreObjectView() {
    if (!objectFocus) return;
    const saved = objectFocus; objectFocus = null;
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
  function openPop(key) {
    rememberView('object');
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
      popEl.addEventListener('pointerleave', () => { if (popKey && !objectFocus && !['rack', 'enterprise', 'enterpriseD'].includes(popKey)) startAutoCard(() => closePop(false)); });
      popBody.append(popImg, popTitle, popText, popMore, popTimeline);
      shipActions = document.createElement('div'); shipActions.className = 'ship-actions'; shipActions.hidden = true;
      for (const launch of [false, true]) {
        const action = document.createElement('button'); action.type = 'button';
        action.addEventListener('click', async () => {
          const key = popKey; action.disabled = true;
          try {
            const { showEnterprise } = await import('./enterprise-inspector.js');
            if (popKey === key && !showEnterprise(key === 'enterpriseD' ? 'tng' : 'tos', enterpriseCopy[curLang], reduced, launch)) popText.textContent = enterpriseCopy[curLang].error;
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
    popEl.classList.toggle('rack-card', key === 'rack');
    popEl.classList.toggle('ship-card', ['enterprise', 'enterpriseD'].includes(key));
    popEl.classList.toggle('inspection-card', Boolean(inspectionFor(key)));
    fillPop();
    const project = t(curLang, `model.projectCards.${key}`);
    popEl.classList.toggle('project-link', ['wimmelbild', 'monitor', 'praxisfaden', 'hdrg', 'elbstrand'].includes(key) && Boolean(project?.href));
    popEl.hidden = false;
    popEl.inert = false;
    updatePop();
    void popEl.offsetWidth;
    popEl.classList.add('on');
    const target = inspectionFor(key);
    if (target) { stage.classList.add('object-focused'); focusObject(target); }
    popClose.focus({ preventScroll: true });
    if (!objectFocus && !['rack', 'enterprise', 'enterpriseD'].includes(key)) startAutoCard(() => closePop(false));
  }
  function togglePop(key) {
    if (popKey === key && projectKeys.has(key)) {
      const data = t(curLang, `model.projectCards.${key}`);
      if (data?.href) openExternal(data.href);
      else updateSoonBadge();
    } else if (popKey === key) closePop(true);
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

  // Interactive Photo Album in About Me (D-039)
  const albumParts = new Set(albumPicks ?? []), albumThings = [...(albumPicks ?? []), ...occluders];
  const albumRay = new THREE.Raycaster();
  const albumHit = ndcPos => {
    albumRay.setFromCamera(ndcPos, camera);
    const h = albumRay.intersectObjects(albumThings, false)[0];
    return h && albumParts.has(h.object) ? h.object.userData : null;
  };
  let albumOpen = false, albumIndex = 0, albumPending = false, albumOpenedAt = 0;
  let albumModal = null, albumBook = null, albumSpread = null, albumLightbox = null;
  let albumPageLeft = null, albumPageRight = null, albumCounterEl = null, albumTagEl = null, albumHintEl = null;
  let albumPrevBtn = null, albumNextBtn = null, albumCloseBtn = null, albumLightboxClose = null, albumBackBtn = null;
  let albumLightboxImage = null, albumLightboxCaption = null;
  let albumTimer = null, albumReturnFocus = null, albumPhotoFocus = null;
  const getAlbumPhotos = () => t(curLang, 'model.album.photos') || [];

  function buildAlbumModal() {
    if (albumModal) return;
    albumModal = document.createElement('div');
    albumModal.className = 'album-modal';
    albumModal.setAttribute('role', 'dialog');
    albumModal.setAttribute('aria-modal', 'true');
    albumModal.hidden = true;
    albumModal.inert = true;

    const backdrop = document.createElement('div');
    backdrop.className = 'album-backdrop';
    backdrop.addEventListener('click', () => closeAlbum(true));
    albumBook = document.createElement('div');
    albumBook.className = 'album-book';
    albumCloseBtn = document.createElement('button');
    albumCloseBtn.type = 'button';
    albumCloseBtn.className = 'card-x album-close';
    albumCloseBtn.textContent = '×';
    albumCloseBtn.addEventListener('click', () => closeAlbum(true));

    const header = document.createElement('div');
    header.className = 'album-header';
    albumTagEl = document.createElement('span'); albumTagEl.className = 'album-tag';
    albumCounterEl = document.createElement('span'); albumCounterEl.className = 'album-counter';
    albumBackBtn = document.createElement('button'); albumBackBtn.type = 'button'; albumBackBtn.className = 'album-btn'; albumBackBtn.textContent = 'BACK';
    albumBackBtn.addEventListener('click', goBack);
    header.append(albumTagEl, albumCounterEl, albumBackBtn);

    albumSpread = document.createElement('div');
    albumSpread.className = 'album-spread';
    albumPageLeft = document.createElement('div'); albumPageLeft.className = 'album-page album-page-left';
    const spine = document.createElement('div'); spine.className = 'album-spine';
    albumPageRight = document.createElement('div'); albumPageRight.className = 'album-page album-page-right';
    albumSpread.append(albumPageLeft, spine, albumPageRight);

    let touchStart = null;
    albumSpread.addEventListener('touchstart', e => {
      if (e.touches.length === 1) touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    albumSpread.addEventListener('touchend', e => {
      if (!touchStart || !e.changedTouches.length) return;
      const dx = e.changedTouches[0].clientX - touchStart.x;
      const dy = e.changedTouches[0].clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        e.preventDefault();
        setAlbumIndex(albumIndex + (dx < 0 ? 2 : -2));
      }
    }, { passive: false });

    const footer = document.createElement('div'); footer.className = 'album-footer';
    albumPrevBtn = document.createElement('button'); albumPrevBtn.type = 'button';
    albumPrevBtn.className = 'album-btn'; albumPrevBtn.addEventListener('click', () => setAlbumIndex(albumIndex - 2));
    albumNextBtn = document.createElement('button'); albumNextBtn.type = 'button';
    albumNextBtn.className = 'album-btn'; albumNextBtn.addEventListener('click', () => setAlbumIndex(albumIndex + 2));
    const nav = document.createElement('div'); nav.className = 'album-nav'; nav.append(albumPrevBtn, albumNextBtn);
    albumHintEl = document.createElement('p'); albumHintEl.className = 'album-hint';
    footer.append(nav, albumHintEl);
    albumBook.append(albumCloseBtn, header, albumSpread, footer);

    albumLightbox = document.createElement('div');
    albumLightbox.className = 'album-lightbox';
    albumLightbox.setAttribute('role', 'dialog');
    albumLightbox.setAttribute('aria-modal', 'true');
    albumLightbox.hidden = true;
    const lightboxBackdrop = document.createElement('div'); lightboxBackdrop.className = 'album-lightbox-backdrop';
    lightboxBackdrop.addEventListener('click', closeAlbumPhoto);
    const lightboxFigure = document.createElement('figure'); lightboxFigure.className = 'album-lightbox-figure';
    albumLightboxImage = document.createElement('img'); albumLightboxImage.className = 'album-lightbox-image';
    albumLightboxCaption = document.createElement('figcaption'); albumLightboxCaption.className = 'album-lightbox-caption';
    albumLightboxClose = document.createElement('button'); albumLightboxClose.type = 'button';
    albumLightboxClose.className = 'card-x album-lightbox-close'; albumLightboxClose.textContent = '×';
    albumLightboxClose.addEventListener('click', closeAlbumPhoto);
    lightboxFigure.append(albumLightboxImage, albumLightboxCaption);
    albumLightbox.append(lightboxBackdrop, lightboxFigure, albumLightboxClose);
    albumModal.append(backdrop, albumBook, albumLightbox);
    stage.append(albumModal);
  }

  function openAlbumPhoto(photo, button) {
    // Ignore the synthetic click belonging to the pointer release that opened the book.
    if (!albumOpen || performance.now() - albumOpenedAt < 350) return;
    albumPhotoFocus = button;
    albumLightboxImage.src = `${import.meta.env.BASE_URL}${photo.src}`;
    albumLightboxImage.alt = photo.title;
    albumLightboxCaption.textContent = `${photo.title} · ${photo.desc}`;
    albumLightbox.setAttribute('aria-label', `${t(curLang, 'model.album.openImage')}: ${photo.title}`);
    albumLightboxClose.setAttribute('aria-label', t(curLang, 'model.album.closeImage'));
    albumBook.inert = true;
    albumLightbox.hidden = false;
    albumLightboxClose.focus({ preventScroll: true });
  }

  function closeAlbumPhoto() {
    if (!albumLightbox || albumLightbox.hidden) return;
    albumLightbox.hidden = true;
    albumBook.inert = false;
    (albumPhotoFocus?.isConnected && !albumPhotoFocus.closest('[hidden]') ? albumPhotoFocus : albumCloseBtn).focus({ preventScroll: true });
  }

  function renderAlbumPage(element, page, pageNumber, totalPages) {
    element.replaceChildren();
    element.classList.toggle('album-page-portrait', page.length === 1 && page[0].orientation === 'portrait');
    element.classList.toggle('album-page-single', page.length === 1);
    if (!page.length) return;
    for (const photo of page) {
      const button = document.createElement('button'); button.type = 'button';
      button.className = 'album-photo-card';
      button.setAttribute('aria-label', `${t(curLang, 'model.album.openImage')}: ${photo.title}`);
      const image = document.createElement('img'); image.src = `${import.meta.env.BASE_URL}${photo.src}`;
      image.alt = photo.title; image.decoding = 'async';
      const caption = document.createElement('span'); caption.className = 'album-photo-caption';
      caption.textContent = photo.title;
      button.append(image, caption);
      button.addEventListener('click', () => openAlbumPhoto(photo, button));
      element.append(button);
    }
    const number = document.createElement('span'); number.className = 'album-page-number';
    number.textContent = `${pageNumber} / ${totalPages}`;
    element.append(number);
  }

  function updateAlbumView() {
    if (!albumModal || !albumOpen) return;
    const photos = getAlbumPhotos(), pages = albumPages(photos);
    if (!pages.length) return;
    albumIndex = Math.floor(Math.max(0, Math.min(albumIndex, pages.length - 1)) / 2) * 2;
    const left = pages[albumIndex], right = pages[albumIndex + 1] || [];
    const pageCount = pages.length;
    renderAlbumPage(albumPageLeft, left, albumIndex + 1, pageCount);
    albumPageRight.hidden = false;
    renderAlbumPage(albumPageRight, right, albumIndex + 2, pageCount);
    const visible = [...left, ...right];
    albumCounterEl.textContent = `${visible[0].index + 1}–${visible.at(-1).index + 1} / ${photos.length}`;
    albumTagEl.textContent = t(curLang, 'model.album.title');
    albumBackBtn.setAttribute('aria-label', t(curLang, 'ui.previousView'));
    albumHintEl.textContent = t(curLang, 'model.album.hint');
    albumCloseBtn.setAttribute('aria-label', t(curLang, 'model.album.close'));
    albumPrevBtn.textContent = `‹ ${t(curLang, 'model.album.prev')}`;
    albumNextBtn.textContent = `${t(curLang, 'model.album.next')} ›`;
    albumPrevBtn.disabled = albumIndex === 0;
    albumNextBtn.disabled = albumIndex + 2 >= pages.length;
    albumModal.setAttribute('aria-label', `${t(curLang, 'model.album.title')} · ${albumCounterEl.textContent}`);
  }

  function setAlbumIndex(idx) {
    const pages = albumPages(getAlbumPhotos());
    if (!pages.length) return;
    const next = Math.floor(Math.max(0, Math.min(idx, pages.length - 1)) / 2) * 2;
    if (next === albumIndex) return;
    const direction = next > albumIndex ? 'turn-forward' : 'turn-back';
    albumIndex = next;
    updateAlbumView();
    if (!reduced) {
      albumSpread.classList.remove('turn-forward', 'turn-back');
      void albumSpread.offsetWidth;
      albumSpread.classList.add(direction);
    }
  }

  function openAlbum() {
    if (albumPending || albumOpen) return;
    rememberView('album');
    closePhoto(false); closePop(false);
    albumReturnFocus = document.activeElement;
    const target = { id: 'about:album', room: 'about', key: 'album', objects: albumPicks, az: -.22, el: .82, album: true };
    stage.classList.add('object-focused'); focusObject(target);
    albumPending = true;
    if (reduced) showAlbum();
  }
  function showAlbum() {
    albumPending = false;
    buildAlbumModal(); clearTimeout(albumTimer);
    // Every entry starts as a book, never with a previously enlarged photograph.
    albumLightbox.hidden = true; albumBook.inert = false; albumPhotoFocus = null;
    albumOpenedAt = performance.now();
    albumOpen = true; albumModal.hidden = false; albumModal.inert = false;
    updateAlbumView();
    void albumModal.offsetWidth; albumModal.classList.add('on');
    albumCloseBtn.focus({ preventScroll: true });
  }

  function closeAlbum(restoreFocus = false) {
    albumPending = false;
    if (!albumModal || !albumOpen) return;
    if (!albumLightbox.hidden) { albumLightbox.hidden = true; albumBook.inert = false; }
    albumOpen = false; albumModal.classList.remove('on'); albumModal.inert = true;
    clearTimeout(albumTimer);
    const had = albumModal.contains(document.activeElement);
    if (reduced) albumModal.hidden = true;
    else albumTimer = setTimeout(() => { if (!albumOpen) albumModal.hidden = true; }, 260);
    if (had || restoreFocus) (albumReturnFocus?.isConnected ? albumReturnFocus : stage).focus({ preventScroll: true });
  }

  function toggleAlbum() {
    if (albumPending) { albumPending = false; goBack(); }
    else if (albumOpen) closeAlbum(true);
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
    if (!hoverTarget || drag) { hoverTip.hidden = true; return; }
    const label = t(curLang, `model.spots.${hoverTarget.key}`) || t(curLang, `model.projectCards.${hoverTarget.key}.title`) || t(curLang, `model.inspections.${hoverTarget.key}.title`);
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
        else closeAlbum(true);
      } else if (albumLightbox && !albumLightbox.hidden) {
        if (e.key === 'Tab') { e.preventDefault(); albumLightboxClose.focus(); }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setAlbumIndex(albumIndex - 2);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setAlbumIndex(albumIndex + 2);
      } else if (e.key === 'Tab') {
        const focusable = [...albumBook.querySelectorAll('button:not(:disabled), [tabindex="0"]')].filter(el => !el.closest('[hidden]'));
        const first = focusable[0], last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
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
  stage.addEventListener('pointerdown', e => {
    if (e.target !== stage) return;
    if (e.pointerType === 'mouse' && ![0, 1, 2].includes(e.button)) return;
    hoverTip.hidden = true;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { stage.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (pts.size === 1) {
      const pan = panMode || (e.pointerType === 'mouse' && (e.button === 2 || e.button === 1 || e.shiftKey || e.ctrlKey || e.altKey || spaceDown));
      drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, btn: e.button, mode: pan ? 'pan' : e.pointerType === 'touch' ? 'pending' : 'orbit' };
    } else if (pts.size === 2 && drag) { drag.moved = true; drag.mode = 'pinch'; drag.p = pinchState(); }
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
      if (!drag.moved && Math.abs(e.clientX - drag.sx) <= 5 && Math.abs(e.clientY - drag.sy) <= 5) return;
      drag.moved = true;
      if (drag.mode === 'pending') drag.mode = Math.abs(e.clientX - drag.sx) >= Math.abs(e.clientY - drag.sy) ? 'orbit' : 'scroll';
      if (drag.mode === 'orbit') { orbit((e.clientX - drag.x) * K, (e.clientY - drag.y) * K, true); drag.x = e.clientX; drag.y = e.clientY; }
      else if (drag.mode === 'pan') { panBy(e.clientX - drag.x, e.clientY - drag.y, true); drag.x = e.clientX; drag.y = e.clientY; }
    } else if (e.target === stage && !drag) {
      const n = ndc(e);
      hoverTarget = e.pointerType === 'mouse' ? hoverObject(n) : null;
      const overObj = egg.hit(n) || !!hoverTarget;
      hoverId = !openId && !overObj ? pick(e) : null;
      stage.style.cursor = panMode ? 'move' : hoverId || overObj ? 'pointer' : 'grab';
      updateHoverTip();
    } else if (!drag) {
      hoverTarget = null; hoverTip.hidden = true;
    }
  });
  const endPointer = (e, cancelled) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (drag && pts.size === 0) {
      if (!cancelled && !drag.moved && e.target === stage && drag.btn === 0) {
        const object = hoverObject(ndc(e));
        if (egg.hit(ndc(e))) egg.play();
        else if (object) {
          if (object.room !== openId) onPick(object.room);
          if (object.type === 'album') toggleAlbum();
          else if (object.type === 'photo') togglePhoto(object.key);
          else togglePop(object.key);
        } else onPick(pick(e));
      }
      drag = null; navigationGroup = null; stage.style.cursor = panMode ? 'move' : 'grab';
    } else if (drag && drag.mode === 'pinch' && pts.size === 1) { drag.mode = 'orbit'; const [r] = [...pts.values()]; drag.x = r.x; drag.y = r.y; }
  };
  addEventListener('pointerup', e => endPointer(e, false));
  addEventListener('pointercancel', e => endPointer(e, true));   // the browser took over (vertical page scroll)
  stage.addEventListener('pointerleave', () => { hoverId = null; hoverTarget = null; hoverTip.hidden = true; });
  // Once a touch gesture moves the scene, keep the page from scrolling under it.
  stage.addEventListener('touchmove', e => {
    if (e.target !== stage || !e.cancelable) return;
    if (e.touches.length > 1 || drag?.mode === 'pan' || drag?.mode === 'orbit' || drag?.mode === 'pinch') e.preventDefault();
  }, { passive: false });
  // Wheel zoom and horizontal trackpad panning in the interactive stage.
  stage.addEventListener('wheel', e => {
    if (e.target !== stage) return;
    if (e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    if (Math.abs(e.deltaX) > 2 && Math.abs(e.deltaX) >= Math.abs(e.deltaY)) panBy(-e.deltaX * 0.8, 0, false);
    else zoomBy(Math.exp(e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)), false);
  }, { passive: false });
  // Shift + Arrow keys pan; Arrow keys orbit when the stage has focus.
  stage.addEventListener('keydown', e => {
    if (e.target !== stage) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const S = 0.14, P = 48; let used = true;
    switch (e.key) {
      case 'ArrowLeft': if (e.shiftKey || panMode) panBy(P, 0); else orbit(-S, 0); break;
      case 'ArrowRight': if (e.shiftKey || panMode) panBy(-P, 0); else orbit(S, 0); break;
      case 'ArrowUp': if (e.shiftKey || panMode) panBy(0, P); else orbit(0, -S); break;
      case 'ArrowDown': if (e.shiftKey || panMode) panBy(0, -P); else orbit(0, S); break;
      case '+': case '=': zoomBy(0.85); break;
      case '-': case '_': zoomBy(1 / 0.85); break;
      case 'Home': case '0': case 't': case 'T': resetView(); break;
      default: used = false;
    }
    if (used) e.preventDefault();
  });

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(stage);

  const v3 = new THREE.Vector3(); let last = performance.now();
  // Hotspots follow their objects and stay inside the canvas.
  const GAP = 4;
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
    for (const s of live) {
      let l = s.px - s.w / 2, b = s.py;
      l = Math.min(Math.max(l, GAP), stageW - s.w - GAP);
      for (let n = 0; n < 8; n++) {
        const hit = placed.find(p => l < p.l + p.w + GAP && p.l < l + s.w + GAP && b - s.h < p.b + GAP && p.b - p.h < b + GAP);
        if (!hit) break;
        b = hit.b + GAP + s.h;
      }
      b = Math.min(Math.max(b, s.h + 8), stageH - 8);
      placed.push({ l, b, w: s.w, h: s.h });
      s.el.style.left = `${l + s.w / 2}px`; s.el.style.top = `${b}px`;
    }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const k = reduced ? 1 : 1 - Math.exp(-dt * (objectFocus ? 6 : 2.6));
    view.az += (goal.az - view.az) * k; view.el += (goal.el - view.el) * k; view.dist += (goal.dist - view.dist) * k; view.t.lerp(goal.t, k); clampTarget(view.t);
    if (albumPending && Math.abs(view.dist - goal.dist) < .02 && view.t.distanceTo(goal.t) < .01 && Math.abs(view.el - goal.el) < .01 && Math.abs(view.az - goal.az) < .01) showAlbum();
    const ce = Math.cos(view.el), se = Math.sin(view.el), sa = Math.sin(view.az), ca = Math.cos(view.az);
    camera.position.set(view.t.x + view.dist * ce * sa, view.t.y + view.dist * se, view.t.z + view.dist * ce * ca);
    camera.up.set(-se * sa, ce, -se * ca);                    // tangent of the elevation arc: no flip or jump at the poles
    camera.lookAt(view.t);
    camera.updateMatrixWorld();
    egg.update(now, stageW, stageH);
    updatePhoto();
    updatePop();
    if (openId !== 'about' && albumOpen) closeAlbum(false);

    for (const r of Object.values(rooms)) {
      const isOpen = r.id === openId, isHot = r.id === hoverId && !openId;
      r.open += ((isOpen ? 1 : 0) - r.open) * k;
      r.glow += ((isOpen ? 1 : isHot ? 0.35 : 0) - r.glow) * (reduced ? 1 : 1 - Math.exp(-dt * 6));
      r.door.position.z = r.doorZ - r.open * r.doorSlide;
      r.light.intensity = r.glow * 9;
      r.floor.material.emissiveIntensity = r.glow * 0.12;
      r.hotGeo.setDrawRange(0, Math.floor(r.open * r.hotSegs) * 36);
      labels[r.id].classList.toggle('hot', isHot);
      v3.copy(r.labelAt).project(camera);
      labels[r.id].style.left = `${(v3.x * 0.5 + 0.5) * 100}%`;
      labels[r.id].style.top = `${(-v3.y * 0.5 + 0.5) * 100}%`;
    }
    placeSpots();
    updateSoonBadge();
    updateHoverTip();
    renderCamera.position.copy(camera.position);
    renderCamera.quaternion.copy(camera.quaternion);
    renderer.render(scene, renderCamera);
  }
  requestAnimationFrame(frame);

  return {
    open(id, { keepView = false } = {}) {
      if (!keepView && (id !== openId || custom)) rememberView('room');
      if (id !== openId) closeAlbum(false);
      if (objectFocus && (id !== openId || !keepView)) { closePop(false); restoreObjectView(); }
      openId = id; hoverId = null; hoverTarget = null; hoverTip.hidden = true;
      if (id !== 'about' && currentPhotoKey === 'photo') closePhoto(false);
      if (id !== 'writing' && currentPhotoKey === 'speaking') closePhoto(false);
      if (id !== 'about') closeAlbum(false);
      if (popKey && !popAllowed(id, popKey)) closePop(false);
      if (!keepView) { custom = false; zoom = 1; panOffset.set(0, 0, 0); egg.close(); }
      setGoal();
      if (objectFocus) focusObject(objectFocus.target, false);
    },
    hover(id) { hoverId = id; },
    setPanMode(on) { panMode = Boolean(on); stage.classList.toggle('panning', panMode); if (!drag) stage.style.cursor = panMode ? 'move' : 'grab'; return panMode; },
    getPanMode: () => panMode,
    back: goBack,
    reset: resetView,
    setZoom(value) { if (Number.isFinite(value)) zoomBy(value / zoom, true); },
    closeNote() {
      const had = egg.isOpen || pOpen || Boolean(popKey) || albumOpen || albumPending;
      egg.close(true); closePhoto(true); closePop(true); closeAlbum(true);
      return had;
    },
    isCustom: () => custom,
    setLanguage(l) { curLang = l; setModelLanguage(l); labelSpots(); egg.setLanguage(l); labelPhoto(); fillPop(); if (objectFocus) focusObject(objectFocus.target, false); if (albumModal && albumOpen) updateAlbumView(); updateHoverTip(); },
    ...(import.meta.env.DEV ? { debug: { camera, view, goal, egg, cellar, get custom() { return custom; }, get zoom() { return zoom; }, inspectionTargets, inspect: key => openPop(key), selectProject: key => togglePop(key), openAlbum, get albumPending() { return albumPending; }, get historyLength() { return viewHistory.length; } } } : {}),
  };
}
