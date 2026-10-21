'use strict';
/* Øvelsesbibliotek: alle øvelser, "godt til", udstyr og sæson.
   Indlæses før app.js. Ren data, ingen afhængigheder til resten af appen. */

/* ===== Øvelser ===== */
const CATS = ['Alle', 'Kondition', 'Bevægelse', 'Eksplosiv', 'Styrke', 'Core', 'Mobilitet', 'Fokus'];
/* "Godt til": hvad en øvelse bruges til. Vises som tags ved alle øvelser. */
const BENEFITS = [
  { k: 'Styrke', d: 'Kraft i ben, ryg, bryst og skuldre. Giver stabilitet og kraft i alle aktioner.' },
  { k: 'Eksplosivitet', d: 'Hurtig kraftudvikling: afsæt til redninger, spring og udkast.' },
  { k: 'Udholdenhed', d: 'Kondition og evnen til at gentage aktioner hele kampen.' },
  { k: 'Core', d: 'Stabil krop midt i bevægelsen: overfører kraft og giver færre skader.' },
  { k: 'Hurtighed', d: 'Hurtige fødder, reaktion og første skridt.' },
  { k: 'Mobilitet', d: 'Bevægelighed i hofter, ryg, skuldre og ankler.' },
  { k: 'Balance', d: 'Kontrol på ét ben og i ustabile stillinger.' },
  { k: 'Skadesforebyggelse', d: 'Styrker led og muskler, der ofte bliver overbelastet.' },
  { k: 'Fokus', d: 'Ro, koncentration og parathed i hovedet.' }
];
const EQUIPS = ['Ingen udstyr', 'Elastik', 'Håndvægte', 'Kettlebell', 'Stang', 'Bænk/kasse', 'Kabel', 'Maskine', 'Medicinbold', 'Bold', 'Andet'];
const PATTERN_TXT = { cardio: 'konditionsøvelser', squat: 'benstyrke', hinge: 'baglår og baller', push: 'skub (bryst og skuldre)', pull: 'træk (ryg)', core: 'core', carry: 'bæreøvelser', plyo: 'eksplosive spring og kast', calf: 'læg og ankler', agility: 'hurtige fødder', mobility: 'bevægelighed', focus: 'fokus' };
const isHomeEx = e => !!e.home || e.equip === 'Elastik';
const EX = {
  bike: {
    name: 'Cykel / crosstrainer', cat: 'Kondition',
    goal: 'Opvarmning og aerob base med lav belastning på leddene.',
    how: ['Indstil sadlen, så knæet er let bøjet, når pedalen er i bund.', 'Træd i jævnt tempo, og justér modstanden, til du rammer den rigtige RPE.', 'Hold tempoet hele vejen, og træk vejret roligt og dybt.'],
    dose: '5–30 min', rest: 'Ingen', tips: ['Taletest ved RPE 5–6: du kan sige korte sætninger.', 'Crosstrainer: hold overkroppen rank, og brug også armene.'], secs: 360
  },
  assault: {
    name: 'Assault bike', cat: 'Kondition',
    goal: 'Korte, hårde ryk med arme og ben, ligesom en eksplosiv aktion i målet.',
    how: ['Sæt dig med fødderne på pedalerne og hænderne på håndtagene.', 'Skub og træk i håndtagene, mens du træder hårdt. Arme og ben arbejder sammen.', 'Sænk tempoet helt ved signalet, og træk vejret dybt.'],
    dose: '15–30 sek hårdt', rest: '40–60 sek let', tips: ['Hårdt fra første sekund, ingen langsom opstart.', 'Hold hovedet roligt og blikket frem, som når du følger bolden.'], secs: 20
  },
  shuffle: {
    home: true, name: 'Lateral shuffle', cat: 'Bevægelse',
    goal: 'Hurtig sideværts bevægelse på stregen.',
    how: ['Målmandsstilling: bøjede knæ, vægt på forfoden og hænderne klar.', 'Skub fra med det ene ben, og flyt dig sidelæns uden at samle fødderne.', 'Stop kontrolleret, og skift retning.'],
    dose: '20 sek', rest: '30 sek', tips: ['Hold hofterne i samme højde hele vejen.', 'Fødderne må ikke krydse eller slå sammen.'], secs: 20
  },
  squat: {
    home: true, name: 'Bodyweight squat', cat: 'Styrke',
    goal: 'Styrke og kontrol i ben og hofter.',
    how: ['Stå med fødderne i skulderbredde og tæerne let udad.', 'Sæt dig ned og tilbage, til lårene er vandrette. Armene frem.', 'Pres op gennem hele foden, til du står helt oprejst.'],
    dose: '10 reps', rest: '30 sek', tips: ['Knæene følger tæerne.', 'Brystet op og ryggen lige.']
  },
  latlunge: {
    home: true, name: 'Lateral lunge', cat: 'Bevægelse',
    goal: 'Styrke og bevægelighed til sideværts aktioner.',
    how: ['Stå samlet med hænderne foran brystet.', 'Tag et langt skridt til siden, og sæt dig ned på det bøjede ben. Det andet ben er strakt.', 'Skub dig tilbage til start, og skift side.'],
    dose: '6/side', rest: '30 sek', tips: ['Hælen bliver i gulvet.', 'Sid tilbage i hoften, ikke frem over knæet.']
  },
  calf: {
    home: true, name: 'Calf raise', cat: 'Styrke',
    goal: 'Stærke læg og ankler til afsæt og landinger.',
    how: ['Stå oprejst med fødderne i hoftebredde.', 'Pres op på tæerne, så højt du kan.', 'Sænk langsomt ned igen på 2 sekunder.'],
    dose: '15 reps', rest: '30 sek', tips: ['Hold et kort stop i toppen.', 'Brug en væg til balance, hvis du har brug for det.']
  },
  pallof: {
    log: true, name: 'Pallof press', cat: 'Core',
    goal: 'Stabil core: modstå rotation, når kroppen bliver trukket.',
    how: ['Stå sidelæns til kabeltårnet med håndtaget ind mod brystet.', 'Pres håndtaget lige frem, til armene er strakte.', 'Hold 1 sekund uden at dreje, og før håndtaget tilbage.'],
    dose: '10/side', rest: '30 sek', tips: ['Hofter og skuldre peger frem hele tiden.', 'Spænd maven, som om du skal tage et skud på kroppen.']
  },
  deadbug: {
    home: true, name: 'Dead bug', cat: 'Core',
    goal: 'Kontrol i core, mens arme og ben bevæger sig.',
    how: ['Lig på ryggen. Armene lige op, hofter og knæ i 90 grader.', 'Stræk modsat arm og ben langsomt ud mod gulvet.', 'Før dem tilbage, og skift side.'],
    dose: '8/side', rest: '30 sek', tips: ['Lænden presset ned i måtten hele tiden.', 'Pust langsomt ud, mens du strækker.']
  },
  sideplank: {
    home: true, name: 'Side plank', cat: 'Core',
    goal: 'Stærke skrå mavemuskler og en stabil hofte.',
    how: ['Lig på siden med albuen lige under skulderen.', 'Løft hoften, så kroppen er en lige linje fra fødder til hoved.', 'Hold positionen, og skift side.'],
    dose: '25 sek/side', rest: '30 sek', tips: ['Hoften må ikke synke.', 'Pres albuen ned i gulvet.'], secs: 25, perSide: true
  },
  bounds: {
    home: true, name: 'Lateral bounds', cat: 'Eksplosiv',
    goal: 'Eksplosiv lateral bevægelse, som afsættet til en redning.',
    how: ['Stå på ét ben med let bøjet knæ.', 'Spring eksplosivt til siden over på det andet ben.', 'Land blødt og kontrolleret, og hold balancen et øjeblik.'],
    dose: '5/side', rest: '60 sek', tips: ['Land på forfoden med bøjet knæ.', 'Brug armene i afsættet.']
  },
  squatjump: {
    home: true, name: 'Squat jumps', cat: 'Eksplosiv',
    goal: 'Eksplosiv kraft lodret op, til de høje bolde.',
    how: ['Gå ned i en squat med armene bagud.', 'Spring eksplosivt op, og sving armene op.', 'Land blødt i squat, og nulstil før næste hop.'],
    dose: '5 reps', rest: '60 sek', tips: ['Kvalitet før tempo.', 'Land stille. Lyt efter landingen.']
  },
  bulgarian: {
    log: true, name: 'Bulgarian split squat', cat: 'Styrke',
    goal: 'Benstyrke på ét ben ad gangen.',
    how: ['Bageste fod på bænken, forreste fod et stort skridt frem.', 'Sænk dig lige ned, til bageste knæ næsten rører gulvet.', 'Pres op gennem forreste hæl.'],
    dose: '8/ben', rest: '90 sek', tips: ['Overkroppen må gerne læne lidt frem.', 'Forreste knæ følger tæerne.']
  },
  rdl: {
    log: true, name: 'Romanian deadlift', cat: 'Styrke',
    goal: 'Stærk bagside af lår, baller og ryg.',
    how: ['Stå med stangen foran lårene og let bøjede knæ.', 'Skub hofterne bagud, og lad stangen glide ned langs benene.', 'Pres hofterne frem og rejs dig, når du mærker strækket bag lårene.'],
    dose: '8 reps', rest: '90 sek', tips: ['Ryggen er lige hele tiden.', 'Hold stangen tæt på kroppen.']
  },
  latpull: {
    log: true, name: 'Lat pulldown', cat: 'Styrke',
    goal: 'Stærk ryg og skuldre til udspark, udkast og høje bolde.',
    how: ['Sæt dig med lårene under puderne, og tag et bredt greb om stangen.', 'Træk stangen ned til øverste del af brystet.', 'Før stangen kontrolleret op igen.'],
    dose: '10 reps', rest: '90 sek', tips: ['Træk albuerne ned mod siderne.', 'Læn dig kun lidt tilbage.']
  },
  farmer: {
    log: true, name: 'Farmer’s walk', cat: 'Core',
    goal: 'Greb, core og holdning under belastning.',
    how: ['Tag en tung kettlebell eller håndvægt i hver hånd.', 'Gå med korte, rolige skridt og rank ryg.', 'Sæt vægtene kontrolleret ned efter distancen.'],
    dose: '30–40 m', rest: '60 sek', tips: ['Skuldrene ned og tilbage.', 'Lad ikke vægtene slå mod benene.']
  },
  fastfeet: {
    home: true, name: 'Hurtige fødder', cat: 'Bevægelse',
    goal: 'Hurtige, lette fødder og parathed til næste aktion.',
    how: ['Stå i målmandsstilling på forfoden.', 'Lav hurtige, korte trip på stedet.', 'Stop i balance med vægten fremme.'],
    dose: '10 sek', rest: '30 sek', tips: ['Fødderne lige over gulvet.', 'Overkroppen rolig, hænderne klar.'], secs: 10
  },
  glutebridge: {
    home: true, name: 'Glute bridge', cat: 'Styrke',
    goal: 'Stærke baller og bagside af lår, som giver kraft i afsættet.',
    how: ['Lig på ryggen med bøjede knæ og fødderne fladt i gulvet.', 'Pres hælene ned, og løft hoften, til knæ, hofte og skuldre er på linje.', 'Hold 1 sekund i toppen, og sænk roligt.'],
    dose: '12 reps', rest: '30 sek', tips: ['Spænd ballerne, ikke lænden.', 'Niveau 2: løft det ene ben, og pres op på det andet.']
  },
  pushup: {
    home: true, name: 'Armstrækninger', cat: 'Styrke',
    goal: 'Styrke i bryst, skuldre og arme til udkast og til at komme hurtigt op fra jorden.',
    how: ['Hænderne lidt bredere end skuldrene. Kroppen er en lige linje.', 'Sænk brystet mod gulvet med albuerne skråt ud fra kroppen.', 'Pres dig op, til armene er strakte.'],
    dose: '8–12 reps', rest: '30 sek', tips: ['For hårdt? Lav dem med knæene i gulvet.', 'Hoften må hverken hænge eller stikke op.']
  },
  plank: {
    home: true, name: 'Planke', cat: 'Core',
    goal: 'En stabil midtersektion, der holder kroppen samlet i dueller og landinger.',
    how: ['Albuerne under skuldrene og knæene i gulvet.', 'Løft knæene, så kroppen er en lige linje fra hæl til hoved.', 'Hold positionen, og træk vejret roligt.'],
    dose: '30–45 sek', rest: '30 sek', tips: ['Spænd balder og mave på samme tid.', 'Kig ned i gulvet, så nakken er neutral.'], secs: 30
  },
  reverselunge: {
    home: true, name: 'Bagudlunge', cat: 'Styrke',
    goal: 'Benstyrke og balance på ét ben ad gangen. Skånsomt for knæene.',
    how: ['Stå samlet med vægten midt på foden.', 'Tag et langt skridt bagud, og sænk bageste knæ mod gulvet.', 'Pres op gennem forreste hæl, og før benet frem igen.'],
    dose: '6–8/ben', rest: '30 sek', tips: ['Forreste knæ peger frem over foden, ikke indad.', 'Rank overkrop hele vejen.']
  },
  birddog: {
    home: true, name: 'Bird dog', cat: 'Core',
    goal: 'Kontrol i ryg og core, mens arme og ben bevæger sig.',
    how: ['Stå på alle fire: hænder under skuldre, knæ under hofter.', 'Stræk modsat arm og ben ud, til de er i linje med kroppen.', 'Hold 2 sekunder, før dem tilbage, og skift side.'],
    dose: '6–8/side', rest: '30 sek', tips: ['Hoften må ikke dreje. Forestil dig et glas vand på lænden.', 'Langsomt er sværere end hurtigt.']
  },
  getup: {
    home: true, name: 'Hurtig rejsning', cat: 'Bevægelse',
    goal: 'Kom hurtigt op fra jorden og klar til næste aktion, som efter en redning.',
    how: ['Lig på siden som efter en redning, med armene strakt frem.', 'Kom op så hurtigt du kan via knæ og fødder.', 'Land i klarposition: vægt på forfoden og hænderne foran.'],
    dose: '5–6/side', rest: '30 sek', tips: ['Hold blikket fremme mod bolden hele tiden.', 'Stå stille et øjeblik i klarposition før næste.']
  },
  reaction: {
    home: true, name: 'Reaktionsstart', cat: 'Fokus',
    goal: 'Fokus og parathed: reagér hurtigt og rigtigt på et signal.',
    how: ['Stå i klarposition med telefonen foran dig, så du kan se skærmen.', 'VENSTRE og HØJRE: to hurtige sidesteps. OP: spring og ræk armene op. NED: rør gulvet med begge hænder.', 'Kom straks tilbage i klarposition, og vent på næste signal.'],
    dose: '30 sek', rest: '30 sek', tips: ['Bliv i klarposition mellem signalerne. Ingen gætning.', 'Har du en makker, kan han eller hun råbe signalerne i stedet.']
  },
  breath: {
    home: true, name: 'Fokus-vejrtrækning', cat: 'Fokus',
    goal: 'Ro i kroppen og skarpt fokus før træning og kamp.',
    how: ['Stå eller sid med rank ryg og skuldrene nede.', 'Ind på 4 sek, hold 4 sek, ud på 4 sek, hold 4 sek.', 'Gentag 4 gange. Timeren guider dig.'],
    dose: '4 runder', rest: 'Ingen', tips: ['Træk vejret ind gennem næsen og ned i maven.', 'Brug den også i omklædningsrummet før kamp.']
  }
};



