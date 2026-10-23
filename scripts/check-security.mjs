import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// 1. 客户端产物不能出现密钥环境变量名或真实密钥值
const staticFiles = walk(path.join(root, '.next/static'));
if (staticFiles.length === 0) {
  failures.push('.next/static 不存在，请先运行 npm run build');
}
function readLocalSecretValues() {
  const file = path.join(root, '.env.local');
  if (!fs.existsSync(file)) return [];
  const values = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = /^(DASHSCOPE_API_KEY|TRIPO_API_KEY)\s*=\s*(.+)$/.exec(line.trim());
    if (match && match[2] && match[2].length >= 8) values.push(match[2].trim());
  }
  return values;
}

const keyValues = [
  process.env.DASHSCOPE_API_KEY,
  process.env.TRIPO_API_KEY,
  ...readLocalSecretValues(),
].filter((value) => value && value.length >= 8);

const needles = ['DASHSCOPE_API_KEY', 'TRIPO_API_KEY', ...keyValues];
for (const file of staticFiles) {
  const text = fs.readFileSync(file, 'latin1');
  for (const needle of needles) {
    if (needle && text.includes(needle)) {
      failures.push(`客户端产物包含敏感内容：${path.relative(root, file)} -> ${needle.slice(0, 6)}***`);
    }
  }
}

// 2. 真实密钥不得出现在任何已跟踪文件中
let tracked = [];
try {
  tracked = execFileSync('git', ['ls-files'], { cwd: root })
    .toString()
    .split('\n')
    .filter(Boolean);
} catch {
  failures.push('无法读取 git 跟踪文件列表');
}
const scanRoots = [
  ...walk(path.join(root, 'src')),
  ...walk(path.join(root, 'scripts')),
  ...walk(path.join(root, 'docs')),
  path.join(root, 'next.config.ts'),
  path.join(root, 'playwright.config.ts'),
  path.join(root, 'README.md'),
].filter((file) => fs.existsSync(file));

for (const full of scanRoots) {
  if (!/\.(ts|tsx|js|mjs|md|json)$/.test(full)) continue;
  const text = fs.readFileSync(full, 'utf8');
  for (const needle of keyValues) {
    if (needle && text.includes(needle)) {
      failures.push(`源码/文档包含真实密钥：${path.relative(root, full)}`);
    }
  }
}

for (const relative of tracked) {
  if (relative === '.env.example' || relative === 'package-lock.json') continue;
  if (relative.startsWith('public/')) continue;
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) continue;
  let text = '';
  try {
    text = fs.readFileSync(full, 'utf8');
  } catch {
    continue;
  }
  for (const needle of keyValues) {
    if (needle && text.includes(needle)) {
      failures.push(`已跟踪文件包含真实密钥：${relative}`);
    }
  }
}

// 3. 除 .env.example 外，任何 .env 文件都不应被 git 跟踪
for (const relative of tracked) {
  if (/(^|\/)\.env(?!\.example$)/.test(path.basename(relative)) && !relative.endsWith('.env.example')) {
    failures.push(`不应提交的环境文件：${relative}`);
  }
}

// 4. .env.local 必须被 git 忽略
for (const file of ['.env.local', '.env']) {
  if (!fs.existsSync(path.join(root, file))) continue;
  try {
    execFileSync('git', ['check-ignore', '-q', file], { cwd: root });
  } catch {
    failures.push(`${file} 未被 .gitignore 忽略`);
  }
}

// 5. .env.example 不得包含真实密钥
const examplePath = path.join(root, '.env.example');
if (fs.existsSync(examplePath)) {
  const example = fs.readFileSync(examplePath, 'utf8');
  const secretLine = example
    .split('\n')
    .find((line) => /^[A-Z_]*KEY=/.test(line) && !/=your_|=$/.test(line));
  if (secretLine) failures.push(`.env.example 疑似包含真实密钥：${secretLine.slice(0, 24)}...`);
}

// 6. 源码中 NEXT_PUBLIC_ 变量不得承载密钥
for (const file of walk(path.join(root, 'src'))) {
  if (!/\.(ts|tsx|js|mjs)$/.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    if (/NEXT_PUBLIC_[A-Z0-9_]*KEY/.test(line)) {
      failures.push(`${path.relative(root, file)}:${index + 1} 使用了 NEXT_PUBLIC_*KEY，会泄露到浏览器`);
    }
    if (/console\.(log|error)\([^)]*(apiKey|DASHSCOPE_API_KEY)/i.test(line)) {
      failures.push(`${path.relative(root, file)}:${index + 1} 可能在日志中输出密钥`);
    }
  });
}

if (failures.length > 0) {
  console.error('安全检查失败：');
  failures.forEach((f) => console.error(` - ${f}`));
  process.exit(1);
}

console.log(`安全检查通过：扫描 ${staticFiles.length} 个客户端产物文件，未发现密钥泄露。`);
