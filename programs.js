'use strict';
/* Færdige programmer. Ren data: app.js bygger ugerne ud fra dem (genProgWeek).
   Indlæses efter exercises.js og før app.js.

   Alle programmer er 8 uger. Uge 4 og 8 er lette uger.
   season: 'off' | 'pre' | 'in' | 'all'
   scheme: hvordan sæt, gentagelser, % af maks og runder udvikler sig over ugerne (se SCH og P_ROUNDS i app.js)
   rest:   pause i sekunder mellem tunge sæt
   Pas: t = titel, md = hvor tæt på kamp passet må ligge (som md på øvelserne), blocks = blokke i rækkefølge.

   Variation hver anden uge: "a|b" betyder variant a i uge 1–2 og 5–6, b i uge 3–4 og 7–8.
   Med tre varianter "a|b|c": uge 1–2 a, 3–4 b, 5–6 c, 7–8 a. Varianterne har samme fokus (fx knæ-domineret ben).
   Øvelser uden "|" er de samme alle 8 uger (fx nordic og copenhagen, der skal laves fast for at forebygge skader).

   Blokke:
   'warm'                    6 min cykel
   'warmfield'               FIFA 11+ løbedel (8 min)
   ['str',  ['ex:main', 'ex|ex2:acc']]   styrke med sæt, gentagelser og vægt ud fra dit niveau. main = hovedløft, acc = assistance
   ['speed', [[ex, sæt, 'gentagelse']]]  fart med fuld pause. Sættene stiger lidt over ugerne. Gentagelsen kan også have varianter "10 m|5 m"
   ['pwr' | 'gk' | 'prev' | 'core' | 'circ' | 'mob', [ex, ...]]  runder med guidet timer
   ['cond', 'cont' | 'runcont' | 'int' | 'short' | 'tempo' | 'rsa' | 'b5']  kondition (kan også varieres: 'int|b5') */
