/**
 * Generates src/data/static-pools.json — a baked, offline song pool for every
 * fixed game mode.
 *
 * WHY THIS EXISTS
 * Apple rate-limits the iTunes Search API by IP. The production app reaches it
 * through a Cloudflare Worker, which exits via shared datacenter IPs that Apple
 * throttles hard (429/403). So at runtime the app frequently can't build a pool
 * from the live API. This script runs the app's REAL pool-building logic
 * (src/data/songs.ts → fetchSongPoolFromApi) from a normal IP — where Apple
 * answers fine — and snapshots the result. The app ships that snapshot and falls
 * back to it whenever the live API fails, so the game is always playable.
 *
 * Re-run whenever you want to refresh the baked pools:
 *   node scripts/generate-static-pools.mjs
 *
 * It reuses the exact query terms and filters from songs.ts, so there is no
 * logic to keep in sync — change the modes/queries there and re-run.
 */

import { build } from 'esbuild';
import { writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Cap per mode so the shipped JSON stays reasonable. The guessing game only
// ever needs a few dozen songs per session.
const MAX_PER_MODE = 120;

// Apple rate-limits the Search API to ~20 requests/min per IP, and one mode
// fires several queries. Pace between modes so even a normal IP isn't throttled,
// and pass --force to refetch modes that already have songs.
const DELAY_BETWEEN_MODES_MS = 40_000;
const FORCE = process.argv.includes('--force');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Every fixed mode. artist-discography is intentionally excluded — it depends on
// live user input and degrades gracefully on its own.
const MODES = [
  'global-all', 'global-hiphop', 'global-charts', 'global-rock',
  'global-electronic', 'global-pop', 'global-indie',
  'polish-all', 'polish-hiphop', 'polish-charts', 'polish-classics',
  'global-gaming',
  'decades-80s', 'decades-90s', 'decades-00s', 'decades-10s',
];

// Bundle songs.ts (and its imports) to a temporary ESM file we can import here.
// import.meta.env is undefined under Node, so itunes.ts falls back to calling
// itunes.apple.com directly — exactly what we want from a non-throttled IP.
// Written to the OS temp dir so this build artifact never lands in the repo.
const tmp = resolve(tmpdir(), `idme-static-pools-${process.pid}.bundle.mjs`);
await build({
  entryPoints: [resolve(root, 'src/data/songs.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  outfile: tmp,
  logLevel: 'warning',
});

const { fetchSongPoolFromApi } = await import(pathToFileURL(tmp).href);

const target = resolve(root, 'src/data/static-pools.json');

// Resume from a previous run: keep modes we already fetched so a throttled run
// can be re-invoked to fill only the gaps.
const out = existsSync(target) ? JSON.parse(readFileSync(target, 'utf8')) : {};

const pending = MODES.filter((m) => FORCE || !(out[m]?.length > 0));
if (pending.length < MODES.length) {
  console.log(`Resuming — ${MODES.length - pending.length} mode(s) already populated, ${pending.length} to fetch.\n`);
}

for (let i = 0; i < pending.length; i++) {
  const mode = pending[i];
  process.stdout.write(`  ${mode.padEnd(18)} … `);
  try {
    const pool = await fetchSongPoolFromApi(mode);
    out[mode] = pool.slice(0, MAX_PER_MODE);
    console.log(`${out[mode].length} songs`);
  } catch (err) {
    console.log(`FAILED (${err?.message ?? err}) — leaving for a later run`);
    if (!out[mode]) out[mode] = [];
  }
  // Persist after every mode so progress survives a throttle/crash.
  writeFileSync(target, JSON.stringify(out) + '\n');
  if (i < pending.length - 1) await sleep(DELAY_BETWEEN_MODES_MS);
}

rmSync(tmp, { force: true });

const total = Object.values(out).reduce((n, arr) => n + arr.length, 0);
console.log(`\nWrote ${total} songs across ${MODES.length} modes → src/data/static-pools.json`);
if (Object.values(out).some((arr) => arr.length === 0)) {
  console.warn('⚠  Some modes came back empty — re-run if your IP was throttled.');
}