/* ===== Udvidet øvelsesbibliotek =====
   good    = hvad øvelsen er godt til (vises som tags overalt)
   equip   = udstyr
   pattern = bevægelsesmønster: øvelser med samme mønster kan byttes ud med hinanden i programmet */
const META = {
  bike: [['Udholdenhed'], 'Maskine', 'cardio'],
  assault: [['Udholdenhed', 'Eksplosivitet'], 'Maskine', 'cardio'],
  shuffle: [['Hurtighed', 'Udholdenhed'], 'Ingen udstyr', 'agility'],
  squat: [['Styrke', 'Mobilitet'], 'Ingen udstyr', 'squat'],
  latlunge: [['Mobilitet', 'Styrke', 'Skadesforebyggelse'], 'Ingen udstyr', 'mobility'],
  calf: [['Styrke', 'Skadesforebyggelse'], 'Ingen udstyr', 'calf'],
  pallof: [['Core', 'Skadesforebyggelse'], 'Kabel', 'core'],
  deadbug: [['Core'], 'Ingen udstyr', 'core'],
  sideplank: [['Core', 'Balance'], 'Ingen udstyr', 'core'],
  bounds: [['Eksplosivitet', 'Balance'], 'Ingen udstyr', 'plyo'],
  squatjump: [['Eksplosivitet', 'Styrke'], 'Ingen udstyr', 'plyo'],
  bulgarian: [['Styrke', 'Balance'], 'Bænk/kasse', 'squat'],
  rdl: [['Styrke', 'Skadesforebyggelse'], 'Stang', 'hinge'],
  latpull: [['Styrke'], 'Maskine', 'pull'],
  farmer: [['Core', 'Styrke'], 'Kettlebell', 'carry'],
  fastfeet: [['Hurtighed', 'Udholdenhed'], 'Ingen udstyr', 'agility'],
  glutebridge: [['Styrke', 'Skadesforebyggelse'], 'Ingen udstyr', 'hinge'],
  pushup: [['Styrke'], 'Ingen udstyr', 'push'],
  plank: [['Core'], 'Ingen udstyr', 'core'],
  reverselunge: [['Styrke', 'Balance'], 'Ingen udstyr', 'squat'],
  birddog: [['Core', 'Balance', 'Skadesforebyggelse'], 'Ingen udstyr', 'core'],
  getup: [['Hurtighed', 'Eksplosivitet'], 'Ingen udstyr', 'agility'],
  reaction: [['Fokus', 'Hurtighed'], 'Ingen udstyr', 'focus'],
  breath: [['Fokus'], 'Ingen udstyr', 'focus']
};
Object.entries(META).forEach(([id, [good, equip, pattern]]) => Object.assign(EX[id], { good, equip, pattern }));

function A(id, name, cat, good, equip, pattern, goal, how, dose, rest, tips, o = {}) {
  EX[id] = { name, cat, good, equip, pattern, goal, how, dose, rest, tips, home: equip === 'Ingen udstyr', ...o };
}

/* --- Kondition --- */
A('rower', 'Romaskine', 'Kondition', ['Udholdenhed', 'Styrke'], 'Maskine', 'cardio',
  'Aerob base med hele kroppen og lav belastning på leddene.',
  ['Sæt fødderne fast, og tag fat i håndtaget med strakte arme.', 'Skub fra med benene først, læn let tilbage, og træk håndtaget ind til brystet.', 'Stræk armene, før kroppen frem, og lad benene bøje, så du er klar til næste træk.'],
  '5–30 min', 'Ingen', ['Rækkefølge ud: ben, krop, arme. Ind i omvendt rækkefølge.', 'Hold ryggen lang, og træk ikke med ryggen alene.']);
A('run', 'Løb (let jogging)', 'Kondition', ['Udholdenhed'], 'Ingen udstyr', 'cardio',
  'Aerob base, der kan laves næsten hvor som helst.',
  ['Start med at gå et par minutter, og kom op i et roligt tempo.', 'Løb afslappet med korte skridt og let fremadlænet krop.', 'Hold et tempo, hvor du kan tale i korte sætninger.'],
  '10–30 min', 'Ingen', ['Land under kroppen, ikke langt foran den.', 'Løbebånd: sæt hældningen på 1 % for at ligne løb ude.']);
A('skierg', 'Ski-erg', 'Kondition', ['Udholdenhed', 'Core'], 'Maskine', 'cardio',
  'Kondition med fokus på ryg, core og arme, og skånsomt for knæene.',
  ['Stå med let bøjede knæ, og tag fat i håndtagene over hovedet.', 'Træk begge arme ned og frem, mens du bøjer i hofter og knæ.', 'Lad armene løfte sig igen, og stræk kroppen op til næste træk.'],
  '5–20 min', 'Ingen', ['Brug core og lats, ikke kun armene.', 'Hold et jævnt tempo på RPE 5–6.']);
A('jumprope', 'Hoppetov', 'Kondition', ['Udholdenhed', 'Hurtighed', 'Balance'], 'Andet', 'cardio',
  'Rytme, lette fødder og kondition på kort tid.',
  ['Stå oprejst med albuerne ind mod kroppen.', 'Sving tovet fra håndleddene, og hop let på forfoden.', 'Hold hoppene små og rytmiske, og land blødt.'],
  '30–60 sek', '30 sek', ['Hop kun lige så højt, at tovet passerer.', 'Slap af i skuldrene.'], { secs: 30 });
A('stairs', 'Trappemaskine', 'Kondition', ['Udholdenhed', 'Styrke'], 'Maskine', 'cardio',
  'Kondition og benstyrke med lav stødbelastning.',
  ['Stå oprejst, og hold let på rækværket.', 'Træd op i et jævnt tempo, og brug hele foden.', 'Stå rank, og undgå at hænge tungt i håndtagene.'],
  '10–20 min', 'Ingen', ['Rank overkrop og blikket frem.', 'Sænk tempoet, hvis du begynder at hænge i armene.']);

/* --- Ben: squat-mønster --- */
A('goblet', 'Goblet squat', 'Styrke', ['Styrke', 'Core'], 'Kettlebell', 'squat',
  'Squat med vægt foran kroppen, der lærer dig at holde overkroppen rank.',
  ['Hold en kettlebell ind mod brystet med begge hænder.', 'Sæt dig ned mellem knæene, til lårene er vandrette, og brystet er oppe.', 'Pres op gennem hele foden, til du står rank.'],
  '10 reps', '60 sek', ['Albuerne peger ned mellem knæene.', 'Hælene bliver i gulvet.'], { log: true });
A('splitsquat', 'Split squat', 'Styrke', ['Styrke', 'Balance'], 'Ingen udstyr', 'squat',
  'Benstyrke og balance, uden at skulle bruge en bænk.',
  ['Stå i skridtstilling med et stort skridt mellem fødderne.', 'Sænk dig lige ned, til bageste knæ næsten rører gulvet.', 'Pres op gennem forreste hæl, uden at fødderne flytter sig.'],
  '8/ben', '45 sek', ['Overkroppen er lodret og midten spændt.', 'Forreste knæ følger tæerne.']);
