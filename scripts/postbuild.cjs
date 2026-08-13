#!/usr/bin/env node
/**
 * Runs automatically after `next build` (npm/yarn postbuild lifecycle hook).
 *
 * 1. Injects HOSTNAME=0.0.0.0 + an uncaughtException crash logger into the
 *    standalone server entrypoint.
 * 2. Copies pdfkit's font data files (Helvetica.afm etc.) into the exact
 *    relative path pdfkit looks for them at runtime inside the standalone
 *    build. Next's outputFileTracingIncludes doesn't reliably catch these —
 *    confirmed by two failed attempts in production — because pdfkit reads
 *    them via a dynamic fs.readFileSync a webpack file-trace can't see.
 *    pdfkit's bundled code always resolves this path relative to its own
 *    chunk file as `<chunk-dir>/data/<font>.afm`, which is stable across
 *    builds even though the specific chunk filename (e.g. `3773.js`) isn't.
 */
const fs = require('fs');
const path = require('path');

const serverFile = path.join('.next', 'standalone', 'server.js');
if (fs.existsSync(serverFile)) {
  const code = fs.readFileSync(serverFile, 'utf8');
  const inject =
    "process.env.HOSTNAME='0.0.0.0';\n" +
    "process.on('uncaughtException', err => fs.writeFileSync('crash.log', err.stack));\n";
  fs.writeFileSync(serverFile, inject + code);
  console.log(`[postbuild] Injected HOSTNAME + crash logger into ${serverFile}`);
}

const pdfkitDataSrc = path.join('node_modules', 'pdfkit', 'js', 'data');
const pdfkitDataDest = path.join('.next', 'standalone', '.next', 'server', 'chunks', 'data');
if (fs.existsSync(pdfkitDataSrc)) {
  fs.mkdirSync(pdfkitDataDest, { recursive: true });
  fs.cpSync(pdfkitDataSrc, pdfkitDataDest, { recursive: true });
  console.log(`[postbuild] Copied pdfkit font data to ${pdfkitDataDest}`);
} else {
  console.warn(`[postbuild] pdfkit data directory not found at ${pdfkitDataSrc} — PDF generation may fail at runtime`);
}
