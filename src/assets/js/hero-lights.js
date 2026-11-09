export function shouldTwinkle({ season, reducedMotion }) {
  return season === "holiday" && !reducedMotion;
}

export function brightnessAt(timeMs, phaseMs, periodMs, depth = 0.45) {
  const turns = ((timeMs - phaseMs) / periodMs) * Math.PI * 2;
  const wink = (1 - Math.cos(turns)) / 2;
  const value = 1 - depth * wink * wink;
  return Math.min(1, Math.max(1 - depth, value));
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

function hueDistance(hue, center) {
  const distance = Math.abs(hue - center);
  return Math.min(distance, 360 - distance);
}

function isBulbPixel(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  // Cream brick and warm concrete keep every channel high. A lamp drops one channel near zero.
  if (max < 0.55 || delta === 0 || min / max > 0.35) return false;
  const lightness = (max + min) / 2;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  if (saturation < 0.45) return false;
  let hue;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  return hueDistance(hue, 0) <= 25 || hueDistance(hue, 55) <= 25 || hueDistance(hue, 130) <= 35 || hueDistance(hue, 220) <= 40;
}

function bulbFrom(pixels) {
  if (pixels.length < 3 || pixels.length > 400) return null;
  let sumX = 0;
  let sumY = 0;
  for (const pixel of pixels) {
    sumX += pixel.x;
    sumY += pixel.y;
  }
  const x = sumX / pixels.length;
  const y = sumY / pixels.length;
  let farthest = 0;
  for (const pixel of pixels) {
    farthest = Math.max(farthest, Math.hypot(pixel.x - x, pixel.y - y));
  }
  // A real lamp is a small point. Wider patches are lit walls and merged glow.
  if (farthest > 9) return null;
  return { x, y, radius: farthest * 1.8 };
}

function splitByPeaks(pixels, horizontal, minGap, start, end) {
  const length = end - start + 1;
  const projection = new Array(length).fill(0);
  for (const pixel of pixels) {
    const index = (horizontal ? pixel.x : pixel.y) - start;
    projection[index] = Math.max(projection[index], pixel.bright);
  }
  const peaks = [];
  for (let index = 0; index < length; index += 1) {
    const value = projection[index];
    if (value <= 0) continue;
    const left = index === 0 ? null : projection[index - 1];
    const right = index === length - 1 ? null : projection[index + 1];
    const higherThanLeft = left === null ? value > right : value >= left;
    const higherThanRight = right === null ? value > left : value > right;
    if (higherThanLeft && higherThanRight) peaks.push(index);
  }
  const kept = [];
  for (const peak of peaks) {
    const last = kept[kept.length - 1];
    if (last === undefined || peak - last >= minGap) kept.push(peak);
    else if (projection[peak] > projection[last]) kept[kept.length - 1] = peak;
  }
  if (kept.length === 0) return [pixels];
  const groups = kept.map(() => []);
  for (const pixel of pixels) {
    const index = (horizontal ? pixel.x : pixel.y) - start;
    let best = 0;
    let bestDistance = Infinity;
    for (let group = 0; group < kept.length; group += 1) {
      const distance = Math.abs(index - kept[group]);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = group;
      }
    }
    groups[best].push(pixel);
  }
  return groups;
}

function bulbsFromCluster(pixels) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const pixel of pixels) {
    minX = Math.min(minX, pixel.x);
    maxX = Math.max(maxX, pixel.x);
    minY = Math.min(minY, pixel.y);
    maxY = Math.max(maxY, pixel.y);
  }
  const spanX = maxX - minX + 1;
  const spanY = maxY - minY + 1;
  const longSide = Math.max(spanX, spanY);
  const shortSide = Math.min(spanX, spanY);
  const groups = longSide > shortSide * 3
    ? splitByPeaks(pixels, spanX >= spanY, shortSide, spanX >= spanY ? minX : minY, spanX >= spanY ? maxX : maxY)
    : [pixels];
  return groups.map(bulbFrom).filter(Boolean);
}

function channelPeak(data, offset) {
  return Math.max(data[offset], data[offset + 1], data[offset + 2]) / 255;
}

function standsOut(data, width, height, x, y) {
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;
  for (let offsetY = -4; offsetY <= 4; offsetY += 1) {
    for (let offsetX = -4; offsetX <= 4; offsetX += 1) {
      const nextX = x + offsetX;
      const nextY = y + offsetY;
      if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
      const offset = (nextY * width + nextX) * 4;
      sumR += data[offset];
      sumG += data[offset + 1];
      sumB += data[offset + 2];
      count += 1;
    }
  }
  const offset = (y * width + x) * 4;
  const distance = Math.hypot(
    data[offset] - sumR / count,
    data[offset + 1] - sumG / count,
    data[offset + 2] - sumB / count,
  );
  return distance >= 28;
}

