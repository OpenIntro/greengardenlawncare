import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import { assertDeleteAllowed, shouldSkipRemote } from "./deploy-policy.js";
import { assertEstimateStamped } from "./estimate-mail.js";

dotenv.config();

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const skipBuild = args.has("--skip-build");
const doDelete = args.has("--delete");
const IDENTITY = "site-identity.txt";
const IDENTITY_BODY = "Green Garden Lawn Care\n";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
  return value;
}

function walk(dir, base = dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, files);
    else {
      const relative = path.relative(base, full).split(path.sep).join("/");
      files.push({ relative, full });
    }
  }
  return files;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function readManifest(file) {
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function listRemote(client, dir, prefix = "") {
  const entries = await client.list(dir);
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (shouldSkipRemote(relative)) continue;
    if (entry.type === "d") files.push(...(await listRemote(client, `${dir}/${entry.name}`, relative)));
    else if (entry.type === "-") files.push(relative);
  }
  return files;
}

async function main() {
  if (!skipBuild && !dryRun) {
    const build = spawnSync("npm", ["run", "build"], { stdio: "inherit", shell: true });
    if (build.status !== 0) process.exit(build.status ?? 1);
  }
  const estimatePhp = path.resolve("_site/api/estimate.php");
  assertEstimateStamped(fs.readFileSync(estimatePhp, "utf8"));
  const host = required("SFTP_HOST");
  const user = required("SFTP_USER");
  const remoteRoot = required("SFTP_REMOTE_ROOT");
  const password = process.env.SFTP_PASSWORD || "";
  const keyPath = process.env.SFTP_PRIVATE_KEY || "";
  if (!password && !keyPath) throw new Error("Set SFTP_PASSWORD or SFTP_PRIVATE_KEY.");

  const SftpClient = (await import("ssh2-sftp-client")).default;
  const client = new SftpClient();
  const manifestPath = path.resolve(".deploy-manifest.json");
  const previous = readManifest(manifestPath);
  const localFiles = walk(path.resolve("_site"));
  localFiles.push({
    relative: IDENTITY,
    full: null,
    body: Buffer.from(IDENTITY_BODY),
  });
  const localSet = new Set(localFiles.map((file) => file.relative));

  await client.connect({
    host,
    port: Number(process.env.SFTP_PORT || 22),
    username: user,
    password: password || undefined,
    privateKey: keyPath ? fs.readFileSync(keyPath) : undefined,
  });
  try {
    if (doDelete) {
      const identityPath = `${remoteRoot.replace(/\/$/, "")}/${IDENTITY}`;
      let identity = "";
      if (await client.exists(identityPath)) identity = (await client.get(identityPath)).toString("utf8");
      assertDeleteAllowed(remoteRoot, identity);
    }
    const nextManifest = { ...previous };
    for (const file of localFiles) {
      const body = file.body ?? fs.readFileSync(file.full);
      const hash = sha256(body);
      if (previous[file.relative] === hash) continue;
      const remotePath = `${remoteRoot.replace(/\/$/, "")}/${file.relative}`;
      console.log(`${dryRun ? "would upload" : "upload"} ${file.relative}`);
      if (!dryRun) {
        await client.mkdir(path.posix.dirname(remotePath), true);
        await client.put(body, remotePath);
        nextManifest[file.relative] = hash;
      }
    }
    if (doDelete) {
      const remoteFiles = await listRemote(client, remoteRoot.replace(/\/$/, ""));
      for (const relative of remoteFiles) {
        if (shouldSkipRemote(relative) || localSet.has(relative)) continue;
        const remotePath = `${remoteRoot.replace(/\/$/, "")}/${relative}`;
        console.log(`${dryRun ? "would delete" : "delete"} ${relative}`);
        if (!dryRun) {
          await client.delete(remotePath);
          delete nextManifest[relative];
        }
      }
    }
    if (!dryRun) fs.writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
