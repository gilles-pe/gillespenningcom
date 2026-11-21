// Physical book removal and compact catalog card. The 3D mesh stays in the scene:
// first click frames it, second lifts and turns it; closing returns it to its shelf.
import * as THREE from 'three';
import catalog from './data/books.json';
import { showLargeBookCover, releaseLargeBookCover } from './book-jackets.js';

const byId = new Map(catalog.books.map(book => [book.id, book]));
const VERTICAL = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(0, 0, 1);
const FRONT = new THREE.Vector3(1, 0, 0);
// Pull clear of the cabinet front before turning the cover: metres in scene units.
const SHELF_PULL = 0.30;
const HAND_PULL = 0.12;
const HAND_RISE = 0.09;
const easeOut = progress => 1 - (1 - progress) ** 3;
const smoothStep = progress => { const x = THREE.MathUtils.clamp(progress, 0, 1); return x * x * (3 - 2 * x); };

const labels = {
  en: { shelf: 'From the bookshelf', close: 'Return book', front: 'Cover', spine: 'Spine', back: 'Back', return: 'Return to shelf', shop: 'View edition' },
  de: { shelf: 'Aus dem Bücherregal', close: 'Buch zurückstellen', front: 'Cover', spine: 'Rücken', back: 'Rückseite', return: 'Zurück ins Regal', shop: 'Ausgabe ansehen' },
};

