// Shared camera math: no DOM or renderer, so framing can be checked independently.
export const ZOOM_MIN = 0.015;
export const ZOOM_MAX = 1.8;
export const clampZoom = value => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
export const zoomToSlider = zoom => 100 * Math.log(ZOOM_MAX / clampZoom(zoom)) / Math.log(ZOOM_MAX / ZOOM_MIN);
export const sliderToZoom = value => ZOOM_MAX * (ZOOM_MIN / ZOOM_MAX) ** (Math.max(0, Math.min(100, value)) / 100);

export function inspectionPose({ min, max, az, el, fov, width, height, captionHeight = 0 }) {
  const centre = min.map((v, i) => (v + max[i]) / 2);
  const right = [Math.cos(az), 0, -Math.sin(az)];
  const up = [-Math.sin(el) * Math.sin(az), Math.cos(el), -Math.sin(el) * Math.cos(az)];
  const forward = [-Math.cos(el) * Math.sin(az), -Math.sin(el), -Math.cos(el) * Math.cos(az)];
  const tv = Math.tan(fov * Math.PI / 360), th = tv * width / height;
  const pad = Math.min(16, width * 0.05, height * 0.05);
  const left = -1 + 2 * pad / width, rightEdge = 1 - 2 * pad / width;
  const top = 1 - 2 * pad / height;
  const bottom = 1 - 2 * Math.max(pad + 48, height - captionHeight - 2 * pad) / height;
  const cx = (left + rightEdge) / 2, cy = (top + bottom) / 2;
  const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  let distance = 0.7;
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
    const delta = [x, y, z].map((v, i) => v - centre[i]);
    const px = dot(delta, right) / th, py = dot(delta, up) / tv, depth = dot(delta, forward);
    distance = Math.max(distance,
      (px - rightEdge * depth) / (rightEdge - cx), (left * depth - px) / (cx - left),
      (py - top * depth) / (top - cy), (bottom * depth - py) / (cy - bottom));
  }
  distance *= 1.08;
  const target = centre.map((v, i) => v - right[i] * cx * distance * th - up[i] * cy * distance * tv);
  return { target, distance, rect: { left, right: rightEdge, top, bottom } };
}
