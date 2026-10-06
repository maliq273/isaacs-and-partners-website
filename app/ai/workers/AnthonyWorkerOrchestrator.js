/**
 * Anthony Isaacs — Worker Orchestrator.
 * Coordinates bounded specialist workers and records their execution in ai_agent_events.
 */
import { ANTHONY_WORKERS, workersFor } from "./AnthonyWorkerRegistry.js";

const clean=(v,n=2000)=>String(v??"").trim().slice(0,n);
const domainOf=(input={})=>String(input?.servicePlan?.domain||input?.intent?.domain||input?.serviceDomain||"GENERAL").toUpperCase();

export default class AnthonyWorkerOrchestrator{
  constructor({db, logger=console}={}){ if(!db) throw new TypeError("AnthonyWorkerOrchestrator requires db."); this.db=db; this.logger=logger; }
  plan(input={}){
    const domain=domainOf(input);
    const ids=["RECEPTION","MATTER_OPERATIONS","DOCUMENT_COMPLIANCE","COMMERCIAL","COMMUNICATIONS","MEMORY"];
    if(["HR","BUSINESS","IMMIGRATION"].some(x=>domain.includes(x))) ids.push("COMPLIANCE");
    if(input?.systemChangeRequest||input?.intent?.intent==="MANAGE_SYSTEM") ids.push("SYSTEM_GUARDIAN");
    return ids.map(id=>ANTHONY_WORKERS.find(w=>w.id===id)).filter(Boolean);
  }
  async run(input={}){
    const workers=this.plan(input);
    const context={workerPlan:workers.map(w=>({id:w.id,name:w.name,capabilities:w.capabilities})),workerResults:[]};
    for(const worker of workers){
      const result=await this.execute(worker,input);
      context.workerResults.push(result);
      try{
        await this.db.from("ai_agent_events").insert({
          conversation_id:input.conversationId||null,
          matter_id:input.matterId||input?.matter?.id||null,
          event_type:"WORKER_EXECUTED",
          actor_type:"AI",
          payload:{worker_id:worker.id,worker_name:worker.name,domain:domainOf(input),capabilities:worker.capabilities,result}
        });
      }catch(error){this.logger.warn?.("[AnthonyWorkerOrchestrator] event audit failed",error);}
    }
    return context;
  }
  async execute(worker,input={}){
    const op=input.operationalContext||{};
    switch(worker.id){
      case "RECEPTION": return {worker:worker.id,identity:op.identityContext||null,nextAction:op.portfolio?.nextAction||null};
      case "MATTER_OPERATIONS": return {worker:worker.id,activeMatter:input.matter||op.activeMatter||null,portfolio:op.portfolio||null};
      case "DOCUMENT_COMPLIANCE": return {worker:worker.id,documents:Array.isArray(op.documents)?op.documents.slice(0,40):[],releaseGate:op.releaseGate||null};
      case "COMMERCIAL": return {worker:worker.id,invoices:Array.isArray(op.invoices)?op.invoices.slice(0,20):[],commercial:input.servicePlan?.commercial||null};
      case "COMMUNICATIONS": return {worker:worker.id,channel:input.channel||"UNKNOWN",conversationId:input.conversationId||null};
      case "COMPLIANCE": return {worker:worker.id,compliance:op.compliance||op.complianceContext||null};
      case "MEMORY": return {worker:worker.id,historicalMemoryFound:Boolean(input.historicalMemory),learnedMemoryFound:Boolean(input.learnedMemory)};
      case "SYSTEM_GUARDIAN": return {worker:worker.id,mode:"CONTROLLED_CHANGE",requiresExplicitAuthorisation:true};
      default: return {worker:worker.id,status:"NO_HANDLER"};
    }
  }
}
export { ANTHONY_WORKERS };
