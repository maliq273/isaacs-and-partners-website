/**
 * ImmigrationInterviewEngine
 * Turns an immigration matter into a progressive, evidence-driven interview.
 *
 * Rule: never guess a material application field. If evidence is missing,
 * return a question or a review item instead.
 */

const COMMON = [
  {key:"identity.surname",q:"What is your surname exactly as it appears in your passport?",required:true},
  {key:"identity.first_names",q:"What are your first names exactly as they appear in your passport?",required:true},
  {key:"identity.date_of_birth",q:"What is your date of birth?",required:true},
  {key:"identity.place_of_birth",q:"Where were you born?",required:true},
  {key:"identity.nationality",q:"What is your nationality?",required:true},
  {key:"identity.gender",q:"What is your gender as recorded in your travel document?",required:true},
  {key:"passport.number",q:"What is your current passport or travel-document number?",required:true},
  {key:"passport.issue_date",q:"When was the passport issued?",required:true},
  {key:"passport.expiry_date",q:"When does the passport expire?",required:true},
  {key:"contact.email",q:"What email address should be used for the application?",required:true},
  {key:"contact.phone",q:"What mobile number should be used for the application?",required:true},
  {key:"residence.current_country",q:"Which country are you currently living in?",required:true},
  {key:"residence.address",q:"What is your current residential address?",required:true},
  {key:"immigration.current_status",q:"What is your current immigration status in South Africa, if any?",required:true},
  {key:"immigration.entry_date",q:"When did you last enter South Africa?",required:true},
  {key:"immigration.previous_applications",q:"Have you previously applied for a South African visa, permit, asylum or refugee status? If yes, give the details.",required:true},
  {key:"immigration.refusals",q:"Has any South African immigration application ever been refused, withdrawn, cancelled or declared undesirable? Explain.",required:true},
  {key:"compliance.criminal_history",q:"Have you ever been arrested, convicted, charged or found guilty of an offence in any country? Explain if yes.",required:true}
];

const ROUTES = {
  visitor_visa:[
    {key:"purpose.visit",q:"What is the purpose of your visit to South Africa?",required:true},
    {key:"travel.intended_entry_date",q:"What date do you intend to enter South Africa?",required:true},
    {key:"travel.intended_departure_date",q:"What date do you intend to leave South Africa?",required:true},
    {key:"travel.accommodation",q:"Where will you stay in South Africa?",required:true},
    {key:"finance.funding_source",q:"Who will pay for your trip and stay?",required:true},
    {key:"travel.return_ticket",q:"Do you have, or will you obtain, a return/onward ticket?",required:true}
  ],
  temporary_residence:[
    {key:"purpose.activity",q:"What exactly will you do in South Africa?",required:true},
    {key:"purpose.duration",q:"How long do you intend to remain in South Africa?",required:true},
    {key:"sponsor.name",q:"Who is sponsoring, employing, hosting or supporting the application?",required:true},
    {key:"sponsor.address",q:"What is the sponsor/employer/host address?",required:true}
  ],
  critical_skills:[
    {key:"employment.occupation",q:"What occupation will you perform in South Africa?",required:true},
    {key:"employment.employer",q:"Do you have a South African employer? If yes, give the employer details.",required:true},
    {key:"employment.job_title",q:"What is the position or job title?",required:true},
    {key:"employment.start_date",q:"When will the employment start?",required:true},
    {key:"employment.salary",q:"What remuneration will you receive?",required:true},
    {key:"qualifications.highest",q:"What is your highest relevant qualification?",required:true},
    {key:"qualifications.institution",q:"Which institution awarded the qualification and in which country?",required:true},
    {key:"professional.registration",q:"Does the occupation require registration with a professional body? If yes, which one?",required:true}
  ],
  general_work:[
    {key:"employment.employer",q:"Who is the prospective South African employer?",required:true},
    {key:"employment.job_title",q:"What position have you been offered?",required:true},
    {key:"employment.salary",q:"What salary and benefits are offered?",required:true},
    {key:"employment.contract",q:"Do you have a signed employment contract?",required:true},
    {key:"employment.labour_certificate",q:"Has the required Department of Employment and Labour certification/recommendation been obtained?",required:true},
    {key:"qualifications.experience",q:"Describe your qualifications and relevant work experience.",required:true}
  ],
  intra_company_transfer:[
    {key:"employment.foreign_employer",q:"What is the foreign employer's legal name and country?",required:true},
    {key:"employment.sa_entity",q:"What is the South African affiliated entity's legal name?",required:true},
    {key:"employment.transfer_role",q:"What position and duties will you perform in South Africa?",required:true},
    {key:"employment.transfer_period",q:"What is the intended transfer period?",required:true},
    {key:"employment.relationship",q:"Describe the corporate relationship between the foreign and South African entities.",required:true}
  ],
  business_visa:[
    {key:"business.activity",q:"What business activity will you conduct in South Africa?",required:true},
    {key:"business.investment",q:"How much capital will be invested and from what source?",required:true},
    {key:"business.enterprise",q:"What is the South African business entity and ownership structure?",required:true},
    {key:"business.jobs",q:"How many jobs are expected to be created or maintained?",required:true},
    {key:"business.national_interest",q:"Explain the expected contribution to South Africa.",required:true}
  ],
  section_22_asylum:[
    {key:"asylum.entry",q:"How and when did you enter South Africa?",required:true},
    {key:"asylum.reason",q:"Why did you leave your country of origin?",required:true},
    {key:"asylum.persecution",q:"Who do you fear, what harm do you fear, and why are you personally at risk?",required:true},
    {key:"asylum.events",q:"Give a chronological account of the events that caused you to flee.",required:true},
    {key:"asylum.protection",q:"Why could you not obtain protection from the authorities in your country?",required:true},
    {key:"asylum.internal_relocation",q:"Could you safely relocate to another part of your country? Explain.",required:true},
    {key:"asylum.other_country",q:"Did you seek protection or refugee status in another country or pass through another country where protection was available? Explain.",required:true},
    {key:"asylum.evidence",q:"What evidence supports your account?",required:true}
  ],
  section_24_refugee_status:[
    {key:"refugee.file_number",q:"What is your asylum seeker file/reference number?",required:true},
    {key:"refugee.decision",q:"What decision was made on your asylum application?",required:true},
    {key:"refugee.decision_date",q:"When was the decision made?",required:true},
    {key:"refugee.current_permit",q:"What Section 22 or other refugee document do you currently hold?",required:true}
  ],
  refugee_appeal:[
    {key:"appeal.decision_document",q:"Please upload the refusal/decision document.",required:true},
    {key:"appeal.decision_date",q:"When did you receive the decision?",required:true},
    {key:"appeal.grounds",q:"Why do you say the decision should be reconsidered or overturned?",required:true},
    {key:"appeal.new_evidence",q:"What new or previously overlooked evidence supports the appeal?",required:true},
    {key:"appeal.previous_representations",q:"Were representations or an appeal previously submitted? If yes, provide them.",required:true}
  ],
  immigration_appeal:[
    {key:"appeal.refusal",q:"Please upload the refusal/negative decision.",required:true},
    {key:"appeal.application_type",q:"What visa, permit or application was refused?",required:true},
    {key:"appeal.decision_date",q:"When was the refusal received?",required:true},
    {key:"appeal.grounds",q:"What factual or legal grounds do you rely on?",required:true},
    {key:"appeal.supporting_evidence",q:"What evidence supports each ground?",required:true}
  ]
};

