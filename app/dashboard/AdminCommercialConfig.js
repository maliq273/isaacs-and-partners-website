import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const money=v=>Number(v||0).toLocaleString("en-ZA",{style:"currency",currency:"ZAR",maximumFractionDigits:2});
const state={services:[],filter:"",domain:""};
const status=(el,msg,bad=false)=>{if(!el)return;el.hidden=!msg;el.className=bad?"login-message login-error":"login-message";el.textContent=msg||""};
async function client(){await auth.initialise();if(!auth.isAuthenticated())throw Error("Please sign in again.");const {ensureSupabaseSession}=await import("../services/SupabaseBrowserClient.js");return ensureSupabaseSession(auth);}
function render(){
 const host=$("admin-pricing-list");if(!host)return;
 const rows=state.services.filter(s=>(!state.domain||s.service_domain===state.domain)&&(!state.filter||[s.code,s.name,s.service_domain].some(v=>String(v||"").toLowerCase().includes(state.filter.toLowerCase()))));
 $("admin-pricing-count").textContent=rows.length+" services";
 host.innerHTML=rows.map(s=>'<tr><td><strong>'+esc(s.name)+'</strong><small style="display:block;color:var(--ink-muted)">'+esc(s.code)+'</small></td><td>'+esc(s.service_domain||"Other")+'</td><td><span class="status-badge '+(Number(s.minimum_fee)>0?"active":"pending")+'">'+(Number(s.minimum_fee)>0?money(s.minimum_fee):"PRICE NEEDED")+'</span><small style="display:block;color:var(--ink-muted)">'+esc(s.metadata?.billing_rule||s.pricing_mode||"One-off / quote")+'</small></td><td><div style="display:flex;gap:8px;min-width:220px"><input class="form-control" type="number" min="0.01" step="0.01" aria-label="Price for '+esc(s.name)+'" data-price-input="'+esc(s.code)+'" value="'+(Number(s.minimum_fee)>0?Number(s.minimum_fee):"")+'" placeholder="Enter ZAR price"><button class="btn btn-sm btn-primary" data-price-save="'+esc(s.code)+'">Save</button></div></td></tr>').join("")||'<tr><td colspan="4" class="empty-state">No matching services.</td></tr>';
}
async function loadPrices(){
 status($("admin-pricing-status"),"");
 const sb=await client();
 const {data,error}=await sb.from("service_catalog").select("code,name,service_domain,pricing_mode,minimum_fee,default_currency,active,metadata").order("service_domain").order("name");
 if(error)throw error;
 state.services=(data||[]).filter(s=>s.active!==false);
 const domains=[...new Set(state.services.map(s=>s.service_domain||"Other"))].sort();
 $("admin-pricing-domain").innerHTML='<option value="">All categories</option>'+domains.map(d=>'<option value="'+esc(d)+'">'+esc(d)+'</option>').join("");
 render();
}
async function savePrice(code){
 const input=document.querySelector('[data-price-input="'+CSS.escape(code)+'"]'),amount=Number(input?.value);
 if(!(amount>0)||!Number.isFinite(amount))throw Error("Enter a price greater than R0.");
 const sb=await client();
 const {data,error}=await sb.rpc("service_price_set",{p_service_code:code,p_amount:amount,p_notes:"Set through Super Admin Services & Pricing."});
 if(error)throw error;
 const s=state.services.find(x=>x.code===code);if(s){s.minimum_fee=amount;s.metadata={...(s.metadata||{}),pricing_status:"ADMIN_SET"};}
 render();status($("admin-pricing-status"),"Saved "+code+" at "+money(amount)+". New customer assignments will use this server-side price.");
}
const secretFields=[
 {name:"PAYSTACK_SECRET_KEY",label:"Paystack secret key",hint:"Payment initialisation and server-side verification",placeholder:"sk_test_… or sk_live_…"},
 {name:"OPENAI_API_KEY",label:"OpenAI API key",hint:"Anthony AI runtime, if configured to use OpenAI",placeholder:"sk-…"},
 {name:"ANTHROPIC_API_KEY",label:"Anthropic API key",hint:"Optional AI provider",placeholder:"sk-ant-…"},
 {name:"OPENWA_API_KEY",label:"OpenWA API key",hint:"WhatsApp transport integration",placeholder:"Enter OpenWA API key"},
 {name:"GITHUB_TOKEN",label:"GitHub integration token",hint:"Repository automation only; use least privilege",placeholder:"github_pat_…"}
];
function renderSecrets(){
 $("admin-secret-fields").innerHTML=secretFields.map(f=>'<div class="integration-card"><label style="display:block;font-weight:600;margin-bottom:6px" for="secret-'+f.name+'">'+esc(f.label)+'</label><p style="font-size:.8rem;color:var(--ink-muted);margin:0 0 10px">'+esc(f.hint)+'</p><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="secret-'+f.name+'" class="form-control" style="flex:1;min-width:220px" type="password" autocomplete="new-password" data-secret-name="'+f.name+'" placeholder="'+esc(f.placeholder)+'"><button class="btn btn-sm btn-primary" data-secret-save="'+f.name+'">Save &amp; sync</button></div></div>').join("");
}
async function saveSecret(name){
 const input=document.querySelector('[data-secret-name="'+CSS.escape(name)+'"]'),value=String(input?.value||"").trim();
 if(!value)throw Error("Enter a value before saving.");
 const sb=await client();
 const {data:{session}}=await sb.auth.getSession();
 const response=await fetch(authConfig.supabase.url+"/functions/v1/admin-sync-secrets",{method:"POST",headers:{apikey:authConfig.supabase.publishableKey,Authorization:"Bearer "+(session?.access_token||auth.getToken()),"Content-Type":"application/json"},body:JSON.stringify({name,value})});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(body.error||body.message||"Secret sync failed.");
 input.value="";
 status($("admin-secrets-status"),body.message||name+" saved to Supabase Edge Function secrets.");
}
document.addEventListener("DOMContentLoaded",async()=>{
 if(!$("admin-pricing-list"))return;
 renderSecrets();
 $("admin-pricing-search").addEventListener("input",e=>{state.filter=e.target.value;render()});
 $("admin-pricing-domain").addEventListener("change",e=>{state.domain=e.target.value;render()});
 $("admin-pricing-refresh").addEventListener("click",()=>loadPrices().catch(e=>status($("admin-pricing-status"),e.message||String(e),true)));
 $("admin-pricing-list").addEventListener("click",async e=>{const b=e.target.closest("[data-price-save]");if(!b)return;b.disabled=true;try{await savePrice(b.dataset.priceSave)}catch(err){status($("admin-pricing-status"),err.message||String(err),true)}finally{b.disabled=false}});
 $("admin-secret-fields").addEventListener("click",async e=>{const b=e.target.closest("[data-secret-save]");if(!b)return;b.disabled=true;try{await saveSecret(b.dataset.secretSave)}catch(err){status($("admin-secrets-status"),err.message||String(err),true)}finally{b.disabled=false}});
 try{await loadPrices()}catch(e){status($("admin-pricing-status"),e.message||String(e),true)}
});
