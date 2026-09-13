#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CI = process.argv.includes('--ci') || process.env.CI === 'true';
const WRITE = process.argv.includes('--write') || CI;
const IGNORE = new Set(['.git','node_modules','dist','build','coverage','.next','.cache','reports']);
const TEXT = new Set(['.js','.mjs','.cjs','.ts','.tsx','.jsx','.html','.css','.json','.toml','.yml','.yaml','.sql']);
const SOURCE = new Set(['.js','.mjs','.cjs','.ts','.tsx','.jsx']);
const files = [];
const contents = new Map();
const findings = [];

const rel = file => path.relative(ROOT, file).replaceAll(path.sep, '/');
const exists = file => fs.existsSync(path.join(ROOT, file));
const add = (severity, subsystem, file, missing, risk, action, detail = '') => findings.push({ severity, subsystem, file, missing, risk, action, detail });
const line = (text, index) => text.slice(0, index).split(/\r?\n/).length;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (TEXT.has(path.extname(entry.name).toLowerCase()) || entry.name.startsWith('.env')) files.push(file);
  }
}
function read(file) {
  if (contents.has(file)) return contents.get(file);
  try { const value = fs.readFileSync(file, 'utf8'); contents.set(file, value); return value; } catch { return ''; }
}
function targetExists(target, fromFile) {
  const clean = target.split(/[?#]/)[0];
  if (!clean || /^(https?:|mailto:|tel:|javascript:|data:)/i.test(clean)) return true;
  const base = clean.startsWith('/') ? ROOT : path.dirname(fromFile);
  const raw = path.resolve(base, clean.replace(/^\//, ''));
  const candidates = [raw, raw + '.html', raw + '.js', raw + '.mjs', raw + '.css', raw + '.json', path.join(raw, 'index.html'), path.join(raw, 'index.js'), path.join(raw, 'index.mjs')];
  return candidates.some(fs.existsSync);
}

walk(ROOT);
for (const file of files) read(file);

// CI / dependency reproducibility
let pkg = {};
try { pkg = JSON.parse(read(path.join(ROOT, 'package.json'))); } catch { add('P0','CI/testing','package.json','Invalid or missing package.json','Installation and checks are not reliable.','Repair package.json.'); }
if (!pkg.scripts?.test) add('P1','CI/testing','package.json','No npm test script','No standard automated test entry point exists.','Add tests and include them in the production gate.');
if (!pkg.scripts?.lint) add('P1','CI/testing','package.json','No lint script','Static regressions can reach main.','Add lint/static analysis and run it in CI.');
if (!pkg.scripts?.['production-check']) add('P0','CI/testing','package.json','No production-check command','The repository cannot self-audit its wiring.','Add the production-check command.');
if (!exists('.github/workflows/production-check.yml')) add('P0','CI/testing','.github/workflows/production-check.yml','No production-check workflow','Commits are not automatically audited.','Add the GitHub Actions gate.');
if (!exists('package-lock.json')) add('P1','CI/testing','package-lock.json','No npm lockfile','Dependency installation is not reproducible.','Commit package-lock.json and use npm ci in CI.');

// Environment coverage. Documentation/setup files are intentionally excluded from placeholder checks.
const env = read(path.join(ROOT, '.env.example'));
const declared = new Set([...env.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map(m => m[1]));
for (const [file, text] of contents) {
  const name = rel(file);
  if (name.startsWith('scripts/') || name.endsWith('.md')) continue;
  for (const match of text.matchAll(/(?:import\.meta\.env|process\.env)\.([A-Z][A-Z0-9_]+)/g)) {
    if (!declared.has(match[1])) add('P1','Environment',name,`Environment variable ${match[1]} is absent from .env.example`,'Deployment configuration can drift.','Document it or remove the usage.',`Line ${line(text,match.index)}`);
  }
  for (const pattern of [/localhost:\d+/gi,/127\.0\.0\.1:\d+/gi,/YOUR_[A-Z0-9_]+/g,/REPLACE_[A-Z0-9_]+/g,/CHANGE_ME/g]) {
    for (const match of text.matchAll(pattern)) add('P1','Environment',name,`Production source contains ${match[0]}`,'A local or placeholder configuration may be reachable.','Replace it with production configuration.',`Line ${line(text,match.index)}`);
  }
}

// HTML references
for (const [file, text] of contents) {
  if (path.extname(file).toLowerCase() !== '.html') continue;
  for (const match of text.matchAll(/(?:src|href)=["']([^"'#?]+)["']/gi)) {
    if (!targetExists(match[1], file)) add('P1','Frontend/assets',rel(file),`Referenced target is missing: ${match[1]}`,'The browser can return 404 and lose UI functionality.','Fix the path or restore the target.',`Line ${line(text,match.index)}`);
  }
}

// Relative JS/TS imports. Cache-busting query strings are valid and stripped before checking.
for (const [file, text] of contents) {
  if (!SOURCE.has(path.extname(file).toLowerCase())) continue;
  for (const match of text.matchAll(/(?:from\s+|import\s*\(|export\s+[^;]*?from\s+)["']([^"']+)["']/g)) {
    if (!match[1].startsWith('.')) continue;
    const spec = match[1].split(/[?#]/)[0];
    const raw = path.resolve(path.dirname(file), spec);
    const candidates = [raw, raw+'.js', raw+'.mjs', raw+'.ts', raw+'.tsx', raw+'.jsx', raw+'.json', path.join(raw,'index.js'), path.join(raw,'index.mjs'), path.join(raw,'index.ts'), path.join(raw,'index.tsx')];
    if (!candidates.some(fs.existsSync)) add('P0','Module graph',rel(file),`Broken local import: ${match[1]}`,'The module cannot load at runtime.','Correct the import or restore the missing module.',`Line ${line(text,match.index)}`);
  }
}

// Central route contract.
const routeFile = path.join(ROOT,'app/config/routes.js');
const routeText = read(routeFile);
if (!routeText) add('P0','Routes','app/config/routes.js','Central route contract is missing','Navigation and guards cannot be audited.','Restore routes.js.');
for (const match of routeText.matchAll(/\bpath\s*:\s*["'`]([^"'`]+)["'`]/g)) {
  if (match[1] === '/' || /^https?:/i.test(match[1])) continue;
  if (!targetExists(match[1], routeFile)) add('P1','Routes','app/config/routes.js',`Declared route has no repository target: ${match[1]}`,'Navigation can land on a missing page.','Map the route to an existing page or remove it.',`Line ${line(routeText,match.index)}`);
}

// Supabase function inventory and frontend invoke consistency.
const fnRoot = path.join(ROOT,'supabase/functions');
const functions = fs.existsSync(fnRoot) ? fs.readdirSync(fnRoot,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort() : [];
for (const fn of functions) if (!fs.existsSync(path.join(fnRoot,fn,'index.ts'))) add('P0','Supabase Edge Functions',`supabase/functions/${fn}`,'Missing index.ts entry point','The function cannot deploy from the repository.','Restore the entry point.');
for (const [file,text] of contents) for (const match of text.matchAll(/functions\.invoke\(\s*["'`]([^"'`]+)["'`]/g)) if (!functions.includes(match[1])) add('P0','Frontend→Edge',rel(file),`Frontend invokes missing Edge Function: ${match[1]}`,'The runtime call will fail.','Create/deploy the function or correct the invoked name.',`Line ${line(text,match.index)}`);

// Security signals: hard-coded credentials are blockers; DOM sinks are review items.
for (const [file,text] of contents) {
  const name=rel(file);
  if (name.startsWith('scripts/')) continue;
  const checks = [
    [/SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'`][^"'`]+["'`]/g,'P0','Hard-coded Supabase service-role secret'],
    [/OPENWA_(?:API_KEY|WORKER_TOKEN|WEBHOOK_SECRET)\s*=\s*["'`][^"'`]+["'`]/g,'P0','Hard-coded OpenWA credential'],
    [/Authorization:\s*["'`]Bearer\s+[A-Za-z0-9._-]{20,}["'`]/g,'P0','Hard-coded bearer credential'],
    [/eval\s*\(/g,'P0','eval() usage'],
    [/dangerouslySetInnerHTML\s*:/g,'P2','dangerouslySetInnerHTML requires sanitisation review'],
    [/\.innerHTML\s*=/g,'P2','innerHTML assignment requires XSS review']
  ];
  for (const [pattern,severity,label] of checks) for (const match of text.matchAll(pattern)) add(severity,'Security',name,label,'Potential credential exposure or injection risk.','Review the specific usage and replace with safe behaviour where required.',`Line ${line(text,match.index)}`);
}

// Required production boundaries.
const required = [
  ['app/auth/AuthService.js','Auth service'],['app/ai/AuthorityActionService.js','Authority action service'],['app/ai/CompanyTruthService.js','Company Truth'],['app/ai/HistoricalMemoryRetrievalService.js','Historical memory'],['app/ai/CustomerRelationshipMemoryEngine.js','Customer relationship memory'],['app/ai/RelationshipOperationalIntelligenceEngine.js','Operational intelligence'],['app/ai/AuthorityRoleIntelligenceEngine.js','Authority role intelligence'],['supabase/functions/ai-liaison-runtime/index.ts','AI liaison runtime'],['supabase/functions/openwa-communication-worker/index.ts','OpenWA communication worker']
];
for (const [file,label] of required) if (!exists(file)) add('P0','Architecture',file,`${label} is missing`,'A core production boundary is absent.',`Restore or replace ${label}.`);

const server = read(path.join(ROOT,'server.js'));
if (server && /app\.listen\(/.test(server)) add('P1','Deployment','server.js','Express development server coexists with the GitHub Pages/Supabase architecture','A deployment could accidentally depend on a local-only backend.','Keep it development-only and prove browser code does not depend on it.');

const order={P0:0,P1:1,P2:2};
findings.sort((a,b)=>(order[a.severity]-order[b.severity])||a.subsystem.localeCompare(b.subsystem)||a.file.localeCompare(b.file));
const counts=findings.reduce((out,f)=>(out[f.severity]=(out[f.severity]||0)+1,out),{});
const report={generatedAt:new Date().toISOString(),repository:'maliq273/isaacs-and-partners-website',branch:'main',filesScanned:files.length,sourceFilesScanned:[...contents].filter(([f])=>SOURCE.has(path.extname(f).toLowerCase())).length,edgeFunctions:functions,counts,findings};
const markdown=['# Isaacs & Partners — Production Check','',`Generated: ${report.generatedAt}`,'',`Files scanned: **${report.filesScanned}** | Source files: **${report.sourceFilesScanned}**`,'',`**P0:** ${counts.P0||0} | **P1:** ${counts.P1||0} | **P2:** ${counts.P2||0}`,'','| Severity | Subsystem | File | Missing / broken connection | Risk | Production action |','|---|---|---|---|---|---|',...findings.map(f=>`| ${f.severity} | ${f.subsystem} | \`${f.file}\` | ${f.missing.replaceAll('|','\\|')} | ${f.risk.replaceAll('|','\\|')} | ${f.action.replaceAll('|','\\|')} |`),'','> Static audit only. Live Supabase RLS, Edge Function, OpenWA, browser E2E, deployment, and secret/configuration tests remain required before production certification.',''].join('\n');
if (WRITE) { fs.mkdirSync(path.join(ROOT,'reports'),{recursive:true}); fs.writeFileSync(path.join(ROOT,'reports/production-check.json'),JSON.stringify(report,null,2)); fs.writeFileSync(path.join(ROOT,'reports/production-check.md'),markdown); }
console.log(`Production check: ${report.filesScanned} files scanned; P0=${counts.P0||0} P1=${counts.P1||0} P2=${counts.P2||0}`);
for (const f of findings) console.log(`[${f.severity}] ${f.subsystem} :: ${f.file} :: ${f.missing}`);
if (CI && ((counts.P0||0)>0 || (counts.P1||0)>0)) process.exit(1);