const ALIASES = {
  appeal:"immigration_appeal",
  "visa appeal":"immigration_appeal",
  "refugee appeal":"refugee_appeal",
  asylum:"section_22_asylum",
  "section 22":"section_22_asylum",
  "section 24":"section_24_refugee_status",
  "temporary visa":"temporary_residence",
  "temp visa":"temporary_residence",
  visitor:"visitor_visa",
  "visitor visa":"visitor_visa",
  "critical skills":"critical_skills",
  "general work":"general_work",
  ict:"intra_company_transfer",
  "intra company transfer":"intra_company_transfer",
  "business visa":"business_visa",
  "permanent residence":"permanent_residence"
};

function norm(v){return String(v??"").trim().toLowerCase();}
function pathGet(obj,path){return String(path).split(".").reduce((x,k)=>x?.[k],obj);}
function pathSet(obj,path,value){const p=String(path).split(".");let x=obj;for(let i=0;i<p.length-1;i++)x=x[p[i]]??=( {} );x[p.at(-1)]=value;}

export default class ImmigrationInterviewEngine {
  constructor({caseType=null, answers={}, evidence=[]}={}) {
    this.caseType=this.resolveCaseType(caseType);
    this.answers={...answers};
    this.evidence=Array.isArray(evidence)?evidence:[];
  }

  resolveCaseType(value){
    const n=norm(value);
    return ALIASES[n] || n.replace(/\s+/g,"_") || "temporary_residence";
  }

  setCaseType(value){this.caseType=this.resolveCaseType(value);return this;}

  setAnswer(key,value,source="CLIENT"){
    pathSet(this.answers,key,{value,source,status:"UNCONFIRMED"});
    return this;
  }

  ingestEvidence(items=[]){
    for(const item of items){
      if(!item?.key)continue;
      pathSet(this.answers,item.key,{value:item.value,source:item.source||"DOCUMENT",status:"DOCUMENT_VERIFIED",evidenceId:item.evidenceId||null});
    }
    return this;
  }

  questions(){
    const route=ROUTES[this.caseType]||ROUTES.temporary_residence;
    return [...COMMON,...route];
  }

  getNextQuestions(limit=5){
    return this.questions().filter(x=>{
      const v=pathGet(this.answers,x.key);
      return !v || v.value===null || v.value===undefined || String(v.value).trim()==="";
    }).slice(0,limit);
  }

  conflicts(){
    const out=[];
    for(const q of this.questions()){
      const v=pathGet(this.answers,q.key);
      if(Array.isArray(v?.sources) && v.sources.length>1){
        const vals=[...new Set(v.sources.map(x=>String(x.value)))];
        if(vals.length>1)out.push({key:q.key,values:vals,action:"CLIENT_CONFIRMATION_REQUIRED"});
      }
    }
    return out;
  }

  completeness(){
    const qs=this.questions();
    const missing=qs.filter(q=>q.required && !pathGet(this.answers,q.key)?.value);
    return {required:qs.filter(q=>q.required).length,answered:qs.filter(q=>pathGet(this.answers,q.key)?.value).length,missing,ready:missing.length===0 && this.conflicts().length===0};
  }

  buildQuestionPlan(){
    const c=this.completeness();
    return {caseType:this.caseType,nextQuestions:this.getNextQuestions(8),missing:c.missing,conflicts:this.conflicts(),ready:c.ready};
  }
}
