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

// Verify Communication message thread model approval_needed flag
const { default: Communication } = await import('../app/models/Communication.js');
const commDefault = new Communication({ message: 'Test message' });
if (commDefault.approval_needed !== false || commDefault.approvalNeeded !== false) {
  console.error('Communication model failed: approval_needed flag must default to false.');
  process.exit(1);
}
commDefault.markApprovalNeeded();
if (commDefault.approval_needed !== true || commDefault.status !== 'APPROVAL_NEEDED') {
  console.error('Communication model failed: markApprovalNeeded must set approval_needed to true.');
  process.exit(1);
}

// Verify WhatsAppAgent orchestrator transition to approval_needed state
const { default: WhatsAppAgent, CONVERSATION_STATES } = await import('../app/communication/agents/WhatsAppAgent.js');
if (CONVERSATION_STATES.APPROVAL_NEEDED !== 'approval_needed') {
  console.error('WhatsAppAgent failed: CONVERSATION_STATES.APPROVAL_NEEDED must be approval_needed.');
  process.exit(1);
}

const agent = new WhatsAppAgent();
const sensitiveResult = await agent.handleInbound({
  chatId: 'test-smoke-approval',
  body: 'We need urgent assistance preparing an appeal strategy and CCMA litigation dismissal filing.'
});
if (sensitiveResult.action !== 'APPROVAL_NEEDED' || sensitiveResult.approval_needed !== true || sensitiveResult.context.state !== 'approval_needed') {
  console.error('WhatsAppAgent failed: Inbound query requiring human review must transition to approval_needed state.');
  process.exit(1);
}

console.log(`Production smoke tests passed: ${required.length} required boundaries + communication approval verified.`);