const FOCI = ['Målmand', 'Styrke', 'Muskler', 'Hurtighed', 'Eksplosivitet', 'Kondition', 'Skadeforebyggelse'];
const PROGRAMS = [
  {
    id: 'gk8', base: true, icon: 'glove', name: 'Målmand 8', season: 'in', focus: ['Målmand', 'Kondition'],
    perWeek: 1, mins: 60, equip: 'Fitnesscenter', level: 'Alle niveauer',
    desc: 'Det oprindelige program: én fitnessdag om ugen med kondition, gentagne målmandsaktioner og core. Plus hjemmerutine før fodbold og let aktivering dagen før kamp.'
  },
  {
    id: 'gkoff', icon: 'glove', name: 'Målmand off-season', season: 'off', focus: ['Målmand', 'Styrke', 'Muskler'],
    perWeek: 3, mins: 60, equip: 'Fitnesscenter', level: 'Øvet', scheme: 'offseason', rest: 120,
    desc: 'Byg den styrke og muskelmasse, der giver kraft i afsættet og overkrop til at gå i dueller. Tung styrke, kast og målmandskraft, og intervaller for at holde motoren i gang. Øvelserne skifter hver anden uge.',
    sessions: {
      A: { t: 'Ben og afsæt', md: 3, blocks: ['warm', ['str', ['frontsquat|backsquat:main', 'rdl|hipthrust:acc', 'bulgarian|stepup:acc', 'slcalf|soleus:acc']], ['prev', ['nordic', 'copenhagen']], ['core', ['pallof|woodchop', 'deadbug|hollow', 'sideplank|suitcase']]] },
      B: { t: 'Overkrop og kast', md: 2, blocks: ['warm', ['str', ['dbbench|landminepress:main', 'pullup|latpull:main', 'dbpress|pikepush:acc', 'dbrow|cablerow:acc', 'facepull|ytw:acc']], ['pwr', ['medthrow|gkthrow', 'medrot|medslam']], ['core', ['suitcase|farmer', 'hollow|abwheel', 'birddog|plankreach']]] },
      C: { t: 'Målmandskraft og kondition', md: 2, blocks: ['warm', ['str', ['trapbar|rdl:main', 'hipthrust|slrdl:acc', 'landminepress|dbpress:acc']], ['gk', ['gkshuffledive|gkcollapse', 'gkhighcatch|gkstar', 'gkthrow|medthrow', 'gkbarrier|gkset']], ['cond', 'int|b5']] }
    }
  },
  {
    id: 'gkpre', icon: 'glove', name: 'Målmand opbygning', season: 'pre', focus: ['Målmand', 'Eksplosivitet', 'Hurtighed'],
    perWeek: 2, mins: 60, equip: 'Fitnesscenter og bane', level: 'Øvet', scheme: 'explosive', rest: 150,
    desc: 'Gør off-season-styrken eksplosiv før sæsonen: spring, kast, hurtige første skridt og dyk. Korte, hårde intervaller giver overskud til gentagne aktioner. Øvelserne skifter hver anden uge.',
    sessions: {
      A: { t: 'Kraft og afsæt', md: 3, blocks: ['warm', ['pwr', ['depthjump|boxjump', 'lateralstick|skater', 'medrot|gkthrow']], ['str', ['backsquat|frontsquat:main', 'rdl|trapbar:main', 'slcalf|stepcalf:acc']], ['prev', ['nordic', 'copenhagen']]] },
      B: { t: 'Fart og reaktion', md: 2, blocks: ['warmfield', ['speed', [['wallaccel|askip', 3, '5 skift|20 m'], ['sprint5|decel', 4, '10 m|5 m'], ['cod505|mirror', 2, '2/side|15 sek']]], ['gk', ['gkset|gkdropstep', 'gkshuffledive|gkstar', 'gkcollapse|gkbarrier', 'gkdropstep|gkset']], ['cond', 'short']] }
    }
  },
  {
    id: 'gkin', icon: 'glove', name: 'Målmand in-season', season: 'in', focus: ['Målmand', 'Styrke', 'Skadeforebyggelse'],
    perWeek: 2, mins: 45, equip: 'Fitnesscenter', level: 'Alle niveauer', scheme: 'maint', rest: 120,
    desc: 'Hold styrken og eksplosiviteten gennem sæsonen med få, tunge sæt. Det tunge pas ligger tidligt i ugen og det hurtige pas tættere på kamp, så du er frisk lørdag. Øvelserne skifter hver anden uge.',
    sessions: {
      A: { t: 'Styrke', md: 3, blocks: ['warm', ['str', ['frontsquat|backsquat:main', 'rdl|trapbar:main', 'pullup|latpull:acc']], ['prev', ['nordic', 'copenhagen', 'spanish|isosplit']]] },
      B: { t: 'Hurtig og klar', md: 2, blocks: ['warmfield', ['speed', [['wallaccel|askip', 2, '5 skift|20 m'], ['sprint5|decel', 3, '10 m|5 m']]], ['gk', ['gkset|gkdropstep', 'gkcollapse|gkbarrier', 'gkstar|gkshuffledive']], ['pwr', ['pogo|slhop', 'lateralstick|skater', 'gkthrow|medthrow']], ['core', ['pallof|bandpallof', 'sideplank|plankreach', 'deadbug|hollow']]] }
    }
  },
  {
    id: 'strength', icon: 'dumbbell', name: 'Styrke og muskler', season: 'off', focus: ['Styrke', 'Muskler'],
    perWeek: 3, mins: 60, equip: 'Fitnesscenter', level: 'Øvet', scheme: 'offseason', rest: 120,
    desc: 'Klassisk off-season: ben, overkrop og helkrop med tunge basisløft og mere volumen. Bygger det fundament, som fart og spring senere skal stå på. Øvelserne skifter hver anden uge.',
    sessions: {
      A: { t: 'Ben', md: 3, blocks: ['warm', ['str', ['backsquat|legpress:main', 'rdl|dbrdl:acc', 'walkinglunge|bulgarian:acc', 'soleus|stepcalf:acc']], ['core', ['abwheel|hollow', 'pallof|woodchop', 'copenhagen']]] },
      B: { t: 'Overkrop', md: 2, blocks: ['warm', ['str', ['dbbench|landminepress:main', 'pullup|latpull:main', 'dbpress|pikepush:acc', 'cablerow|dbrow:acc', 'facepull|ytw:acc']], ['core', ['suitcase|farmer', 'hollow|legraise', 'sideplank|plankreach']]] },
      C: { t: 'Helkrop og kraft', md: 3, blocks: ['warm', ['str', ['trapbar|rdl:main', 'bulgarian|stepup:acc', 'landminepress|dbpress:acc', 'invrow|dbrow:acc']], ['pwr', ['kbswing|medslam', 'boxjump|broadjump']], ['cond', 'cont']] }
    }
  },
  {
    id: 'speed', icon: 'bolt', name: 'Hurtighed og acceleration', season: 'pre', focus: ['Hurtighed', 'Eksplosivitet'],
    perWeek: 2, mins: 50, equip: 'Bane og fitnesscenter', level: 'Øvet', scheme: 'explosive', rest: 150,
    desc: 'Hurtigere første skridt, højere topfart og skarpere vendinger. Fart med fuld pause, og tung styrke med få gentagelser, der giver kraft i afsættet. Øvelserne skifter hver anden uge.',
    sessions: {
      A: { t: 'Acceleration', md: 2, blocks: ['warmfield', ['speed', [['askip|carioca', 2, '20 m|20 sek'], ['wallaccel', 3, '5 skift'], ['sprint5', 5, '10 m'], ['decel|mirror', 3, '5 m|15 sek']]], ['str', ['trapbar|backsquat:main', 'hipthrust|slrdl:acc', 'slcalf|stepcalf:acc']], ['prev', ['nordic', 'copenhagen']]] },
      B: { t: 'Topfart og retningsskift', md: 2, blocks: ['warmfield', ['speed', [['flysprint', 3, '20 m'], ['cod505|tdrill', 2, '2/side|3 gange'], ['mirror|ladder', 3, '15 sek|20 sek']]], ['pwr', ['skater|lateralstick', 'pogo|slhop', 'broadjump|depthjump']], ['str', ['backsquat|frontsquat:main', 'slrdl|hipthrust:acc']]] }
    }
  },
  {
    id: 'jump', icon: 'bolt', name: 'Spring og eksplosivitet', season: 'pre', focus: ['Eksplosivitet', 'Målmand'],
    perWeek: 2, mins: 50, equip: 'Fitnesscenter', level: 'Øvet', scheme: 'explosive', rest: 150,
    desc: 'Højere spring til indlæg og et eksplosivt sideværts afsæt. Spring og kast først, mens du er frisk, og derefter tung styrke. Øvelserne skifter hver anden uge.',
    sessions: {
      A: { t: 'Lodret kraft', md: 3, blocks: ['warm', ['pwr', ['boxjump|squatjump', 'depthjump|tuckjump', 'trapjump|broadjump']], ['str', ['backsquat|frontsquat:main', 'hipthrust|slrdl:acc', 'stepcalf|soleus:acc']], ['core', ['pallof|bandpallof', 'hollow|abwheel']]] },
      B: { t: 'Sideværts kraft', md: 2, blocks: ['warm', ['pwr', ['lateralstick|bounds', 'skater|slhop', 'gkhighcatch|gkstar', 'medrot|gkthrow']], ['str', ['trapbar|rdl:main', 'bulgarian|stepup:acc']], ['prev', ['copenhagen', 'slcalf|tibraise']]] }
    }
  },
  {
    id: 'cond', icon: 'pulse', name: 'Kampkondition', season: 'pre', focus: ['Kondition', 'Hurtighed'],
    perWeek: 3, mins: 45, equip: 'Bane og fitnesscenter', level: 'Alle niveauer', scheme: 'maint', rest: 90,
    desc: 'Byg motoren op til sæsonen: tempoløb, gentagne sprint og intervaller. Ét kort styrkepas holder styrken ved lige. Øvelserne skifter hver anden uge.',
    sessions: {
      A: { t: 'Tempoløb', md: 3, blocks: ['warmfield', ['cond', 'tempo'], ['core', ['plank|hollow', 'sideplank|plankreach', 'birddog|deadbug']]] },
      B: { t: 'Gentagne sprint', md: 2, blocks: ['warmfield', ['cond', 'rsa'], ['prev', ['nordic', 'copenhagen']]] },
      C: { t: 'Styrke og intervaller', md: 3, blocks: ['warm', ['str', ['goblet|frontsquat:main', 'rdl|dbrdl:main', 'pullup|invrow:acc']], ['cond', 'int|b5']] }
    }
  },
  {
    id: 'prevent', icon: 'shield', name: 'Skadeforebyggelse', season: 'all', focus: ['Skadeforebyggelse'],
    perWeek: 2, mins: 25, equip: 'Elastik og bold', level: 'Alle niveauer', scheme: 'maint', rest: 60,
    desc: 'Kort program, der beskytter baglår, lyske, knæ, ankler og skuldre. Kan bruges hele året, også oven i et andet program og i travle kampuger. Nordic og Copenhagen er faste; resten skifter hver anden uge.',
    sessions: {
      A: { t: 'Baglår, lyske og knæ', md: 2, blocks: ['warmfield', ['prev', ['nordic', 'copenhagen', 'spanish|isosplit', 'lateralstick|decel']], ['core', ['bandpallof|deadbug', 'sideplank|birddog']]] },
      B: { t: 'Ankler, hofter og skuldre', md: 1, blocks: [['prev', ['slcalf|stepcalf', 'tibraise', 'hipairplane|latbandwalk']], ['prev', ['ytw|bandpull', 'extrot', 'adductsqueeze']], ['mob', ['hips9090|cossack', 'anklemob', 'wgs|openbook']]] }
    }
  },
  {
    id: 'home', icon: 'house', name: 'Hjemme uden udstyr', season: 'all', focus: ['Styrke', 'Kondition'],
    perWeek: 3, mins: 30, equip: 'Ingen udstyr', level: 'Alle niveauer', scheme: 'ramp', rest: 60,
    desc: 'Tre korte pas, du kan lave i stuen eller i parken: benstyrke og core, overkrop og spring, og et konditionspas. Øvelserne skifter hver anden uge.',
    sessions: {
      A: { t: 'Ben og core', md: 2, blocks: [['mob', ['wgs|catcow', 'deepsquat|hips9090']], ['circ', ['reverselunge|splitsquat', 'slbridge|glutebridge', 'sumosquat|wallsit', 'slcalf|tibraise']], ['core', ['plank|hollow', 'deadbug|birddog', 'sideplank|plankreach']]] },
      B: { t: 'Overkrop og spring', md: 2, blocks: [['mob', ['openbook', 'catcow|wgs']], ['circ', ['pushup|diamondpush', 'pikepush|kneepushup', 'superman', 'ytw']], ['pwr', ['squatjump|tuckjump', 'skater|lateralstick', 'broadjump|slhop']], ['core', ['hollow|legraise', 'birddog|bicycle']]] },
      C: { t: 'Kondition', md: 2, blocks: [['circ', ['burpee|tuckjump', 'mtnclimber', 'bearcrawl|skater', 'fastfeet|carioca']], ['cond', 'runcont']] }
    }
  },
  {
    id: 'comeback', icon: 'repeat', name: 'Comeback efter pause', season: 'all', focus: ['Styrke', 'Kondition', 'Skadeforebyggelse'],
    perWeek: 2, mins: 45, equip: 'Fitnesscenter', level: 'Begynder', scheme: 'ramp', rest: 90,
    desc: 'Kom roligt tilbage efter en pause eller en skade. Lette vægte, kontrol og rolig kondition, der langsomt bygges op over 8 uger. Har du været skadet, så aftal det med en fysioterapeut først.',
    sessions: {
      A: { t: 'Styrke', md: 3, blocks: ['warm', ['str', ['goblet|legpress:main', 'dbrdl|hipthrust:acc', 'dbrow|cablerow:acc', 'dbbench|pushup:acc']], ['prev', ['glutebridge|slbridge', 'slcalf', 'adductsqueeze']]] },
      B: { t: 'Kondition og kontrol', md: 2, blocks: [['cond', 'cont'], ['prev', ['lateralstick', 'hipairplane|latbandwalk', 'isosplit|spanish']], ['core', ['deadbug', 'birddog|plank', 'sideplank']]] }
    }
  }
];
const PROG_BY_ID = Object.fromEntries(PROGRAMS.map(p => [p.id, p]));
