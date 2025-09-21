#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface CliOptions {
  exportName: string;
  mime: string;
}

function parseArgs(argv: string[]): { input: string; output: string; options: CliOptions } {
  const args = [...argv];
  const options: CliOptions = { exportName: 'ASSET_B64', mime: 'application/octet-stream' };
  let input = '';
  let output = '';
  while (args.length) {
    const token = args.shift();
    if (!token) continue;
    if (token === '--export' && args[0]) {
      options.exportName = args.shift()!;
      continue;
    }
    if (token === '--mime' && args[0]) {
      options.mime = args.shift()!;
      continue;
    }
    if (!input) {
      input = token;
    } else if (!output) {
      output = token;
    }
  }
  if (!input || !output) {
    throw new Error('Usage: asset2b64 <input> <output> [--export NAME] [--mime type/subtype]');
  }
  return { input, output, options };
}

async function ensureDir(filePath: string): Promise<void> {
  const dir = dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { input, output, options } = parseArgs(argv);
  const buffer = await fs.readFile(resolve(input));
  const base64 = buffer.toString('base64');
  const dataUri = `data:${options.mime};base64,${base64}`;
  const exportName = options.exportName;
  const code = `export const ${exportName} = "${dataUri}";\n`;
  await ensureDir(resolve(output));
  await fs.writeFile(resolve(output), code);
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const relOutput = resolve(scriptDir, '..', output);
  console.log(`Generated ${relOutput} (${exportName})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
