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
  if (max < 0.55 || delta === 0) return false;
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

export function findBulbs(bitmap) {
  const { data, width, height } = bitmap;
  const mask = new Uint8Array(width * height);
  const bright = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (!isBulbPixel(data[offset], data[offset + 1], data[offset + 2])) continue;
      const index = y * width + x;
      mask[index] = 1;
      bright[index] = Math.max(data[offset], data[offset + 1], data[offset + 2]) / 255;
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
