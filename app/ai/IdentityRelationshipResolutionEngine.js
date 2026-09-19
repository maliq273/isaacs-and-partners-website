/**
 * Isaacs & Partners — Identity & Relationship Resolution Engine
 *
 * No identity table is introduced. This layer composes the existing
 * communication_contacts, profiles, businesses, matters and authority_directory
 * records. The inbound WhatsApp number is the hard identity anchor.
 */
import AuthorityRoleIntelligenceEngine from "./AuthorityRoleIntelligenceEngine.js";
function clean(v,max=500){return String(v??"").trim().slice(0,max)}
function phone(v){const raw=clean(v,64);if(!raw||/@lid/i.test(raw))return null;let d=raw.replace(/@c\\.us$/i,"").replace(/\\D/g,"");if(d.startsWith("00"))d=d.slice(2);if(d.startsWith("0"))d="27"+d.slice(1);return d||null}
const AUTHORITY_ROLES=new Set(["SUPER_ADMIN","DIRECTOR","SHAREHOLDER","PARTNER","STAKEHOLDER","STAFF"]);
export default class IdentityRelationshipResolutionEngine {
  constructor({db,authorityEngine=null}={}){if(!db)throw new Error("IdentityRelationshipResolutionEngine requires a Supabase admin client.");this.db=db;this.authority=authorityEngine||new AuthorityRoleIntelligenceEngine({db});}
  async resolveWhatsApp({phoneNumber,chatId=null,whatsappName=null}={}){
    const sourcePhone=phone(phoneNumber); const authority=await this.authority.resolveWhatsAppIdentity({phoneNumber,chatId,whatsappName});
    let contact=null,profile=null,businesses=[],matters=[];
    if(sourcePhone){
      const c=await this.db.from("communication_contacts").select("*").eq("is_active",true).or(`phone_number.eq.${sourcePhone},chat_id.eq.${sourcePhone}@c.us`).limit(5);if(c.error)throw c.error;contact=(c.data||[]).length===1?c.data[0]:(c.data||[]).length>1?{ambiguous:true,rows:c.data}:null;
    }
    if(!contact&&chatId){const c=await this.db.from("communication_contacts").select("*").eq("chat_id",chatId).eq("is_active",true).limit(5);if(c.error)throw c.error;contact=(c.data||[]).length===1?c.data[0]:(c.data||[]).length>1?{ambiguous:true,rows:c.data}:null;}
    const userId=authority.authenticated?authority.authority?.user_id:null;
    const resolvedUserId=userId||(!contact?.ambiguous?contact?.user_id:null)||null;
    if(resolvedUserId){
      const p=await this.db.from("profiles").select("id,first_name,last_name,email,phone,role,is_active").eq("id",resolvedUserId).maybeSingle();if(p.error)throw p.error;profile=p.data||null;
      const b=await this.db.from("businesses").select("id,legal_name,trading_name,registration_number,email,phone,is_active").eq("owner_user_id",resolvedUserId).eq("is_active",true);if(b.error)throw b.error;businesses=b.data||[];
      const m=await this.db.from("matters").select("id,reference_number,title,status,priority,business_id,individual_user_id,created_at,updated_at").or(`individual_user_id.eq.${resolvedUserId},created_by.eq.${resolvedUserId}`).limit(50);if(m.error)throw m.error;matters=m.data||[];
      if(businesses.length){const ids=businesses.map(x=>x.id);const bm=await this.db.from("matters").select("id,reference_number,title,status,priority,business_id,individual_user_id,created_at,updated_at").in("business_id",ids).limit(50);if(bm.error)throw bm.error;for(const row of bm.data||[])if(!matters.some(x=>x.id===row.id))matters.push(row);}
    }
    const role=authority.authenticated&&AUTHORITY_ROLES.has(String(authority.authorityRole||"").toUpperCase())?String(authority.authorityRole).toUpperCase():null;
    let identityType="UNKNOWN";
    if(role)identityType=role;
    else if(profile?.role==="BUSINESS")identityType="BUSINESS_CONTACT";
    else if(profile?.role==="INDIVIDUAL")identityType="CLIENT";
    else if(profile?.role==="STAFF")identityType="STAFF";
    else if(contact?.claimed_account_type)identityType="PROSPECT";
    else if(contact?.user_id==null&&String(contact?.identity_status||"").toUpperCase()==="UNAUTHENTICATED_WHATSAPP_CONTACT")identityType="PROSPECT";
    else if(contact)identityType="EXTERNAL_CONTACT";
    const relationshipTypes=[];
    if(role)relationshipTypes.push({type:"ORGANISATIONAL_AUTHORITY",role});
    if(profile?.role==="BUSINESS")relationshipTypes.push({type:"CLIENT_BUSINESS_OWNER",businessIds:businesses.map(x=>x.id)});
    if(profile?.role==="INDIVIDUAL")relationshipTypes.push({type:"INDIVIDUAL_CLIENT"});
    if(matters.length)relationshipTypes.push({type:"MATTER_PARTICIPANT",matterIds:matters.map(x=>x.id)});
    return{phoneNumber:sourcePhone,chatId:clean(chatId,255)||null,whatsappName:clean(whatsappName,255)||null,verified:Boolean(authority.authenticated||resolvedUserId),identityType,identityStatus:authority.authenticated?authority.identityStatus:resolvedUserId?"DATABASE_IDENTITY_RESOLVED":contact?.ambiguous?"AMBIGUOUS_CONTACT":"UNKNOWN_WHATSAPP_NUMBER",authority,contact:contact?.ambiguous?null:contact,profile,businesses,matters,relationships:relationshipTypes,authorityRole:role,userId:resolvedUserId,source:authority.authenticated?"authority_directory":contact?"communication_contacts":profile?"profiles":"none"};
  }
}
export { phone };