A('walkinglunge', 'Gående udfald', 'Styrke', ['Styrke', 'Balance', 'Udholdenhed'], 'Ingen udstyr', 'squat',
  'Benstyrke og kontrol i bevægelse.',
  ['Stå oprejst med hænderne i siden eller foran brystet.', 'Tag et langt skridt frem, og sænk bageste knæ mod gulvet.', 'Pres dig op i næste skridt, og skift ben, mens du går fremad.'],
  '8/ben', '45 sek', ['Hold overkroppen rank.', 'Tag skridtet langt nok til, at forreste knæ ikke går forbi tæerne.']);
A('stepup', 'Step-up', 'Styrke', ['Styrke', 'Eksplosivitet', 'Balance'], 'Bænk/kasse', 'squat',
  'Enbens-styrke, der ligner et afsæt.',
  ['Stil dig foran en bænk eller kasse i knæhøjde.', 'Sæt det ene ben helt op, og pres dig op, til du står på bænken.', 'Sænk dig kontrolleret ned igen, og skift ben.'],
  '8/ben', '60 sek', ['Pres med forreste ben, ikke med bagerste.', 'Vil du have det eksplosivt, kan du tage et let hop i toppen.'], { log: true });
A('sumosquat', 'Sumo squat', 'Styrke', ['Styrke', 'Mobilitet'], 'Ingen udstyr', 'squat',
  'Styrke og bevægelighed i lysken og hofterne.',
  ['Stå med fødderne bredt og tæerne ud.', 'Sæt dig lige ned mellem benene, med knæene over tæerne.', 'Pres op gennem hælene, og stram ballerne i toppen.'],
  '12 reps', '30 sek', ['Knæene bliver ude over tæerne.', 'Hold brystet løftet.']);
A('wallsit', 'Vægsiddende', 'Styrke', ['Udholdenhed', 'Styrke'], 'Ingen udstyr', 'squat',
  'Udholdenhed i lårene, som du kan træne alle steder.',
  ['Læn ryggen mod en væg med fødderne et skridt frem.', 'Glid ned, til knæene er i 90 grader.', 'Hold positionen, og træk vejret roligt.'],
  '30–45 sek', '45 sek', ['Knæene over anklerne, ikke over tæerne.', 'Pres ryggen mod væggen.'], { secs: 30 });
A('frontsquat', 'Frontsquat', 'Styrke', ['Styrke', 'Core'], 'Stang', 'squat',
  'Tung benøvelse, der også udfordrer core og øvre ryg.',
  ['Hvil stangen på forsiden af skuldrene med albuerne højt.', 'Sæt dig ned, til lårene er vandrette, med oprejst overkrop.', 'Pres op gennem hælene, til du står rank.'],
  '6 reps', '90 sek', ['Albuerne højt hele vejen.', 'Start let, og lær teknikken først.'], { log: true });
A('legpress', 'Benpres', 'Styrke', ['Styrke'], 'Maskine', 'squat',
  'Tung benstyrke, hvor ryggen er støttet.',
  ['Sid med ryggen fladt mod puden og fødderne i skulderbredde.', 'Sænk vægten, til knæene er i ca. 90 grader.', 'Pres vægten op uden at låse knæene helt.'],
  '10 reps', '90 sek', ['Lænden må ikke løfte sig fra puden.', 'Knæene følger tæerne.'], { log: true });
A('singlesquat', 'Enbens squat til bænk', 'Styrke', ['Styrke', 'Balance'], 'Bænk/kasse', 'squat',
  'Meget stærke ben og balance på ét ben.',
  ['Stå på ét ben foran en bænk, og hold det andet ben frem.', 'Sæt dig langsomt ned på bænken uden at miste balancen.', 'Rejs dig op på samme ben uden at bruge hænderne.'],
  '5/ben', '60 sek', ['Langsomt ned, kontrolleret.', 'Brug en højere bænk, hvis det er for hårdt.']);

/* --- Ben: hofte-mønster --- */
A('hipthrust', 'Hip thrust', 'Styrke', ['Styrke', 'Eksplosivitet'], 'Bænk/kasse', 'hinge',
  'Stærke baller, der giver kraft i afsæt og sprint.',
  ['Læn øverste ryg mod en bænk med bøjede knæ og fødderne fladt.', 'Pres hoften op, til krop og lår danner en lige linje.', 'Hold et sekund i toppen, og sænk kontrolleret.'],
  '10 reps', '60 sek', ['Hagen ind mod brystet, og blikket frem.', 'Pres med hælene, og spænd ballerne.'], { log: true });
A('slrdl', 'Enbens RDL', 'Styrke', ['Styrke', 'Balance', 'Skadesforebyggelse'], 'Håndvægte', 'hinge',
  'Stærke baglår og baller, og balance på ét ben.',
  ['Stå på ét ben med en let vægt i modsatte hånd.', 'Læn overkroppen frem, mens det frie ben løftes bagud.', 'Stram ballen, og rejs dig tilbage til start.'],
  '6/ben', '60 sek', ['Hoften peger mod gulvet, ikke ud til siden.', 'Fokusér på et punkt foran dig for at holde balancen.'], { log: true });
A('kbswing', 'Kettlebell swing', 'Eksplosiv', ['Eksplosivitet', 'Styrke', 'Udholdenhed'], 'Kettlebell', 'hinge',
  'Eksplosiv hofteudstrækning, der træner kraft og kondition på samme tid.',
  ['Stå med fødderne i skulderbredde og kettlebellen foran dig.', 'Skub hoften bagud, og sving kettlebellen mellem benene.', 'Skub hoften kraftigt frem, så kettlebellen svinger op til brysthøjde.'],
  '12 reps', '60 sek', ['Kraften kommer fra hofterne, ikke armene.', 'Ryggen er lige hele tiden.'], { log: true });
A('slbridge', 'Glute bridge på ét ben', 'Styrke', ['Styrke', 'Balance'], 'Ingen udstyr', 'hinge',
  'Stærke baller og kontrol i hoften, uden udstyr.',
  ['Lig på ryggen med det ene ben strakt i luften.', 'Pres hælen på standbenet ned, og løft hoften.', 'Hold et sekund, og sænk kontrolleret.'],
  '8/ben', '30 sek', ['Hoften forbliver vandret.', 'Spænd ballen, ikke lænden.']);
A('nordic', 'Nordic hamstring curl', 'Styrke', ['Styrke', 'Skadesforebyggelse'], 'Ingen udstyr', 'hinge',
  'Stærke baglår, der beskytter mod forstrækninger i spurt og udspark.',
  ['Knæl på en blød måtte, og få en makker eller et fast anker til at holde dine ankler.', 'Sænk overkroppen langsomt fremad med lige linje fra knæ til hoved.', 'Grib gulvet med hænderne, og skub dig tilbage til start.'],
  '4–6 reps', '90 sek', ['Det vigtigste er den langsomme nedadgående del.', 'Start med få gentagelser. Det giver ømme baglår.'], { hard: true, home: false });
A('hamwalk', 'Baglårs-walkout', 'Styrke', ['Styrke', 'Skadesforebyggelse'], 'Andet', 'hinge',
  'Skånsom baglårsøvelse på gulvet med glidere eller et håndklæde.',
  ['Lig på ryggen med hælene på glidere eller håndklæder, og løft hoften.', 'Glid fødderne langsomt ud, mens hoften holdes oppe.', 'Træk hælene tilbage mod ballerne.'],
  '8 reps', '45 sek', ['Hoften må ikke synke.', 'Tag kortere skridt, hvis det er for hårdt.']);
A('dbrdl', 'RDL med håndvægte', 'Styrke', ['Styrke', 'Skadesforebyggelse'], 'Håndvægte', 'hinge',
  'Stærk bagside af lår, baller og ryg, hvis der ikke er en stang.',
  ['Stå med en håndvægt i hver hånd foran lårene.', 'Skub hoften bagud, og lad vægtene glide langs benene.', 'Pres hoften frem, og rejs dig.'],
  '10 reps', '60 sek', ['Ryggen er lige hele tiden.', 'Hold vægtene tæt på kroppen.'], { log: true });

/* --- Skub --- */
A('kneepushup', 'Armstrækninger på knæ', 'Styrke', ['Styrke'], 'Ingen udstyr', 'push',
  'Lettere version af armstrækninger, når du skal bygge op.',
  ['Knæene i gulvet, hænderne lidt bredere end skuldrene.', 'Sænk brystet mod gulvet med albuerne skråt ud.', 'Pres dig op, til armene er strakte.'],
  '10 reps', '30 sek', ['Kroppen er en lige linje fra knæ til hoved.', 'Gå videre til almindelige, når du kan lave 12.']);
A('diamondpush', 'Diamant-armstrækninger', 'Styrke', ['Styrke'], 'Ingen udstyr', 'push',
  'Armstrækninger med fokus på triceps.',
  ['Placér hænderne tæt sammen under brystet, så tommel og pegefinger danner en diamant.', 'Sænk brystet mod hænderne med albuerne tæt ind.', 'Pres dig op.'],
  '8 reps', '45 sek', ['Fokus på triceps.', 'Lav dem på knæ, hvis det er for tungt.']);
A('dbpress', 'Skulderpres med håndvægte', 'Styrke', ['Styrke'], 'Håndvægte', 'push',
  'Stærke skuldre til udkast og høje bolde.',
  ['Sid eller stå med håndvægte i skulderhøjde.', 'Pres vægtene lige op over hovedet, til armene er strakte.', 'Sænk kontrolleret tilbage til skuldrene.'],
  '8 reps', '75 sek', ['Spænd mave og baller, så lænden ikke svajer.', 'Albuerne er lidt foran kroppen.'], { log: true });
A('dbbench', 'Bænkpres med håndvægte', 'Styrke', ['Styrke'], 'Håndvægte', 'push',
  'Stærkt bryst, skuldre og arme.',
  ['Lig på en bænk med en håndvægt i hver hånd over brystet.', 'Sænk vægtene ned langs siden af brystet, til albuerne er i 90 grader.', 'Pres vægtene op, til armene er strakte.'],
  '8 reps', '90 sek', ['Skulderbladene er samlet og ned i bænken.', 'Albuerne ca. 45 grader ud fra kroppen.'], { log: true });
A('pikepush', 'Pike push-up', 'Styrke', ['Styrke'], 'Ingen udstyr', 'push',
  'Skulderstyrke uden udstyr.',
  ['Kom op i en omvendt V-stilling med hoften højt.', 'Sænk hovedet mod gulvet mellem hænderne.', 'Pres dig op, til armene er strakte.'],
  '6–8 reps', '45 sek', ['Jo højere hofte, jo mere skulder.', 'Hold hovedet mellem armene.']);
A('clappush', 'Eksplosive armstrækninger', 'Eksplosiv', ['Eksplosivitet', 'Styrke'], 'Ingen udstyr', 'push',
  'Hurtig kraft i bryst og arme, som ved et hurtigt udkast.',
  ['Start i armstrækningsposition med spændt core.', 'Sænk kontrolleret, og pres eksplosivt op, så hænderne forlader gulvet.', 'Land blødt med let bøjede albuer.'],
  '5 reps', '60 sek', ['Gør det kun, hvis almindelige armstrækninger er lette.', 'Kvalitet frem for antal.'], { hard: true });

