import test from "node:test";
import assert from "node:assert/strict";
import { brightnessAt, mapCoverPoint, shouldTwinkle } from "../src/assets/js/hero-lights.js";

test("twinkle runs only for the holiday hero when motion is allowed", () => {
  assert.equal(shouldTwinkle({ season: "holiday", reducedMotion: false }), true);
  assert.equal(shouldTwinkle({ season: "standard", reducedMotion: false }), false);
  assert.equal(shouldTwinkle({ season: "holiday", reducedMotion: true }), false);
  assert.equal(shouldTwinkle({ season: "standard", reducedMotion: true }), false);
});

test("brightness follows the sine ease from full to half", () => {
  assert.equal(brightnessAt(0, 0, 2000), 1);
  assert.ok(Math.abs(brightnessAt(1000, 0, 2000) - 0.5) < 1e-10);
  assert.equal(brightnessAt(0, 0, 2000), 1);
  assert.ok(Math.abs(brightnessAt(0, 1000, 2000) - 0.5) < 1e-10);
  for (let time = 0; time <= 4000; time += 125) {
    const value = brightnessAt(time, 250, 1800);
    assert.ok(value >= 0.5 && value <= 1);
  }
});

test("mapCoverPoint follows object-fit cover at 70% 40%", () => {
  const point = mapCoverPoint(200, 100, 100, 100, 0.7, 0.4, 100, 50);
  assert.equal(point.x, 30);
  assert.equal(point.y, 50);
});
