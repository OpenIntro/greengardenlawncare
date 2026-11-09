export function shouldTwinkle({ season, reducedMotion }) {
  return season === "holiday" && !reducedMotion;
}

export function brightnessAt(timeMs, phaseMs, periodMs) {
  const turns = ((timeMs - phaseMs) / periodMs) * Math.PI * 2;
  const value = 0.75 + 0.25 * Math.cos(turns);
  return Math.min(1, Math.max(0.5, value));
}
