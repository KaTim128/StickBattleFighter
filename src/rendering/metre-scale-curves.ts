import { GraphicsContextSystem, shapeBuilders } from 'pixi.js';

/**
 * Smooth curves and circles at metre scale (owner, 11/11/2026: "fire effects should look like
 * fire instead of rectangles").
 *
 * The game draws in world metres and the camera scales them up about 50-100 times. Pixi decides
 * how finely to cut curves and circles from their size in drawing units. That suits pixels, but in
 * metres:
 * - a 5 cm ember got four corners (a diamond) and a 30 cm core eight;
 * - bezier flame tongues were only subdivided to within half a metre, so they came out as
 *   straight-edged triangles and boxes.
 *
 * This fixes both once, for the whole game:
 * - circles, ellipses and rounded corners are cut as if they were `CIRCLE_SCALE` times bigger
 *   (the points are built scaled up, then scaled back);
 * - curves are subdivided to within about 1 cm.
 */
const CIRCLE_SCALE = 60;
const CURVE_SMOOTHNESS = 0.99;

let installed = false;

interface RoundShape {
  type: string;
  x: number;
  y: number;
  radius?: number;
  halfWidth?: number;
  halfHeight?: number;
  width?: number;
  height?: number;
}

export function installMetreScaleCurves(): void {
  if (installed) return;
  installed = true;
  GraphicsContextSystem.defaultOptions.bezierSmoothness = CURVE_SMOOTHNESS;
  for (const type of ['circle', 'ellipse', 'roundedRectangle']) {
    const builder = shapeBuilders[type];
    if (!builder) continue;
    const build = builder.build.bind(builder);
    builder.build = (shape, points) => {
      const s = shape as unknown as RoundShape;
      const k = CIRCLE_SCALE;
      const scaled: RoundShape = { ...s, type: s.type, x: s.x * k, y: s.y * k };
      if (s.radius !== undefined) scaled.radius = s.radius * k;
      if (s.halfWidth !== undefined) scaled.halfWidth = s.halfWidth * k;
      if (s.halfHeight !== undefined) scaled.halfHeight = s.halfHeight * k;
      if (s.width !== undefined) scaled.width = s.width * k;
      if (s.height !== undefined) scaled.height = s.height * k;
      // biome-ignore lint/suspicious/noExplicitAny: Pixi's builders take their own shape classes; this plain copy has the same fields.
      const ok = build(scaled as any, points);
      for (let i = 0; i < points.length; i++) points[i]! /= k;
      return ok;
    };
  }
}
