// gen-alt-pegs.js — build a VERIFIED alternate-peg table for the "change the image word" picker.
// Every candidate is encoded with the Major System; only words whose code EXACTLY equals the
// target peg's two-digit code are kept, so a user can never pick a word outside the system
// (e.g. "soup" is valid for 9 = 09 = s+p, but "cat" = 71 is rejected).
// Run:  node tools/gen-alt-pegs.js        (prints an ALT_PEGS object literal + coverage)

// --- Major System encoder -------------------------------------------------
// digits: 0 s/z/soft-c  1 t/d/th  2 n  3 m  4 r  5 l  6 j/sh/ch/soft-g  7 k/hard-c/g/q  8 f/v/ph  9 p/b
// vowels + h,w,y are ignored; doubled sounds collapse. Words with silent letters / x are excluded
// from the source list below so the encoder stays unambiguous.
function msCode(raw){
  let w = raw.toLowerCase().replace(/[^a-z]/g,"");
  // digraphs & soft c/g first, mapped to sentinel digits
  w = w
    .replace(/sch/g,"6").replace(/tch/g,"6").replace(/dge/g,"6e").replace(/dg/g,"6")
    .replace(/sh/g,"6").replace(/ch/g,"6")
    .replace(/th/g,"1").replace(/ck/g,"7").replace(/ph/g,"8").replace(/qu/g,"7")
    .replace(/c([eiy])/g,"0$1").replace(/g([eiy])/g,"6$1");
  const M = {s:"0",z:"0",c:"7",t:"1",d:"1",n:"2",m:"3",r:"4",l:"5",j:"6",g:"7",k:"7",q:"7",f:"8",v:"8",p:"9",b:"9"};
  let out="", prev="";
  for(const ch of w){
    let d;
    if("0123456789".includes(ch)) d=ch;
    else if(M[ch]!==undefined) d=M[ch];
    else { prev=""; continue; }            // vowel / h,w,y — also breaks a doubling run
    if(d===prev) continue;                  // collapse a repeated sound
    out+=d; prev=d;
  }
  return out;
}

// --- source: clean, imageable concrete nouns (no silent letters / x) ------
const NOUNS = `
sauce seesaw
seed side seat suit soda city
sun swan sauna scone
sumo seam psalm-no seesaw-no sesame
sari soar sewer sore
sail seal soul silo sole
sage sash sushi
sock sack saga ski sky
sofa safe
soap soup soda-no sub sap spa
toes daisy dice dose
tot dad toad debt date data
tin den dune down tuna
dime dam dome team dime
tire door deer tower diary tar
towel tail doll dial tool
dish ditch judge-no touch dodge
duck dock dog tusk-no attic
dove taffy dwarf-no
tub tuba tube tulip-no
nose noose news nozzle
net nut nest node knight
noon nun nan neon
gnome name enemy
narrow nurse honor arrow-no
nail kneel nile null
notch nacho ninja
neck nike nag snake
knife nave navy
nap knob nib
mouse maze moss maze
mat mud moat maid meat
moon mane omen money mine
mummy mime memo
mower mayor mars mirror
mail mole mule mall meal
match image mesh
mug mask magma
muff mafia movie
map mop mob mummy-no
rose racehorse resource
rat road rod ride root rat
rain rhino runner urn
ram room rim arm
rare rower rear roar
roll rail reel rally
roach rash ridge orange
rock rug rag rake ark
roof rifle reef roofie-no
rope robe rib rib
lace lasso
lot lid lady load lute lily-no
lion line lane lawn loon
lime loom lam limo llama
lure lair lyre lower liar
lily lily loyal lull loll
leech leash ledge lush
log lake lock leg lagoon
lava leaf life loaf
lip lap loop label
cheese jazz
chat jet chit
chain genie chin canyon
gem chime gym jam
cherry chore juror
jail gel jelly
chef shave
ship shop chap sheep chip
judge cha-cha-no
shack chick shock jockey jackal
gas kiss goose case cause
cat coat cadet kite goat
coin gun cone cane con
game gum
car core crow guru
coal kale gale goal cola
cage cash coach couch
cake cook keg kick
cave coffee cuff calf
cup cape cop cape
face vase phase
fat food feet foot fad
fan phone fun fawn van
foam fume fame vim
fire fair fur ferry ivory
foal fowl flee fool
fish fudge voyage
fog fake fig fang-no
fife
face-no vape-no
bus base boss abyss
bat bad boat bead abbot
bone bun ban bin bean
bomb beam bum
bear bar berry bower brow
bell bull ball bowl bald-no
beach beige badge budge
book bag bike beak bug
beef beehive-no
pipe pope pub baby bib
`.split(/\s+/).filter(w=>w && !w.endsWith("-no"));

// --- group by code --------------------------------------------------------
const byCode = {};
for(const w of NOUNS){
  const c = msCode(w);
  (byCode[c] ||= []).push(w[0].toUpperCase()+w.slice(1));
}
// dedupe (case-insensitive), keep insertion order
for(const c in byCode){
  const seen=new Set(), keep=[];
  for(const w of byCode[c]){ const k=w.toLowerCase(); if(!seen.has(k)){seen.add(k);keep.push(w);} }
  byCode[c]=keep;
}

// only two-digit codes 00..99 (books use 01..66; number pegs beyond too)
const out={};
for(let n=0;n<100;n++){ const c=String(n).padStart(2,"0"); if(byCode[c] && byCode[c].length) out[c]=byCode[c].slice(0,6); }

// coverage report
let cov3=0, cov1=0, empty=[];
for(let n=0;n<100;n++){ const c=String(n).padStart(2,"0"); const a=out[c]||[]; if(a.length>=3)cov3++; if(a.length>=1)cov1++; if(!a.length)empty.push(c); }
console.error(`codes with >=1 option: ${cov1}/100 ; with >=3: ${cov3}/100`);
console.error(`empty codes: ${empty.join(" ")}`);
console.error(`sample 09=${(out["09"]||[]).join(", ")}  06=${(out["06"]||[]).join(", ")}  40=${(out["40"]||[]).join(", ")}`);

// emit literal
const lines = Object.keys(out).sort().map(c=>`"${c}":[${out[c].map(w=>`"${w}"`).join(",")}]`);
process.stdout.write("const ALT_PEGS = {\n  "+lines.join(",\n  ")+"\n};\n");