/* --- Træk --- */
A('dbrow', 'Håndvægtsroning', 'Styrke', ['Styrke', 'Skadesforebyggelse'], 'Håndvægte', 'pull',
  'Stærk ryg og stabile skuldre.',
  ['Støt den ene hånd og det ene knæ på en bænk, og hold en håndvægt i den anden hånd.', 'Træk håndvægten op mod hoften, med albuen tæt på kroppen.', 'Sænk kontrolleret, og skift side.'],
  '8/side', '60 sek', ['Ryggen er vandret og ret.', 'Træk albuen mod loftet.'], { log: true });
A('invrow', 'Inverteret roning', 'Styrke', ['Styrke'], 'Stang', 'pull',
  'Stærk ryg, hvor du bruger din egen kropsvægt.',
  ['Lig under en stang i hoftehøjde, og grib den med strakte arme.', 'Træk brystet op mod stangen, med kroppen som en lige planke.', 'Sænk dig kontrolleret ned.'],
  '8 reps', '60 sek', ['Bøj knæene for at gøre det lettere.', 'Skulderbladene samles øverst.']);
A('pullup', 'Pull-ups', 'Styrke', ['Styrke'], 'Stang', 'pull',
  'Stærk ryg og stærke arme, som er vigtige til at gribe og trække.',
  ['Hæng i en stang med et greb lidt bredere end skuldrene.', 'Træk dig op, til hagen er over stangen.', 'Sænk kontrolleret til strakte arme.'],
  '4–6 reps', '90 sek', ['Start med at trække skulderbladene ned.', 'Brug elastik eller maskine til hjælp, hvis du ikke kan endnu.'], { log: true });
A('bandpull', 'Pull-apart med elastik', 'Styrke', ['Skadesforebyggelse', 'Styrke'], 'Elastik', 'pull',
  'Aktiverer skuldre og øvre ryg, som ofte bliver stive.',
  ['Hold en elastik foran dig i skulderhøjde med strakte arme.', 'Træk elastikken fra hinanden, til den rører brystet.', 'Før langsomt tilbage.'],
  '15 reps', '30 sek', ['Skuldrene ned, ikke op mod ørerne.', 'Tag en tykkere elastik, hvis det er for let.']);
A('cablerow', 'Siddende kabelroning', 'Styrke', ['Styrke'], 'Kabel', 'pull',
  'Stærk ryg og skulderblade.',
  ['Sid med let bøjede knæ, og tag fat i håndtaget.', 'Træk håndtaget ind mod maven, og saml skulderbladene.', 'Før kontrolleret tilbage med strakte arme.'],
  '10 reps', '75 sek', ['Overkroppen er ret og stille.', 'Albuerne tæt på kroppen.'], { log: true });
A('facepull', 'Face pull', 'Styrke', ['Skadesforebyggelse', 'Styrke'], 'Kabel', 'pull',
  'Sunde skuldre, når du kaster og griber meget.',
  ['Stil kablet i ansigtshøjde med et rebhåndtag.', 'Træk rebet mod ansigtet, med albuerne højt og udad.', 'Før langsomt tilbage.'],
  '12 reps', '45 sek', ['Brug en let vægt.', 'Træk håndtaget helt ind til ansigtet.'], { log: true });
A('superman', 'Superman', 'Core', ['Core', 'Styrke', 'Skadesforebyggelse'], 'Ingen udstyr', 'pull',
  'Stærk nedre ryg og baller.',
  ['Lig på maven med armene strakt frem.', 'Løft arme og ben samtidig få centimeter fra gulvet.', 'Hold et sekund, og sænk roligt.'],
  '10 reps', '30 sek', ['Kig ned i gulvet, så nakken er neutral.', 'Spænd ballerne.']);

/* --- Core --- */
A('hollow', 'Hollow hold', 'Core', ['Core'], 'Ingen udstyr', 'core',
  'Stærk, stram mave og kontrol i hele kroppen.',
  ['Lig på ryggen med armene strakt over hovedet.', 'Løft skuldre og ben få centimeter fra gulvet, og pres lænden ned.', 'Hold positionen, og træk vejret roligt.'],
  '20 sek', '30 sek', ['Lænden skal være presset ned i gulvet.', 'Bøj knæene, hvis det er for hårdt.'], { secs: 20 });
A('mtnclimber', 'Mountain climbers', 'Core', ['Core', 'Udholdenhed', 'Hurtighed'], 'Ingen udstyr', 'core',
  'Stram core og høj puls på samme tid.',
  ['Start i armstrækningsposition med strakte arme.', 'Træk knæene skiftevis hurtigt op mod brystet.', 'Hold hoften nede og kroppen stram.'],
  '20 sek', '30 sek', ['Hænderne er direkte under skuldrene.', 'Hold et jævnt tempo.'], { secs: 20, hard: true });
A('russiantwist', 'Russian twist', 'Core', ['Core'], 'Ingen udstyr', 'core',
  'Stærke skrå mavemuskler og rotation.',
  ['Sid med bøjede knæ, og læn overkroppen let tilbage.', 'Drej overkroppen fra side til side, og rør gulvet ved hver side.', 'Hold brystet oppe og ryggen ret.'],
  '10/side', '30 sek', ['Drej fra brystkassen, ikke kun armene.', 'Løft fødderne for at gøre det sværere.']);
A('legraise', 'Liggende benløft', 'Core', ['Core'], 'Ingen udstyr', 'core',
  'Stærk nedre mave.',
  ['Lig på ryggen med benene strakte og hænderne under ballerne.', 'Løft benene til lodret, uden at lænden løfter sig.', 'Sænk langsomt, uden at fødderne rører gulvet.'],
  '8 reps', '30 sek', ['Bøj knæene let, hvis lænden løfter sig.', 'Langsomt ned er det vigtigste.']);
A('bicycle', 'Cykelcrunch', 'Core', ['Core'], 'Ingen udstyr', 'core',
  'Mave og skrå mavemuskler i en kontrolleret bevægelse.',
  ['Lig på ryggen med hænderne ved tindingerne.', 'Træk modsat albue og knæ mod hinanden, mens det andet ben strækkes ud.', 'Skift side i et roligt, kontrolleret tempo.'],
  '10/side', '30 sek', ['Træk ikke i nakken.', 'Roligt og kontrolleret, ikke hurtigt.']);
A('abwheel', 'Mavehjul', 'Core', ['Core', 'Styrke'], 'Andet', 'core',
  'Meget stærk core, som modstår at svaje i lænden.',
  ['Knæl med mavehjulet foran dig, og hold ryggen let rundet.', 'Rul langsomt frem, så langt du kan kontrollere.', 'Træk dig tilbage med maven.'],
  '6 reps', '60 sek', ['Start med korte stræk.', 'Stop, hvis lænden svajer.'], { hard: true });
A('copenhagen', 'Copenhagen plank', 'Core', ['Core', 'Skadesforebyggelse'], 'Bænk/kasse', 'core',
  'Stærke adduktorer og hofte, som beskytter lysken ved sidebevægelser.',
  ['Lig på siden med øverste ben på en bænk og albuen under skulderen.', 'Løft hoften, så kroppen er en lige linje.', 'Hold positionen, og skift side.'],
  '20 sek/side', '45 sek', ['Start med knæet på bænken, hvis det er for hårdt.', 'Hoften må ikke synke.'], { secs: 20, perSide: true, hard: true });
A('bandpallof', 'Pallof press med elastik', 'Core', ['Core', 'Skadesforebyggelse'], 'Elastik', 'core',
  'Samme øvelse som Pallof press, bare med elastik.',
  ['Fastgør elastikken i sidehøjde, og stå sidelæns med håndtaget ind mod brystet.', 'Pres armene lige frem, til de er strakte.', 'Hold 1 sekund uden at dreje, og før tilbage.'],
  '10/side', '30 sek', ['Hofter og skuldre peger frem.', 'Træd længere væk for mere modstand.']);
A('woodchop', 'Kabel-woodchop', 'Core', ['Core', 'Eksplosivitet'], 'Kabel', 'core',
  'Kraft i rotation, som i et kast eller en udsparkning.',
  ['Stå sidelæns til kablet i højeste position med begge hænder på håndtaget.', 'Træk håndtaget diagonalt ned over kroppen, mens du drejer.', 'Før kontrolleret tilbage.'],
  '10/side', '45 sek', ['Drej fra hofte og krop, ikke kun armene.', 'Fødderne drejer med.'], { log: true });
A('plankreach', 'Planke med skuldertryk', 'Core', ['Core', 'Balance'], 'Ingen udstyr', 'core',
  'Stabil core, mens kroppen bevæger sig.',
  ['Start i armstrækningsposition med fødderne lidt bredere end hoften.', 'Rør skiftevis modsat skulder med en hånd.', 'Hold hoften helt stille.'],
  '10/side', '30 sek', ['Bred fodstilling gør det lettere.', 'Hoften må ikke vippe.']);

/* --- Bæreøvelser --- */
A('suitcase', 'Suitcase carry', 'Core', ['Core', 'Styrke', 'Balance'], 'Kettlebell', 'carry',
  'Stabil overkrop under ensidig belastning.',
  ['Tag en tung vægt i én hånd ved siden af kroppen.', 'Gå rank med korte, rolige skridt uden at læne dig mod siden.', 'Sæt vægten ned, og skift hånd.'],
  '30 m/side', '60 sek', ['Skuldrene er i samme højde.', 'Spænd maven, som om nogen skulle slå dig.'], { log: true });
A('ohcarry', 'Overhead carry', 'Core', ['Core', 'Styrke', 'Balance'], 'Kettlebell', 'carry',
  'Stabile skuldre og core med en vægt over hovedet.',
  ['Pres en kettlebell eller håndvægt lige op over hovedet med strakt arm.', 'Gå rank med korte skridt, mens armen holdes lodret.', 'Sæt vægten kontrolleret ned, og skift arm.'],
  '20 m/side', '60 sek', ['Håndled og albue er i en lige linje.', 'Ribbenene ned.'], { log: true });
A('bearcrawl', 'Bear crawl', 'Core', ['Core', 'Udholdenhed', 'Hurtighed'], 'Ingen udstyr', 'carry',
  'Core, skuldre og kondition i en bevægelse.',
  ['Kom på alle fire med knæene let over gulvet.', 'Kryb frem med modsat hånd og fod.', 'Hold ryggen vandret og hoften lav.'],
  '10 m', '45 sek', ['Hold knæene så lave som muligt.', 'Små skridt og rolig kontrol.'], { hard: true });

/* --- Eksplosive spring og kast --- */
A('skater', 'Skater hop', 'Eksplosiv', ['Eksplosivitet', 'Balance', 'Hurtighed'], 'Ingen udstyr', 'plyo',
  'Eksplosiv sidebevægelse med kontrol i landingen.',
  ['Stå på ét ben med let bøjet knæ.', 'Hop sidelæns til det andet ben, og sving armene med.', 'Land blødt, og hold balancen et øjeblik.'],
  '6/side', '45 sek', ['Land på forfoden.', 'Knæet følger tæerne.']);
