import test from "node:test";
import assert from "node:assert/strict";
import {
  brightnessAt,
  findBulbs,
  mapCoverPoint,
  shouldPlay,
  shouldTwinkle,
  startHeroLights,
} from "../src/assets/js/hero-lights.js";

test("twinkle runs only for the holiday hero when motion is allowed", () => {
  assert.equal(shouldTwinkle({ season: "holiday", reducedMotion: false }), true);
  assert.equal(shouldTwinkle({ season: "standard", reducedMotion: false }), false);
  assert.equal(shouldTwinkle({ season: "holiday", reducedMotion: true }), false);
  assert.equal(shouldTwinkle({ season: "standard", reducedMotion: true }), false);
});

test("brightness stays full and winks briefly", () => {
  assert.equal(brightnessAt(0, 0, 2000), 1);
  assert.ok(Math.abs(brightnessAt(1000, 0, 2000) - 0.55) < 1e-8);
  assert.ok(Math.abs(brightnessAt(0, 1000, 2000) - 0.55) < 1e-8);
  for (let time = 0; time <= 4000; time += 125) {
    const value = brightnessAt(time, 250, 1800);
    assert.ok(value >= 0.55 && value <= 1);
  }
  const quarter = brightnessAt(500, 0, 2000);
  assert.ok(quarter > 0.85);
});

test("mapCoverPoint follows object-fit cover at 70% 40%", () => {
  const point = mapCoverPoint(200, 100, 100, 100, 0.7, 0.4, 100, 50);
  assert.equal(point.x, 30);
  assert.equal(point.y, 50);
});

function bitmap(width, height, paint) {
  const data = new Uint8ClampedArray(width * height * 4);
  const set = (x, y, r, g, b) => {
    const index = (y * width + x) * 4;
    data[index] = r;
    data[index + 1] = g;
    data[index + 2] = b;
    data[index + 3] = 255;
  };
  paint(set);
  return { data, width, height };
}

function fill(set, x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) set(x, y, color[0], color[1], color[2]);
  }
}

test("findBulbs keeps small colored lamps and rejects floods, windows, and stars", () => {
  const picture = bitmap(120, 80, (set) => {
    fill(set, 2, 2, 5, 5, [255, 0, 0]);
    fill(set, 22, 2, 5, 5, [0, 255, 0]);
    fill(set, 42, 2, 5, 5, [0, 0, 255]);
    fill(set, 62, 2, 5, 5, [255, 255, 0]);
    set(2, 18, 255, 0, 0);
    set(3, 18, 255, 0, 0);
    fill(set, 70, 30, 40, 30, [255, 180, 40]);
    fill(set, 0, 40, 30, 20, [255, 255, 255]);
    set(110, 2, 255, 255, 255);
  });
  const bulbs = findBulbs(picture).sort((a, b) => a.x - b.x);
  assert.equal(bulbs.length, 4);
  const expected = [
    [4, 4],
    [24, 4],
    [44, 4],
    [64, 4],
  ];
  const radius = Math.hypot(2, 2) * 1.8;
  for (let index = 0; index < expected.length; index += 1) {
    assert.ok(Math.abs(bulbs[index].x - expected[index][0]) < 1e-9);
    assert.ok(Math.abs(bulbs[index].y - expected[index][1]) < 1e-9);
    assert.ok(Math.abs(bulbs[index].radius - radius) < 1e-9);
  }
});

test("findBulbs ignores a flat warm wall and keeps a lamp on it", () => {
  const picture = bitmap(40, 30, (set) => {
    fill(set, 0, 0, 40, 30, [230, 210, 180]);
    fill(set, 18, 13, 4, 4, [255, 40, 40]);
  });
  const bulbs = findBulbs(picture);
  assert.equal(bulbs.length, 1);
  assert.ok(bulbs[0].x > 18 && bulbs[0].x < 22);
  assert.ok(bulbs[0].y > 13 && bulbs[0].y < 17);
});

test("findBulbs ignores textured cream brick and warm concrete", () => {
  const picture = bitmap(48, 36, (set) => {
    for (let y = 0; y < 36; y += 1) {
      for (let x = 0; x < 48; x += 1) {
        const brick = (x + y) % 2 === 0 ? [230, 180, 145] : [205, 155, 120];
        set(x, y, brick[0], brick[1], brick[2]);
      }
    }
    fill(set, 8, 8, 4, 4, [255, 30, 30]);
    fill(set, 30, 22, 4, 4, [40, 40, 255]);
  });
  const bulbs = findBulbs(picture).sort((a, b) => a.x - b.x);
  assert.equal(bulbs.length, 2);
  assert.ok(bulbs[0].x > 8 && bulbs[0].x < 12);
  assert.ok(bulbs[0].y > 8 && bulbs[0].y < 12);
  assert.ok(bulbs[1].x > 30 && bulbs[1].x < 34);
  assert.ok(bulbs[1].y > 22 && bulbs[1].y < 26);
});

test("findBulbs splits an elongated strand at its brightness peaks", () => {
  const strand = bitmap(60, 5, (set) => {
    fill(set, 0, 0, 60, 5, [180, 0, 0]);
    for (const x of [5, 30, 54]) fill(set, x, 0, 1, 5, [255, 0, 0]);
  });
  const bulbs = findBulbs(strand).sort((a, b) => a.x - b.x);
  assert.equal(bulbs.length, 3);
  assert.deepEqual(bulbs.map((bulb) => bulb.x), [5, 30, 54]);
  for (const bulb of bulbs) assert.equal(bulb.y, 2);
});

test("playback pauses while the tab is hidden or the hero is off screen", () => {
  assert.equal(shouldPlay({ hidden: false, visible: true }), true);
  assert.equal(shouldPlay({ hidden: true, visible: true }), false);
  assert.equal(shouldPlay({ hidden: false, visible: false }), false);
});

test("startHeroLights does not look for a hero when twinkle is off", () => {
  for (const [season, reducedMotion] of [["standard", false], ["holiday", true]]) {
    let queried = false;
    const doc = {
      body: { dataset: { season } },
      querySelector() {
        queried = true;
        return null;
      },
    };
    const win = { matchMedia: () => ({ matches: reducedMotion }) };
    startHeroLights(doc, win);
    assert.equal(queried, false);
  }
});

test("startHeroLights does nothing when the holiday page has no hero image", () => {
  const doc = {
    body: { dataset: { season: "holiday" } },
    querySelector() {
      return null;
    },
  };
  const win = { matchMedia: () => ({ matches: false }) };
  assert.doesNotThrow(() => startHeroLights(doc, win));
});
