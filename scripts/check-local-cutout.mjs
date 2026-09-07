// Run against the production build. PLAYWRIGHT_MODULE may point to an existing
// Playwright install; this verification is not part of the deployed app.
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const { chromium, webkit } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const root = path.resolve('dist/client');
const requests = [];
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    requests.push(pathname);
    if (pathname === '/') {
      res.setHeader('Content-Type', 'text/html');
      return res.end('<html><body>Local cutout verification</body></html>');
    }
    const file = path.join(root, pathname);
    if (!file.startsWith(root + '/')) throw Error();
    const data = await readFile(file);
    res.setHeader(
      'Content-Type',
      /\.m?js$/.test(file)
        ? 'text/javascript'
        : file.endsWith('.wasm')
          ? 'application/wasm'
          : file.endsWith('.jpg')
            ? 'image/jpeg'
            : 'application/octet-stream',
    );
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const chunk = (await readdir(root + '/_next/static/chunks')).find((file) =>
  file.startsWith('background-removal-client-'),
);
try {
  for (const [name, engine] of [
    ['chromium', chromium],
    ['webkit', webkit],
  ]) {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      page.on('console', (msg) => console.log(name, msg.type(), msg.text()));
      await page.goto(base);
      const before = requests.length;
      // Importing the wrapper must not download the model or engine.
      await page.evaluate(async (chunk) => {
        window.cutout = await import('/_next/static/chunks/' + chunk);
      }, chunk);
      assert.ok(
        !requests
          .slice(before)
          .some((url) => url.includes('/models/') || url.includes('/workers/')),
      );
      const value = await page.evaluate(async () => {
        const file = new File(
          [await (await fetch('/mobile-category-manga.jpg')).blob()],
          'test.jpg',
          { type: 'image/jpeg' },
        );
        const phases = [];
        const start = performance.now();
        const blob = await window.cutout.removeBackgroundLocally(
          file,
          new AbortController().signal,
          (phase) => phases.push(phase),
        );
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let transparent = 0,
          opaque = 0;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 20) transparent++;
          if (data[i] > 235) opaque++;
        }
        const abort = new AbortController();
        abort.abort();
        let cancelled = false;
        try {
          await window.cutout.removeBackgroundLocally(
            file,
            abort.signal,
            () => {},
          );
        } catch (e) {
          cancelled = e.name === 'AbortError';
        }
        return {
          type: blob.type,
          bytes: blob.size,
          seconds: Math.round((performance.now() - start) / 100) / 10,
          phases,
          transparent,
          opaque,
          cancelled,
        };
      });
      assert.equal(value.type, 'image/png');
      assert.ok(value.transparent > 0 && value.opaque > 0);
      assert.ok(value.cancelled);
      console.log(name, JSON.stringify(value));
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
}