A('boxjump', 'Box jump', 'Eksplosiv', ['Eksplosivitet', 'Styrke'], 'Bænk/kasse', 'plyo',
  'Lodret kraft til høje bolde.',
  ['Stå foran en stabil kasse med fødderne i hoftebredde.', 'Sæt dig let ned, og hop eksplosivt op på kassen.', 'Land blødt med bøjede knæ, og stig ned i stedet for at hoppe ned.'],
  '5 reps', '60 sek', ['Vælg en højde, du kan lande sikkert på.', 'Gå ned i stedet for at hoppe ned.']);
A('broadjump', 'Længdespring', 'Eksplosiv', ['Eksplosivitet', 'Styrke'], 'Ingen udstyr', 'plyo',
  'Eksplosiv kraft fremad, som i et dyk.',
  ['Stå med fødderne i hoftebredde og armene bag kroppen.', 'Sving armene frem, og hop så langt som muligt.', 'Land blødt i en squat, og stå stille et øjeblik.'],
  '5 reps', '60 sek', ['Lav en lille pause mellem hvert hop.', 'Land med hoften bagud.']);
A('tuckjump', 'Tuck jumps', 'Eksplosiv', ['Eksplosivitet', 'Udholdenhed'], 'Ingen udstyr', 'plyo',
  'Eksplosive spring, der også hæver pulsen.',
  ['Stå med fødderne i hoftebredde.', 'Hop eksplosivt op, og træk knæene op mod brystet.', 'Land blødt, og hop igen.'],
  '5 reps', '60 sek', ['Fokus på højde, ikke tempo.', 'Land stille.'], { hard: true });
A('pogo', 'Pogo-hop', 'Eksplosiv', ['Eksplosivitet', 'Skadesforebyggelse', 'Hurtighed'], 'Ingen udstyr', 'plyo',
  'Stive, stærke ankler og læg til hurtige afsæt.',
  ['Stå oprejst med let bøjede knæ.', 'Hop op og ned på forfoden med næsten strakte ben og kort kontakttid.', 'Hold kroppen stram og rolig.'],
  '15 sek', '45 sek', ['Tænk: som en fjeder.', 'Hælene rører ikke gulvet.'], { secs: 15 });
A('medslam', 'Medicinbold-slam', 'Eksplosiv', ['Eksplosivitet', 'Core', 'Udholdenhed'], 'Medicinbold', 'plyo',
  'Eksplosiv kraft fra hele kroppen.',
  ['Hold en medicinbold over hovedet med strakte arme.', 'Smid bolden hårdt i gulvet foran dig, mens du bøjer i hoften.', 'Saml bolden op, og gentag.'],
  '8 reps', '60 sek', ['Brug hele kroppen.', 'Brug en blød bold, der ikke preller.']);
A('medthrow', 'Medicinbold-kast mod væg', 'Eksplosiv', ['Eksplosivitet', 'Styrke', 'Hurtighed'], 'Medicinbold', 'plyo',
  'Hurtig kraft i bryst og arme, som i et udkast.',
  ['Stå foran en væg, og hold bolden ved brystet.', 'Kast bolden eksplosivt mod væggen, og grib den igen.', 'Gentag hurtigt og uden at miste kontrollen.'],
  '8 reps', '60 sek', ['Pres fra hele kroppen.', 'Kast med begge hænder samtidig.']);
A('burpee', 'Burpees', 'Kondition', ['Udholdenhed', 'Eksplosivitet'], 'Ingen udstyr', 'plyo',
  'Høj puls og eksplosiv kraft i en øvelse.',
  ['Stå oprejst, og sæt hænderne i gulvet.', 'Hop fødderne tilbage til planke, lav en armstrækning, og hop fødderne ind igen.', 'Hop eksplosivt op med armene over hovedet.'],
  '6 reps', '60 sek', ['Hold et jævnt tempo.', 'Spring armstrækningen over, hvis det er for hårdt.'], { hard: true });
A('slhop', 'Enbens-hop frem', 'Eksplosiv', ['Eksplosivitet', 'Balance'], 'Ingen udstyr', 'plyo',
  'Eksplosiv enbens-kraft med kontrol i landingen.',
  ['Stå på ét ben med let bøjet knæ.', 'Hop frem på samme ben, og land blødt.', 'Hold balancen i et sekund, og gentag.'],
  '5/ben', '45 sek', ['Knæet følger tæerne.', 'Start med korte hop.']);

/* --- Læg og ankler --- */
A('slcalf', 'Calf raise på ét ben', 'Styrke', ['Styrke', 'Balance', 'Skadesforebyggelse'], 'Ingen udstyr', 'calf',
  'Stærke læg og ankler, ét ben ad gangen.',
  ['Stå på ét ben med let støtte mod en væg.', 'Pres op på tæerne, så højt du kan.', 'Sænk langsomt på 2 sekunder.'],
  '10/ben', '30 sek', ['Hold et kort stop i toppen.', 'Rolig bevægelse, ingen vippen.']);
A('tibraise', 'Tibialis raise', 'Styrke', ['Skadesforebyggelse', 'Styrke'], 'Ingen udstyr', 'calf',
  'Stærke skinneben, der beskytter mod stød og forkert landing.',
  ['Stå med ryggen mod en væg og fødderne et skridt frem.', 'Løft forfoden og tæerne op mod skinnebenet.', 'Sænk langsomt tilbage.'],
  '15 reps', '30 sek', ['Hælene bliver i gulvet.', 'Langsomt og kontrolleret.']);
A('stepcalf', 'Calf raise på trin', 'Styrke', ['Styrke', 'Skadesforebyggelse'], 'Bænk/kasse', 'calf',
  'Stærke læg med fuldt bevægeudslag.',
  ['Stå med forfoden på kanten af et trin og hælene frit.', 'Pres op på tæerne, så højt du kan.', 'Sænk hælene under trinnet, og stræk læggen.'],
  '12 reps', '45 sek', ['Fuldt bevægeudslag giver stærkere ankler.', 'Hold let fast i noget.']);

/* --- Hurtige fødder og bevægelse --- */
A('carioca', 'Carioca', 'Bevægelse', ['Hurtighed', 'Mobilitet', 'Balance'], 'Ingen udstyr', 'agility',
  'Koordination og hurtige sidestep.',
  ['Stå sidelæns med let bøjede knæ.', 'Kryds det bagerste ben foran og bag det forreste i et hurtigt tempo.', 'Hold overkroppen fremad og hofterne drejende.'],
  '20 sek', '30 sek', ['Skift retning efter halvdelen af tiden.', 'Find rytmen, før du sætter tempoet op.'], { secs: 20 });
A('ladder', 'Stigeøvelse: ind-ud', 'Bevægelse', ['Hurtighed', 'Balance'], 'Andet', 'agility',
  'Hurtige, lette fødder.',
  ['Stil en koordinationsstige ud, eller tegn felter på jorden.', 'Løb frem med to fødder i hvert felt og ud på siden.', 'Hold korte, lette skridt med blikket op.'],
  '20 sek', '30 sek', ['Fødderne rører næsten ikke gulvet.', 'Blikket er frem, ikke ned.'], { secs: 20 });
A('tdrill', 'T-drill', 'Bevægelse', ['Hurtighed', 'Udholdenhed'], 'Andet', 'agility',
  'Skift af retning med hurtige fødder.',
  ['Sæt fire kegler i et T-mønster, 5 m frem og 2,5 m til siderne.', 'Sprint frem, sidestep til siden, tilbage over midten og til den anden side.', 'Gå roligt tilbage til start.'],
  '3 gange', '60 sek', ['Hold lav stilling i vendingerne.', 'Sidestep uden at krydse benene.']);
A('sprint5', 'Korte sprint-starter', 'Eksplosiv', ['Hurtighed', 'Eksplosivitet'], 'Ingen udstyr', 'agility',
  'Hurtigt første skridt, som i en udrykning.',
  ['Stå i klarposition med let bøjede knæ.', 'Sprint 5–10 meter så hurtigt du kan.', 'Gå roligt tilbage.'],
  '5 gange', '45 sek', ['Første skridt er det vigtigste.', 'Skub fra med forfoden.']);
A('diveget', 'Dyk og rejs dig', 'Bevægelse', ['Eksplosivitet', 'Hurtighed'], 'Andet', 'agility',
  'Tæt på en rigtig redning: dyk til siden og kom hurtigt op.',
  ['Stå i klarposition på en blød måtte eller blødt underlag.', 'Dyk til siden med strakte arme, og land på siden af kroppen.', 'Kom op så hurtigt du kan, og vend tilbage til klarposition.'],
  '4/side', '45 sek', ['Land på siden af kroppen, ikke på albuen.', 'Brug blødt underlag som græs eller en måtte.']);
A('latbandwalk', 'Sidegang med elastik', 'Styrke', ['Skadesforebyggelse', 'Styrke', 'Balance'], 'Elastik', 'agility',
  'Stærke hofter og balder, der holder knæene stabile.',
  ['Sæt en elastik om anklerne eller over knæene.', 'Gå sidelæns i en let squat, og hold spænding i elastikken.', 'Tag 10 skridt til hver side.'],
  '10 skridt/side', '30 sek', ['Knæene presses ud, ikke ind.', 'Fødderne er ikke tættere end hoftebredde.']);

/* --- Mobilitet --- */
A('cossack', 'Cossack squat', 'Mobilitet', ['Mobilitet', 'Styrke', 'Balance'], 'Ingen udstyr', 'mobility',
  'Bevægelighed i lysken og hofterne, og styrke på ét ben ad gangen.',
  ['Stå med fødderne bredt og tæerne let udad.', 'Skub hoften til den ene side, og sænk dig ned på det bøjede ben, mens det andet ben er strakt.', 'Pres tilbage til midten, og skift side.'],
  '5/side', '30 sek', ['Hælen på det bøjede ben bliver i gulvet.', 'Lav en mindre bevægelse, hvis det spænder.']);
A('hips9090', '90/90 hofterotation', 'Mobilitet', ['Mobilitet', 'Skadesforebyggelse'], 'Ingen udstyr', 'mobility',
  'Bedre rotation i hofterne.',
  ['Sid på gulvet med begge ben bøjet 90 grader, det ene foran og det andet bag.', 'Hold ryggen ret, og læn dig frem over forreste ben.', 'Skift side ved at rotere begge knæ over.'],
  '30 sek/side', 'Ingen', ['Sid på en pude, hvis det er for stramt.', 'Træk vejret roligt og ud i strækket.'], { secs: 30, perSide: true });
A('wgs', 'Verdens bedste udstrækning', 'Mobilitet', ['Mobilitet'], 'Ingen udstyr', 'mobility',
  'Åbner hofter, baglår og ryg i én flydende bevægelse.',
  ['Tag et langt skridt frem i udfald, med hænderne i gulvet.', 'Drej overkroppen op mod forreste ben, og løft armen mod loftet.', 'Før hånden ned, og skift ben.'],
  '5/side', 'Ingen', ['Hold bageste knæ løftet.', 'Følg hånden med øjnene.']);
