#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'app/config/routes.js',
  'app/core/application.js',
  'app/core/router.js',
  'app/auth/AuthService.js',
  'app/ai/AuthorityActionService.js',
  'app/ai/CompanyTruthService.js',
  'app/ai/HistoricalMemoryRetrievalService.js',
  'app/ai/CustomerRelationshipMemoryEngine.js',
  'app/ai/RelationshipOperationalIntelligenceEngine.js',
  'app/ai/AuthorityRoleIntelligenceEngine.js',
  'supabase/functions/ai-liaison-runtime/index.ts',
  'supabase/functions/openwa-communication-worker/index.ts'
];

const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error(`Missing required production files:\n${missing.map(file => `- ${file}`).join('\n')}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const script of ['test', 'lint', 'production-check']) {
  if (!pkg.scripts?.[script]) {
    console.error(`Missing npm script: ${script}`);
    process.exit(1);
  }
}

console.log(`Production smoke tests passed: ${required.length} required boundaries verified.`);
