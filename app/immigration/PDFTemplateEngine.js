/**
 * Browser-safe specification layer for exact government-form generation.
 *
 * Binary PDF manipulation belongs in the trusted server/Edge Function.
 * This module prepares the canonical field/value payload and refuses to
 * silently fill unknown fields.
 */

export default class PDFTemplateEngine {
  constructor({templateResolver=null}={}) {
    this.templateResolver=templateResolver;
  }

  prepare({template,answers={},fieldMap={},metadata={}}={}) {
    if(!template) throw new Error("Immigration PDF template is required.");
    const fields=[];
    const unresolved=[];
    for(const [field,key] of Object.entries(fieldMap||{})){
      const value=String(key).split(".").reduce((x,k)=>x?.[k],answers);
      if(value===undefined || value===null || value===""){
        unresolved.push({field,key});
        continue;
      }
      fields.push({field,value:String(value)});
    }
    return {
      template,
      fields,
      unresolved,
      metadata:{
        ...metadata,
        generatedBy:"Anthony Isaacs",
        source:"IMMIGRATION_DOCUMENT_ENGINE",
        preserveOriginalTemplate:true,
        generatedAt:new Date().toISOString()
      }
    };
  }
}
