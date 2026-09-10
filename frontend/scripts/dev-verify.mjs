// Launches a Next dev server on an ISOLATED build dir (`.next-verify`) and port,
// so a verify/QA instance can run beside another session's dev server without the
// two racing on `.next` (concurrent writers corrupt it — see CLAUDE.md).
//
// It runs against a REAL backend. This script used to boot the in-memory mock
// (NEXT_PUBLIC_ALLOW_MOCK=true); the mock layer was deleted on 17 Jul 2026, so
// there is no offline preview any more — point it at a running API.
//
//   npm run dev:verify                                  # → http://localhost:8000/api on :3005
//   VERIFY_API_URL=http://localhost:8010/api PORT=3006 npm run dev:verify
import { spawn } from 'node:child_process';

const apiUrl = process.env.VERIFY_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
process.env.NEXT_PUBLIC_API_URL = apiUrl;
process.env.NEXT_DIST_DIR = process.env.NEXT_DIST_DIR || '.next-verify';
const port = process.env.PORT || '3005';

console.log(`[dev:verify] API   → ${apiUrl}`);
console.log(`[dev:verify] dist  → ${process.env.NEXT_DIST_DIR} (isolated from .next)`);
console.log(`[dev:verify] port  → ${port}`);
console.log('[dev:verify] the backend must be running — there is no offline/mock mode.');

const child = spawn('npx', ['next', 'dev', '-p', port], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});
child.on('exit', (code) => process.exit(code ?? 0));
