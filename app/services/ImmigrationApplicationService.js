import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";
const URL=`${authConfig.supabase.url}/functions/v1/immigration-application-runtime`;
export default class ImmigrationApplicationService{
 async token(){await auth.initialise();if(auth.isSessionExpired()&&auth.getRefreshToken())await auth.refreshSession();if(!auth.isAuthenticated())throw new Error("Authentication required.");const t=auth.getToken();if(!t)throw new Error("Authenticated access token is unavailable.");return t}
 async request(body={}){const t=await this.token();const r=await fetch(URL,{method:"POST",headers:{apikey:authConfig.supabase.publishableKey,Authorization:`Bearer ${t}`,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(body)});const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch{d={error:raw}}if(!r.ok)throw new Error(d?.error||d?.message||`Immigration application request failed (${r.status}).`);return d}
 async snapshot(matterId){return this.request({action:"SNAPSHOT",matter_id:matterId})}
 async answer(args){return this.request({action:"ANSWER",...args})}
 async generate(matterId){return this.request({action:"GENERATE",matter_id:matterId})}
}
