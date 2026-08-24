// One-shot: write the 66 approved unified book scenes into MNEM_BOOK[n].t in index.html.
// Preserves each entry's other fields (s, p). Backs up + syntax-checks before writing.
const fs = require('fs'), path = require('path'), vm = require('vm');
const FILE = path.join(__dirname, 'index.html');

const SCENES = {
1:`ONE lone SEED, the only thing in the empty void, glows like a spark until the whole garden of Eden GENERATES overnight.`,
2:`The parted Red Sea stands as TWO glassy walls, the SUN mirrored once in each, as Moses leads Israel toward the glowing EXIT sign.`,
3:`A SUMO wrestler so triple-wide he fills THREE pews gapes upward as the priest LEVITATES above the smoking altar.`,
4:`The census-taker rides a horse whose FOUR hooves are all SORE from the long trek as he NUMBERS every tent of Israel.`,
5:`A DUET of SOUL singers hums Moses' farewell, then seals it with a giant HIGH FIVE, five fingers to five, as the Law sounds a SECOND time.`,
6:`JOSH and his trumpet blowers circle Jericho's wall of colossal SUSHI rolls once a day for SIX days, until one great shout splatters it into rice.`,
7:`A JUDGE in a big black robe bangs his gavel SEVEN times on a giant smelly SOCK, then shouts, "You are SET FREE!"`,
8:`Up on a ROOF sits a squishy SOFA where a big happy spider lounges, slowly stretching out all EIGHT of its fuzzy legs.`,
9:`A wobbly CAMEL keeps slipping on a bar of SOAP and nearly squashing a cat, who springs back up giggling every time thanks to its NINE LIVES.`,
10:`Crowned King David throws TWO golden DICE that land five and five, a perfect TEN, as heralds unroll SAMUEL's SECOND scroll.`,
11:`Your DAD plops a golden paper CROWN on his head and rules the living room from the couch, the very first KING.`,
12:`A twisty DNA ladder spins slowly while TWO tiny crowned KINGS ride its rungs like a merry-go-round.`,
13:`You drop one shiny DIME in the freezer machine and out slides one giant grape POPSICLE.`,
14:`You open a creaky DOOR and TWO frosty POPSICLES march out arm in arm.`,
15:`A DOLL keeps popping off the crowded toy shelf because it is the one EXTRA ("EZ-ra") nobody has room for.`,
16:`A soft TISSUE folds itself into fuzzy KNEE-HIGH socks that snap up to your knees — "knee-high-miah!"`,
17:`The EASTER bunny hops past in a flowing white TOGA, painted eggs spilling out with every hop.`,
18:`On the TV a kid scrubs, sweeps, rakes, and mows in fast-forward, doing the hardest JOB in the world without quitting.`,
19:`A big brass TUBA oompahs under the PALM trees, and the palms sway in time to the song.`,
20:`A giant NOSE cracks open FORTUNE COOKIES one by one and sniffs each wise little saying (the PROVERBS).`,
21:`A boy swings a NET at shimmering BUBBLES that pop into plain WIND every time — Ecclesiastes says it is all chasing the wind.`,
22:`A NUN sings a syrupy love SONG to a big flopping SALMON that slaps its tail to the beat — "Song of SALMON."`,
23:`NEMO the little orange clownfish presses his face to the tank glass and shouts "I SAW YA!"`,
24:`Old emperor NERO in his toga fiddles a tune while a giant BULLFROG named JEREMIAH croaks the bass line.`,
25:`A NAIL gets hammered through a pile of sour LEMONS and everyone puckers up crying — "lemon-TATIONS."`,
26:`A kid named ZEKE dives into a mountain of cheesy NACHOS, crunching every chip — "E-ZEEK-iel."`,
27:`A floppy-eared SPANIEL sprints laps in squeaky NIKE sneakers, ears flapping — "Daniel the spaniel."`,
28:`A KNIFE slices right through a wriggling garden HOSE and water sprays everywhere — "HOSE-a."`,
29:`You curl up for a NAP on a giant sparkling JEWEL that glitters like a pillow of light — "jewel" = Joel.`,
30:`A tiny MOUSE rides high on the antlers of a giant MOOSE, squeaking "A MOOSE! A MOOSE!" — Amos.`,
31:`The welcome MAT groans "OH, BAD idea!" the second your foot lands on it — oh-BAD-iah.`,
32:`Under a huge full MOON, a great WHALE gulps down a man named JONAH in one big splashy swallow.`,
33:`A bandaged MUMMY honks the horn of MY CAR over and over, yelling "call me MIKE-ah!"`,
34:`A HAMMER that HUMS taps the nail singing "NAH-HUM, NAH-HUM" with every bang.`,
35:`A MOLE in a tall chef's hat flips burnt pancakes as the world's worst COOK — "HAVE-A-COOK!"`,
36:`A playful ZEPHYR breeze whooshes "Zeph-a-NYE-ah!" and puffs out your MATCH every time you strike it.`,
37:`A muddy HOG grabs the MIC and squeals "HOG-eye! HOG-eye!" spraying happy mud flecks with every snort.`,
38:`Little ZACK munches popcorn at a MOVIE so thrilling he shouts "Zack-a-RYE-ah!" every time the screen flashes.`,
39:`You unroll a giant MAP of the MALL and a golden KEY tumbles out — "MALL-a-KEY" opens every store.`,
40:`A cheerful welcome MAT named MATT sprouts a giant red ROSE through its middle, tickling everyone who wipes their feet.`,
41:`A squeaky MARKER scribbles big check-MARKS all over the RADIO until every dial is covered in ink.`,
42:`A RHINO thunders down the street so enormous everyone points and yells "LOOK! LOOK!" as the windows rattle.`,
43:`A wooden RUM barrel waddles past wearing bright red LONG JOHNS, stubby legs poking out of the button flap.`,
44:`Actors ACT out a grand stage play until one trips and a big red ERROR buzzer blares at the blooper.`,
45:`A spinning film REEL shows ROMAN soldiers ROAMIN' round and round wherever the flapping filmstrip points.`,
46:`You walk under a towering ARCH built entirely of buttery CORN on the cob, kernels popping loose overhead.`,
47:`You bite the second ear of CORN and crunch on a gray ROCK wedged right between the kernels.`,
48:`A pair of yellow GALOSHES stomps across the ROOF all by themselves, splashing puddles with every rubbery step.`,
49:`A golden HARP sits frozen solid in a block of ice, its strings "a-FREEZIN'" and twanging icy little notes.`,
50:`A cowboy twirls a LASSO and ropes a flapping pile of rubber FLIPPERS that slap and wiggle like fish.`,
51:`A COLOSSAL pot LID the size of a playground clangs down over the whole street, booming like a gong.`,
52:`A hungry LION gobbles a teetering stack of BALONEY sandwiches, licking mustard off his whiskers.`,
53:`The second load of BALONEY gets stuffed into a stretch LIMO until floppy slices squish out of every window.`,
54:`Timid little TIM tiptoes to the pond and dangles a sparkly LURE, whispering "here, fishy" as quietly as he can.`,
55:`Now TIM cannot stop laughing, texting "LOL! LOL!" so hard his phone bounces out of his hands.`,
56:`A wiggly LEECH dresses up in a fancy red bow TIE and bows politely — "TIE-tus, at your service."`,
57:`You FILL a pitcher with fresh LEMONade but it springs a LEAK, dribbling lemony drops from a tiny hole.`,
58:`A plastic HAIRBRUSH tumbles into bubbling LAVA and melts, bristles curling like tiny orange noodles.`,
59:`A giant LIP smacks loudly, smeared top to bottom with sticky strawberry JAM dripping onto the chin.`,
60:`A giant green PEA rolls downhill and splats into a wobbly wheel of CHEESE, sticking there like a bullseye.`,
61:`That same giant PEA rolls for its life as a spotted CHEETAH sprints after it, paws a blur.`,
62:`A GENIE whooshes out of the lamp wearing just baggy red LONG JOHNS, striking a proud pose.`,
63:`A second pair of red LONG JOHNS dangles from a wind CHIME, jingling every time the legs kick.`,
64:`A third pair of LONG JOHNS twirls by with a bright red CHERRY perched on top like a tiny hat.`,
65:`A CHILLI pepper leans way back in tiny sunglasses and drawls "whoa, DUDE," steam curling from its stem.`,
66:`The JUDGE solemnly parts a great curtain for the final REVEAL, and glorious golden light floods out over everyone.`
};

