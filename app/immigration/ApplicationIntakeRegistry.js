/**
 * Authoritative immigration application intake registry.
 * Shared by browser Anthony, WhatsApp Anthony, progress/audit and PDF population.
 */
export const DHA1738_FORM=Object.freeze({
  code:"DHA_1738",
  version:"2026-09-30",
  template:"immigrations_docs/FORM-DHA-1738_e-version.pdf",
  templateSha256:"dd692c36a9c18bfd7b89782ea22ce6905c99feecbfe64115c4edb1a4fafab220",
  fieldMap:Object.freeze({
    "Check Box14":"visa.critical_skills","SurnameFamily name":"identity.surname","Given names":"identity.first_names",
    "Year":"identity.dob_year","Month":"identity.dob_month","Day":"identity.dob_day","Text8":"identity.nationality",
    "Passport number":"identity.passportNumber","Outline your proposed activities whilst in the Republic":"intent.proposed_activities",
    "Title I Mr I Ms I Other specify":"identity.title","Maiden name":"identity.maiden_name","Stage name":"identity.stage_name",
    "Previousalternative namesaliases including details":"identity.previous_names","Date of divorce":"identity.date_of_divorce",
    "If acquired other than by birth date and conditions under which acquired":"citizenship.acquisition_details",
    "If so of which country plus details":"citizenship.other_citizenship_details","Country of issue":"passport.issue_country",
    "Type of document":"passport.other_document_type","Number":"passport.other_document_number",
    "Postal code                                   Postal code":"residence.postal_code","Telephone No Work incl area code":"contact.work_phone",
    "Home incl area code":"contact.phone","Address":"residence.address","Period":"residence.previous_period","Country":"residence.previous_country",
    "If no specify period and present status":"immigration.current_status","Yes D No D If yes specify the country":"immigration.asylum_country",
    "Name":"contact_person.name","Address_2":"contact_person.address","Telephone No Work incl area code_2":"contact_person.work_phone",
    "Home incl area code_2":"contact_person.phone","Name_2":"sa_relatives.name","Address_3":"sa_relatives.address",
    "Relationship":"sa_relatives.relationship","Identity No":"sa_relatives.identity_number",
    "Have you ever been refused entry into or deported from the Republic If so please provide details":"immigration.refusal_details"
  }),
  questions:Object.freeze([
    ["identity.title","Title","What is your title (Mr, Ms, Mrs, Dr, or another title)?"],
    ["identity.surname","Surname","What is your surname/family name?"],
    ["identity.first_names","Given names","What are your full given names exactly as they appear in your passport?"],
    ["identity.maiden_name","Maiden name","If applicable, what is your maiden name? If not applicable, reply 'Not applicable'."],
    ["identity.stage_name","Stage name","If applicable, do you use a stage/professional name? If not, reply 'Not applicable'."],
    ["identity.previous_names","Previous/alternative names","Have you ever used previous, alternative or alias names? If none, reply 'None'."],
    ["identity.date_of_divorce","Date of divorce","If you have been divorced, what was the date of divorce? If not applicable, reply 'Not applicable'."],
    ["citizenship.acquisition_details","Citizenship acquisition details","If your citizenship was acquired other than by birth, give the date and conditions. If acquired by birth, reply 'By birth'."],
    ["citizenship.other_citizenship_details","Other citizenship details","Do you hold or have you held citizenship of another country? If yes, give country and details. If no, reply 'No'."],
    ["passport.issue_country","Passport country of issue","Which country issued your passport?"],
    ["passport.other_document_type","Other travel-document type","Do you hold another travel document? If yes, give the type. If not, reply 'None'."],
    ["passport.other_document_number","Other travel-document number","If you have another travel document, what is its number? If none, reply 'Not applicable'."],
    ["residence.address","Residential address","What is your current residential address, including suburb/city and country?"],
    ["residence.postal_code","Postal code","What is the postal code for your current residential address?"],
    ["contact.work_phone","Work telephone","What is your work telephone number, including country/area code? If not applicable, reply 'Not applicable'."],
    ["contact.phone","Home/contact telephone","What is your preferred home/contact telephone number, including country code?"],
    ["residence.previous_period","Previous residence period","If you lived at another residence before your current address, give the period from/to. If not applicable, reply 'Not applicable'."],
    ["residence.previous_country","Previous residence country","If applicable, which country was that previous residence in? If not applicable, reply 'Not applicable'."],
    ["immigration.current_status","Current immigration status","What is your current South African immigration status or visa/permit status? If you are outside South Africa, say so."],
    ["immigration.asylum_country","Asylum/refugee-country information","Have you claimed asylum or refugee status in another country? If yes, give the country and details. If no, reply 'No'."],
    ["contact_person.name","Contact-person information","Please provide the full name of your contact person in South Africa, or tell me if you do not have one."],
    ["contact_person.address","Contact-person address","What is your South African contact person's address? If not applicable, reply 'Not applicable'."],
    ["contact_person.work_phone","Contact-person work telephone","What is your South African contact person's work telephone number? If not applicable, reply 'Not applicable'."],
    ["contact_person.phone","Contact-person home/contact telephone","What is your South African contact person's home/contact telephone number? If not applicable, reply 'Not applicable'."],
    ["sa_relatives.name","South African relatives/friends","Do you have South African relatives or friends relevant to this application? If yes, give the full name. If no, reply 'No'."],
    ["sa_relatives.address","SA relative/friend address","If applicable, what is the South African relative/friend's address?"],
    ["sa_relatives.relationship","SA relative/friend relationship","If applicable, what is your relationship to the South African relative/friend?"],
    ["sa_relatives.identity_number","SA relative/friend identity number","If applicable, what is the South African relative/friend's South African identity number?"],
    ["immigration.refusal_details","Refusal/deportation details","Have you ever been refused entry to, deported from, or declared undesirable in South Africa? If yes, provide details. If no, reply 'No'."],
    ["visa.critical_skills","Critical Skills selection","Please confirm the Critical Skills occupation/category for which you are applying."],
    ["intent.proposed_activities","Proposed activities","Briefly describe the activities you propose to undertake in South Africa, including your role, employer and work location where applicable."]
  ].map(([key,label,prompt])=>Object.freeze({key,label,prompt}))),
  documents:Object.freeze([
    ["passport_biodata","Passport biodata page","UPLOAD"],["passport_validity","Valid passport / passport validity evidence","UPLOAD"],
    ["offer_employment","Signed offer of employment / employer letter","UPLOAD"],["qualification","Highest relevant qualification certificate","UPLOAD"],
    ["saqa","SAQA evaluation / proof of SAQA application where applicable","UPLOAD"],
    ["professional_body","Professional-body / council / board confirmation where applicable","UPLOAD"],
    ["professional_registration","Professional registration / proof of application where required by law","UPLOAD"],
    ["proof_residence","Proof of current residential address","UPLOAD"],["current_sa_status","Current South African visa / permit / status document where applicable","UPLOAD"],
    ["police_clearance","Police clearance where required","UPLOAD"],["medical_report","Medical / radiological report where required","UPLOAD"],
    ["yellow_fever","Yellow fever certificate where applicable","UPLOAD"],["payment_proof","Proof of payment / recorded payment","STAFF"],
    ["employer_undertakings","Employer undertakings / supporting employer documents","STAFF"]
  ].map(([key,label,clientAction])=>Object.freeze({key,label,clientAction})))
});
export function valueAt(obj,path){return String(path||"").split(".").reduce((v,k)=>v?.[k],obj)}
export function setAt(obj,path,value){const p=String(path||"").split(".");let t=obj;for(let i=0;i<p.length-1;i++)t=t[p[i]]??={};t[p.at(-1)]=value;return obj}
export function normalizeAnswer(value){const s=String(value??"").trim();if(!s)return{status:"PENDING",value:null};if(/^(not applicable|n\/a|na|none|no|not required|by birth)$/i.test(s))return{status:"NOT_APPLICABLE",value:s};return{status:"ANSWERED",value:s}}
export function nextQuestion(states={}){return DHA1738_FORM.questions.find(q=>!["ANSWERED","NOT_APPLICABLE"].includes(String(states[q.key]?.status||"").toUpperCase()))||null}
export function buildProgress(states={},documents=[]){const qt=DHA1738_FORM.questions.length,qc=DHA1738_FORM.questions.filter(q=>["ANSWERED","NOT_APPLICABLE"].includes(String(states[q.key]?.status||"").toUpperCase())).length,dt=DHA1738_FORM.documents.length,dc=DHA1738_FORM.documents.filter(d=>["ON_FILE","VERIFIED","NOT_REQUIRED","PAID"].includes(String(documents.find(x=>x.key===d.key)?.status||"").toUpperCase())).length,qp=qt?Math.round(qc/qt*100):0,dp=dt?Math.round(dc/dt*100):0;return{version:1,questionsTotal:qt,questionsCompleted:qc,questionPercent:qp,documentsTotal:dt,documentsCompleted:dc,documentPercent:dp,overallPercent:Math.round((qp+dp)/2),status:qc===qt?"READY_FOR_DOCUMENT_REVIEW":"IN_PROGRESS"}}
export default DHA1738_FORM;
