import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = "http://127.0.0.1:4173";
const startupTimeoutMs = 30_000;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function isServerReady() {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1_000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(server, getOutput) {
  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Vite si è chiuso prima dell'avvio.\n${getOutput()}`);
    }
    if (await isServerReady()) return;
    await delay(200);
  }
  throw new Error(`Vite non ha risposto entro ${startupTimeoutMs / 1_000} secondi.\n${getOutput()}`);
}

function runPlaywright() {
  const cliPath = path.join(rootDirectory, "node_modules", "@playwright", "test", "cli.js");
  return new Promise((resolve, reject) => {
    const testProcess = spawn(
      process.execPath,
      [cliPath, "test", ...process.argv.slice(2)],
      {
        cwd: rootDirectory,
        env: process.env,
        stdio: "inherit",
        windowsHide: true,
      },
    );
    testProcess.once("error", reject);
    testProcess.once("exit", (code, signal) => {
      if (signal) reject(new Error(`Playwright è stato interrotto dal segnale ${signal}.`));
      else resolve(code ?? 1);
    });
  });
}

async function stopServer(server) {
  if (!server || server.exitCode !== null) return;
  server.kill();
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    delay(2_000),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

let server;

try {
  if (!(await isServerReady())) {
    const vitePath = path.join(rootDirectory, "node_modules", "vite", "bin", "vite.js");
    const output = [];
    server = spawn(
      process.execPath,
      [vitePath, "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
      {
        cwd: rootDirectory,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    const collectOutput = (chunk) => {
      output.push(String(chunk));
      if (output.length > 30) output.shift();
    };
    server.stdout.on("data", collectOutput);
    server.stderr.on("data", collectOutput);
    await waitForServer(server, () => output.join(""));
  }

  process.exitCode = await runPlaywright();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await stopServer(server);
}
