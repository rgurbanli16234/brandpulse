/**
 * Start the whole app with one command: FastAPI on 127.0.0.1:8001 and Vite on
 * :8080 (whose `/api` proxy targets that port). Both children are killed as a
 * process tree so a stopped script cannot leave a stale server holding a port.
 *
 *   npm run dev:all
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(frontendDir, "..");
const backendDir = join(repoRoot, "backend");

const API_HOST = "127.0.0.1";
const API_PORT = "8001";
const IS_WINDOWS = process.platform === "win32";

function pythonExecutable() {
  const venv = IS_WINDOWS
    ? join(backendDir, ".venv", "Scripts", "python.exe")
    : join(backendDir, ".venv", "bin", "python");
  if (existsSync(venv)) return venv;
  console.error(
    `[dev:all] no virtualenv at ${venv}\n` +
      `          create it first:  cd backend && python -m venv .venv && ` +
      `${IS_WINDOWS ? ".venv\\Scripts\\activate && pip install -r requirements.txt" : "source .venv/bin/activate && pip install -r requirements.txt"}`,
  );
  process.exit(1);
}

/** Prefixes a child's output so the two servers stay readable in one terminal. */
function relay(stream, prefix) {
  let buffered = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    const lines = (buffered + chunk).split(/\r?\n/);
    buffered = lines.pop() ?? "";
    for (const line of lines) process.stdout.write(`${prefix} ${line}\n`);
  });
  stream.on("end", () => {
    if (buffered) process.stdout.write(`${prefix} ${buffered}\n`);
  });
}

function killTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (IS_WINDOWS) {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
}

const children = [];

function start(name, command, args, cwd, options = {}) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    // Own process group on POSIX so killTree() can take the children with it.
    detached: !IS_WINDOWS,
    ...options,
  });
  const prefix = `[${name}]`;
  // A child that never starts must not leave the other one holding its port.
  child.on("error", (error) => {
    console.error(`${prefix} ${error.message}`);
    shutdown(1);
  });
  relay(child.stdout, prefix);
  relay(child.stderr, prefix);
  child.on("exit", (code, signal) => {
    console.log(`${prefix} stopped (${signal ?? `exit ${code}`})`);
    shutdown(signal === null && code === 0 ? 0 : 1);
  });
  children.push(child);
  return child;
}

let closing = false;
function shutdown(code) {
  if (closing) return;
  closing = true;
  for (const child of children) killTree(child);
  process.exit(code);
}

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

console.log(
  `[dev:all] API      http://${API_HOST}:${API_PORT}\n` +
    `[dev:all] frontend http://localhost:8080  (proxies /api → ${API_HOST}:${API_PORT})`,
);

start("api", pythonExecutable(), [
  "-m",
  "uvicorn",
  "app.main:app",
  "--reload",
  "--host",
  API_HOST,
  "--port",
  API_PORT,
], backendDir);

// Windows ships npm as a `.cmd` shim, which Node refuses to spawn without a
// shell (EINVAL). Passing the whole command as one string keeps the shell off
// the argument-concatenation deprecation.
if (IS_WINDOWS) start("web", "npm run dev", [], frontendDir, { shell: true });
else start("web", "npm", ["run", "dev"], frontendDir);
