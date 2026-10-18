// Compile the tests with the site's Vite resolver, then run Node's test runner.
import { build } from 'vite';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const tools = join(root, '.tools');
mkdirSync(tools, { recursive: true });
const temporary = mkdtempSync(join(tools, 'site-tests-'));
try {
  const bundle = await build({
    root, configFile: false, publicDir: false, logLevel: 'error',
    build: { ssr: join(root, 'scripts/tests/site-behavior.test.mjs'), write: false,
      minify: false, rollupOptions: { output: { inlineDynamicImports: true } } },
  });
  const entry = bundle.output.find((item) => item.type === 'chunk' && item.isEntry);
  const filename = join(temporary, 'site-behavior.test.mjs');
  writeFileSync(filename, entry.code);
  const result = spawnSync(process.execPath, ['--test', filename], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