function extractLiteral(src, prefix){
  const i=src.indexOf(prefix); let j=i+prefix.length; while(/\s/.test(src[j])) j++;
  const open=src[j], close=open==='['?']':'}'; let d=0,st=false,q='',k=j;
  for(;k<src.length;k++){const c=src[k];
    if(st){if(c==='\\'){k++;continue;}if(c===q)st=false;continue;}
    if(c==='"'||c==="'"||c==='`'){st=true;q=c;continue;}
    if(c===open)d++; else if(c===close){d--;if(d===0){k++;break;}}}
  return {start:j,end:k,text:src.slice(j,k)};
}
const parse=t=>(new Function('return ('+t+')'))();
const S=v=>JSON.stringify(v);
const serMnem=o=>'{'+Object.keys(o).map(Number).sort((a,b)=>a-b).map(k=>{
  const e=o[k]; return k+':{'+Object.keys(e).map(f=>f+':'+S(e[f])).join(',')+'}';}).join(',')+'}';

let src=fs.readFileSync(FILE,'utf8');
const mnem=parse(extractLiteral(src,'const MNEM_BOOK = ').text);
let count=0;
for(let n=1;n<=66;n++){ if(SCENES[n]){ const e=mnem[n]||{}; e.t=SCENES[n]; mnem[n]=e; count++; } }

const {start,end}=extractLiteral(src,'const MNEM_BOOK = ');
const newSrc=src.slice(0,start)+serMnem(mnem)+src.slice(end);
new vm.Script(newSrc.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1]); // throws if broken

const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backup=FILE.replace(/index\.html$/,'index.backup-'+stamp+'.html');
fs.copyFileSync(FILE,backup);
fs.writeFileSync(FILE,newSrc);
console.log('Wrote '+count+' book scenes into MNEM_BOOK.t. Backup: '+path.basename(backup));
