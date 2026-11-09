import fs from "node:fs";
import path from "node:path";

export function writeIfChanged(file, contents) {
  const next = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && fs.readFileSync(file).equals(next)) return false;
  fs.writeFileSync(file, next);
  return true;
}
