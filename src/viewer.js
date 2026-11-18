import { enterpriseCopy, labelShipAction } from './enterprise-copy.js';
import * as THREE from 'three';
import { buildScene, setModelLanguage, HOTSPOTS } from './scene.js';
import { t } from './i18n.js';
import { createEgg } from './egg.js';
import { PATHS } from './icons.js';
import { albumPages } from './album-pages.js';

export function startViewer({ canvas, stage, labels, spotsEl, reduced, lang, onPick, onAway }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;

  setModelLanguage(lang);
  const { scene, rooms, outline, center, cellar, occluders, photo, speakingPhoto, projectPicks, trophyPicks, storyPicks, albumPicks } = buildScene();
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
  const phone = () => matchMedia('(max-width: 800px)').matches;

  // Hotspots are real links (or buttons for soon/project cards), placed over the objects they belong to.
  const spots = [];
  for (const [id, list] of Object.entries(HOTSPOTS)) for (const [key, href, x, y, z, project] of list) {
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
      s.el.textContent = t(curLang, `model.spots.${s.sp.key}`);
      if (!s.el.href && !s.sp.project) s.el.title = t(curLang, 'ui.soon');
    }
  }
  labelSpots();

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
  const EL = 0.54, AZ = -0.22, TAU = Math.PI * 2;         // overview: lower, slightly from the left
  // view = what is drawn (damped), goal = where it is heading. el is free all the way round (upside down included).
  const view = { az: 0, el: EL, dist: 30, t: new THREE.Vector3(0, 0.2, 0.3) };
  const goal = { az: 0, el: EL, dist: 30, t: view.t.clone() };
  const home = { az: 0, el: EL, dist: 30, t: view.t.clone() };   // the default pose for the current state
  const panOffset = new THREE.Vector3();
  const panelEl = stage.querySelector('#panel');
  let stageW = 1, stageH = 1, openId = null, hoverId = null;
  let shipFocus = null;
  let custom = false, zoom = 1, away = false;               // custom: the user turned, panned or zoomed away from the default
  const ZMIN = 0.06, ZMAX = 1.8, DMIN = 0.7;
  const near = (a, b) => b - TAU * Math.round((b - a) / TAU);   // angle equal to b that is closest to a
  const clampTarget = v => {
    v.x = THREE.MathUtils.clamp(v.x, -14, 14);
    v.y = THREE.MathUtils.clamp(v.y, -6, 8);
    v.z = THREE.MathUtils.clamp(v.z, -14, 14);
    return v;
  };

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); stageW = w; stageH = h;
    setGoal();
    if (shipFocus) focusShip(shipFocus.key, false);
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
  const BAR = 104;                                         // bottom clearance on desktop (footer strip + room bar)
  const roomPts = {};
  for (const r of Object.values(rooms)) {
    roomPts[r.id] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [0, r.h])
      roomPts[r.id].push(new THREE.Vector3(r.cx + sx * r.w / 2, y, r.cz + sz * r.d / 2));
  }
  function setGoal() {
    const mob = phone();
    const topPad = mob ? 0 : 2 * 74 / stageH;
    if (openId) {
      const r = rooms[openId];
      home.t.copy(r.center); home.t.y += openId === 'ai' ? 0.12 : 0.22; home.az = -r.x * 0.32;
      const bar = mob ? 0 : 2 * BAR / stageH;
      const left = mob ? -0.94 : -0.45, right = mob ? 0.96 : 0.90;
      home.dist = fitView(roomPts[openId], home.t, home.az, left, right, Math.max(0.55, 0.92 - topPad), Math.max(0.5, 0.92 - bar)) * 0.68;
    } else {
      home.t.copy(center); home.az = AZ;
      const bar = mob ? 0 : 2 * 90 / stageH;
      const left = mob ? -0.96 : -0.58, right = mob ? 0.96 : 0.88;
      home.dist = fitView(outline, home.t, home.az, left, right, Math.max(0.55, 0.94 - topPad), Math.max(0.5, 0.94 - bar)) * 0.92;
      // On the taller mobile canvas, lower the overview so it is centred in
      // the open area beneath the translucent introduction. Room views keep
      // their own framing; reset returns to this same overview position.
      if (mob) home.t.addScaledVector(upv, home.dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * 0.80);
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
    const panned = panOffset.lengthSq() > 0.002;
    const a = custom && (panned || Math.abs(near(goal.az, home.az) - goal.az) > 0.03 || Math.abs(near(goal.el, EL) - goal.el) > 0.03 || Math.abs(zoom - 1) > 0.03);
    if (a !== away) { away = a; onAway?.(a); }
  }
  function resetView() {
    closePop(false); custom = false; zoom = 1; panOffset.set(0, 0, 0); egg.close(); closePhoto(false); setGoal();
    if (reduced) { view.az = goal.az; view.el = goal.el; view.t.copy(goal.t); }
  }
  // Turning: signs are for a drag; when the model is upside down (cos el < 0) the horizontal sense is mirrored.
  function wrap() {
    for (const k of ['az', 'el']) while (Math.abs(goal[k]) > Math.PI) { const d = goal[k] > 0 ? -TAU : TAU; goal[k] += d; view[k] += d; }
  }
  function orbit(dAz, dEl, instant) {
    const s = Math.cos(instant ? view.el : goal.el) >= 0 ? 1 : -1;
    goal.az -= dAz * s; goal.el += dEl;
    if (instant) { view.az -= dAz * s; view.el += dEl; }
    custom = true; wrap(); aim(); checkAway();
  }
  const panRgt = new THREE.Vector3(), panUp = new THREE.Vector3(), panNext = new THREE.Vector3();
  function panBy(dxPx, dyPx, instant) {
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
    zoom = THREE.MathUtils.clamp(zoom * f, ZMIN, ZMAX); custom = true;
    goal.dist = Math.max(DMIN, home.dist * zoom);
    if (instant) view.dist = goal.dist;
    aim(); checkAway();
  }
  const egg = createEgg({ cellar, camera, stage, canvas, reduced, lang });
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
    stage.classList.toggle('card-open', Boolean(popKey));
    clearTimeout(pTimer);
    const had = pCard.contains(document.activeElement);
    if (reduced) pCard.hidden = true;
    else pTimer = setTimeout(() => { if (!pOpen) pCard.hidden = true; }, 280);
    if (had || restoreFocus) canvas.focus({ preventScroll: true });
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
    stage.classList.add('card-open');
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
    || (roomId === 'about' && ABOUT_CARDS.has(key));
  let popEl = null, popBody = null, popImg = null, popTitle = null, popText = null, popTimeline = null, popClose = null, shipActions = null;
  let popKey = null, popTimer = null;
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
    if (popKey === 'story') {
      const title = t(curLang, 'model.spots.story');
      popEl.setAttribute('aria-label', title);
      popClose.setAttribute('aria-label', t(curLang, 'ui.close'));
      popImg.hidden = true; popImg.removeAttribute('src');
      popTitle.textContent = title;
      popText.textContent = `${t(curLang, 'rooms.about.p1')} ${t(curLang, 'rooms.about.p2')}`;
      popTimeline.hidden = true;
      popBody.href = 'https://www.linkedin.com/in/gillespenning/';
      return;
    }
    const data = t(curLang, `model.projectCards.${popKey}`);
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
    if (data.timeline || isShip) {
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
  // Inspect the physical miniature in the room before offering the separate viewer.
  // Preserve the incoming room view so closing the card returns to that framing.
  function focusShip(key, save = true) {
    const miniature = trophyPicks.find(o => o.userData.project === key)?.userData.miniature;
    if (!miniature) return;
    if (save && !shipFocus) shipFocus = { key, custom, zoom, pan: panOffset.clone(), az: goal.az, el: goal.el, dist: goal.dist, target: goal.t.clone() };
    if (shipFocus) shipFocus.key = key;
    miniature.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(miniature), target = bounds.getCenter(new THREE.Vector3());
    const radius = bounds.getSize(new THREE.Vector3()).length() / 2;
    popEl.style.top = phone() ? `${Math.max(0, stageH - popEl.offsetHeight - 8)}px` : '';
    const rect = canvas.getBoundingClientRect(), card = popEl.getBoundingClientRect();
    const left = phone() ? 16 : stageW * .36;
    const right = stageW - 16, top = phone() ? 16 : 88;
    const bottom = Math.max(top + 80, card.top - rect.top - 16);
    const width = Math.max(100, right - left), height = Math.max(80, bottom - top);
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const dist = Math.max(DMIN, radius * 1.25 / Math.sin(Math.atan(Math.min(tv * height / stageH, tv * camera.aspect * width / stageW))));
    const az = -.28, el = .32;
    const rightVector = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
    const upVector = new THREE.Vector3(-Math.sin(el)*Math.sin(az), Math.cos(el), -Math.sin(el)*Math.cos(az));
    const nx = (left + right) / stageW - 1, ny = 1 - (top + bottom) / stageH;
    target.addScaledVector(rightVector, -nx * dist * tv * camera.aspect).addScaledVector(upVector, -ny * dist * tv);
    panOffset.copy(target).sub(home.t); custom = true; zoom = dist / home.dist;
    goal.az = near(view.az, az); goal.el = near(view.el, el); goal.dist = dist; goal.t.copy(target);
    if (reduced) { view.az = goal.az; view.el = goal.el; view.dist = dist; view.t.copy(target); }
    checkAway();
  }
  function restoreShipView() {
    if (!shipFocus) return;
    const saved = shipFocus; shipFocus = null;
    stage.classList.remove('ship-focused'); popEl.style.top = ''; custom = saved.custom; zoom = saved.zoom; panOffset.copy(saved.pan);
    goal.az = near(view.az, saved.az); goal.el = near(view.el, saved.el); goal.dist = saved.dist; goal.t.copy(saved.target);
    checkAway();
  }
  function closePop(restoreFocus = false) {
    if (!popEl || !popKey) return;
    restoreShipView();
    popKey = null; popEl.classList.remove('on'); popEl.inert = true;
    stopAutoCard();
    stage.classList.toggle('card-open', Boolean(pOpen));
    clearTimeout(popTimer);
    const had = popEl.contains(document.activeElement);
    if (reduced) popEl.hidden = true;
    else popTimer = setTimeout(() => { if (!popKey) popEl.hidden = true; }, 260);
    if (had || restoreFocus) canvas.focus({ preventScroll: true });
  }
  function openPop(key) {
    closePhoto(false);
    closeAlbum(false);
    if (!['enterprise', 'enterpriseD'].includes(key)) restoreShipView();
    if (!popEl) {
      popEl = document.createElement('div'); popEl.className = 'pop-card'; popEl.setAttribute('role', 'region'); popEl.hidden = true;
      popClose = document.createElement('button'); popClose.type = 'button'; popClose.className = 'card-x'; popClose.textContent = '×';
      popClose.addEventListener('click', () => closePop(true));
      popBody = document.createElement('a'); popBody.className = 'pop-body'; popBody.rel = 'noopener';
      popImg = document.createElement('img'); popImg.className = 'pop-img'; popImg.decoding = 'async';
      popTitle = document.createElement('h3'); popTitle.className = 'pop-title';
      popText = document.createElement('p'); popText.className = 'pop-text';
      popTimeline = document.createElement('ol'); popTimeline.className = 'pop-timeline'; popTimeline.hidden = true;
      popEl.addEventListener('pointerenter', stopAutoCard);
      popEl.addEventListener('pointerleave', () => { if (popKey && !['rack', 'enterprise', 'enterpriseD'].includes(popKey)) startAutoCard(() => closePop(false)); });
      popBody.append(popImg, popTitle, popText, popTimeline);
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
    }
    clearTimeout(popTimer);
    stopAutoCard();
    popKey = key;
    popEl.classList.toggle('rack-card', key === 'rack');
    popEl.classList.toggle('ship-card', ['enterprise', 'enterpriseD'].includes(key));
    fillPop();
    popEl.hidden = false;
    popEl.inert = false;
    stage.classList.add('card-open');
    updatePop();
    void popEl.offsetWidth;
    popEl.classList.add('on');
    if (['enterprise', 'enterpriseD'].includes(key)) { stage.classList.add('ship-focused'); focusShip(key); }
    popClose.focus({ preventScroll: true });
    if (!['rack', 'enterprise', 'enterpriseD'].includes(key)) startAutoCard(() => closePop(false));
  }
  function togglePop(key) {
    if (popKey === key) closePop(true);
    else openPop(key);
  }
  function updatePop() {
    if (!popEl || popEl.hidden || !popKey) return;
    if (!popAllowed(openId, popKey)) closePop(false);
  }
  new ResizeObserver(resize).observe(stage); resize();
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
  let albumOpen = false, albumIndex = 0;
  let albumModal = null, albumBook = null, albumSpread = null, albumLightbox = null;
  let albumPageLeft = null, albumPageRight = null, albumCounterEl = null, albumTagEl = null, albumHintEl = null;
  let albumPrevBtn = null, albumNextBtn = null, albumCloseBtn = null, albumLightboxClose = null;
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
    header.append(albumTagEl, albumCounterEl);

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
    closePhoto(false); closePop(false);
    albumReturnFocus = document.activeElement;
    buildAlbumModal(); clearTimeout(albumTimer);
    albumOpen = true; albumModal.hidden = false; albumModal.inert = false;
    stage.classList.add('album-open');
    updateAlbumView();
    void albumModal.offsetWidth; albumModal.classList.add('on');
    albumCloseBtn.focus({ preventScroll: true });
  }

  function closeAlbum(restoreFocus = false) {
    if (!albumModal || !albumOpen) return;
    if (!albumLightbox.hidden) { albumLightbox.hidden = true; albumBook.inert = false; }
    albumOpen = false; albumModal.classList.remove('on'); albumModal.inert = true;
    stage.classList.remove('album-open'); clearTimeout(albumTimer);
    const had = albumModal.contains(document.activeElement);
    if (reduced) albumModal.hidden = true;
    else albumTimer = setTimeout(() => { if (!albumOpen) albumModal.hidden = true; }, 260);
    if (had || restoreFocus) (albumReturnFocus?.isConnected ? albumReturnFocus : canvas).focus({ preventScroll: true });
  }

  function toggleAlbum() {
    if (albumOpen) closeAlbum(true);
    else openAlbum();
  }

  // Pointer: drag turns the model freely, right/middle/Shift/Space-drag pans, two fingers (or wheel) zoom.
  // (or plays the hidden cellar machine). Touch rule: a one-finger drag that starts mostly vertical is left to the page scroll;
  // one that starts mostly horizontal locks as an orbit (azimuth and elevation); two fingers always orbit and pinch.
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const hits = Object.values(rooms).map(r => r.hit);
  const ndc = e => { const b = canvas.getBoundingClientRect(); return ptr.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); };
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
  const hoverObject = n => {
    if (openId === 'about') {
      const ph = photoHit(n);
      if (ph === 'photo' && photo) return { key: 'photo', anchor: photo.anchor };
      const alb = albumHit(n);
      if (alb) return { key: 'album', anchor: alb.anchor };
      const tr = trophyHit(n);
      if (tr?.project) return { key: tr.project, anchor: tr.anchor };
      const st = storyHit(n);
      if (st) return { key: 'story', anchor: st };
    }
    if (openId === 'writing') {
      const ph = photoHit(n);
      if (ph === 'speaking' && speakingPhoto) return { key: 'speaking', anchor: speakingPhoto.anchor };
    }
    if (openId === 'projects' || openId === 'ai' || openId === 'writing') {
      const pr = projectHit(n);
      if (pr) return { key: pr.userData.project, anchor: pr.userData.anchor };
    }
    return null;
  };
  function updateHoverTip() {
    if (!hoverTarget || drag || !openId) { hoverTip.hidden = true; return; }
    const label = t(curLang, `model.spots.${hoverTarget.key}`) || t(curLang, `model.projectCards.${hoverTarget.key}.title`);
    if (!label || typeof label !== 'string') { hoverTip.hidden = true; return; }
    hoverTarget.anchor.getWorldPosition(hoverV);
    hoverV.project(camera);
    const tx = (hoverV.x * 0.5 + 0.5) * stageW;
    const ty = (-hoverV.y * 0.5 + 0.5) * stageH;
    hoverTip.textContent = label;
    hoverTip.style.left = `${Math.min(Math.max(tx, 64), stageW - 64)}px`;
    hoverTip.style.top = `${Math.max(88, ty - 14)}px`;
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
      if (e.target === canvas) e.preventDefault();
    }
  });
  addEventListener('keyup', e => { if (e.code === 'Space') spaceDown = false; });
  const pinchState = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && ![0, 1, 2].includes(e.button)) return;
    hoverTip.hidden = true;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (pts.size === 1) {
      const pan = panMode || (e.pointerType === 'mouse' && (e.button === 2 || e.button === 1 || e.shiftKey || e.ctrlKey || e.altKey || spaceDown));
      drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, btn: e.button, mode: pan ? 'pan' : e.pointerType === 'touch' ? 'pending' : 'orbit' };
    } else if (pts.size === 2 && drag) { drag.moved = true; drag.mode = 'pinch'; drag.p = pinchState(); }
    canvas.style.cursor = drag?.mode === 'pan' ? 'move' : 'grabbing';
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
    } else if (e.target === canvas && !drag) {
      const n = ndc(e);
      hoverTarget = e.pointerType === 'mouse' ? hoverObject(n) : null;
      const overObj = egg.hit(n) || !!hoverTarget;
      hoverId = !openId && !overObj ? pick(e) : null;
      canvas.style.cursor = panMode ? 'move' : hoverId || overObj ? 'pointer' : 'grab';
      updateHoverTip();
    } else if (!drag) {
      hoverTarget = null; hoverTip.hidden = true;
    }
  });
  const endPointer = (e, cancelled) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (drag && pts.size === 0) {
      if (!cancelled && !drag.moved && e.target === canvas && drag.btn === 0) {
        const proj = (openId === 'projects' || openId === 'ai' || openId === 'writing') ? projectHit(ndc(e)) : null;
        const trophy = openId === 'about' ? trophyHit(ndc(e)) : null;
        const stAnchor = openId === 'about' ? storyHit(ndc(e)) : null;
        const albHit = openId === 'about' ? albumHit(ndc(e)) : null;
        const pHit = photoHit(ndc(e));
        if (egg.hit(ndc(e))) egg.play();
        else if (albHit) toggleAlbum();
        else if (openId === 'about' && pHit === 'photo') togglePhoto('photo');
        else if (openId === 'writing' && pHit === 'speaking') togglePhoto('speaking');
        else if (trophy?.project) togglePop(trophy.project);
        else if (stAnchor) togglePop('story');
        else if (proj) togglePop(proj.userData.project);
        else onPick(pick(e));
      }
      drag = null; canvas.style.cursor = panMode ? 'move' : 'grab';
    } else if (drag && drag.mode === 'pinch' && pts.size === 1) { drag.mode = 'orbit'; const [r] = [...pts.values()]; drag.x = r.x; drag.y = r.y; }
  };
  addEventListener('pointerup', e => endPointer(e, false));
  addEventListener('pointercancel', e => endPointer(e, true));   // the browser took over (vertical page scroll)
  canvas.addEventListener('pointerleave', () => { hoverId = null; hoverTarget = null; hoverTip.hidden = true; });
  // Touch: once a gesture is an orbit or a pinch, keep the page from scrolling under it.
  canvas.addEventListener('touchmove', e => { if (e.cancelable && (e.touches.length > 1 || drag?.mode === 'pan' || drag?.mode === 'orbit' || drag?.mode === 'pinch')) e.preventDefault(); }, { passive: false });
  // Wheel zoom (and horizontal trackpad swipe pan), only over the canvas, without ctrl/cmd.
  canvas.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey || document.documentElement.scrollHeight > innerHeight + 4) return;
    e.preventDefault();
    if (Math.abs(e.deltaX) > 2 && Math.abs(e.deltaX) >= Math.abs(e.deltaY)) panBy(-e.deltaX * 0.8, 0, false);
    else zoomBy(Math.exp(e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)), false);
  }, { passive: false });
  // Keyboard, when the canvas has focus. Shift + Arrow keys pan; Arrow keys orbit.
  canvas.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const S = 0.14, P = 48; let used = true;
    switch (e.key) {
      case 'ArrowLeft': if (e.shiftKey || panMode) panBy(P, 0); else orbit(-S, 0); break;
      case 'ArrowRight': if (e.shiftKey || panMode) panBy(-P, 0); else orbit(S, 0); break;
      case 'ArrowUp': if (e.shiftKey || panMode) panBy(0, P); else orbit(0, -S); break;
      case 'ArrowDown': if (e.shiftKey || panMode) panBy(0, -P); else orbit(0, S); break;
      case '+': case '=': zoomBy(0.85); break;
      case '-': case '_': zoomBy(1 / 0.85); break;
      case 'Home': case '0': resetView(); break;
      default: used = false;
    }
    if (used) e.preventDefault();
  });

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(stage);

  const v3 = new THREE.Vector3(); let last = performance.now();
  // Hotspots follow their objects. Where two would overlap, the later one moves down by its own height,
  // and none may sit under the text panel, so every label stays readable at any stage width.
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
    const pr = panelEl && !panelEl.hidden ? { l: panelEl.offsetLeft, r: panelEl.offsetLeft + panelEl.offsetWidth, t: panelEl.offsetTop, b: panelEl.offsetTop + panelEl.offsetHeight } : null;
    for (const s of live) {
      let l = s.px - s.w / 2, b = s.py;
      if (pr && l < pr.r + GAP && l + s.w > pr.l && b > pr.t && b - s.h < pr.b) l = pr.r + GAP;
      l = Math.min(Math.max(l, GAP), stageW - s.w - GAP);
      for (let n = 0; n < 8; n++) {
        const hit = placed.find(p => l < p.l + p.w + GAP && p.l < l + s.w + GAP && b - s.h < p.b + GAP && p.b - p.h < b + GAP);
        if (!hit) break;
        b = hit.b + GAP + s.h;
      }
      b = Math.min(Math.max(b, phone() ? s.h + 8 : 88 + s.h), phone() ? stageH - 12 : stageH - 124);   // keep clear of header, room bar & footer strip
      placed.push({ l, b, w: s.w, h: s.h });
      s.el.style.left = `${l + s.w / 2}px`; s.el.style.top = `${b}px`;
    }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 2.6);
    view.az += (goal.az - view.az) * k; view.el += (goal.el - view.el) * k; view.dist += (goal.dist - view.dist) * k; view.t.lerp(goal.t, k); clampTarget(view.t);
    const ce = Math.cos(view.el), se = Math.sin(view.el), sa = Math.sin(view.az), ca = Math.cos(view.az);
    camera.position.set(view.t.x + view.dist * ce * sa, view.t.y + view.dist * se, view.t.z + view.dist * ce * ca);
    camera.up.set(-se * sa, ce, -se * ca);                    // tangent of the elevation arc: no flip or jump at the poles
    camera.lookAt(view.t);
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
    updateHoverTip();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    open(id, { keepView = false } = {}) {
      if (shipFocus) closePop(false);
      openId = id; hoverId = null; hoverTarget = null; hoverTip.hidden = true;
      if (id !== 'about' && currentPhotoKey === 'photo') closePhoto(false);
      if (id !== 'writing' && currentPhotoKey === 'speaking') closePhoto(false);
      if (id !== 'about') closeAlbum(false);
      if (popKey && !popAllowed(id, popKey)) closePop(false);
      if (!keepView) { custom = false; zoom = 1; panOffset.set(0, 0, 0); egg.close(); }
      setGoal();
    },
    hover(id) { hoverId = id; },
    setPanMode(on) { panMode = Boolean(on); canvas.classList.toggle('panning', panMode); if (!drag) canvas.style.cursor = panMode ? 'move' : 'grab'; return panMode; },
    getPanMode: () => panMode,
    reset: resetView,
    closeNote() {
      const had = egg.isOpen || pOpen || Boolean(popKey) || albumOpen;
      egg.close(true); closePhoto(true); closePop(true); closeAlbum(true);
      return had;
    },
    isCustom: () => custom,
    setLanguage(l) { curLang = l; setModelLanguage(l); labelSpots(); egg.setLanguage(l); labelPhoto(); fillPop(); if (albumModal && albumOpen) updateAlbumView(); updateHoverTip(); },
    ...(import.meta.env.DEV ? { debug: { camera, view, goal, egg, cellar, get custom() { return custom; }, get zoom() { return zoom; } } } : {}),
  };
}
