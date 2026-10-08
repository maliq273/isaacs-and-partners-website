import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_KEY=Deno.env.get("PAYSTACK_SECRET_KEY")||"";
const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-paystack-signature"};
const json=(x:any,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json",...cors}});
const clean=(v:any,n=500)=>String(v??"").trim().slice(0,n);

async function actor(req:Request){
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)throw Error("Authentication required.");
 const u=await db.auth.getUser(token);if(u.error||!u.data.user)throw Error("Authentication required.");
 const p=await db.from("profiles").select("role,is_active").eq("id",u.data.user.id).maybeSingle();
 if(p.error||!p.data?.is_active||!["BUSINESS","STAFF","SUPER_ADMIN"].includes(p.data.role))throw Error("Authorised payroll access required.");
 return {userId:u.data.user.id,role:p.data.role};
}
async function invoiceAccess(invoiceId:string,a:any){
 const q=await db.from("invoices").select("*,businesses(owner_user_id,phone,legal_name,trading_name)").eq("id",invoiceId).maybeSingle();
 if(q.error||!q.data)throw Error("Invoice not found.");
 if(a.role==="BUSINESS"&&q.data.businesses?.owner_user_id!==a.userId)throw Error("Invoice is outside your access scope.");
 return q.data;
}
async function initialize(body:any,a:any){
 if(!PAYSTACK_KEY)throw Error("Paystack is not configured. Add PAYSTACK_SECRET_KEY to the Supabase Edge Function secrets before taking payments.");
 const invoice=await invoiceAccess(clean(body.invoice_id,100),a);
 if(Number(invoice.balance_due)<=0)throw Error("This invoice is already paid.");
 const email=clean(body.email,254);
 if(!email)throw Error("A payer email is required.");
 const ref="IP-"+crypto.randomUUID().replace(/-/g,"").slice(0,24).toUpperCase();
 const p=await db.from("payments").insert({
   invoice_id:invoice.id,amount:Number(invoice.balance_due),currency:invoice.currency||"ZAR",
   payment_method:"PAYSTACK",provider:"PAYSTACK",provider_reference:ref,status:"PENDING",
   metadata:{payroll_run_id:clean(body.payroll_run_id,100)||null,purpose:clean(body.purpose,50)||"PAYROLL",business_id:invoice.business_id}
 }).select("id").single();
 if(p.error)throw p.error;
 const res=await fetch("https://api.paystack.co/transaction/initialize",{
   method:"POST",headers:{"Authorization":"Bearer "+PAYSTACK_KEY,"Content-Type":"application/json"},
   body:JSON.stringify({email,amount:Math.round(Number(invoice.balance_due)*100),currency:invoice.currency||"ZAR",reference:ref,callback_url:body.callback_url||undefined,metadata:{internal_payment_id:p.data.id,invoice_id:invoice.id,payroll_run_id:clean(body.payroll_run_id,100)||null,purpose:clean(body.purpose,50)||"PAYROLL"}})
 });
 const x=await res.json();if(!res.ok||!x.status){await db.from("payments").update({status:"FAILED",metadata:{error:x}}).eq("id",p.data.id);throw Error(x.message||"Paystack transaction initialization failed.");}
 return {ok:true,payment_id:p.data.id,invoice_id:invoice.id,amount:invoice.balance_due,currency:invoice.currency,reference:ref,authorization_url:x.data?.authorization_url,access_code:x.data?.access_code};
}
async function verify(reference:string){
 if(!PAYSTACK_KEY)throw Error("Paystack is not configured.");
 const res=await fetch("https://api.paystack.co/transaction/verify/"+encodeURIComponent(reference),{headers:{Authorization:"Bearer "+PAYSTACK_KEY}});
 const x=await res.json();if(!res.ok||!x.status)throw Error(x.message||"Paystack verification failed.");
 const t=x.data;
 const pq=await db.from("payments").select("*").eq("provider","PAYSTACK").eq("provider_reference",reference).maybeSingle();if(pq.error||!pq.data)throw Error("Internal payment record not found.");
 const paid=t.status==="success"&&Number(t.amount)===Math.round(Number(pq.data.amount)*100)&&String(t.currency||"ZAR").toUpperCase()===String(pq.data.currency||"ZAR").toUpperCase();
 if(!paid){await db.from("payments").update({status:t.status==="failed"?"FAILED":"PENDING",metadata:{...(pq.data.metadata||{}),paystack_verification:t}}).eq("id",pq.data.id);return {ok:false,status:t.status,payment_id:pq.data.id};}
 await db.from("payments").update({status:"COMPLETED",paid_at:new Date().toISOString(),metadata:{...(pq.data.metadata||{}),paystack_verification:t}}).eq("id",pq.data.id);
 await db.from("invoices").update({status:"PAID",amount_paid:pq.data.amount,balance_due:0,paid_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",pq.data.invoice_id);
 const purpose=String(pq.data.metadata?.purpose||"").toUpperCase();
 const runId=clean(pq.data.metadata?.payroll_run_id,100);
 if(purpose==="PAYROLL"&&runId){await db.rpc("payroll_release_if_paid",{p_payroll_run_id:runId});}
 if(purpose==="SARS"){await db.from("hr_sars_billing_periods").update({status:"PAID",access_state:"ENABLED",payment_id:pq.data.id,paid_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("invoice_id",pq.data.invoice_id);}
 return {ok:true,status:"COMPLETED",payment_id:pq.data.id,invoice_id:pq.data.invoice_id,purpose};
}
async function webhook(req:Request){
 if(!PAYSTACK_KEY)throw Error("Paystack is not configured.");
 const body=await req.text(),sig=req.headers.get("x-paystack-signature")||"";
 const digest=await crypto.subtle.importKey("raw",new TextEncoder().encode(PAYSTACK_KEY),{name:"HMAC",hash:"SHA-512"},false,["sign"]);
 const mac=Array.from(new Uint8Array(await crypto.subtle.sign("HMAC",digest,new TextEncoder().encode(body)))).map(x=>x.toString(16).padStart(2,"0")).join("");
 if(mac!==sig)throw Error("Invalid Paystack signature.");
 const event=JSON.parse(body);if(event.event!=="charge.success")return json({ok:true,ignored:true});
 const ref=event.data?.reference;if(!ref)throw Error("Paystack event has no reference.");
 const result=await verify(ref);return json(result);
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  if(req.headers.get("x-paystack-signature"))return await webhook(req);
  const a=await actor(req),body=await req.json(),action=String(body.action||"").toUpperCase();
  if(action==="INITIALIZE")return json(await initialize(body,a));
  if(action==="VERIFY")return json(await verify(clean(body.reference,100)));
  throw Error("Unsupported Paystack payroll action.");
 }catch(e){return json({ok:false,error:e instanceof Error?e.message:"Paystack payment operation failed."},400)}
});