A('catcow', 'Kat-ko', 'Mobilitet', ['Mobilitet', 'Skadesforebyggelse'], 'Ingen udstyr', 'mobility',
  'Mobil og afslappet ryg.',
  ['Kom på alle fire med hænder under skuldre og knæ under hofter.', 'Rund ryggen mod loftet, og træk maven ind.', 'Svaj ryggen, og løft brystet.'],
  '8 reps', 'Ingen', ['Bevæg dig i takt med vejrtrækningen.', 'Langsomt og jævnt.']);
A('openbook', 'Åben bog (brystryg)', 'Mobilitet', ['Mobilitet'], 'Ingen udstyr', 'mobility',
  'Bevægelighed i brystryggen, som giver bedre kast og dyk.',
  ['Lig på siden med knæene bøjet og armene strakt frem.', 'Åbn øverste arm i en bue bagud, og følg den med blikket.', 'Før armen tilbage, og skift side.'],
  '8/side', 'Ingen', ['Knæene bliver sammen.', 'Pust ud, mens du åbner.']);
A('hipflexor', 'Hoftebøjer-udstrækning', 'Mobilitet', ['Mobilitet', 'Skadesforebyggelse'], 'Ingen udstyr', 'mobility',
  'Løsner stramme hoftebøjere efter lange dage og kampe.',
  ['Knæl på det ene knæ med det andet ben fremme, og vægten fremad.', 'Stram ballen på bageste side, og skub hoften let frem.', 'Hold, og træk vejret roligt. Skift så side.'],
  '30 sek/side', 'Ingen', ['Ryggen er lige, ikke svajet.', 'Stram ballen for at få mere stræk.'], { secs: 30, perSide: true });
A('anklemob', 'Ankel-mobilitet', 'Mobilitet', ['Mobilitet', 'Skadesforebyggelse'], 'Ingen udstyr', 'mobility',
  'Bedre bevægelighed i anklerne, så du kan komme dybere.',
  ['Stå i skridtstilling foran en væg med forreste fod få centimeter fra væggen.', 'Skub knæet frem mod væggen, uden at hælen løfter sig.', 'Før knæet tilbage, og gentag.'],
  '10/side', 'Ingen', ['Hælen bliver i gulvet.', 'Flyt foden længere væk, når det bliver let.']);
A('deepsquat', 'Dyb squat-hold', 'Mobilitet', ['Mobilitet'], 'Ingen udstyr', 'mobility',
  'Åbner hofter og ankler.',
  ['Stå med fødderne lidt bredere end skuldrene og tæerne ud.', 'Sæt dig helt ned med hænderne foran brystet.', 'Hold, og skub knæene ud med albuerne.'],
  '30 sek', 'Ingen', ['Hold fast i en dørkarm, hvis det er svært.', 'Brystet er oppe.'], { secs: 30 });
A('shoulderband', 'Skulder-dislocates', 'Mobilitet', ['Mobilitet', 'Skadesforebyggelse'], 'Elastik', 'mobility',
  'Åbner skuldrene efter udkast og dyk.',
  ['Hold en elastik eller kæp foran lårene med bredt greb.', 'Før armene i en bue over hovedet og ned bag ryggen.', 'Før tilbage på samme måde.'],
  '10 reps', 'Ingen', ['Grib bredere, hvis det spænder.', 'Hold armene strakte.']);

/* --- Fokus --- */
A('wallball', 'Bold mod væg (hånd-øje)', 'Fokus', ['Fokus', 'Hurtighed'], 'Bold', 'focus',
  'Hånd-øje-koordination og skarpt blik.',
  ['Stå to meter fra en væg med en tennisbold.', 'Kast bolden mod væggen, og grib den med den modsatte hånd.', 'Skift hånd og tempo, og hold blikket på bolden.'],
  '30 sek', '30 sek', ['Gør kastene mere uforudsigelige.', 'Hold hovedet roligt.'], { secs: 30 });
A('dropcatch', 'Reaktionsbold (drop)', 'Fokus', ['Fokus', 'Hurtighed', 'Eksplosivitet'], 'Bold', 'focus',
  'Hurtig reaktion på noget uventet.',
  ['En makker holder en bold i skulderhøjde og slipper den uden varsel.', 'Reagér og grib bolden, før den rammer jorden to gange.', 'Gentag, og skift hånd.'],
  '10 forsøg', '30 sek', ['Start i klarposition.', 'Grib bolden med begge hænder.']);
A('visual', 'Visualisering', 'Fokus', ['Fokus'], 'Ingen udstyr', 'focus',
  'Mental forberedelse til kampen.',
  ['Sæt dig roligt, og luk øjnene.', 'Se dig selv klare typiske situationer: indlæg, 1-mod-1 og udspark.', 'Mærk roen og selvtilliden, og åbn øjnene.'],
  '60 sek', 'Ingen', ['Brug den inden kamp.', 'Se, hør og mærk situationen.'], { secs: 60 });

/* ===== Fodbold: fart, retningsskift og målmand =====
   illu = lån tegningen fra en øvelse med samme bevægelse */
A('wallaccel', 'Væg-acceleration', 'Eksplosiv', ['Hurtighed', 'Eksplosivitet'], 'Ingen udstyr', 'agility',
  'Lærer kroppen den fremadlænede stilling og de kraftige knæløft i de første skridt.',
  ['Stå en armlængde fra en væg, og læn dig frem med hænderne mod væggen, så kroppen er en lige linje.', 'Løft det ene knæ op foran hoften med foden trukket op.', 'Skift ben hurtigt på signal: ét, to eller tre skift ad gangen.'],
  '3 × 5 skift', '45 sek', ['Kroppen er en lige linje fra hæl til hoved.', 'Skub gulvet bagud under dig.'], { illu: 'sprint5' });
A('askip', 'A-skip', 'Bevægelse', ['Hurtighed', 'Mobilitet'], 'Ingen udstyr', 'agility',
  'Løbeteknik: aktivt knæløft og hurtig fodisætning under kroppen.',
  ['Kom i gang med et let skip på forfoden.', 'Løft knæet til hoftehøjde, og træk foden aktivt ned under kroppen.', 'Hold armene i takt med benene i 15–20 meter.'],
  '2 × 20 m', '30 sek', ['Foden lander under hoften, ikke foran.', 'Rank krop og afslappede skuldre.'], { illu: 'fastfeet' });
A('flysprint', 'Flyvende sprint', 'Eksplosiv', ['Hurtighed'], 'Ingen udstyr', 'agility',
  'Topfart: byg farten roligt op, og løb de sidste 10–20 meter så hurtigt du kan.',
  ['Sæt kegler op: 20 m tilløb og 10–20 m fartzone.', 'Byg farten gradvist op gennem tilløbet.', 'Løb maksimalt gennem fartzonen, og slap gradvist af bagefter.'],
  '4 × 20 m', '2–3 min', ['Fuld pause mellem løbene. Det er fart, ikke kondition.', 'Afslappet ansigt og skuldre giver mere fart.'], { illu: 'sprint5', hard: true });
A('decel', 'Sprint og stop', 'Bevægelse', ['Hurtighed', 'Skadesforebyggelse', 'Balance'], 'Ingen udstyr', 'agility',
  'Brems hurtigt og kontrolleret. Beskytter knæ og baglår og gør retningsskift hurtigere.',
  ['Løb frem 5–10 meter i høj fart.', 'Brems på 2–3 korte skridt med lav hofte og bøjede knæ.', 'Stå stille i balance i 2 sekunder, før du går tilbage.'],
  '5 gange', '45 sek', ['Knæene peger over tæerne, ikke indad.', 'Sænk hoften, når du bremser.'], { illu: 'sprint5' });
A('cod505', '5-0-5 vending', 'Eksplosiv', ['Hurtighed', 'Eksplosivitet'], 'Andet', 'agility',
  'Hurtig vending på 180 grader, som når du skal tilbage på stregen.',
  ['Sæt to kegler 5 meter fra hinanden.', 'Sprint til keglen, plant foden, og vend 180 grader.', 'Sprint tilbage forbi startkeglen.'],
  '3/side', '60 sek', ['Vend til begge sider.', 'Sænk hoften før vendingen.'], { illu: 'tdrill', hard: true });
A('mirror', 'Spejl-drill med makker', 'Bevægelse', ['Hurtighed', 'Fokus'], 'Ingen udstyr', 'agility',
  'Reaktion og fodarbejde: følg en makker sidelæns og frem og tilbage.',
  ['Stå over for en makker 2–3 meter fra hinanden i klarposition.', 'Makkeren bevæger sig sidelæns, frem og tilbage uden varsel.', 'Følg med, og hold afstanden og klarpositionen hele tiden.'],
  '15 sek', '45 sek', ['Fødderne må ikke krydse.', 'Se på makkerens hofter, ikke fødderne.'], { illu: 'shuffle', secs: 15 });
A('fifa11', 'FIFA 11+ løbedel', 'Bevægelse', ['Skadesforebyggelse', 'Mobilitet', 'Hurtighed'], 'Andet', 'agility',
  'Opvarmningen fra FIFA 11+, der mindsker skader i knæ, ankel og lyske.',
  ['Sæt 6 par kegler op i to rækker med ca. 5 meter mellem.', 'Jog frem og tilbage med varianter: hofte ud, hofte ind, sidestep, skulderkontakt og hurtigt frem og tilbage.', 'Afslut med to rolige løb over banen.'],
  '8 min', 'Ingen', ['Knæene peger frem i alle landinger.', 'Brug den som opvarmning før hver træning.'], { illu: 'carioca', secs: 480 });
A('gkcollapse', 'Faldredning', 'Bevægelse', ['Hurtighed', 'Eksplosivitet'], 'Bold', 'agility',
  'Hurtigt ned til siden efter lave bolde tæt på kroppen.',
  ['Stå i klarposition med en makker eller en bold foran dig.', 'Træk det nærmeste ben væk under dig, og fald til siden med hænderne mod bolden.', 'Land på siden af kroppen med bolden låst, og kom hurtigt op.'],
  '5/side', '30 sek', ['Blødt underlag: græs eller måtte.', 'Hænderne mod bolden, ikke ned i jorden for at tage faldet.']);
A('gkshuffledive', 'Sidestep og dyk', 'Eksplosiv', ['Eksplosivitet', 'Hurtighed'], 'Andet', 'agility',
  'Sidestep ind på bolden, og dyk eksplosivt fra det rigtige ben.',
  ['Stå i målmandsstilling ved en kegle.', 'Lav 2–3 hurtige sidesteps, og sæt af fra benet nærmest bolden.', 'Dyk med strakte arme, land på siden, og kom op i klarposition.'],
  '4/side', '60 sek', ['Sæt af fra benet nærmest bolden.', 'Kvalitet før mængde. Stop, når afsættet bliver langsomt.'], { hard: true });
A('gkhighcatch', 'Spring og grib høj bold', 'Eksplosiv', ['Eksplosivitet', 'Balance'], 'Bold', 'plyo',
  'Afsæt fra ét ben, og grib i højeste punkt, som ved et indlæg.',
  ['En makker kaster bolden højt, eller du kaster den selv op.', 'Tag 1–2 tilløbsskridt, sæt af på ét ben, og løft det andet knæ som beskyttelse.', 'Grib bolden i højeste punkt, og land stabilt på begge ben.'],
  '6/side', '45 sek', ['Grib med hænderne foran ansigtet, så du kan se bolden.', 'Skift afsætsben.']);
