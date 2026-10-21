'use strict';
/* Færdige programmer. Ren data: app.js bygger ugerne ud fra dem (genProgWeek).
   Indlæses efter exercises.js og før app.js.

   Alle programmer er 8 uger. Uge 4 og 8 er lette uger.
   season: 'off' | 'pre' | 'in' | 'all'
   scheme: hvordan sæt, gentagelser, % af maks og runder udvikler sig over ugerne (se SCH og P_ROUNDS i app.js)
   rest:   pause i sekunder mellem tunge sæt
   Pas: t = titel, md = hvor tæt på kamp passet må ligge (som md på øvelserne), blocks = blokke i rækkefølge.

   Blokke:
   'warm'                    6 min cykel
   'warmfield'               FIFA 11+ løbedel (8 min)
   ['str',  ['ex:main', 'ex:acc']]   styrke med sæt, gentagelser og vægt ud fra dit niveau. main = hovedløft, acc = assistance
   ['speed', [[ex, sæt, 'gentagelse']]]  fart med fuld pause. Sættene stiger lidt over ugerne
   ['pwr' | 'gk' | 'prev' | 'core' | 'circ' | 'mob', [ex, ...]]  runder med guidet timer
   ['cond', 'cont' | 'runcont' | 'int' | 'short' | 'tempo' | 'rsa' | 'b5']  kondition */
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
    desc: 'Byg den styrke og muskelmasse, der giver kraft i afsættet og overkrop til at gå i dueller. Tung styrke, kast og målmandskraft, og intervaller for at holde motoren i gang.',
    sessions: {
      A: { t: 'Ben og afsæt', md: 3, blocks: ['warm', ['str', ['frontsquat:main', 'rdl:acc', 'bulgarian:acc', 'slcalf:acc']], ['prev', ['nordic', 'copenhagen']], ['core', ['pallof', 'deadbug', 'sideplank']]] },
      B: { t: 'Overkrop og kast', md: 2, blocks: ['warm', ['str', ['dbbench:main', 'pullup:main', 'dbpress:acc', 'dbrow:acc', 'facepull:acc']], ['pwr', ['medthrow', 'medrot']], ['core', ['suitcase', 'hollow', 'birddog']]] },
      C: { t: 'Målmandskraft og kondition', md: 2, blocks: ['warm', ['str', ['trapbar:main', 'hipthrust:acc', 'landminepress:acc']], ['gk', ['gkshuffledive', 'getup', 'gkhighcatch']], ['cond', 'int']] }
    }
  },
  {
    id: 'gkpre', icon: 'glove', name: 'Målmand opbygning', season: 'pre', focus: ['Målmand', 'Eksplosivitet', 'Hurtighed'],
    perWeek: 2, mins: 60, equip: 'Fitnesscenter og bane', level: 'Øvet', scheme: 'explosive', rest: 150,
    desc: 'Gør off-season-styrken eksplosiv før sæsonen: spring, kast, hurtige første skridt og dyk. Korte, hårde intervaller giver overskud til gentagne aktioner.',
    sessions: {
      A: { t: 'Kraft og afsæt', md: 3, blocks: ['warm', ['pwr', ['depthjump', 'lateralstick', 'medrot']], ['str', ['backsquat:main', 'rdl:main', 'slcalf:acc']], ['prev', ['nordic', 'copenhagen']]] },
      B: { t: 'Fart og reaktion', md: 2, blocks: ['warmfield', ['speed', [['wallaccel', 3, '5 skift'], ['sprint5', 4, '10 m'], ['cod505', 2, '2/side']]], ['gk', ['gkshuffledive', 'gkcollapse', 'getup']], ['cond', 'short']] }
    }
  },
  {
    id: 'gkin', icon: 'glove', name: 'Målmand in-season', season: 'in', focus: ['Målmand', 'Styrke', 'Skadeforebyggelse'],
    perWeek: 2, mins: 45, equip: 'Fitnesscenter', level: 'Alle niveauer', scheme: 'maint', rest: 120,
    desc: 'Hold styrken og eksplosiviteten gennem sæsonen med få, tunge sæt. Det tunge pas ligger tidligt i ugen og det hurtige pas tættere på kamp, så du er frisk lørdag.',
    sessions: {
      A: { t: 'Styrke', md: 3, blocks: ['warm', ['str', ['frontsquat:main', 'rdl:main', 'pullup:acc']], ['prev', ['nordic', 'copenhagen', 'spanish']]] },
      B: { t: 'Hurtig og klar', md: 2, blocks: ['warmfield', ['speed', [['wallaccel', 2, '5 skift'], ['sprint5', 3, '10 m']]], ['pwr', ['pogo', 'lateralstick', 'medthrow']], ['core', ['pallof', 'sideplank', 'deadbug']]] }
    }
  },
  {
    id: 'strength', icon: 'dumbbell', name: 'Styrke og muskler', season: 'off', focus: ['Styrke', 'Muskler'],
    perWeek: 3, mins: 60, equip: 'Fitnesscenter', level: 'Øvet', scheme: 'offseason', rest: 120,
    desc: 'Klassisk off-season: ben, overkrop og helkrop med tunge basisløft og mere volumen. Bygger det fundament, som fart og spring senere skal stå på.',
    sessions: {
      A: { t: 'Ben', md: 3, blocks: ['warm', ['str', ['backsquat:main', 'rdl:acc', 'walkinglunge:acc', 'soleus:acc']], ['core', ['abwheel', 'pallof', 'copenhagen']]] },
      B: { t: 'Overkrop', md: 2, blocks: ['warm', ['str', ['dbbench:main', 'pullup:main', 'dbpress:acc', 'cablerow:acc', 'facepull:acc']], ['core', ['suitcase', 'hollow', 'sideplank']]] },
      C: { t: 'Helkrop og kraft', md: 3, blocks: ['warm', ['str', ['trapbar:main', 'bulgarian:acc', 'landminepress:acc', 'invrow:acc']], ['pwr', ['kbswing', 'boxjump']], ['cond', 'cont']] }
    }
  },
  {
    id: 'speed', icon: 'bolt', name: 'Hurtighed og acceleration', season: 'pre', focus: ['Hurtighed', 'Eksplosivitet'],
    perWeek: 2, mins: 50, equip: 'Bane og fitnesscenter', level: 'Øvet', scheme: 'explosive', rest: 150,
    desc: 'Hurtigere første skridt, højere topfart og skarpere vendinger. Fart med fuld pause, og tung styrke med få gentagelser, der giver kraft i afsættet.',
    sessions: {
      A: { t: 'Acceleration', md: 2, blocks: ['warmfield', ['speed', [['askip', 2, '20 m'], ['wallaccel', 3, '5 skift'], ['sprint5', 5, '10 m'], ['decel', 3, '5 m']]], ['str', ['trapbar:main', 'hipthrust:acc', 'slcalf:acc']], ['prev', ['nordic', 'copenhagen']]] },
      B: { t: 'Topfart og retningsskift', md: 2, blocks: ['warmfield', ['speed', [['flysprint', 3, '20 m'], ['cod505', 2, '2/side'], ['mirror', 3, '15 sek']]], ['pwr', ['skater', 'pogo', 'broadjump']], ['str', ['backsquat:main', 'slrdl:acc']]] }
    }
  },
  {
    id: 'jump', icon: 'bolt', name: 'Spring og eksplosivitet', season: 'pre', focus: ['Eksplosivitet', 'Målmand'],
    perWeek: 2, mins: 50, equip: 'Fitnesscenter', level: 'Øvet', scheme: 'explosive', rest: 150,
    desc: 'Højere spring til indlæg og et eksplosivt sideværts afsæt. Spring og kast først, mens du er frisk, og derefter tung styrke.',
    sessions: {
      A: { t: 'Lodret kraft', md: 3, blocks: ['warm', ['pwr', ['boxjump', 'depthjump', 'trapjump']], ['str', ['backsquat:main', 'hipthrust:acc', 'stepcalf:acc']], ['core', ['pallof', 'hollow']]] },
      B: { t: 'Sideværts kraft', md: 2, blocks: ['warm', ['pwr', ['lateralstick', 'skater', 'gkhighcatch', 'medrot']], ['str', ['trapbar:main', 'bulgarian:acc']], ['prev', ['copenhagen', 'slcalf']]] }
    }
  },
  {
    id: 'cond', icon: 'pulse', name: 'Kampkondition', season: 'pre', focus: ['Kondition', 'Hurtighed'],
    perWeek: 3, mins: 45, equip: 'Bane og fitnesscenter', level: 'Alle niveauer', scheme: 'maint', rest: 90,
    desc: 'Byg motoren op til sæsonen: tempoløb, gentagne sprint og intervaller. Ét kort styrkepas holder styrken ved lige.',
    sessions: {
      A: { t: 'Tempoløb', md: 3, blocks: ['warmfield', ['cond', 'tempo'], ['core', ['plank', 'sideplank', 'birddog']]] },
      B: { t: 'Gentagne sprint', md: 2, blocks: ['warmfield', ['cond', 'rsa'], ['prev', ['nordic', 'copenhagen']]] },
      C: { t: 'Styrke og intervaller', md: 3, blocks: ['warm', ['str', ['goblet:main', 'rdl:main', 'pullup:acc']], ['cond', 'int']] }
    }
  },
  {
    id: 'prevent', icon: 'shield', name: 'Skadeforebyggelse', season: 'all', focus: ['Skadeforebyggelse'],
    perWeek: 2, mins: 25, equip: 'Elastik og bold', level: 'Alle niveauer', scheme: 'maint', rest: 60,
    desc: 'Kort program, der beskytter baglår, lyske, knæ, ankler og skuldre. Kan bruges hele året, også oven i et andet program og i travle kampuger.',
    sessions: {
      A: { t: 'Baglår, lyske og knæ', md: 2, blocks: ['warmfield', ['prev', ['nordic', 'copenhagen', 'spanish', 'lateralstick']], ['core', ['bandpallof', 'sideplank']]] },
      B: { t: 'Ankler, hofter og skuldre', md: 1, blocks: [['prev', ['slcalf', 'tibraise', 'hipairplane', 'latbandwalk']], ['prev', ['ytw', 'extrot', 'adductsqueeze']], ['mob', ['hips9090', 'anklemob', 'wgs']]] }
    }
  },
  {
    id: 'home', icon: 'house', name: 'Hjemme uden udstyr', season: 'all', focus: ['Styrke', 'Kondition'],
    perWeek: 3, mins: 30, equip: 'Ingen udstyr', level: 'Alle niveauer', scheme: 'ramp', rest: 60,
    desc: 'Tre korte pas, du kan lave i stuen eller i parken: benstyrke og core, overkrop og spring, og et konditionspas.',
    sessions: {
      A: { t: 'Ben og core', md: 2, blocks: [['mob', ['wgs', 'deepsquat']], ['circ', ['reverselunge', 'slbridge', 'sumosquat', 'slcalf']], ['core', ['plank', 'deadbug', 'sideplank']]] },
      B: { t: 'Overkrop og spring', md: 2, blocks: [['mob', ['openbook', 'catcow']], ['circ', ['pushup', 'pikepush', 'superman', 'ytw']], ['pwr', ['squatjump', 'skater', 'broadjump']], ['core', ['hollow', 'birddog']]] },
      C: { t: 'Kondition', md: 2, blocks: [['circ', ['burpee', 'mtnclimber', 'bearcrawl', 'fastfeet']], ['cond', 'runcont']] }
    }
  },
  {
    id: 'comeback', icon: 'repeat', name: 'Comeback efter pause', season: 'all', focus: ['Styrke', 'Kondition', 'Skadeforebyggelse'],
    perWeek: 2, mins: 45, equip: 'Fitnesscenter', level: 'Begynder', scheme: 'ramp', rest: 90,
    desc: 'Kom roligt tilbage efter en pause eller en skade. Lette vægte, kontrol og rolig kondition, der langsomt bygges op over 8 uger. Har du været skadet, så aftal det med en fysioterapeut først.',
    sessions: {
      A: { t: 'Styrke', md: 3, blocks: ['warm', ['str', ['goblet:main', 'dbrdl:acc', 'dbrow:acc', 'dbbench:acc']], ['prev', ['slbridge', 'slcalf', 'adductsqueeze']]] },
      B: { t: 'Kondition og kontrol', md: 2, blocks: [['cond', 'cont'], ['prev', ['lateralstick', 'hipairplane', 'isosplit']], ['core', ['deadbug', 'birddog', 'sideplank']]] }
    }
  }
];
const PROG_BY_ID = Object.fromEntries(PROGRAMS.map(p => [p.id, p]));
