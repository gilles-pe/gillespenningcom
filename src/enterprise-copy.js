export const enterpriseCopy = {
  en: {
    inspect: 'Explore',
    warp: 'Warp',
    reset: 'Reset view',
    close: 'Close',
    hint: 'Drag to rotate · Pinch to zoom · Arrow keys to rotate',
    ready: '',
    departing: 'Warp flight…',
    reduced: 'Reduced motion is enabled. The model stays on its stand.',
    error: 'The model could not open. Please try again.',
    tos: 'Constitution class',
    creditLabel: 'Model',
    credit: 'TOS Enterprise by Raul Mamoru · trekmeshes.ch',
  },
  de: {
    inspect: 'Ansehen',
    warp: 'Warp',
    reset: 'Ansicht zurücksetzen',
    close: 'Schließen',
    hint: 'Ziehen zum Drehen · Zwei Finger zum Zoomen · Pfeiltasten zum Drehen',
    ready: '',
    departing: 'Warpflug…',
    reduced: 'Reduzierte Bewegung ist aktiviert. Das Modell bleibt auf seinem Sockel.',
    error: 'Das Modell konnte nicht geöffnet werden. Bitte erneut versuchen.',
    tos: 'Constitution-Klasse',
    creditLabel: 'Model',
    credit: 'TOS Enterprise von Raul Mamoru · trekmeshes.ch',
  },
};

// Quiet text actions with a single authored line icon, shared by caption and inspector.
export function labelShipAction(button, label, kind) {
  button.className = `ship-action ship-${kind}`;
  const text = document.createElement('span'); text.textContent = label;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.5');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', kind === 'warp' ? 'M5 12h14m-6-6 6 6-6 6' : kind === 'reset' ? 'M5 8a8 8 0 1 1-1 7M5 3v5h5' : 'M7 17 17 7M7 7h10v10');
  svg.append(path); button.replaceChildren(text, svg);
}