A('gkset', 'Set-position på skuddet', 'Bevægelse', ['Hurtighed', 'Fokus', 'Balance'], 'Bold', 'agility',
  'Stå stille og i balance i det øjeblik, bolden bliver skudt, så du kan gå begge veje.',
  ['Stå 4–6 meter fra en makker med bolden. Tag små, hurtige skridt frem mod bolden.', 'Lige før makkeren skyder, tager du et lille hop ned i klarposition: fødderne i skulderbredde og vægten på forfoden.', 'Stå helt stille med hænderne klar, og redd skuddet.'],
  '8 gentagelser', '30 sek', ['Timing er alt: landet i klarposition, når foden rammer bolden.', 'Ingen kan redde i bevægelse. Stå stille i skudøjeblikket.'], { home: true });
A('gkdropstep', 'Drop-step og krydsløb bagud', 'Bevægelse', ['Hurtighed', 'Balance'], 'Ingen udstyr', 'agility',
  'Kom hurtigt tilbage mod mål, når bolden bliver lobbet over dig.',
  ['Stå i klarposition med front mod banen.', 'Åbn hoften, og sæt det ene ben skråt bagud (drop-step). Løb med krydsskridt bagud mod stolpen.', 'Spring op fra det bagerste ben, og ræk armen mod bolden over hovedet.'],
  '4/side', '30 sek', ['Hold blikket på bolden hele vejen.', 'Krydsskridt er hurtigere end at løbe baglæns.']);
A('gkbarrier', 'Knæ-barriere', 'Bevægelse', ['Hurtighed', 'Balance', 'Mobilitet'], 'Bold', 'agility',
  'Luk hullet mellem benene ved lave, hårde skud, der kommer lige på dig.',
  ['Stå i klarposition, mens en makker triller eller skyder bolden lavt mod dig.', 'Flyt dig ind bag bolden, og sæt det ene knæ ned ved den anden fods hæl, så benene danner en barriere.', 'Saml bolden op med begge hænder, og før den ind til brystet.'],
  '6/side', '30 sek', ['Knæet og foden lukker hullet sammen.', 'Øv begge sider: begge knæ skal kunne gå ned.'], { home: true });
A('gkthrow', 'Udkast med medicinbold', 'Eksplosiv', ['Eksplosivitet', 'Styrke', 'Core'], 'Medicinbold', 'plyo',
  'Kraft til lange, præcise udkast, der starter et hurtigt angreb.',
  ['Stå i skridtstilling med en let medicinbold (1–3 kg) i én hånd bag hovedet.', 'Træk armen langt bagud, og drej overkroppen væk fra kastretningen.', 'Kast fremad med hele kroppen: ben, hofte, overkrop og til sidst armen.'],
  '6/arm', '60 sek', ['Brug en let bold. Det er fart, ikke styrke.', 'Kast mod en væg eller langt frem på græs.']);
A('gkstar', 'Spredning 1 mod 1', 'Eksplosiv', ['Eksplosivitet', 'Hurtighed'], 'Ingen udstyr', 'plyo',
  'Dæk mest muligt af målet, når en angriber kommer alene mod dig.',
  ['Stå lavt i klarposition, som når en angriber er helt tæt på.', 'På signal: spring frem og spred arme og ben ud som en stjerne.', 'Land kontrolleret, og kom straks tilbage i klarposition.'],
  '6 reps', '45 sek', ['Hold blikket på bolden, også mens du spreder dig.', 'Hænderne er åbne og strakte, som en stor mur.']);

/* --- Fodbold: styrke og skadeforebyggelse --- */
A('backsquat', 'Squat med stang', 'Styrke', ['Styrke'], 'Stang', 'squat',
  'Den klassiske tunge benøvelse til styrke og kraft i afsættet.',
  ['Læg stangen på øvre ryg, og stå med fødderne i skulderbredde.', 'Sæt dig ned og tilbage, til lårene er vandrette.', 'Pres op gennem hele foden, til du står rank.'],
  '5 reps', '2 min', ['Spænd maven, før du går ned.', 'Knæene følger tæerne.'], { illu: 'frontsquat', log: true });
A('spanish', 'Spansk squat', 'Styrke', ['Styrke', 'Skadesforebyggelse'], 'Elastik', 'squat',
  'Stærke lår og en stærk sene under knæskallen. Godt ved ømme knæ.',
  ['Fastgør en kraftig elastik om en stolpe, og sæt den bag knæene.', 'Læn dig tilbage mod elastikken med lodrette skinneben, og sæt dig ned til ca. 90 grader.', 'Hold positionen, eller gå langsomt op og ned.'],
  '3 × 30 sek', '60 sek', ['Skinnebenene er lodrette hele tiden.', 'Du skal mærke det foran på låret, ikke inde i knæet.'], { illu: 'wallsit', secs: 30 });
A('isosplit', 'Split squat-hold', 'Styrke', ['Styrke', 'Skadesforebyggelse'], 'Ingen udstyr', 'squat',
  'Hold i bunden af en split squat: stærke sener og knæ uden at blive træt i benene.',
  ['Stå i skridtstilling, og sænk dig, til bageste knæ er en håndbredde over gulvet.', 'Hold positionen med vægten midt på forreste fod.', 'Rejs dig roligt, og skift ben.'],
  '2 × 30 sek/ben', '45 sek', ['Hold håndvægte for at gøre det tungere.', 'God i ugen før kamp: styrke uden ømhed.'], { illu: 'splitsquat', secs: 30, perSide: true });
A('trapbar', 'Trapbar-dødløft', 'Styrke', ['Styrke', 'Eksplosivitet'], 'Stang', 'hinge',
  'Tung styrke i hele underkroppen og skånsomt for ryggen.',
  ['Stå midt i trapbaren, og tag fat i håndtagene.', 'Sænk hoften med brystet oppe og ryggen lige.', 'Pres gennem hele foden, og rejs dig, til hofterne er strakte.'],
  '5 reps', '2 min', ['Skub gulvet væk i stedet for at trække i stangen.', 'Sænk vægten kontrolleret.'], { illu: 'rdl', log: true });
A('hambridgeiso', 'Baglårsbro-hold', 'Styrke', ['Skadesforebyggelse', 'Styrke'], 'Bænk/kasse', 'hinge',
  'Stærke baglår uden at blive træt. God i kampugen.',
  ['Lig på ryggen med hælene på en bænk og knæene let bøjede.', 'Pres hælene ned, og løft hoften.', 'Hold positionen, og sænk roligt.'],
  '3 × 20 sek', '30 sek', ['Jo mere strakte ben, jo sværere.', 'Prøv på ét ben, når det bliver let.'], { illu: 'glutebridge', secs: 20 });
A('soleus', 'Siddende calf raise', 'Styrke', ['Skadesforebyggelse', 'Styrke'], 'Håndvægte', 'calf',
  'Stærk dyb lægmuskel, der beskytter achillessenen og giver kraft i afsættet.',
  ['Sid på en bænk med fødderne fladt og en vægt på lårene lige over knæene.', 'Løft hælene så højt du kan.', 'Sænk langsomt på 2–3 sekunder.'],
  '15 reps', '45 sek', ['De bøjede knæ gør, at du rammer den dybe lægmuskel.', 'Tung vægt og fuldt bevægeudslag.'], { illu: 'calf', log: true });
A('adductsqueeze', 'Adduktor-klem med bold', 'Core', ['Skadesforebyggelse', 'Styrke'], 'Bold', 'core',
  'Stærke inderlår, der beskytter lysken. Kan laves alle steder med en bold.',
  ['Lig på ryggen med bøjede knæ og en bold mellem knæene.', 'Klem bolden så hårdt du kan i 5 sekunder.', 'Slap af i 5 sekunder, og gentag.'],
  '6 × 5 sek', '30 sek', ['Træk vejret, mens du klemmer.', 'God dagen efter kamp og som opvarmning.'], { illu: 'glutebridge', home: true });
A('landminepress', 'Landmine press på ét knæ', 'Styrke', ['Styrke', 'Core', 'Skadesforebyggelse'], 'Stang', 'push',
  'Skånsomt pres for skulderen, i samme bane som et udkast.',
  ['Sæt den ene ende af en stang i et hjørne, og knæl på ét knæ.', 'Hold den anden ende ved skulderen i samme side som det bageste knæ.', 'Pres stangen frem og op, til armen er strakt, og sænk roligt.'],
  '8/side', '60 sek', ['Spænd ballen på det bageste ben.', 'Overkroppen står stille.'], { illu: 'dbpress', log: true });
A('ytw', 'Y-T-W liggende', 'Styrke', ['Skadesforebyggelse', 'Mobilitet'], 'Ingen udstyr', 'pull',
  'Stærke skulderblade, der beskytter skulderen ved dyk og udkast.',
  ['Lig på maven med armene frem og tommelfingrene op.', 'Løft armene i et Y, derefter et T og til sidst et W.', 'Hold 2 sekunder i hver stilling, og sænk roligt.'],
  '2 × 5 runder', '30 sek', ['Træk skulderbladene ned og sammen.', 'Ingen eller meget lette vægte.'], { illu: 'superman' });
A('extrot', 'Udadrotation med elastik', 'Styrke', ['Skadesforebyggelse'], 'Elastik', 'pull',
  'Stærk rotatorcuff, der beskytter skulderen, når du lander på armen efter et dyk.',
  ['Fastgør elastikken i albuehøjde, og stå sidelæns med albuen ind til siden i 90 grader.', 'Drej underarmen udad, mens albuen bliver ved siden.', 'Før langsomt tilbage, og skift side.'],
  '12/side', '30 sek', ['Læg et sammenrullet håndklæde mellem albue og krop.', 'Let elastik og rolig bevægelse.'], { illu: 'bandpull' });
A('hipairplane', 'Hofte-flyvemaskine', 'Mobilitet', ['Balance', 'Skadesforebyggelse', 'Mobilitet'], 'Ingen udstyr', 'mobility',
  'Kontrol og styrke i hoften på ét ben, så knæet er stabilt i landinger.',
  ['Stå på ét ben, og læn overkroppen frem, til den er næsten vandret.', 'Drej bækkenet langsomt op og ud til siden og derefter ned mod standbenet.', 'Hold balancen hele tiden, og skift ben.'],
  '5/ben', '30 sek', ['Hold fast i noget i starten.', 'Langsomt og kontrolleret.'], { illu: 'slrdl' });
A('foamroll', 'Foamroller', 'Mobilitet', ['Mobilitet'], 'Andet', 'mobility',
  'Løsner stramme muskler efter kamp og hård træning.',
  ['Læg foamrolleren under lår, læg eller baller.', 'Rul langsomt frem og tilbage i 30–60 sekunder pr. område.', 'Stop på ømme punkter, og træk vejret roligt.'],
  '5–10 min', 'Ingen', ['Ikke direkte på knogler eller led.', 'God dagen efter kamp.'], { home: true });

