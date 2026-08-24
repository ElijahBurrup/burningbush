// Export all book + number visualization text from index.html into two CSVs
// that open cleanly in Google Sheets. Run: node tools/content_export.js
const fs=require("fs");
const src=fs.readFileSync("index.html","utf8");

// --- balanced-literal extractor (respects strings) ---
function extract(name){
  const i=src.indexOf("const "+name+" =");
  if(i<0) throw new Error("not found: "+name);
  let j=src.indexOf("=",i)+1;
  while(" \n\t".includes(src[j])) j++;
  const open=src[j], close=open==="["?"]":"}";
  let depth=0, inStr=false, q="", k=j;
  for(;k<src.length;k++){ const ch=src[k];
    if(inStr){ if(ch==="\\"){k++;continue;} if(ch===q) inStr=false; continue; }
    if(ch==='"'||ch==="'"||ch==="`"){ inStr=true; q=ch; continue; }
    if(ch===open) depth++;
    else if(ch===close){ depth--; if(depth===0){ k++; break; } }
  }
  return eval("("+src.slice(j,k)+")");
}
const PEGS=extract("PEGS"), PEGS100=extract("PEGS100"), NOTE=extract("NOTE"),
      DECODE=extract("DECODE"), MNEM_BOOK=extract("MNEM_BOOK"), REL=extract("REL");
const BOOKS=extract("BOOKS");
const SND={0:"s/z",1:"t/d",2:"n",3:"m",4:"r",5:"L",6:"j·sh·ch",7:"k·g",8:"f·v",9:"p·b"};
const sounds=n=> n<=9 ? "s/z · "+SND[n] : String(n).split("").map(d=>SND[+d]).join(" · ");
const pegOf=n=> n<=99?PEGS[n]:PEGS100[n];

function csv(rows){ return rows.map(r=>r.map(c=>{
  c=(c==null?"":String(c));
  return /[",\n]/.test(c) ? '"'+c.replace(/"/g,'""')+'"' : c;
}).join(",")).join("\r\n"); }

// ---- NUMBERS sheet (0-176) ----
const numRows=[["number","sounds (reference)","image (peg word)","note / clarifier","decode hook (image → number)"]];
for(let n=0;n<=176;n++){
  numRows.push([n, sounds(n), pegOf(n)||"", NOTE[n]||"", DECODE[n]||""]);
}
fs.writeFileSync("tools/BurningBush_Numbers.csv", csv(numRows));

// ---- BOOKS sheet (1-66) ----
function phon(p){ return p&&p.length ? p.map(x=>x[0]+"="+x[1]).join(" | ") : ""; }
const bookRows=[["book #","book name","image (peg word)","name sounds like","phonetic breakdown","story sentence","number → image","image → number","image → book","book → image"]];
for(let b=1;b<=66;b++){
  const mb=MNEM_BOOK[b]||{}, r=REL[b]||{};
  bookRows.push([b, BOOKS[b-1], pegOf(b)||"", mb.s||"", phon(mb.p), mb.t||"", r.numToImg||"", r.imgToNum||"", r.imgToBook||"", r.bookToImg||""]);
}
fs.writeFileSync("tools/BurningBush_Books.csv", csv(bookRows));

console.log("exported:");
console.log("  tools/BurningBush_Numbers.csv  ("+(numRows.length-1)+" numbers)");
console.log("  tools/BurningBush_Books.csv    ("+(bookRows.length-1)+" books)");
