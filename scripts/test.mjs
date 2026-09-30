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

console.log("Production smoke tests passed: required boundaries + communication approval + costing model verified.");
// Immigration/Anthony registry smoke tests.
const { IMMIGRATION_WORKFLOWS, workflowCapability } = await import('../app/immigration/ImmigrationWorkflowRegistry.js');
for (const code of ['DHA-84','DHA-1738','BI-947','BI-1712A','DHA-49','SECTION-22','SECTION-24','VISA-APPEAL-DG','VISA-APPEAL-MINISTER','WAIVER','UNDESIRABILITY-REVIEW']) {
  if (!IMMIGRATION_WORKFLOWS[code] || !workflowCapability(code).supported) {
    console.error('Immigration workflow registry missing or unsupported: '+code);
    process.exit(1);
  }
}
const { DHA1738_FORM, buildProgress, nextQuestion } = await import('../app/immigration/ApplicationIntakeRegistry.js');
if (DHA1738_FORM.fieldMap['Passport number'] !== 'passport.number') {
  console.error('DHA-1738 authority map failed: passport.number is not authoritative.');
  process.exit(1);
}
if (DHA1738_FORM.questions.length < 30 || DHA1738_FORM.documents.length < 10) {
  console.error('DHA-1738 registry is incomplete.');
  process.exit(1);
}
const p0=buildProgress({}, DHA1738_FORM.documents.map(d=>({key:d.key,status:'OUTSTANDING'})));
if (p0.questionsCompleted !== 0 || p0.status !== 'IN_PROGRESS') {
  console.error('DHA-1738 initial progress model failed.');
  process.exit(1);
}
const answered={};
for(const q of DHA1738_FORM.questions) answered[q.key]={status:'ANSWERED',value:'test'};
if(nextQuestion(answered)!==null) {
  console.error('DHA-1738 question engine final-state test failed.');
  process.exit(1);
}
console.log('PASS: Anthony immigration workflow registry + DHA-1738 authority/progress tests');
const { getApplicationDefinition, nextQuestionFor, buildProgressFor } = await import('../app/immigration/ApplicationIntakeRegistry.js');
for (const code of ['DHA-84','BI-947','BI-1712A','DHA-49','SECTION-22','SECTION-24','VISA-APPEAL-DG','VISA-APPEAL-MINISTER','WAIVER','UNDESIRABILITY-REVIEW']) {
  const def=getApplicationDefinition(code);
  if(!def || !def.questions?.length || !def.documents?.length) {
    console.error('Generic immigration intake registry incomplete: '+code);
    process.exit(1);
  }
  const states={};
  for(const q of def.questions) states[q.key]={status:'ANSWERED',value:'test'};
  if(nextQuestionFor(code,states)!==null) { console.error('Generic immigration question engine final-state failed: '+code); process.exit(1); }
  const progress=buildProgressFor(code,states,def.documents.map(d=>({key:d.key,status:d.required===false?'NOT_REQUIRED':'OUTSTANDING'})));
  if(progress.questionsCompleted!==def.questions.length || progress.status!=='READY_FOR_DOCUMENT_REVIEW') {
    console.error('Generic immigration progress engine failed: '+code); process.exit(1);
  }
}
for (const [form, mapFile] of [['DHA-84','coordinate-maps/DHA-84.json'],['BI-947','coordinate-maps/BI-947.json'],['BI-1712A','coordinate-maps/BI-1712A.json']]) {
  const map=JSON.parse(fs.readFileSync(path.join(root,'app/knowledgebase/immigration_docs',mapFile),'utf8'));
  if(map.coordinateStrategy!=='BBOX_LABEL_DYNAMIC' || !map.answerPaths || Object.keys(map.answerPaths).length===0) {
    console.error('Immigration coordinate map incomplete: '+form);
    process.exit(1);
  }
}
console.log('PASS: generic immigration intake/progress + coordinate-map registry tests');

const { default: HindsightMemoryService } = await import('../app/ai/HindsightMemoryService.js');
const hindsightSmoke = new HindsightMemoryService({ apiKey: '', enabled: true });
if (hindsightSmoke.enabled !== false || hindsightSmoke.bankId('client', 'TEST-123') !== 'anthony-client-test-123') {
  console.error('Hindsight adapter smoke test failed: disabled configuration or bank isolation is incorrect.');
  process.exit(1);
}
const hindsightSource = fs.readFileSync(path.join(root, 'supabase/functions/_shared/hindsight.ts'), 'utf8');
if (!hindsightSource.includes('/memories/recall') || !hindsightSource.includes('/memories') || !hindsightSource.includes('sensitive_data')) {
  console.error('Hindsight Edge adapter smoke test failed: retain/recall/memory-defense boundary is missing.');
  process.exit(1);
}
const truthSource = fs.readFileSync(path.join(root, 'app/ai/TruthFusionEngine.js'), 'utf8');
if (!truthSource.includes('HINDSIGHT LEARNED MEMORY (UNTRUSTED, NON-AUTHORITATIVE)')) {
  console.error('TruthFusion Hindsight boundary failed: learned memory must remain non-authoritative.');
  process.exit(1);
}
console.log('PASS: Hindsight learned-memory adapter + TruthFusion safety boundary');



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

