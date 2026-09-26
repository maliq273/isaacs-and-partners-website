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

// Verify CostingModelService and Pricing Approval Workflow (compile price and ask approval before sending)
const { default: CostingModelService } = await import('../app/ai/CostingModelService.js');
const costing = new CostingModelService();
const quote = costing.compilePriceQuote({
  domain: 'IMMIGRATION',
  message: 'How much for work visa?',
  costingCentre: { approved: true, fixedPrice: 6500, currency: 'ZAR' }
});
if (!quote || !quote.estimatedTotal || !quote.depositAmount || !quote.actionButtons || quote.actionButtons.length !== 2) {
  console.error('CostingModelService failed: compiled quote must contain pricing breakdown and interactive action buttons.');
  process.exit(1);
}

const pricingResult = await agent.handleInbound({
  chatId: 'test-smoke-quote',
  body: 'How much does a critical skills work visa cost?'
});
if (pricingResult.action !== 'APPROVAL_NEEDED' || pricingResult.approval_needed !== true || pricingResult.context.state !== 'approval_needed' || !pricingResult.compiledQuote) {
  console.error('WhatsAppAgent pricing flow failed: quote request must compile pricing from costing model and transition to approval_needed.');
  process.exit(1);
}

console.log(`Production smoke tests passed: ${required.length} required boundaries + communication approval + costing model verified.`);

// Run comprehensive app/tests test suite
import assert from 'node:assert/strict';

globalThis.describe = (name, fn) => { fn(); };
globalThis.test = (name, fn) => { fn(); };
globalThis.expect = (actual) => ({
  toBeDefined: () => assert.notEqual(actual, undefined),
  toBeUndefined: () => assert.equal(actual, undefined),
  toBe: (expected) => assert.equal(actual, expected),
  toEqual: (expected) => assert.deepEqual(actual, expected),
  toBeTruthy: () => assert.ok(actual),
  toBeFalsy: () => assert.ok(!actual),
  toBeGreaterThan: (n) => assert.ok(actual > n),
  toBeLessThan: (n) => assert.ok(actual < n),
  toContain: (item) => assert.ok(actual?.includes ? actual.includes(item) : false),
});

const testFiles = [
  '../app/tests/ai.test.js',
  '../app/tests/knowledgebase.test.js',
  '../app/tests/service-intelligence.test.js',
  '../app/tests/truth-fusion.test.js',
  '../app/tests/workflow.test.js'
];

for (const tf of testFiles) {
  try {
    await import(tf);
    console.log(`PASS: ${path.basename(tf)}`);
  } catch (err) {
    console.error(`FAIL: ${path.basename(tf)}:`, err);
    process.exit(1);
  }
}

console.log(`All unified test suites passed (${required.length} smoke checks + ${testFiles.length} deep unit/integration suites).`);

