#!/usr/bin/env node
/**
 * Isaacs & Partners — repository-wide production connection audit.
 *
 * Zero third-party dependencies. The checker intentionally performs static
 * analysis only; it never calls production services or exposes secrets.
 *
 * Usage:
 *   npm run production-check
 *   node scripts/production-check.mjs --json
 *   node scripts/production-check.mjs --write
 *
 * Exit code is non-zero when P0/P1 findings exist in CI mode.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const CI = args.has('--ci') || process.env.CI === 'true';
const WRITE = args.has('--write') || CI;
const JSON_ONLY = args.has('--json');

const IGNORE_DIRS = new Set([
  '.git', 'node_modules', '.next', 'dist', 'build', 'coverage', '.cache',
]);
const TEXT_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.html', '.css', '.json',
  '.toml', '.yml', '.yaml', '.md', '.txt', '.sql', '.env', '.example',
]);
const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']);

const findings = [];
const evidence = [];
const files = [];
const textByFile = new Map();

function rel(p) { return path.relative(ROOT, p).replaceAll(path.sep, '/'); }
function addFinding(severity, subsystem, file, missing, risk, action, detail = '') {
  findings.push({ severity, subsystem, file, missing, risk, action, detail });
}
function addEvidence(type, file, value, line = null) {
  evidence.push({ type, file, value, line });
}
function lineOf(text, index) { return text.slice(0, index).split(/\r?\n/).length; }
function readText(file) {
  if (textByFile.has(file)) return textByFile.get(file);
  try {
    const value = fs.readFileSync(file, 'utf8');
    textByFile.set(file, value);
    return value;
  } catch { return ''; }
}
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) || entry.name.startsWith('.env')) files.push(full);
  }
}
function exists(relPath) { return fs.existsSync(path.join(ROOT, relPath)); }
function packageJson() {
  try { return JSON.parse(readText(path.join(ROOT, 'package.json'))); } catch { return {}; }
}
function allSource() {
  return [...textByFile.entries()].filter(([f]) => SOURCE_EXTENSIONS.has(path.extname(f).toLowerCase()));
}
function edgeFunctionNames() {
  const base = path.join(ROOT, 'supabase', 'functions');
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
}
function hasRouteTarget(name) {
  const candidates = [
    `app/${name}`,
    `app/${name}.js`,
    `app/${name}.html`,
    `app/${name}/index.html`,
    `app/${name}/index.js`,
    name,
    `${name}.html`,
  ];
  return candidates.some(exists);
}

walk(ROOT);
for (const f of files) readText(f);

// ---------------------------------------------------------------------------
// 1. Repository / CI foundation
// ---------------------------------------------------------------------------
const pkg = packageJson();
if (!pkg.scripts?.test) addFinding('P1', 'CI/testing', 'package.json', 'No npm test script', 'Production has no standard test entry point.', 'Add deterministic unit/integration tests and make them part of the production gate.');
if (!pkg.scripts?.lint) addFinding('P1', 'CI/testing', 'package.json', 'No lint script', 'Syntax/style regressions can reach main unnoticed.', 'Add a lint/static-analysis command and run it in CI.');
if (!pkg.scripts?.['production-check']) addFinding('P0', 'CI/testing', 'package.json', 'No production-check command', 'The repository cannot self-audit its production wiring.', 'Add npm run production-check and fail CI on P0/P1 findings.');
if (!exists('.github/workflows/production-check.yml')) addFinding('P0', 'CI/testing', '.github/workflows/production-check.yml', 'No repository-wide production-check workflow', 'A passing commit is not independently gated by the audit.', 'Add a GitHub Actions production-check workflow.');
if (!exists('package-lock.json')) addFinding('P1', 'CI/testing', 'package-lock.json', 'No npm lockfile', 'Dependency installation is not reproducible.', 'Commit package-lock.json and use npm ci in CI.');

// ---------------------------------------------------------------------------
// 2. Environment / secrets / local-only dependencies
// ---------------------------------------------------------------------------
const envExample = readText(path.join(ROOT, '.env.example'));
const envNames = new Set([...envExample.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map(m => m[1]));
const envUsages = new Map();
for (const [file, text] of allSource()) {
  for (const m of text.matchAll(/(?:import\.meta\.env|process\.env)\.([A-Z][A-Z0-9_]+)/g)) {
    const key = m[1];
    if (!envUsages.has(key)) envUsages.set(key, []);
    envUsages.get(key).push(rel(file));
  }
}
for (const [key, usages] of envUsages) {
  if (!envNames.has(key)) addFinding('P1', 'Environment', usages[0], `Environment variable ${key} is used but absent from .env.example`, 'Deployment configuration can drift silently.', 'Document the variable in .env.example or remove the usage.', `Used by ${[...new Set(usages)].slice(0, 4).join(', ')}`);
}
for (const [file, text] of textByFile) {
  const patterns = [/localhost:\\d+/gi, /127\.0\.0\.1:\\d+/gi, /YOUR_[A-Z0-9_]+/g, /REPLACE_[A-Z0-9_]+/g, /CHANGE_ME/g, /example\.com/g];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const line = lineOf(text, m.index);
      addEvidence('placeholder-or-local', rel(file), m[0], line);
      if (!rel(file).includes('.env.example') && !rel(file).includes('README')) {
        addFinding('P1', 'Environment', rel(file), `Production-looking source contains ${m[0]}`, 'The application may still depend on a development placeholder or local service.', 'Replace with environment configuration or an intentional production constant.', `Line ${line}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 3. HTML → JS/CSS asset connections
// ---------------------------------------------------------------------------
for (const [file, text] of textByFile) {
  if (path.extname(file).toLowerCase() !== '.html') continue;
  for (const m of text.matchAll(/(?:src|href)=["']([^"'#?]+)["']/gi)) {
    const target = m[1];
    if (!target.startsWith('.') && !target.startsWith('/') && !target.startsWith('assets/') && !target.startsWith('images/') && !target.startsWith('app/')) continue;
    const cleaned = target.replace(/^\//, '');
    const base = path.dirname(rel(file));
    const resolved = path.normalize(path.join(base, cleaned)).replaceAll('\\', '/');
    if (!exists(resolved) && !exists(cleaned)) {
      addFinding('P1', 'Frontend/assets', rel(file), `Referenced asset is missing: ${target}`, 'Browser will produce 404s and parts of the UI can silently fail.', 'Fix the path or restore the referenced asset.', `Resolved as ${resolved}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Static imports → actual files
// ---------------------------------------------------------------------------
for (const [file, text] of allSource()) {
  for (const m of text.matchAll(/(?:from\s+|import\s*\(|export\s+[^;]*?from\s+)["']([^"']+)["']/g)) {
    const spec = m[1];
    if (!spec.startsWith('.')) continue;
    const base = path.dirname(file);
    const raw = path.resolve(base, spec);
    const candidates = [raw, ...['.js', '.mjs', '.ts', '.tsx', '.jsx', '.json'].map(ext => raw + ext), ...['index.js', 'index.mjs', 'index.ts', 'index.tsx'].map(x => path.join(raw, x))];
    if (!candidates.some(fs.existsSync)) {
      const line = lineOf(text, m.index);
      addFinding('P0', 'Module graph', rel(file), `Broken local import: ${spec}`, 'The module cannot load in the browser/runtime.', 'Correct the import path or restore the missing module.', `Line ${line}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Route declarations → page/controller targets
// ---------------------------------------------------------------------------
const routesFile = path.join(ROOT, 'app/config/routes.js');
const routesText = readText(routesFile);
const routeTargets = [];
for (const m of routesText.matchAll(/(?:path|component|view|page|controller)\s*:\s*["'`]([^"'`]+)["'`]/g)) routeTargets.push(m[1]);
for (const target of routeTargets) {
  if (/^(https?:|#|mailto:|javascript:)/i.test(target)) continue;
  if (target.includes(':')) continue;
  if (!hasRouteTarget(target) && !target.startsWith('/')) {
    addFinding('P1', 'Routes', 'app/config/routes.js', `Route target has no obvious repository target: ${target}`, 'A declared route can land on a missing page/controller.', 'Map each route explicitly to an existing HTML/controller/service or mark it as an external target.');
  }
}
if (!routesText) addFinding('P0', 'Routes', 'app/config/routes.js', 'Central routes file is missing/unreadable', 'Navigation and guards cannot be audited.', 'Restore the central route contract.');

// ---------------------------------------------------------------------------
// 6. Supabase edge functions → config/deploy wiring
// ---------------------------------------------------------------------------
const functions = edgeFunctionNames();
const configText = readText(path.join(ROOT, 'supabase/config.toml'));
for (const fn of functions) {
  if (!new RegExp(`\\[functions\\.${fn.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\]`).test(configText)) {
    addFinding('P1', 'Supabase Edge Functions', `supabase/functions/${fn}`, 'Function directory is not declared in supabase/config.toml', 'Local/deployed configuration can diverge.', 'Add an explicit function configuration or document why the function uses platform defaults.');
  }
  const entry = path.join(ROOT, 'supabase/functions', fn, 'index.ts');
  if (!fs.existsSync(entry)) addFinding('P0', 'Supabase Edge Functions', rel(path.dirname(entry)), 'Missing index.ts entry point', 'The function cannot deploy from this repository.', 'Restore the function entry point.');
}
for (const fn of ['ai-liaison-runtime', 'openwa-communication-worker', 'trusted-document-worker']) {
  if (functions.includes(fn)) {
    const t = readText(path.join(ROOT, 'supabase/functions', fn, 'index.ts'));
    if (!/SUPABASE_SERVICE_ROLE_KEY/.test(t) && /service.?role/i.test(t)) addFinding('P1', 'Supabase Edge Functions', `supabase/functions/${fn}/index.ts`, 'Service-role usage appears undocumented', 'A function may require a secret that is not clearly declared.', 'Document required secrets in deployment configuration without committing values.');
  }
}

// ---------------------------------------------------------------------------
// 7. Frontend → Supabase / Edge Function endpoint consistency
// ---------------------------------------------------------------------------
const allText = [...textByFile.entries()];
const invokeNames = new Set();
for (const [file, text] of allText) {
  for (const m of text.matchAll(/functions\.invoke\(\s*["'`]([^"'`]+)["'`]/g)) { invokeNames.add(m[1]); addEvidence('edge-invoke', rel(file), m[1], lineOf(text, m.index)); }
  for (const m of text.matchAll(/(?:fetch|axios\.(?:get|post|put|patch|delete))\(\s*["'`]([^"'`]+)["'`]/g)) addEvidence('http-endpoint', rel(file), m[1], lineOf(text, m.index));
}
for (const fn of invokeNames) {
  if (!functions.includes(fn)) addFinding('P0', 'Frontend→Edge', 'repository-wide', `Frontend invokes missing Edge Function: ${fn}`, 'The call can fail at runtime even though the UI is wired.', 'Create/deploy the function or correct the invoked name.');
}

// ---------------------------------------------------------------------------
// 8. Security anti-pattern scan
// ---------------------------------------------------------------------------
for (const [file, text] of allText) {
  const r = rel(file);
  if (r.includes('node_modules')) continue;
  const checks = [
    [/SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'`][^"'`]+["'`]/g, 'P0', 'Hard-coded Supabase service-role secret'],
    [/OPENWA_(?:API_KEY|WORKER_TOKEN|WEBHOOK_SECRET)\s*=\s*["'`][^"'`]+["'`]/g, 'P0', 'Hard-coded OpenWA credential'],
    [/Authorization:\s*["'`]Bearer\s+[A-Za-z0-9._-]{20,}["'`]/g, 'P0', 'Hard-coded bearer credential'],
    [/dangerouslySetInnerHTML\s*:/g, 'P1', 'dangerouslySetInnerHTML usage requires sanitisation review'],
    [/innerHTML\s*=/g, 'P1', 'innerHTML assignment requires XSS review'],
    [/eval\s*\(/g, 'P0', 'eval() usage'],
  ];
  for (const [re, severity, label] of checks) {
    for (const m of text.matchAll(re)) {
      addFinding(severity, 'Security', r, label, 'Potential credential exposure or code/data injection.', 'Review and replace with safe, parameterised, policy-controlled behaviour.', `Line ${lineOf(text, m.index)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 9. Production architecture markers
// ---------------------------------------------------------------------------
const required = [
  ['app/auth/AuthService.js', 'Auth service'],
  ['app/ai/AuthorityActionService.js', 'Authority action service'],
  ['app/ai/CompanyTruthService.js', 'Company Truth'],
  ['app/ai/HistoricalMemoryRetrievalService.js', 'Historical memory'],
  ['app/ai/CustomerRelationshipMemoryEngine.js', 'Customer relationship memory'],
  ['app/ai/RelationshipOperationalIntelligenceEngine.js', 'Operational intelligence'],
  ['app/ai/AuthorityRoleIntelligenceEngine.js', 'Authority role intelligence'],
  ['supabase/functions/ai-liaison-runtime/index.ts', 'AI liaison runtime'],
  ['supabase/functions/openwa-communication-worker/index.ts', 'OpenWA communication worker'],
];
for (const [p, label] of required) if (!exists(p)) addFinding('P0', 'Architecture', p, `${label} file is missing`, 'A core production boundary is absent.', `Restore or intentionally replace ${label}.`);

// Look for stale legacy server assumptions.
const serverText = readText(path.join(ROOT, 'server.js'));
if (serverText && /app\.listen\(/.test(serverText)) addFinding('P1', 'Deployment', 'server.js', 'Express development server exists alongside the GitHub Pages/Supabase architecture', 'A production deployment can accidentally depend on a local-only server.', 'Keep server.js explicitly development-only and verify browser code has no dependency on it.');

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const order = { P0: 0, P1: 1, P2: 2, INFO: 3 };
findings.sort((a, b) => (order[a.severity] - order[b.severity]) || a.subsystem.localeCompare(b.subsystem) || a.file.localeCompare(b.file));
const counts = findings.reduce((a, f) => { a[f.severity] = (a[f.severity] || 0) + 1; return a; }, {});

const report = {
  generatedAt: new Date().toISOString(),
  repository: 'maliq273/isaacs-and-partners-website',
  branch: 'main',
  filesScanned: files.length,
  sourceFilesScanned: allSource().length,
  edgeFunctions: functions,
  counts,
  findings,
  evidenceCount: evidence.length,
};

const markdown = [
  '# Isaacs & Partners — Production Check', '',
  `Generated: ${report.generatedAt}`, '',
  `Files scanned: **${report.filesScanned}** | Source files: **${report.sourceFilesScanned}**`, '',
  `**P0:** ${counts.P0 || 0}  |  **P1:** ${counts.P1 || 0}  |  **P2:** ${counts.P2 || 0}`, '',
  '## Findings', '',
  '| Severity | Subsystem | File | Missing / broken connection | Risk | Production action |',
  '|---|---|---|---|---|---|',
  ...findings.map(f => `| ${f.severity} | ${f.subsystem} | \`${f.file}\` | ${f.missing.replaceAll('|', '\\|')} | ${f.risk.replaceAll('|', '\\|')} | ${f.action.replaceAll('|', '\\|')} |`),
  '',
  '## Audit scope', '',
  '- Repository file inventory and text-source scan',
  '- npm/CI production gate',
  '- HTML asset references',
  '- local module imports',
  '- central route declarations',
  '- Supabase Edge Function declarations and frontend invocations',
  '- environment-variable coverage',
  '- local/placeholder endpoints',
  '- obvious credential and injection anti-patterns',
  '- required production architecture files',
  '',
  '> This checker is a static connection audit. It does not replace live Supabase RLS tests, Edge Function invocation tests, OpenWA delivery tests, browser E2E tests, or secret/configuration verification.',
  '',
].join('\n');

if (WRITE) {
  fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports/production-check.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(ROOT, 'reports/production-check.md'), markdown);
}

if (JSON_ONLY) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`Production check: ${report.filesScanned} files scanned`);
  console.log(`P0=${counts.P0 || 0} P1=${counts.P1 || 0} P2=${counts.P2 || 0}`);
  for (const f of findings) console.log(`[${f.severity}] ${f.subsystem} :: ${f.file} :: ${f.missing}`);
}

if (CI && ((counts.P0 || 0) > 0 || (counts.P1 || 0) > 0)) process.exit(1);
