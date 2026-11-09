export function shouldTwinkle({ season, reducedMotion }) {
  return season === "holiday" && !reducedMotion;
}

export function brightnessAt(timeMs, phaseMs, periodMs) {
  const turns = ((timeMs - phaseMs) / periodMs) * Math.PI * 2;
  const value = 0.75 + 0.25 * Math.cos(turns);
  return Math.min(1, Math.max(0.5, value));
}

export function mapCoverPoint(imageWidth, imageHeight, elementWidth, elementHeight, positionX, positionY, imageX, imageY) {
  const scale = Math.max(elementWidth / imageWidth, elementHeight / imageHeight);
  const originX = (elementWidth - imageWidth * scale) * positionX;
  const originY = (elementHeight - imageHeight * scale) * positionY;
  return {
    x: originX + imageX * scale,
    y: originY + imageY * scale,
  };
}
