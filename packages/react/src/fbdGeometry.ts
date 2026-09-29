import type { OpenPlcBounds, OpenPlcPin, OpenPlcPoint } from "@react-plc-diagram/core";

const PIN_GAP = 10;

const samePoint = (left: OpenPlcPoint, right: OpenPlcPoint): boolean =>
  left.x === right.x && left.y === right.y;

function distributedPinY(bounds: OpenPlcBounds, index: number, count: number): number {
  if (count === 1) return bounds.y + bounds.height / 2;
  const top = Math.min(30, bounds.height / 2);
  const bottom = Math.max(top, bounds.height - 15);
  return bounds.y + top + (bottom - top) * index / (count - 1);
}

export function normalizeBlockPins(bounds: OpenPlcBounds, pins: OpenPlcPin[]): OpenPlcPin[] {
  const normalized = pins.map((pin) => ({
    ...pin,
    position: {
      x: pin.side === "input" ? bounds.x : bounds.x + bounds.width,
      y: pin.position.y,
    },
  }));

  for (const side of ["input", "output"] as const) {
    const sidePins = normalized.filter((pin) => pin.side === side);
    const sortedY = sidePins.map((pin) => pin.position.y).sort((left, right) => left - right);
    const invalidY = sortedY.some((y) => y < bounds.y || y > bounds.y + bounds.height);
    const overlappingY = sortedY.some((y, index) => index > 0 && y - sortedY[index - 1] < PIN_GAP);
    if (!invalidY && !overlappingY) continue;

    sidePins.forEach((pin, index) => {
      pin.position.y = distributedPinY(bounds, index, sidePins.length);
    });
  }

  return normalized;
}

export function orthogonalPath(
  source: OpenPlcPoint,
  target: OpenPlcPoint,
  originalPoints: OpenPlcPoint[],
): OpenPlcPoint[] {
  if (originalPoints.length >= 2) {
    const adjusted = originalPoints.map((point) => ({ ...point }));
    const originalFirst = originalPoints[0];
    const originalSecond = originalPoints[1];
    const originalBeforeLast = originalPoints[originalPoints.length - 2];
    const originalLast = originalPoints[originalPoints.length - 1];

    adjusted[0] = source;
    adjusted[adjusted.length - 1] = target;
    if (originalFirst.y === originalSecond.y) adjusted[1].y = source.y;
    else adjusted[1].x = source.x;
    if (originalBeforeLast.y === originalLast.y) adjusted[adjusted.length - 2].y = target.y;
    else adjusted[adjusted.length - 2].x = target.x;

    const deduplicated = adjusted.filter(
      (point, index, points) => index === 0 || !samePoint(point, points[index - 1]),
    );
    const remainsOrthogonal = deduplicated.every(
      (point, index, points) => index === 0 || point.x === points[index - 1].x || point.y === points[index - 1].y,
    );
    if (remainsOrthogonal) return deduplicated;
  }

  if (source.y === target.y) return [source, target];
  const middleX = source.x + (target.x - source.x) / 2;
  return [source, { x: middleX, y: source.y }, { x: middleX, y: target.y }, target]
    .filter((point, index, points) => index === 0 || !samePoint(point, points[index - 1]));
}

