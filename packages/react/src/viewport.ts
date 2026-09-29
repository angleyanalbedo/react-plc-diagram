import type { OpenPlcBounds, OpenPlcPoint } from "@react-plc-diagram/core";

export interface ViewportSize {
  width: number;
  height: number;
}

export interface DiagramViewport {
  x: number;
  y: number;
  scale: number;
}

export const MIN_VIEWPORT_SCALE = 0.1;
export const MAX_VIEWPORT_SCALE = 8;
export const FIT_PADDING = 24;

const positive = (value: number): number => Math.max(value, 1);

export function clampViewportScale(
  scale: number,
  minScale = MIN_VIEWPORT_SCALE,
  maxScale = MAX_VIEWPORT_SCALE,
): number {
  const lower = Math.max(Number.EPSILON, Math.min(minScale, maxScale));
  const upper = Math.max(lower, Math.max(minScale, maxScale));
  return Math.min(upper, Math.max(lower, scale));
}

export function fitDiagramViewport(
  bounds: OpenPlcBounds,
  size: ViewportSize,
  padding = FIT_PADDING,
  minScale = MIN_VIEWPORT_SCALE,
  maxScale = MAX_VIEWPORT_SCALE,
): DiagramViewport {
  const availableWidth = Math.max(1, size.width - padding * 2);
  const availableHeight = Math.max(1, size.height - padding * 2);
  const scale = clampViewportScale(
    Math.min(availableWidth / positive(bounds.width), availableHeight / positive(bounds.height)),
    minScale,
    maxScale,
  );

  return {
    x: bounds.x + bounds.width / 2 - size.width / scale / 2,
    y: bounds.y + bounds.height / 2 - size.height / scale / 2,
    scale,
  };
}

export function resetDiagramViewport(
  bounds: OpenPlcBounds,
  size: ViewportSize,
  minScale = MIN_VIEWPORT_SCALE,
  maxScale = MAX_VIEWPORT_SCALE,
): DiagramViewport {
  const scale = clampViewportScale(1, minScale, maxScale);
  return {
    x: bounds.x + bounds.width / 2 - size.width / scale / 2,
    y: bounds.y + bounds.height / 2 - size.height / scale / 2,
    scale,
  };
}

export function panDiagramViewport(
  viewport: DiagramViewport,
  delta: OpenPlcPoint,
): DiagramViewport {
  return {
    ...viewport,
    x: viewport.x - delta.x / viewport.scale,
    y: viewport.y - delta.y / viewport.scale,
  };
}

export function zoomDiagramViewportAt(
  viewport: DiagramViewport,
  point: OpenPlcPoint,
  factor: number,
  minScale = MIN_VIEWPORT_SCALE,
  maxScale = MAX_VIEWPORT_SCALE,
): DiagramViewport {
  const scale = clampViewportScale(viewport.scale * factor, minScale, maxScale);
  const worldX = viewport.x + point.x / viewport.scale;
  const worldY = viewport.y + point.y / viewport.scale;

  return {
    x: worldX - point.x / scale,
    y: worldY - point.y / scale,
    scale,
  };
}

export function resizeDiagramViewport(
  viewport: DiagramViewport,
  previousSize: ViewportSize,
  nextSize: ViewportSize,
): DiagramViewport {
  const centerX = viewport.x + previousSize.width / viewport.scale / 2;
  const centerY = viewport.y + previousSize.height / viewport.scale / 2;
  return {
    ...viewport,
    x: centerX - nextSize.width / viewport.scale / 2,
    y: centerY - nextSize.height / viewport.scale / 2,
  };
}