export function findBulbs(bitmap) {
  const { data, width, height } = bitmap;
  const mask = new Uint8Array(width * height);
  const bright = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (!isBulbPixel(data[offset], data[offset + 1], data[offset + 2])) continue;
      if (!standsOut(data, width, height, x, y)) continue;
      const index = y * width + x;
      mask[index] = 1;
      bright[index] = channelPeak(data, offset);
    }
  }
  const seen = new Uint8Array(width * height);
  const bulbs = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (!mask[start] || seen[start]) continue;
      const pixels = [];
      const stack = [start];
      seen[start] = 1;
      while (stack.length) {
        const index = stack.pop();
        const pixelX = index % width;
        const pixelY = (index - pixelX) / width;
        pixels.push({ x: pixelX, y: pixelY, bright: bright[index] });
        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            if (offsetX === 0 && offsetY === 0) continue;
            const nextX = pixelX + offsetX;
            const nextY = pixelY + offsetY;
            if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
            const next = nextY * width + nextX;
            if (!mask[next] || seen[next]) continue;
            seen[next] = 1;
            stack.push(next);
          }
        }
      }
      bulbs.push(...bulbsFromCluster(pixels));
    }
  }
  return bulbs;
}

const MIN_BULBS = 30;

export function shouldPlay({ hidden, visible }) {
  return !hidden && visible;
}

function objectPosition(image, win) {
  const raw = win.getComputedStyle(image).objectPosition || "50% 50%";
  const parts = raw.trim().split(/\s+/);
  const fraction = (part) => (part?.endsWith("%") ? Number.parseFloat(part) / 100 : 0.5);
  return { x: fraction(parts[0]), y: fraction(parts[1] ?? "50%") };
}

async function loadHero(image) {
  if (image.complete && image.naturalWidth > 0) return true;
  try {
    if (typeof image.decode === "function") {
      await image.decode();
      return image.naturalWidth > 0;
    }
  } catch {
    return false;
  }
  return new Promise((resolve) => {
    image.addEventListener("load", () => resolve(image.naturalWidth > 0), { once: true });
    image.addEventListener("error", () => resolve(false), { once: true });
  });
}

function captureBitmap(image, doc) {
  const width = Math.min(960, image.naturalWidth);
  const height = Math.max(1, Math.round(image.naturalHeight * (width / image.naturalWidth)));
  const canvas = doc.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("canvas unavailable");
  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  return { data: imageData.data, width, height };
}

function mount(image, doc, win, bitmap, bulbs) {
  const hero = image.closest("#home") ?? image;
  const canvas = doc.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  canvas.style.mixBlendMode = "multiply";
  image.insertAdjacentElement("afterend", canvas);
  const context = canvas.getContext("2d");
  if (!context) {
    canvas.remove();
    return;
  }

  let frame = 0;
  let playing = false;
  let visible = false;

  function resize() {
    const dpr = Math.min(win.devicePixelRatio || 1, 2);
    const cssWidth = image.clientWidth;
    const cssHeight = image.clientHeight;
    if (cssWidth < 1 || cssHeight < 1) return;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function paint(time) {
    const cssWidth = image.clientWidth;
    const cssHeight = image.clientHeight;
    if (cssWidth < 1 || cssHeight < 1) return;
    context.clearRect(0, 0, cssWidth, cssHeight);
    const position = objectPosition(image, win);
    const scale = Math.max(cssWidth / bitmap.width, cssHeight / bitmap.height);
    for (const bulb of bulbs) {
      const brightness = brightnessAt(time, bulb.phase, bulb.period, bulb.depth);
      if (brightness >= 0.985) continue;
      const point = mapCoverPoint(
        bitmap.width,
        bitmap.height,
        cssWidth,
        cssHeight,
        position.x,
        position.y,
        bulb.x,
        bulb.y,
      );
      const radius = bulb.radius * scale;
      const channel = Math.round(brightness * 255);
      const gradient = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
      gradient.addColorStop(0, `rgb(${channel},${channel},${channel})`);
      gradient.addColorStop(0.32, `rgb(${channel},${channel},${channel})`);
      gradient.addColorStop(1, "rgb(255,255,255)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  function stop() {
    playing = false;
    if (frame) win.cancelAnimationFrame(frame);
    frame = 0;
  }

  function start() {
    if (playing) return;
    playing = true;
    frame = win.requestAnimationFrame(tick);
  }

  function tick(time) {
    if (!playing) return;
    paint(time);
    frame = win.requestAnimationFrame(tick);
  }

  function sync() {
    if (shouldPlay({ hidden: doc.hidden, visible })) start();
    else stop();
  }

  resize();
  const observer = new win.IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    sync();
  });
  observer.observe(hero);
  doc.addEventListener("visibilitychange", sync);
  const resizeObserver = new win.ResizeObserver(() => {
    resize();
  });
  resizeObserver.observe(image);
}

async function run(image, doc, win) {
  const ready = await loadHero(image);
  if (!ready) return;
  let bitmap;
  try {
    bitmap = captureBitmap(image, doc);
  } catch {
    return;
  }
  const found = findBulbs(bitmap);
  if (found.length < MIN_BULBS) return;
  const bulbs = found.map((bulb) => {
    const period = 1400 + Math.random() * 2600;
    const depth = 0.38 + Math.random() * 0.14;
    return { ...bulb, period, phase: Math.random() * period, depth };
  });
  mount(image, doc, win, bitmap, bulbs);
}

export function startHeroLights(doc = globalThis.document, win = globalThis.window) {
  if (!doc?.body || !win?.matchMedia) return;
  const reducedMotion = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!shouldTwinkle({ season: doc.body.dataset.season, reducedMotion })) return;
  const image = doc.querySelector("#home img");
  if (!image) return;
  void run(image, doc, win);
}