/* --- Fodbold: spring, kast og kampkondition --- */
A('trapjump', 'Hop med håndvægte', 'Eksplosiv', ['Eksplosivitet', 'Styrke'], 'Håndvægte', 'plyo',
  'Lodret kraft med lidt ekstra vægt: bygger bro mellem styrke og spring.',
  ['Hold en let håndvægt i hver hånd ved siden af kroppen.', 'Gå hurtigt ned i en halv squat, og hop eksplosivt op.', 'Land blødt, nulstil, og gentag.'],
  '5 reps', '90 sek', ['Brug kun 10–20 % af din kropsvægt.', 'Hvert hop skal være hurtigt. Stop, når de bliver langsomme.'], { illu: 'squatjump', log: true });
A('depthjump', 'Drop jump', 'Eksplosiv', ['Eksplosivitet', 'Hurtighed'], 'Bænk/kasse', 'plyo',
  'Reaktiv kraft: kort kontakt med jorden og hurtigt afsæt efter landing.',
  ['Stå på en lav kasse (20–40 cm).', 'Træd ned, og land på forfoden med begge ben.', 'Hop straks så højt du kan, med så kort kontakt med jorden som muligt.'],
  '4 reps', '90 sek', ['Kun når almindelige spring sidder sikkert.', 'Træd ned, hop ikke ned.'], { illu: 'boxjump', hard: true });
A('lateralstick', 'Sidespring med stop', 'Eksplosiv', ['Eksplosivitet', 'Balance', 'Skadesforebyggelse'], 'Ingen udstyr', 'plyo',
  'Sidelæns afsæt og en landing, du kan holde: stabile knæ og ankler.',
  ['Stå på ét ben med let bøjet knæ.', 'Spring til siden over på det andet ben.', 'Land og frys i 2 sekunder før næste spring.'],
  '4/side', '45 sek', ['Knæet peger over tæerne i landingen.', 'Spring længere, når landingen er stabil.'], { illu: 'bounds' });
A('medrot', 'Medicinbold-rotationskast', 'Eksplosiv', ['Eksplosivitet', 'Core'], 'Medicinbold', 'plyo',
  'Kraft i rotation fra hofte til arme, som i udspark og lange udkast.',
  ['Stå sidelæns til en væg med bolden ved hoften.', 'Drej væk fra væggen, og kast eksplosivt mod væggen med drejning fra hoften.', 'Grib bolden, nulstil, og skift side efter sættet.'],
  '6/side', '60 sek', ['Kraften starter i bagerste fod og hofte.', 'Brug en blød bold.'], { illu: 'medthrow' });
A('tempo', 'Tempoløb', 'Kondition', ['Udholdenhed'], 'Ingen udstyr', 'cardio',
  'Kampkondition: løb hurtigt over banen, og gå tilbage, igen og igen.',
  ['Løb fra straffesparksfelt til straffesparksfelt i et jævnt, hurtigt tempo (ikke sprint).', 'Gå tilbage langs sidelinjen som pause.', 'Gentag, og hold samme tid på alle løb.'],
  '8–12 løb', 'Gå tilbage', ['RPE 7: hurtigt, men afslappet.', 'Mest i opbygningen før sæsonen.'], { illu: 'run' });
A('rsa', 'Gentagne sprint', 'Kondition', ['Udholdenhed', 'Hurtighed'], 'Ingen udstyr', 'cardio',
  'Evnen til at sprinte igen og igen med kort pause, som i en kamp.',
  ['Sæt to kegler 20–30 meter fra hinanden.', 'Sprint hurtigt til keglen.', 'Jog roligt tilbage på 20–25 sekunder, og sprint igen.'],
  '2 × 6 sprint', '20–25 sek', ['Hold kvaliteten. Stop, når tiden falder meget.', '3 minutters pause mellem sættene.'], { illu: 'sprint5', hard: true });

/* ===== Sæson =====
   [off, pre, in, md] pr. øvelse.
   off/pre/in: hvor godt øvelsen passer i perioden. 3 = kerneøvelse, 2 = god, 1 = lidt eller let, 0 = spring over.
   md: hvor tæt på kamp øvelsen kan ligge i normal dosis. 0 = også på kampdagen som opvarmning, 1 = dagen før, 2 = senest 2 dage før, 3 = senest 3 dage før. */
const SEASONS = [
  { k: 'off', t: 'Off-season', d: 'Efter sæsonen: byg styrke, muskler og den aerobe base. Tid til tunge løft og meget volumen.' },
  { k: 'pre', t: 'Opbygning', d: 'Op til sæsonen: gør styrken eksplosiv, og byg fart og kampkondition.' },
  { k: 'in', t: 'In-season', d: 'Under sæsonen: hold formen med få sæt i høj kvalitet, og vær frisk til kamp.' }
];
const SEASON_FIT = ['Spring over', 'Lidt', 'God', 'Kerneøvelse'];
const MD_TXT = ['Kan bruges på kampdagen', 'Fint dagen før kamp', 'Senest 2 dage før kamp', 'Senest 3 dage før kamp'];
const SEASON = {
  /* Kondition */
  bike: [2, 2, 3, 1], assault: [2, 3, 2, 2], rower: [3, 2, 2, 2], run: [3, 3, 1, 2], skierg: [2, 2, 2, 2], jumprope: [2, 2, 2, 1], stairs: [2, 1, 1, 2],
  burpee: [2, 1, 1, 2], tempo: [3, 3, 1, 3], rsa: [1, 3, 2, 2],
  /* Ben: squat */
  squat: [2, 2, 2, 1], goblet: [3, 2, 2, 2], splitsquat: [3, 2, 2, 2], walkinglunge: [3, 2, 1, 3], stepup: [2, 3, 2, 2], sumosquat: [2, 1, 1, 2], wallsit: [2, 1, 1, 2],
  frontsquat: [3, 3, 2, 3], backsquat: [3, 3, 2, 3], legpress: [3, 2, 1, 3], singlesquat: [2, 3, 2, 2], bulgarian: [3, 3, 2, 3], reverselunge: [2, 2, 2, 2],
  spanish: [3, 2, 3, 1], isosplit: [2, 2, 3, 1],
  /* Ben: hofte */
  rdl: [3, 3, 2, 3], dbrdl: [3, 2, 2, 3], trapbar: [3, 3, 2, 3], hipthrust: [3, 3, 2, 2], slrdl: [2, 3, 3, 2], kbswing: [2, 3, 2, 2], slbridge: [2, 2, 3, 1],
  glutebridge: [2, 2, 3, 1], nordic: [3, 3, 3, 3], hamwalk: [2, 2, 2, 2], hambridgeiso: [2, 2, 3, 1],
  /* Skub */
  pushup: [2, 2, 2, 1], kneepushup: [2, 1, 1, 1], diamondpush: [2, 1, 1, 1], dbpress: [3, 2, 2, 2], dbbench: [3, 2, 2, 2], pikepush: [2, 1, 1, 1],
  clappush: [1, 3, 2, 2], landminepress: [3, 2, 2, 2],
  /* Træk */
  latpull: [3, 2, 2, 2], dbrow: [3, 2, 2, 2], invrow: [2, 2, 2, 1], pullup: [3, 2, 2, 2], bandpull: [2, 2, 3, 0], cablerow: [3, 2, 2, 2], facepull: [2, 2, 3, 1],
  superman: [2, 1, 1, 1], ytw: [2, 2, 3, 0], extrot: [2, 2, 3, 0],
  /* Core */
  pallof: [2, 3, 3, 1], bandpallof: [2, 3, 3, 1], deadbug: [2, 2, 3, 0], sideplank: [2, 3, 3, 1], plank: [2, 2, 2, 1], birddog: [2, 2, 3, 0], hollow: [2, 2, 2, 1],
  mtnclimber: [2, 2, 1, 2], russiantwist: [2, 1, 1, 1], legraise: [2, 1, 1, 1], bicycle: [2, 1, 1, 1], abwheel: [3, 2, 1, 2], copenhagen: [3, 3, 3, 2],
  woodchop: [2, 3, 2, 2], plankreach: [2, 2, 2, 1], adductsqueeze: [2, 2, 3, 0],
  /* Bæreøvelser */
  farmer: [3, 2, 2, 2], suitcase: [3, 2, 2, 2], ohcarry: [2, 2, 1, 2], bearcrawl: [2, 2, 1, 2],
  /* Spring og kast */
  bounds: [2, 3, 3, 1], squatjump: [2, 3, 2, 1], skater: [2, 3, 3, 2], boxjump: [2, 3, 2, 2], broadjump: [2, 3, 2, 2], tuckjump: [1, 3, 1, 2], pogo: [2, 3, 3, 1],
  medslam: [2, 3, 2, 1], medthrow: [2, 3, 3, 1], medrot: [2, 3, 3, 1], slhop: [2, 3, 2, 2], trapjump: [2, 3, 2, 2], depthjump: [1, 3, 2, 2],
  lateralstick: [2, 3, 3, 1], gkhighcatch: [1, 3, 3, 1],
  /* Læg og ankler */
  calf: [2, 2, 3, 0], slcalf: [3, 3, 3, 1], tibraise: [2, 2, 3, 0], stepcalf: [3, 2, 2, 1], soleus: [3, 2, 2, 1],
  /* Fart, fødder og retningsskift */
  shuffle: [2, 3, 3, 0], fastfeet: [2, 3, 3, 0], carioca: [2, 2, 2, 0], ladder: [2, 3, 2, 0], tdrill: [1, 3, 2, 1], sprint5: [2, 3, 3, 1],
  diveget: [1, 3, 3, 2], getup: [2, 3, 3, 1], latbandwalk: [2, 2, 3, 0], latlunge: [2, 2, 2, 1],
  wallaccel: [2, 3, 3, 1], askip: [2, 3, 3, 0], flysprint: [1, 3, 3, 2], decel: [2, 3, 3, 1], cod505: [1, 3, 2, 2], mirror: [2, 3, 3, 1],
  fifa11: [2, 3, 3, 0], gkcollapse: [1, 3, 3, 1], gkshuffledive: [1, 3, 3, 2],
  gkset: [2, 3, 3, 0], gkdropstep: [2, 3, 3, 1], gkbarrier: [1, 3, 3, 1], gkthrow: [2, 3, 3, 1], gkstar: [2, 3, 3, 1],
  /* Mobilitet */
  cossack: [3, 2, 2, 1], hips9090: [2, 2, 3, 0], wgs: [2, 2, 3, 0], catcow: [2, 2, 3, 0], openbook: [2, 2, 3, 0], hipflexor: [2, 2, 3, 0],
  anklemob: [2, 2, 3, 0], deepsquat: [2, 2, 3, 0], shoulderband: [2, 2, 3, 0], hipairplane: [2, 2, 3, 0], foamroll: [2, 2, 3, 0],
  /* Fokus */
  reaction: [1, 2, 3, 0], breath: [1, 2, 3, 0], wallball: [2, 3, 3, 0], dropcatch: [2, 3, 3, 0], visual: [1, 1, 3, 0]
};
Object.entries(SEASON).forEach(([id, [off, pre, inn, md]]) => { if (EX[id]) Object.assign(EX[id], { season: { off, pre, in: inn }, md }); });
/* Sikkerhedsnet: en ny øvelse uden sæson-data får en neutral vurdering i stedet for at vælte filtrene */
Object.entries(EX).forEach(([id, e]) => { if (!e.season) { console.warn('Øvelse uden sæson-data:', id); Object.assign(e, { season: { off: 2, pre: 2, in: 2 }, md: 2 }); } });