function targetOrientation(normal, up, towardsCamera, cameraUp) {
  const q = new THREE.Quaternion().setFromUnitVectors(normal, towardsCamera);
  const currentUp = up.clone().applyQuaternion(q).addScaledVector(towardsCamera, -up.clone().applyQuaternion(q).dot(towardsCamera)).normalize();
  const wantedUp = cameraUp.clone().addScaledVector(towardsCamera, -cameraUp.dot(towardsCamera)).normalize();
  const cross = new THREE.Vector3().crossVectors(currentUp, wantedUp);
  const angle = Math.atan2(cross.dot(towardsCamera), currentUp.dot(wantedUp));
  return new THREE.Quaternion().setFromAxisAngle(towardsCamera, angle).multiply(q);
}
export function createBookInteraction({ stage, scene, camera, reduced, language, onReturn, markDirty }) {
  const meshes = new Map();
  scene.traverse(object => {
    if (object.isMesh && object.userData.bookId) meshes.set(object.userData.bookId, object);
  });

  let selected = null;
  let card = null, kicker, heading, author, summary, closeBtn, returnBtn, shopBtn, faceButtons = [];
  let currentLanguage = language === 'de' ? 'de' : 'en';

  function ensureCard() {
    if (card) return;
    card = document.createElement('section');
    card.className = 'book-inspector-card';
    card.hidden = true;
    card.inert = true;
    card.setAttribute('role', 'region');
    closeBtn = document.createElement('button');
    closeBtn.type = 'button'; closeBtn.className = 'card-x book-inspector-close'; closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => onReturn?.());

    kicker = document.createElement('div'); kicker.className = 'book-inspector-kicker';
    heading = document.createElement('h3'); heading.className = 'book-inspector-title';
    author = document.createElement('p'); author.className = 'book-inspector-author';
    summary = document.createElement('p'); summary.className = 'book-inspector-summary';

    const actions = document.createElement('div'); actions.className = 'book-inspector-faces';
    for (const face of ['front', 'spine', 'back']) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'book-inspector-action';
      button.dataset.bookFace = face;
      button.addEventListener('click', () => showFace(face));
      faceButtons.push(button);
      actions.append(button);
    }
    const footer = document.createElement('div'); footer.className = 'book-inspector-footer';
    returnBtn = document.createElement('button'); returnBtn.type = 'button'; returnBtn.className = 'book-inspector-return';
    returnBtn.addEventListener('click', () => onReturn?.());
    shopBtn = document.createElement('a'); shopBtn.className = 'book-inspector-link';
    shopBtn.target = '_blank'; shopBtn.rel = 'noopener noreferrer';
    footer.append(returnBtn, shopBtn);
    card.append(closeBtn, kicker, heading, author, summary, actions, footer);
    stage.append(card);
  }
  function fillCard() {
    if (!card || !selected) return;
    const text = labels[currentLanguage];
    const { book } = selected;
    card.setAttribute('aria-label', book.title);
    closeBtn.setAttribute('aria-label', text.close);
    kicker.textContent = text.shelf;
    heading.textContent = book.title;
    author.textContent = book.author;
    // These are neutral publisher-based synopses, NOT personal recommendations.
    summary.textContent = book.summary?.[currentLanguage] || book.summary?.en || '';
    summary.hidden = !summary.textContent;
    for (const btn of faceButtons) {
      btn.textContent = text[btn.dataset.bookFace];
      btn.setAttribute('aria-pressed', String(btn.dataset.bookFace === selected.face));
    }
    returnBtn.textContent = text.return;
    shopBtn.textContent = text.shop;
    const link = book.amazonUrl;
    shopBtn.hidden = !(typeof link === 'string' && /^https:\/\//.test(link));
    if (shopBtn.hidden) shopBtn.removeAttribute('href');
    else shopBtn.href = link;
  }
  function hideCard() {
    if (!card) return;
    card.hidden = true;
    card.inert = true;
    card.classList.remove('on');
  }
  function start(id) {
    if (!meshes.has(id) || !byId.has(id)) return null;
    close(true);
    const mesh = meshes.get(id);
    mesh.updateWorldMatrix(true, false);
    selected = {
      id, book: byId.get(id), mesh, face: 'front', extracted: false, returning: false,
      originPosition: mesh.position.clone(), originQuaternion: mesh.quaternion.clone(),
      originWorld: mesh.getWorldPosition(new THREE.Vector3()), progress: 0,
      pull: null, presentation: null, faceDirection: null, cameraUp: null,
    };
    markDirty();
    return mesh;
  }
  function normalAndUp(face, orientation) {
    const flat = orientation === 'horizontal';
    if (face === 'spine') return { normal: FORWARD.clone(), up: flat ? FRONT.clone() : VERTICAL.clone() };
    const normal = flat ? VERTICAL.clone() : FRONT.clone();
    if (face === 'back') normal.negate();
    // BoxGeometry maps the underside's texture in the opposite direction.
    const up = flat && face === 'back' ? FORWARD.clone() : flat ? FORWARD.clone().negate() : VERTICAL.clone();
    return { normal, up };
  }
  function showFace(face) {
    if (!selected || !selected.extracted || !['front', 'spine', 'back'].includes(face)) return;
    selected.face = face;
    fillCard(); markDirty();
  }
  function extract(viewPose = null) {
    if (!selected || selected.returning) return false;
    // First slide the book forwards beyond the shelf's front edge, THEN turn
    // it towards the visitor. Store the direction once so orbiting the camera
    // does not make an extracted book chase it through the room.
    const s = selected;
    s.mesh.parent.updateWorldMatrix(true, false);
    const parentQ = s.mesh.parent.getWorldQuaternion(new THREE.Quaternion());
    const outward = FORWARD.clone().applyQuaternion(parentQ).normalize();
    const eye = viewPose?.eye || camera.position;
    const toEye = eye.clone().sub(s.originWorld).normalize();
    const cameraUp = viewPose?.up
      ? viewPose.up.clone().normalize()
      : VERTICAL.clone().applyQuaternion(camera.quaternion).normalize();
    s.faceDirection = toEye;
    s.cameraUp = cameraUp;
    s.pull = outward.multiplyScalar(SHELF_PULL)
      .addScaledVector(toEye, HAND_PULL)
      .addScaledVector(cameraUp, HAND_RISE);
    s.presentation = s.originWorld.clone().add(s.pull);
    s.extracted = true;
    s.face = 'front';
    showLargeBookCover(s.id);
    ensureCard();
    fillCard();
    card.hidden = false; card.inert = false;
    card.classList.add('on');
    markDirty();
    return true;
  }
  function nextFace() {
    if (!selected?.extracted || selected.returning) return;
    // Four deliberate clicks on the presented book: front, spine, back,
    // then return to its shelf. The initial framing click is separate.
    if (selected.face === 'back') {
      onReturn?.();
      return;
    }
    showFace(selected.face === 'front' ? 'spine' : 'back');
  }
  function update(dt) {
    if (!selected) return false;
    const s = selected, mesh = s.mesh;
    const targetProgress = s.extracted ? 1 : 0;
    const k = reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.05) * 8);
    s.progress = reduced ? targetProgress : THREE.MathUtils.lerp(s.progress, targetProgress, k);
    if (Math.abs(s.progress - targetProgress) < 0.0005) s.progress = targetProgress;

    // The book slides out almost fully before turning - no cover intersects
    // the neighbouring books or the shelf uprights during that motion.
    const pullAmount = easeOut(s.progress);
    const riseAmount = smoothStep(s.progress);
    const turnAmount = smoothStep((s.progress - 0.38) / 0.62);
    const worldTarget = s.originWorld.clone();
    if (s.pull) {
      const horizontal = s.pull.clone().addScaledVector(s.cameraUp, -HAND_RISE);
      worldTarget.addScaledVector(horizontal, pullAmount);
      worldTarget.addScaledVector(s.cameraUp, HAND_RISE * riseAmount);
    }
    mesh.parent.updateWorldMatrix(true, false);
    mesh.position.copy(mesh.parent.worldToLocal(worldTarget));

    const localQ = s.originQuaternion.clone();
    if (s.pull && s.progress > 0) {
      const { normal, up } = normalAndUp(s.face, s.book.placement.orientation);
      const worldQ = targetOrientation(normal, up, s.faceDirection, s.cameraUp);
      const parentQ = mesh.parent.getWorldQuaternion(new THREE.Quaternion());
      const faceQ = parentQ.invert().multiply(worldQ);
      localQ.slerp(faceQ, turnAmount);
    }
    mesh.quaternion.slerp(localQ, reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.05) * 14));
    const turning = 1 - Math.abs(mesh.quaternion.dot(localQ)) > 0.00001;
    const travelling = Math.abs(s.progress - targetProgress) > 0.0005;
    if (!travelling && !turning && s.returning) {
      mesh.position.copy(s.originPosition);
      mesh.quaternion.copy(s.originQuaternion);
      selected = null;
    }
    return travelling || turning;
  }
  function close(immediate = true) {
    if (!selected) { hideCard(); return false; }
    const s = selected;
    releaseLargeBookCover(s.id);
    hideCard();
    if (immediate || reduced || !s.extracted) {
      s.mesh.position.copy(s.originPosition);
      s.mesh.quaternion.copy(s.originQuaternion);
      selected = null;
    } else {
      s.extracted = false;
      s.returning = true;
    }
    markDirty();
    return true;
  }
  function setLanguage(next) {
    currentLanguage = next === 'de' ? 'de' : 'en';
    fillCard();
  }
  return {
    getMesh: id => meshes.get(id),
    getPresentationPoint: () => selected?.presentation?.clone() || null,
    start, extract, nextFace, showFace, update, close, setLanguage,
    isActive: () => !!selected && !selected.returning,
    isFocused: id => !!selected && selected.id === id && !selected.returning,
    isExtracted: () => !!selected?.extracted,
    get activeId() { return selected?.id ?? null; },
    get activeFace() { return selected?.face ?? null; },
    get bookCount() { return meshes.size; },
  };
}
