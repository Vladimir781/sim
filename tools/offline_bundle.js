#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'game', 'dist');
const outputFile = path.join(distDir, 'offline.bundle.js');

function listJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js') && entry.name !== 'offline.bundle.js') {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizePosix(p) {
  return p.split(path.sep).join('/');
}

function transformModule(source, moduleId) {
  let code = source.replace(/\r\n/g, '\n');

  code = code.replace(/import\s+\{([\s\S]*?)\}\s+from\s+['\"]([^'\"]+)['\"];?/gm, (_match, bindings, specifier) => {
    const parts = bindings
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [imported, alias] = part.split(/\s+as\s+/);
        if (alias) {
          return `${imported.trim()}: ${alias.trim()}`;
        }
        return imported.trim();
      });
    const destruct = parts.join(', ');
    return `const { ${destruct} } = require('${specifier}');`;
  });

  const exportNames = new Map();

  for (const match of code.matchAll(/export\s+const\s+([A-Za-z0-9_$]+)/g)) {
    exportNames.set(match[1], match[1]);
  }
  for (const match of code.matchAll(/export\s+let\s+([A-Za-z0-9_$]+)/g)) {
    exportNames.set(match[1], match[1]);
  }
  for (const match of code.matchAll(/export\s+var\s+([A-Za-z0-9_$]+)/g)) {
    exportNames.set(match[1], match[1]);
  }
  for (const match of code.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g)) {
    exportNames.set(match[1], match[1]);
  }
  for (const match of code.matchAll(/export\s+class\s+([A-Za-z0-9_$]+)/g)) {
    exportNames.set(match[1], match[1]);
  }

  code = code.replace(/export\s+const\s+/g, 'const ');
  code = code.replace(/export\s+let\s+/g, 'let ');
  code = code.replace(/export\s+var\s+/g, 'var ');
  code = code.replace(/export\s+async\s+function\s+/g, 'async function ');
  code = code.replace(/export\s+function\s+/g, 'function ');
  code = code.replace(/export\s+class\s+/g, 'class ');
  code = code.replace(/export\s+\{[^}]+\};?\n?/g, '');

  code = code.replace(/import\.meta/g, '__import_meta');

  const lines = [];
  lines.push(`const __import_meta = { url: moduleUrl('${moduleId}') };`);
  lines.push(code.trim());
  for (const [local, exported] of exportNames.entries()) {
    lines.push(`exports.${exported} = ${local};`);
  }

  return lines.join('\n');
}

function indent(code, spaces = '    ') {
  return code
    .split('\n')
    .map((line) => spaces + line)
    .join('\n');
}

function buildBundle() {
  const files = listJsFiles(distDir);
  files.sort();
  const modules = files.map((file) => {
    const rel = normalizePosix(path.relative(distDir, file));
    const source = fs.readFileSync(file, 'utf8');
    const body = transformModule(source, rel);
    return { id: rel, body };
  });

  const modulesBlock = modules
    .map(({ id, body }) => `    '${id}': function (require, exports, module) {\n${indent(body, '        ')}\n    }`)
    .join(',\n');

  const bundle = `// Auto-generated offline bundle for file:// execution.\n(function () {\n  const MODULE_FACTORIES = {\n${modulesBlock}\n  };\n  const MODULE_CACHE = {};\n  const BASE_URL = new URL('./game/dist/', window.location.href);\n\n  function moduleUrl(id) {\n    return new URL(id, BASE_URL).href;\n  }\n\n  function normalize(id) {\n    const parts = id.split('/');\n    const stack = [];\n    for (const part of parts) {\n      if (!part || part === '.') continue;\n      if (part === '..') {\n        stack.pop();\n      } else {\n        stack.push(part);\n      }\n    }\n    return stack.join('/');\n  }\n\n  function resolve(fromId, spec) {\n    if (spec.startsWith('.')) {\n      const base = fromId.includes('/') ? fromId.slice(0, fromId.lastIndexOf('/') + 1) : '';\n      return normalize(base + spec);\n    }\n    return spec;\n  }\n\n  function load(id) {\n    const normalized = normalize(id);\n    if (MODULE_CACHE[normalized]) {\n      return MODULE_CACHE[normalized].exports;\n    }\n    const factory = MODULE_FACTORIES[normalized];\n    if (!factory) {\n      throw new Error('Module not found: ' + normalized);\n    }\n    const module = { exports: {} };\n    MODULE_CACHE[normalized] = module;\n    const localRequire = (spec) => load(resolve(normalized, spec));\n    factory(localRequire, module.exports, module);\n    return module.exports;\n  }\n\n  load('main.js');\n})();\n`;

  fs.writeFileSync(outputFile, bundle, 'utf8');
}

buildBundle();
