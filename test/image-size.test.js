import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { readImageSize } from "../src/lib/image-size.js";

test("readImageSize reads a JPEG start-of-frame marker", () => {
  const jpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x2c, 0x01, 0x90, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11,
    0x00, 0x03, 0x11, 0x00,
  ]);
  assert.deepEqual(readImageSize(jpeg), { width: 400, height: 300, type: "image/jpeg" });
});

test("readImageSize reads the published logo", () => {
  const logo = fs.readFileSync(
    new URL("../src/assets/img/green-garden-lawn-care-logo.jpg", import.meta.url),
  );
  const size = readImageSize(logo);
  assert.equal(size.type, "image/jpeg");
  assert.equal(size.width >= 200, true);
  assert.equal(size.height >= 200, true);
});

test("readImageSize reads the holiday share photo", () => {
  const photo = fs.readFileSync(
    new URL(
      "../src/assets/img/starry-night-two-story-home-with-multicolor-holiday-lights.jpg",
      import.meta.url,
    ),
  );
  const size = readImageSize(photo);
  assert.equal(size.type, "image/jpeg");
  assert.equal(size.width >= 200, true);
  assert.equal(size.height >= 200, true);
});
