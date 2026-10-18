// Bundle and run the map CPU benchmark with the site resolver.
import { build } from 'vite';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const tools = join(root, '.tools');
mkdirSync(tools, { recursive: true });
const temporary = mkdtempSync(join(tools, 'map-profile-'));
try {
  const bundle = await build({
    root, configFile: false, publicDir: false, logLevel: 'error',
    build: { ssr: join(root, 'scripts/benchmarks/map-initialization.mjs'), write: false,
      minify: false, rollupOptions: { output: { inlineDynamicImports: true } } },
  });
  const entry = bundle.output.find((item) => item.type === 'chunk' && item.isEntry);
  const filename = join(temporary, 'profile.mjs');
  writeFileSync(filename, entry.code);
  const result = spawnSync(process.execPath, [filename], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
