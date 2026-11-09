import test from "node:test";
import assert from "node:assert/strict";
import { brightnessAt, shouldTwinkle } from "../src/assets/js/hero-lights.js";

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
