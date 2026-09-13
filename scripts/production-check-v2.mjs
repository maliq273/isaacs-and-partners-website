#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ci = process.argv.includes('--ci') || process.env.CI === 'true';
const write = process.argv.includes('--write') || ci;
const ignore = new Set(['.git','node_modules','dist','build','coverage','.next','.cache','reports']);
const textExt = new Set(['.js','.mjs','.cjs','.ts','.tsx','.jsx','.html','.css','.json','.toml','.yml','.yaml','.md','.txt','.sql']);
const sourceExt = new Set(['.js','.mjs','.cjs','.ts','.tsx','.jsx']);
const files=[]; const text=new Map(); const findings=[];
const rel=p=>path.relative(root,p).replaceAll(path.sep,'/');
const add=(severity,subsystem,file,missing,risk,action,detail='')=>findings.push({severity,subsystem,file,missing,risk,action,detail});
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(ignore.has(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(textExt.has(path.extname(e.name).toLowerCase())||e.name.startsWith('.env'))files.push(p)}}
function read(p){if(text.has(p))return text.get(p);try{const v=fs.readFileSync(p,'utf8');text.set(p,v);return v}catch{return ''}}
function exists(p){return fs.existsSync(path.join(root,p))}
function line(t,i){return t.slice(0,i).split(/\r?\n/).length}
function resolveTarget(target,from){const clean=target.split(/[?#]/)[0];if(!clean||/^(https?:|mailto:|tel:|javascript:|data:)/i.test(clean))return true;const base=clean.startsWith('/')?root:path.dirname(from);const raw=path.resolve(base,clean.replace(/^\//,''));const c=[raw,raw+'.html',raw+'.js',raw+'.mjs',raw+'.css',raw+'.json',...['index.html','index.js','index.mjs'].map(x=>path.join(raw,x))];return c.some(fs.existsSync)}
walk(root); files.forEach(read);

let pkg={};try{pkg=JSON.parse(read(path.join(root,'package.json')))}catch{add('P0','CI/testing','package.json','Invalid or missing package.json','The project cannot be reliably installed.','Repair package.json.')}
if(!pkg.scripts?.test)add('P1','CI/testing','package.json','No npm test script','No standard automated test entry point exists.','Add unit/integration tests and gate production on them.');
if(!pkg.scripts?.lint)add('P1','CI/testing','package.json','No lint script','Static regressions can reach main unnoticed.','Add lint/static analysis and run it in CI.');
if(!pkg.scripts?.['production-check'])add('P0','CI/testing','package.json','No production-check command','The repo cannot self-audit its production wiring.','Add the production-check command.');
if(!exists('.github/workflows/production-check.yml'))add('P0','CI/testing','.github/workflows/production-check.yml','No production-check workflow','Commits are not automatically audited.','Add the GitHub Actions gate.');
if(!exists('package-lock.json'))add('P1','CI/testing','package-lock.json','No npm lockfile','Dependency installation is not reproducible.','Commit package-lock.json and use npm ci in CI.');

const env=read(path.join(root,'.env.example'));const declared=new Set([...env.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map(m=>m[1]));
for(const [p,t] of text){const r=rel(p);if(r.startsWith('scripts/'))continue;for(const m of t.matchAll(/(?:import\.meta\.env|process\.env)\.([A-Z][A-Z0-9_]+)/g)){if(!declared.has(m[1]))add('P1','Environment',r,`Environment variable ${m[1]} is absent from .env.example`,'Deployment configuration can drift.','Document it in .env.example or remove the usage.',`Line ${line(t,m.index)}`)}if(!r.endsWith('.md'))for(const re of [/localhost:\d+/gi,/127\.0\.0\.1:\d+/gi,/YOUR_[A-Z0-9_]+/g,/REPLACE_[A-Z0-9_]+/g,/CHANGE_ME/g])for(const m of t.matchAll(re))add('P1','Environment',r,`Production source contains ${m[0]}`,'A local or placeholder configuration may be reachable.','Replace it with production configuration.',`Line ${line(t,m.index)}`)} }

for(const [p,t] of text){if(path.extname(p).toLowerCase()==='.html')for(const m of t.matchAll(/(?:src|href)=["']([^"'#?]+)["']/gi))if(!resolveTarget(m[1],p))add('P1','Frontend/assets',rel(p),`Referenced target is missing: ${m[1]}`,'The browser can return 404 and lose UI functionality.','Fix the path or restore the target.',`Line ${line(t,m.index)}`)}

for(const [p,t] of text)if(sourceExt.has(path.extname(p).toLowerCase()))for(const m of t.matchAll(/(?:from\s+|import\s*\(|export\s+[^;]*?from\s+)["']([^"']+)["']/g)){let s=m[1];if(!s.startsWith('.'))continue;s=s.split(/[?#]/)[0];const raw=path.resolve(path.dirname(p),s);const c=[raw,...['.js','.mjs','.ts','.tsx','.jsx','.json'].map(x=>raw+x),...['index.js','index.mjs','index.ts','index.tsx'].map(x=>path.join(raw,x))];if(!c.some(fs.existsSync))add('P0','Module graph',rel(p),`Broken local import: ${m[1]}`,'The module cannot load at runtime.','Correct the import path or restore the module.',`Line ${line(t,m.index)}`)}

const routeFile=path.join(root,'app/config/routes.js');const rt=read(routeFile);if(!rt)add('P0','Routes','app/config/routes.js','Central route contract is missing','Navigation and guards cannot be audited.','Restore routes.js.');
for(const m of rt.matchAll(/\bpath\s*:\s*["'`]([^"'`]+)["'`]/g))if(m[1]!=='/'&&!resolveTarget(m[1],routeFile))add('P1','Routes','app/config/routes.js',`Declared route has no repository target: ${m[1]}`,'Navigation can land on a missing page.','Map the route to an existing page or remove it.',`Line ${line(rt,m.index)}`);

const fnRoot=path.join(root,'supabase/functions');const functions=fs.existsSync(fnRoot)?fs.readdirSync(fnRoot,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort():[];
for(const fn of functions)if(!fs.existsSync(path.join(fnRoot,fn,'index.ts')))add('P0','Supabase Edge Functions',`supabase/functions/${fn}`,'Missing index.ts entry point','The function cannot deploy from the repository.','Restore the entry point.');
const invokes=new Map();for(const [p,t] of text)for(const m of t.matchAll(/functions\.invoke\(\s*["'`]([^"'`]+)["'`]/g))invokes.set(m[1],rel(p));for(const [fn,p] of invokes)if(!functions.includes(fn))add('P0','Frontend→Edge',p,`Frontend invokes missing Edge Function: ${fn}`,'The runtime call will fail.','Create/deploy the function or correct the invoked name.');

// Security signals: literal HTML is not automatically an XSS vulnerability.
// Flag only dynamic innerHTML assignments; static literals are handled as safe markup.
for(const [p,t] of text){const r=rel(p);if(r.startsWith('scripts/'))continue;const checks=[[/SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'`][^"'`]+["'`]/g,'P0','Hard-coded Supabase service-role secret'],[/OPENWA_(?:API_KEY|WORKER_TOKEN|WEBHOOK_SECRET)\s*=\s*["'`][^"'`]+["'`]/g,'P0','Hard-coded OpenWA credential'],[/Authorization:\s*["'`]Bearer\s+[A-Za-z0-9._-]{20,}["'`]/g,'P0','Hard-coded bearer credential'],[/eval\s*\(/g,'P0','eval() usage'],[/dangerouslySetInnerHTML\s*:/g,'P2','dangerouslySetInnerHTML requires sanitisation review']];for(const [re,s,label] of checks)for(const m of t.matchAll(re))add(s,'Security',r,label,'Potential credential exposure or injection risk.','Review the specific usage and replace with safe behaviour where required.',`Line ${line(t,m.index)}`);
for(const m of t.matchAll(/\.innerHTML\s*=\s*([^;\n]+)/g)){const rhs=m[1].trim();const isStaticLiteral=/^(?:["'](?:[^"'\\]|\\.)*["']|`(?:[^`\\]|\\.)*`)$/.test(rhs);if(isStaticLiteral&&!rhs.includes('${'))continue;add('P2','Security',r,'Dynamic innerHTML assignment requires XSS review','Untrusted or insufficiently constrained HTML may execute in the browser.','Prefer textContent/DOM construction, or sanitise HTML with a trusted allowlist before insertion.',`Line ${line(t,m.index)}`)} }

for(const [p,label] of [['app/auth/AuthService.js','Auth service'],['app/ai/AuthorityActionService.js','Authority action service'],['app/ai/CompanyTruthService.js','Company Truth'],['app/ai/HistoricalMemoryRetrievalService.js','Historical memory'],['app/ai/CustomerRelationshipMemoryEngine.js','Customer relationship memory'],['app/ai/RelationshipOperationalIntelligenceEngine.js','Operational intelligence'],['app/ai/AuthorityRoleIntelligenceEngine.js','Authority role intelligence'],['supabase/functions/ai-liaison-runtime/index.ts','AI liaison runtime'],['supabase/functions/openwa-communication-worker/index.ts','OpenWA communication worker']])if(!exists(p))add('P0','Architecture',p,`${label} is missing`,'A core production boundary is absent.',`Restore or intentionally replace ${label}.`);

const server=read(path.join(root,'server.js'));if(server&&/app\.listen\(/.test(server))add('P1','Deployment','server.js','Express development server coexists with the GitHub Pages/Supabase architecture','A deployment could accidentally depend on a local-only backend.','Keep it development-only and prove browser code does not depend on it.');

const severity={P0:0,P1:1,P2:2};findings.sort((a,b)=>(severity[a.severity]-severity[b.severity])||a.subsystem.localeCompare(b.subsystem)||a.file.localeCompare(b.file));const counts=findings.reduce((a,f)=>(a[f.severity]=(a[f.severity]||0)+1,a),{});const report={generatedAt:new Date().toISOString(),repository:'maliq273/isaacs-and-partners-website',branch:'main',filesScanned:files.length,sourceFilesScanned:[...text].filter(([p])=>sourceExt.has(path.extname(p).toLowerCase())).length,edgeFunctions:functions,counts,findings};
const md=['# Isaacs & Partners — Production Check','',`Generated: ${report.generatedAt}`,'',`Files scanned: **${report.filesScanned}** | Source files: **${report.sourceFilesScanned}**`,'',`**P0:** ${counts.P0||0} | **P1:** ${counts.P1||0} | **P2:** ${counts.P2||0}`,'','## Findings','','| Severity | Subsystem | File | Missing / broken connection | Risk | Production action |','|---|---|---|---|---|---|',...findings.map(f=>`| ${f.severity} | ${f.subsystem} | \`${f.file}\` | ${f.missing.replaceAll('|','\\|')} | ${f.risk.replaceAll('|','\\|')} | ${f.action.replaceAll('|','\\|')} |`),'','> Static audit only. Live Supabase RLS, Edge Function, OpenWA, browser E2E, deployment, and secret/configuration tests remain required before production certification.',''].join('\n');
if(write){fs.mkdirSync(path.join(root,'reports'),{recursive:true});fs.writeFileSync(path.join(root,'reports/production-check.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(root,'reports/production-check.md',),md)}
console.log(`Production check: ${report.filesScanned} files scanned; P0=${counts.P0||0} P1=${counts.P1||0} P2=${counts.P2||0}`);for(const f of findings)console.log(`[${f.severity}] ${f.subsystem} :: ${f.file} :: ${f.missing}`);if(ci&&(counts.P0||counts.P1))process.exit(1);
