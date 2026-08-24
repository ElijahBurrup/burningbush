// Reload edited CSVs back into index.html. Run: node tools/content_import.js
// Reads tools/BurningBush_Numbers.csv and tools/BurningBush_Books.csv and rewrites
// the PEGS / PEGS100 / NOTE / DECODE / MNEM_BOOK / REL data blocks.
const fs=require("fs");
let src=fs.readFileSync("index.html","utf8");

// --- tiny CSV parser (handles quotes, commas, newlines) ---
function parseCSV(text){
  const rows=[]; let row=[], cell="", i=0, q=false;
  text=text.replace(/^﻿/,"");
  while(i<text.length){ const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){cell+='"';i+=2;continue;} q=false;i++;continue;} cell+=c;i++;continue; }
    if(c==='"'){q=true;i++;continue;}
    if(c===','){row.push(cell);cell="";i++;continue;}
    if(c==='\r'){i++;continue;}
    if(c==='\n'){row.push(cell);rows.push(row);row=[];cell="";i++;continue;}
    cell+=c;i++;
  }
  if(cell.length||row.length){ row.push(cell); rows.push(row); }
  return rows.filter(r=>r.length>1||r[0]!=="");
}
// --- balanced-literal range finder ---
function range(name){
  const i=src.indexOf("const "+name+" =");
  let j=src.indexOf("=",i)+1; while(" \n\t".includes(src[j])) j++;
  const open=src[j], close=open==="["?"]":"}";
  let depth=0,inStr=false,q="",k=j;
  for(;k<src.length;k++){ const ch=src[k];
    if(inStr){ if(ch==="\\"){k++;continue;} if(ch===q) inStr=false; continue; }
    if(ch==='"'||ch==="'"||ch==="`"){inStr=true;q=ch;continue;}
    if(ch===open) depth++; else if(ch===close){ depth--; if(depth===0){k++;break;} }
  }
  return [j,k];
}
function splice(name, literal){ const [a,b]=range(name); src=src.slice(0,a)+literal+src.slice(b); }
const S=v=>JSON.stringify(v==null?"":String(v));

const nums=parseCSV(fs.readFileSync("tools/BurningBush_Numbers.csv","utf8")).slice(1);
const books=parseCSV(fs.readFileSync("tools/BurningBush_Books.csv","utf8")).slice(1);

// NUMBERS → PEGS[0-99], PEGS100{100-176}, NOTE, DECODE
const PEGS=[]; const PEGS100={}; const NOTE={}; const DECODE={};
nums.forEach(r=>{ const n=+r[0], img=r[2], note=(r[3]||"").trim(), dec=(r[4]||"").trim();
  if(n<=99) PEGS[n]=img; else PEGS100[n]=img;
  if(note) NOTE[n]=note; if(dec) DECODE[n]=dec;
});
splice("PEGS", "["+PEGS.map(S).join(",")+"]");
splice("PEGS100","{\n"+Object.keys(PEGS100).map(n=>n+":"+S(PEGS100[n])).join(",")+"}");
splice("NOTE","{"+Object.keys(NOTE).map(n=>n+":"+S(NOTE[n])).join(",")+"}");
splice("DECODE","{\n"+Object.keys(DECODE).map(n=>n+":"+S(DECODE[n])).join(",\n")+"\n}");

// BOOKS → MNEM_BOOK{1-66}, REL{ only books with any relationship field }
const MNEM_BOOK={}, REL={};
books.forEach(r=>{ const b=+r[0], s=r[3], phon=(r[4]||"").trim(), t=r[5],
  n2i=r[6], i2n=r[7], i2b=r[8], b2i=r[9];
  const mb={s:s, t:t};
  if(phon){ mb.p=phon.split("|").map(x=>{ const [syl,word]=x.split("="); return [syl.trim(),(word||"").trim()]; }); }
  MNEM_BOOK[b]=mb;
  if(n2i||i2n||i2b||b2i) REL[b]={numToImg:n2i,imgToNum:i2n,imgToBook:i2b,bookToImg:b2i};
});
function mbLit(mb){ let o="{s:"+S(mb.s)+",t:"+S(mb.t); if(mb.p) o+=",p:["+mb.p.map(x=>"["+S(x[0])+","+S(x[1])+"]").join(",")+"]"; return o+"}"; }
splice("MNEM_BOOK","{\n"+Object.keys(MNEM_BOOK).map(b=>b+":"+mbLit(MNEM_BOOK[b])).join(",\n")+"\n}");
splice("REL","{\n"+Object.keys(REL).map(b=>b+":{numToImg:"+S(REL[b].numToImg)+",imgToNum:"+S(REL[b].imgToNum)+",imgToBook:"+S(REL[b].imgToBook)+",bookToImg:"+S(REL[b].bookToImg)+"}").join(",\n")+"\n}");

fs.writeFileSync("index.html", src);
console.log("Reloaded index.html from CSVs: "+nums.length+" numbers, "+books.length+" books.");
