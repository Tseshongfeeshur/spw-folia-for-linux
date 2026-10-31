#!/usr/bin/env node
import { existsSync, accessSync, constants } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';

const root = resolve(new URL('../..', import.meta.url).pathname);
const host = join(root, 'packaging', 'native', 'spw-folia-host');
const web = join(root, 'packaging', 'web');
for (const path of [host, join(web, 'index.html')]) {
  if (!existsSync(path)) throw new Error(`missing ${path}; run packaging/build-package.sh first`);
}
accessSync(host, constants.X_OK);

const child = spawn(host, ['--bundle', web], { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, QT_QPA_PLATFORM: 'wayland' } });
let output = '';
let errorOutput = '';
let stdoutBuffer = '';
child.stdin.write(JSON.stringify({ t: 'hello', protocol: 1 }) + '\n');
let quitSent = false;
let timedOut = false;
const sendQuit = () => {
  if (quitSent || child.stdin.destroyed) return;
  quitSent = true;
  child.stdin.write(JSON.stringify({ t: 'quit' }) + '\n');
};
const waitForExit = new Promise(resolveExit => child.on('exit', (code, signal) => resolveExit({ code, signal })));
child.stdout.on('data', chunk => {
  output += chunk;
  stdoutBuffer += chunk;
  const lines = stdoutBuffer.split('\n');
  stdoutBuffer = lines.pop() ?? '';
  for (const line of lines.filter(Boolean)) {
    try {
      const message = JSON.parse(line);
      if (message.t === 'ready') {
        sendQuit();
      }
    } catch {}
  }
});
child.stderr.on('data', chunk => { errorOutput += chunk; });
const timeout = setTimeout(() => {
  timedOut = true;
  child.kill('SIGTERM');
}, 10_000);
const { code, signal } = await waitForExit.finally(() => clearTimeout(timeout));
if (timedOut) throw new Error(`host smoke test timed out: stdout=${output} stderr=${errorOutput}`);
const lines = output.split('\n').filter(Boolean).map(line => JSON.parse(line));
if (!lines.some(line => line.t === 'ready')) throw new Error(`host did not handshake: exit=${code ?? 'via ' + signal} stdout=${output} stderr=${errorOutput}`);
if (code !== 0) throw new Error(`host exited ${code ?? 'via ' + signal}: ${errorOutput}`);
console.log(JSON.stringify({ pass: true, ready: true, exitCode: code }));
