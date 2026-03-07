#!/usr/bin/env node
/**
 * Ensures the local letta-compatible server is running.
 * Called by SessionStart hook. If the server is already running, exits immediately.
 * If not, starts it in background and waits for it to be ready.
 */

const http = require('http');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = parseInt(process.env.LETTA_LOCAL_PORT || '8990', 10);
const SERVER_DIR = __dirname;
const LOG_FILE = path.join(SERVER_DIR, 'server.log');
const PID_FILE = path.join(SERVER_DIR, '.server.pid');
const MAX_WAIT_MS = 15000;
const POLL_INTERVAL_MS = 500;

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  process.stderr.write(`[ensure-server ${ts}] ${msg}\n`);
}

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/v1/models/`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    if (await checkHealth()) return true;
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  return false;
}

function installDeps() {
  const nodeModules = path.join(SERVER_DIR, 'node_modules');
  if (!fs.existsSync(nodeModules)) {
    log('Installing server dependencies...');
    execSync('npm install --production', { cwd: SERVER_DIR, stdio: 'pipe' });
    log('Dependencies installed');
  }
}

function startServer() {
  const logStream = fs.openSync(LOG_FILE, 'a');

  // Use npx tsx to run the server
  const child = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['tsx', 'server.ts'],
    {
      cwd: SERVER_DIR,
      stdio: ['ignore', logStream, logStream],
      detached: true,
      env: { ...process.env, LETTA_LOCAL_DATA_DIR: path.join(SERVER_DIR, 'data') },
    }
  );

  child.unref();
  fs.closeSync(logStream);

  // Save PID for reference
  try {
    fs.writeFileSync(PID_FILE, String(child.pid), 'utf-8');
  } catch {}

  log(`Server started (pid=${child.pid})`);
}

async function main() {
  // Set LETTA_BASE_URL for this session
  // (hooks can't set env vars for the parent process, but the plugin reads this)
  if (!process.env.LETTA_BASE_URL) {
    process.env.LETTA_BASE_URL = `http://localhost:${PORT}`;
  }

  // Already running?
  if (await checkHealth()) {
    log('Server already running');
    // Output for the hook system
    console.log(`LETTA_BASE_URL=http://localhost:${PORT}`);
    process.exit(0);
  }

  // Install deps if needed
  try {
    installDeps();
  } catch (err) {
    log(`Failed to install deps: ${err.message}`);
    process.exit(1);
  }

  // Start server
  startServer();

  // Wait for it to be ready
  if (await waitForServer()) {
    log('Server is ready');
    console.log(`LETTA_BASE_URL=http://localhost:${PORT}`);
    process.exit(0);
  } else {
    log('Server failed to start within timeout');
    process.exit(1);
  }
}

main().catch((err) => {
  log(`Error: ${err.message}`);
  process.exit(1);
});
