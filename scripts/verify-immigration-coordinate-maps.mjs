#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const configs=[
 ["DHA-84","Visitor-Visa-Application-Form-DHA-84-Form-11-June-19-2014.pdf","DHA-84.json"],
 ["BI-947","BI-947.pdf","BI-947.json"],
 ["BI-1712A","Spousal-RelationshipBI-1712A-Form-12-1.pdf","BI-1712A.json"]
];
const norm=v=>String(v??"").toLowerCase().replace(/&nbsp;/g," ").replace(/<[^>]+>/g," ").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
function linesByPage(html){const pages=[];const pr=/<page\s+width="([^"]+)"\s+height="([^"]+)"[^>]*>([\s\S]*?)<\/page>/g;let pm;while((pm=pr.exec(html))){const lines=[];const lr=/<line\s+xMin="([^"]+)"\s+yMin="([^"]+)"\s+xMax="([^"]+)"\s+yMax="([^"]+)"[^>]*>([\s\S]*?)<\/line>/g;let lm;while((lm=lr.exec(pm[3])))lines.push(norm(lm[5]));pages.push(lines)}return pages}
for(const [form,pdf,mapName] of configs){
 const pdfPath=path.join(root,"immigrations_docs",pdf), mapPath=path.join(root,"app/knowledgebase/immigration_docs/coordinate-maps",mapName);
 if(!fs.existsSync(pdfPath)||!fs.existsSync(mapPath))throw new Error(form+" source PDF or coordinate map is missing.");
 const map=JSON.parse(fs.readFileSync(mapPath,"utf8"));
 if(map.coordinateStrategy!=="BBOX_LABEL_DYNAMIC")throw new Error(form+" is not using the authoritative dynamic coordinate strategy.");
 const sourceName=String(map.source||"").split("/").pop(), bboxPath=path.join(root,"app/knowledgebase/immigration_docs/bbox",sourceName.replace(/\.pdf$/i,".html"));
 if(!fs.existsSync(bboxPath))throw new Error(form+" BBOX source is missing: "+bboxPath);
 const pages=linesByPage(fs.readFileSync(bboxPath,"utf8"));const aliases=map.anchorAliases||{};const unresolved=[];
 for(const [id] of Object.entries(map.answerPaths||{})){
   const anchor=norm(aliases[id]||id.replace(/_/g," "));const tokens=anchor.split(" ").filter(x=>x.length>2&&!/^\d+$/.test(x));const candidates=[];
   for(let pi=0;pi<pages.length;pi++)for(let li=0;li<pages[pi].length;li++){const t=pages[pi][li],score=tokens.reduce((n,x)=>n+(t.includes(x)?1:0),0);if(tokens.length&&score>=Math.max(1,Math.ceil(tokens.length*.6)))candidates.push([pi,li,score]);}
   const desired=Number((map.occurrences||{})[id]||1);if(!candidates[desired-1])unresolved.push(id);
 }
 const total=Object.keys(map.answerPaths||{}).length;
 if(unresolved.length)throw new Error(form+" coordinate anchors unresolved: "+unresolved.join(", "));
 console.log(`PASS: ${form} coordinate anchors ${total}/${total} resolved against ${sourceName}`);
}
