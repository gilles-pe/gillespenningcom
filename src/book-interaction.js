// Physical book removal without a card (D-114). The 3D mesh stays in the scene: first click frames it,
// then clicks on the book show cover, spine and back, and the fourth puts it back on its shelf.
import * as THREE from 'three';
import catalog from './data/books.json';
import { personalBookNote } from './book-note-layout.js';
import { showLargeBookCover, releaseLargeBookCover, setBookJacketLanguage } from './book-jackets.js';

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
  en: { front: 'cover', spine: 'spine', back: 'back' },
  de: { front: 'Cover', spine: 'Rücken', back: 'Rückseite' },
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
  let amazonLink = null;
  let status = null;                                         // visually hidden: the book and its face for screen readers
  let currentLanguage = language === 'de' ? 'de' : 'en';
  setBookJacketLanguage(currentLanguage);

  // No visible card (D-114): the book itself is the interface. A polite live region names it for assistive technology.
  function announce() {
    if (!selected?.extracted) { if (status) status.textContent = ''; if (amazonLink) amazonLink.hidden = true; return; }
    if (!status) {
      status = document.createElement('p');
      status.className = 'book-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      stage.append(status);
    }
    const { book, face } = selected;
    if (face === 'back' && /^https:\/\//i.test(book.amazonUrl || '')) {
      if (!amazonLink) {
        amazonLink = document.createElement('a');
        amazonLink.className = 'book-amazon-access';
        amazonLink.textContent = 'Book on Amazon';
        amazonLink.target = '_blank';
        amazonLink.rel = 'noopener noreferrer';
        stage.append(amazonLink);
      }
      amazonLink.href = book.amazonUrl;
      amazonLink.hidden = false;
    } else if (amazonLink) amazonLink.hidden = true;
    const note = face === 'back' ? personalBookNote(book, currentLanguage) : null;
    const credit = currentLanguage === 'de' ? 'Persönliche Leseempfehlung von Gilles Penning' : 'Personal reading note by Gilles Penning';
    status.textContent = `${book.title}, ${book.author} - ${labels[currentLanguage][face]}` + (note ? `. ${credit}: ${note}` : '');
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
    // Lying books share the true head axis (-Z) across front (+Y), spine (-X), and back (-Y)
    // so clicks turn cleanly 90° around -Z instead of tumbling diagonally; keep book-jackets.js flip180 in step.
    const up = flat ? FORWARD.clone().negate() : VERTICAL.clone();
    if (face === 'spine') return { normal: flat ? FRONT.clone().negate() : FORWARD.clone(), up };
    const normal = flat ? VERTICAL.clone() : FRONT.clone();
    if (face === 'back') normal.negate();
    return { normal, up };
  }
  function showFace(face) {
    if (!selected || !selected.extracted || !['front', 'spine', 'back'].includes(face)) return;
    selected.face = face;
    announce(); markDirty();
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
    announce();
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
    if (!selected) return false;
    const s = selected;
    releaseLargeBookCover(s.id);
    if (immediate || reduced || !s.extracted) {
      s.mesh.position.copy(s.originPosition);
      s.mesh.quaternion.copy(s.originQuaternion);
      selected = null;
    } else {
      s.extracted = false;
      s.returning = true;
    }
    if (status) status.textContent = '';
    if (amazonLink) amazonLink.hidden = true;
    markDirty();
    return true;
  }
  function setLanguage(next) {
    currentLanguage = next === 'de' ? 'de' : 'en';
    setBookJacketLanguage(currentLanguage);
    announce(); markDirty();
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
