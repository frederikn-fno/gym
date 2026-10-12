'use strict';
/* ===== Illustrationsmotor: piktogram-figurer i SVG (START → SLUT) ===== */
const G = 177; // gulvkontakt (y) for fødder
const LEN = { torso: 48, neck: 19, thigh: 36, shin: 34, upper: 24, fore: 22, foot: 11 };
const COL = { near: '#EEF3EC', far: '#7E8C83', farFront: '#C9D3C8', eq: '#26332C', eqLine: '#8FA096', lime: '#C8F03C', rest: '#4DB6FF' };
const r1 = n => Math.round(n * 10) / 10;
const rad = d => d * Math.PI / 180;

function ik(root, target, a, b, bend) {
  let dx = target[0] - root[0], dy = target[1] - root[1];
  let d = Math.hypot(dx, dy) || 0.01;
  const max = a + b - 0.4;
  if (d > max) { const k = max / d; dx *= k; dy *= k; d = max; }
  const ang = Math.atan2(dy, dx);
  const c = (a * a + d * d - b * b) / (2 * a * d);
  const th = Math.acos(Math.max(-1, Math.min(1, c)));
  const ka = ang + bend * th;
  return [[root[0] + a * Math.cos(ka), root[1] + a * Math.sin(ka)], [root[0] + dx, root[1] + dy]];
}

function joints(p) {
  const hip = p.hip, t = rad(p.t || 0);
  const sh = p.sh || [hip[0] + LEN.torso * Math.sin(t), hip[1] - LEN.torso * Math.cos(t)];
  const dx = sh[0] - hip[0], dy = sh[1] - hip[1], dl = Math.hypot(dx, dy);
  const head = p.head || [sh[0] + dx / dl * LEN.neck, sh[1] + dy / dl * LEN.neck];
  const legs = (p.legs || []).map(l => {
    const [k, f] = l.knee ? [l.knee, l.foot] : ik(hip, l.foot, LEN.thigh, LEN.shin, l.b ?? -1);
    let toe = null;
    if (l.toe) toe = l.toe;
    else if (!p.front && l.toe !== false) toe = [f[0] + LEN.foot, f[1] + 1];
    return { k, f, toe };
  });
  const arms = (p.arms || []).map(a => {
    const [e, h] = a.elbow ? [a.elbow, a.hand] : ik(sh, a.hand, LEN.upper, LEN.fore, a.b ?? 1);
    return { e, h };
  });
  return { hip, sh, head, legs, arms, front: !!p.front, spine: p.spine || null };
}

function ln(a, b, w, c, extra = '') {
  return `<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${extra}/>`;
}

function figure(J, hl = []) {
  const W = { torso: 15, thigh: 11, shin: 10, upper: 9, fore: 8, foot: 7 };
  const farC = J.front ? COL.farFront : COL.far;
  const parts = [];
  const limb = (i, isNear) => {
    const c = isNear ? COL.near : farC;
    const L = J.legs[i], A = J.arms[i];
    return { c, L, A, i };
  };
  const pushLeg = ({ c, L, i }) => {
    if (!L) return;
    parts.push([J.hip, L.k, W.thigh, c, 'thigh', i]);
    parts.push([L.k, L.f, W.shin, c, 'shin', i]);
    if (L.toe) parts.push([L.f, L.toe, W.foot, c, 'foot', i]);
  };
  const pushArm = ({ c, A, i }) => {
    if (!A) return;
    parts.push([J.sh, A.e, W.upper, c, 'upper', i]);
    parts.push([A.e, A.h, W.fore, c, 'fore', i]);
  };
  pushArm(limb(0, false)); pushLeg(limb(0, false));
  parts.push([J.hip, J.sh, W.torso, COL.near, 'torso', 0]);
  pushLeg(limb(1, true)); pushArm(limb(1, true));
  const isHl = (tag, i) => hl.includes(tag) || hl.includes(tag + '.' + i);
  let halo = '', body = '';
  // J.spine = [dx, dy]: kontrolpunkt-forskydning, så ryggen kan tegnes buet (kat-ko)
  const seg = (a, b, w, c, tag, extra = '') => (tag === 'torso' && J.spine)
    ? `<path d="M${r1(a[0])} ${r1(a[1])} Q${r1((a[0] + b[0]) / 2 + J.spine[0])} ${r1((a[1] + b[1]) / 2 + J.spine[1])} ${r1(b[0])} ${r1(b[1])}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${extra}/>`
    : ln(a, b, w, c, extra);
  parts.forEach(([a, b, w, c, tag, i]) => {
    if (isHl(tag, i)) halo += seg(a, b, w + 13, COL.lime, tag, ' opacity=".26"');
    body += seg(a, b, w, c, tag);
  });
  const head = `<circle cx="${r1(J.head[0])}" cy="${r1(J.head[1])}" r="11.5" fill="${COL.near}"/>`;
  // Hovedet tegnes før nærmeste arm, så armen kan krydse foran
  const nearArmStart = body.lastIndexOf('<line', body.lastIndexOf('<line') - 1);
  return halo + body.slice(0, nearArmStart) + head + body.slice(nearArmStart);
}

function arrow(d, dashed) {
  return `<path d="${d}" fill="none" stroke="${COL.lime}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#gkArrow)"${dashed ? ' stroke-dasharray="1 8" opacity=".85"' : ''}/>`;
}
function guide(d) { return `<path d="${d}" fill="none" stroke="${COL.lime}" stroke-width="2" stroke-dasharray="4 6" opacity=".7"/>`; }
function arc(cx, cy, r, a0, a1) {
  const p = a => [r1(cx + r * Math.cos(rad(a))), r1(cy + r * Math.sin(rad(a)))];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${x0} ${y0} A${r} ${r} 0 ${large} ${a1 > a0 ? 1 : 0} ${x1} ${y1}`;
}
const rect = (x, y, w, h, rx = 4, fill = COL.eq, stroke = COL.eqLine, sw = 2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const circ = (cx, cy, r, fill = COL.eq, stroke = COL.eqLine, sw = 2.5) => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const bar = (a, b, w = 6, c = '#3B4A42') => ln(a, b, w, c);
const mat = () => rect(6, G + 1, 158, 4, 2, '#24342B', 'none', 0);
const kettlebell = h => `<path d="M${r1(h[0] - 7)} ${r1(h[1] + 9)} Q${r1(h[0])} ${r1(h[1] - 7)} ${r1(h[0] + 7)} ${r1(h[1] + 9)}" fill="none" stroke="${COL.eqLine}" stroke-width="3.5" stroke-linecap="round"/>` + circ(h[0], h[1] + 18, 10.5, '#34433B');
const plate = h => circ(h[0], h[1], 19, '#25322B', COL.eqLine, 3) + circ(h[0], h[1], 3.5, COL.eqLine, 'none', 0);

/* ---- Øvelsesdefinitioner ---- */
const ILL = {
  squat: {
    hl: ['thigh'],
    poses: [
      { hip: [80, G - 70], legs: [{ foot: [77, G] }, { foot: [84, G] }], arms: [{ hand: [78, G - 74] }, { hand: [83, G - 74] }] },
      { hip: [56, G - 37], t: 30, legs: [{ foot: [84, G] }, { foot: [90, G] }], arms: [{ hand: [120, G - 82] }, { hand: [124, G - 80] }] }
    ],
    arrows: [[arrow(`M54 ${G - 92} Q34 ${G - 76} 40 ${G - 50}`)], [arrow(`M30 ${G - 40} L30 ${G - 92}`, true)]]
  },
  calf: {
    hl: ['shin'],
    poses: [
      { hip: [80, G - 70], legs: [{ foot: [76, G] }, { foot: [82, G] }], arms: [{ hand: [78, G - 74] }, { hand: [83, G - 74] }] },
      { hip: [80, G - 80], legs: [{ foot: [76, G - 10], toe: [85, G] }, { foot: [82, G - 10], toe: [91, G] }], arms: [{ hand: [78, G - 84] }, { hand: [83, G - 84] }] }
    ],
    arrows: [[arrow(`M60 ${G - 4} L60 ${G - 34}`)], [arrow(`M60 ${G - 34} L60 ${G - 6}`, true)]]
  },
  latlunge: {
    hl: ['thigh'],
    poses: [
      { front: 1, hip: [62, G - 69], legs: [{ foot: [55, G], b: 1 }, { foot: [69, G], b: -1 }], arms: [{ hand: [59, G - 92], b: 1 }, { hand: [65, G - 92], b: -1 }] },
      { front: 1, hip: [96, G - 42], legs: [{ foot: [42, G], b: 1 }, { foot: [128, G], b: -1 }], arms: [{ hand: [93, G - 66], b: 1 }, { hand: [99, G - 66], b: -1 }] }
    ],
    arrows: [[arrow(`M86 ${G - 22} L140 ${G - 22}`)], [arrow(`M120 ${G - 142} L64 ${G - 142}`, true)]]
  },
  shuffle: {
    hl: ['thigh'],
    poses: [
      { front: 1, hip: [52, G - 60], legs: [{ foot: [33, G], b: 1 }, { foot: [71, G], b: -1 }], arms: [{ hand: [33, G - 70], b: 1 }, { hand: [71, G - 70], b: -1 }] },
      { front: 1, hip: [116, G - 60], legs: [{ foot: [97, G], b: 1 }, { foot: [135, G], b: -1 }], arms: [{ hand: [97, G - 70], b: 1 }, { hand: [135, G - 70], b: -1 }] }
    ],
    arrows: [[arrow(`M46 24 L136 24`)], [arrow(`M122 24 L34 24`, true)]]
  },
  bounds: {
    hl: ['thigh', 'shin'],
    poses: [
      { front: 1, hip: [48, G - 66], legs: [{ foot: [42, G], b: 1 }, { foot: [64, G - 22], b: -1 }], arms: [{ hand: [24, G - 74] }, { hand: [34, G - 70] }] },
      { front: 1, hip: [118, G - 66], legs: [{ foot: [102, G - 24], b: 1 }, { foot: [124, G], b: -1 }], arms: [{ hand: [136, G - 72], b: -1 }, { hand: [142, G - 78], b: -1 }] }
    ],
    arrows: [[arrow(`M70 ${G - 104} Q116 ${G - 176} 154 ${G - 100}`)], [arrow(`M98 ${G - 104} Q54 ${G - 176} 16 ${G - 100}`, true)]]
  },
  squatjump: {
    hl: ['thigh', 'shin'],
    poses: [
      { hip: [56, G - 37], t: 30, legs: [{ foot: [84, G] }, { foot: [90, G] }], arms: [{ hand: [60, G - 42] }, { hand: [64, G - 40] }] },
      { hip: [80, G - 88], legs: [{ foot: [78, G - 18], toe: [83, G - 8] }, { foot: [83, G - 18], toe: [88, G - 8] }], arms: [{ hand: [98, G - 170] }, { hand: [104, G - 167] }] }
    ],
    back: [null, () => `<ellipse cx="84" cy="${G + 5}" rx="20" ry="3.5" fill="${COL.lime}" opacity=".16"/>`],
    arrows: [[arrow(`M124 ${G - 30} L124 ${G - 104}`)], [arrow(`M136 ${G - 104} L136 ${G - 30}`, true)]]
  },
  bulgarian: {
    hl: ['thigh.1'],
    poses: [
      { hip: [84, G - 66], t: 5, legs: [{ foot: [40, G - 27], toe: [29, G - 26], b: -1 }, { foot: [112, G] }], arms: [{ hand: [86, G - 72] }, { hand: [90, G - 72] }] },
      { hip: [79, G - 38], t: 10, legs: [{ foot: [40, G - 27], toe: [29, G - 26], b: -1 }, { foot: [112, G] }], arms: [{ hand: [90, G - 44] }, { hand: [94, G - 44] }] }
    ],
    back: [() => bench(), () => bench()],
    arrows: [[arrow(`M134 ${G - 120} L134 ${G - 70}`)], [arrow(`M134 ${G - 70} L134 ${G - 120}`, true)]]
  },
  rdl: {
    hl: ['thigh', 'torso'],
    poses: [
      { hip: [80, G - 70], legs: [{ foot: [83, G] }, { foot: [88, G] }], arms: [{ hand: [84, G - 76] }, { hand: [88, G - 76] }] },
      { hip: [60, G - 60], t: 72, legs: [{ foot: [83, G] }, { foot: [88, G] }], arms: [{ hand: [104, G - 31] }, { hand: [108, G - 31] }] }
    ],
    back: [J => plate(J.arms[1].h), J => plate(J.arms[1].h)],
    arrows: [[arrow(`M62 ${G - 96} Q42 ${G - 88} 38 ${G - 62}`)], [arrow(`M138 ${G - 100} Q140 ${G - 146} 110 ${G - 158}`, true)]]
  },
  farmer: {
    hl: ['fore', 'upper', 'torso'],
    poses: [
      { hip: [52, G - 70], legs: [{ foot: [49, G] }, { foot: [56, G] }], arms: [{ hand: [50, G - 74] }, { hand: [55, G - 74] }] },
      { hip: [104, G - 67], legs: [{ foot: [88, G] }, { foot: [121, G] }], arms: [{ hand: [102, G - 71] }, { hand: [107, G - 71] }] }
    ],
    back: [J => kettlebell(J.arms[0].h), J => kettlebell(J.arms[0].h)],
    front: [J => kettlebell(J.arms[1].h), J => kettlebell(J.arms[1].h)],
    arrows: [[arrow(`M40 22 L128 22`)], [arrow(`M70 22 L150 22`, true)]]
  },
  latpull: {
    hl: ['upper', 'torso'],
    poses: [
      { front: 1, hip: [85, G - 44], legs: [{ knee: [70, G - 42], foot: [68, G] }, { knee: [100, G - 42], foot: [102, G] }], arms: [{ hand: [62, G - 131] }, { hand: [108, G - 131] }] },
      { front: 1, hip: [85, G - 44], legs: [{ knee: [70, G - 42], foot: [68, G] }, { knee: [100, G - 42], foot: [102, G] }], arms: [{ hand: [60, G - 96], b: -1 }, { hand: [110, G - 96], b: 1 }] }
    ],
    back: [J => latMachine(J.arms[0].h[1]), J => latMachine(J.arms[0].h[1])],
    front: [J => latBar(J.arms[0].h[1]), J => latBar(J.arms[0].h[1])],
    arrows: [[arrow(`M156 ${G - 136} L156 ${G - 96}`)], [arrow(`M156 ${G - 96} L156 ${G - 136}`, true)]]
  },
  fastfeet: {
    hl: ['shin'],
    poses: [
      { front: 1, hip: [84, G - 62], legs: [{ foot: [66, G - 12], b: 1 }, { foot: [102, G], b: -1 }], arms: [{ hand: [63, G - 70], b: 1 }, { hand: [105, G - 70], b: -1 }] },
      { front: 1, hip: [84, G - 62], legs: [{ foot: [66, G], b: 1 }, { foot: [102, G - 12], b: -1 }], arms: [{ hand: [63, G - 70], b: 1 }, { hand: [105, G - 70], b: -1 }] }
    ],
    arrows: [[arrow(`M44 ${G - 2} L44 ${G - 30}`), arrow(`M124 ${G - 30} L124 ${G - 4}`, true)], [arrow(`M124 ${G - 2} L124 ${G - 30}`), arrow(`M44 ${G - 30} L44 ${G - 4}`, true)]]
  },
  sideplank: {
    hl: ['torso'],
    poses: [
      { hip: [80, G - 4], sh: [36, G - 24], head: [19, G - 32], legs: [{ foot: [150, G - 3], toe: false }, { foot: [150, G], toe: false }], arms: [{ elbow: [36, G], hand: [14, G] }, { hand: [38, G - 70] }] },
      { hip: [83, G - 14], sh: [36, G - 24], head: [17, G - 28], legs: [{ foot: [151, G - 3], toe: false }, { foot: [151, G], toe: false }], arms: [{ elbow: [36, G], hand: [14, G] }, { hand: [38, G - 70] }] }
    ],
    back: [mat, mat],
    arrows: [[arrow(`M88 ${G - 22} L88 ${G - 54}`)], [guide(`M10 ${G - 36} L160 ${G - 4}`)]]
  },
  deadbug: {
    hl: ['torso'],
    poses: [
      { hip: [96, G - 3], sh: [48, G - 3], head: [28, G - 8], legs: [{ knee: [98, G - 39], foot: [132, G - 39], toe: [134, G - 50] }, { knee: [94, G - 39], foot: [128, G - 39], toe: [130, G - 50] }], arms: [{ hand: [50, G - 49] }, { hand: [46, G - 49] }] },
      { hip: [96, G - 3], sh: [48, G - 3], head: [28, G - 8], legs: [{ knee: [98, G - 39], foot: [132, G - 39], toe: [134, G - 50] }, { foot: [158, G - 18], toe: [160, G - 29], b: -1 }], arms: [{ hand: [8, G - 20] }, { hand: [46, G - 49] }] }
    ],
    back: [mat, mat],
    arrows: [[arrow(`M40 ${G - 62} Q12 ${G - 56} 10 ${G - 34}`), arrow(`M140 ${G - 52} Q158 ${G - 48} 160 ${G - 28}`)], []]
  },
  bike: {
    hl: ['thigh'],
    labels: ['CYKEL', 'CROSSTRAINER'], mid: 'eller',
    poses: [
      { hip: [66, G - 90], t: 25, legs: [{ foot: [77, G - 42] }, { foot: [99, G - 28] }], arms: [{ hand: [108, G - 110] }, { hand: [112, G - 110] }] },
      { hip: [76, G - 88], t: 6, legs: [{ foot: [62, G - 30], toe: [73, G - 29] }, { foot: [84, G - 22], toe: [95, G - 21] }], arms: [{ hand: [116, G - 138] }, { hand: [108, G - 136] }] }
    ],
    back: [() => bikeMachine(), () => crossMachine()],
    arrows: [[arrow(arc(88, G - 34, 23, -100, 160))], [arrow(`M46 ${G - 20} A32 11 0 1 1 ${80} ${G - 9}`)]]
  },
  assault: {
    hl: ['thigh', 'upper'],
    labels: ['SKUB', 'TRÆK'],
    poses: [
      { hip: [68, G - 88], t: 15, legs: [{ foot: [78, G - 42] }, { foot: [102, G - 26] }], arms: [{ hand: [96, G - 122] }, { hand: [116, G - 116] }] },
      { hip: [68, G - 88], t: 15, legs: [{ foot: [102, G - 26] }, { foot: [78, G - 42] }], arms: [{ hand: [116, G - 116] }, { hand: [96, G - 122] }] }
    ],
    back: [J => assaultMachine(J), J => assaultMachine(J)],
    arrows: [[arrow(arc(124, G - 50, 41, -160, -40))], [arrow(arc(124, G - 50, 41, -160, -40))]]
  },
  pallof: { custom: pallofPanel, labels: ['START', 'SLUT'] }
};


/* ---- Hjemmeøvelser uden udstyr ---- */
Object.assign(ILL, {
  glutebridge: {
    hl: ['thigh', 'torso'],
    poses: [
      { hip: [96, G - 3], sh: [48, G - 3], head: [28, G - 8], legs: [{ foot: [128, G], b: -1 }, { foot: [132, G], b: -1 }], arms: [{ hand: [88, G] }, { hand: [92, G] }] },
      { hip: [94, G - 32], sh: [48, G - 4], head: [28, G - 8], legs: [{ foot: [128, G], b: -1 }, { foot: [132, G], b: -1 }], arms: [{ hand: [88, G] }, { hand: [92, G] }] }
    ],
    back: [mat, mat],
    arrows: [[arrow(`M100 ${G - 16} L100 ${G - 50}`)], [guide(`M40 ${G + 2} L150 ${G - 50}`)]]
  },
  pushup: {
    hl: ['upper', 'fore', 'torso'],
    poses: [
      { hip: [82, G - 26], sh: [128, G - 42], head: [146, G - 48], legs: [{ foot: [14, G - 6], toe: [20, G] }, { foot: [16, G - 6], toe: [22, G] }], arms: [{ hand: [124, G], b: 1 }, { hand: [128, G], b: 1 }] },
      { hip: [82, G - 12], sh: [128, G - 16], head: [147, G - 18], legs: [{ foot: [14, G - 6], toe: [20, G] }, { foot: [16, G - 6], toe: [22, G] }], arms: [{ hand: [124, G], b: 1 }, { hand: [128, G], b: 1 }] }
    ],
    back: [mat, mat],
    arrows: [[arrow(`M160 ${G - 76} L160 ${G - 34}`)], [arrow(`M160 ${G - 34} L160 ${G - 76}`, true)]]
  },
  plank: {
    hl: ['torso'],
    labels: ['START', 'HOLD'],
    poses: [
      { hip: [78, G - 12], sh: [118, G - 24], head: [137, G - 30], legs: [{ knee: [44, G - 3], foot: [12, G - 3], toe: [6, G - 10] }, { knee: [46, G - 3], foot: [14, G - 3], toe: [8, G - 10] }], arms: [{ elbow: [116, G], hand: [138, G] }, { elbow: [118, G], hand: [140, G] }] },
      { hip: [73, G - 16], sh: [118, G - 24], head: [137, G - 28], legs: [{ foot: [10, G - 6], toe: [16, G] }, { foot: [12, G - 6], toe: [18, G] }], arms: [{ elbow: [116, G], hand: [138, G] }, { elbow: [118, G], hand: [140, G] }] }
    ],
    back: [mat, mat],
    arrows: [[arrow(`M44 ${G - 14} L44 ${G - 42}`)], [guide(`M4 ${G - 8} L156 ${G - 32}`)]]
  },
  reverselunge: {
    hl: ['thigh.1'],
    poses: [
      { hip: [80, G - 70], legs: [{ foot: [78, G] }, { foot: [84, G] }], arms: [{ hand: [80, G - 74] }, { hand: [84, G - 74] }] },
      { hip: [80, G - 38], t: 4, legs: [{ foot: [36, G - 7], toe: [46, G], b: -1 }, { foot: [110, G] }], arms: [{ hand: [82, G - 43] }, { hand: [86, G - 43] }] }
    ],
    arrows: [[arrow(`M70 ${G - 12} Q52 ${G - 26} 30 ${G - 14}`)], [arrow(`M134 ${G - 70} L134 ${G - 118}`, true)]]
  },
  birddog: {
    hl: ['torso'],
    poses: [
      { hip: [70, G - 40], sh: [118, G - 44], legs: [{ knee: [68, G - 4], foot: [34, G - 4], toe: [26, G - 2] }, { knee: [72, G - 4], foot: [38, G - 4], toe: [30, G - 2] }], arms: [{ hand: [114, G] }, { hand: [120, G] }] },
      { hip: [70, G - 40], sh: [118, G - 44], legs: [{ foot: [10, G - 34], toe: false, b: 1 }, { knee: [72, G - 4], foot: [38, G - 4], toe: [30, G - 2] }], arms: [{ hand: [116, G] }, { hand: [160, G - 52], b: -1 }] }
    ],
    back: [mat, mat],
    arrows: [[arrow(`M126 ${G - 66} L160 ${G - 72}`), arrow(`M54 ${G - 22} L18 ${G - 40}`)], [guide(`M4 ${G - 32} L166 ${G - 54}`)]]
  },
  getup: {
    hl: ['thigh', 'torso'],
    labels: ['START', 'KLAR'],
    poses: [
      { hip: [94, G - 5], sh: [46, G - 7], head: [27, G - 12], legs: [{ foot: [160, G - 6], toe: false }, { foot: [158, G - 1], toe: false }], arms: [{ hand: [8, G - 4] }, { hand: [6, G - 14] }] },
      { hip: [80, G - 56], t: 20, legs: [{ foot: [72, G] }, { foot: [94, G] }], arms: [{ hand: [114, G - 86] }, { hand: [118, G - 82] }] }
    ],
    back: [mat, null],
    arrows: [[arrow(`M100 ${G - 22} Q114 ${G - 72} 92 ${G - 112}`)], []]
  },
  reaction: {
    hl: ['thigh'],
    labels: ['SIGNAL', 'REAKTION'],
    poses: [
      { front: 1, hip: [85, G - 60], legs: [{ foot: [66, G], b: 1 }, { foot: [104, G], b: -1 }], arms: [{ hand: [66, G - 70], b: 1 }, { hand: [104, G - 70], b: -1 }] },
      { front: 1, hip: [56, G - 60], legs: [{ foot: [37, G], b: 1 }, { foot: [75, G], b: -1 }], arms: [{ hand: [37, G - 70], b: 1 }, { hand: [75, G - 70], b: -1 }] }
    ],
    back: [() => `<rect x="54" y="5" width="62" height="30" rx="7" fill="#0C1210" stroke="${COL.lime}" stroke-width="2.5"/>` + arrow(`M100 20 L72 20`), null],
    arrows: [[], [arrow(`M140 22 L40 22`)]]
  },
  breath: { custom: breathPanel, labels: ['BOKS-ÅNDING', 'ROLIG OG KLAR'] }
});
function breathPanel(i) {
  if (i === 0) {
    const t = (x, y, s) => `<text x="${x}" y="${y}" text-anchor="middle" fill="${COL.lime}" style="font:800 14px var(--font-d,sans-serif);letter-spacing:.06em">${s}</text>`;
    return `<rect x="40" y="40" width="90" height="90" rx="16" fill="none" stroke="#2D3D34" stroke-width="3"/>` +
      arrow('M54 40 L114 40') + arrow('M130 54 L130 114') + arrow('M116 130 L56 130') + arrow('M40 116 L40 56') +
      t(85, 28, 'IND') + t(85, 152, 'UD') + `<text x="152" y="90" text-anchor="middle" fill="${COL.lime}" transform="rotate(90 152 90)" style="font:800 13px var(--font-d,sans-serif);letter-spacing:.06em">HOLD</text>` +
      `<text x="18" y="90" text-anchor="middle" fill="${COL.lime}" transform="rotate(-90 18 90)" style="font:800 13px var(--font-d,sans-serif);letter-spacing:.06em">HOLD</text>` +
      `<text x="85" y="94" text-anchor="middle" fill="${COL.near}" style="font:800 26px var(--font-d,sans-serif)">4 SEK</text>`;
  }
  const J = joints({ front: 1, hip: [85, G - 70], legs: [{ foot: [79, G], b: 1 }, { foot: [91, G], b: -1 }], arms: [{ hand: [74, G - 76], b: 1 }, { hand: [96, G - 76], b: -1 }] });
  return `<line x1="10" y1="${G + 5}" x2="160" y2="${G + 5}" stroke="#2D3D34" stroke-width="2"/>` + figure(J, ['torso']) +
    arrow(`M140 ${G - 150} Q120 ${G - 162} 102 ${G - 150}`, true);
}

function bench() {
  return rect(12, G - 22, 46, 9, 4, '#34433B', COL.eqLine, 2) + bar([20, G - 13], [20, G + 4], 5) + bar([50, G - 13], [50, G + 4], 5);
}
function latMachine(barY) {
  return bar([30, 24], [30, G + 4], 6) + bar([140, 24], [140, G + 4], 6) + bar([30, 24], [140, 24], 7) +
    circ(85, 32, 7, '#34433B') + ln([85, 39], [85, barY - 2], 2.2, COL.eqLine) +
    bar([85, G - 30], [85, G + 4], 7) + rect(56, G - 39, 58, 9, 4.5, '#34433B');
}
function latBar(y) {
  return `<path d="M30 ${y + 9} L42 ${y - 2} L128 ${y - 2} L140 ${y + 9}" fill="none" stroke="#A9B8AE" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function bikeMachine() {
  return rect(26, G - 1, 34, 6, 3, '#34433B', 'none', 0) + rect(104, G - 1, 44, 6, 3, '#34433B', 'none', 0) +
    bar([46, G + 1], [64, G - 74], 7) + bar([68, G - 38], [124, G - 28], 6) + bar([118, G - 40], [112, G - 108], 6) +
    `<path d="M98 ${G - 113} L114 ${G - 109} L120 ${G - 100}" fill="none" stroke="#3B4A42" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` +
    circ(124, G - 28, 21, '#1B2520') + circ(124, G - 28, 4, COL.eqLine, 'none', 0) +
    rect(50, G - 85, 30, 7, 3.5, '#34433B') + circ(88, G - 34, 5, COL.eqLine, 'none', 0) +
    ln([77, G - 42], [99, G - 28], 3.5, COL.eqLine);
}
function crossMachine() {
  return rect(18, G - 2, 136, 6, 3, '#34433B', 'none', 0) + rect(118, G - 60, 32, 58, 14, '#1B2520') +
    bar([134, G - 60], [130, G - 128], 6) + rect(118, G - 142, 26, 13, 4, '#34433B') +
    ln([126, G - 82], [118, G - 140], 5, '#2F3D35') + ln([126, G - 80], [108, G - 136], 5, '#4A5B51') +
    ln([52, G - 26], [76, G - 26], 5, COL.eqLine) + ln([76, G - 26], [120, G - 40], 4, '#3B4A42') +
    ln([74, G - 18], [98, G - 18], 5, COL.eqLine) + ln([98, G - 18], [120, G - 30], 4, '#3B4A42');
}
function assaultMachine(J) {
  let vents = '';
  for (let i = 0; i < 12; i++) { const a = rad(i * 30); vents += ln([124 + 11 * Math.cos(a), G - 50 + 11 * Math.sin(a)], [124 + 26 * Math.cos(a), G - 50 + 26 * Math.sin(a)], 3, '#3B4A42'); }
  const P = [104, G - 58];
  return rect(22, G - 1, 132, 6, 3, '#34433B', 'none', 0) + circ(124, G - 50, 32, '#18221D', COL.eqLine, 3) + vents + circ(124, G - 50, 6, COL.eqLine, 'none', 0) +
    bar([60, G + 2], [64, G - 74], 7) + rect(50, G - 83, 30, 7, 3.5, '#34433B') + bar([64, G - 38], [124, G - 50], 6) +
    circ(90, G - 34, 5, COL.eqLine, 'none', 0) + ln(J.legs[0].f, J.legs[1].f, 3.5, COL.eqLine) +
    ln(P, J.arms[0].h, 5, '#2F3D35') + ln(P, J.arms[1].h, 5, '#4A5B51') + circ(P[0], P[1], 4, COL.eqLine, 'none', 0);
}
function pallofPanel(i) {
  const hands = i === 0 ? [[93, 120], [99, 120]] : [[93, 152], [99, 152]];
  const elbows = i === 0 ? [[78, 114], [114, 114]] : [[84, 126], [108, 126]];
  const hy = hands[0][1] + 1;
  let s = `<text x="85" y="20" text-anchor="middle" class="illu-note">SET OPPEFRA</text>`;
  s += rect(8, 54, 20, 92, 5, '#1B2520') + circ(28, 96, 4, COL.eqLine, 'none', 0);
  s += `<ellipse cx="96" cy="100" rx="34" ry="17" fill="${COL.lime}" opacity=".22"/>`;
  s += `<ellipse cx="82" cy="120" rx="6" ry="10" fill="${COL.far}"/><ellipse cx="110" cy="120" rx="6" ry="10" fill="${COL.far}"/>`;
  s += ln([28, 96], [96, hy], 2.2, COL.eqLine);
  s += ln([72, 97], [120, 97], 17, COL.near);
  s += ln([75, 99], elbows[0], 9, COL.near) + ln(elbows[0], hands[0], 8, COL.near);
  s += ln([117, 99], elbows[1], 9, COL.near) + ln(elbows[1], hands[1], 8, COL.near);
  s += `<rect x="89" y="${hy - 3}" width="14" height="7" rx="3" fill="#A9B8AE"/>`;
  s += `<circle cx="96" cy="95" r="12" fill="${COL.near}" stroke="#111A15" stroke-width="2.5"/>`;
  if (i === 0) s += arrow(`M140 118 L140 156`);
  else s += arrow(`M136 70 Q104 52 74 66`, true) + `<path d="M98 50 l10 10 M108 50 l-10 10" stroke="#FF6B5B" stroke-width="3.5" stroke-linecap="round"/>`;
  return s;
}

/* ===== Tegninger til de nye øvelser ===== */
function dumbbell(h, w) { w = w || 20; return ln([h[0] - w / 2, h[1]], [h[0] + w / 2, h[1]], 4, COL.eqLine) + rect(h[0] - w / 2 - 4, h[1] - 8, 5, 16, 2, '#3B4A42', COL.eqLine, 1.5) + rect(h[0] + w / 2 - 1, h[1] - 8, 5, 16, 2, '#3B4A42', COL.eqLine, 1.5); }
function dbEnd(h) { return circ(h[0], h[1], 8, '#3B4A42') + circ(h[0], h[1], 2.5, COL.eqLine, 'none', 0); }
function boxP(x, y, w, h) { return rect(x, y, w, h, 5, '#2A3830', COL.eqLine, 2); }
function wallP(x, w) { return rect(x, 14, w || 10, G - 8, 3, '#1B2520', '#2D3D34', 2); }
function medball(c, r) { r = r || 12; return circ(c[0], c[1], r, '#3D5A46', '#9DC3A8', 2.5) + `<path d="M${c[0] - r} ${c[1]} Q${c[0]} ${c[1] - r * .55} ${c[0] + r} ${c[1]} M${c[0]} ${c[1] - r} Q${c[0] + r * .45} ${c[1]} ${c[0]} ${c[1] + r}" fill="none" stroke="#9DC3A8" stroke-width="1.6"/>`; }
function bandP(a, b, w) { return ln(a, b, w || 3.5, '#FF9A3D'); }
function gtext(x, y, s, cls) { return `<text x="${x}" y="${y}" text-anchor="middle" class="${cls || 'illu-note'}">${s}</text>`; }
/* ---- Del 1: kondition, ben (squat og hofte) ---- */
function rowerFrame(J) {
  let vents = '';
  for (let i = 0; i < 10; i++) { const a = rad(i * 36); vents += ln([134 + 8 * Math.cos(a), G - 34 + 8 * Math.sin(a)], [134 + 19 * Math.cos(a), G - 34 + 19 * Math.sin(a)], 2.4, '#3B4A42'); }
  return rect(8, G - 2, 142, 6, 3, '#34433B', 'none', 0) +
    circ(134, G - 34, 25, '#18221D', COL.eqLine, 3) + vents + circ(134, G - 34, 4, COL.eqLine, 'none', 0) +
    ln([102, G - 8], [108, G - 36], 6, '#3B4A42') +
    rect(J.hip[0] - 14, J.hip[1] + 6, 28, 7, 3.5, '#34433B') + circ(J.hip[0] - 8, G + 1, 3.5, COL.eqLine, 'none', 0);
}
function rowerHandle(J) { const h = J.arms[1].h; return ln(h, [118, G - 38], 2.2, COL.eqLine) + rect(h[0] - 2, h[1] - 6, 4, 12, 2, '#A9B8AE', 'none', 0); }
function skiergTower(J) {
  const T = [138, 30];
  return bar([138, 36], [138, G + 4], 8) + circ(138, 36, 17, '#18221D', COL.eqLine, 3) + circ(138, 36, 4, COL.eqLine, 'none', 0) + rect(116, G - 2, 46, 6, 3, '#34433B', 'none', 0) +
    ln([128, 44], J.arms[0].h, 2.2, COL.eqLine) + ln([128, 44], J.arms[1].h, 2.2, COL.eqLine);
}
function ropeP(J, mode) {
  const a = J.arms[0].h, b = J.arms[1].h;
  const d = mode === 'over' ? `M${r1(a[0])} ${r1(a[1])} C${r1(a[0] - 26)} ${G - 190} ${r1(b[0] + 26)} ${G - 190} ${r1(b[0])} ${r1(b[1])}`
    : `M${r1(a[0])} ${r1(a[1])} C${r1(a[0] - 22)} ${G + 26} ${r1(b[0] + 22)} ${G + 26} ${r1(b[0])} ${r1(b[1])}`;
  return `<path d="${d}" fill="none" stroke="#FF9A3D" stroke-width="2.8" stroke-linecap="round"/>`;
}
function kbChest(h) { return kettlebell([h[0], h[1] - 2]); }

Object.assign(ILL, {
  rower: {
    hl: ['thigh', 'torso'], labels: ['FREMME', 'TRÆK'],
    poses: [
      { hip: [70, G - 24], t: 28, legs: [{ foot: [100, G - 30], b: -1 }, { foot: [102, G - 28], b: -1 }], arms: [{ hand: [116, G - 62] }, { hand: [118, G - 60] }] },
      { hip: [38, G - 24], t: -22, legs: [{ foot: [100, G - 32], b: -1 }, { foot: [102, G - 30], b: -1 }], arms: [{ hand: [38, G - 54] }, { hand: [44, G - 52] }] }
    ],
    back: [J => rowerFrame(J), J => rowerFrame(J)],
    front: [J => rowerHandle(J), J => rowerHandle(J)],
    arrows: [[arrow(`M60 ${G - 112} L100 ${G - 112}`)], [arrow(`M100 ${G - 112} L58 ${G - 112}`, true)]]
  },
  run: {
    hl: ['thigh', 'shin'], labels: ['SKRIDT 1', 'SKRIDT 2'],
    poses: [
      { hip: [78, G - 66], t: 14, legs: [{ foot: [36, G - 14], b: -1, toe: [30, G - 8] }, { knee: [110, G - 58], foot: [98, G - 26] }], arms: [{ hand: [112, G - 98], b: 1 }, { hand: [62, G - 92], b: 1 }] },
      { hip: [78, G - 66], t: 14, legs: [{ knee: [110, G - 58], foot: [98, G - 26] }, { foot: [36, G - 14], b: -1, toe: [30, G - 8] }], arms: [{ hand: [62, G - 92], b: 1 }, { hand: [112, G - 98], b: 1 }] }
    ],
    arrows: [[arrow(`M110 22 L152 22`)], [arrow(`M110 22 L152 22`)]]
  },
  skierg: {
    hl: ['upper', 'torso', 'thigh'], labels: ['STRÆK', 'TRÆK NED'],
    poses: [
      { hip: [72, G - 70], t: 4, legs: [{ foot: [70, G] }, { foot: [76, G] }], arms: [{ hand: [100, G - 160], b: -1 }, { hand: [104, G - 156], b: -1 }] },
      { hip: [60, G - 52], t: 55, legs: [{ foot: [78, G], b: -1 }, { foot: [84, G], b: -1 }], arms: [{ hand: [104, G - 36] }, { hand: [108, G - 38] }] }
    ],
    back: [J => skiergTower(J), J => skiergTower(J)],
    arrows: [[arrow(`M30 ${G - 150} L30 ${G - 100}`)], [arrow(`M30 ${G - 100} L30 ${G - 150}`, true)]]
  },
  jumprope: {
    hl: ['shin', 'thigh'], labels: ['TOV OVER', 'HOP'],
    poses: [
      { front: 1, hip: [85, G - 70], legs: [{ foot: [77, G], b: 1 }, { foot: [93, G], b: -1 }], arms: [{ hand: [60, G - 86], b: 1 }, { hand: [110, G - 86], b: -1 }] },
      { front: 1, hip: [85, G - 84], legs: [{ foot: [80, G - 16], b: 1 }, { foot: [90, G - 16], b: -1 }], arms: [{ hand: [60, G - 98], b: 1 }, { hand: [110, G - 98], b: -1 }] }
    ],
    back: [J => ropeP(J, 'over'), J => ropeP(J, 'under')],
    arrows: [[], [arrow(`M140 ${G - 40} L140 ${G - 70}`)]]
  },
  stairs: {
    hl: ['thigh', 'shin'], labels: ['HØJRE OP', 'VENSTRE OP'],
    poses: [
      { hip: [70, G - 84], t: 6, legs: [{ foot: [84, G - 20], b: -1 }, { foot: [86, G - 52], b: -1 }], arms: [{ hand: [128, G - 112], b: 1 }, { hand: [132, G - 108], b: 1 }] },
      { hip: [70, G - 84], t: 6, legs: [{ foot: [86, G - 52], b: -1 }, { foot: [84, G - 20], b: -1 }], arms: [{ hand: [128, G - 112], b: 1 }, { hand: [132, G - 108], b: 1 }] }
    ],
    back: [() => stairsMachine(0), () => stairsMachine(1)],
    arrows: [[arrow(`M30 ${G - 60} L30 ${G - 100}`)], [arrow(`M30 ${G - 100} L30 ${G - 60}`, true)]]
  },
  goblet: {
    hl: ['thigh'],
    poses: [
      { hip: [80, G - 70], legs: [{ foot: [77, G] }, { foot: [84, G] }], arms: [{ hand: [92, G - 108], b: 1 }, { hand: [94, G - 106], b: 1 }] },
      { hip: [56, G - 37], t: 24, legs: [{ foot: [84, G] }, { foot: [90, G] }], arms: [{ hand: [92, G - 86], b: 1 }, { hand: [94, G - 84], b: 1 }] }
    ],
    front: [J => kbChest(J.arms[1].h), J => kbChest(J.arms[1].h)],
    arrows: [[arrow(`M54 ${G - 92} Q34 ${G - 76} 40 ${G - 50}`)], [arrow(`M30 ${G - 40} L30 ${G - 92}`, true)]]
  },
  splitsquat: {
    hl: ['thigh'],
    poses: [
      { hip: [80, G - 62], legs: [{ foot: [44, G - 2], toe: [52, G], b: -1 }, { foot: [112, G], b: -1 }], arms: [{ hand: [92, G - 96], b: 1 }, { hand: [96, G - 94], b: 1 }] },
      { hip: [80, G - 34], legs: [{ foot: [44, G - 2], toe: [52, G], b: -1 }, { foot: [112, G], b: -1 }], arms: [{ hand: [92, G - 68], b: 1 }, { hand: [96, G - 66], b: 1 }] }
    ],
    arrows: [[arrow(`M134 ${G - 104} L134 ${G - 56}`)], [arrow(`M134 ${G - 56} L134 ${G - 104}`, true)]]
  },
  walkinglunge: {
    hl: ['thigh'], labels: ['SKRIDT 1', 'SKRIDT 2'],
    poses: [
      { hip: [56, G - 38], t: 2, legs: [{ foot: [18, G - 3], toe: [26, G], b: -1 }, { foot: [92, G], b: -1 }], arms: [{ hand: [68, G - 66], b: 1 }, { hand: [72, G - 64], b: 1 }] },
      { hip: [104, G - 38], t: 2, legs: [{ foot: [138, G], b: -1 }, { foot: [66, G - 3], toe: [74, G], b: -1 }], arms: [{ hand: [116, G - 66], b: 1 }, { hand: [120, G - 64], b: 1 }] }
    ],
    arrows: [[arrow(`M34 24 L124 24`)], [arrow(`M30 24 L120 24`)]]
  },
  stepup: {
    hl: ['thigh'],
    poses: [
      { hip: [66, G - 68], legs: [{ foot: [64, G], b: -1 }, { foot: [102, G - 30], b: -1 }], arms: [{ hand: [78, G - 90], b: 1 }, { hand: [82, G - 88], b: 1 }] },
      { hip: [126, G - 98], legs: [{ foot: [122, G - 30], b: -1 }, { foot: [130, G - 30], b: -1 }], arms: [{ hand: [138, G - 120], b: 1 }, { hand: [142, G - 118], b: 1 }] }
    ],
    back: [() => boxP(96, G - 30, 70, 30), () => boxP(96, G - 30, 70, 30)],
    arrows: [[arrow(`M30 ${G - 50} L30 ${G - 92}`)], [arrow(`M30 ${G - 50} L30 ${G - 92}`)]]
  },
  sumosquat: {
    hl: ['thigh'],
    poses: [
      { front: 1, hip: [85, G - 66], legs: [{ foot: [58, G], b: 1 }, { foot: [112, G], b: -1 }], arms: [{ hand: [80, G - 100], b: 1 }, { hand: [90, G - 100], b: -1 }] },
      { front: 1, hip: [85, G - 34], legs: [{ foot: [50, G], b: 1 }, { foot: [120, G], b: -1 }], arms: [{ hand: [80, G - 70], b: 1 }, { hand: [90, G - 70], b: -1 }] }
    ],
    arrows: [[arrow(`M140 ${G - 110} L140 ${G - 62}`)], [arrow(`M140 ${G - 62} L140 ${G - 110}`, true)]]
  },
  wallsit: {
    hl: ['thigh'], labels: ['STÅ', 'HOLD'],
    poses: [
      { hip: [44, G - 70], legs: [{ foot: [48, G] }, { foot: [54, G] }], arms: [{ hand: [58, G - 72], b: 1 }, { hand: [60, G - 70], b: 1 }] },
      { hip: [44, G - 36], legs: [{ knee: [80, G - 36], foot: [82, G] }, { knee: [78, G - 36], foot: [78, G] }], arms: [{ hand: [74, G - 42] }, { hand: [78, G - 40] }] }
    ],
    back: [() => wallP(14, 10), () => wallP(14, 10)],
    arrows: [[arrow(`M130 ${G - 100} L130 ${G - 50}`)], [guide(`M96 ${G - 36} L156 ${G - 36}`)]]
  },
  frontsquat: {
    hl: ['thigh'],
    poses: [
      { hip: [78, G - 70], legs: [{ foot: [75, G] }, { foot: [82, G] }], arms: [{ elbow: [100, G - 108], hand: [86, G - 122] }, { elbow: [102, G - 106], hand: [88, G - 120] }] },
      { hip: [54, G - 37], t: 18, legs: [{ foot: [82, G] }, { foot: [88, G] }], arms: [{ elbow: [96, G - 72], hand: [82, G - 88] }, { elbow: [98, G - 70], hand: [84, G - 86] }] }
    ],
    front: [J => plateEnd(J.arms[1].h), J => plateEnd(J.arms[1].h)],
    arrows: [[arrow(`M52 ${G - 92} Q32 ${G - 76} 38 ${G - 50}`)], [arrow(`M28 ${G - 40} L28 ${G - 92}`, true)]]
  },
  legpress: {
    hl: ['thigh'],
    poses: [
      { hip: [72, G - 26], t: -58, legs: [{ foot: [99, G - 62], b: -1 }, { foot: [101, G - 61], b: -1 }], arms: [{ hand: [80, G - 36] }, { hand: [84, G - 34] }] },
      { hip: [72, G - 26], t: -58, legs: [{ foot: [114, G - 82], b: -1 }, { foot: [116, G - 81], b: -1 }], arms: [{ hand: [80, G - 36] }, { hand: [84, G - 34] }] }
    ],
    back: [J => legPressMachine(J), J => legPressMachine(J)],
    arrows: [[arrow(`M128 ${G - 40} L146 ${G - 66}`)], [arrow(`M146 ${G - 66} L128 ${G - 40}`, true)]]
  },
  singlesquat: {
    hl: ['thigh'],
    poses: [
      { hip: [86, G - 70], legs: [{ foot: [124, G - 40], b: -1 }, { foot: [86, G], b: -1 }], arms: [{ hand: [116, G - 98], b: 1 }, { hand: [120, G - 96], b: 1 }] },
      { hip: [54, G - 46], t: 16, legs: [{ foot: [100, G - 36], b: -1 }, { foot: [82, G], b: -1 }], arms: [{ hand: [92, G - 78], b: 1 }, { hand: [96, G - 76], b: 1 }] }
    ],
    back: [() => boxP(10, G - 38, 52, 38), () => boxP(10, G - 38, 52, 38)],
    arrows: [[arrow(`M142 ${G - 120} L142 ${G - 70}`, false)], [arrow(`M142 ${G - 70} L142 ${G - 120}`, true)]]
  },
  hipthrust: {
    hl: ['thigh', 'torso'],
    poses: [
      { hip: [88, G - 12], sh: [40, G - 38], head: [23, G - 46], legs: [{ foot: [124, G], b: -1 }, { foot: [128, G], b: -1 }], arms: [{ hand: [100, G - 6] }, { hand: [104, G - 6] }] },
      { hip: [88, G - 42], sh: [40, G - 40], head: [23, G - 46], legs: [{ foot: [124, G], b: -1 }, { foot: [128, G], b: -1 }], arms: [{ hand: [100, G - 6] }, { hand: [104, G - 6] }] }
    ],
    back: [() => boxP(8, G - 34, 50, 34), () => boxP(8, G - 34, 50, 34)],
    front: [J => plateEnd([J.hip[0] + 2, J.hip[1] - 8]), J => plateEnd([J.hip[0] + 2, J.hip[1] - 8])],
    arrows: [[arrow(`M104 ${G - 30} L104 ${G - 64}`)], [arrow(`M104 ${G - 64} L104 ${G - 30}`, true)]]
  }
});

function stairsMachine(first) {
  const hi = G - 52, lo = G - 20;
  const y1 = first ? lo : hi, y2 = first ? hi : lo;
  return rect(112, G - 4, 50, 8, 3, '#34433B', 'none', 0) + bar([138, G], [138, G - 120], 7) + rect(122, G - 128, 34, 8, 3, '#34433B') +
    rect(60, y1 + 4, 44, 9, 3, '#34433B', COL.eqLine, 2) + rect(60, y2 + 4, 44, 9, 3, '#3B4A42', COL.eqLine, 2);
}
function plateEnd(c) { return circ(c[0], c[1], 14, '#25322B', COL.eqLine, 3) + circ(c[0], c[1], 3, COL.eqLine, 'none', 0); }
function legPressMachine(J) {
  const f = J.legs[1].f, hip = J.hip, sh = J.sh;
  return bar([88, G - 12], [150, G - 96], 6, '#2F3D35') + ln([hip[0] + 7, hip[1] + 10], [sh[0] + 7, sh[1] + 10], 13, '#34433B') +
    rect(hip[0] - 14, hip[1] + 7, 30, 7, 3.5, '#34433B') +
    ln([f[0] + 8, f[1] + 6], [f[0] + 20, f[1] + 15], 5, '#3B4A42') + ln([f[0] - 7, f[1] - 9], [f[0] + 9, f[1] + 11], 7, '#A9B8AE');
}
/* ---- Del 2: hofte, skub, træk ---- */
function benchLong(y) { return rect(14, y, 136, 9, 4, '#34433B', COL.eqLine, 2) + bar([30, y + 9], [30, G + 4], 5) + bar([134, y + 9], [134, G + 4], 5); }
function cableTower(x, pulleyY) { return rect(x - 8, 26, 18, G - 22, 4, '#1B2520', COL.eqLine, 2) + rect(x - 5, 40, 12, 80, 2, '#2A3830', 'none', 0) + circ(x - 8, pulleyY, 6, '#34433B'); }
function clapMarks(x, y) { return ln([x - 6, y - 10], [x - 10, y - 18], 2.6, COL.lime) + ln([x + 2, y - 12], [x + 2, y - 22], 2.6, COL.lime) + ln([x + 10, y - 10], [x + 15, y - 17], 2.6, COL.lime); }
function diamondIcon() {
  return `<path d="M34 54 L48 40 L62 54 L48 68 Z" fill="none" stroke="${COL.lime}" stroke-width="3" stroke-linejoin="round"/><circle cx="48" cy="54" r="3" fill="${COL.lime}"/>` + gtext(48, 86, 'DIAMANT', 'illu-note');
}

Object.assign(ILL, {
  slrdl: {
    hl: ['thigh', 'torso'],
    poses: [
      { hip: [78, G - 70], legs: [{ foot: [80, G - 8], b: -1, toe: [88, G - 6] }, { foot: [78, G] }], arms: [{ hand: [90, G - 28], b: 1 }, { hand: [92, G - 30], b: 1 }] },
      { hip: [84, G - 68], t: 84, legs: [{ foot: [18, G - 80], toe: [10, G - 76] }, { foot: [86, G] }], arms: [{ hand: [138, G - 30] }, { hand: [140, G - 32] }] }
    ],
    front: [J => dbEnd(J.arms[1].h), J => dbEnd(J.arms[1].h)],
    arrows: [[], [arrow(`M20 ${G - 112} Q40 ${G - 130} 70 ${G - 128}`, true)]]
  },
  kbswing: {
    hl: ['thigh', 'torso'], labels: ['NEDE', 'OPPE'],
    poses: [
      { hip: [56, G - 62], t: 48, legs: [{ foot: [84, G], b: -1 }, { foot: [90, G], b: -1 }], arms: [{ hand: [74, G - 46] }, { hand: [76, G - 44] }] },
      { hip: [80, G - 70], t: -3, legs: [{ foot: [78, G] }, { foot: [84, G] }], arms: [{ hand: [124, G - 114] }, { hand: [126, G - 112] }] }
    ],
    front: [J => kettlebell([J.arms[1].h[0] - 6, J.arms[1].h[1] + 2]), J => kettlebell([J.arms[1].h[0] + 6, J.arms[1].h[1] - 4])],
    arrows: [[arrow(`M110 ${G - 20} Q96 ${G - 70} 120 ${G - 100}`, true)], [arrow(`M30 ${G - 150} Q8 ${G - 90} 20 ${G - 40}`, true)]]
  },
  slbridge: {
    hl: ['thigh', 'torso'],
    poses: [
      { hip: [96, G - 3], sh: [48, G - 3], head: [28, G - 8], legs: [{ foot: [152, G - 66], b: -1 }, { foot: [128, G], b: -1 }], arms: [{ hand: [88, G] }, { hand: [92, G] }] },
      { hip: [94, G - 34], sh: [48, G - 4], head: [28, G - 8], legs: [{ foot: [150, G - 98], b: -1 }, { foot: [128, G], b: -1 }], arms: [{ hand: [88, G] }, { hand: [92, G] }] }
    ],
    back: [mat, mat],
    arrows: [[], [arrow(`M100 ${G - 22} L100 ${G - 58}`)]]
  },
  nordic: {
    hl: ['thigh', 'torso'],
    poses: [
      { hip: [86, G - 39], t: 0, legs: [{ knee: [86, G - 3], foot: [52, G - 4], toe: false }, { knee: [88, G - 3], foot: [54, G - 3], toe: false }], arms: [{ hand: [96, G - 82], b: 1 }, { hand: [100, G - 80], b: 1 }] },
      { hip: [86, G - 39], t: 76, legs: [{ knee: [86, G - 3], foot: [52, G - 4], toe: false }, { knee: [88, G - 3], foot: [54, G - 3], toe: false }], arms: [{ hand: [152, G - 4] }, { hand: [156, G - 2] }] }
    ],
    back: [() => nordicStrap(), () => nordicStrap()],
    arrows: [[], [arrow(`M100 ${G - 100} Q140 ${G - 100} 150 ${G - 60}`, true)]]
  },
  hamwalk: {
    hl: ['thigh'],
    poses: [
      { hip: [92, G - 34], sh: [44, G - 4], head: [25, G - 9], legs: [{ foot: [124, G - 2], b: -1 }, { foot: [128, G - 2], b: -1 }], arms: [{ hand: [74, G] }, { hand: [78, G] }] },
      { hip: [92, G - 34], sh: [44, G - 4], head: [25, G - 9], legs: [{ foot: [158, G - 2], b: -1 }, { foot: [162, G - 2], b: -1 }], arms: [{ hand: [74, G] }, { hand: [78, G] }] }
    ],
    back: [J => mat() + sliders(J), J => mat() + sliders(J)],
    arrows: [[arrow(`M126 ${G - 40} L150 ${G - 40}`)], [arrow(`M150 ${G - 40} L126 ${G - 40}`, true)]]
  },
  kneepushup: {
    hl: ['upper', 'fore', 'torso'],
    poses: [
      { hip: [82, G - 32], sh: [128, G - 42], head: [147, G - 48], legs: [{ knee: [56, G - 4], foot: [28, G - 18], toe: false }, { knee: [58, G - 4], foot: [30, G - 17], toe: false }], arms: [{ hand: [124, G], b: 1 }, { hand: [128, G], b: 1 }] },
      { hip: [84, G - 22], sh: [128, G - 18], head: [147, G - 20], legs: [{ knee: [56, G - 4], foot: [28, G - 16], toe: false }, { knee: [58, G - 4], foot: [30, G - 15], toe: false }], arms: [{ hand: [124, G], b: 1 }, { hand: [128, G], b: 1 }] }
    ],
    back: [mat, mat],
    arrows: [[arrow(`M160 ${G - 76} L160 ${G - 34}`)], [arrow(`M160 ${G - 34} L160 ${G - 76}`, true)]]
  },
  dbpress: {
    hl: ['upper', 'fore'],
    poses: [
      { hip: [80, G - 70], legs: [{ foot: [77, G] }, { foot: [84, G] }], arms: [{ elbow: [84, G - 98], hand: [92, G - 120] }, { elbow: [86, G - 96], hand: [94, G - 118] }] },
      { hip: [80, G - 70], legs: [{ foot: [77, G] }, { foot: [84, G] }], arms: [{ hand: [86, G - 160], b: -1 }, { hand: [90, G - 158], b: -1 }] }
    ],
    front: [J => dbEnd(J.arms[1].h), J => dbEnd(J.arms[1].h)],
    arrows: [[arrow(`M136 ${G - 100} L136 ${G - 146}`)], [arrow(`M136 ${G - 146} L136 ${G - 100}`, true)]]
  },
  dbbench: {
    hl: ['upper', 'fore'],
    poses: [
      { hip: [104, G - 34], sh: [56, G - 34], head: [37, G - 34], legs: [{ foot: [134, G], b: -1 }, { foot: [138, G], b: -1 }], arms: [{ hand: [64, G - 56], b: 1 }, { hand: [68, G - 54], b: 1 }] },
      { hip: [104, G - 34], sh: [56, G - 34], head: [37, G - 34], legs: [{ foot: [134, G], b: -1 }, { foot: [138, G], b: -1 }], arms: [{ hand: [58, G - 78] }, { hand: [62, G - 78] }] }
    ],
    back: [() => benchLong(G - 27), () => benchLong(G - 27)],
    front: [J => dbEnd(J.arms[1].h), J => dbEnd(J.arms[1].h)],
    arrows: [[], [arrow(`M92 ${G - 60} L92 ${G - 96}`)]]
  },
  pikepush: {
    hl: ['upper', 'fore', 'torso'],
    poses: [
      { hip: [78, G - 66], sh: [114, G - 44], head: [132, G - 36], legs: [{ foot: [42, G], toe: [50, G] }, { foot: [44, G], toe: [52, G] }], arms: [{ hand: [128, G], b: 1 }, { hand: [132, G], b: 1 }] },
      { hip: [78, G - 66], sh: [118, G - 24], head: [138, G - 14], legs: [{ foot: [42, G], toe: [50, G] }, { foot: [44, G], toe: [52, G] }], arms: [{ hand: [128, G], b: 1 }, { hand: [132, G], b: 1 }] }
    ],
    back: [mat, mat],
    arrows: [[arrow(`M60 ${G - 120} Q90 ${G - 130} 112 ${G - 84}`)], [arrow(`M112 ${G - 84} Q90 ${G - 130} 60 ${G - 120}`, true)]]
  },
  clappush: {
    hl: ['upper', 'fore', 'torso'], labels: ['NED', 'HOP'],
    poses: [
      { hip: [82, G - 22], sh: [128, G - 18], head: [147, G - 20], legs: [{ foot: [14, G - 6], toe: [20, G] }, { foot: [16, G - 6], toe: [22, G] }], arms: [{ hand: [124, G], b: 1 }, { hand: [128, G], b: 1 }] },
      { hip: [82, G - 44], sh: [130, G - 56], head: [149, G - 62], legs: [{ foot: [14, G - 26], toe: [20, G - 20] }, { foot: [16, G - 26], toe: [22, G - 20] }], arms: [{ hand: [146, G - 40], b: 1 }, { hand: [150, G - 40], b: 1 }] }
    ],
    back: [mat, mat],
    front: [() => '', () => clapMarks(148, G - 30)],
    arrows: [[], [arrow(`M30 ${G - 50} L30 ${G - 90}`)]]
  },
  dbrow: {
    hl: ['upper', 'torso'],
    poses: [
      { hip: [56, G - 66], t: 78, legs: [{ foot: [48, G], b: -1 }, { foot: [66, G], b: -1 }], arms: [{ hand: [120, G - 40] }, { hand: [104, G - 30] }] },
      { hip: [56, G - 66], t: 78, legs: [{ foot: [48, G], b: -1 }, { foot: [66, G], b: -1 }], arms: [{ hand: [120, G - 40] }, { hand: [74, G - 62], b: 1 }] }
    ],
    back: [() => boxP(104, G - 38, 58, 38), () => boxP(104, G - 38, 58, 38)],
    front: [J => dbEnd(J.arms[1].h), J => dbEnd(J.arms[1].h)],
    arrows: [[], [arrow(`M92 ${G - 20} Q70 ${G - 38} 76 ${G - 52}`, true)]]
  },
  invrow: {
    hl: ['upper', 'torso'],
    poses: [
      { hip: [69, G - 26], sh: [118, G - 46], legs: [{ knee: [44, G - 16], foot: [20, G - 6], toe: false }, { knee: [46, G - 16], foot: [22, G - 5], toe: false }], arms: [{ hand: [124, G - 92] }, { hand: [126, G - 92] }] },
      { hip: [70, G - 40], sh: [118, G - 74], legs: [{ knee: [45, G - 24], foot: [20, G - 6], toe: false }, { knee: [47, G - 23], foot: [22, G - 5], toe: false }], arms: [{ hand: [126, G - 92], b: 1 }, { hand: [128, G - 92], b: 1 }] }
    ],
    back: [() => invRack(), () => invRack()],
    arrows: [[], [arrow(`M20 ${G - 100} L20 ${G - 130}`)]]
  },
  pullup: {
    hl: ['upper', 'torso'],
    poses: [
      { hip: [88, G - 52], t: 0, legs: [{ foot: [68, G - 12], b: 1, toe: false }, { foot: [74, G - 10], b: 1, toe: false }], arms: [{ hand: [112, 30] }, { hand: [110, 30] }] },
      { hip: [90, G - 82], t: 0, legs: [{ foot: [70, G - 40], b: 1, toe: false }, { foot: [76, G - 38], b: 1, toe: false }], arms: [{ hand: [112, 30], b: 1 }, { hand: [110, 30], b: 1 }] }
    ],
    back: [() => pullBarSide(), () => pullBarSide()],
    arrows: [[], [arrow(`M150 ${G - 50} L150 ${G - 110}`)]]
  },
  bandpull: {
    hl: ['upper', 'torso'],
    poses: [
      { front: 1, hip: [85, G - 70], legs: [{ foot: [78, G], b: 1 }, { foot: [92, G], b: -1 }], arms: [{ hand: [76, G - 108], b: 1 }, { hand: [94, G - 108], b: -1 }] },
      { front: 1, hip: [85, G - 70], legs: [{ foot: [78, G], b: 1 }, { foot: [92, G], b: -1 }], arms: [{ hand: [38, G - 114], b: 1 }, { hand: [132, G - 114], b: -1 }] }
    ],
    front: [J => bandP(J.arms[0].h, J.arms[1].h), J => bandP(J.arms[0].h, J.arms[1].h)],
    arrows: [[], [arrow(`M30 ${G - 134} L8 ${G - 134}`), arrow(`M140 ${G - 134} L162 ${G - 134}`)]]
  },
  cablerow: {
    hl: ['upper', 'torso'],
    poses: [
      { hip: [50, G - 16], t: -4, legs: [{ foot: [112, G - 22], b: -1 }, { foot: [114, G - 20], b: -1 }], arms: [{ hand: [94, G - 62], b: 1 }, { hand: [96, G - 60], b: 1 }] },
      { hip: [50, G - 16], t: -14, legs: [{ foot: [112, G - 22], b: -1 }, { foot: [114, G - 20], b: -1 }], arms: [{ hand: [52, G - 50], b: 1 }, { hand: [56, G - 48], b: 1 }] }
    ],
    back: [J => cableRowStation(J), J => cableRowStation(J)],
    front: [J => ln(J.arms[1].h, [136, G - 58], 2.2, COL.eqLine) + rect(J.arms[1].h[0] - 2, J.arms[1].h[1] - 6, 4, 12, 2, '#A9B8AE', 'none', 0), J => ln(J.arms[1].h, [136, G - 58], 2.2, COL.eqLine) + rect(J.arms[1].h[0] - 2, J.arms[1].h[1] - 6, 4, 12, 2, '#A9B8AE', 'none', 0)],
    arrows: [[arrow(`M62 ${G - 118} L102 ${G - 118}`)], [arrow(`M102 ${G - 118} L58 ${G - 118}`, true)]]
  },
  facepull: {
    hl: ['upper'],
    poses: [
      { hip: [66, G - 70], t: -4, legs: [{ foot: [63, G] }, { foot: [70, G] }], arms: [{ hand: [112, G - 120], b: 1 }, { hand: [114, G - 118], b: 1 }] },
      { hip: [66, G - 70], t: -4, legs: [{ foot: [63, G] }, { foot: [70, G] }], arms: [{ elbow: [78, G - 134], hand: [96, G - 122] }, { elbow: [80, G - 130], hand: [98, G - 120] }] }
    ],
    back: [() => cableTower(150, G - 120), () => cableTower(150, G - 120)],
    front: [J => ln(J.arms[1].h, [144, G - 120], 2.2, COL.eqLine), J => ln(J.arms[1].h, [144, G - 120], 2.2, COL.eqLine)],
    arrows: [[], [arrow(`M118 ${G - 150} L92 ${G - 150}`, true)]]
  },
  superman: {
    hl: ['torso', 'thigh'],
    poses: [
      { hip: [76, G - 9], sh: [118, G - 9], head: [138, G - 10], legs: [{ knee: [48, G - 9], foot: [20, G - 9], toe: false }, { knee: [50, G - 7], foot: [22, G - 7], toe: false }], arms: [{ elbow: [140, G - 9], hand: [160, G - 8] }, { elbow: [142, G - 7], hand: [162, G - 6] }] },
      { hip: [76, G - 12], sh: [118, G - 24], head: [137, G - 32], legs: [{ knee: [48, G - 22], foot: [20, G - 34], toe: false }, { knee: [50, G - 20], foot: [22, G - 32], toe: false }], arms: [{ elbow: [140, G - 34], hand: [160, G - 46] }, { elbow: [142, G - 32], hand: [162, G - 44] }] }
    ],
    back: [mat, mat],
    arrows: [[], [arrow(`M100 ${G - 50} L100 ${G - 78}`)]]
  }
});
function nordicStrap() { return rect(40, G - 14, 22, 12, 4, '#3B4A42', COL.eqLine, 2) + ln([50, G - 14], [50, G - 24], 2, COL.eqLine); }
function sliders(J) { return ellipseS(J.legs[0].f) + ellipseS(J.legs[1].f); }
function ellipseS(f) { return `<ellipse cx="${r1(f[0] + 2)}" cy="${G + 1}" rx="12" ry="4" fill="${COL.lime}" opacity=".35"/>`; }
function invRack() { return bar([146, G + 4], [146, G - 100], 7) + ln([126, G - 92], [146, G - 92], 5, '#A9B8AE') + circ(126, G - 92, 5, '#A9B8AE', 'none', 0) + rect(10, G + 1, 150, 4, 2, '#24342B', 'none', 0); }
function pullBarSide() { return bar([144, G + 4], [144, 22], 7) + ln([112, 30], [144, 30], 6, '#A9B8AE') + circ(112, 30, 5.5, '#A9B8AE', 'none', 0); }
function pullBar() { return bar([30, G + 4], [30, 16], 6) + bar([140, G + 4], [140, 16], 6) + bar([30, 16], [140, 16], 7, '#A9B8AE'); }
function cableRowStation(J) {
  return rect(8, G - 6, 36, 6, 3, '#34433B', 'none', 0) + rect(J.hip[0] - 16, J.hip[1] + 6, 32, 9, 4, '#34433B') + rect(100, G - 38, 8, 38, 2, '#2A3830', COL.eqLine, 1.5) +
    rect(128, 30, 22, G - 26, 4, '#1B2520', COL.eqLine, 2) + rect(132, 44, 14, 70, 2, '#2A3830', 'none', 0) + circ(133, G - 58, 6, '#34433B');
}
/* ---- Del 3: core, bære, spring, læg ---- */
function wheelP(J) { const h = J.arms[1].h; return circ(h[0], G - 12, 12, '#18221D', COL.eqLine, 3) + circ(h[0], G - 12, 3, COL.eqLine, 'none', 0); }
function boxBench(x, w) { return rect(x, G - 38, w, 38, 5, '#2A3830', COL.eqLine, 2); }
function towerR(x) { return bar([x, G + 4], [x, 24], 8); }
function russianPanel(i) {
  const dir = i === 0 ? 1 : -1, a = rad(26 * dir);
  const cx = 85, sy = 98;
  const L = [cx - 24 * Math.cos(a), sy + 24 * Math.sin(a) * -1], R = [cx + 24 * Math.cos(a), sy - 24 * Math.sin(a) * -1];
  const ball = [cx + dir * 46, 112];
  const near = dir === 1 ? R : L;
  let s = `<text x="85" y="20" text-anchor="middle" class="illu-note">SET OPPEFRA</text>`;
  s += ln([78, 138], [64, 172], 10, COL.far) + ln([92, 138], [106, 172], 10, COL.far);
  s += ln([85, 132], [85, 106], 17, COL.near);
  s += ln(L, R, 15, COL.near);
  s += `<circle cx="${r1(cx + dir * 3)}" cy="${sy - 14}" r="11" fill="${COL.near}" stroke="#111A15" stroke-width="2.5"/>`;
  s += ln(near, ball, 8, COL.near) + ln(dir === 1 ? L : R, ball, 8, COL.far);
  s += medball(ball, 12);
  s += arrow(dir === 1 ? `M96 54 Q130 50 140 74` : `M74 54 Q40 50 30 74`, dir === 1);
  return s;
}
function copenBench() { return boxBench(124, 44); }

Object.assign(ILL, {
  hollow: {
    hl: ['torso', 'thigh'], labels: ['FLAD', 'BANAN'],
    poses: [
      { hip: [100, G - 9], sh: [52, G - 9], head: [33, G - 11], legs: [{ knee: [130, G - 9], foot: [158, G - 9], toe: false }, { knee: [130, G - 7], foot: [158, G - 7], toe: false }], arms: [{ elbow: [34, G - 8], hand: [12, G - 7] }, { elbow: [34, G - 6], hand: [12, G - 5] }] },
      { hip: [100, G - 8], sh: [58, G - 26], head: [41, G - 35], legs: [{ knee: [130, G - 18], foot: [158, G - 32], toe: false }, { knee: [130, G - 16], foot: [158, G - 30], toe: false }], arms: [{ elbow: [44, G - 40], hand: [26, G - 52] }, { elbow: [44, G - 38], hand: [26, G - 50] }] }
    ],
    back: [mat, mat],
    arrows: [[], [arrow(`M100 ${G - 60} L100 ${G - 40}`, true)]]
  },
  mtnclimber: {
    hl: ['torso', 'thigh'],
    poses: [
      { hip: [84, G - 38], sh: [128, G - 46], head: [147, G - 52], legs: [{ foot: [20, G - 8], knee: [52, G - 24], toe: [14, G] }, { knee: [112, G - 40], foot: [100, G - 12], toe: [108, G - 8] }], arms: [{ hand: [126, G] }, { hand: [130, G] }] },
      { hip: [84, G - 38], sh: [128, G - 46], head: [147, G - 52], legs: [{ knee: [112, G - 40], foot: [100, G - 12], toe: [108, G - 8] }, { foot: [20, G - 8], knee: [52, G - 24], toe: [14, G] }], arms: [{ hand: [126, G] }, { hand: [130, G] }] }
    ],
    back: [mat, mat],
    arrows: [[arrow(`M116 ${G - 62} L96 ${G - 62}`, true)], [arrow(`M116 ${G - 62} L96 ${G - 62}`, true)]]
  },
  russiantwist: { custom: russianPanel, labels: ['TIL HØJRE', 'TIL VENSTRE'] },
  legraise: {
    hl: ['thigh', 'torso'],
    poses: [
      { hip: [92, G - 9], sh: [44, G - 9], head: [25, G - 11], legs: [{ knee: [126, G - 17], foot: [160, G - 26], toe: false }, { knee: [126, G - 15], foot: [160, G - 24], toe: false }], arms: [{ hand: [70, G - 3] }, { hand: [74, G - 3] }] },
      { hip: [92, G - 9], sh: [44, G - 9], head: [25, G - 11], legs: [{ knee: [94, G - 44], foot: [95, G - 78], toe: false }, { knee: [96, G - 44], foot: [97, G - 78], toe: false }], arms: [{ hand: [70, G - 3] }, { hand: [74, G - 3] }] }
    ],
    back: [mat, mat],
    arrows: [[arrow(`M130 ${G - 56} Q114 ${G - 66} 100 ${G - 70}`)], []]
  },
  bicycle: {
    hl: ['torso', 'thigh'], labels: ['HØJRE KNÆ', 'VENSTRE KNÆ'],
    poses: [
      { hip: [96, G - 9], sh: [58, G - 30], head: [42, G - 40], legs: [{ foot: [152, G - 14], knee: [124, G - 12], toe: false }, { knee: [104, G - 52], foot: [124, G - 28], toe: [132, G - 26] }], arms: [{ elbow: [44, G - 60], hand: [38, G - 48] }, { elbow: [70, G - 58], hand: [44, G - 50] }] },
      { hip: [96, G - 9], sh: [58, G - 30], head: [42, G - 40], legs: [{ knee: [104, G - 52], foot: [124, G - 28], toe: [132, G - 26] }, { foot: [152, G - 14], knee: [124, G - 12], toe: false }], arms: [{ elbow: [44, G - 60], hand: [38, G - 48] }, { elbow: [70, G - 58], hand: [44, G - 50] }] }
    ],
    back: [mat, mat],
    arrows: [[arrow(`M74 ${G - 52} Q96 ${G - 72} 108 ${G - 62}`)], [arrow(`M74 ${G - 52} Q96 ${G - 72} 108 ${G - 62}`)]]
  },
  abwheel: {
    hl: ['torso', 'upper'], labels: ['SAMMEN', 'RUL UD'],
    poses: [
      { hip: [60, G - 38], t: 64, legs: [{ knee: [57, G - 3], foot: [22, G - 6], toe: false }, { knee: [59, G - 3], foot: [24, G - 4], toe: false }], arms: [{ hand: [106, G - 14] }, { hand: [108, G - 14] }] },
      { hip: [62, G - 34], t: 82, legs: [{ knee: [57, G - 3], foot: [22, G - 6], toe: false }, { knee: [59, G - 3], foot: [24, G - 4], toe: false }], arms: [{ hand: [150, G - 14] }, { hand: [152, G - 14] }] }
    ],
    back: [mat, mat],
    front: [J => wheelP(J), J => wheelP(J)],
    arrows: [[], [arrow(`M92 ${G - 74} L136 ${G - 74}`)]]
  },
  copenhagen: {
    hl: ['torso', 'thigh'], labels: ['LAV', 'HOLD'],
    poses: [
      { hip: [92, G - 17], sh: [36, G - 24], head: [18, G - 32], legs: [{ foot: [112, G - 4], b: -1, toe: false }, { foot: [158, G - 44], b: -1, toe: false }], arms: [{ elbow: [36, G], hand: [14, G] }, { hand: [38, G - 70] }] },
      { hip: [92, G - 34], sh: [36, G - 24], head: [18, G - 32], legs: [{ foot: [116, G - 6], b: -1, toe: false }, { foot: [158, G - 42], b: -1, toe: false }], arms: [{ elbow: [36, G], hand: [14, G] }, { hand: [38, G - 70] }] }
    ],
    back: [() => mat() + copenBench(), () => mat() + copenBench()],
    arrows: [[], [arrow(`M92 ${G - 62} L92 ${G - 46}`, true)]]
  },
  bandpallof: { custom: bandPallofPanel, labels: ['START', 'SLUT'] },
  woodchop: {
    hl: ['torso', 'upper'], labels: ['HØJT', 'LAVT'],
    poses: [
      { hip: [78, G - 70], t: -6, legs: [{ foot: [75, G] }, { foot: [82, G] }], arms: [{ hand: [112, G - 150], b: -1 }, { hand: [116, G - 148], b: -1 }] },
      { hip: [70, G - 54], t: 36, legs: [{ foot: [86, G], b: -1 }, { foot: [92, G], b: -1 }], arms: [{ hand: [70, G - 40], b: 1 }, { hand: [74, G - 38], b: 1 }] }
    ],
    back: [() => towerR(152), () => towerR(152)],
    front: [J => ln(J.arms[1].h, [146, G - 164], 2.2, COL.eqLine), J => ln(J.arms[1].h, [146, G - 164], 2.2, COL.eqLine)],
    arrows: [[], [arrow(`M122 ${G - 140} L74 ${G - 62}`, true)]]
  },
  plankreach: {
    hl: ['torso', 'upper'], labels: ['PLANKE', 'RØR SKULDER'],
    poses: [
      { hip: [84, G - 40], sh: [128, G - 48], head: [147, G - 54], legs: [{ knee: [50, G - 22], foot: [16, G - 7], toe: [10, G] }, { knee: [52, G - 20], foot: [18, G - 6], toe: [12, G] }], arms: [{ hand: [126, G] }, { hand: [130, G] }] },
      { hip: [84, G - 40], sh: [128, G - 48], head: [147, G - 54], legs: [{ knee: [50, G - 22], foot: [16, G - 7], toe: [10, G] }, { knee: [52, G - 20], foot: [18, G - 6], toe: [12, G] }], arms: [{ hand: [126, G] }, { elbow: [150, G - 36], hand: [138, G - 56] }] }
    ],
    back: [mat, mat],
    arrows: [[], [arrow(`M158 ${G - 28} Q160 ${G - 60} 144 ${G - 72}`, true)]]
  },
  suitcase: {
    hl: ['torso', 'fore'], labels: ['STÅ', 'GÅ'],
    poses: [
      { hip: [80, G - 70], legs: [{ foot: [77, G] }, { foot: [84, G] }], arms: [{ hand: [64, G - 60], b: 1 }, { hand: [86, G - 52] }] },
      { hip: [80, G - 70], legs: [{ foot: [50, G] }, { foot: [110, G] }], arms: [{ hand: [48, G - 78], b: 1 }, { hand: [86, G - 52] }] }
    ],
    front: [J => kettlebell(J.arms[1].h), J => kettlebell(J.arms[1].h)],
    arrows: [[], [arrow(`M30 24 L100 24`)]]
  },
  ohcarry: {
    hl: ['torso', 'upper'], labels: ['STÅ', 'GÅ'],
    poses: [
      { hip: [78, G - 70], legs: [{ foot: [75, G] }, { foot: [82, G] }], arms: [{ hand: [60, G - 62], b: 1 }, { hand: [86, G - 160], b: -1 }] },
      { hip: [78, G - 70], legs: [{ foot: [50, G] }, { foot: [108, G] }], arms: [{ hand: [46, G - 74], b: 1 }, { hand: [86, G - 160], b: -1 }] }
    ],
    front: [J => ohBell(J.arms[1].h), J => ohBell(J.arms[1].h)],
    arrows: [[], [arrow(`M30 24 L100 24`)]]
  },
  bearcrawl: {
    hl: ['torso', 'upper'], labels: ['START', 'KRYB'],
    poses: [
      { hip: [72, G - 50], sh: [118, G - 54], head: [136, G - 62], legs: [{ knee: [96, G - 22], foot: [64, G - 8], toe: [58, G - 2] }, { knee: [98, G - 20], foot: [66, G - 6], toe: [60, G] }], arms: [{ hand: [122, G] }, { hand: [126, G] }] },
      { hip: [72, G - 50], sh: [118, G - 54], head: [136, G - 62], legs: [{ knee: [112, G - 26], foot: [84, G - 8], toe: [78, G - 2] }, { knee: [98, G - 20], foot: [66, G - 6], toe: [60, G] }], arms: [{ hand: [122, G] }, { hand: [150, G - 6] }] }
    ],
    back: [mat, mat],
    arrows: [[], [arrow(`M70 ${G - 90} L120 ${G - 90}`)]]
  }
});
function ohBell(h) { return circ(h[0] + 12, h[1] + 2, 10, '#34433B', COL.eqLine, 2.5) + `<path d="M${h[0] + 5} ${h[1] - 4} Q${h[0] + 12} ${h[1] - 15} ${h[0] + 19} ${h[1] - 4}" fill="none" stroke="${COL.eqLine}" stroke-width="3" stroke-linecap="round"/>`; }
function bandPallofPanel(i) {
  let s = pallofPanel(i);
  s = s.replace(/<rect x="8" y="54"[^>]*\/>/, `<rect x="14" y="66" width="10" height="60" rx="3" fill="#1B2520" stroke="${COL.eqLine}" stroke-width="2"/><circle cx="28" cy="96" r="5" fill="#FF9A3D"/>`);
  s = s.replace('stroke="#8FA096" stroke-width="2.2"', 'stroke="#FF9A3D" stroke-width="3.2"');
  return s;
}
/* ---- Del 4: spring, læg, hurtige fødder ---- */
function ballS(c, r) { r = r || 7; return circ(c[0], c[1], r, '#C8F03C', '#8FA83A', 2) + `<path d="M${c[0] - r} ${c[1]} Q${c[0]} ${c[1] - r * .8} ${c[0] + r} ${c[1]}" fill="none" stroke="#6D8A1A" stroke-width="1.3"/>`; }
function impact(x, y) { return ln([x - 20, y], [x - 30, y - 6], 2.6, COL.lime) + ln([x + 20, y], [x + 30, y - 6], 2.6, COL.lime) + ln([x, y - 8], [x, y - 18], 2.6, COL.lime); }
function speedLines(x, y, n) { let s = ''; for (let i = 0; i < (n || 3); i++) s += ln([x - i * 0, y + i * 9], [x - 16, y + i * 9], 2.4, COL.lime); return s; }
function cone(x, y, c) { return `<path d="M${x - 9} ${y + 8} L${x} ${y - 10} L${x + 9} ${y + 8} Z" fill="${c || '#FF9A3D'}" stroke="#111A15" stroke-width="1.5" stroke-linejoin="round"/>`; }
function ctext(x, y, s) { return `<text x="${x}" y="${y}" text-anchor="middle" fill="#C8F03C" style="font:800 15px var(--font-d,sans-serif)">${s}</text>`; }
function foot(x, y) { return `<ellipse cx="${x}" cy="${y}" rx="8" ry="12" fill="${COL.lime}" opacity=".92"/>`; }
function ladderPanel(i) {
  const x0 = 54, x1 = 116, ys = [24, 56, 88, 120, 152, 184];
  let s = ln([x0, 24], [x0, 184], 4, COL.eqLine) + ln([x1, 24], [x1, 184], 4, COL.eqLine);
  ys.forEach(y => { s += ln([x0, y], [x1, y], 4, COL.eqLine); });
  if (i === 0) { s += foot(70, 104) + foot(100, 104); s += arrow('M85 70 L85 44') ; s += gtext(85, 204, '') }
  else { s += foot(32, 136) + foot(138, 136); s += foot(70, 72) + foot(100, 72); s += arrow('M85 56 L85 40', true); }
  return s;
}
function tdrillPanel(i) {
  const A = [85, 164], B = [85, 108], C = [28, 108], D = [142, 108];
  let s = cone(A[0], A[1]) + cone(B[0], B[1]) + cone(C[0], C[1]) + cone(D[0], D[1]);
  s += ctext(A[0], A[1] + 24, 'A') + ctext(B[0], B[1] - 16, 'B') + ctext(C[0], C[1] - 16, 'C') + ctext(D[0], D[1] - 16, 'D');
  if (i === 0) { s += `<text x="85" y="28" text-anchor="middle" class="illu-note">5 M OG 2,5 M</text>` + ln([A[0], A[1] - 12], [B[0], B[1] + 12], 1.5, '#2D3D34') + ln([C[0] + 10, C[1]], [D[0] - 10, D[1]], 1.5, '#2D3D34'); }
  else {
    s += arrow(`M85 150 L85 126`) + arrow(`M72 108 L44 108`) + arrow(`M40 96 L128 96`, true) + arrow(`M128 120 L100 120`, true);
    s += `<text x="85" y="28" text-anchor="middle" class="illu-note">SPRINT · SIDESTEP</text>`;
  }
  return s;
}
function hips9090Panel(i) {
  const d = i === 0 ? 1 : -1;
  let s = `<text x="85" y="22" text-anchor="middle" class="illu-note">SET OPPEFRA</text>`;
  s += ln([85 + d * 2, 148], [85, 108], 17, COL.near);
  s += ln([68, 108], [102, 108], 15, COL.near) + `<circle cx="${85 + d * 2}" cy="92" r="11" fill="${COL.near}" stroke="#111A15" stroke-width="2.5"/>`;
  // forreste ben (90 grader): lår ud til siden, læg frem
  s += ln([85 - d * 4, 150], [85 - d * 44, 150], 10, COL.near) + ln([85 - d * 44, 150], [85 - d * 44, 112], 9, COL.near);
  // bageste ben: lår ud til den anden side, læg bagud
  s += ln([85 + d * 4, 152], [85 + d * 44, 152], 10, COL.far) + ln([85 + d * 44, 152], [85 + d * 44, 190], 9, COL.far);
  s += ln([85 - d * 4, 150], [85 - d * 4, 150], 1, COL.near);
  s += arrow(i === 0 ? 'M40 60 Q85 40 130 60' : 'M130 60 Q85 40 40 60', i === 1);
  return s;
}
function openBookPanel(i) {
  let s = `<text x="85" y="20" text-anchor="middle" class="illu-note">SET OPPEFRA</text>`;
  s += `<rect x="20" y="168" width="130" height="5" rx="2" fill="#24342B"/>`;
  s += ln([110, 108], [124, 70], 10, COL.far) + ln([124, 70], [96, 60], 9, COL.far);
  s += ln([112, 112], [132, 84], 11, COL.near) + ln([132, 84], [106, 70], 10, COL.near);
  s += ln([48, 108], [104, 108], 17, COL.near);
  s += `<circle cx="32" cy="108" r="11" fill="${COL.near}" stroke="#111A15" stroke-width="2.5"/>`;
  s += ln([54, 100], [54, 42], 8, COL.far);   // nederste arm
  if (i === 0) s += ln([54, 106], [54, 48], 8, COL.near) + arrow('M84 50 Q96 76 84 100', false);
  else s += ln([54, 106], [54, 164], 8, COL.near) + arrow('M84 100 Q104 130 84 156', true);
  s += `<circle cx="54" cy="${i === 0 ? 44 : 166}" r="4.5" fill="${COL.near}"/>`;
  return s;
}
function visualPanel(i) {
  const J = joints({ hip: [78, G - 8], t: 0, legs: [{ knee: [106, G - 14], foot: [70, G - 3], toe: false }, { knee: [102, G - 18], foot: [88, G - 3], toe: false }], arms: [{ hand: [100, G - 28], b: 1 }, { hand: [104, G - 24], b: 1 }] });
  let s = `<line x1="10" y1="${G + 5}" x2="160" y2="${G + 5}" stroke="#2D3D34" stroke-width="2"/>` + figure(J, i === 0 ? [] : ['torso']);
  const hx = J.head[0], hy = J.head[1];
  s += `<path d="M${r1(hx + 3)} ${r1(hy - 1)} q4 4 8 0" fill="none" stroke="#111A15" stroke-width="2" stroke-linecap="round"/>`;
  if (i === 1) {
    s += `<circle cx="${r1(hx + 14)}" cy="${r1(hy - 24)}" r="3.5" fill="none" stroke="${COL.lime}" stroke-width="2"/><circle cx="${r1(hx + 22)}" cy="${r1(hy - 36)}" r="5" fill="none" stroke="${COL.lime}" stroke-width="2"/>`;
    s += `<ellipse cx="108" cy="52" rx="56" ry="38" fill="#16201B" stroke="${COL.lime}" stroke-width="2.5"/>`;
    s += `<path d="M78 76 V48 H138 V76" fill="none" stroke="#EEF3EC" stroke-width="3.5" stroke-linejoin="round"/><path d="M82 48 V76 M134 48 V76" stroke="#7E8C83" stroke-width="1.5"/>`;
    s += ballS([112, 66], 7) + `<path d="M118 62 L136 52" stroke="${COL.lime}" stroke-width="2" stroke-dasharray="3 4" fill="none"/>`;
  }
  return s;
}

Object.assign(ILL, {
  diamondpush: {
    hl: ['upper', 'fore', 'torso'],
    poses: ILL.pushup.poses, back: [mat, mat], front: [() => diamondIcon(), () => diamondIcon()], arrows: ILL.pushup.arrows
  },
  dbrdl: {
    hl: ['thigh', 'torso'],
    poses: ILL.rdl.poses, front: [J => dbEnd(J.arms[1].h), J => dbEnd(J.arms[1].h)], arrows: ILL.rdl.arrows
  },
  skater: {
    hl: ['thigh', 'shin'], labels: ['VENSTRE BEN', 'HØJRE BEN'],
    poses: [
      { front: 1, hip: [50, G - 68], t: 6, legs: [{ foot: [52, G], b: 1 }, { foot: [86, G - 14], b: -1 }], arms: [{ hand: [76, G - 84], b: -1 }, { hand: [28, G - 70], b: 1 }] },
      { front: 1, hip: [120, G - 68], t: -6, legs: [{ foot: [84, G - 14], b: 1 }, { foot: [118, G], b: -1 }], arms: [{ hand: [94, G - 70], b: 1 }, { hand: [144, G - 84], b: -1 }] }
    ],
    back: [() => `<ellipse cx="52" cy="${G + 5}" rx="16" ry="3" fill="${COL.lime}" opacity=".2"/>`, () => `<ellipse cx="118" cy="${G + 5}" rx="16" ry="3" fill="${COL.lime}" opacity=".2"/>`],
    arrows: [[arrow(`M54 22 L130 22`)], [arrow(`M130 22 L54 22`, true)]]
  },
  boxjump: {
    hl: ['thigh', 'shin'],
    poses: [
      { hip: [50, G - 40], t: 32, legs: [{ foot: [72, G], b: -1 }, { foot: [78, G], b: -1 }], arms: [{ hand: [28, G - 56], b: 1 }, { hand: [32, G - 54], b: 1 }] },
      { hip: [128, G - 82], t: 6, legs: [{ foot: [124, G - 28], b: -1 }, { foot: [132, G - 28], b: -1 }], arms: [{ hand: [150, G - 112], b: 1 }, { hand: [154, G - 110], b: 1 }] }
    ],
    back: [() => boxP(100, G - 28, 68, 28), () => boxP(100, G - 28, 68, 28)],
    arrows: [[arrow(`M70 ${G - 100} Q100 ${G - 150} 130 ${G - 130}`)], []]
  },
  broadjump: {
    hl: ['thigh', 'shin'], labels: ['AFSÆT', 'LAND'],
    poses: [
      { hip: [50, G - 40], t: 32, legs: [{ foot: [72, G], b: -1 }, { foot: [78, G], b: -1 }], arms: [{ hand: [28, G - 56], b: 1 }, { hand: [32, G - 54], b: 1 }] },
      { hip: [96, G - 72], t: 62, legs: [{ foot: [48, G - 56], b: -1 }, { foot: [54, G - 50], b: -1 }], arms: [{ hand: [152, G - 126], b: 1 }, { hand: [156, G - 122], b: 1 }] }
    ],
    arrows: [[arrow(`M60 ${G - 100} Q100 ${G - 140} 140 ${G - 100}`)], [guide(`M20 ${G + 1} L156 ${G + 1}`)]]
  },
  tuckjump: {
    hl: ['thigh', 'shin'], labels: ['SIT NED', 'KNÆ OP'],
    poses: [
      { hip: [56, G - 37], t: 30, legs: [{ foot: [84, G] }, { foot: [90, G] }], arms: [{ hand: [60, G - 42] }, { hand: [64, G - 40] }] },
      { hip: [80, G - 98], t: 8, legs: [{ knee: [108, G - 98], foot: [98, G - 66] }, { knee: [110, G - 92], foot: [100, G - 60] }], arms: [{ hand: [116, G - 118], b: 1 }, { hand: [118, G - 112], b: 1 }] }
    ],
    back: [null, () => `<ellipse cx="86" cy="${G + 5}" rx="20" ry="3.5" fill="${COL.lime}" opacity=".16"/>`],
    arrows: [[arrow(`M124 ${G - 30} L124 ${G - 104}`)], [arrow(`M140 ${G - 104} L140 ${G - 30}`, true)]]
  },
  pogo: {
    hl: ['shin', 'thigh'], labels: ['PÅ TÆERNE', 'HOP'],
    poses: [
      { hip: [80, G - 66], legs: [{ foot: [79, G - 8], toe: [88, G - 1] }, { foot: [85, G - 8], toe: [94, G - 1] }], arms: [{ hand: [92, G - 52], b: 1 }, { hand: [96, G - 50], b: 1 }] },
      { hip: [80, G - 86], legs: [{ foot: [79, G - 28], toe: [88, G - 20] }, { foot: [85, G - 28], toe: [94, G - 20] }], arms: [{ hand: [92, G - 72], b: 1 }, { hand: [96, G - 70], b: 1 }] }
    ],
    back: [null, () => `<ellipse cx="86" cy="${G + 5}" rx="22" ry="3.5" fill="${COL.lime}" opacity=".18"/>`],
    front: [() => '', () => speedLines(52, G - 20, 3)],
    arrows: [[arrow(`M124 ${G - 20} L124 ${G - 46}`)], [arrow(`M124 ${G - 46} L124 ${G - 20}`, true)]]
  },
  medslam: {
    hl: ['upper', 'torso', 'thigh'], labels: ['OVER HOVEDET', 'SLAM'],
    poses: [
      { hip: [76, G - 70], t: -6, legs: [{ foot: [73, G] }, { foot: [80, G] }], arms: [{ hand: [84, G - 142], b: -1 }, { hand: [86, G - 140], b: -1 }] },
      { hip: [58, G - 48], t: 52, legs: [{ foot: [78, G], b: -1 }, { foot: [84, G], b: -1 }], arms: [{ hand: [112, G - 26] }, { hand: [114, G - 24] }] }
    ],
    front: [J => medball([J.arms[1].h[0] + 4, J.arms[1].h[1] - 18], 12), J => medball([J.arms[1].h[0] + 8, G - 12], 12) + impact(J.arms[1].h[0] + 8, G + 2)],
    arrows: [[], [arrow(`M70 ${G - 150} Q112 ${G - 140} 124 ${G - 74}`)]]
  },
  medthrow: {
    hl: ['upper', 'torso'], labels: ['VED BRYSTET', 'KAST'],
    poses: [
      { hip: [66, G - 68], t: -6, legs: [{ foot: [52, G], b: -1 }, { foot: [86, G], b: -1 }], arms: [{ hand: [98, G - 100], b: 1 }, { hand: [100, G - 98], b: 1 }] },
      { hip: [70, G - 66], t: 10, legs: [{ foot: [50, G], b: -1 }, { foot: [88, G], b: -1 }], arms: [{ hand: [124, G - 114] }, { hand: [126, G - 112] }] }
    ],
    back: [() => wallP(152, 10), () => wallP(152, 10)],
    front: [J => medball([J.arms[1].h[0] + 10, J.arms[1].h[1] - 2], 12), () => medball([142, G - 114], 12) + speedLines(120, G - 124, 3)],
    arrows: [[], []]
  },
  burpee: {
    hl: ['torso', 'thigh'], labels: ['PLANKE', 'HOP'],
    poses: [
      { hip: [84, G - 38], sh: [128, G - 46], head: [147, G - 52], legs: [{ knee: [50, G - 22], foot: [16, G - 7], toe: [10, G] }, { knee: [52, G - 20], foot: [18, G - 6], toe: [12, G] }], arms: [{ hand: [126, G] }, { hand: [130, G] }] },
      { hip: [80, G - 72], t: 0, legs: [{ foot: [76, G - 8], toe: [86, G - 1] }, { foot: [84, G - 8], toe: [94, G - 1] }], arms: [{ hand: [90, G - 166], b: -1 }, { hand: [96, G - 164], b: -1 }] }
    ],
    back: [mat, () => `<ellipse cx="82" cy="${G + 5}" rx="22" ry="3.5" fill="${COL.lime}" opacity=".18"/>`],
    arrows: [[], [arrow(`M130 ${G - 30} L130 ${G - 76}`)]]
  },
  slhop: {
    hl: ['thigh', 'shin'], labels: ['PÅ ÉT BEN', 'HOP FREM'],
    poses: [
      { hip: [58, G - 66], t: 6, legs: [{ foot: [34, G - 34], b: -1, toe: [28, G - 28] }, { foot: [58, G - 2], b: -1 }], arms: [{ hand: [80, G - 86], b: 1 }, { hand: [38, G - 80], b: 1 }] },
      { hip: [114, G - 84], t: 10, legs: [{ foot: [90, G - 52], b: -1, toe: [84, G - 46] }, { foot: [116, G - 18], b: -1 }], arms: [{ hand: [140, G - 106], b: 1 }, { hand: [92, G - 100], b: 1 }] }
    ],
    back: [null, () => `<ellipse cx="116" cy="${G + 5}" rx="20" ry="3.5" fill="${COL.lime}" opacity=".18"/>`],
    arrows: [[], [arrow(`M20 ${G - 130} L80 ${G - 130}`)]]
  },
  slcalf: {
    hl: ['shin'], labels: ['START', 'OP PÅ TÆERNE'],
    poses: [
      { hip: [84, G - 70], legs: [{ foot: [64, G - 34], b: -1, toe: [58, G - 28] }, { foot: [84, G] }], arms: [{ hand: [138, G - 92], b: 1 }, { hand: [140, G - 90], b: 1 }] },
      { hip: [84, G - 82], legs: [{ foot: [64, G - 46], b: -1, toe: [58, G - 40] }, { foot: [82, G - 12], toe: [92, G] }], arms: [{ hand: [138, G - 92], b: 1 }, { hand: [140, G - 90], b: 1 }] }
    ],
    back: [() => wallP(148, 12), () => wallP(148, 12)],
    arrows: [[arrow(`M44 ${G - 4} L44 ${G - 34}`)], [arrow(`M44 ${G - 34} L44 ${G - 6}`, true)]]
  },
  tibraise: {
    hl: ['shin'], labels: ['TÆER NED', 'TÆER OP'],
    poses: [
      { hip: [44, G - 68], t: -4, legs: [{ foot: [62, G] }, { foot: [70, G] }], arms: [{ hand: [48, G - 60], b: 1 }, { hand: [52, G - 58], b: 1 }] },
      { hip: [44, G - 68], t: -4, legs: [{ foot: [62, G], toe: [71, G - 9] }, { foot: [70, G], toe: [79, G - 9] }], arms: [{ hand: [48, G - 60], b: 1 }, { hand: [52, G - 58], b: 1 }] }
    ],
    back: [() => wallP(14, 10), () => wallP(14, 10)],
    arrows: [[], [arrow(`M110 ${G - 4} L110 ${G - 36}`)]]
  },
  stepcalf: {
    hl: ['shin'], labels: ['HÆLE NED', 'OP PÅ TÆERNE'],
    poses: [
      { hip: [88, G - 82], legs: [{ foot: [86, G - 12], toe: [97, G - 14] }, { foot: [90, G - 12], toe: [101, G - 14] }], arms: [{ hand: [96, G - 70], b: 1 }, { hand: [100, G - 68], b: 1 }] },
      { hip: [88, G - 98], legs: [{ foot: [86, G - 28], toe: [97, G - 14] }, { foot: [90, G - 28], toe: [101, G - 14] }], arms: [{ hand: [96, G - 86], b: 1 }, { hand: [100, G - 84], b: 1 }] }
    ],
    back: [() => boxP(80, G - 14, 74, 14), () => boxP(80, G - 14, 74, 14)],
    arrows: [[arrow(`M44 ${G - 4} L44 ${G - 40}`)], [arrow(`M44 ${G - 40} L44 ${G - 6}`, true)]]
  },
  carioca: {
    hl: ['thigh', 'shin'], labels: ['SIDESTEP', 'KRYDS'],
    poses: [
      { front: 1, hip: [85, G - 62], legs: [{ foot: [62, G], b: 1 }, { foot: [106, G], b: -1 }], arms: [{ hand: [60, G - 82], b: 1 }, { hand: [114, G - 74], b: -1 }] },
      { front: 1, hip: [80, G - 62], legs: [{ foot: [96, G], b: -1 }, { foot: [126, G - 10], b: -1 }], arms: [{ hand: [58, G - 82], b: 1 }, { hand: [108, G - 72], b: -1 }], t: 6 }
    ],
    arrows: [[arrow(`M44 24 L130 24`)], [arrow(`M44 24 L130 24`)]]
  },
  ladder: { custom: ladderPanel, labels: ['IND', 'UD'] },
  tdrill: { custom: tdrillPanel, labels: ['OPSÆTNING', 'LØB'] },
  sprint5: {
    hl: ['thigh', 'shin'], labels: ['KLAR', 'ACCELERÉR'],
    poses: [
      { hip: [68, G - 56], t: 24, legs: [{ foot: [60, G], b: -1 }, { foot: [98, G], b: -1 }], arms: [{ hand: [100, G - 86], b: 1 }, { hand: [104, G - 82], b: 1 }] },
      { hip: [74, G - 62], t: 40, legs: [{ foot: [34, G - 8], b: -1, toe: [28, G - 2] }, { knee: [106, G - 64], foot: [100, G - 30] }], arms: [{ hand: [104, G - 90], b: 1 }, { hand: [50, G - 96], b: 1 }] }
    ],
    arrows: [[], [arrow(`M110 24 L154 24`)]]
  },
  diveget: {
    hl: ['torso', 'upper'], labels: ['KLAR', 'DYK'],
    poses: [
      { front: 1, hip: [85, G - 60], legs: [{ foot: [66, G], b: 1 }, { foot: [104, G], b: -1 }], arms: [{ hand: [66, G - 70], b: 1 }, { hand: [104, G - 70], b: -1 }] },
      { front: 1, hip: [58, G - 66], t: 78, legs: [{ foot: [14, G - 42], b: 1 }, { foot: [18, G - 54], b: 1 }], arms: [{ hand: [152, G - 94] }, { hand: [156, G - 82] }] }
    ],
    back: [null, null],
    arrows: [[], [arrow(`M30 ${G - 120} L120 ${G - 120}`)]]
  },
  latbandwalk: {
    hl: ['thigh'], labels: ['SAMMEN', 'SKRIDT UD'],
    poses: [
      { front: 1, hip: [85, G - 58], legs: [{ foot: [72, G], b: 1 }, { foot: [98, G], b: -1 }], arms: [{ hand: [76, G - 92], b: 1 }, { hand: [94, G - 92], b: -1 }] },
      { front: 1, hip: [85, G - 56], legs: [{ foot: [60, G], b: 1 }, { foot: [118, G], b: -1 }], arms: [{ hand: [76, G - 92], b: 1 }, { hand: [94, G - 92], b: -1 }] }
    ],
    front: [J => bandP([J.legs[0].f[0], J.legs[0].f[1] - 8], [J.legs[1].f[0], J.legs[1].f[1] - 8]), J => bandP([J.legs[0].f[0], J.legs[0].f[1] - 8], [J.legs[1].f[0], J.legs[1].f[1] - 8])],
    arrows: [[], [arrow(`M130 ${G - 20} L156 ${G - 20}`)]]
  },
  cossack: {
    hl: ['thigh'], labels: ['BRED STILLING', 'SÆT DIG TIL SIDEN'],
    poses: [
      { front: 1, hip: [85, G - 56], legs: [{ foot: [46, G], b: 1 }, { foot: [124, G], b: -1 }], arms: [{ hand: [78, G - 94], b: 1 }, { hand: [92, G - 94], b: -1 }] },
      { front: 1, hip: [58, G - 36], legs: [{ foot: [38, G], b: 1 }, { foot: [128, G - 4], b: -1, toe: false }], arms: [{ hand: [66, G - 78], b: 1 }, { hand: [80, G - 78], b: -1 }] }
    ],
    arrows: [[], [arrow(`M110 ${G - 70} L74 ${G - 70}`, true)]]
  },
  hips9090: { custom: hips9090Panel, labels: ['VENSTRE FORAN', 'HØJRE FORAN'] },
  wgs: {
    hl: ['thigh', 'torso'], labels: ['HÆNDER NED', 'ÅBN OP'],
    poses: [
      { hip: [72, G - 34], t: 70, legs: [{ foot: [24, G - 3], toe: [32, G], b: -1 }, { foot: [112, G], b: -1 }], arms: [{ hand: [108, G - 2] }, { hand: [114, G - 2] }] },
      { hip: [72, G - 34], t: 38, legs: [{ foot: [24, G - 3], toe: [32, G], b: -1 }, { foot: [112, G], b: -1 }], arms: [{ hand: [110, G - 2] }, { hand: [100, G - 108], b: -1 }] }
    ],
    arrows: [[], [arrow(`M130 ${G - 40} Q150 ${G - 90} 120 ${G - 130}`)]]
  },
  catcow: {
    hl: ['torso'], labels: ['KAT', 'KO'],
    poses: [
      { hip: [70, G - 42], sh: [118, G - 46], head: [136, G - 34], spine: [0, -34], legs: [{ knee: [70, G - 4], foot: [36, G - 4], toe: false }, { knee: [72, G - 3], foot: [38, G - 3], toe: false }], arms: [{ hand: [118, G] }, { hand: [122, G] }] },
      { hip: [70, G - 42], sh: [118, G - 46], head: [138, G - 64], spine: [0, 30], legs: [{ knee: [70, G - 4], foot: [36, G - 4], toe: false }, { knee: [72, G - 3], foot: [38, G - 3], toe: false }], arms: [{ hand: [118, G] }, { hand: [122, G] }] }
    ],
    back: [mat, mat],
    arrows: [[arrow(`M90 ${G - 102} L90 ${G - 82}`, true)], [arrow(`M90 ${G - 24} L90 ${G - 44}`, true)]]
  },
  openbook: { custom: openBookPanel, labels: ['ARME FREM', 'ÅBN'] },
  hipflexor: {
    hl: ['thigh.0', 'torso'], labels: ['START', 'SKUB HOFTEN FREM'],
    poses: [
      { hip: [58, G - 40], t: 0, legs: [{ knee: [46, G - 3], foot: [12, G - 6], toe: false }, { knee: [92, G - 38], foot: [96, G] }], arms: [{ hand: [76, G - 76], b: 1 }, { hand: [80, G - 74], b: 1 }] },
      { hip: [72, G - 40], t: -6, legs: [{ knee: [46, G - 3], foot: [12, G - 6], toe: false }, { knee: [106, G - 38], foot: [110, G] }], arms: [{ hand: [84, G - 160], b: -1 }, { hand: [88, G - 76], b: 1 }] }
    ],
    arrows: [[], [arrow(`M52 ${G - 60} L82 ${G - 60}`)]]
  },
  anklemob: {
    hl: ['shin'], labels: ['START', 'KNÆ MOD VÆGGEN'],
    poses: [
      { hip: [86, G - 66], t: 4, legs: [{ foot: [48, G], b: -1 }, { foot: [112, G], b: -1 }], arms: [{ hand: [134, G - 104], b: 1 }, { hand: [136, G - 102], b: 1 }] },
      { hip: [104, G - 56], t: 8, legs: [{ foot: [52, G], b: -1 }, { foot: [112, G], b: -1 }], arms: [{ hand: [134, G - 104], b: 1 }, { hand: [136, G - 102], b: 1 }] }
    ],
    back: [() => wallP(148, 12), () => wallP(148, 12)],
    arrows: [[], [arrow(`M120 ${G - 14} L142 ${G - 14}`)]]
  },
  deepsquat: {
    hl: ['thigh'], labels: ['STÅ', 'DYB HOLD'],
    poses: [
      { front: 1, hip: [85, G - 66], legs: [{ foot: [60, G], b: 1 }, { foot: [110, G], b: -1 }], arms: [{ hand: [78, G - 98], b: 1 }, { hand: [92, G - 98], b: -1 }] },
      { front: 1, hip: [85, G - 22], legs: [{ foot: [52, G], b: 1 }, { foot: [118, G], b: -1 }], arms: [{ elbow: [62, G - 46], hand: [80, G - 66] }, { elbow: [108, G - 46], hand: [90, G - 66] }] }
    ],
    arrows: [[], [arrow(`M30 ${G - 70} L30 ${G - 40}`, true)]]
  },
  shoulderband: {
    hl: ['upper'], labels: ['FORAN', 'OVER HOVEDET'],
    poses: [
      { front: 1, hip: [85, G - 70], legs: [{ foot: [78, G], b: 1 }, { foot: [92, G], b: -1 }], arms: [{ hand: [48, G - 84], b: 1 }, { hand: [122, G - 84], b: -1 }] },
      { front: 1, hip: [85, G - 70], legs: [{ foot: [78, G], b: 1 }, { foot: [92, G], b: -1 }], arms: [{ hand: [48, G - 158], b: -1 }, { hand: [122, G - 158], b: 1 }] }
    ],
    front: [J => bandP(J.arms[0].h, J.arms[1].h), J => bandP(J.arms[0].h, J.arms[1].h)],
    arrows: [[], [arrow(`M18 ${G - 80} L18 ${G - 150}`)]]
  },
  wallball: {
    hl: ['upper'], labels: ['KAST', 'GRIB'],
    poses: [
      { hip: [60, G - 66], t: 8, legs: [{ foot: [42, G], b: -1 }, { foot: [80, G], b: -1 }], arms: [{ hand: [90, G - 98], b: 1 }, { hand: [92, G - 96], b: 1 }] },
      { hip: [60, G - 66], t: 8, legs: [{ foot: [42, G], b: -1 }, { foot: [80, G], b: -1 }], arms: [{ hand: [100, G - 96], b: 1 }, { hand: [102, G - 94], b: 1 }] }
    ],
    back: [() => wallP(150, 10), () => wallP(150, 10)],
    front: [J => ballS([J.arms[1].h[0] + 10, J.arms[1].h[1] - 2]) + guide(`M${J.arms[1].h[0] + 18} ${J.arms[1].h[1] - 2} L142 ${G - 108}`), () => ballS([126, G - 100]) + guide(`M140 ${G - 108} L114 ${G - 100}`)],
    arrows: [[], []]
  },
  dropcatch: {
    hl: ['upper'], labels: ['MAKKER SLIPPER', 'GRIB'],
    poses: [
      { front: 1, hip: [85, G - 60], legs: [{ foot: [66, G], b: 1 }, { foot: [104, G], b: -1 }], arms: [{ hand: [64, G - 80], b: 1 }, { hand: [106, G - 80], b: -1 }] },
      { front: 1, hip: [85, G - 60], legs: [{ foot: [66, G], b: 1 }, { foot: [104, G], b: -1 }], arms: [{ hand: [66, G - 78], b: 1 }, { hand: [112, G - 100], b: -1 }] }
    ],
    front: [() => partnerHand() + ballS([124, 46]), () => partnerHand() + ballS([116, G - 112]) + guide(`M124 58 L118 ${G - 124}`)],
    arrows: [[], []]
  },
  visual: { custom: visualPanel, labels: ['LUK ØJNENE', 'SE DET FOR DIG'] }
});
function partnerHand() { return rect(116, 16, 18, 22, 6, '#7E8C83', 'none', 0) + `<path d="M116 38 Q125 52 134 38" fill="#7E8C83"/>` + gtext(125, 12, 'MAKKER', 'illu-note'); }

const _illuCache = new Map();
function illustration(id, cls = '') {
  const k = id + '|' + cls;
  if (!_illuCache.has(k)) _illuCache.set(k, buildIllustration(id, cls));
  return _illuCache.get(k);
}
const CAT_ICON = { Kondition: 'pulse', Bevægelse: 'glove', Eksplosiv: 'bolt', Styrke: 'dumbbell', Core: 'core', Mobilitet: 'repeat', Fokus: 'focus' };
/* Øvelser uden tegnet figur får et ikonkort med udstyr og "godt til" */
function fallbackIllustration(id, cls) {
  const e = EX[id], ic = (ICON[CAT_ICON[e.cat]] || ICON.dumbbell).replace('<svg ', '<svg x="125" y="28" width="110" height="110" style="color:#C8F03C" ');
  return `<svg viewBox="0 0 360 212" class="illu illu-fb ${cls}" role="img" aria-label="${esc(e.name)}" focusable="false"><rect x="0.5" y="0.5" width="359" height="211" rx="18" fill="#111A15" stroke="#21302A"/>${ic}
    <text x="180" y="156" text-anchor="middle" class="illu-label">${esc(e.equip.toUpperCase())}</text><text x="180" y="182" text-anchor="middle" class="illu-note">${esc(e.good.slice(0, 3).join(' · ').toUpperCase())}</text></svg>`;
}
function buildIllustration(id, cls) {
  const key = ILL[id] ? id : (EX[id] && EX[id].illu);
  if (!ILL[key]) return EX[id] ? fallbackIllustration(id, cls) : '';
  const X = ILL[key];
  if (!X) return '';
  const labels = X.labels || ['START', 'SLUT'];
  const nm = (typeof EX !== 'undefined' && EX[id]) ? EX[id].name : 'Øvelse';
  let s = `<svg viewBox="0 0 360 212" class="illu ${cls}" role="img" aria-label="${nm}: ${labels[0].toLowerCase()} og ${labels[1].toLowerCase()}" focusable="false">`;
  for (let i = 0; i < 2; i++) {
    s += `<g transform="translate(${i * 190},0)">`;
    s += `<rect x="0.5" y="0.5" width="169" height="211" rx="18" fill="#111A15" stroke="#21302A"/>`;
    if (X.custom) {
      s += X.custom(i);
    } else {
      s += `<line x1="10" y1="${G + 5}" x2="160" y2="${G + 5}" stroke="#2D3D34" stroke-width="2"/>`;
      const J = joints(X.poses[i]);
      const back = X.back && X.back[i]; if (back) s += back(J);
      s += figure(J, X.hl);
      const front = X.front && X.front[i]; if (front) s += front(J);
      (X.arrows[i] || []).forEach(a => s += a);
    }
    s += `<text x="85" y="202" text-anchor="middle" class="illu-label">${labels[i]}</text>`;
    s += `</g>`;
  }
  if (X.mid) s += `<text x="180" y="110" text-anchor="middle" class="illu-mid">${X.mid}</text>`;
  else s += `<path d="M175 96 L185 106 L175 116" fill="none" stroke="${COL.lime}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  return s + `</svg>`;
}

/* ===== Ikoner ===== */
const SV = (inner, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${inner}</svg>`;
const ICON = {
  ball: SV('<circle cx="12" cy="12" r="9"/><path d="M12 7.5l4 2.9-1.5 4.6h-5L8 10.4z"/><path d="M12 7.5V3.2M16 10.4l4-1.3M14.5 15l2.5 3.6M9.5 15L7 18.6M8 10.4L4 9.1"/>'),
  dumbbell: SV('<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>'),
  bolt: SV('<path d="M13 2.5L4.5 14H11l-1 7.5L18.5 10H12z"/>'),
  glove: SV('<path d="M7 21v-4.3L4.6 13.2a1.9 1.9 0 0 1 3-2.4L9 12.3V5.2a1.5 1.5 0 0 1 3 0V11V3.9a1.5 1.5 0 0 1 3 0V11V5.4a1.5 1.5 0 0 1 3 0v8.1c0 4.4-2.5 7.5-6.6 7.5z"/><path d="M7.2 18.3h8"/>'),
  moon: SV('<path d="M20 14.6A8.2 8.2 0 0 1 9.4 4 8.2 8.2 0 1 0 20 14.6z"/>'),
  calendar: SV('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  timer: SV('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5"/>'),
  chart: SV('<path d="M3.5 20.5h17M6.5 17v-5M11 17V7.5M15.5 17v-7M20 17V4.5"/>'),
  grid: SV('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>'),
  check: SV('<path d="M5 12.5l4.5 4.5L19 7.5"/>', ' stroke-width="3.2"'),
  flame: SV('<path d="M12 3c1 3.6 5.2 5.5 5.2 10.2a5.2 5.2 0 0 1-10.4 0c0-2.6 1.4-4.2 2.6-5.3.3 1.9 1 2.9 2.1 3.3C11 8.9 11 6.1 12 3z"/>'),
  pulse: SV('<path d="M2.5 12.5h4l2.5-6.5 4 13 2.6-6.5h5.9"/>'),
  core: SV('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
  play: SV('<path d="M7.5 4.8v14.4L19 12z" fill="currentColor" stroke="none"/>'),
  pause: SV('<rect x="6" y="5" width="4.2" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2" fill="currentColor" stroke="none"/>'),
  reset: SV('<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4"/><path d="M4.5 3.5V8H9"/>'),
  close: SV('<path d="M6 6l12 12M18 6L6 18"/>', ' stroke-width="2.6"'),
  trash: SV('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  down: SV('<path d="M12 5v14M6.5 13.5L12 19l5.5-5.5"/>', ' stroke-width="2.6"'),
  repeat: SV('<path d="M17 2.5L20.5 6 17 9.5"/><path d="M3.5 11.5V10a4 4 0 0 1 4-4h13M7 21.5L3.5 18 7 14.5"/><path d="M20.5 12.5V14a4 4 0 0 1-4 4h-13"/>'),
  talk: SV('<path d="M4 5h16v11H9.5L4 20z"/><path d="M8 9.5h8M8 12.5h5"/>'),
  back: SV('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  tip: SV('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'),
  house: SV('<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>'),
  focus: SV('<circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="8.5"/><path d="M12 1.8v3.4M12 18.8v3.4M1.8 12h3.4M18.8 12h3.4"/>'),
  edit: SV('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  more: SV('<circle cx="5.5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="18.5" cy="12" r="1.8" fill="currentColor"/>'),
  chev: SV('<path d="M9 5l7 7-7 7"/>', ' stroke-width="2.6"'),
  gauge: SV('<path d="M3.5 17.5a8.5 8.5 0 1 1 17 0"/><path d="M12 17.5l4.2-5.6"/><circle cx="12" cy="17.5" r="1.4" fill="currentColor"/>'),
  test: SV('<path d="M9 3h6M10 3v5.5L5 19a1.5 1.5 0 0 0 1.4 2h11.2A1.5 1.5 0 0 0 19 19l-5-10.5V3"/><path d="M7.5 15h9"/>')
};

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


/* ===== Timer-byggesten ===== */
/* Det valgfri sidste argument "it" er indekset på den øvelse i blokken, som segmentet hører til.
   Det bruges til at skifte labels og tider, når en øvelse er byttet ud. */
const S = (type, secs, label, it) => ({ type, secs, label, ...(it != null ? { it } : {}) });
const R = (label, it) => ({ type: 'reps', secs: 0, label, ...(it != null ? { it } : {}) });
function rounds(n, segs, skipLast = true) {
  const out = [];
  for (let r = 1; r <= n; r++) {
    segs.forEach((s, i) => {
      if (skipLast && r === n && i === segs.length - 1 && s.type === 'rest') return;
      out.push({ ...s, round: r, rounds: n });
    });
  }
  return out;
}
const single = (secs, label) => [{ ...S('work', secs, label), round: 1, rounds: 1 }];
const sides = (secs, name) => [{ ...S('work', secs, name + ' · venstre side'), round: 1, rounds: 1 }, { ...S('rest', 8, 'Skift side'), round: 1, rounds: 1 }, { ...S('work', secs, name + ' · højre side'), round: 1, rounds: 1 }];

const BREATH = it => rounds(4, [S('in', 4, 'Træk vejret ind gennem næsen', it), S('hold', 4, 'Hold vejret', it), S('out', 4, 'Pust langsomt ud', it), S('hold', 4, 'Hold', it)], false);
const REACT = (n, it) => rounds(n, [S('react', 30, 'Reagér på signalet', it), S('rest', 30, 'Pause', it)]);
EX.breath.segs = BREATH(); EX.reaction.segs = REACT(3);

/* ===== Blokke ===== */
const WARM = (min = 6, label = '5–8 min') => ({
  id: 'warm', icon: 'flame', title: 'Opvarmning', tags: [label, 'RPE 3–4'],
  items: [{ ex: 'bike', dose: label, note: 'RPE 3–4 · roligt tempo', secs: min * 60 }],
  timer: { name: 'Opvarmning', segs: single(min * 60, 'Opvarmning · RPE 3–4') }
});
const CONT = (min, rpe, title = 'Kondition', talk = false) => ({
  id: 'cardio', icon: 'pulse', title, tags: [`${min} min kontinuerligt`, rpe],
  callout: talk ? 'Du skal kunne tale i korte sætninger, men det skal føles som træning.' : null,
  items: [{ ex: 'bike', dose: `${min} min`, note: `${rpe} · cykel, crosstrainer eller løb`, secs: min * 60 }],
  timer: { name: `${title} · ${min} min`, segs: single(min * 60, `Kontinuerligt · ${rpe}`) }
});
const BLOCKS5 = (n, base, peak) => ({
  id: 'cardio', icon: 'pulse', title: 'Kondition', tags: [`${n} × 5 min`, '1 min let mellem blokke'],
  ivl: { steps: [{ t: '4 min', l: base, k: 'work' }, { t: '1 min', l: peak, k: 'push' }, { t: '1 min', l: 'Let cykling', k: 'rest' }], reps: n, foot: 'Den lette minut kun mellem blokkene' },
  items: [{ ex: 'bike', dose: `${n} × 5 min`, note: `4 min ${base} + 1 min ${peak}` }],
  timer: { name: `Kondition · ${n} × 5 min`, segs: rounds(n, [S('work', 240, `Blok · ${base}`), S('push', 60, `Skru op · ${peak}`), S('rest', 60, 'Let cykling')]) }
});
const INTERVALS = (n, work, rest, rpe) => ({
  id: 'intervals', icon: 'bolt', title: 'Intervaller', tags: [`${n} ×`, `${work}/${rest} sek`, rpe],
  ivl: { steps: [{ t: `${work}s`, l: 'Hårdt', k: 'work', sub: rpe }, { t: `${rest}s`, l: 'Let', k: 'rest', sub: 'meget let' }], reps: n },
  items: [{ ex: 'assault', name: 'Assault bike eller cykel', dose: `${n} × ${work} sek`, note: `Hårdt · ${rpe}` }],
  timer: { name: `Intervaller · ${n} × ${work}/${rest}`, segs: rounds(n, [S('work', work, `Hårdt · ${rpe}`), S('rest', rest, 'Meget let')]) }
});

const TESTBLOCK = n => ({
  id: 'test', icon: 'test', title: n === 1 ? 'Konditions\u00ADtest · start' : 'Konditions\u00ADtest', tags: ['20 min', 'RPE 6–7'],
  callout: n === 1 ? 'Din startmåling. Brug samme maskine og modstand i uge 8, så du kan sammenligne.' : 'Brug samme maskine og modstand som i uge 1. Så kan du sammenligne.',
  items: [{ ex: 'bike', dose: '20 min', note: 'RPE 6–7 · jævnt tempo', secs: 1200 }],
  testForm: true,
  timer: { name: 'Konditionstest · 20 min', segs: single(1200, 'Test · RPE 6–7') }
});

/* ===== 8 uger ===== */
const PHASES = [
  { weeks: [1, 2], title: 'UGE 1–2 · BYG MOTOREN', desc: 'Vi bygger den aerobe base, som gør det lettere at holde overskud og koncentration gennem hele kampen.' },
  { weeks: [3, 4], title: 'UGE 3–4 · ØG KAPACITETEN', desc: 'Nu begynder vi at kombinere kondition med gentagne eksplosive målmandsaktioner.' },
  { weeks: [5, 6], title: 'UGE 5–6 · KAMPMOTOR', desc: 'Nu træner vi evnen til at lave gentagne aktioner og hurtigt blive klar igen.' },
  { weeks: [7], title: 'UGE 7 · PEAK', desc: 'Nu tester vi, om du kan arbejde hårdt og stadig være klar.' },
  { weeks: [8], title: 'UGE 8 · TEST & DELOAD', desc: 'Vi reducerer belastningen og tester din udvikling.' }
];
const phaseOf = n => PHASES.findIndex(p => p.weeks.includes(n));

function buildWeek(n) {
  const blocks = [];
  if (n <= 2) {
    blocks.push(WARM());
    blocks.push(n === 1 ? TESTBLOCK(1) : CONT(30, 'RPE 5–6', 'Kondition', true));
    blocks.push({
      id: 'move', icon: 'glove', title: 'Målmands\u00ADbevægelse', tags: ['3 runder', 'Pause 30 sek'],
      items: [{ ex: 'shuffle', dose: '20 sek', secs: 20 }, { ex: 'squat', dose: '10 reps' }, { ex: 'latlunge', dose: '6/side' }, { ex: 'calf', dose: '15 reps' }],
      timer: { name: 'Målmandsbevægelse · 3 runder', segs: rounds(3, [S('work', 20, 'Lateral shuffle', 0), R('Bodyweight squat × 10', 1), R('Lateral lunge × 6/side', 2), R('Calf raise × 15', 3), S('rest', 30, 'Pause')]) }
    });
    blocks.push({
      id: 'core', icon: 'core', title: 'Core', tags: ['3 runder'],
      items: [{ ex: 'pallof', dose: '10/side' }, { ex: 'deadbug', dose: '8/side' }, { ex: 'sideplank', dose: '25 sek/side', secs: 25, perSide: true }],
      timer: { name: 'Core · 3 runder', segs: rounds(3, [R('Pallof press × 10/side', 0), R('Dead bug × 8/side', 1), S('work', 25, 'Side plank · venstre side', 2), S('rest', 8, 'Skift side', 2), S('work', 25, 'Side plank · højre side', 2), S('rest', 30, 'Pause')]) }
    });
  } else if (n <= 4) {
    blocks.push(WARM());
    blocks.push(n === 3 ? BLOCKS5(4, 'RPE 5–6', 'RPE 7') : BLOCKS5(5, 'RPE 6', 'RPE 8'));
    blocks.push({
      id: 'actions', icon: 'glove', title: 'Gentagne målmands\u00ADaktioner', tags: ['4 runder', 'Pause 90 sek'],
      ivl: { steps: [{ t: '20 sek', l: 'Assault bike hårdt', k: 'work' }, { t: '5/side', l: 'Lateral bounds', k: 'reps' }, { t: '5', l: 'Squat jumps', k: 'reps' }, { t: '40 sek', l: 'Rolig cykel', k: 'rest' }, { t: '90 sek', l: 'Pause', k: 'rest' }], reps: 4 },
      items: [{ ex: 'assault', dose: '20 sek', note: 'Hårdt', secs: 20 }, { ex: 'bounds', dose: '5/side' }, { ex: 'squatjump', dose: '5 reps' }],
      timer: { name: 'Målmandsaktioner · 4 runder', segs: rounds(4, [S('work', 20, 'Assault bike · hårdt', 0), R('Lateral bounds × 5/side', 1), R('Squat jumps × 5', 2), S('rest', 40, 'Rolig cykel'), S('rest', 90, 'Pause')]) }
    });
    blocks.push({
      id: 'core', icon: 'core', title: 'Core', tags: ['3 sæt', 'Pause 60 sek'],
      items: [{ ex: 'pallof', dose: '3 × 10/side' }, { ex: 'farmer', dose: '3 × 30 m' }, { ex: 'deadbug', dose: '3 × 10' }],
      restTimer: 60
    });
  } else if (n <= 6) {
    blocks.push(WARM());
    blocks.push(CONT(20, 'RPE 6', 'Aerobt arbejde'));
    blocks.push(INTERVALS(10, 30, 60, 'RPE 8'));
    blocks.push({
      id: 'circuit', icon: 'glove', title: 'Målmands-circuit', tags: ['4 runder', 'Pause 60 sek'],
      items: [{ ex: 'shuffle', dose: '20 sek', secs: 20 }, { ex: 'assault', dose: '20 sek', secs: 20 }, { ex: 'squatjump', dose: '20 sek', secs: 20 }, { rest: '20 sek', label: 'Rolig bevægelse' }, { rest: '60 sek', label: 'Pause' }],
      timer: { name: 'Målmands-circuit · 4 runder', segs: rounds(4, [S('work', 20, 'Lateral shuffle', 0), S('work', 20, 'Assault bike', 1), S('work', 20, 'Squat jumps', 2), S('rest', 20, 'Rolig bevægelse'), S('rest', 60, 'Pause')]) }
    });
    blocks.push({
      id: 'strength', icon: 'dumbbell', title: 'Let styrke', tags: ['2 sæt', 'Pause 90 sek'],
      items: [{ ex: 'bulgarian', dose: '2 × 8/ben' }, { ex: 'latpull', dose: '2 × 10' }, { ex: 'rdl', dose: '2 × 8' }, { ex: 'pallof', dose: '2 × 10/side' }],
      restTimer: 90
    });
  } else if (n === 7) {
    blocks.push(WARM());
    const c = INTERVALS(12, 30, 45, 'RPE 8–9'); c.id = 'cardio'; c.title = 'Kondition'; c.icon = 'pulse';
    blocks.push(c);
    blocks.push({
      id: 'ready', icon: 'glove', title: 'Paratheds\u00ADcircuit', tags: ['5 runder', 'Pause 60 sek'],
      ivl: { steps: [{ t: '15 sek', l: 'Assault bike hårdt', k: 'work' }, { t: '5/side', l: 'Lateral bounds', k: 'reps' }, { t: '5', l: 'Squat jumps', k: 'reps' }, { t: '20 sek', l: 'Rolig bevægelse', k: 'rest' }, { t: '60 sek', l: 'Pause', k: 'rest' }], reps: 5 },
      items: [{ ex: 'assault', dose: '15 sek', note: 'Hårdt', secs: 15 }, { ex: 'bounds', dose: '5/side' }, { ex: 'squatjump', dose: '5 reps' }],
      timer: { name: 'Parathedscircuit · 5 runder', segs: rounds(5, [S('work', 15, 'Assault bike · hårdt', 0), R('Lateral bounds × 5/side', 1), R('Squat jumps × 5', 2), S('rest', 20, 'Rolig bevægelse'), S('rest', 60, 'Pause')]) }
    });
    blocks.push({
      id: 'core', icon: 'core', title: 'Core', tags: ['Pause 60 sek'],
      items: [{ ex: 'farmer', dose: '3 × 40 m' }, { ex: 'pallof', dose: '3 × 10/side' }, { ex: 'sideplank', dose: '2 × 40 sek/side', secs: 40, perSide: true }],
      restTimer: 60
    });
  } else {
    blocks.push(WARM(10, '10 min'));
    blocks.push(TESTBLOCK(8));
    blocks.push(INTERVALS(6, 30, 60, 'Hårdt'));
  }
  const ph = PHASES[phaseOf(n)];
  return { n, phase: phaseOf(n), title: ph.title, desc: ph.desc, blocks };
}
const BASE_WEEKS = Array.from({ length: 8 }, (_, i) => buildWeek(i + 1));
let WEEKS = BASE_WEEKS; // erstattes af det tilpassede program (computePlan), når det er aktivt

/* ===== Fredag ===== */
const FRIDAY = {
  items: [{ ex: 'calf', dose: '× 10' }, { ex: 'squatjump', dose: '× 5' }, { ex: 'bounds', dose: '× 5/side' }, { ex: 'fastfeet', dose: '× 10 sek', secs: 10 }, { ex: 'sideplank', dose: '× 20 sek/side', secs: 20, perSide: true }],
  timer: { name: 'Fredag · aktivering', segs: rounds(2, [R('Calf raise × 10', 0), R('Squat jump × 5', 1), R('Lateral bounds × 5/side', 2), S('work', 10, 'Hurtige fødder', 3), S('work', 20, 'Side plank · venstre side', 4), S('rest', 8, 'Skift side', 4), S('work', 20, 'Side plank · højre side', 4), S('rest', 60, 'Gå roligt rundt')]) }
};


/* ===== Hjemme · før træning (ingen vægte eller maskiner) ===== */
const HOME = {
  1: {
    label: 'Niveau 1', weeks: 'uge 1–4',
    blocks: [
      { id: 'hstr', icon: 'dumbbell', title: 'Styrke', tags: ['2 runder', 'Pause 30 sek'],
        items: [{ ex: 'reverselunge', dose: '6/ben' }, { ex: 'glutebridge', dose: '12 reps' }, { ex: 'pushup', dose: '8 reps', note: 'På knæ, hvis det er for hårdt' }],
        timer: { name: 'Hjemme · styrke', segs: rounds(2, [R('Bagudlunge × 6/ben', 0), R('Glute bridge × 12', 1), R('Armstrækninger × 8', 2), S('rest', 30, 'Pause')]) } },
      { id: 'hcore', icon: 'core', title: 'Core', tags: ['2 runder', 'Pause 30 sek'],
        items: [{ ex: 'plank', dose: '30 sek', secs: 30 }, { ex: 'birddog', dose: '6/side' }, { ex: 'deadbug', dose: '6/side' }],
        timer: { name: 'Hjemme · core', segs: rounds(2, [S('work', 30, 'Planke', 0), R('Bird dog × 6/side', 1), R('Dead bug × 6/side', 2), S('rest', 30, 'Pause')]) } },
      { id: 'hfocus', icon: 'focus', title: 'Fokus & parathed', tags: ['Ca. 5 min'],
        items: [{ ex: 'breath', dose: '4 runder', note: '4 ind · 4 hold · 4 ud · 4 hold', segs: BREATH() }, { ex: 'reaction', dose: '3 × 30 sek', note: '30 sek pause mellem', segs: REACT(3) }, { ex: 'getup', dose: '5/side' }],
        timer: { name: 'Hjemme · fokus', segs: [...BREATH(0), ...REACT(3, 1), { ...R('Hurtig rejsning × 5/side', 2), round: 1, rounds: 1 }] } }
    ]
  },
  2: {
    label: 'Niveau 2', weeks: 'uge 5–8',
    blocks: [
      { id: 'hstr', icon: 'dumbbell', title: 'Styrke', tags: ['2 runder', 'Pause 30 sek'],
        items: [{ ex: 'reverselunge', dose: '8/ben' }, { ex: 'glutebridge', name: 'Glute bridge på ét ben', dose: '8/ben' }, { ex: 'pushup', dose: '12 reps' }],
        timer: { name: 'Hjemme · styrke', segs: rounds(2, [R('Bagudlunge × 8/ben', 0), R('Glute bridge på ét ben × 8/ben', 1), R('Armstrækninger × 12', 2), S('rest', 30, 'Pause')]) } },
      { id: 'hcore', icon: 'core', title: 'Core', tags: ['2 runder', 'Pause 30 sek'],
        items: [{ ex: 'plank', dose: '45 sek', secs: 45 }, { ex: 'birddog', dose: '8/side' }, { ex: 'sideplank', dose: '25 sek/side', secs: 25, perSide: true }],
        timer: { name: 'Hjemme · core', segs: rounds(2, [S('work', 45, 'Planke', 0), R('Bird dog × 8/side', 1), S('work', 25, 'Side plank · venstre side', 2), S('rest', 8, 'Skift side', 2), S('work', 25, 'Side plank · højre side', 2), S('rest', 30, 'Pause')]) } },
      { id: 'hfocus', icon: 'focus', title: 'Fokus & parathed', tags: ['Ca. 6 min'],
        items: [{ ex: 'breath', dose: '4 runder', note: '4 ind · 4 hold · 4 ud · 4 hold', segs: BREATH() }, { ex: 'reaction', dose: '4 × 30 sek', note: '30 sek pause mellem', segs: REACT(4) }, { ex: 'getup', dose: '6/side' }],
        timer: { name: 'Hjemme · fokus', segs: [...BREATH(0), ...REACT(4, 1), { ...R('Hurtig rejsning × 6/side', 2), round: 1, rounds: 1 }] } }
    ]
  }
};

/* ===== Min uge ===== */
const DAYS = [
  { d: 'MAN', full: 'mandag', icon: 'ball', label: 'Fodbold', kind: 'ball' },
  { d: 'TIR', full: 'tirsdag', icon: 'ball', label: 'Fodbold', kind: 'ball' },
  { d: 'ONS', full: 'onsdag', icon: 'dumbbell', label: 'Fitness · vigtigste dag', kind: 'fit' },
  { d: 'TOR', full: 'torsdag', icon: 'ball', label: 'Fodbold', kind: 'ball' },
  { d: 'FRE', full: 'fredag', icon: 'bolt', label: 'Aktivering', kind: 'fri' },
  { d: 'LØR', full: 'lørdag', icon: 'glove', label: 'Kamp', kind: 'match' },
  { d: 'SØN', full: 'søndag', icon: 'moon', label: 'Fri', kind: 'off' }
];

/* ===== RPE ===== */
const RPE = [
  { n: '1–2', t: 'Meget let', c: '#7EE8A2', w: 34, cue: 'Gang' },
  { n: '3–4', t: 'Let', c: '#B5F06A', w: 46, cue: 'Kan snakke frit' },
  { n: '5–6', t: 'Moderat', c: '#E3F04A', w: 58, cue: 'Korte sætninger' },
  { n: '7', t: 'Hårdt', c: '#FFD24A', w: 70, cue: 'Få ord ad gangen' },
  { n: '8', t: 'Meget hårdt', c: '#FFA640', w: 80, cue: 'Svært at tale' },
  { n: '9', t: 'Næsten maksimalt', c: '#FF7A45', w: 90, cue: 'Kun få sekunder mere' },
  { n: '10', t: 'Maksimalt', c: '#FF4D4D', w: 100, cue: 'Alt, du har' }
];

/* ===== Kamp-tracker ===== */
const METRICS = [
  { k: 'conc', t: 'Koncentration', short: 'Konc.', c: '#C8F03C' },
  { k: 'ready', t: 'Parathed', short: 'Parat', c: '#4DB6FF' },
  { k: 'legs', t: 'Ben/friskhed', short: 'Ben', c: '#FF9A3D' },
  { k: 'endu', t: 'Udholdenhed', short: 'Udh.', c: '#E58CFF' },
  { k: 'late', t: 'Overskud sidst i kampen', short: 'Overskud', c: '#F1F5EF' }
];

/* ===== Coach: mål, tests og niveauer ===== */
const GOALS = {
  offseason: { name: 'Off-season: byg muskel', short: 'Byg muskel', icon: 'dumbbell', sessions: ['A', 'B', 'C'], rest: 120,
    desc: 'Du er uden for sæsonen: tung styrketræning og mere volumen (flere sæt og gentagelser). Lidt let kondition for at holde gang i motoren.' },
  explosive: { name: 'Bliv mere eksplosiv', short: 'Mere eksplosiv', icon: 'bolt', sessions: ['A', 'B'], rest: 150,
    desc: 'Tung styrke i få gentagelser, spring og kast og korte sprint-intervaller. God hvile mellem sæt, så hver gentagelse er hurtig.' },
  leanfast: { name: 'Ned i vægt for at blive hurtigere', short: 'Hurtigere og lettere', icon: 'timer', sessions: ['A', 'B', 'C'], rest: 120,
    desc: 'Styrken holdes ved lige med få, tunge sæt. Mere kondition og intervaller, så du kan komme ned i vægt uden at tabe kraft.' },
  bodyfat: { name: 'Lavere fedtprocent', short: 'Lavere fedt%', icon: 'flame', sessions: ['A', 'B', 'C'], rest: 60,
    desc: 'Styrke-circuits med kort pause, intervaller og rolig kondition. Fokus på forbrænding og at bevare muskler.' }
};
const GOAL_KEYS = Object.keys(GOALS);
const COACH_CATS = ['Styrke', 'Eksplosivitet', 'Kondition', 'Core'];
/* Tests. "rec" = anbefalet kernesæt. Øvelserne med ex bruges også til at regne vægte ud i programmet. */
const TESTS = [
  { id: 'squat', ex: 'frontsquat', cat: 'Styrke', name: 'Frontsquat', kind: 'lift', rec: true,
    why: 'Viser benstyrke og kraft til afsæt, spring og redninger.',
    how: 'Varm op, og vælg en vægt, du kan tage 3–8 gange med god teknik. Skriv vægten og antal gentagelser. Stop, før teknikken går i stykker. Du skal ikke teste dit maks.' },
  { id: 'rdl', ex: 'rdl', cat: 'Styrke', name: 'Romanian deadlift', kind: 'lift', rec: true,
    why: 'Baglår, baller og ryg: grundlaget for sprint, hop og færre forstrækninger.',
    how: 'Vælg en vægt, du kan tage 3–8 gange med lige ryg og stangen tæt på kroppen. Skriv vægt og gentagelser.' },
  { id: 'bench', ex: 'dbbench', cat: 'Styrke', name: 'Bænkpres med håndvægte', kind: 'lift', perHand: true,
    why: 'Overkropsstyrke til udkast og til at komme hurtigt op fra jorden.',
    how: 'Skriv vægten for én håndvægt og antal gentagelser (3–8) med kontrolleret bevægelse hele vejen ned.' },
  { id: 'pullup', ex: 'pullup', cat: 'Styrke', name: 'Pull-ups', kind: 'reps', rec: true,
    why: 'Relativ styrke: hvor meget din krop kan trække sig selv. Står mål for ryg og arme.',
    how: 'Tag så mange rene pull-ups som muligt, hagen over stangen og fuld nedstrækning. Kan du ikke endnu, skriv 0.' },
  { id: 'cmj', cat: 'Eksplosivitet', name: 'Lodret hop', kind: 'num', unit: 'cm', rec: true,
    why: 'Eksplosiv benkraft: hvor højt du kan hoppe til høje bolde.',
    how: 'Stå ved en væg og ræk så højt du kan, og marker. Hop og marker højest muligt. Forskellen i cm er din hopshøjde. Tag bedste af 3.' },
  { id: 'broad', cat: 'Eksplosivitet', name: 'Længdespring', kind: 'num', unit: 'cm',
    why: 'Eksplosiv kraft fremad: afsæt og acceleration.',
    how: 'Stå med begge fødder bag en streg, og hop så langt du kan med et land, du kan holde. Mål fra stregen til hælen. Tag bedste af 3.' },
  { id: 'cond', cat: 'Kondition', name: 'Konditionstest', kind: 'cond', rec: true,
    why: 'Aerob kapacitet: evnen til at gentage aktioner og være klar helt til sidst.',
    how: 'Løbetest: løb så langt som muligt på 12 minutter (meter). Cykeltest: kør 20 minutter så hårdt og jævnt som muligt, og skriv gennemsnitlig watt.' },
  { id: 'plank', cat: 'Core', name: 'Planke', kind: 'num', unit: 'sek', rec: true,
    why: 'Core-udholdenhed: stabilitet i dueller, landinger og lange kampe.',
    how: 'Hold planken på albuer med lige krop, så længe du kan. Stop, når hoften synker eller falder i svaj.' }
];
/* Niveau-tærskler for score 20/40/60/80/100 (mand). Løft: løftet vægt (beregnet maks) ift. kropsvægt. */
const STD = {
  squat: [0.7, 0.95, 1.2, 1.5, 1.85], rdl: [0.8, 1.05, 1.35, 1.7, 2.1], bench: [0.45, 0.65, 0.9, 1.15, 1.45],
  pullup: [1, 4, 8, 12, 18], cmj: [25, 33, 41, 50, 60], broad: [180, 210, 235, 260, 285], plank: [30, 60, 100, 150, 210],
  run: [1700, 2000, 2400, 2700, 3000], bike: [1.5, 2.0, 2.5, 3.0, 3.8]
};
const STD_F = { squat: .65, rdl: .65, bench: .55, pullup: .5, cmj: .8, broad: .85, plank: 1, run: .85, bike: .8 };
const LEVEL_COL = ['#FF6B5B', '#FF9A3D', '#FFD84A', '#C8F03C', '#7EE8A2'];

const DEF_COACH = () => ({ sex: 'm', birth: '', height: '', bf: '', goal: '', targetKg: '', targetBf: '', active: false, weights: [], tests: [], days: [], season: '', status: null, statusLog: [], dossier: [], pain: [], prefs: {} });

/* ===== Områder til smerte og ømhed ===== */
const AREAS = [['knæ', 'Knæ'], ['ryg', 'Ryg'], ['skulder', 'Skulder'], ['hofte', 'Hofte'], ['baglår', 'Baglår'], ['læg', 'Læg og ankel'], ['albue', 'Albue og håndled']];
const AREA_NAME = Object.fromEntries(AREAS);
const AREA_OF = { squat: ['knæ', 'hofte'], hinge: ['ryg', 'baglår', 'hofte'], push: ['skulder', 'albue'], pull: ['skulder', 'albue', 'ryg'], plyo: ['knæ', 'læg'], calf: ['læg'], carry: ['ryg', 'skulder'], core: ['ryg'], agility: ['knæ', 'læg'], mobility: [], cardio: [], focus: [] };

/* ===== Tilstand (localStorage) ===== */
const KEY = 'gk8-goalkeeper-v1';
const DEF = () => ({
  week: 1, start: '', done: {}, weeksDone: [], matches: [], tests: {}, logs: [], swaps: {}, run: {}, runDate: '', coach: DEF_COACH(),
  fri: { wk: '', done: {} },
  home: { date: '', done: {} }, homeLog: [], lastExport: '',
  settings: { sound: true, vib: true, custom: { work: 30, rest: 60, rounds: 10 }, metric: 'avg', lib: 'Alle', libEquip: 'Alle', libCat: 'Alle', homeLevel: null }
});
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const clampNum = (v, lo, hi, d) => { v = +v; return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const isISO = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const str = (v, n) => String(v ?? '').slice(0, n);
const trueKeys = o => isObj(o) ? Object.fromEntries(Object.keys(o).filter(k => o[k]).map(k => [k, true])) : {};
function cleanTest(t) {
  return isObj(t) ? { date: isISO(t.date) ? t.date : '', dist: str(t.dist, 12), watt: str(t.watt, 12), hr: str(t.hr, 12), rpe: String(Math.round(clampNum(t.rpe, 1, 10, 7))) } : null;
}
/* Validerer alt, der kommer fra localStorage eller en importeret fil, så
   en ødelagt eller hånd-redigeret fil aldrig kan vælte appen ved opstart. */
function mergeState(d) {
  const base = DEF();
  if (!isObj(d)) return base;
  const out = { ...base };
  out.week = Math.round(clampNum(d.week, 1, 8, 1));
  out.start = isISO(d.start) ? d.start : '';
  out.done = trueKeys(d.done);
  out.weeksDone = Array.isArray(d.weeksDone) ? [...new Set(d.weeksDone.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 8))].sort((a, b) => a - b) : [];
  out.matches = (Array.isArray(d.matches) ? d.matches : []).filter(m => isObj(m) && isISO(m.date)).slice(-500).map((m, i) => {
    const r = { id: Math.round(clampNum(m.id, 0, 9e15, Date.now() + i)), date: m.date, week: Math.round(clampNum(m.week, 1, 8, 1)), note: str(m.note, 500) };
    METRICS.forEach(x => r[x.k] = Math.round(clampNum(m[x.k], 1, 10, 6)));
    return r;
  });
  out.tests = {};
  if (isObj(d.tests)) for (let w = 1; w <= 8; w++) { const t = cleanTest(d.tests[w]); if (t) out.tests[w] = t; }
  if (isObj(d.test) && !out.tests[8]) out.tests[8] = cleanTest(d.test); // ældre version: ét testfelt = uge 8
  out.logs = (Array.isArray(d.logs) ? d.logs : []).filter(l => isObj(l) && isISO(l.date) && EX[l.ex]).slice(-1500).map((l, i) => ({
    id: Math.round(clampNum(l.id, 0, 9e15, Date.now() + i)), date: l.date, week: Math.round(clampNum(l.week, 1, 8, 1)), ex: l.ex,
    kg: clampNum(l.kg, 0, 1000, 0), reps: clampNum(l.reps, 0, 1000, 0), rpe: Math.round(clampNum(l.rpe, 0, 10, 0)), ...(l.pr ? { pr: 1 } : {})
  }));
  out.coach = cleanCoach(d.coach);
  out.run = {}; if (isObj(d.run)) Object.keys(d.run).slice(0, 200).forEach(k => { if (/^(week|home|fri)\|[\w|-]+$/.test(k)) out.run[k] = Math.round(clampNum(d.run[k], 0, 20, 0)); });
  out.runDate = isISO(d.runDate) ? d.runDate : '';
  out.swaps = {};
  if (isObj(d.swaps)) Object.keys(d.swaps).slice(0, 300).forEach(k => { if (/^(week|fri|home)\|[\w|]+$/.test(k) && EX[d.swaps[k]]) out.swaps[k] = d.swaps[k]; });
  out.fri = { wk: str(d.fri && d.fri.wk, 12), done: trueKeys(d.fri && d.fri.done) };
  out.home = { date: isISO(d.home && d.home.date) ? d.home.date : '', done: trueKeys(d.home && d.home.done) };
  out.homeLog = Array.isArray(d.homeLog) ? [...new Set(d.homeLog.filter(isISO))].sort().slice(-120) : [];
  out.lastExport = isISO(d.lastExport) ? d.lastExport : '';
  const s = isObj(d.settings) ? d.settings : {}, c = isObj(s.custom) ? s.custom : {};
  out.settings = {
    sound: s.sound !== false, vib: s.vib !== false,
    custom: { work: clampNum(c.work, 5, 600, 30), rest: clampNum(c.rest, 0, 600, 60), rounds: Math.round(clampNum(c.rounds, 1, 40, 10)) },
    metric: ['avg', ...METRICS.map(m => m.k)].includes(s.metric) ? s.metric : 'avg',
    lib: ['Alle', ...BENEFITS.map(b => b.k)].includes(s.lib) ? s.lib : 'Alle',
    libEquip: ['Alle', 'home', ...EQUIPS].includes(s.libEquip) ? s.libEquip : 'Alle',
    libCat: CATS.includes(s.libCat) ? s.libCat : 'Alle',
    homeLevel: s.homeLevel === 1 || s.homeLevel === 2 ? s.homeLevel : null
  };
  return out;
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    return d ? mergeState(d) : DEF();
  } catch (e) { return DEF(); }
}
let ST = load();
let saveWarned = false;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(ST)); }
  catch (e) { if (!saveWarned) { saveWarned = true; toast('Kunne ikke gemme på enheden. Eksportér dine data som backup.'); } }
}
/* Bed browseren om at beskytte data mod automatisk oprydning */
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { }); } catch (e) { }

/* Eksport/import: alt data ligger kun lokalt på telefonen (ingen server,
   ingen konto) — disse to giver en manuel sikkerhedskopi, så et skifte af
   telefon eller en ryddet browser ikke betyder, at 8 ugers data forsvinder. */
function updateBackupNote() {
  const el = $('backupNote'); if (!el) return;
  const hasData = ST.matches.length || ST.weeksDone.length || ST.logs.length || Object.keys(ST.done).length;
  if (ST.lastExport) {
    const days = Math.floor((new Date(todayISO() + 'T12:00:00') - new Date(ST.lastExport + 'T12:00:00')) / 864e5);
    el.textContent = `Sidste backup: ${daDate(ST.lastExport)}.` + (days >= 14 && hasData ? ' Det er på tide at tage en ny.' : '');
  } else el.textContent = hasData ? 'Du har endnu ikke lavet en backup. Tryk "Eksportér data".' : '';
}
async function exportData() {
  try {
    ST.lastExport = localISO(new Date()); save();
    const name = `malmand8-data-${ST.lastExport}.json`, json = JSON.stringify(ST, null, 2);
    const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    if (standalone && window.File && navigator.canShare) {
      const file = new File([json], name, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Målmand 8 · backup' }); toast('Data eksporteret'); updateBackupNote(); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }
      }
    }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Data eksporteret'); updateBackupNote();
  } catch (e) { toast('Kunne ikke eksportere data'); }
}
function importDataFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!isObj(data) || !['weeksDone', 'matches', 'done', 'settings', 'week', 'homeLog'].some(k => k in data)) throw new Error('Ugyldigt format');
      if (!confirm('Importér data? Dine nuværende data i appen bliver overskrevet.')) return;
      ST = mergeState(data); save();
      $('mDate').value = ''; mDateTouched = false; editMatchId = null;
      renderAll(); loadPreset(TM.preset || 'p1');
      toast('Data importeret');
    } catch (e) { toast('Filen kunne ikke læses — er det en eksport fra denne app?'); }
  };
  reader.onerror = () => toast('Filen kunne ikke læses.');
  reader.readAsText(file);
}

/* ===== Hjælpere ===== */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60), r = s % 60; return `${m}:${String(r).padStart(2, '0')}`; };
const fmtLong = s => { s = Math.max(0, Math.round(s)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function fillIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { if (!el.firstElementChild) el.innerHTML = ICON[el.dataset.icon] || ''; }); }
/* Re-render uden at miste tastaturfokus på det element, der blev trykket på */
function withFocus(fn) {
  const a = document.activeElement; let sel = null;
  if (a && a !== document.body) {
    const root = a.closest('#progTiles, #weekView, #friItems, #homeBlocks');
    const k = a.dataset && Object.keys(a.dataset)[0];
    if (a.id) sel = '#' + a.id;
    else if (k) sel = (root ? '#' + root.id + ' ' : '') + `[data-${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}="${a.dataset[k]}"]`;
  }
  fn();
  if (sel) { const n = document.querySelector(sel); if (n) n.focus({ preventScroll: true }); }
}
const setText = (el, v) => { v = String(v); if (el.textContent !== v) el.textContent = v; };
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400); }
function isoWeekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(); const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${w}`;
}
const localISO = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
function lastSaturday() { const d = new Date(); const back = (d.getDay() + 1) % 7; d.setDate(d.getDate() - back); return localISO(d); }
const daDate = iso => { try { return new Date(iso + 'T12:00:00').toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return iso; } };
const segTotal = segs => segs.reduce((a, s) => a + (s.type === 'reps' ? 30 : s.secs), 0);

/* ===== Uger og afkrydsning ===== */
/* ===== Skift øvelse =====
   ST.swaps[ctx] = id på den øvelse, der erstatter programmets originale (ctx = samme nøgle som afkrydsning). */
function resolveItem(it, ctx) {
  const sw = ST.swaps[ctx];
  if (!it || !it.ex || !sw || !EX[sw] || sw === it.ex) return it;
  const e = EX[sw], o = EX[it.ex];
  if (e.pattern === 'cardio' && o.pattern === 'cardio') return { ...it, ex: sw, name: e.name, swapped: true, orig: it }; // tid og intensitet bevares
  const dose = it.rx ? rxDose(sw, it.rx) : /^× /.test(it.dose) ? '× ' + e.dose : (String(it.dose).match(/^\d+ × /) || [''])[0] + e.dose; // bevar sæt-/gange-præfikset
  return { ex: sw, dose, secs: e.secs, perSide: e.perSide, swapped: true, orig: it, ...(it.rx ? { rx: it.rx, prog: progText(sw) } : {}) };
}
function swapOptions(ctx, origEx) {
  const o = EX[origEx], kind = ctx.split('|')[0];
  return Object.entries(EX).filter(([id, e]) => id !== origEx && e.pattern === o.pattern && (kind === 'week' || isHomeEx(e)) && (kind !== 'fri' || !e.hard));
}
/* Byt segmenterne i en blok ud, så den guidede timer følger de byttede øvelser */
function swappedSegs(block, base) {
  const segs = block.timer.segs;
  if (!block.items) return segs;
  const res = block.items.map((it, i) => resolveItem(it, `${base}|${i}`)).map(r => r && r.swapped ? r : null);
  if (!res.some(Boolean)) return segs;
  const out = [];
  for (let k = 0; k < segs.length;) {
    const s = segs[k], r = s.it != null ? res[s.it] : null;
    if (!r) { out.push(s); k++; continue; }
    let j = k; while (j < segs.length && segs[j].it === s.it) j++;
    out.push(...replaceGroup(segs.slice(k, j), r));
    k = j;
  }
  return out;
}
function replaceGroup(group, r) {
  const e = EX[r.ex], nm = r.name || e.name, f = group[0];
  const meta = { round: f.round, rounds: f.rounds, it: f.it };
  if (e.pattern === 'cardio') return group.map(s => ({ ...s, label: nm + (s.label.includes(' · ') ? ' · ' + s.label.split(' · ').slice(1).join(' · ') : '') }));
  const origTimed = group.find(s => s.type === 'work');
  const secs = origTimed ? origTimed.secs : (e.secs || 0);
  if (secs) {
    if (e.perSide) return [{ ...S('work', secs, nm + ' · venstre side'), ...meta }, { ...S('rest', 8, 'Skift side'), ...meta }, { ...S('work', secs, nm + ' · højre side'), ...meta }];
    return [{ ...S('work', secs, nm), ...meta }];
  }
  return [{ ...R(`${nm} × ${String(r.dose).replace(/^× /, '').replace(/ reps$/, '')}`), ...meta }];
}

const weekItems = n => WEEKS[n - 1].blocks.flatMap(b => b.items.map((it, i) => ({ b, it, i })).filter(x => x.it.ex));
const isDone = ctx => {
  const p = ctx.split('|');
  if (p[0] === 'fri') return !!ST.fri.done[p[1]];
  if (p[0] === 'home') return !!ST.home.done[ctx];
  return !!ST.done[ctx];
};
function weekStats(n) {
  const list = weekItems(n);
  const done = list.filter(x => ST.done[`week|${n}|${x.b.id}|${x.i}`]).length;
  return { done, total: list.length };
}
const nextWeek = () => { for (let n = 1; n <= 8; n++) if (!ST.weeksDone.includes(n)) return n; return 8; };
/* Nuværende programuge: ud fra startdato, ellers første ikke-gennemførte uge.
   ST.week er kun den uge, du kigger på i programfanen. */
function curWeek() {
  if (ST.start) {
    const d = Math.floor((new Date(todayISO() + 'T12:00:00') - new Date(ST.start + 'T12:00:00')) / 864e5);
    return Math.min(8, Math.max(1, Math.floor(d / 7) + 1));
  }
  return nextWeek();
}
function checkFriWeek() { const k = isoWeekKey(); if (ST.fri.wk !== k) { ST.fri = { wk: k, done: {} }; save(); } }

/* ===== Progression ===== */
function progHTML(big) {
  const done = ST.weeksDone.length, nw = nextWeek();
  const lis = Array.from({ length: 8 }, (_, i) => {
    const n = i + 1; const cls = ST.weeksDone.includes(n) ? 'done' : (n === nw && done < 8 ? 'now' : '');
    return `<li class="${cls}" title="Uge ${n}"></li>`;
  }).join('');
  return `<div class="pc-head"><span>${big ? 'Gennemførte uger' : 'Din progression'}</span><strong>${done} af 8 uger</strong></div>
    <div class="pc-track" role="img" aria-label="${done} af 8 uger gennemført"><span class="pc-end">UGE 1</span><ol class="dots">${lis}</ol><span class="pc-end">UGE 8</span></div>
    ${big ? '' : `<button class="btn btn-lime btn-block" type="button" id="pcCta">${ICON.play}${done >= 8 ? 'Se uge 8 igen' : 'Gå til uge ' + nw}</button>`}`;
}
function renderProgress() {
  const hp = $('heroProgress'); if (hp) hp.innerHTML = progHTML(false);
  $('progBig').innerHTML = progHTML(true);
  $('progTiles').innerHTML = Array.from({ length: 8 }, (_, i) => {
    const n = i + 1, on = ST.weeksDone.includes(n); const st = weekStats(n);
    return `<button class="pt" type="button" data-weekdone="${n}" aria-pressed="${on}" aria-label="Uge ${n} ${on ? 'gennemført' : 'ikke gennemført'}">${on ? ICON.check.replace('<svg', '<svg width="20" height="20"') : ''}<span>UGE ${n}</span><small>${st.done}/${st.total}</small></button>`;
  }).join('');
}
function toggleWeekDone(n, force) { withFocus(() => toggleWeekDoneInner(n, force)); }
function toggleWeekDoneInner(n, force) {
  const on = ST.weeksDone.includes(n);
  const want = force ?? !on;
  ST.weeksDone = want ? [...new Set([...ST.weeksDone, n])].sort((a, b) => a - b) : ST.weeksDone.filter(x => x !== n);
  save();
  if (want && !on) toast(n < 8 ? `Uge ${n} gennemført. Klar til uge ${n + 1}.` : 'Alle 8 uger gennemført. Stærkt.');
  renderProgress(); renderWeekNav(); renderWeek(); renderCurrent();
}

/* ===== I dag + Min uge ===== */

/* ===== Ugenavigation og ugevisning ===== */
function renderWeekNav() {
  $('weekNav').innerHTML = WEEKS.map(W => {
    const sel = W.n === ST.week, done = ST.weeksDone.includes(W.n);
    return `<button class="wk" role="tab" type="button" id="tab-${W.n}" data-week="${W.n}" aria-selected="${sel}" aria-controls="weekView" tabindex="${sel ? 0 : -1}">UGE ${W.n}${done ? `<span class="ck" aria-label="gennemført">${ICON.check}</span>` : ''}</button>`;
  }).join('');
  $('weekChip').textContent = `Uge ${ST.week}`;
  centerWeekTab();
}
function centerWeekTab() {
  const el = $('tab-' + ST.week), sc = $('weekNav');
  if (el && sc.clientWidth) sc.scrollTo({ left: el.offsetLeft - sc.clientWidth / 2 + el.clientWidth / 2, behavior: prefersReduced() ? 'auto' : 'smooth' });
}
function selectWeek(n) {
  ST.week = Math.min(8, Math.max(1, n)); save();
  if (ST.coach.active) rebuildWeeks();
  renderWeekNav(); renderWeek();
}
/* Alt der afhænger af den nuværende (ikke den viste) uge */
function renderCurrent() {
  renderToday(); renderHome(); syncMatchWeek();
  const n = curWeek(), el = $('curWeekNote');
  if (el) el.textContent = `Nuværende uge: uge ${n}${ST.start ? '' : ' (første ikke-gennemførte uge). Angiv en startdato for at følge kalenderen.'}`;
  const sd = $('startDate'); if (sd && sd.value !== ST.start) sd.value = ST.start;
}
function ivlHTML(v, b) {
  const steps = v.steps.map((s, i) => `${i ? `<div class="ivl-arrow" aria-hidden="true">${ICON.down}</div>` : ''}<div class="ivl-step ${s.k}"><b>${s.t}</b><span>${s.l}</span>${s.sub ? `<small>${s.sub}</small>` : ''}</div>`).join('');
  const tot = b.timer ? Math.round(segTotal(b.timer.segs) / 60) : 0;
  return `<div class="ivl" role="group" aria-label="Intervalforløb">
    <div class="ivl-steps">${steps}<div class="ivl-arrow" aria-hidden="true">${ICON.down}</div><div class="ivl-rep">${ICON.repeat}Gentag ×${v.reps}</div></div>
    <p class="ivl-meta"><span>${v.foot || 'Følg timeren, så skifter den for dig'}</span><span>${tot ? 'Ca. ' + tot + ' min' : ''}</span></p></div>`;
}
function itemHTML(it0, ctx) {
  const it = resolveItem(it0, ctx);
  if (it.rest) return `<li class="item rest-row"><span class="rest-pill">${it.rest}</span>${it.label}</li>`;
  const e = EX[it.ex], name = it.name || e.name, done = isDone(ctx);
  return `<li class="item ${done ? 'is-done' : ''}">
    <button class="item-open" type="button" data-open="${ctx}" aria-label="Åbn ${esc(name)}: ${esc(it.dose)}">
      <span class="thumb" aria-hidden="true">${illustration(it.ex)}</span>
      <span class="item-txt"><span class="nm">${name}</span><span class="ds">${it.dose}</span>${it.note ? `<span class="nt">${it.note}</span>` : ''}${it.prog ? `<span class="nt prog">${esc(it.prog)}</span>` : ''}<span class="nt good">${esc(e.good.slice(0, 3).join(' · '))}</span>${it.swapped ? `<span class="nt swapped">↻ Byttet fra ${esc(it.orig.name || EX[it.orig.ex].name)}</span>` : ''}</span>
    </button>
    <button class="check" type="button" data-check="${ctx}" aria-pressed="${done}" aria-label="Markér ${esc(name)} som færdig"><span>${ICON.check}</span></button></li>`;
}
const parseNum = v => parseFloat(String(v ?? '').replace(',', '.'));
const fmtKm = v => String(Math.round(v * 100) / 100).replace('.', ',');
function testNote(n) {
  const t = ST.tests[n], a = ST.tests[1], b = ST.tests[8];
  let msg = t && t.date ? 'Senest gemt ' + daDate(t.date) + '. ' : 'Skriv tallene ned lige efter de 20 minutter. ';
  const d1 = a && parseNum(a.dist), d8 = b && parseNum(b.dist);
  if (d1 > 0 && d8 > 0) { const diff = d8 - d1; msg += `Uge 1: ${fmtKm(d1)} km · uge 8: ${fmtKm(d8)} km (${diff >= 0 ? '+' : '−'}${fmtKm(Math.abs(diff))} km).`; }
  else if (n === 8 && d1 > 0) msg += `Din startmåling i uge 1: ${fmtKm(d1)} km.`;
  return msg.trim();
}
function testFormHTML(n) {
  const t = ST.tests[n] || {};
  const opts = Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}" ${String(t.rpe || 7) === String(i + 1) ? 'selected' : ''}>${i + 1}</option>`).join('');
  return `<div class="testform" role="group" aria-label="Testresultat">
    <label class="field">Distance (km)<input id="tfDist" inputmode="decimal" placeholder="fx 9,8" value="${esc(t.dist || '')}"></label>
    <label class="field">Watt (gns.)<input id="tfWatt" inputmode="numeric" placeholder="hvis muligt" value="${esc(t.watt || '')}"></label>
    <label class="field">Gns. puls<input id="tfHr" inputmode="numeric" placeholder="slag/min" value="${esc(t.hr || '')}"></label>
    <label class="field">RPE<select id="tfRpe">${opts}</select></label>
    <button class="btn btn-lime btn-block" type="button" data-tfsave="${n}" style="grid-column:1/-1">Gem testresultat</button>
    <p class="saved-note" id="tfNote">${esc(testNote(n))}</p></div>`;
}
function blockHTML(b, n) {
  const timerBtn = b.timer ? `<button class="btn btn-lime" type="button" data-timer="${n}|${b.id}">${ICON.play}${b.timer.segs.length === 1 ? 'Start timer · ' + fmt(b.timer.segs[0].secs) : 'Start guidet timer'}</button>` : '';
  const restBtn = b.restTimer ? `<button class="btn" type="button" data-rest="${b.restTimer}" data-src="blk-${n}-${b.id}">${ICON.timer}Pausetimer ${b.restTimer} sek</button>` : '';
  return `<article class="block" id="blk-${n}-${b.id}">
    <header class="block-head"><span class="block-ic" aria-hidden="true">${ICON[b.icon]}</span><div><h4>${b.title}</h4><div class="tags">${b.tags.map((t, i) => `<span class="tag ${i === 0 ? 'lime' : ''}">${t}</span>`).join('')}</div></div></header>
    ${b.callout ? `<p class="callout">${ICON.talk}<span>${b.callout}</span></p>` : ''}
    ${b.ivl ? ivlHTML(b.ivl, b) : ''}
    <ul class="items">${b.items.map((it, i) => itemHTML(it, `week|${n}|${b.id}|${i}`)).join('')}</ul>
    ${b.testForm ? testFormHTML(n) : ''}
    ${b.link ? `<div class="block-actions"><button class="btn btn-lime" type="button" data-ctab="${b.link.tab}" data-go="${b.link.go}">${b.link.label}</button></div>` : ''}
    ${timerBtn || restBtn ? `<div class="block-actions">${timerBtn}${restBtn}</div>` : ''}</article>`;
}
function renderWeek() {
  const W = WEEKS[ST.week - 1], st = weekStats(W.n), pct = st.total ? Math.round(st.done / st.total * 100) : 0, wd = ST.weeksDone.includes(W.n);
  $('weekView').setAttribute('aria-labelledby', 'tab-' + W.n);
  $('weekView').innerHTML = `<div class="week-layout">
    <header class="wk-hero">
      <span class="bignum" aria-hidden="true">${W.n}</span>
      <p class="wk-of">Uge ${W.n} af 8</p>
      <h3>${W.title}</h3>
      <p class="desc">${W.desc}</p>
      <div class="phase-steps" aria-hidden="true">${PHASES.map((p, i) => `<span class="${i <= W.phase ? 'on' : ''}"></span>`).join('')}</div>
      <div class="wk-prog"><div class="bar" role="progressbar" aria-label="Øvelser klaret i uge ${W.n}" aria-valuemin="0" aria-valuemax="${st.total}" aria-valuenow="${st.done}"><i style="width:${pct}%"></i></div><b>${st.done}/${st.total}</b></div>
    </header>
    <div class="blocks">${W.plan ? '' : `<button class="btn btn-block btn-lime" type="button" data-ses-start="week|${W.n}|">${ICON.play}Start dagens træning</button>`}${(() => { let last = null; return W.blocks.map(b => { let h = ''; if (b.session && b.session.id !== last) { last = b.session.id; const dd = sessionDay(b.session.id); h = `<div class="sess-head"><h3 class="sess-h">${esc(b.session.title)}</h3>${dd != null ? `<small>${DAY_SHORT[dd]}</small>` : ''}<button class="btn btn-sm btn-lime" type="button" data-ses-start="week|${W.n}|${b.session.id}">Start pas</button></div>`; } return h + blockHTML(b, W.n); }).join(''); })()}
      <button class="btn btn-block wk-done-btn ${wd ? '' : 'btn-lime'}" type="button" data-weekdone="${W.n}" aria-pressed="${wd}">${ICON.check}${wd ? `Uge ${W.n} er gennemført` : `Markér uge ${W.n} som gennemført`}</button>
    </div></div>`;
}
function toggleDone(ctx) {
  const p = ctx.split('|');
  if (p[0] === 'fri') { ST.fri.done[p[1]] = !ST.fri.done[p[1]]; if (!ST.fri.done[p[1]]) delete ST.fri.done[p[1]]; save(); withFocus(renderFriday); return; }
  if (p[0] === 'home') {
    if (ST.home.done[ctx]) { delete ST.home.done[ctx]; delete ST.run[ctx]; } else ST.home.done[ctx] = true;
    const lv = HOME[+p[1]], t = todayISO();
    if (lv && lv.blocks.every(b => b.items.every((_, i) => ST.home.done[`home|${p[1]}|${b.id}|${i}`])) && !ST.homeLog.includes(t)) {
      ST.homeLog.push(t); ST.homeLog = ST.homeLog.slice(-120); toast('Alle øvelser klaret. Dagens rutine er registreret.');
    }
    save(); withFocus(renderHome); return;
  }
  if (ST.done[ctx]) { delete ST.done[ctx]; delete ST.run[ctx]; } else ST.done[ctx] = true;
  save();
  const n = +p[1];
  if (n === ST.week) {
    const st = weekStats(n);
    const btn = document.querySelector(`[data-check="${ctx}"]`);
    if (btn) { btn.setAttribute('aria-pressed', !!ST.done[ctx]); btn.closest('.item').classList.toggle('is-done', !!ST.done[ctx]); }
    const bar = document.querySelector('.wk-prog'); if (bar) { bar.querySelector('i').style.width = Math.round(st.done / st.total * 100) + '%'; bar.querySelector('b').textContent = `${st.done}/${st.total}`; bar.querySelector('.bar').setAttribute('aria-valuenow', st.done); }
    if (ST.done[ctx] && st.done === st.total && !ST.weeksDone.includes(n)) toast(`Alle øvelser i uge ${n} klaret. Markér ugen som gennemført.`);
  }
  renderProgress(); renderToday();
}

/* ===== Fredag ===== */
function renderFriday() {
  checkFriWeek();
  $('friItems').innerHTML = FRIDAY.items.map((it, i) => itemHTML(it, `fri|${i}`)).join('');
}

/* ===== Hjemme · før træning ===== */
const todayISO = () => localISO(new Date());
const homeLevel = () => ST.settings.homeLevel || (curWeek() <= 4 ? 1 : 2);
function checkHomeDay() { const t = todayISO(); if (ST.home.date !== t) { ST.home = { date: t, done: {} }; save(); } }
function weekDates() { const d = new Date(); const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [0, 1, 3].map(o => { const x = new Date(mon); x.setDate(mon.getDate() + o); return localISO(x); }); }
function renderHome() {
  checkHomeDay();
  const L = homeLevel(), lv = HOME[L], auto = !ST.settings.homeLevel;
  $('homeLevels').innerHTML = [1, 2].map(n => `<button class="chip" type="button" data-homelevel="${n}" aria-pressed="${n === L}">${HOME[n].label} · ${HOME[n].weeks}${auto && n === L ? ' (auto)' : ''}</button>`).join('');
  const wd = weekDates(), names = ['MAN', 'TIR', 'TOR'];
  const count = wd.filter(d => ST.homeLog.includes(d)).length;
  $('homeWeek').innerHTML = `<span class="hw-txt"><b>${count} af 3</b> før-træninger denne uge</span><span class="hw-pills">${wd.map((d, i) => `<span class="hw-pill ${ST.homeLog.includes(d) ? 'on' : ''} ${d === todayISO() ? 'now' : ''}">${ST.homeLog.includes(d) ? ICON.check : ''}${names[i]}</span>`).join('')}</span>`;
  $('homeBlocks').innerHTML = lv.blocks.map(b => {
    const its = b.items.map((it, i) => itemHTML(it, `home|${L}|${b.id}|${i}`)).join('');
    return `<article class="block" id="home-${b.id}"><header class="block-head"><span class="block-ic" aria-hidden="true">${ICON[b.icon]}</span><div><h4>${b.title}</h4><div class="tags">${b.tags.map((t, i) => `<span class="tag ${i === 0 ? 'lime' : ''}">${t}</span>`).join('')}</div></div></header>
      <ul class="items">${its}</ul><div class="block-actions"><button class="btn btn-lime" type="button" data-hometimer="${L}|${b.id}">${ICON.play}Start guidet timer</button></div></article>`;
  }).join('');
  const done = ST.homeLog.includes(todayISO());
  const btn = $('homeDone'); btn.setAttribute('aria-pressed', done); btn.className = `btn btn-block wk-done-btn ${done ? '' : 'btn-lime'}`;
  btn.innerHTML = ICON.check + (done ? 'Dagens rutine er klaret' : 'Markér dagens rutine som klaret');
}
function toggleHomeDone() {
  const t = todayISO();
  if (ST.homeLog.includes(t)) ST.homeLog = ST.homeLog.filter(x => x !== t);
  else { ST.homeLog.push(t); toast('Rutinen er klaret. God træning.'); }
  ST.homeLog = ST.homeLog.slice(-120); save(); withFocus(renderHome);
}

/* ===== Øvelsesbibliotek ===== */
let libQ = '', libShown = 18;
const LIB_PAGE = 18;
function libFiltered() {
  const g = ST.settings.lib, eq = ST.settings.libEquip, c = ST.settings.libCat, q = libQ.trim().toLowerCase();
  return Object.entries(EX).filter(([, e]) =>
    (g === 'Alle' || e.good.includes(g)) &&
    (c === 'Alle' || e.cat === c) &&
    (eq === 'Alle' || (eq === 'home' ? isHomeEx(e) : e.equip === eq)) &&
    (!q || `${e.name} ${e.goal} ${e.good.join(' ')} ${e.equip} ${e.cat}`.toLowerCase().includes(q)));
}
function libCardHTML(id, e) {
  return `<article class="ex-card">
      <button class="ex-illu" type="button" data-open="lib|${id}" aria-label="Vis ${esc(e.name)} i stor visning">${illustration(id)}</button>
      <div class="ex-body"><h3>${e.name}</h3>${goodTagsHTML(e)}<p class="ex-meta">${esc(e.cat)}${isHomeEx(e) ? ' · kan laves hjemme' : ''}</p><p class="ex-goal">${e.goal}</p>
        <ol class="ex-steps">${['Start', 'Bevægelse', 'Slut'].map((l, i) => `<li><b>${l}</b><span>${e.how[i]}</span></li>`).join('')}</ol>
        <dl class="ex-dose"><div><dt>Reps/tid</dt><dd>${e.dose}</dd></div><div><dt>Pause</dt><dd>${e.rest}</dd></div></dl>
        <ul class="ex-tips">${e.tips.map(t => `<li>${ICON.tip}<span>${t}</span></li>`).join('')}</ul></div></article>`;
}
function renderLibList() {
  const list = libFiltered(), shown = list.slice(0, libShown);
  $('libCount').textContent = `${list.length} af ${Object.keys(EX).length} øvelser`;
  $('lib').innerHTML = shown.length ? shown.map(([id, e]) => libCardHTML(id, e)).join('')
    : '<p class="empty">Ingen øvelser matcher dine filtre. <button class="link-btn" type="button" id="libReset">Nulstil filtre</button></p>';
  $('libMore').hidden = list.length <= libShown;
  $('libMore').textContent = `Vis flere (${list.length - libShown} mere)`;
}
function renderLibrary() {
  const g = ST.settings.lib;
  $('libChips').innerHTML = ['Alle', ...BENEFITS.map(b => b.k)].map(c => `<button class="chip" type="button" data-good="${c}" aria-pressed="${c === g}">${c}</button>`).join('');
  $('libEquip').innerHTML = [['Alle', 'Alt udstyr'], ['home', 'Kan laves hjemme'], ...EQUIPS.map(x => [x, x])].map(([v, t]) => `<option value="${v}" ${v === ST.settings.libEquip ? 'selected' : ''}>${t}</option>`).join('');
  $('libCat').innerHTML = CATS.map(c => `<option value="${c}" ${c === ST.settings.libCat ? 'selected' : ''}>${c === 'Alle' ? 'Alle typer' : c}</option>`).join('');
  $('libLegend').innerHTML = BENEFITS.map(b => `<dt>${b.k}</dt><dd>${b.d}</dd>`).join('');
  renderLibList();
}

/* ===== RPE ===== */
function renderRPE() {
  $('rpeMeter').innerHTML = RPE.map(r => `<div class="rpe-row" role="listitem"><span class="rpe-n">${r.n}</span><span class="rpe-cell"><span class="rpe-bar" style="--c:${r.c};--w:${r.w}%">${r.t}</span><span class="rpe-cue">${r.cue}</span></span></div>`).join('');
}

/* ===== Øvelsesdialog ===== */
let sheetCtx = null;
let mDateTouched = false, editMatchId = null;
function openSheet(ctx) {
  sheetCtx = ctx;
  const p = ctx.split('|');
  let exId, item = null, block = null, where = 'Øvelsesbibliotek', src = null, base = null;
  if (p[0] === 'week') { const n = +p[1]; block = WEEKS[n - 1].blocks.find(b => b.id === p[2]); item = block.items[+p[3]]; exId = item.ex; where = `Uge ${n} · ${block.title}`; src = `blk-${n}-${block.id}`; base = `week|${n}|${block.id}`; }
  else if (p[0] === 'fri') { item = FRIDAY.items[+p[1]]; exId = item.ex; block = { timer: FRIDAY.timer, items: FRIDAY.items, tags: ['2 runder'] }; where = 'Fredag · aktivering'; src = 'fredag'; base = 'fri'; }
  else if (p[0] === 'home') { block = HOME[+p[1]].blocks.find(b => b.id === p[2]); item = block.items[+p[3]]; exId = item.ex; where = `Hjemme · ${block.title}`; src = `home-${block.id}`; base = `home|${p[1]}|${block.id}`; }
  else exId = p[1];
  const origItem = item;
  if (item) { item = resolveItem(item, ctx); exId = item.ex; }
  const e = EX[exId], name = (item && item.name) || e.name;
  const tag = re => block && block.tags ? (block.tags.find(t => re.test(t)) || '') : '';
  const roundsTag = tag(/runder|sæt/), pauseTag = tag(/^Pause/).replace('Pause ', '');
  const tiles = [['Reps/tid', item ? item.dose.replace(/^× /, '') : e.dose]];
  if (roundsTag) tiles.push(['Runder', roundsTag.replace(/ ?(runder|sæt)/, '') + (/sæt/.test(roundsTag) ? ' sæt' : '')]);
  tiles.push(['Pause', block && block.restTimer ? block.restTimer + ' sek' : (pauseTag || e.rest)]);
  const secs = item ? item.secs : e.secs, perSide = item ? item.perSide : e.perSide;
  let timerBtn = '';
  const segs = (item && item.segs) || e.segs;
  if (segs) timerBtn = `<button class="btn btn-lime" type="button" data-sheet-timer="segs">${ICON.play}Start ${exId === 'reaction' ? 'reaktion' : 'timer'}</button>`;
  else if (secs) timerBtn = `<button class="btn btn-lime" type="button" data-sheet-timer="item">${ICON.play}Start ${perSide ? fmt(secs) + '/side' : fmt(secs)}</button>`;
  else if (block && block.restTimer) timerBtn = `<button class="btn btn-lime" type="button" data-sheet-timer="rest">${ICON.timer}Pause ${block.restTimer} sek</button>`;
  else if (block && block.timer) timerBtn = `<button class="btn btn-lime" type="button" data-sheet-timer="block">${ICON.play}Guidet timer</button>`;
  const canDone = p[0] !== 'lib', done = canDone && isDone(ctx);
  const doneBtn = canDone ? `<button class="btn" type="button" data-sheet-done aria-pressed="${done}">${ICON.check}${done ? 'Færdig' : 'Markér færdig'}</button>` : `<button class="btn" type="button" data-sheet-close>Luk</button>`;
  const d = $('exSheet');
  d.innerHTML = `<div class="sheet-in"><div class="grab" aria-hidden="true"></div>
    <div class="sheet-top"><div><p class="today-small">${where}</p><h3 id="sheetTitle">${name}</h3></div><button class="sheet-close" type="button" data-sheet-close aria-label="Luk">${ICON.close}</button></div>
    <div class="m-illu">${illustration(exId)}</div>
    <div class="m-dose">${tiles.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
    ${item && item.prog ? `<p class="prog-line">${esc(item.prog)}</p>` : ''}
    ${goodTagsHTML(e)}
    <p class="ex-goal">${e.goal}</p>
    <ol class="ex-steps">${['Start', 'Bevægelse', 'Slut'].map((l, i) => `<li><b>${l}</b><span>${e.how[i]}</span></li>`).join('')}</ol>
    <ul class="ex-tips">${e.tips.map(t => `<li>${ICON.tip}<span>${t}</span></li>`).join('')}</ul>
    ${origItem ? `<button class="btn btn-ghost btn-block" type="button" data-swap-open>${ICON.repeat}${item.swapped ? 'Skift igen eller gendan original' : 'Skift øvelse'}</button>` : ''}
    ${e.log ? logSectionHTML(exId, item) : ''}
    <div class="m-actions">${timerBtn || ''}${doneBtn}</div></div>`;
  if (!timerBtn) d.querySelector('.m-actions').style.gridTemplateColumns = '1fr';
  d._ctx = { exId, item, block, name, secs, perSide, src, segs, base, origEx: origItem && origItem.ex };
  if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); } else d.setAttribute('open', '');
  d.scrollTop = 0;
}
function goodTagsHTML(e) {
  return `<div class="good-row"><span class="good-lbl">Godt til</span>${e.good.map(g => `<span class="tag lime">${g}</span>`).join('')}<span class="tag eq">${esc(e.equip)}</span></div>`;
}
function openSwap() {
  const d = $('exSheet'), c = d._ctx, o = EX[c.origEx];
  const opts = swapOptions(sheetCtx, c.origEx);
  const li = ([id, e]) => `<li class="item ${id === c.exId ? 'is-done' : ''}"><button class="item-open" type="button" data-swap-pick="${id}" aria-label="Vælg ${esc(e.name)}">
      <span class="thumb" aria-hidden="true">${illustration(id)}</span>
      <span class="item-txt"><span class="nm">${e.name}${id === c.exId ? ' · valgt' : ''}</span><span class="ds">${esc(e.dose)}</span><span class="nt good">${esc(e.good.join(' · '))}</span><span class="nt">${esc(e.equip)}</span></span></button></li>`;
  d.innerHTML = `<div class="sheet-in"><div class="grab" aria-hidden="true"></div>
    <div class="sheet-top"><div><p class="today-small">Skift øvelse</p><h3 id="sheetTitle">${o.name}</h3></div><button class="sheet-close" type="button" data-sheet-close aria-label="Luk">${ICON.close}</button></div>
    <p class="sec-lead">Vælg en øvelse, der træner det samme (${PATTERN_TXT[o.pattern]}). Dosis følger den nye øvelse.</p>
    ${ST.swaps[sheetCtx] ? `<button class="btn btn-block" type="button" data-swap-pick="${c.origEx}">${ICON.reset}Gendan original: ${o.name}</button>` : ''}
    <ul class="items">${opts.map(li).join('') || '<li class="empty">Ingen alternativer til denne øvelse endnu.</li>'}</ul>
    <div class="m-actions" style="grid-template-columns:1fr"><button class="btn" type="button" data-swap-back>Tilbage</button></div></div>`;
  d.scrollTop = 0;
}
function pickSwap(id) {
  const ctx = sheetCtx, c = $('exSheet')._ctx;
  if (!EX[id]) return;
  if (id === c.origEx) delete ST.swaps[ctx]; else { ST.swaps[ctx] = id; const pf = ST.coach.prefs; pf[c.origEx] = pf[c.origEx] || {}; pf[c.origEx][id] = (pf[c.origEx][id] || 0) + 1; }
  save();
  const k = ctx.split('|')[0];
  if (k === 'week') renderWeek(); else if (k === 'fri') renderFriday(); else if (k === 'home') renderHome();
  openSheet(ctx);
  toast(id === c.origEx ? 'Original øvelse gendannet' : `Skiftet til ${EX[id].name}`);
}
const fmtNum = v => String(Math.round(v * 10) / 10).replace('.', ',');
function logListHTML(exId) {
  const list = ST.logs.filter(l => l.ex === exId).slice(-3).reverse();
  if (!list.length) return '<p class="empty">Ingen registreringer endnu.</p>';
  return `<ul class="log-list">${list.map(l => `<li><span>${esc(daDate(l.date))}</span><b>${l.pr ? '★ ' : ''}${l.kg ? fmtNum(l.kg) + ' kg' : 'kropsvægt'} × ${fmtNum(l.reps)}</b>${l.rpe ? `<small>RPE ${l.rpe}</small>` : ''}</li>`).join('')}</ul>`;
}
function closeSheet() { const d = $('exSheet'); if (d.open) { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); } }

/* ===== Timer ===== */
const TPRE = [
  { id: 'p1', name: '30/60 × 10', w: 30, r: 60, n: 10 },
  { id: 'p2', name: '30/45 × 12', w: 30, r: 45, n: 12 },
  { id: 'p3', name: '20/40 × 8', w: 20, r: 40, n: 8 },
  { id: 'p4', name: '30/60 × 6', w: 30, r: 60, n: 6 },
  { id: 'custom', name: 'Egen' }
];
const presetSegs = (w, r, n) => rounds(n, [S('work', w, 'Arbejde'), S('rest', r, 'Pause')]);
const TM = { tailSecs: 0, tailReps: 0, name: '', segs: [], i: 0, left: 0, el: 0, running: false, last: 0, iv: null, done: false, src: null, preset: null, cue: null, cueT: 0 };
const CUES = { L: '← VENSTRE', R: 'HØJRE →', U: '↑ OP', D: '↓ NED' };
const QUIET = ['in', 'hold', 'out', 'react'];
const curSeg = () => TM.segs[TM.i];
function recalcTail() {
  let secs = 0, reps = 0;
  for (let k = TM.i + 1; k < TM.segs.length; k++) { const x = TM.segs[k]; if (x.type === 'reps') reps++; else secs += x.secs; }
  TM.tailSecs = secs; TM.tailReps = reps;
}
function tLoad(name, segs, opt = {}) {
  tPause();
  const first = segs[0] || { round: 1, rounds: 1 };
  TM.name = name;
  TM.segs = opt.noPrep ? segs : [{ type: 'prep', secs: 5, label: 'Gør dig klar', round: first.round || 1, rounds: first.rounds || 1 }, ...segs];
  TM.i = 0; TM.left = TM.segs[0].secs; TM.el = 0; TM.done = false; TM.src = opt.src || null; TM.preset = opt.preset || null; TM.cue = null; TM.cueT = 1;
  recalcTail(); renderPresetChips(); updateStepVals(); tRender();
  if (opt.autostart) tStart();
}
function tStart() {
  if (!TM.segs.length) return;
  if (TM.done) tReset();
  if (TM.running) return;
  unlockAudio();
  TM.running = true; TM.last = performance.now();
  if (TM.i === 0 && TM.left === TM.segs[0].secs) cue(TM.segs[0].type === 'prep' ? 'tick' : TM.segs[0].type);
  TM.iv = setInterval(tTick, 200);
  keepAwake(true); tRender();
}
function tPause() { TM.running = false; clearInterval(TM.iv); TM.iv = null; keepAwake(false); tRender(); }
function tReset() { tPause(); TM.i = 0; TM.left = TM.segs[0] ? TM.segs[0].secs : 0; TM.el = 0; TM.done = false; TM.cue = null; TM.cueT = 1; recalcTail(); tRender(); }
/* Tiden regnes ud fra uret (performance.now), ikke antal ticks. Hvis telefonen
   har sat siden på pause, fordeles den forløbne tid over de segmenter, der er
   gået, så timeren ikke driver. */
function tTick() {
  const now = performance.now();
  let dt = Math.min((now - TM.last) / 1000, 6 * 3600); TM.last = now;
  for (let guard = 0; dt > 0 && guard < 1000; guard++) {
    const s = curSeg(); if (!s) return;
    if (s.type === 'reps') { TM.el += dt; break; }
    if (TM.left > dt) {
      const before = Math.ceil(TM.left); TM.left -= dt; const after = Math.ceil(TM.left);
      if (s.type === 'react') { TM.cueT -= dt; if (TM.cueT <= 0 && TM.left > 0.8) newCue(); }
      if (after < before && after >= 1 && after <= 3 && !QUIET.includes(s.type)) cue('tick');
      break;
    }
    dt -= TM.left; TM.left = 0;
    if (!tAdvance(dt > 0.05)) return;
  }
  tRender();
}
function tAdvance(quiet = false) {
  TM.i++;
  if (TM.i >= TM.segs.length) { TM.i = TM.segs.length - 1; TM.left = 0; TM.done = true; recalcTail(); tPause(); cue('done'); toast('Timer færdig. Godt arbejde.'); return false; }
  const s = curSeg(); TM.left = s.secs; TM.el = 0; TM.cue = null; TM.cueT = 1.2; recalcTail();
  if (!quiet) cue(s.type);
  if (!TM.running) tStart(); else tRender();
  return true;
}
function newCue() {
  const keys = Object.keys(CUES).filter(k => k !== TM.cue);
  TM.cue = keys[Math.floor(Math.random() * keys.length)];
  TM.cueT = 1.6 + Math.random() * 1.9;
  tone(TM.cue === 'U' ? 1180 : TM.cue === 'D' ? 520 : 880, .12); vib(70);
  const d = document.querySelector('.t-display'); if (d) { d.classList.remove('cue-pop'); void d.offsetWidth; d.classList.add('cue-pop'); }
}
const PHASE_TXT = { idle: 'KLAR', prep: 'KLAR', work: 'ARBEJD', push: 'ARBEJD', rest: 'PAUSE', reps: 'GENTAG', done: 'FÆRDIG', in: 'IND', hold: 'HOLD', out: 'UD', react: 'REAKTION' };
function tPhase() {
  if (TM.done) return 'done';
  if (!TM.segs.length) return 'idle';
  if (!TM.running && TM.i === 0 && TM.left === TM.segs[0].secs) return 'idle';
  return curSeg().type;
}
function tRender() {
  const box = $('timerBox'); if (!box) return;
  const s = curSeg() || { type: 'work', secs: 0, label: '', round: 1, rounds: 1 };
  const ph = tPhase();
  if (box.dataset.phase !== ph) box.dataset.phase = ph;
  const cueKey = ph === 'react' && TM.cue ? TM.cue : '';
  if (box.dataset.cue !== cueKey) box.dataset.cue = cueKey;
  setText($('tName'), TM.name);
  setText($('tRound'), `RUNDE ${s.round || 1} / ${s.rounds || 1}`);
  setText($('tPhase'), ph === 'react' ? (TM.cue ? CUES[TM.cue] : 'KLAR…') : ph === 'idle' && TM.segs[0] && TM.segs[0].type !== 'prep' ? PHASE_TXT[TM.segs[0].type] : PHASE_TXT[ph]);
  setText($('tTime'), TM.done ? '0:00' : s.type === 'reps' ? fmt(TM.el) : fmt(Math.ceil(TM.left)));
  setText($('tLabel'), TM.done ? 'Godt arbejde' : (s.type === 'reps' ? s.label + ' · tryk når du er færdig' : (s.type === 'push' ? 'Hårdere · ' : '') + s.label));
  $('tProg').style.width = (TM.done ? 100 : s.type === 'reps' ? 100 : s.secs ? (1 - TM.left / s.secs) * 100 : 0) + '%';
  const nx = TM.segs[TM.i + 1];
  setText($('tNext'), TM.done ? '' : nx ? (nx.type === 'reps' ? `Næste: ${nx.label}` : `Næste: ${PHASE_TXT[nx.type]} ${fmt(nx.secs)} · ${nx.label}`) : 'Sidste del');
  const rem = (s.type === 'reps' ? 0 : TM.left) + TM.tailSecs, reps = (s.type === 'reps' ? 1 : 0) + TM.tailReps;
  setText($('tTotal'), TM.done ? '' : `${fmt(rem)} tilbage${reps ? ' + reps' : ''}`);
  $('tStart').disabled = TM.running; $('tPause').disabled = !TM.running;
  $('tRepsBtn').hidden = !(s.type === 'reps' && !TM.done && ph !== 'idle');
  $('tBack').hidden = !TM.src;
  renderMini(ph, s);
  if (SES && SES.resting) sesRestTick();
}
let timerInView = false; // sand, når timer-siden er den viste side (så skjules mini-timeren)
function renderMini(ph, s) {
  const m = $('miniTimer'), active = !['idle', 'done'].includes(ph);
  const shown = active && !(curPage === 'timer' || (curPage === 'pas' && SES && SES.resting));
  m.classList.toggle('show', shown);
  $('app').classList.toggle('has-mini', shown);
  if (m.dataset.phase !== ph) m.dataset.phase = ph;
  setText($('miniTime'), s.type === 'reps' ? fmt(TM.el) : fmt(Math.ceil(TM.left)));
  setText($('miniPhase'), ph === 'react' && TM.cue ? CUES[TM.cue] : (PHASE_TXT[ph] || ''));
  setText($('miniRound'), `R ${s.round || 1}/${s.rounds || 1}`);
  if (m._run !== TM.running) {
    m._run = TM.running;
    $('miniToggle').innerHTML = TM.running ? ICON.pause : ICON.play;
    $('miniToggle').setAttribute('aria-label', TM.running ? 'Pause timer' : 'Start timer');
  }
}
function renderPresetChips() {
  $('tPresets').innerHTML = TPRE.map(p => `<button class="chip" type="button" data-preset="${p.id}" aria-pressed="${TM.preset === p.id}">${p.name}</button>`).join('')
    + (TM.preset ? '' : TM.name ? `<span class="chip" aria-pressed="true" style="display:inline-flex;align-items:center">${esc(TM.name)}</span>` : '');
}
/* Stepperne bygges én gang og opdateres på stedet, så knappen under fingeren
   ikke udskiftes midt i et hold-nede. */
function buildSteppers() {
  const step = (k, label) => `<div class="stepper"><label id="lbl-${k}">${label}</label><div class="sv" id="sv-${k}" aria-live="polite"></div><div class="sb"><button type="button" data-step="${k}|-1" aria-label="${label} ned">−</button><button type="button" data-step="${k}|1" aria-label="${label} op">+</button></div></div>`;
  $('tCustom').innerHTML = step('work', 'Arbejde (sek)') + step('rest', 'Pause (sek)') + step('rounds', 'Runder');
  updateStepVals();
}
function updateStepVals() {
  const c = ST.settings.custom;
  ['work', 'rest', 'rounds'].forEach(k => { const el = $('sv-' + k); if (el) setText(el, c[k]); });
}
function loadPreset(id, autostart = false) {
  if (id === 'custom') { const c = ST.settings.custom; tLoad(`Egen · ${c.work}/${c.rest} × ${c.rounds}`, presetSegs(c.work, c.rest, c.rounds), { preset: 'custom', autostart }); return; }
  const p = TPRE.find(x => x.id === id); tLoad(`Interval · ${p.name}`, presetSegs(p.w, p.r, p.n), { preset: id, autostart });
}
function stepCustom(k, dir) {
  const c = ST.settings.custom, lim = { work: [5, 600, 5], rest: [0, 600, 5], rounds: [1, 40, 1] }[k];
  c[k] = Math.min(lim[1], Math.max(lim[0], c[k] + dir * lim[2])); save(); updateStepVals();
  // Rør kun timeren, hvis den ikke kører og ikke er et igangværende programforløb
  if (!TM.running && !TM.src) loadPreset('custom');
}

/* Hold nede på en +/- knap for at gentage trinnet med stigende hastighed —
   uden dette krævede et spring fra 30 til 600 sek over 100+ enkelte tryk. */
let stepHoldTimer = null;
function clearStepHold() { clearTimeout(stepHoldTimer); stepHoldTimer = null; }
function startStepHold(k, dir) {
  stepCustom(k, dir); // selve trykket udfører altid det første trin
  clearStepHold();
  let delay = 450;
  const tick = () => { stepCustom(k, dir); delay = Math.max(60, delay - 40); stepHoldTimer = setTimeout(tick, delay); };
  stepHoldTimer = setTimeout(tick, delay);
}
function startProgramTimer(name, segs, src, noPrep = false) {
  tLoad(name, segs, { src, autostart: true, noPrep });
  closeSheet();
  pageScroll.timer = 0; go('timer');
}

/* Lyd, vibration, skærm */
let AC = null;
function unlockAudio() {
  if (!ST.settings.sound) return;
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state !== 'running') AC.resume(); } catch (e) { }
}
function tone(f, d, when = 0, vol = .28) {
  if (!ST.settings.sound || !AC) return;
  try {
    const t = AC.currentTime + when, o = AC.createOscillator(), g = AC.createGain();
    o.type = 'square'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * .5, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .03);
  } catch (e) { }
}
const VIB_SUPPORTED = 'vibrate' in navigator;
function vib(p) { if (ST.settings.vib && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { } } }
/* Safari på iOS har aldrig understøttet Vibration API'et — uden dette ville
   brugeren slå "Vibration" til og aldrig få besked om, at den reelt intet gør,
   netop i situationer (eksplosive øvelser) hvor de ikke kigger på skærmen. */
function initVibrationToggle() {
  if (VIB_SUPPORTED) return;
  const b = $('tgVib');
  if (!b) return;
  ST.settings.vib = false; save();
  b.disabled = true;
  b.setAttribute('aria-pressed', 'false');
  b.title = 'Ikke understøttet i denne browser/på denne enhed (bl.a. alle iPhones)';
  if (!b.querySelector('.toggle-note')) b.insertAdjacentHTML('beforeend', '<small class="toggle-note">Ikke på denne enhed</small>');
}
function cue(type) {
  if (type === 'tick') { tone(660, .07); return; }
  if (type === 'in' || type === 'out' || type === 'hold') { tone(type === 'in' ? 520 : type === 'out' ? 440 : 600, .12, 0, .12); return; }
  if (type === 'react') { tone(990, .14); vib([120]); return; }
  if (type === 'work' || type === 'push' || type === 'reps') { tone(990, .14); tone(990, .2, .18); vib([120, 80, 160]); }
  else if (type === 'rest') { tone(520, .4); vib([320]); }
  else if (type === 'done') { tone(660, .14); tone(880, .14, .17); tone(1180, .4, .34); vib([150, 80, 150, 80, 320]); }
}
let WL = null, wantAwake = false;
async function keepAwake(on) {
  wantAwake = on;
  try {
    if (on) {
      if ('wakeLock' in navigator && !WL) {
        const lock = await navigator.wakeLock.request('screen');
        // Hvis ønsket er ændret, mens vi ventede (pause/nulstil), frigives låsen straks
        if (!wantAwake || WL) { lock.release().catch(() => { }); return; }
        WL = lock;
        lock.addEventListener('release', () => { if (WL === lock) WL = null; });
      }
    } else if (WL) { const l = WL; WL = null; await l.release(); }
  } catch (e) { WL = null; }
}

/* ===== Kamp-tracker ===== */
function renderRates() {
  $('rates').innerHTML = METRICS.map(m => `<div class="rate"><div class="rate-top"><label for="r-${m.k}">${m.t}</label><output id="o-${m.k}" for="r-${m.k}">6</output></div>
    <input type="range" id="r-${m.k}" min="1" max="10" step="1" value="6" style="--p:55.5%"></div>`).join('');
}
function syncRange(el) { const v = +el.value; el.style.setProperty('--p', ((v - 1) / 9 * 100) + '%'); const o = $('o-' + el.id.slice(2)); if (o) o.textContent = v; }
function weekAvg(w, key) {
  const list = ST.matches.filter(m => +m.week === w); if (!list.length) return null;
  const val = m => key === 'avg' ? METRICS.reduce((a, x) => a + +m[x.k], 0) / METRICS.length : +m[key];
  return list.reduce((a, m) => a + val(m), 0) / list.length;
}
function renderChart() {
  const key = ST.settings.metric || 'avg';
  const opts = [{ k: 'avg', t: 'Snit af alle', c: '#C8F03C' }, ...METRICS];
  $('metricChips').innerHTML = opts.map(o => `<button class="chip" type="button" data-metric="${o.k}" aria-pressed="${o.k === key}">${o.k === 'avg' ? o.t : o.t.replace(' sidst i kampen', '')}</button>`).join('');
  const W = 420, H = 260, L = 34, Rr = 16, T = 30, B = 34;
  const x = w => L + (w - 1) * (W - L - Rr) / 7, y = v => T + (10 - v) / 9 * (H - T - B);
  const col = (opts.find(o => o.k === key) || opts[0]).c;
  let g = '';
  [2, 4, 6, 8, 10].forEach(v => { g += `<line x1="${L}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}" stroke="#24322B" stroke-width="1.5"/><text class="ax" x="${L - 12}" y="${y(v) + 4}" text-anchor="end">${v}</text>`; });
  for (let w = 1; w <= 8; w++) g += `<text class="ax" x="${x(w)}" y="${H - 12}" text-anchor="middle">U${w}</text>`;
  const pts = []; for (let w = 1; w <= 8; w++) { const v = weekAvg(w, key); if (v != null) pts.push([w, v]); }
  if (pts.length) {
    const d = pts.map(([w, v], i) => `${i ? 'L' : 'M'}${x(w).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    if (pts.length > 1) g += `<path d="${d} L${x(pts[pts.length - 1][0]).toFixed(1)} ${y(1)} L${x(pts[0][0]).toFixed(1)} ${y(1)} Z" fill="${col}" opacity=".12"/>`;
    g += `<path d="${d}" fill="none" stroke="${col}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach(([w, v]) => { g += `<circle cx="${x(w)}" cy="${y(v)}" r="7" fill="#16201B" stroke="${col}" stroke-width="3.5"/><text x="${x(w)}" y="${y(v) - 14}" text-anchor="middle" fill="#F1F5EF" style="font:800 19px var(--font-d)">${v.toFixed(1).replace('.', ',')}</text>`; });
  }
  $('chart').innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Graf over ${esc((opts.find(o => o.k === key) || {}).t)} pr. uge">${g}</svg>${pts.length ? '' : '<p class="empty">Ingen kampe endnu. Registrér din første kamp efter lørdag, så tegner grafen din udvikling.</p>'}`;
}
function renderHistory() {
  const list = [...ST.matches].sort((a, b) => b.date.localeCompare(a.date));
  $('history').innerHTML = list.length ? list.map(m => `<li class="hist"><div class="hist-top"><div><b>${esc(daDate(m.date))}</b> <span class="tag">Uge ${esc(m.week)}</span></div>
      <div class="hist-btns"><button class="icon-btn" type="button" data-edit="${esc(m.id)}" aria-label="Redigér kampen ${esc(daDate(m.date))}">${ICON.edit}</button>
      <button class="icon-btn" type="button" data-del="${esc(m.id)}" aria-label="Slet kampen ${esc(daDate(m.date))}">${ICON.trash}</button></div></div>
      <div class="hist-vals">${METRICS.map(x => `<span><b>${esc(m[x.k])}</b>${x.short}</span>`).join('')}</div>${m.note ? `<p>${esc(m.note)}</p>` : ''}</li>`).join('')
    : '<li class="empty">Dine kampe vises her.</li>';
}
function setTrackerTab(t) {
  const g = document.querySelector('.tracker-grid'); if (g) g.dataset.tab = t;
  document.querySelectorAll('.seg-btn').forEach(b => b.setAttribute('aria-selected', b.dataset.seg === t));
}
function syncMatchWeek() { if (!editMatchId && $('mWeek')) $('mWeek').value = curWeek(); }
function setMatchEditing(id) {
  editMatchId = id;
  $('mSubmit').textContent = id ? 'Opdatér kamp' : 'Gem kamp';
  $('mCancel').hidden = !id;
}
function startEditMatch(id) {
  const m = ST.matches.find(x => String(x.id) === String(id)); if (!m) return;
  setMatchEditing(m.id);
  $('mDate').value = m.date; mDateTouched = true; $('mWeek').value = m.week; $('mNote').value = m.note || '';
  METRICS.forEach(x => { const r = $('r-' + x.k); r.value = m[x.k]; syncRange(r); });
  setTrackerTab('new'); $('page-tracker').scrollTop = 0;
  toast('Redigerer kamp. Tryk "Opdatér kamp" for at gemme.');
}
function renderTracker() {
  if (!document.querySelector('.tracker-grid').dataset.tab) setTrackerTab('new');
  $('mWeek').innerHTML = WEEKS.map(W => `<option value="${W.n}">Uge ${W.n}</option>`).join('');
  if (!$('mDate').value || !mDateTouched) $('mDate').value = lastSaturday();
  syncMatchWeek();
  renderChart(); renderHistory();
}

/* ===== Hændelser ===== */
document.addEventListener('click', e => {
  const t = e.target.closest('button, a'); if (!t) return;
  const ds = t.dataset;
  if (ds.open) { openSheet(ds.open); return; }
  if (ds.check) { toggleDone(ds.check); return; }
  if (ds.week) { selectWeek(+ds.week); return; }
  if (ds.weekdone) { toggleWeekDone(+ds.weekdone); return; }
  if (ds.sesStart !== undefined) { startSession(ds.sesStart); return; }
  if (ds.ses) { sesAction(ds.ses, ds); return; }
  if (ds.sact) { statusAction(ds.sact, ds); return; }
  if (ds.cact) { coachAction(ds.cact, ds); return; }
  if (ds.ctab) { setCoachTab(ds.ctab); if (ds.go) go(ds.go); return; }
  if (ds.go) { if (ds.go === 'program') selectWeek(curWeek()); go(ds.go); return; }
  if (ds.seg) { setTrackerTab(ds.seg); $('page-tracker').scrollTop = 0; return; }
  if (ds.timer) { const [n, id] = ds.timer.split('|'); const b = WEEKS[+n - 1].blocks.find(x => x.id === id); startProgramTimer(`Uge ${n} · ${b.timer.name}`, swappedSegs(b, `week|${n}|${id}`), `blk-${n}-${id}`); return; }
  if (ds.tfsave) {
    const n = +ds.tfsave;
    ST.tests[n] = cleanTest({ date: localISO(new Date()), dist: $('tfDist').value.trim(), watt: $('tfWatt').value.trim(), hr: $('tfHr').value.trim(), rpe: $('tfRpe').value });
    save(); $('tfNote').textContent = testNote(n); toast('Testresultat gemt'); return;
  }
  if (ds.logsave) { saveLog(ds.logsave); return; }
  if (ds.edit) { startEditMatch(ds.edit); return; }
  if (ds.rest) { startProgramTimer(`Pause · ${ds.rest} sek`, [{ ...S('rest', +ds.rest, 'Pause mellem sæt'), round: 1, rounds: 1 }], ds.src, true); return; }
  if (ds.hometimer) { const [L, id] = ds.hometimer.split('|'); const b = HOME[+L].blocks.find(x => x.id === id); startProgramTimer(b.timer.name, swappedSegs(b, `home|${L}|${id}`), `home-${id}`); return; }
  if (ds.homelevel) { ST.settings.homeLevel = +ds.homelevel; save(); renderHome(); return; }
  if (ds.preset) { loadPreset(ds.preset); return; }
  if (ds.step) { // mus/touch håndteres af pointerdown (hold-nede); tastatur og skærmlæser giver click uden pointerdown
    if (e.detail === 0) { const [k, d] = ds.step.split('|'); stepCustom(k, +d); }
    return;
  }
  if (ds.good) { ST.settings.lib = ds.good; save(); libShown = LIB_PAGE; renderLibrary(); return; }
  if ('swapOpen' in ds) { openSwap(); return; }
  if ('swapBack' in ds) { openSheet(sheetCtx); return; }
  if (ds.swapPick) { pickSwap(ds.swapPick); return; }
  if (ds.metric) { ST.settings.metric = ds.metric; save(); renderChart(); return; }
  if (ds.del) { if (confirm('Slet denne kamp?')) { ST.matches = ST.matches.filter(m => String(m.id) !== ds.del); save(); renderChart(); renderHistory(); } return; }
  if ('sheetClose' in ds) { closeSheet(); return; }
  if ('sheetDone' in ds) {
    toggleDone(sheetCtx); const on = isDone(sheetCtx);
    t.setAttribute('aria-pressed', on); t.innerHTML = ICON.check + (on ? 'Færdig' : 'Markér færdig');
    if (on) setTimeout(closeSheet, 350);
    return;
  }
  if (ds.sheetTimer) {
    const c = $('exSheet')._ctx;
    if (ds.sheetTimer === 'segs') startProgramTimer(c.name, c.segs, c.src);
    else if (ds.sheetTimer === 'item') startProgramTimer(c.name, c.perSide ? sides(c.secs, c.name) : single(c.secs, c.name), c.src);
    else if (ds.sheetTimer === 'rest') startProgramTimer(`Pause · ${c.block.restTimer} sek`, [{ ...S('rest', c.block.restTimer, 'Pause mellem sæt'), round: 1, rounds: 1 }], c.src, true);
    else startProgramTimer(c.block.timer.name, swappedSegs(c.block, c.base), c.src);
    return;
  }
  switch (t.id) {
    case 'pcCta': { const n = curWeek(); selectWeek(n); go('program'); break; }
    case 'weekChip': go('program'); break;
    case 'tStart': tStart(); break;
    case 'tPause': tPause(); break;
    case 'tReset': tReset(); break;
    case 'tRepsBtn': tAdvance(); break;
    case 'tBack': if (TM.src) {
      const pg = TM.src === 'session' ? 'pas' : TM.src.startsWith('home-') ? 'hjemme' : TM.src === 'fredag' ? 'fredag' : 'program';
      go(pg);
      const el = $(TM.src); if (el) el.scrollIntoView({ block: 'start' });
    } break;
    case 'libMore': libShown += LIB_PAGE; renderLibList(); break;
    case 'libReset': ST.settings.lib = 'Alle'; ST.settings.libEquip = 'Alle'; ST.settings.libCat = 'Alle'; libQ = ''; $('libSearch').value = ''; save(); libShown = LIB_PAGE; renderLibrary(); break;
    case 'homeStart': startSession('home|' + homeLevel()); break;
    case 'friStart': startSession('fri'); break;
    case 'navTrain': trainNow(); break;
    case 'miniGo': go('timer'); break;
    case 'miniToggle': TM.running ? tPause() : tStart(); break;
    case 'tgSound': ST.settings.sound = !ST.settings.sound; t.setAttribute('aria-pressed', ST.settings.sound); save(); if (ST.settings.sound) { unlockAudio(); cue('tick'); } break;
    case 'tgVib': ST.settings.vib = !ST.settings.vib; t.setAttribute('aria-pressed', ST.settings.vib); save(); vib(60); break;
    case 'friTimer': startProgramTimer(FRIDAY.timer.name, swappedSegs(FRIDAY, 'fri'), 'fredag'); break;
    case 'homeDone': toggleHomeDone(); break;
    case 'friReset': ST.fri.done = {}; save(); renderFriday(); toast('Fredag nulstillet'); break;
    case 'resetAll':
      if (confirm('Slet alle gemte data? Afkrydsninger, uger, kampe og indstillinger forsvinder.')) {
        try { localStorage.removeItem(KEY); } catch (err) { }
        ST = DEF(); $('mDate').value = ''; mDateTouched = false; setMatchEditing(null); renderAll(); loadPreset('p1'); toast('Alle data er nulstillet');
      }
      break;
    case 'exportData': exportData(); break;
    case 'importData': $('importFile').click(); break;
  }
});
$('libSearch').addEventListener('input', e => { libQ = e.target.value; libShown = LIB_PAGE; renderLibList(); });
['libEquip', 'libCat'].forEach(id => $(id).addEventListener('change', e => { ST.settings[id === 'libEquip' ? 'libEquip' : 'libCat'] = e.target.value; save(); libShown = LIB_PAGE; renderLibList(); }));
$('importFile').addEventListener('change', e => {
  const f = e.target.files[0];
  if (f) importDataFile(f);
  e.target.value = '';
});
document.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const t = e.target.closest('[data-step]'); if (!t) return;
  const [k, d] = t.dataset.step.split('|');
  startStepHold(k, +d);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach(evt => document.addEventListener(evt, clearStepHold));
$('exSheet').addEventListener('click', e => { if (e.target === e.currentTarget) closeSheet(); });
$('weekNav').addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  const n = e.key === 'Home' ? 1 : e.key === 'End' ? 8 : ST.week + (e.key === 'ArrowRight' ? 1 : -1);
  selectWeek(Math.min(8, Math.max(1, n))); $('tab-' + ST.week).focus();
});
document.addEventListener('input', e => { if (e.target.matches('#rates input[type=range]')) syncRange(e.target); });
$('mDate').addEventListener('input', () => { mDateTouched = true; });
$('coachBody').addEventListener('input', e => { if (e.target.closest('.ctest')) updateTestLive(); });
$('mCancel').addEventListener('click', () => { setMatchEditing(null); mDateTouched = false; $('mNote').value = ''; $('mDate').value = lastSaturday(); syncMatchWeek(); });
$('startDate').addEventListener('change', e => { ST.start = isISO(e.target.value) ? e.target.value : ''; save(); renderCurrent(); renderProgress(); });
$('matchForm').addEventListener('submit', e => {
  e.preventDefault();
  const date = $('mDate').value; if (!date) { toast('Vælg en dato for kampen'); $('mDate').focus(); return; }
  if (!editMatchId && ST.matches.some(x => x.date === date) && !confirm('Der er allerede registreret en kamp på denne dato. Gem alligevel?')) return;
  const m = editMatchId ? ST.matches.find(x => x.id === editMatchId) : { id: Date.now() };
  if (!m) { setMatchEditing(null); return; }
  Object.assign(m, { date, week: +$('mWeek').value, note: $('mNote').value.trim() });
  METRICS.forEach(x => m[x.k] = +$('r-' + x.k).value);
  if (!editMatchId) ST.matches.push(m);
  const wasEdit = !!editMatchId;
  save(); setMatchEditing(null); mDateTouched = false;
  $('mNote').value = ''; $('mDate').value = lastSaturday(); syncMatchWeek();
  renderChart(); renderHistory(); updateBackupNote(); toast(wasEdit ? 'Kamp opdateret' : 'Kamp gemt');
  setTrackerTab('dev'); $('page-tracker').scrollTop = 0;
});
let lastDayKey = localISO(new Date());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (TM.running) { keepAwake(true); unlockAudio(); tTick(); } else if (SES) keepAwake(true);
  // En installeret app kan stå åben i dagevis: opdatér dato-afhængige visninger
  const k = localISO(new Date());
  if (k !== lastDayKey) {
    lastDayKey = k;
    renderDays(); renderToday(); renderHome(); renderFriday();
    if (!mDateTouched && !editMatchId) $('mDate').value = lastSaturday();
    updateBackupNote();
  }
});

/* ===== Sider =====
   Hver side er en <section class="page">. Kun én vises ad gangen. Adresse: #/side, så tilbage-knappen virker. */
const PAGES = ['idag', 'program', 'coach', 'status', 'fremgang', 'pas', 'hjemme', 'fredag', 'timer', 'tracker', 'ovelser', 'progression', 'rpe', 'mere'];
const NAV_OF = { idag: 'idag', program: 'program', coach: 'coach', fremgang: 'coach', status: 'coach' }; // øvrige sider hører under "Mere"
let curPage = null, suppressHash = false;
const pageScroll = {};
const routeFromHash = () => { const m = location.hash.match(/^#\/(\w+)/); return m && PAGES.includes(m[1]) && !(m[1] === 'pas' && !SES) ? m[1] : 'idag'; };
function go(page) {
  if (!PAGES.includes(page) || (page === 'pas' && !SES)) page = 'idag';
  if (routeFromHash() !== page) { suppressHash = true; location.hash = '#/' + page; }
  showPage(page);
}
function showPage(p) {
  if (p === curPage) return;
  if (curPage) { const old = $('page-' + curPage); pageScroll[curPage] = old.scrollTop; old.hidden = true; }
  const el = $('page-' + p);
  el.hidden = false; el.scrollTop = pageScroll[p] || 0;
  el.classList.remove('is-entering');
  if (!prefersReduced()) { void el.offsetWidth; el.classList.add('is-entering'); }
  curPage = p;
  document.title = (p === 'idag' ? '8 ugers målmandsprogram' : el.dataset.title + ' · Målmand 8');
  $('topTitle').textContent = el.dataset.title;
  const navId = NAV_OF[p] || 'mere';
  document.querySelectorAll('.bottomnav a, .topnav a').forEach(a => {
    const on = a.closest('.topnav') ? a.dataset.nav === p : a.dataset.nav === navId;
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  timerInView = p === 'timer'; tRender();
  if (p === 'program') { if (ST.coach.active) { rebuildWeeks(); renderWeek(); } requestAnimationFrame(centerWeekTab); }
  if (p === 'coach') renderCoach();
  $('app').classList.toggle('in-session', p === 'pas');
  if (p === 'pas') renderSession();
  if (p === 'fremgang') renderFremgang();
  if (p === 'status') renderStatus();
  updateTrainButton();
  const h = el.querySelector('h1, h2'); if (h && h.tabIndex === -1) h.focus({ preventScroll: true });
}
window.addEventListener('hashchange', () => { if (suppressHash) { suppressHash = false; return; } showPage(routeFromHash()); });

/* ===== Coach: profil, niveauer og tilpasset program =====
   Alt er regler og beregninger på telefonen: ingen server, ingen model. Programmet genberegnes, hver gang
   du ændrer profil, tester, logger et sæt eller afslutter en uge. */
function cleanCoach(c) {
  const b = DEF_COACH();
  if (!isObj(c)) return b;
  const nm = (v, lo, hi) => { v = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v * 10) / 10 : ''; };
  const pos = (v, hi) => { v = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(v) && v >= 0 && v <= hi ? Math.round(v * 10) / 10 : null; };
  const out = {
    sex: c.sex === 'f' ? 'f' : 'm', birth: isISO(c.birth) ? c.birth : '', height: nm(c.height, 100, 250), bf: nm(c.bf, 3, 60),
    goal: GOAL_KEYS.includes(c.goal) ? c.goal : '', targetKg: nm(c.targetKg, 30, 250), targetBf: nm(c.targetBf, 3, 60), active: !!c.active && GOAL_KEYS.includes(c.goal), weights: [], tests: [], days: Array.isArray(c.days) ? [...new Set(c.days.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))].sort((a, b) => a - b) : [], season: c.season === 'in' || c.season === 'off' ? c.season : ''
  };
  out.weights = (Array.isArray(c.weights) ? c.weights : []).filter(w => isObj(w) && isISO(w.date) && nm(w.kg, 30, 250) !== '').slice(-400)
    .map(w => ({ date: w.date, kg: nm(w.kg, 30, 250), bf: nm(w.bf, 3, 60) })).sort((a, b) => a.date.localeCompare(b.date));
  out.tests = (Array.isArray(c.tests) ? c.tests : []).filter(t => isObj(t) && isISO(t.date) && isObj(t.r)).slice(-20).map(t => {
    const r = {};
    TESTS.forEach(d => {
      const x = t.r[d.id]; if (!isObj(x)) return;
      if (d.kind === 'lift') { const kg = pos(x.kg, 500), reps = pos(x.reps, 50); if (kg > 0 && reps > 0) r[d.id] = { kg, reps }; }
      else if (d.kind === 'reps') { const reps = pos(x.reps, 100); if (reps != null) r[d.id] = { reps }; }
      else if (d.kind === 'cond') { const v = pos(x.v, 6000); if (v > 0) r[d.id] = { kind: x.kind === 'bike' ? 'bike' : 'run', v }; }
      else { const v = pos(x.v, 1000); if (v > 0) r[d.id] = { v }; }
    });
    return { date: t.date, bw: nm(t.bw, 30, 250), r };
  }).filter(t => Object.keys(t.r).length).sort((a, b) => a.date.localeCompare(b.date));
  const iso = isISO, area = a => AREAS.some(x => x[0] === a), lv = x => ['bad', 'normal', 'great'].includes(x);
  const nn = (v, lo, hi) => { v = parseFloat(v); return Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v * 1000) / 1000 : null; };
  const st = c.status;
  out.status = isObj(st) && lv(st.level) && iso(st.date) ? { level: st.level, date: st.date, since: iso(st.since) ? st.since : st.date, reaction: str(st.reaction, 200),
    flags: (Array.isArray(st.flags) ? st.flags : []).filter(f => isObj(f)).slice(0, 8).map(f => ({ k: ['bad', 'good', 'info'].includes(f.k) ? f.k : 'info', t: str(f.t, 160) })),
    m: isObj(st.m) ? { c1: nn(st.m.c1, 0, 1), c2: nn(st.m.c2, 0, 1), rpe: nn(st.m.rpe, 1, 10), rpeN: Math.round(clampNum(st.m.rpeN, 0, 999, 0)), wr: nn(st.m.wr, -20, 20) } : { c1: null, c2: null, rpe: null, rpeN: 0, wr: null } } : null;
  out.statusLog = (Array.isArray(c.statusLog) ? c.statusLog : []).filter(x => isObj(x) && iso(x.date) && lv(x.level)).slice(-26).map(x => ({ wk: str(x.wk, 10), date: x.date, level: x.level, comp: nn(x.comp, 0, 1), rpe: nn(x.rpe, 1, 10), weight: nn(x.weight, 30, 250) }));
  out.dossier = (Array.isArray(c.dossier) ? c.dossier : []).filter(d => isObj(d) && iso(d.date) && ['status', 'note', 'pain'].includes(d.type)).slice(-80).map((d, i) => ({ id: Math.round(clampNum(d.id, 0, 9e15, Date.now() + i)), date: d.date, type: d.type, text: str(d.text, 260), ...(lv(d.level) ? { level: d.level } : {}), ...(d.outcome ? { outcome: str(d.outcome, 160) } : {}), ...(isObj(d.metric) ? { metric: { rpe: nn(d.metric.rpe, 1, 10), c1: nn(d.metric.c1, 0, 1) } } : {}) }));
  out.pain = (Array.isArray(c.pain) ? c.pain : []).filter(p => isObj(p) && iso(p.date) && area(p.area)).slice(-80).map((p, i) => ({ id: Math.round(clampNum(p.id, 0, 9e15, Date.now() + i)), date: p.date, area: p.area, sev: Math.round(clampNum(p.sev, 1, 3, 2)) }));
  out.prefs = {};
  if (isObj(c.prefs)) Object.keys(c.prefs).filter(k => EX[k]).slice(0, 60).forEach(k => { const o = {}; if (isObj(c.prefs[k])) Object.keys(c.prefs[k]).filter(a => EX[a] && a !== k).slice(0, 6).forEach(a => { o[a] = Math.round(clampNum(c.prefs[k][a], 1, 50, 1)); }); if (Object.keys(o).length) out.prefs[k] = o; });
  return out;
}

/* ---------- Profil og niveauer ---------- */
const lastTest = () => ST.coach.tests[ST.coach.tests.length - 1] || null;
const curWeight = () => { const w = ST.coach.weights; return w.length ? w[w.length - 1].kg : null; };
function ageNow() {
  const b = ST.coach.birth; if (!b) return null;
  const d = new Date(b + 'T12:00:00'), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a >= 10 && a <= 90 ? a : null;
}
function scoreFor(key, v, sex, age) {
  if (!(v > 0)) return 0;
  const f = (sex === 'f' ? STD_F[key] : 1) * (age > 30 ? Math.max(.75, 1 - .008 * (age - 30)) : 1);
  const th = STD[key].map(x => x * f);
  if (v < th[0]) return Math.round(20 * v / th[0]);
  for (let i = 1; i < 5; i++) if (v < th[i]) return Math.round(20 * i + 20 * (v - th[i - 1]) / (th[i] - th[i - 1]));
  return 100;
}
const levelOf = s => s == null ? '' : s < 20 ? 'Begynder' : s < 40 ? 'Under middel' : s < 60 ? 'Middel' : s < 80 ? 'God' : s < 95 ? 'Meget god' : 'Elite';
function measureOf(t, r, bw) {
  if (!r) return null;
  if (t.kind === 'lift') return (r.kg > 0 && r.reps > 0 && bw) ? (t.perHand ? 2 : 1) * r.kg * (1 + Math.min(r.reps, 12) / 30) / bw : null;
  if (t.kind === 'reps') return r.reps >= 0 ? r.reps : null;
  if (t.kind === 'cond') return r.v > 0 ? (r.kind === 'bike' ? (bw ? r.v / bw : null) : r.v) : null;
  return r.v > 0 ? r.v : null;
}
const stdKey = (t, r) => t.id === 'cond' ? (r && r.kind === 'bike' ? 'bike' : 'run') : t.id;
function formOf(rec, bwOverride) {
  const bw = bwOverride || (rec && rec.bw) || curWeight(), sc = {}, cats = {};
  if (rec) TESTS.forEach(t => {
    const m = measureOf(t, rec.r[t.id], bw);
    if (m != null) sc[t.id] = scoreFor(stdKey(t, rec.r[t.id]), m, ST.coach.sex, ageNow());
  });
  COACH_CATS.forEach(c => {
    const v = TESTS.filter(t => t.cat === c && sc[t.id] != null).map(t => sc[t.id]);
    if (v.length) cats[c] = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  });
  const wt = COACH_W[ST.coach.goal] || null;
  let sw = 0, sv = 0;
  Object.entries(cats).forEach(([k, v]) => { const w = wt ? wt[k] : 1; sw += w; sv += w * v; });
  return { sc, cats, bw, overall: sw ? Math.round(sv / sw) : null };
}
const E1_TEST = { frontsquat: 'squat', rdl: 'rdl', dbbench: 'bench' };
/* Estimeret maks (1RM) for en øvelse: bedste af seneste test og loggede sæt de sidste 8 uger */
/* Dosis ud fra en recept (sæt, gentagelser, % af maks). Uden kendt maks: kun sæt og gentagelser. */

const COACH_W = { // hvor meget hver del tæller i den samlede form, afhængigt af dit mål
  explosive: { Styrke: .3, Eksplosivitet: .4, Kondition: .15, Core: .15 }, offseason: { Styrke: .5, Eksplosivitet: .2, Kondition: .15, Core: .15 },
  leanfast: { Styrke: .25, Eksplosivitet: .25, Kondition: .35, Core: .15 }, bodyfat: { Styrke: .35, Eksplosivitet: .15, Kondition: .3, Core: .2 }
};
/* ---------- Estimeret maks: robust, forsigtigt og uden tastefejl ---------- */
const epley = (kg, reps, rir = 0) => kg * (1 + Math.min(reps + rir, 15) / 30);
const daysSince = d => (new Date(todayISO() + 'T12:00:00') - new Date(d + 'T12:00:00')) / 864e5;
function e1Points(exId) {
  const pts = [], tid = E1_TEST[exId];
  if (tid) { // kun den seneste test tæller. Ældre tests er forældede.
    const rec = [...ST.coach.tests].reverse().find(t => t.r[tid]);
    if (rec) pts.push({ date: rec.date, e1: epley(rec.r[tid].kg, rec.r[tid].reps), src: 'test' });
  }
  ST.logs.forEach(l => {
    if (l.ex !== exId || !(l.kg > 0) || !(l.reps >= 1) || l.reps > 12 || daysSince(l.date) > 70) return;
    const rir = l.rpe > 0 ? Math.max(0, Math.min(4, 10 - l.rpe)) : 0; // uden RPE antages et sæt til udmattelse = forsigtigt
    pts.push({ date: l.date, e1: epley(l.kg, l.reps, rir), src: 'log' });
  });
  return pts;
}
/* Vægtet gennemsnit af seneste tests og sæt (halveringstid 3 uger). Enkelte urealistiske sæt (>25 % over det øvrige) ignoreres.
   Tallet kan derfor også falde, hvis du er blevet svagere. */
function e1RM(exId) {
  let pts = e1Points(exId); if (!pts.length) return null;
  const test = pts.find(p => p.src === 'test'), logs = pts.filter(p => p.src === 'log');
  const sorted = logs.map(p => p.e1).sort((a, b) => a - b);
  const ref = test ? test.e1 : (logs.length >= 3 ? sorted[Math.floor(sorted.length / 2)] : null);
  if (ref) pts = pts.filter(p => p.src === 'test' || p.e1 <= ref * 1.25 || logs.some(q => q !== p && Math.abs(q.e1 - p.e1) / p.e1 < .08 && Math.abs(daysSince(q.date) - daysSince(p.date)) <= 21));
  let sw = 0, sv = 0;
  pts.forEach(p => { const w = Math.pow(.5, Math.max(0, daysSince(p.date)) / 21); sw += w; sv += w * p.e1; });
  return sw ? sv / sw : null;
}
function kgStep(exId) {
  const eq = (EX[exId] || {}).equip;
  return eq === 'Stang' || eq === 'Kabel' || eq === 'Maskine' ? 2.5 : eq === 'Kettlebell' || eq === 'Håndvægte' ? 2 : 1;
}
function roundKg(exId, kg) { const s = kgStep(exId); return Math.max(s, Math.round(kg / s) * s); }
/* Seneste træningsdag for en øvelse: topsættet (tungeste vægt, flest gentagelser) */
function lastSession(exId) {
  const ls = ST.logs.filter(l => l.ex === exId); if (!ls.length) return null;
  const d = ls[ls.length - 1].date, day = ls.filter(l => l.date === d);
  const top = day.reduce((a, b) => (b.kg > a.kg || (b.kg === a.kg && b.reps > a.reps)) ? b : a);
  const atTop = day.filter(x => x.kg === top.kg);
  return { date: d, kg: top.kg, reps: top.reps, rpe: top.rpe, sets: day.length, minReps: Math.min(...atTop.map(x => x.reps)), pr: day.some(x => x.pr) };
}
/* Dobbelt progression: først flere gentagelser, så mere vægt. Første gang bruges % af estimeret maks. */
function nextLoad(exId, rx) {
  const last = lastSession(exId), e1 = rx.pct ? e1RM(exId) : null;
  const fromE1 = e1 ? roundKg(exId, e1 * rx.pct / 100) : null;
  if (rx.light || !last || !(last.kg > 0)) return { kg: fromE1, last, why: rx.light ? 'let uge' : (fromE1 ? 'ud fra dit niveau' : '') };
  if (daysSince(last.date) > 28) return { kg: fromE1 || roundKg(exId, last.kg * .95), last, why: 'langt siden sidst' };
  const lo = rx.reps, hi = rx.hi || rx.reps, step = kgStep(exId);
  let kg = last.kg, why = 'samme vægt, sigt efter flere gentagelser';
  const easy = !(last.rpe > 0) || last.rpe <= 8.5;
  if (last.minReps >= hi && easy) { kg = last.kg + Math.max(step, Math.round(last.kg * .025 / step) * step); why = 'mere vægt, du nåede alle gentagelser'; }
  else if (last.reps < lo - 1 || last.rpe >= 9.5) { kg = Math.max(step, Math.round(last.kg * .95 / step) * step); why = 'lidt lettere, sidst blev for hårdt'; }
  if (fromE1 && kg > fromE1 * 1.12) kg = Math.round(fromE1 * 1.12 / step) * step; // aldrig langt over det, dit niveau tilsiger
  return { kg: roundKg(exId, kg), last, why };
}
const progText = exId => {
  const l = lastSession(exId); if (!l) return '';
  return `Sidst ${l.kg > 0 ? fmtNum(l.kg) + ' kg × ' : ''}${fmtNum(l.reps)}${l.rpe ? ' · RPE ' + l.rpe : ''}`;
};
function rxDose(exId, rx) {
  const r = rx.hi && rx.hi > rx.reps ? `${rx.reps}–${rx.hi}` : `${rx.reps}`;
  const nl = rx.pct ? nextLoad(exId, rx) : null;
  if (!nl || !nl.kg) return `${rx.sets} × ${r}`;
  return `${rx.sets} × ${r} · ${fmtNum(nl.kg)} kg${(EX[exId] || {}).equip === 'Håndvægte' ? ' pr. hånd' : ''}`;
}
function prCheck(exId, kg, reps) {
  const prior = ST.logs.filter(l => l.ex === exId); if (prior.length < 2) return null; // de første sæt er udgangspunkt
  if (kg > 0) {
    const w = prior.filter(l => l.kg > 0); if (!w.length) return null;
    const best = Math.max(...w.map(l => epley(l.kg, l.reps)));
    return epley(kg, reps) > best * 1.005 ? `${fmtNum(kg)} kg × ${fmtNum(reps)}` : null;
  }
  return reps > Math.max(...prior.map(l => l.reps)) ? `${fmtNum(reps)} gentagelser` : null;
}
/* Spørger, hvis tallet virker til at være en tastefejl */
function plausibleLog(exId, kg) {
  if (!(kg > 0)) return true;
  const ref = e1RM(exId) || (lastSession(exId) || {}).kg;
  if (ref && kg > ref * 1.3) return confirm(`${fmtNum(kg)} kg er meget mere end dit niveau (ca. ${fmtNum(ref)} kg). Er det rigtigt?`);
  if (kg > 400) return confirm(`${fmtNum(kg)} kg virker usandsynligt. Er det rigtigt?`);
  return true;
}
let logSeq = 0;
function logSet(exId, kg, reps, rpe, week) {
  const pr = prCheck(exId, kg, reps);
  ST.logs.push({ id: Date.now() * 1000 + (logSeq++ % 1000), date: todayISO(), week, ex: exId, kg: Math.min(kg, 1000), reps: Math.min(reps, 1000), rpe: rpe || 0, ...(pr ? { pr: 1 } : {}) });
  ST.logs = ST.logs.slice(-1500); save();
  return pr;
}


function strItem(slot, role, g, n, ad) {
  const main = role === 'main', ex = main ? liftFor(slot) : prefAlt(liftFor(slot)), S0 = SCH[g][n - 1], light = n % 4 === 0, pm = painMult(ex), pn = pm < 1 ? painNote(ex) : '';
  let rx;
  if (ex === 'pullup') {
    const pr = (lastTest() && lastTest().r.pullup ? lastTest().r.pullup.reps : 5) || 5, base = Math.max(3, Math.round(pr * (main ? .7 : .6))), ls = lastSession('pullup');
    const lo = light || !ls ? base : Math.max(3, Math.min(ls.minReps + 1, 25));
    rx = { sets: main ? Math.max(2, S0[0] + ad.sets) : 3, reps: lo, hi: lo + 2, bw: true, light };
  } else if (main) { const r = S0[1]; rx = { sets: Math.max(2, S0[0] + ad.sets), reps: r, hi: light ? r : r + (r >= 6 ? 2 : 1), pct: Math.round(S0[2] * ad.load * pm * 10) / 10, light }; }
  else { const r = g === 'bodyfat' ? 12 : g === 'offseason' ? 10 : 8; rx = { sets: 3, reps: r, hi: light ? r : r + 2, pct: Math.round(62 * ad.load * pm * 10) / 10, light }; }
  return { ex, dose: rxDose(ex, rx), note: (main ? (light ? 'Let uge · RPE 6' : 'RPE 7–8') : 'RPE 7–8 · vælg vægten selv') + (pn ? ` · skån ${pn}` : ''), prog: progText(ex), rx };
}

/* ---------- Tilpasset program ---------- */
const SCH = { // [sæt, gentagelser, % af maks] pr. uge 1–8 (uge 4 og 8 er lette uger)
  offseason: [[4, 10, 67.5], [4, 8, 72.5], [4, 8, 75], [3, 8, 62.5], [4, 8, 75], [4, 6, 80], [5, 5, 82.5], [3, 6, 65]],
  explosive: [[5, 5, 75], [5, 4, 80], [5, 3, 85], [3, 4, 70], [5, 3, 82.5], [4, 3, 87.5], [5, 2, 90], [3, 3, 70]],
  leanfast: [[3, 6, 75], [3, 5, 80], [3, 5, 82.5], [2, 5, 70], [3, 5, 82.5], [3, 4, 85], [3, 3, 87.5], [2, 5, 70]],
  bodyfat: [[3, 12, 60], [3, 12, 62.5], [3, 10, 67.5], [2, 10, 55], [3, 10, 67.5], [3, 10, 70], [4, 8, 72.5], [2, 10, 55]]
};
const THEMES = ['OPBYGNING', 'FLERE SÆT', 'HÅRDERE', 'LET UGE', 'NY BLOK', 'HÅRDERE', 'TOPUGE', 'TEST OG LET UGE'];
const SESS = {
  offseason: {
    A: { t: 'Ben', blocks: ['warm', ['str', ['quad:main', 'hinge:acc', 'uni:acc', 'calf:acc']], ['core']] },
    B: { t: 'Overkrop', blocks: ['warm', ['str', ['push:main', 'pull:main', 'vpush:acc', 'row:acc']], ['core']] },
    C: { t: 'Helkrop', blocks: ['warm', ['str', ['hinge:main', 'quad:acc', 'push:acc', 'pull:acc']], ['pwr', ['kbswing', 'boxjump']], ['cond', 'cont']] }
  },
  explosive: {
    A: { t: 'Kraft', blocks: ['warm', ['pwr', ['boxjump', 'broadjump', 'medthrow']], ['str', ['quad:main', 'hinge:main', 'calf:acc']], ['core']] },
    B: { t: 'Hurtighed og power', blocks: ['warm', ['pwr', ['sprint5', 'skater', 'medslam']], ['str', ['push:main', 'pull:main']], ['cond', 'int']] }
  },
  leanfast: {
    A: { t: 'Styrke (bevar)', blocks: ['warm', ['str', ['quad:main', 'push:main', 'pull:main', 'hinge:acc']], ['core']] },
    B: { t: 'Intervaller', blocks: ['warm', ['cond', 'int'], ['pwr', ['pogo', 'skater']]] },
    C: { t: 'Rolig kondition og mobilitet', blocks: [['cond', 'cont'], ['mob', ['hipflexor', 'wgs', 'cossack']]] }
  },
  bodyfat: {
    A: { t: 'Styrke-circuit', blocks: ['warm', ['str', ['quad:main', 'push:main', 'pull:main', 'hinge:acc', 'uni:acc']], ['core']] },
    B: { t: 'Intervaller', blocks: ['warm', ['cond', 'b5'], ['core']] },
    C: { t: 'Rolig kondition', blocks: [['cond', 'cont'], ['pwr', ['kbswing']]] }
  }
};
const CORE_POOL = ['pallof', 'deadbug', 'sideplank', 'hollow', 'birddog', 'suitcase', 'copenhagen', 'plank', 'woodchop', 'legraise'];

function liftFor(slot) {
  const rec = lastTest(), f = rec ? formOf(rec) : null, strong = f && f.cats.Styrke != null ? f.cats.Styrke : null;
  const pr = rec && rec.r.pullup ? rec.r.pullup.reps : null;
  switch (slot) {
    case 'quad': return strong != null && strong < 25 ? 'goblet' : 'frontsquat';
    case 'hinge': return 'rdl';
    case 'push': return 'dbbench';
    case 'vpush': return 'dbpress';
    case 'pull': return pr != null && pr >= 5 ? 'pullup' : 'latpull';
    case 'row': return 'dbrow';
    case 'uni': return strong != null && strong < 25 ? 'splitsquat' : 'bulgarian';
    default: return 'slcalf';
  }
}
/* Cirkel af øvelser med guidet timer. "it" binder timer-segmenter til øvelsen, så bytte virker. */
function circuit(id, icon, title, exIds, sets, restSec) {
  const items = exIds.map(ex => ({ ex, dose: EX[ex].dose, ...(EX[ex].secs ? { secs: EX[ex].secs, perSide: !!EX[ex].perSide } : {}) }));
  const seq = [];
  items.forEach((it, i) => {
    const e = EX[it.ex];
    if (e.secs) {
      if (e.perSide) seq.push(S('work', e.secs, e.name + ' · venstre side', i), S('rest', 8, 'Skift side', i), S('work', e.secs, e.name + ' · højre side', i));
      else seq.push(S('work', e.secs, e.name, i));
    } else seq.push(R(`${e.name} × ${String(e.dose).replace(/ reps$/, '')}`, i));
  });
  seq.push(S('rest', restSec, 'Pause'));
  return { id, icon, title, tags: [`${sets} runder`, `Pause ${restSec} sek`], items, timer: { name: `${title} · ${sets} runder`, segs: rounds(sets, seq) } };
}
function condBlock(L, g, n, kind) {
  const rec = lastTest(), f = rec ? formOf(rec) : null, cs = f && f.cats.Kondition != null ? f.cats.Kondition : null;
  const adj = cs == null ? 0 : cs >= 70 ? 1 : cs < 35 ? -1 : 0;
  let b;
  if (kind === 'cont') {
    const mins = { offseason: [20, 20, 22, 15, 22, 24, 25, 15], explosive: [20, 20, 20, 15, 20, 20, 20, 15], leanfast: [25, 28, 30, 20, 32, 35, 38, 25], bodyfat: [30, 32, 35, 25, 36, 38, 40, 28] }[g][n - 1] + adj * 3;
    b = CONT(Math.max(12, mins), 'RPE 5–6', 'Kondition', true);
  } else if (kind === 'int') {
    if (g === 'explosive') b = INTERVALS(Math.max(4, [6, 7, 8, 5, 8, 9, 10, 5][n - 1] + adj), 15, 75, 'RPE 9');
    else b = INTERVALS(Math.max(5, [8, 9, 10, 6, 10, 11, 12, 6][n - 1] + adj), 30, 60, 'RPE 8');
  } else b = BLOCKS5(Math.max(2, [3, 3, 4, 2, 4, 4, 5, 3][n - 1] + (adj > 0 ? 1 : 0)), 'RPE 6', 'RPE 8');
  b.id = L + '-cond'; b.icon = 'pulse'; if (kind !== 'int') b.title = 'Kondition';
  return b;
}
function makeBlock(spec, L, g, n, ad) {
  const type = Array.isArray(spec) ? spec[0] : spec, arg = Array.isArray(spec) ? spec[1] : null, G = GOALS[g];
  if (type === 'warm') { const w = WARM(6); w.id = L + '-warm'; return w; }
  if (type === 'str') {
    const items = arg.map(sp => { const [slot, role] = sp.split(':'); return strItem(slot, role, g, n, ad); });
    return { id: L + '-str', icon: 'dumbbell', title: 'Styrke', tags: [`${items[0].rx.sets} sæt`, `Pause ${G.rest} sek`], items, restTimer: G.rest };
  }
  if (type === 'pwr') {
    const sets = (g === 'explosive' ? [3, 3, 4, 2, 4, 4, 5, 2] : [2, 2, 3, 2, 3, 3, 3, 2])[n - 1];
    const ids = arg.map(prefAlt).filter(painSafe); // risikable spring og kast udelades ved smerte
    return ids.length ? circuit(L + '-pwr', 'bolt', 'Power', ids, sets, g === 'explosive' ? 90 : 60) : null;
  }
  if (type === 'core') {
    const base = (n + G.sessions.indexOf(L) * 3) % CORE_POOL.length;
    let picks = [0, 1, 2].map(k => prefAlt(CORE_POOL[(base + k * 3) % CORE_POOL.length])); const safe = picks.filter(painSafe); if (safe.length >= 2) picks = safe;
    return circuit(L + '-core', 'core', 'Core', picks, 3, 30);
  }
  if (type === 'mob') return circuit(L + '-mob', 'repeat', 'Mobilitet', arg.map(prefAlt), 2, 10);
  if (type === 'cond') return condBlock(L, g, n, arg);
  return null;
}
const linkBlock = (id, title, callout, tab, label) => ({ id, icon: 'test', title, tags: ['Min form'], callout, items: [], link: { go: 'coach', tab, label } });
function genPlanWeek(n, ad) {
  const g = ST.coach.goal, G = GOALS[g], blocks = [];
  if (n === 1 && !ST.coach.tests.length) blocks.push(linkBlock('intro', 'Start med testen', 'Tag testen først, så regner appen vægte ud til dig. Uden test får du sæt, gentagelser og RPE, men ingen kilo.', 'test', 'Åbn testen'));
  G.sessions.forEach(L => {
    const T = SESS[g][L], session = { id: L, title: `Pas ${L} · ${T.t}` };
    T.blocks.forEach(spec => { const b = makeBlock(spec, L, g, n, ad); if (b) { b.session = session; blocks.push(b); } });
  });
  if (n === 8) blocks.push(linkBlock('retest', 'Gentag din test', 'Tag testen igen, så kan du se din fremgang på pilemærkerne.', 'test', 'Åbn testen'));
  const note = ad.msg ? ` ${ad.msg}` : '';
  return { n, phase: phaseOf(n), title: `UGE ${n} · ${THEMES[n - 1]}`, desc: `${G.short}. ${G.sessions.length} pas om ugen.${note}`, blocks, plan: true };
}
function weekDoneRatio(w, weeks) {
  const W = weeks[w - 1]; if (!W) return null;
  const items = W.blocks.flatMap(b => b.items.map((it, i) => ({ b, it, i })).filter(x => x.it.ex));
  if (!items.length) return null;
  return items.filter(x => ST.done[`week|${w}|${x.b.id}|${x.i}`]).length / items.length;
}
/* Justering ud fra forrige uge: gennemførsel og hvor hårdt det føltes (RPE) */
function adaptFor(n, weeks) {
  const none = { load: 1, sets: 0, msg: '' };
  if (n < 2 || n - 1 >= curWeek()) return none;
  const c = weekDoneRatio(n - 1, weeks); if (c == null) return none;
  const rp = ST.logs.filter(l => l.week === n - 1 && l.rpe > 0).map(l => l.rpe), avg = rp.length ? rp.reduce((a, b) => a + b, 0) / rp.length : null;
  const pctTxt = `${Math.round(c * 100)} % gennemført${avg ? `, gns. RPE ${fmtNum(avg)}` : ''}`;
  if (c < .5) return { load: .95, sets: -1, msg: `Forrige uge: ${pctTxt}. Denne uge er lidt lettere (−1 sæt, −5 %).` };
  if (c < .75) return { load: .975, sets: 0, msg: `Forrige uge: ${pctTxt}. Belastningen sænkes 2,5 %.` };
  if (avg && avg >= 9.5) return { load: .95, sets: 0, msg: `Forrige uge: ${pctTxt}. Det føltes for hårdt, så belastningen sænkes 5 %.` };
  if (avg && avg <= 7 && c >= .85) return { load: 1.025, sets: 0, msg: `Forrige uge: ${pctTxt}. Det føltes let, så belastningen øges 2,5 %.` };
  return { load: 1, sets: 0, msg: `Forrige uge: ${pctTxt}. Fortsætter som planlagt.` };
}
function computePlan() {
  const c = ST.coach;
  if (!c.active || !GOALS[c.goal]) return BASE_WEEKS;
  const weeks = [];
  const sa = statusAdapt(), cw = curWeek();
  for (let n = 1; n <= 8; n++) { let ad = adaptFor(n, weeks); if (sa && n >= cw && n <= cw + 1) ad = mergeAd(ad, sa); weeks.push(genPlanWeek(n, ad)); }
  return weeks;
}
function rebuildWeeks() { WEEKS = computePlan(); }
/* Opdatér alt, der afhænger af programmet */
function refreshPlan() { rebuildWeeks(); updateStatus(); renderWeekNav(); renderWeek(); renderToday(); renderDays(); renderProgress(); renderPlanBanner(); renderCoach(); renderCoachCard(); renderWeekSummary(); }

/* ---------- Vægt, tendens og vejledning ---------- */
function weightRate() { // kg pr. uge (lineær tendens over de seneste 5 uger)
  const w = ST.coach.weights.filter(x => (new Date(todayISO() + 'T12:00:00') - new Date(x.date + 'T12:00:00')) / 864e5 <= 35);
  if (w.length < 2) return null;
  const t0 = new Date(w[0].date + 'T12:00:00').getTime(), xs = w.map(x => (new Date(x.date + 'T12:00:00').getTime() - t0) / 864e5 / 7), ys = w.map(x => x.kg);
  const span = xs[xs.length - 1]; if (span < 1) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0); if (!den) return null;
  return xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / den;
}
function weightAdvice() {
  const c = ST.coach, w = curWeight(), rate = weightRate(); if (!w) return 'Skriv din vægt ind, så følger appen din udvikling.';
  const pct = rate == null ? null : rate / w * 100, rt = rate == null ? '' : ` Din tendens: ${rate >= 0 ? '+' : '−'}${fmtNum(Math.abs(rate))} kg pr. uge.`;
  if (c.goal === 'leanfast' || c.goal === 'bodyfat') {
    if (pct == null) return 'Vej dig 2–3 gange om ugen på samme tidspunkt. Et godt tempo er ca. 0,25–0,75 % af kropsvægten pr. uge.';
    if (pct < -1) return 'Du taber hurtigere end 1 % pr. uge.' + rt + ' Det er for hurtigt, og du risikerer at miste styrke og kraft. Spis lidt mere.';
    if (pct > -0.1) return 'Vægten falder ikke endnu.' + rt + ' Giv det 2–3 uger, og se på kost og søvn, hvis det fortsætter.';
    return 'Godt tempo.' + rt;
  }
  if (c.goal === 'offseason') {
    if (pct == null) return 'Vej dig 2–3 gange om ugen. Et godt tempo for at bygge muskel er ca. 0,1–0,4 % af kropsvægten pr. uge.';
    if (pct > 0.6) return 'Du tager på hurtigere end 0,6 % pr. uge.' + rt + ' Mere end det bliver mest til fedt.';
    if (pct < 0) return 'Vægten falder.' + rt + ' Spis mere, hvis målet er at bygge muskel.';
    return 'Godt tempo.' + rt;
  }
  return pct == null ? 'Vej dig 2–3 gange om ugen, så ser du tendensen.' : 'Vægten bør være stabil.' + rt;
}
const proteinTxt = () => { const w = curWeight(); return w ? `Generel vejledning: ca. ${Math.round(w * 1.6)}–${Math.round(w * 2.2)} g protein om dagen (1,6–2,2 g pr. kg).` : ''; };

/* ===== Coach: sider og visning ===== */
let coachTab = 'over', condKind = 'run', testDraft = null;
const COACH_TABS = [['over', 'Overblik'], ['test', 'Test'], ['mal', 'Mål'], ['vaegt', 'Vægt']];

function gaugeSVG(score) {
  const cx = 120, cy = 112, R = 90;
  const pt = (deg, r) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
  let arcs = '';
  for (let i = 0; i < 5; i++) {
    const [x0, y0] = pt(180 + i * 36 + 1.2, R), [x1, y1] = pt(180 + (i + 1) * 36 - 1.2, R);
    arcs += `<path d="M${r1(x0)} ${r1(y0)} A${R} ${R} 0 0 1 ${r1(x1)} ${r1(y1)}" fill="none" stroke="${LEVEL_COL[i]}" stroke-width="20" opacity="${score == null ? .3 : 1}"/>`;
  }
  let needle = '';
  if (score != null) { const [nx, ny] = pt(180 + score * 1.8, R - 26); needle = `<line x1="${cx}" y1="${cy}" x2="${r1(nx)}" y2="${r1(ny)}" stroke="#F1F5EF" stroke-width="6" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="10" fill="#F1F5EF"/><circle cx="${cx}" cy="${cy}" r="4" fill="#0C1210"/>`; }
  return `<svg class="gauge" viewBox="0 0 240 150" role="img" aria-label="${score == null ? 'Ingen test endnu' : `Samlet form ${score} af 100: ${levelOf(score)}`}">${arcs}${needle}
    <text x="30" y="136" text-anchor="middle" class="g-end">0</text><text x="210" y="136" text-anchor="middle" class="g-end">100</text></svg>`;
}
/* Skala med pilemærke */
function scaleBar(score, small) {
  if (score == null) return `<div class="sbar sbar-off${small ? ' sbar-sm' : ''}"><div class="sbar-track">${LEVEL_COL.map(c => `<i style="background:${c}"></i>`).join('')}</div></div>`;
  return `<div class="sbar${small ? ' sbar-sm' : ''}" role="img" aria-label="${score} af 100: ${levelOf(score)}"><div class="sbar-track">${LEVEL_COL.map(c => `<i style="background:${c}"></i>`).join('')}</div><span class="sbar-arrow" style="left:${Math.min(98, Math.max(2, score))}%"></span></div>`;
}
const lvlCol = s => LEVEL_COL[Math.min(4, Math.floor(s / 20.01))];

function renderCoach() {
  const body = $('coachBody'); if (!body) return;
  $('coachTabs').innerHTML = COACH_TABS.map(([k, t]) => `<button class="seg-btn" type="button" role="tab" data-ctab="${k}" aria-selected="${k === coachTab}">${t}</button>`).join('');
  body.innerHTML = coachTab === 'test' ? coachTestHTML() : coachTab === 'mal' ? coachGoalHTML() : coachTab === 'vaegt' ? coachWeightHTML() : coachOverviewHTML();
  if (coachTab === 'test') {
    if (testDraft) { document.querySelectorAll('[data-tin]').forEach(el => { if (testDraft[el.dataset.tin] != null) el.value = testDraft[el.dataset.tin]; }); testDraft = null; }
    updateTestLive();
  }
}
function setCoachTab(t) { if (t === 'test' && coachTab !== 'test' && lastTest() && lastTest().r.cond) condKind = lastTest().r.cond.kind; coachTab = t; renderCoach(); const p = $('page-coach'); if (p) p.scrollTop = 0; }

/* ----- Overblik ----- */

/* ----- Test ----- */
function coachTestHTML() {
  const c = ST.coach, rec = lastTest(), bwOk = !!curWeight();
  const val = (id, k) => rec && rec.r[id] && rec.r[id][k] != null ? rec.r[id][k] : '';
  const card = t => {
    let inputs;
    if (t.kind === 'lift') inputs = `<label class="field">${t.perHand ? 'Vægt pr. hånd (kg)' : 'Vægt (kg)'}<input data-tin="${t.id}.kg" inputmode="decimal" placeholder="fx 60" value="${esc(val(t.id, 'kg'))}"></label><label class="field">Gentagelser<input data-tin="${t.id}.reps" inputmode="numeric" placeholder="3–8" value="${esc(val(t.id, 'reps'))}"></label>`;
    else if (t.kind === 'reps') inputs = `<label class="field">Antal gentagelser<input data-tin="${t.id}.reps" inputmode="numeric" placeholder="fx 6" value="${esc(val(t.id, 'reps'))}"></label>`;
    else if (t.kind === 'cond') inputs = `<div class="chips" role="group" aria-label="Type af test" style="grid-column:1/-1;padding:0 0 4px"><button class="chip" type="button" data-cact="condkind" data-kind="run" aria-pressed="${condKind === 'run'}">12 min løb</button><button class="chip" type="button" data-cact="condkind" data-kind="bike" aria-pressed="${condKind === 'bike'}">20 min cykel</button></div>
        <label class="field" style="grid-column:1/-1">${condKind === 'run' ? 'Distance (meter)' : 'Gennemsnit (watt)'}<input data-tin="cond.v" inputmode="numeric" placeholder="${condKind === 'run' ? 'fx 2400' : 'fx 180'}" value="${esc(rec && rec.r.cond && rec.r.cond.kind === condKind ? rec.r.cond.v : '')}"></label>`;
    else inputs = `<label class="field">${t.unit === 'cm' ? 'Resultat (cm)' : 'Resultat (sek)'}<input data-tin="${t.id}.v" inputmode="decimal" placeholder="${t.unit === 'cm' ? 'fx 40' : 'fx 90'}" value="${esc(val(t.id, 'v'))}"></label>`;
    return `<article class="ctest" data-t="${t.id}"><header><span class="ct-cat">${t.cat}</span>${t.rec ? '<span class="ct-rec">Anbefalet</span>' : '<span class="ct-opt">Ekstra</span>'}</header><h3>${t.name}</h3>
      <p class="ct-why">${t.why}</p><details class="ct-how"><summary>Sådan tester du</summary><p>${t.how}</p></details>
      <div class="ct-in">${inputs}</div><div class="ct-live" id="live-${t.id}"></div></article>`;
  };
  return `${bwOk ? '' : `<div class="notice">Skriv først din vægt under <button class="link-btn" type="button" data-ctab="mal">Mål og profil</button>. Styrke og watt måles i forhold til kropsvægten.</div>`}
    <p class="sec-lead">Test dig selv, når du er frisk og varm. Du behøver ikke tage alle: de anbefalede giver et godt billede. Tag testen igen i uge 8 for at se din fremgang.</p>
    ${TESTS.map(card).join('')}
    <button class="btn btn-block btn-lime" type="button" data-cact="saveTest">Gem test og se mit niveau</button>`;
}
function readTestForm() {
  const r = {};
  const g = k => { const el = document.querySelector(`[data-tin="${k}"]`); return el ? parseNum(el.value) : NaN; };
  TESTS.forEach(t => {
    if (t.kind === 'lift') { const kg = g(t.id + '.kg'), reps = g(t.id + '.reps'); if (kg > 0 && reps > 0) r[t.id] = { kg, reps }; }
    else if (t.kind === 'reps') { const reps = g(t.id + '.reps'); if (reps >= 0) r[t.id] = { reps }; }
    else if (t.kind === 'cond') { const v = g('cond.v'); if (v > 0) r.cond = { kind: condKind, v }; }
    else { const v = g(t.id + '.v'); if (v > 0) r[t.id] = { v }; }
  });
  return r;
}
function updateTestLive() {
  const r = readTestForm(), bw = curWeight();
  TESTS.forEach(t => {
    const el = $('live-' + t.id); if (!el) return;
    const m = measureOf(t, r[t.id], bw);
    if (m == null) { el.innerHTML = r[t.id] && !bw && (t.kind === 'lift' || (t.kind === 'cond' && r.cond.kind === 'bike')) ? '<span class="muted">Skriv din vægt for at se niveauet</span>' : ''; return; }
    const s = scoreFor(stdKey(t, r[t.id]), m, ST.coach.sex, ageNow());
    el.innerHTML = `<div class="live-top"><b style="color:${lvlCol(s)}">${s}</b><span>${levelOf(s)}</span></div>${scaleBar(s, true)}`;
  });
}

/* ----- Mål og profil ----- */
function coachGoalHTML() {
  const c = ST.coach, age = ageNow();
  return `<div class="panel"><h3>Om dig</h3>
    <div class="form-row"><label class="field">Køn (til niveauer)<select id="cpSex"><option value="m" ${c.sex === 'm' ? 'selected' : ''}>Mand</option><option value="f" ${c.sex === 'f' ? 'selected' : ''}>Kvinde</option></select></label>
      <label class="field">Fødselsdato<input type="date" id="cpBirth" value="${esc(c.birth)}"></label></div>
    ${age ? `<p class="muted">Du er ${age} år.</p>` : ''}
    <div class="form-row"><label class="field">Højde (cm)<input id="cpHeight" inputmode="numeric" placeholder="fx 185" value="${esc(c.height)}"></label>
      <label class="field">Vægt (kg)<input id="cpWeight" inputmode="decimal" placeholder="fx 82,5" value="${esc(curWeight() ?? '')}"></label></div>
    <label class="field">Fedtprocent (valgfri, hvis du kender den)<input id="cpBf" inputmode="decimal" placeholder="fx 14" value="${esc(c.bf)}"></label></div>
  <div class="panel"><h3>Dit mål</h3><div class="goals" role="radiogroup" aria-label="Vælg mål">${GOAL_KEYS.map(k => {
    const G = GOALS[k]; return `<button class="goal-card" type="button" role="radio" aria-checked="${c.goal === k}" data-cact="pickGoal" data-goal="${k}"><span class="gc-ic">${ICON[G.icon]}</span><span class="gc-t"><b>${G.name}</b><small>${G.desc}</small></span></button>`;
  }).join('')}</div>
    <div class="form-row" style="margin-top:12px"><label class="field">Målvægt (kg, valgfri)<input id="cpTKg" inputmode="decimal" placeholder="valgfri" value="${esc(c.targetKg)}"></label>
      <label class="field">Mål fedtprocent (valgfri)<input id="cpTBf" inputmode="decimal" placeholder="valgfri" value="${esc(c.targetBf)}"></label></div>
    <p class="muted" style="margin-top:8px">Appen giver generel træningsvejledning og ingen medicinsk rådgivning. Tal med din læge eller en kostvejleder ved vægttab, sygdom eller skader.</p>
    <button class="btn btn-block btn-lime" type="button" data-cact="saveProfile" style="margin-top:12px">Gem</button></div>${scheduleHTML()}`;
}

/* ----- Vægt ----- */
function weightChartSVG() {
  const w = ST.coach.weights.slice(-60);
  if (w.length < 2) return '<p class="empty">Skriv mindst to vægte for at se en kurve.</p>';
  const W = 360, H = 200, L = 38, Rr = 14, T = 18, B = 26;
  const t0 = new Date(w[0].date + 'T12:00:00').getTime(), t1 = new Date(w[w.length - 1].date + 'T12:00:00').getTime() || t0 + 1;
  const ys = w.map(x => x.kg).concat(ST.coach.targetKg ? [+ST.coach.targetKg] : []);
  let lo = Math.floor(Math.min(...ys) - 1), hi = Math.ceil(Math.max(...ys) + 1);
  if (hi - lo < 4) { lo -= 1; hi += 1; }
  const x = d => L + (new Date(d + 'T12:00:00').getTime() - t0) / Math.max(1, t1 - t0) * (W - L - Rr), y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  let g = '';
  [lo, (lo + hi) / 2, hi].forEach(v => { g += `<line x1="${L}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}" stroke="#24322B" stroke-width="1.5"/><text class="ax" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${Math.round(v)}</text>`; });
  if (ST.coach.targetKg) g += `<line x1="${L}" x2="${W - Rr}" y1="${y(+ST.coach.targetKg)}" y2="${y(+ST.coach.targetKg)}" stroke="#C8F03C" stroke-width="2" stroke-dasharray="5 5"/><text class="ax" x="${W - Rr}" y="${y(+ST.coach.targetKg) - 6}" text-anchor="end" style="fill:#C8F03C">mål</text>`;
  const d = w.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(p.kg).toFixed(1)}`).join(' ');
  g += `<path d="${d}" fill="none" stroke="#C8F03C" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>` + w.map(p => `<circle cx="${x(p.date).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="4.5" fill="#16201B" stroke="#C8F03C" stroke-width="2.5"/>`).join('');
  g += `<text class="ax" x="${L}" y="${H - 6}" text-anchor="start">${esc(daDate(w[0].date))}</text><text class="ax" x="${W - Rr}" y="${H - 6}" text-anchor="end">${esc(daDate(w[w.length - 1].date))}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kropsvægt over tid">${g}</svg>`;
}
function coachWeightHTML() {
  const c = ST.coach, w = c.weights.slice().reverse().slice(0, 30), cur = curWeight(), last = c.weights[c.weights.length - 1];
  return `<div class="panel"><h3>Ny vejning</h3>
    <div class="form-row"><label class="field">Vægt (kg)<input id="cwKg" inputmode="decimal" placeholder="${cur ? fmtNum(cur) : 'fx 82,5'}" value=""></label>
      <label class="field">Fedt % (valgfri)<input id="cwBf" inputmode="decimal" placeholder="valgfri" value=""></label></div>
    <button class="btn btn-block btn-lime" type="button" data-cact="saveWeight">Gem vejning</button>
    <p class="muted" style="margin-top:8px">Vej dig på samme tidspunkt, fx om morgenen efter toilet, før du spiser.</p></div>
  <div class="panel"><h3>Udvikling</h3>${weightChartSVG()}
    <div class="stat-row"><div><small>Nu</small><b>${cur ? fmtNum(cur) + ' kg' : '–'}</b></div><div><small>Tendens pr. uge</small><b>${weightRate() == null ? '–' : (weightRate() >= 0 ? '+' : '−') + fmtNum(Math.abs(weightRate())) + ' kg'}</b></div><div><small>Mål</small><b>${c.targetKg ? fmtNum(c.targetKg) + ' kg' : '–'}</b></div></div>
    <p class="advice">${esc(weightAdvice())}</p>${last && last.bf ? `<p class="muted">Seneste fedtprocent: ${fmtNum(last.bf)} %</p>` : ''}</div>
  <div class="panel"><h3>Dine vejninger</h3>${w.length ? `<ul class="history">${w.map((x, i) => `<li class="hist"><div class="hist-top"><div><b>${fmtNum(x.kg)} kg</b> <span class="tag">${esc(daDate(x.date))}</span>${x.bf ? ` <span class="tag">${fmtNum(x.bf)} %</span>` : ''}</div><button class="icon-btn" type="button" data-cact="delWeight" data-i="${x.date}|${x.kg}" aria-label="Slet vejningen ${esc(daDate(x.date))}">${ICON.trash}</button></div></li>`).join('')}</ul>` : '<p class="empty">Ingen vejninger endnu.</p>'}</div>`;
}

/* ----- Handlinger ----- */
function coachAction(a, ds) {
  const c = ST.coach;
  if (a === 'toggleDay') {
    const d = +ds.d, cur = planDays(); c.days = cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d].sort((x, y) => x - y);
    save(); renderCoach(); renderToday(); renderDays(); renderWeek(); renderCoachCard(); renderWeekSummary(); return;
  }
  if (a === 'setSeason') { c.season = ds.s; save(); renderCoach(); renderToday(); renderWeekSummary(); renderCoachCard(); return; }
  if (a === 'condkind') {
    testDraft = {}; document.querySelectorAll('[data-tin]').forEach(el => { testDraft[el.dataset.tin] = el.value; });
    if (condKind !== ds.kind) testDraft['cond.v'] = '';
    condKind = ds.kind; renderCoach(); return;
  }
  if (a === 'pickGoal') {
    if (c.goal !== ds.goal) { c.goal = ds.goal; if (c.active) { resetPlanState(); } save(); renderCoach(); if (c.active) refreshPlan(); }
    return;
  }
  if (a === 'saveProfile') {
    const nm = (id, lo, hi) => { const v = parseNum($(id).value); return Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v * 10) / 10 : ''; };
    c.sex = $('cpSex').value === 'f' ? 'f' : 'm';
    c.birth = isISO($('cpBirth').value) ? $('cpBirth').value : '';
    c.height = nm('cpHeight', 100, 250); c.bf = nm('cpBf', 3, 60); c.targetKg = nm('cpTKg', 30, 250); c.targetBf = nm('cpTBf', 3, 60);
    const kg = nm('cpWeight', 30, 250), today = todayISO();
    if (kg !== '' && kg !== curWeight()) pushWeight(kg, c.bf);
    save(); toast('Gemt'); afterCoachChange();
    return;
  }
  if (a === 'saveWeight') {
    const kg = parseNum($('cwKg').value), bf = parseNum($('cwBf').value);
    if (!(kg >= 30 && kg <= 250)) { toast('Skriv en vægt mellem 30 og 250 kg'); $('cwKg').focus(); return; }
    pushWeight(Math.round(kg * 10) / 10, bf >= 3 && bf <= 60 ? Math.round(bf * 10) / 10 : ''); if (bf >= 3 && bf <= 60) c.bf = Math.round(bf * 10) / 10;
    save(); toast('Vejning gemt'); afterCoachChange();
    return;
  }
  if (a === 'delWeight') {
    const [d, kg] = ds.i.split('|'); const i = c.weights.findIndex(x => x.date === d && String(x.kg) === kg);
    if (i >= 0 && confirm('Slet denne vejning?')) { c.weights.splice(i, 1); save(); renderCoach(); renderCoachCard(); }
    return;
  }
  if (a === 'saveTest') {
    const r = readTestForm();
    if (!Object.keys(r).length) { toast('Skriv mindst ét testresultat'); return; }
    const rec = { date: todayISO(), bw: curWeight() || '', r };
    const same = c.tests.findIndex(t => t.date === rec.date); if (same >= 0) c.tests[same] = rec; else c.tests.push(rec);
    c.tests = c.tests.slice(-20); save();
    const f = formOf(rec); toast(f.overall != null ? `Din form: ${f.overall} · ${levelOf(f.overall)}` : 'Test gemt');
    coachTab = 'over'; afterCoachChange();
    $('page-coach').scrollTop = 0;
    return;
  }
  if (a === 'activate') {
    if (!c.goal) { setCoachTab('mal'); return; }
    c.active = true; resetPlanState(); save(); refreshPlan(); toast('Dit tilpassede program er klar'); go('program'); selectWeek(curWeek());
    return;
  }
  if (a === 'deactivate') {
    if (!confirm('Skift tilbage til standardprogrammet? Dit tilpassede program gemmes, og du kan aktivere det igen.')) return;
    c.active = false; save(); refreshPlan(); toast('Standardprogrammet er aktivt');
    return;
  }
}
function pushWeight(kg, bf) {
  const c = ST.coach, today = todayISO(), i = c.weights.findIndex(x => x.date === today);
  const rec = { date: today, kg, bf: bf === '' || bf == null ? '' : bf };
  if (i >= 0) c.weights[i] = rec; else c.weights.push(rec);
  c.weights.sort((a, b) => a.date.localeCompare(b.date)); c.weights = c.weights.slice(-400);
}
/* Når målet ændres, nulstilles afkrydsninger og bytter for det tilpassede program (blok-id'er A-, B-, C-) */
function resetPlanState() {
  const mine = k => /^week\|\d+\|[ABC]-/.test(k);
  Object.keys(ST.done).filter(mine).forEach(k => delete ST.done[k]);
  Object.keys(ST.swaps).filter(mine).forEach(k => delete ST.swaps[k]);
}

/* ----- Banner i programmet og kort på forsiden ----- */
function renderPlanBanner() {
  const el = $('planBanner'); if (!el) return;
  const c = ST.coach;
  el.innerHTML = c.active && GOALS[c.goal]
    ? `<div class="plan-banner on"><span>${ICON.gauge}<b>Tilpasset</b> · ${GOALS[c.goal].short}</span><button type="button" data-ctab="over" data-go="coach">Ændr</button></div>`
    : `<div class="plan-banner"><span>${ICON.gauge}Få et program, der passer til dig</span><button type="button" data-ctab="over" data-go="coach">Min form</button></div>`;
}

/* ===== Træningsdage, ugens oversigt og dagens kort ===== */
const DAY_SHORT = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];
const seasonNow = () => ST.coach.season || (ST.coach.goal === 'offseason' ? 'off' : 'in');
function planDays() {
  const c = ST.coach, G = GOALS[c.goal]; if (!G) return [];
  const d = (c.days || []).slice().sort((a, b) => a - b);
  return d.length ? d : (G.sessions.length >= 3 ? [0, 2, 4] : [1, 4]);
}
function sessionDay(L) {
  const G = GOALS[ST.coach.goal]; if (!G) return null;
  const k = G.sessions.indexOf(L), d = planDays();
  return k >= 0 && k < d.length ? d[k] : null;
}
function sessionTitle(n, L) { const W = WEEKS[n - 1], b = W && W.blocks.find(x => x.session && x.session.id === L); return b ? b.session.title : `Pas ${L}`; }
function sessionStats(n, L) {
  const W = WEEKS[n - 1]; if (!W) return { done: 0, total: 0 };
  const items = W.blocks.filter(b => b.session && b.session.id === L).flatMap(b => b.items.map((it, i) => ({ b, i, it })).filter(x => x.it.ex));
  return { done: items.filter(x => ST.done[`week|${n}|${x.b.id}|${x.i}`]).length, total: items.length };
}
function todaySession() {
  if (!ST.coach.active || !GOALS[ST.coach.goal]) return null;
  const idx = (new Date().getDay() + 6) % 7, L = GOALS[ST.coach.goal].sessions.find(l => sessionDay(l) === idx);
  return L ? { L, title: sessionTitle(curWeek(), L), ...sessionStats(curWeek(), L) } : null;
}
/* Næste pas, der ikke er klaret endnu: { L, title, day } */
function nextOpenSession() {
  if (!ST.coach.active || !GOALS[ST.coach.goal]) return null;
  const n = curWeek(), today = (new Date().getDay() + 6) % 7, G = GOALS[ST.coach.goal];
  const open = G.sessions.map(L => ({ L, day: sessionDay(L), ...sessionStats(n, L) })).filter(s => s.total && s.done < s.total);
  if (!open.length) return null;
  const upcoming = open.filter(s => s.day != null && s.day >= today).sort((a, b) => a.day - b.day)[0] || open[0];
  return { L: upcoming.L, title: sessionTitle(n, upcoming.L), day: upcoming.day, n };
}
function renderToday() {
  const idx = (new Date().getDay() + 6) % 7, day = DAYS[idx], n = curWeek(), W = WEEKS[n - 1], c = ST.coach;
  const phaseName = W.title.split('·')[1].trim().toLowerCase().replace(/^./, ch => ch.toUpperCase());
  const st = weekStats(n);
  let cls = '', big = '', text = '', btn = '', act = '', icon = day.icon, extra = '';
  if (c.active && GOALS[c.goal]) {
    const ses = todaySession();
    if (ses) {
      cls = 'is-fit'; icon = 'dumbbell'; big = `Pas ${ses.L}`;
      text = `${ses.title}. ${ses.done} af ${ses.total} øvelser klaret.`;
      btn = ses.total && ses.done >= ses.total ? 'Se pasen igen' : ses.done ? 'Fortsæt pas' : 'Start pas';
      act = `data-ses-start="week|${n}|${ses.L}"`;
      extra = `<button class="btn btn-ghost" type="button" data-go="program">Se uge ${n}</button>`;
    } else if (seasonNow() === 'off' || day.kind === 'fit' || day.kind === 'off') {
      const nx = nextOpenSession(); icon = 'moon';
      big = 'Hviledag'; text = nx ? `Restitution. Næste pas: ${nx.day != null ? DAY_SHORT[nx.day] + ' · ' : ''}${nx.title}.` : 'Restitution. Sov godt, spis godt.';
      if (nx) { btn = 'Start næste pas'; act = `data-ses-start="week|${nx.n}|${nx.L}"`; extra = '<button class="btn btn-ghost" type="button" data-go="program">Se programmet</button>'; }
      else { btn = 'Se programmet'; act = 'data-go="program"'; }
    }
  }
  if (!act) {
    let target = '';
    switch (day.kind) {
      case 'fit': cls = 'is-fit'; big = `Fitness · uge ${n}`; text = `${phaseName}. ${st.done} af ${st.total} øvelser klaret.`; btn = 'Start dagens træning'; act = `data-ses-start="week|${n}|"`; break;
      case 'fri': big = 'Aktivering'; text = 'Bliv klar til kamp. Du skal føle dig frisk bagefter.'; btn = 'Åbn fredagens aktivering'; target = 'fredag'; break;
      case 'match': big = 'Kampdag'; text = 'Efter kampen: registrér koncentration, parathed og overskud.'; btn = 'Registrér kampen'; target = 'tracker'; break;
      case 'off': big = 'Fri'; text = 'Restitution. Sov godt, spis godt. Næste fitnesspas er onsdag.'; btn = 'Se din progression'; target = 'progression'; break;
      default:
        big = 'Fodbold';
        text = (idx === 1 ? `I morgen er det fitness: uge ${n}.` : idx === 3 ? 'Kamp lørdag. I morgen: let aktivering.' : 'Næste fitnesspas er onsdag.') + ' Lav hjemmerutinen inden træning: ca. 12 min uden udstyr.';
        btn = 'Før træning · hjemme'; target = 'hjemme';
    }
    if (!act) act = `data-go="${target}"`;
    if (day.kind === 'ball') extra = '<button class="btn btn-ghost" type="button" data-go="program">Se uge ' + n + '</button>';
  }
  $('todayCard').className = `today-card ${cls}`;
  $('todayCard').innerHTML = `<span class="today-ic" aria-hidden="true">${ICON[icon]}</span>
    <p class="today-small">I dag er det ${day.full}</p>
    <h2 class="today-big">${big}</h2>
    <p class="today-text">${text}</p>
    <div class="today-actions"><button class="btn ${cls ? '' : 'btn-lime'}" type="button" ${act}>${ICON.play}${btn}</button>${extra}</div>`;
}
/* Ugens oversigt: hvad er klaret, og hvor mange uger i træk */

/* ===== Fremgang ===== */
function sessionTops(exId) {
  const by = {};
  ST.logs.filter(l => l.ex === exId && (l.kg > 0 || l.reps > 0)).forEach(l => {
    const v = l.kg > 0 ? epley(l.kg, l.reps, l.rpe > 0 ? Math.max(0, Math.min(4, 10 - l.rpe)) : 0) : l.reps;
    if (!by[l.date] || v > by[l.date].v) by[l.date] = { date: l.date, v, kg: l.kg, reps: l.reps };
  });
  return Object.values(by).sort((a, b) => a.date.localeCompare(b.date));
}
function sparkSVG(pts, h) {
  const W = 320, H = h || 84, L = 10, R = 10, T = 12, B = 12;
  const vs = pts.map(p => p.v), lo = Math.min(...vs), hi = Math.max(...vs), pad = Math.max(1, (hi - lo) * .15);
  const x = i => L + (pts.length === 1 ? 0 : i / (pts.length - 1)) * (W - L - R), y = v => T + (1 - (v - (lo - pad)) / ((hi + pad) - (lo - pad))) * (H - T - B);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Udvikling over ${pts.length} træningsdage"><path d="${d} L${x(pts.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z" fill="#C8F03C" opacity=".1"/><path d="${d}" fill="none" stroke="#C8F03C" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` +
    pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${i === pts.length - 1 ? 5.5 : 3.5}" fill="${i === pts.length - 1 ? '#C8F03C' : '#16201B'}" stroke="#C8F03C" stroke-width="2"/>`).join('') + '</svg>';
}
function liftCardHTML(exId) {
  const t = sessionTops(exId), e = EX[exId]; if (!t.length) return '';
  const first = t[0], best = t.reduce((a, b) => b.v > a.v ? b : a), bw = !(best.kg > 0);
  let change = '';
  if (t.length > 1) { const d = best.v - first.v, pct = first.v ? d / first.v * 100 : 0; change = `<em class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲ +' : '▼ −'}${fmtNum(Math.abs(d))} ${bw ? 'gentagelser' : 'kg estimeret maks'} (${d >= 0 ? '+' : '−'}${Math.abs(Math.round(pct))} %) siden ${esc(daDate(first.date))}</em>`; }
  return `<article class="panel lift-card"><div class="lc-top"><h3>${e.name}</h3><span>${bw ? 'Bedst: ' + fmtNum(best.reps) + ' gentagelser' : 'Bedst: ' + fmtNum(best.kg) + ' kg × ' + fmtNum(best.reps)}</span></div>
    ${change || '<p class="muted">Log flere dage for at se din udvikling.</p>'}${t.length > 1 ? sparkSVG(t) : ''}</article>`;
}
function volumeChartHTML() {
  const v = Array(8).fill(0);
  ST.logs.forEach(l => { if (l.week >= 1 && l.week <= 8) v[l.week - 1] += l.kg * l.reps; });
  const mx = Math.max(...v); if (!mx) return '<p class="empty">Log sæt med vægt, så vises din ugentlige volumen her.</p>';
  const W = 340, H = 160, L = 6, B = 24, T = 20, bw = (W - L * 2) / 8;
  const fmtV = x => x >= 1000 ? fmtNum(x / 1000) + 't' : String(Math.round(x));
  let g = '';
  v.forEach((x, i) => { const h = x ? Math.max(4, x / mx * (H - T - B)) : 2, xx = L + i * bw + 6, w = bw - 12;
    g += `<rect x="${xx.toFixed(1)}" y="${(H - B - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="5" fill="${x ? '#C8F03C' : '#24322B'}" opacity="${x ? 1 : .6}"/>` +
      `<text class="ax" x="${(xx + w / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">U${i + 1}</text>` + (x ? `<text class="ax" x="${(xx + w / 2).toFixed(1)}" y="${(H - B - h - 5).toFixed(1)}" text-anchor="middle" style="fill:#F1F5EF">${fmtV(x)}</text>` : ''); });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Volumen pr. uge">${g}</svg>`;
}
function testCompareHTML() {
  const ts = ST.coach.tests; if (ts.length < 2) return '<p class="empty">Tag testen mindst to gange for at se din fremgang.</p>';
  const a = ts[0], b = ts[ts.length - 1], fa = formOf(a), fb = formOf(b);
  const raw = (t, r) => !r ? '–' : t.kind === 'lift' ? `${fmtNum(r.kg)} kg × ${fmtNum(r.reps)}` : t.kind === 'reps' ? `${fmtNum(r.reps)} gent.` : t.kind === 'cond' ? `${fmtNum(r.v)} ${r.kind === 'bike' ? 'watt' : 'm'}` : `${fmtNum(r.v)} ${t.unit}`;
  const rows = TESTS.filter(t => fa.sc[t.id] != null && fb.sc[t.id] != null).map(t => { const d = fb.sc[t.id] - fa.sc[t.id]; return `<li><b>${t.name}</b><span>${raw(t, a.r[t.id])} → ${raw(t, b.r[t.id])}</span><em class="${d >= 0 ? 'up' : 'down'}">${d > 0 ? '▲ +' : d < 0 ? '▼ −' : '= '}${Math.abs(d)}</em></li>`; }).join('');
  const od = fa.overall != null && fb.overall != null ? fb.overall - fa.overall : null;
  return `<p class="muted">${esc(daDate(a.date))} → ${esc(daDate(b.date))}${od != null ? ` · samlet form ${od >= 0 ? '+' : '−'}${Math.abs(od)}` : ''}</p>${rows ? `<ul class="cmp">${rows}</ul>` : '<p class="empty">Ingen fælles tests at sammenligne endnu.</p>'}`;
}
function renderFremgang() {
  const el = $('fremBody'); if (!el) return;
  const counts = {}; ST.logs.forEach(l => { counts[l.ex] = (counts[l.ex] || 0) + 1; });
  const main = ['frontsquat', 'rdl', 'dbbench', 'pullup'], ex = [...new Set([...main.filter(x => counts[x]), ...Object.keys(counts).sort((a, b) => counts[b] - counts[a])])].slice(0, 8);
  const prs = ST.logs.filter(l => l.pr).slice(-8).reverse();
  el.innerHTML = `<div class="stat-row s4"><div><small>Sæt logget</small><b>${ST.logs.length}</b></div><div><small>Rekorder</small><b>${ST.logs.filter(l => l.pr).length}</b></div><div><small>Uger gennemført</small><b>${ST.weeksDone.length}</b></div><div><small>Tests</small><b>${ST.coach.tests.length}</b></div></div>
    <div class="panel"><h3>Din form</h3>${testCompareHTML()}</div>
    ${ex.length ? ex.map(liftCardHTML).join('') : '<div class="panel"><h3>Løft</h3><p class="empty">Log dine sæt i træningstilstanden eller under en øvelse, så ser du din udvikling her.</p></div>'}
    <div class="panel"><h3>Volumen pr. uge</h3>${volumeChartHTML()}<p class="muted">Vægt × gentagelser i alt, hver programuge.</p></div>
    ${prs.length ? `<div class="panel"><h3>Seneste rekorder</h3><ul class="plain pr-list">${prs.map(l => `<li>★ ${EX[l.ex].name}: ${l.kg > 0 ? fmtNum(l.kg) + ' kg × ' : ''}${fmtNum(l.reps)} <small class="muted">${esc(daDate(l.date))}</small></li>`).join('')}</ul></div>` : ''}`;
}

function scheduleHTML() {
  const c = ST.coach, G = GOALS[c.goal]; if (!G) return '';
  const days = planDays();
  return `<div class="panel"><h3>Dine træningsdage</h3><p class="muted">Vælg ${G.sessions.length} dage. Pas ${G.sessions.join(', ')} lægges på dagene i rækkefølge.</p>
    <div class="chips wrap" role="group" aria-label="Træningsdage" style="margin-top:10px">${DAY_SHORT.map((d, i) => `<button class="chip" type="button" data-cact="toggleDay" data-d="${i}" aria-pressed="${days.includes(i)}">${d}</button>`).join('')}</div>
    <p class="t-sub" style="margin:14px 0 8px">Sæson</p><div class="chips" role="group" aria-label="Sæson"><button class="chip" type="button" data-cact="setSeason" data-s="in" aria-pressed="${seasonNow() === 'in'}">I sæson (kampe)</button><button class="chip" type="button" data-cact="setSeason" data-s="off" aria-pressed="${seasonNow() === 'off'}">Off-season</button></div></div>`;
}

function logSectionHTML(exId, item) {
  let kg = '', reps = '';
  const last = lastSession(exId);
  if (item && item.rx) { const nl = nextLoad(exId, item.rx); if (nl.kg) kg = fmtNum(nl.kg); reps = item.rx.reps; }
  else if (last && last.kg) kg = fmtNum(last.kg);
  const opts = '<option value="0">–</option>' + Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
  return `<section class="logbox" aria-label="Registrér sæt"><h4>Registrér</h4>
    <div class="log-form">
      <label class="field">Vægt (kg)<input id="lgKg" inputmode="decimal" placeholder="0" value="${esc(kg)}"></label>
      <label class="field">Reps / meter<input id="lgReps" inputmode="numeric" placeholder="fx 8" value="${esc(reps)}"></label>
      <label class="field">RPE<select id="lgRpe">${opts}</select></label>
      <button class="btn btn-lime" type="button" data-logsave="${esc(exId)}">Gem</button>
    </div><div id="lgList">${logListHTML(exId)}</div></section>`;
}
function saveLog(exId) {
  const kg = Math.max(0, parseNum($('lgKg').value) || 0), reps = parseNum($('lgReps').value);
  if (!EX[exId] || !(reps > 0)) { toast('Skriv antal reps eller meter'); $('lgReps').focus(); return; }
  if (!plausibleLog(exId, kg)) return;
  const wk = sheetCtx && sheetCtx.startsWith('week|') ? +sheetCtx.split('|')[1] : curWeek();
  const pr = logSet(exId, kg, reps, +$('lgRpe').value || 0, wk);
  $('lgList').innerHTML = logListHTML(exId); $('lgReps').value = '';
  toast(pr ? `Ny rekord: ${pr}!` : 'Registreret'); if (pr) vib([100, 60, 100, 60, 220]);
  updateStatus();
  if (ST.coach.active) { rebuildWeeks(); renderWeek(); renderCoachCard(); }
}

/* ===== Træningstilstand: ét trin ad gangen med sæt-logning og hvile ===== */
let SES = null;
const parseSrc = spec => { const p = spec.split('|'); return p[0] === 'week' ? { kind: 'week', n: +p[1], L: p[2] || '' } : p[0] === 'home' ? { kind: 'home', L: +p[1] || 1 } : { kind: 'fri' }; };
function srcBlocks(src) {
  if (src.kind === 'week') {
    const W = WEEKS[src.n - 1]; if (!W) return [];
    return W.blocks.filter(b => !b.link && (!src.L || (b.session && b.session.id === src.L))).map(b => ({ b, base: `week|${src.n}|${b.id}`, ictx: i => `week|${src.n}|${b.id}|${i}` }));
  }
  if (src.kind === 'home') return HOME[src.L].blocks.map(b => ({ b, base: `home|${src.L}|${b.id}`, ictx: i => `home|${src.L}|${b.id}|${i}` }));
  return [{ b: { id: 'fri', title: 'Aktivering', icon: 'bolt', tags: ['2 runder'], items: FRIDAY.items, timer: FRIDAY.timer }, base: 'fri', ictx: i => `fri|${i}` }];
}
function srcTitle(src) {
  if (src.kind === 'week') { const b = src.L && WEEKS[src.n - 1].blocks.find(x => x.session && x.session.id === src.L); return b ? b.session.title : `Uge ${src.n} · fitness`; }
  return src.kind === 'home' ? 'Hjemme · før træning' : 'Fredag · aktivering';
}
function setDone(ctx, on) {
  const p = ctx.split('|'), tgt = p[0] === 'fri' ? ST.fri.done : p[0] === 'home' ? ST.home.done : ST.done, key = p[0] === 'fri' ? p[1] : ctx;
  if (on) tgt[key] = true; else { delete tgt[key]; delete ST.run[ctx]; }
}
const repsFromDose = d => { const m = String(d).match(/×\s*(\d+)/) || String(d).match(/^(\d+)/); return m ? +m[1] : ''; };
function buildSteps(src) {
  const steps = [];
  srcBlocks(src).forEach(({ b, base, ictx }) => {
    if (b.restTimer) { // styrke og sæt-baserede blokke: ét trin pr. sæt
      b.items.forEach((it0, i) => {
        if (!it0.ex) return;
        const ctx = ictx(i); if (isDone(ctx)) return;
        const it = resolveItem(it0, ctx), sets = it.rx ? it.rx.sets : (parseInt((String(it.dose).match(/^(\d+)\s*×/) || [])[1], 10) || 1);
        for (let s = (ST.run[ctx] || 0) + 1; s <= sets; s++) steps.push({ type: 'set', ctx, b, i, set: s, sets, rest: b.restTimer });
      });
    } else if (b.items.some(x => x.ex) && b.items.some((x, i) => x.ex && !isDone(ictx(i)))) steps.push({ type: 'block', b, base, ictx });
  });
  return steps;
}
function startSession(spec) {
  const src = parseSrc(spec);
  if (src.kind === 'week' && !WEEKS[src.n - 1]) return;
  const t = todayISO(); if (ST.runDate !== t) { ST.run = {}; ST.runDate = t; }
  SES = { src, steps: buildSteps(src), i: 0, in: null, resting: false, finalized: false, origin: curPage === 'pas' || !curPage ? 'idag' : curPage, logged: { sets: 0, vol: 0, prs: [] }, title: srcTitle(src), n: src.kind === 'week' ? src.n : curWeek() };
  keepAwake(true); go('pas');
}
function refreshViews() {
  if (ST.coach.active) rebuildWeeks();
  updateStatus();
  renderWeekNav(); renderWeek(); renderToday(); renderDays(); renderProgress(); renderHome(); renderFriday(); renderCoachCard(); renderWeekSummary(); updateTrainButton();
  if (curPage === 'fremgang') renderFremgang();
}
function sesFinalize() {
  if (!SES || SES.finalized) return;
  SES.finalized = true; save();
  if (!TM.running) keepAwake(false);
  refreshViews();
}
function stepperHTML(id, val, minusKey, plusKey, label, ph) {
  return `<div class="s-step"><button type="button" data-ses="${minusKey}" aria-label="${label}: mindre">−</button><input id="${id}" inputmode="decimal" value="${esc(val)}" placeholder="${ph}" aria-label="${label}"><button type="button" data-ses="${plusKey}" aria-label="${label}: mere">+</button></div>`;
}
function setStepHTML(st) {
  const it = resolveItem(st.b.items[st.i], st.ctx), e = EX[it.ex], canLog = !!(e.log || it.rx);
  if (!SES.in || SES.in.ctx !== st.ctx) {
    const nl = it.rx ? nextLoad(it.ex, it.rx) : null, last = lastSession(it.ex);
    SES.in = { ctx: st.ctx, kg: nl && nl.kg ? nl.kg : (last && last.kg ? last.kg : ''), reps: it.rx ? it.rx.reps : (repsFromDose(it.dose) || ''), rpe: 0, why: nl ? nl.why : '' };
  }
  const nl = it.rx ? nextLoad(it.ex, it.rx) : null, pt = progText(it.ex);
  return `<div class="s-illu">${illustration(it.ex)}</div>
    <h3 class="s-name">${it.name || e.name}</h3>
    <p class="s-set">Sæt ${st.set} af ${st.sets}</p>
    <div class="s-target"><div><small>Mål</small><b>${esc(it.dose)}</b></div><div><small>${pt ? 'Sidst' : 'Godt til'}</small><b>${esc(pt ? pt.replace(/^Sidst /, '') : e.good.slice(0, 2).join(' · '))}</b></div></div>
    ${nl && nl.why && st.set === 1 ? `<p class="s-why">${esc(nl.why.charAt(0).toUpperCase() + nl.why.slice(1))}</p>` : ''}
    ${canLog ? `<div class="s-inputs"><div class="s-in"><span>Vægt (kg)</span>${stepperHTML('sKg', SES.in.kg === '' ? '' : fmtNum(SES.in.kg), 'kg-', 'kg+', 'Vægt i kg', '0')}</div>
      <div class="s-in"><span>Gentagelser</span>${stepperHTML('sReps', SES.in.reps === '' ? '' : fmtNum(SES.in.reps), 'reps-', 'reps+', 'Gentagelser', '0')}</div>
      <div class="s-in"><span>RPE (hvor hårdt)</span><div class="chips rpe-chips" role="group" aria-label="RPE">${[6, 7, 8, 9, 10].map(v => `<button class="chip" type="button" data-ses="rpe" data-v="${v}" aria-pressed="${SES.in.rpe === v}">${v}</button>`).join('')}</div></div></div>` : ''}
    <div class="s-dock"><button class="btn btn-lime btn-block s-main" type="button" data-ses="save">${canLog ? 'Gem sæt' : 'Sæt gjort'}</button>
    <div class="s-sec"><button class="btn btn-ghost" type="button" data-ses="skip">Spring over</button><button class="btn btn-ghost" type="button" data-open="${st.ctx}">Se øvelsen</button></div></div>`;
}
function blockStepHTML(st) {
  const b = st.b, rows = b.items.map((it0, i) => { if (!it0.ex) return ''; const it = resolveItem(it0, st.ictx(i)); return `<li class="s-row"><span class="thumb" aria-hidden="true">${illustration(it.ex)}</span><span><b>${it.name || EX[it.ex].name}</b><small>${esc(it.dose)}</small></span></li>`; }).join('');
  return `<div class="s-block"><span class="block-ic" aria-hidden="true">${ICON[b.icon] || ICON.pulse}</span><h3 class="s-name">${b.title}</h3><div class="tags">${(b.tags || []).map((t, i) => `<span class="tag ${i === 0 ? 'lime' : ''}">${t}</span>`).join('')}</div></div>
    ${b.callout ? `<p class="callout">${ICON.talk}<span>${b.callout}</span></p>` : ''}
    <ul class="s-rows">${rows}</ul>
    <div class="s-dock">${b.timer ? `<button class="btn btn-lime btn-block s-main" type="button" data-ses="timer">${ICON.play}Start guidet timer</button>` : ''}
    <button class="btn ${b.timer ? 'btn-ghost' : 'btn-lime s-main'} btn-block" type="button" data-ses="blockdone">${ICON.check}Markér klaret og gå videre</button>
    <div class="s-sec"><button class="btn btn-ghost" type="button" data-ses="skip">Spring over</button></div></div>`;
}
function restHTML() {
  const nx = SES.steps[SES.i];
  let next = '';
  if (nx && nx.type === 'set') { const it = resolveItem(nx.b.items[nx.i], nx.ctx); next = `<div class="s-next"><span class="thumb" aria-hidden="true">${illustration(it.ex)}</span><span><small>Næste</small><b>${it.name || EX[it.ex].name}</b><small>Sæt ${nx.set} af ${nx.sets} · ${esc(it.dose)}</small></span></div>`; }
  else if (nx) next = `<div class="s-next"><span class="block-ic" aria-hidden="true">${ICON[nx.b.icon] || ICON.pulse}</span><span><small>Næste</small><b>${nx.b.title}</b></span></div>`;
  return `<div class="s-rest"><p>Hvile</p><b id="sRestTime">${fmt(Math.ceil(TM.left))}</b><div class="s-rbar"><i id="sRestBar" style="width:0"></i></div></div>${next}
    <div class="s-dock"><button class="btn btn-lime btn-block s-main" type="button" data-ses="skiprest">Klar til næste sæt</button>
    <div class="s-sec"><button class="btn btn-ghost" type="button" data-ses="rest30">+30 sek</button></div></div>`;
}
function finishHTML() {
  const L = SES.logged;
  return `<div class="s-done"><span class="s-check">${ICON.check}</span><h3>Pas klaret</h3><p>${esc(SES.title)}</p>
    <div class="stat-row"><div><small>Sæt logget</small><b>${L.sets}</b></div><div><small>Volumen</small><b>${L.vol >= 1000 ? fmtNum(L.vol / 1000) + ' t' : Math.round(L.vol) + ' kg'}</b></div><div><small>Rekorder</small><b>${L.prs.length}</b></div></div>
    ${L.prs.length ? `<ul class="plain pr-list">${L.prs.map(p => `<li>★ ${esc(p)}</li>`).join('')}</ul>` : ''}
    <button class="btn btn-lime btn-block" type="button" data-ses="finish">Færdig</button>
    <button class="btn btn-ghost btn-block" type="button" data-go="fremgang">Se fremgang</button></div>`;
}
function renderSession() {
  const el = $('sessBody'); if (!el) return;
  if (!SES) { el.innerHTML = '<p class="empty">Ingen træning i gang.</p><button class="btn btn-lime btn-block" type="button" data-go="idag">Til forsiden</button>'; return; }
  const total = SES.steps.length, fin = SES.i >= total;
  let body;
  if (fin) { sesFinalize(); body = finishHTML(); }
  else if (SES.resting) body = restHTML();
  else { const st = SES.steps[SES.i]; body = st.type === 'set' ? setStepHTML(st) : blockStepHTML(st); }
  el.innerHTML = `<div class="s-top"><span>${fin ? (total ? 'Færdig' : 'Alt er klaret') : `Trin ${SES.i + 1} af ${total}`}</span><button class="link-btn" type="button" data-ses="exit">Afslut</button></div>
    <div class="s-bar"><i style="width:${total ? Math.min(SES.i, total) / total * 100 : 100}%"></i></div><p class="s-where">${esc(SES.title)}</p>${body}`;
  const sc = $('page-pas'); if (sc && !SES.resting) sc.scrollTop = 0;
}
function startRest(secs) {
  tLoad(`Hvile · ${secs} sek`, [{ ...S('rest', secs, 'Hvile mellem sæt'), round: 1, rounds: 1 }], { noPrep: true, autostart: true, src: 'session' });
  SES.resting = true; // sættes efter tLoad, så den første tegning ikke nulstiller flaget
}
function sesRestTick() {
  const s = curSeg(), active = TM.src === 'session' && TM.running && !TM.done && s && s.type === 'rest';
  if (active) { const t = $('sRestTime'); if (t) { setText(t, fmt(Math.ceil(TM.left))); const bar = $('sRestBar'); if (bar) bar.style.width = (s.secs ? (1 - TM.left / s.secs) * 100 : 0) + '%'; } return; }
  SES.resting = false; if (curPage === 'pas') { renderSession(); vib([80, 60, 80]); }
}
function sesSave() {
  const st = SES.steps[SES.i]; if (!st || st.type !== 'set') return;
  const it = resolveItem(st.b.items[st.i], st.ctx), e = EX[it.ex], canLog = !!(e.log || it.rx);
  let kg = 0, reps = 0, pr = null;
  if (canLog) {
    kg = Math.max(0, parseNum($('sKg').value) || 0); reps = parseNum($('sReps').value);
    if (!(reps > 0)) { toast('Skriv antal gentagelser'); $('sReps').focus(); return; }
    if (!plausibleLog(it.ex, kg)) return;
    pr = logSet(it.ex, kg, reps, SES.in ? SES.in.rpe : 0, SES.n);
    SES.logged.sets++; SES.logged.vol += kg * reps;
    if (pr) SES.logged.prs.push(`${e.name}: ${pr}`);
  }
  ST.run[st.ctx] = st.set;
  if (st.set >= st.sets) setDone(st.ctx, true);
  save();
  SES.i++;
  const nx = SES.steps[SES.i];
  SES.in = nx && nx.type === 'set' && nx.ctx === st.ctx ? { ctx: nx.ctx, kg: kg || '', reps: reps || '', rpe: 0 } : null;
  if (pr) { toast(`Ny rekord: ${pr}!`); vib([100, 60, 100, 60, 220]); }
  if (nx) startRest(st.rest || 60);
  renderSession();
}
function sesAction(a, ds) {
  if (!SES) return;
  const st = SES.steps[SES.i];
  const bump = (id, d, min = 0) => { const el = $(id); if (!el) return; const v = parseNum(el.value) || 0; el.value = fmtNum(Math.max(min, Math.round((v + d) * 100) / 100)).replace(/^0$/, id === 'sKg' ? '' : '0'); };
  switch (a) {
    case 'kg-': case 'kg+': { const ex = st && st.type === 'set' ? resolveItem(st.b.items[st.i], st.ctx).ex : null; bump('sKg', (a === 'kg+' ? 1 : -1) * (ex ? kgStep(ex) : 2.5)); break; }
    case 'reps-': case 'reps+': bump('sReps', a === 'reps+' ? 1 : -1); break;
    case 'rpe': SES.in.rpe = SES.in.rpe === +ds.v ? 0 : +ds.v; document.querySelectorAll('[data-ses=rpe]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === SES.in.rpe)); break;
    case 'save': sesSave(); break;
    case 'skip': SES.i++; SES.in = null; renderSession(); break;
    case 'skiprest': tReset(); SES.resting = false; renderSession(); break;
    case 'rest30': if (TM.src === 'session' && curSeg()) { TM.left += 30; curSeg().secs += 30; tRender(); } break;
    case 'timer': startProgramTimer(`${SES.title} · ${st.b.title}`, swappedSegs(st.b, st.base), 'session'); break;
    case 'blockdone': st.b.items.forEach((it, i) => { if (it.ex) setDone(st.ictx(i), true); }); save(); SES.i++; SES.in = null; renderSession(); break;
    case 'finish': { const o = SES.origin; SES = null; $('app').classList.remove('in-session'); go(o); break; }
    case 'exit': if (SES.i >= SES.steps.length || confirm('Afslut pasen? Det du har logget er gemt, og du kan fortsætte senere.')) {
      const o = SES.origin; if (SES.resting) tReset(); sesFinalize(); SES = null; $('app').classList.remove('in-session'); go(o);
    } break;
  }
}

/* ===== Forside, Min form-overblik og bundmenu (oprydning) ===== */
function dayInfo(i) {
  const d = DAYS[i], c = ST.coach, short = DAY_SHORT[i].toUpperCase();
  const baseTag = { fit: 'Fit', ball: 'Fod', fri: 'Akt', match: 'Kamp', off: 'Fri' };
  if (!c.active || !GOALS[c.goal]) return { kind: d.kind, short, tag: baseTag[d.kind], label: d.label, icon: d.icon };
  const L = GOALS[c.goal].sessions.find(l => sessionDay(l) === i);
  if (L) return { kind: 'fit', short, tag: L, label: sessionTitle(curWeek(), L), icon: 'dumbbell' };
  if (seasonNow() === 'in' && (d.kind === 'ball' || d.kind === 'match' || d.kind === 'fri')) return { kind: d.kind, short, tag: baseTag[d.kind], label: d.label, icon: d.icon };
  return { kind: 'off', short, tag: 'Hvile', label: 'Hvile', icon: 'moon' };
}
function renderDays() {
  const el = $('days'); if (!el) return;
  const idx = (new Date().getDay() + 6) % 7;
  el.innerHTML = DAYS.map((d, i) => { const x = dayInfo(i); return `<li class="day ${x.kind === 'fit' ? 'fit' : ''} ${x.kind === 'match' ? 'match' : ''} ${i === idx ? 'today' : ''}" aria-label="${d.full}: ${esc(x.label)}${i === idx ? ' (i dag)' : ''}"><span class="dn">${x.short}</span><span class="di" aria-hidden="true">${ICON[x.icon]}</span><span class="dl">${esc(x.tag)}</span></li>`; }).join('');
}
/* Ugens oversigt: dagene, hvad der er klaret, og hvor mange uger i træk */
function renderWeekSummary() {
  const el = $('weekSummary'); if (!el) return;
  const n = curWeek(), c = ST.coach, pills = [];
  const pill = (label, done, total) => `<div class="ws-pill ${total && done >= total ? 'ok' : ''}"><small>${label}</small><b>${done}<span>/${total}</span></b><i style="width:${total ? Math.min(100, done / total * 100) : 0}%"></i></div>`;
  if (c.active && GOALS[c.goal]) {
    const G = GOALS[c.goal], doneS = G.sessions.map(L => sessionStats(n, L)).filter(s => s.total && s.done >= s.total).length;
    pills.push(pill('Pas', doneS, G.sessions.length));
  } else { const s = weekStats(n); pills.push(pill('Fitness', s.done, s.total)); }
  if (seasonNow() === 'in') {
    pills.push(pill('Hjemme', weekDates().filter(d => ST.homeLog.includes(d)).length, 3));
    pills.push(pill('Fredag', FRIDAY.items.filter((_, i) => ST.fri.done[i]).length, FRIDAY.items.length));
    const mon = new Date(); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7)); const m0 = localISO(mon);
    pills.push(pill('Kamp', ST.matches.filter(m => m.date >= m0).length ? 1 : 0, 1));
  }
  let streak = 0;
  for (let w = n - 1; w >= 1; w--) { const r = weekDoneRatio(w, WEEKS); if (r != null && r >= .8) streak++; else break; }
  el.innerHTML = `<div class="panel week-sum"><div class="ws-head"><h3>Denne uge</h3><span class="ws-streak">Uge ${n} af 8${streak ? ` · 🔥 ${streak} i træk` : ''}</span></div><ol class="days" id="days" aria-label="Ugens dage"></ol><div class="ws-pills">${pills.join('')}</div></div>`;
  renderDays();
}
/* Slank række med din form (tryk åbner Min form) */
function renderCoachCard() {
  const el = $('coachCard'); if (!el) return;
  const c = ST.coach, rec = lastTest(), f = rec ? formOf(rec) : null, G = GOALS[c.goal];
  if (!f || f.overall == null) el.innerHTML = `<button class="coach-row" type="button" data-ctab="over" data-go="coach"><span class="cm-ic">${ICON.gauge}</span><span class="cr-t"><b>Din form</b><small>Skriv vægt, vælg mål og tag testen</small></span><span class="lr-go">${ICON.chev}</span></button>`;
  else {
    const nx = c.active ? nextOpenSession() : null;
    const sub = c.active && G ? (nx ? `Næste: ${nx.day != null ? DAY_SHORT[nx.day] + ' · ' : ''}${nx.title}` : 'Alle træninger i denne uge er klaret') : (G ? G.name : 'Vælg et mål');
    el.innerHTML = `<button class="coach-row" type="button" data-ctab="over" data-go="coach"><span class="cm-score" style="color:${lvlCol(f.overall)}">${f.overall}</span><span class="cr-t"><b>Din form · ${levelOf(f.overall)}${statusPill()}</b><small>${esc(sub)}</small>${scaleBar(f.overall, true)}</span><span class="lr-go">${ICON.chev}</span></button>`;
  }
  renderTiles(); updateTrainButton();
}
function renderTiles() {
  const el = $('tiles'); if (!el) return;
  const t = seasonNow() === 'in'
    ? [['ovelser', 'grid', 'Øvelser'], ['hjemme', 'house', 'Hjemme'], ['fredag', 'bolt', 'Fredag'], ['timer', 'timer', 'Timer'], ['tracker', 'chart', 'Tracker'], ['fremgang', 'pulse', 'Fremgang']]
    : [['ovelser', 'grid', 'Øvelser'], ['timer', 'timer', 'Timer'], ['tracker', 'chart', 'Tracker'], ['fremgang', 'pulse', 'Fremgang'], ['progression', 'flame', 'Progression'], ['rpe', 'focus', 'RPE']];
  el.innerHTML = t.map(([r, ic, l]) => `<a class="tile" href="#/${r}"><span aria-hidden="true">${ICON[ic]}</span><b>${l}</b></a>`).join('');
}

/* ----- Min form: overblik ----- */
function weakHTML(f) {
  const e = Object.entries(f.cats).sort((a, b) => a[1] - b[1]);
  if (e.length < 2 || e[e.length - 1][1] - e[0][1] < 8) return '';
  const tip = { Styrke: 'tung styrketræning', Eksplosivitet: 'spring og kast', Kondition: 'kondition og intervaller', Core: 'core-træning' }[e[0][0]];
  return `<p class="weak">Størst potentiale: <b>${e[0][0]}</b> (${e[0][1]}). Prøv mere ${tip}.</p>`;
}
function planCardHTML() {
  const c = ST.coach, G = GOALS[c.goal];
  if (!G) return `<div class="panel plan-card"><h3>Dit program</h3><p class="muted" style="margin:6px 0 12px">Vælg et mål, så laver appen et program til dig.</p><button class="btn btn-block btn-lime" type="button" data-ctab="mal">Vælg mål</button></div>`;
  return `<div class="panel plan-card"><div class="goal-chip"><span class="gc-ic">${ICON[G.icon]}</span><div><b>${G.name}</b><small>${G.sessions.length} træninger om ugen · 8 uger · ${c.active ? 'aktivt' : 'ikke lavet endnu'}</small></div></div>
    <div class="fc-actions">${c.active ? '<button class="btn btn-lime" type="button" data-go="program">Åbn programmet</button>' : '<button class="btn btn-lime" type="button" data-cact="activate">Lav mit program</button>'}<button class="btn btn-ghost" type="button" data-ctab="mal">Ændr mål</button></div>
    ${c.active ? '<button class="link-btn" type="button" data-cact="deactivate">Brug standardprogrammet</button>' : ''}
    <details class="legend"><summary>Om målet</summary><p class="muted" style="padding-bottom:10px">${G.desc}</p></details></div>`;
}
function statusHTML() {
  const c = ST.coach, ad = adaptFor(curWeek(), WEEKS), lines = [];
  if (ad.msg) lines.push(ad.msg);
  lines.push(weightAdvice());
  const lifts = [['frontsquat', 'squat'], ['rdl', 'rdl'], ['dbbench', 'bench']].map(([ex, tid]) => {
    const e = e1RM(ex), first = c.tests.find(t => t.r[tid]), f0 = first ? first.r[tid] : null, e0 = f0 ? f0.kg * (1 + Math.min(f0.reps, 12) / 30) : null;
    return e && e0 ? `${EX[ex].name}: ${fmtNum(e)} kg (${e >= e0 ? '+' : '−'}${fmtNum(Math.abs(e - e0))} siden første test)` : null;
  }).filter(Boolean);
  return `<details class="panel legend status"><summary>Ugens status og estimeret maks</summary><ul class="plain">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>${lifts.length ? `<p class="t-sub" style="margin:12px 0 6px">Estimeret maks</p><ul class="plain">${lifts.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}${proteinTxt() ? `<p class="muted" style="margin:10px 0">${esc(proteinTxt())}</p>` : ''}</details>`;
}
function coachOverviewHTML() {
  const c = ST.coach, rec = lastTest(), f = rec ? formOf(rec) : null, prev = c.tests.length > 1 ? formOf(c.tests[c.tests.length - 2]) : null;
  const done = { profil: !!(c.height && curWeight() && c.birth), mal: !!c.goal, test: !!rec };
  let h = '';
  if (!(done.profil && done.mal && done.test)) {
    const steps = [['mal', 'Profil og mål', done.profil && done.mal], ['vaegt', 'Vægt', !!curWeight()], ['test', 'Test', done.test]];
    h += `<div class="cs-bar" role="list" aria-label="Kom i gang">${steps.map(([tab, t, ok], i) => `<button type="button" role="listitem" class="${ok ? 'ok' : ''}" data-ctab="${tab}"><span class="st-dot">${ok ? ICON.check : i + 1}</span>${t}</button>`).join('')}</div>`;
  }
  h += statusRowHTML();
  const delta = f && prev && f.overall != null && prev.overall != null ? f.overall - prev.overall : null;
  h += `<div class="panel form-card"><div class="fc-top"><div class="fc-gauge">${gaugeSVG(f ? f.overall : null)}</div>
    <div class="g-read">${f && f.overall != null ? `<b style="color:${lvlCol(f.overall)}">${f.overall}</b><span>${levelOf(f.overall)}</span>${delta ? `<em class="${delta > 0 ? 'up' : 'down'}">${delta > 0 ? '▲ +' : '▼ −'}${Math.abs(delta)}</em>` : ''}<small>${rec ? 'Test ' + esc(daDate(rec.date)) : ''}</small>${GOALS[c.goal] ? `<small>Vægtet: ${GOALS[c.goal].short}</small>` : ''}` : '<span class="g-none">Tag testen for at se dit niveau</span>'}</div></div>
    <div class="cats">${COACH_CATS.map(cat => { const s = f ? f.cats[cat] : null; return `<div class="cat"><div class="cat-top"><b>${cat}</b>${s != null ? `<span style="color:${lvlCol(s)}">${s} · ${levelOf(s)}</span>` : '<span class="muted">Ikke testet</span>'}</div>${scaleBar(s, true)}</div>`; }).join('')}</div>
    ${f ? weakHTML(f) : ''}
    <div class="fc-actions"><button class="btn ${rec ? '' : 'btn-lime'}" type="button" data-ctab="test">${rec ? 'Tag testen igen' : 'Tag testen'}</button><button class="btn btn-ghost" type="button" data-go="fremgang">Fremgang</button></div></div>`;
  h += planCardHTML();
  if (c.active) h += statusHTML();
  return h;
}

/* ----- Bundmenuens midterknap: starter det, du skal træne nu ----- */
function trainTarget() {
  if (SES && !SES.finalized) return { kind: 'resume' };
  const n = curWeek(), c = ST.coach;
  if (c.active && GOALS[c.goal]) {
    const ses = todaySession();
    if (ses && ses.done < ses.total) return { spec: `week|${n}|${ses.L}` };
    const nx = nextOpenSession();
    return nx ? { spec: `week|${nx.n}|${nx.L}` } : { go: 'program' };
  }
  const kind = DAYS[(new Date().getDay() + 6) % 7].kind;
  if (kind === 'fit') return { spec: `week|${n}|` };
  if (kind === 'ball') return { spec: `home|${homeLevel()}` };
  if (kind === 'fri') return { spec: 'fri' };
  return { go: 'timer' };
}
function updateTrainButton() {
  const b = $('navTrain'); if (!b) return;
  const t = trainTarget();
  b.querySelector('.nt-l').textContent = t.kind === 'resume' ? 'Fortsæt' : 'Træn';
  b.setAttribute('aria-label', t.kind === 'resume' ? 'Fortsæt træningen' : t.spec ? `Start: ${srcTitle(parseSrc(t.spec))}` : 'Åbn timeren');
}
function trainNow() {
  const t = trainTarget();
  if (t.kind === 'resume') go('pas'); else if (t.spec) startSession(t.spec); else go(t.go);
}

/* ===== Status, atletprofil og trænerdossier =====
   Appen vurderer løbende, om det går dårligt, normalt eller meget godt, ud fra faste regler (ingen AI).
   Statussen styrer det tilpassede program og er samtidig det dokument, en AI senere kan læse. */
const STATUS_LV = { bad: 'Dårligt', normal: 'Normalt', great: 'Meget godt' };
const dayWord = d => (d >= 0 && d < 7 ? DAY_SHORT[d] : '');
const painEntries = (days = 10) => ST.coach.pain.filter(p => daysSince(p.date) <= days);
function painMult(exId) {
  const areas = AREA_OF[(EX[exId] || {}).pattern] || []; let m = 1;
  painEntries(10).forEach(p => { if (areas.includes(p.area)) m = Math.min(m, p.sev >= 3 ? .8 : p.sev === 2 ? .9 : 1); });
  return m;
}
function painNote(exId) {
  const areas = AREA_OF[(EX[exId] || {}).pattern] || [], p = painEntries(10).find(x => areas.includes(x.area));
  return p ? AREA_NAME[p.area].toLowerCase() : '';
}
const painSafe = exId => { const areas = AREA_OF[(EX[exId] || {}).pattern] || []; return !painEntries(10).some(p => p.sev >= 2 && areas.includes(p.area)); };
/* Øvelser, du gentagne gange har byttet til, bliver standard i programmet (kun ikke-hovedløft) */
function prefAlt(ex) {
  const p = ST.coach.prefs[ex]; if (!p) return ex;
  const best = Object.entries(p).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 2 && EX[best[0]] ? best[0] : ex;
}
const dayRange = (logs, from, to) => logs.filter(l => { const d = daysSince(l.date); return d >= from && d < to; });
function statusMetrics() {
  const n = curWeek(), ratio = w => ST.weeksDone.includes(w) ? 1 : weekDoneRatio(w, WEEKS);
  const m = { c1: n > 1 ? ratio(n - 1) : null, c2: n > 2 ? ratio(n - 2) : null, lifts: [], rpe: null, rpeN: 0, wr: weightRate() };
  const recent = dayRange(ST.logs, 0, 15).filter(l => l.rpe > 0);
  m.rpeN = recent.length; if (recent.length) m.rpe = recent.reduce((a, l) => a + l.rpe, 0) / recent.length;
  [...new Set(ST.logs.map(l => l.ex))].filter(ex => EX[ex]).forEach(ex => {
    const best = (a, b) => { const ls = dayRange(ST.logs.filter(l => l.ex === ex && l.kg > 0), a, b); return ls.length ? Math.max(...ls.map(l => epley(l.kg, l.reps, l.rpe > 0 ? Math.max(0, Math.min(4, 10 - l.rpe)) : 0))) : null; };
    const now = best(0, 15), before = best(15, 43);
    if (now && before) m.lifts.push({ ex, now, before, pct: (now / before - 1) * 100 });
  });
  const ts = ST.coach.tests; m.formDelta = ts.length > 1 ? (formOf(ts[ts.length - 1]).overall ?? null) - (formOf(ts[ts.length - 2]).overall ?? 0) : null;
  return m;
}
function computeStatus() {
  const c = ST.coach, m = statusMetrics(), flags = [], w = curWeight(), pctw = m.wr != null && w ? m.wr / w * 100 : null, g = c.goal, pc = x => Math.round(x * 100) + ' %';
  const bad = t => flags.push({ k: 'bad', t }), good = t => flags.push({ k: 'good', t });
  if (m.c1 != null && m.c2 != null && m.c1 < .6 && m.c2 < .6) bad(`Under 60 % gennemført to uger i træk (${pc(m.c2)} og ${pc(m.c1)})`);
  else if (m.c1 != null && m.c1 < .4) bad(`Kun ${pc(m.c1)} gennemført sidste uge`);
  if (m.rpeN >= 4 && m.rpe >= 9.5) bad(`Sættene føles for hårde: gns. RPE ${fmtNum(m.rpe)}`);
  m.lifts.forEach(l => { const nm = EX[l.ex].name; if (l.pct <= -5) bad(`${nm}: estimeret maks er faldet ${Math.abs(Math.round(l.pct))} %`); else if (l.pct >= 5) good(`${nm}: estimeret maks er steget ${Math.round(l.pct)} %`); });
  painEntries(10).forEach(p => { if (p.sev >= 2 && !flags.some(f => f.t.startsWith('Smerte i ' + AREA_NAME[p.area].toLowerCase()))) bad(`Smerte i ${AREA_NAME[p.area].toLowerCase()} (${p.sev === 3 ? 'slem' : 'middel'})`); });
  if (pctw != null) {
    if (g === 'leanfast' || g === 'bodyfat') { if (pctw > 0.1) bad('Vægten stiger, og målet er at komme ned'); else if (pctw < -1) bad('Du taber for hurtigt (over 1 % pr. uge)'); else if (pctw <= -0.2) good('Vægten falder i et godt tempo'); }
    else if (g === 'offseason') { if (pctw > 0.6) bad('Du tager på for hurtigt (over 0,6 % pr. uge)'); else if (pctw < -0.1) bad('Vægten falder, og målet er at bygge muskel'); else if (pctw >= 0.1) good('Vægten stiger i et godt tempo'); }
  }
  if (m.c1 != null && m.c2 != null && m.c1 >= .9 && m.c2 >= .9) good('Alle eller næsten alle øvelser klaret to uger i træk');
  if (m.rpeN >= 4 && m.rpe <= 7.5 && m.c1 != null && m.c1 >= .85) good(`Sættene føles lette: gns. RPE ${fmtNum(m.rpe)}`);
  if (m.formDelta != null && m.formDelta >= 5) good(`Din form er steget ${m.formDelta} point siden forrige test`);
  const hasBad = flags.some(f => f.k === 'bad'), goods = flags.filter(f => f.k === 'good').length;
  const hasData = m.c1 != null || m.rpeN > 0 || m.lifts.length > 0 || painEntries(10).length > 0 || pctw != null;
  if (!hasData) flags.push({ k: 'info', t: 'For lidt data til en vurdering endnu. Afkryds øvelser og log dine sæt.' });
  const level = hasBad ? 'bad' : goods >= 2 ? 'great' : 'normal';
  const reaction = level === 'bad' ? (c.active ? 'Programmet er lidt lettere (−5 % og −1 sæt på hovedløft) denne og næste uge.' : 'Overvej en lettere uge. Lav det tilpassede program, så justerer appen det automatisk.')
    : level === 'great' ? (c.active ? 'Programmet øger belastningen 2,5 % denne og næste uge.' : 'Du kan gå lidt tungere næste gang.') : 'Programmet fortsætter som planlagt.';
  return { level, flags, m, reaction, hasData };
}
function addDossier(e) {
  const c = ST.coach;
  c.dossier.push({ id: Date.now() * 1000 + (logSeq++ % 1000), date: todayISO(), ...e });
  c.dossier = c.dossier.slice(-80);
}
/* Hjælper dossieret med at lære: virkede den forrige ændring? */
function evaluateOutcomes() {
  const s = ST.coach.status; if (!s) return;
  ST.coach.dossier.forEach(d => {
    if (d.type !== 'status' || d.outcome || !d.metric || daysSince(d.date) < 8 || d.level === 'normal') return;
    if (d.level === 'bad') {
      if (d.metric.rpe && s.m.rpe != null && s.m.rpe <= d.metric.rpe - .5) d.outcome = `Virkede: gns. RPE ${fmtNum(d.metric.rpe)} → ${fmtNum(s.m.rpe)}`;
      else if (d.metric.c1 != null && s.m.c1 != null && s.m.c1 >= d.metric.c1 + .15) d.outcome = `Virkede: gennemførsel ${Math.round(d.metric.c1 * 100)} % → ${Math.round(s.m.c1 * 100)} %`;
      else d.outcome = s.level === 'bad' ? 'Ingen tydelig bedring endnu' : 'Status er ikke længere dårlig';
    } else d.outcome = s.level === 'great' ? 'Fremgangen fortsatte' : 'Fremgangen fladede ud';
  });
}
/* Opdaterer status, dossier og ugentlig historik. Returnerer sand, hvis niveauet skiftede. */
function updateStatus() {
  const c = ST.coach, s = computeStatus(), prev = c.status, changed = !prev || prev.level !== s.level;
  const next = { level: s.level, date: todayISO(), since: changed ? todayISO() : prev.since, reaction: s.reaction, flags: s.flags.slice(0, 8), m: { c1: s.m.c1, c2: s.m.c2, rpe: s.m.rpe, rpeN: s.m.rpeN, wr: s.m.wr } };
  const dirty = !prev || JSON.stringify([prev.level, prev.date, prev.flags, prev.reaction, prev.m]) !== JSON.stringify([next.level, next.date, next.flags, next.reaction, next.m]);
  if (s.hasData && changed && (prev ? true : s.level !== 'normal')) {
    addDossier({ type: 'status', level: s.level, text: `Status: ${STATUS_LV[s.level].toLowerCase()}. ${s.flags.filter(f => f.k !== 'info').slice(0, 2).map(f => f.t).join('. ')}. ${s.reaction}`.replace(/\.\./g, '.'), metric: { rpe: s.m.rpe, c1: s.m.c1 } });
  }
  const wk = isoWeekKey();
  if (s.hasData && (!c.statusLog.length || c.statusLog[c.statusLog.length - 1].wk !== wk)) c.statusLog = [...c.statusLog, { wk, date: todayISO(), level: s.level, comp: s.m.c1, rpe: s.m.rpe, weight: curWeight() }].slice(-26);
  c.status = next; evaluateOutcomes();
  if (dirty) save();
  if (changed && c.active) rebuildWeeks();
  return changed;
}
/* Statussen ændrer det tilpassede program for denne og næste uge */
function statusAdapt() {
  const s = ST.coach.status; if (!ST.coach.active || !s) return null;
  if (s.level === 'bad') return { load: .95, sets: -1, msg: 'Status: dårligt. Lidt lettere (−5 %, −1 sæt), til det vender.' };
  if (s.level === 'great') return { load: 1.025, sets: 0, msg: 'Status: meget godt. Belastningen øges 2,5 %.' };
  return null;
}
function mergeAd(a, b) {
  if (!b) return a;
  const load = (a.load < 1 || b.load < 1) ? Math.min(a.load, b.load) : Math.max(a.load, b.load);
  return { load: Math.min(1.05, load), sets: Math.min(a.sets, b.sets), msg: [a.msg, b.msg].filter(Boolean).join(' ') };
}
/* Det, appen har lært om dig */
function athleteTraits() {
  const c = ST.coach, m = statusMetrics(), t = [];
  if (m.c1 != null || m.rpe != null) {
    const lo = (m.c1 != null && m.c1 < .6) || (m.rpe != null && m.rpe >= 9), hi = (m.c1 == null || m.c1 >= .85) && (m.rpe == null || m.rpe <= 8);
    t.push(['Tåler volumen', lo ? 'Lav · hold sæt og vægt nede' : hi ? 'Høj · du kan tåle mere' : 'Middel']);
  }
  const up = m.lifts.slice().sort((a, b) => b.pct - a.pct)[0];
  if (up && m.lifts.length > 1) t.push(['Fremgang hurtigst i', `${EX[up.ex].name} (${up.pct >= 0 ? '+' : '−'}${Math.abs(Math.round(up.pct))} %)`]);
  if (c.active && GOALS[c.goal]) {
    const miss = {}; for (let w = 1; w < curWeek(); w++) GOALS[c.goal].sessions.forEach(L => { const s = sessionStats(w, L); if (s.total && s.done < s.total) { const d = sessionDay(L); if (d != null) miss[d] = (miss[d] || 0) + 1; } });
    const top = Object.entries(miss).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) t.push(['Springer oftest over', `${DAYS[+top[0]].full} (${top[1]} gange)`]);
  }
  Object.entries(c.prefs).forEach(([o, alts]) => { const b = Object.entries(alts).sort((x, y) => y[1] - x[1])[0]; if (b && b[1] >= 2) t.push(['Foretrækker', `${EX[b[0]].name} frem for ${EX[o].name}`]); });
  const areas = [...new Set(c.pain.filter(p => daysSince(p.date) <= 60).map(p => AREA_NAME[p.area].toLowerCase()))];
  if (areas.length) t.push(['Ømhed seneste 2 mdr.', areas.join(', ')]);
  const lt = lastTest(), f0 = c.tests.length ? formOf(c.tests[0]).overall : null, f1 = lt ? formOf(lt).overall : null;
  if (c.tests.length > 1 && f0 != null && f1 != null) t.push(['Form siden første test', `${f1 - f0 >= 0 ? '+' : '−'}${Math.abs(f1 - f0)} point`]);
  return t;
}
/* Samlet dokument, som en AI kan læse: dig, formen, statussen, planen og dossieret */
function buildStatusDoc() {
  const c = ST.coach, lt = lastTest(), f = lt ? formOf(lt) : null, s = c.status || computeStatus(), W = WEEKS[curWeek() - 1];
  return {
    generated: todayISO(),
    profile: { age: ageNow(), sex: c.sex, height_cm: c.height || null, weight_kg: curWeight(), body_fat_pct: c.bf || null, goal: GOALS[c.goal] ? GOALS[c.goal].name : null, season: seasonNow(), training_days: c.active ? planDays().map(d => DAY_SHORT[d]) : [] },
    form: f ? { overall: f.overall, level: levelOf(f.overall), categories: f.cats, last_test: lt.date } : null,
    status: { level: s.level, since: s.since || null, flags: s.flags, reaction: s.reaction, completion_last_week: s.m.c1, completion_week_before: s.m.c2, avg_rpe_14d: s.m.rpe, weight_trend_kg_per_week: s.m.wr },
    athlete_profile: Object.fromEntries(athleteTraits()),
    estimated_1rm_kg: Object.fromEntries(['frontsquat', 'rdl', 'dbbench'].map(ex => [ex, e1RM(ex) ? Math.round(e1RM(ex) * 10) / 10 : null])),
    plan: { active: c.active, week: curWeek(), sessions: W && W.plan ? [...new Set(W.blocks.filter(b => b.session).map(b => b.session.id))].map(id => ({ id, title: sessionTitle(curWeek(), id), exercises: W.blocks.filter(b => b.session && b.session.id === id).flatMap(b => b.items.filter(i => i.ex).map(i => `${EX[i.ex].name}: ${i.dose}`)) })) : [] },
    pain_last_30d: c.pain.filter(p => daysSince(p.date) <= 30).map(p => ({ date: p.date, area: p.area, severity: p.sev })),
    weekly_history: c.statusLog.slice(-8),
    coach_log: c.dossier.slice(-10).map(d => ({ date: d.date, type: d.type, text: d.text, outcome: d.outcome || null }))
  };
}
function afterCoachChange() { if (ST.coach.active) refreshPlan(); else { updateStatus(); renderCoach(); renderCoachCard(); } }

/* ===== Statussiden ===== */
let painArea = '', painSev = 2;
const stPill = (lv, big) => `<span class="stp ${lv}${big ? ' big' : ''}">${STATUS_LV[lv]}</span>`;
function statusPill() { const s = ST.coach.status; return s && s.level !== 'normal' ? `<span class="stp mini ${s.level}">${STATUS_LV[s.level]}</span>` : ''; }
function statusRowHTML() {
  const s = ST.coach.status; if (!s) return '';
  const f = s.flags.find(x => x.k !== 'info');
  return `<button class="status-row ${s.level}" type="button" data-go="status">${stPill(s.level)}<span class="sr-t"><b>Din status</b><small>${esc(f ? f.t : s.reaction)}</small></span><span class="lr-go">${ICON.chev}</span></button>`;
}
function renderStatus() {
  const el = $('statusBody'); if (!el) return;
  const c = ST.coach; if (!c.status) updateStatus();
  const s = c.status, m = statusMetrics(), pc = v => v == null ? '–' : Math.round(v * 100) + ' %';
  const traits = athleteTraits(), recentPain = c.pain.slice().reverse().slice(0, 6);
  const arrow = p => p > 0.5 ? `<em class="up">▲ +${Math.round(p)} %</em>` : p < -0.5 ? `<em class="down">▼ −${Math.abs(Math.round(p))} %</em>` : '<em class="muted">= uændret</em>';
  el.innerHTML = `
    <div class="panel st-card ${s.level}"><div class="st-top">${stPill(s.level, true)}<small>siden ${esc(daDate(s.since))}</small></div>
      <ul class="flags">${s.flags.map(f => `<li class="${f.k}">${esc(f.t)}</li>`).join('') || '<li class="info">Ingen markeringer.</li>'}</ul>
      <p class="st-react"><b>Reaktion:</b> ${esc(s.reaction)}</p>
      ${c.active ? '' : '<p class="muted">Lav det tilpassede program under Min form, så ændrer programmet sig automatisk, når statussen skifter.</p>'}</div>
    <div class="panel"><h3>Tal bag statussen</h3>
      <div class="stat-row s2"><div><small>Gennemført sidste uge</small><b>${pc(m.c1)}</b></div><div><small>Ugen før</small><b>${pc(m.c2)}</b></div><div><small>Gns. RPE (14 dage)</small><b>${m.rpe != null ? fmtNum(m.rpe) : '–'}</b><small>${m.rpeN} sæt</small></div><div><small>Vægttendens</small><b>${m.wr == null ? '–' : (m.wr >= 0 ? '+' : '−') + fmtNum(Math.abs(m.wr)) + ' kg/uge'}</b></div></div>
      ${m.lifts.length ? `<p class="t-sub" style="margin:12px 0 6px">Estimeret maks, seneste 2 uger mod ugerne før</p><ul class="cmp">${m.lifts.map(l => `<li><b>${EX[l.ex].name}</b><span>${fmtNum(l.before)} → ${fmtNum(l.now)} kg</span>${arrow(l.pct)}</li>`).join('')}</ul>` : '<p class="muted" style="margin-top:10px">Log mindst to træningsdage pr. løft, så vises udviklingen her.</p>'}</div>
    <div class="panel"><h3>Din atletprofil</h3>${traits.length ? `<ul class="traits">${traits.map(([a, b]) => `<li><small>${esc(a)}</small><b>${esc(b)}</b></li>`).join('')}</ul>` : '<p class="muted">Profilen bygges op, når der er data nok. Den bruges til at tilpasse dit program.</p>'}</div>
    <div class="panel"><h3>Noter smerte eller ømhed</h3>
      <p class="muted" style="margin-bottom:8px">Programmet sænker belastningen på øvelser, der belaster området, og springer risikable spring og kast over.</p>
      <div class="chips wrap" role="group" aria-label="Område">${AREAS.map(([k, t]) => `<button class="chip" type="button" data-sact="area" data-a="${k}" aria-pressed="${painArea === k}">${t}</button>`).join('')}</div>
      <p class="t-sub" style="margin:12px 0 8px">Hvor slemt?</p>
      <div class="chips" role="group" aria-label="Hvor slemt">${[[1, 'Let'], [2, 'Middel'], [3, 'Slem']].map(([v, t]) => `<button class="chip" type="button" data-sact="sev" data-v="${v}" aria-pressed="${painSev === v}">${t}</button>`).join('')}</div>
      <button class="btn btn-block btn-lime" type="button" data-sact="painSave" style="margin-top:12px">Gem</button>
      ${recentPain.length ? `<ul class="history" style="margin-top:12px">${recentPain.map(p => `<li class="hist"><div class="hist-top"><div><b>${AREA_NAME[p.area]}</b> <span class="tag">${['', 'Let', 'Middel', 'Slem'][p.sev]}</span> <span class="tag">${esc(daDate(p.date))}</span></div><button class="icon-btn" type="button" data-sact="painDel" data-id="${p.id}" aria-label="Slet">${ICON.trash}</button></div></li>`).join('')}</ul>` : ''}
      <p class="muted" style="margin-top:10px">Ved slem eller vedvarende smerte: stop øvelsen og få det tjekket af en læge eller fysioterapeut. Appen giver ikke medicinsk rådgivning.</p></div>
    <div class="panel"><h3>Trænerdossier</h3>
      <label class="field">Tilføj en note<textarea id="stNote" rows="2" enterkeyhint="done" placeholder="Fx: Spiller kamp om torsdagen i 3 uger."></textarea></label>
      <button class="btn btn-block" type="button" data-sact="noteAdd" style="margin-top:8px">Gem note</button>
      ${c.dossier.length ? `<ol class="timeline">${c.dossier.slice().reverse().slice(0, 15).map(d => `<li class="${d.type}${d.level ? ' ' + d.level : ''}"><small>${esc(daDate(d.date))} · ${d.type === 'status' ? 'status' : d.type === 'pain' ? 'smerte' : 'note'}</small><p>${esc(d.text)}</p>${d.outcome ? `<p class="out">${esc(d.outcome)}</p>` : ''}${d.type === 'note' ? `<button class="link-btn" type="button" data-sact="noteDel" data-id="${d.id}">Slet</button>` : ''}</li>`).join('')}</ol>` : '<p class="muted" style="margin-top:10px">Dossieret fyldes automatisk, når statussen skifter og når ændringer har haft effekt.</p>'}</div>
    <details class="panel legend"><summary>Status til AI</summary><p class="muted" style="margin-bottom:8px">Det samlede dokument, en AI ville få at se. Det indeholder ingen navne, kun dine tal.</p>
      <pre class="doc" id="stDoc">${esc(JSON.stringify(buildStatusDoc(), null, 2))}</pre><button class="btn btn-block btn-ghost" type="button" data-sact="copy" style="margin-top:8px">Kopiér</button></details>`;
}
function statusAction(a, ds) {
  const c = ST.coach;
  if (a === 'area') { painArea = painArea === ds.a ? '' : ds.a; document.querySelectorAll('[data-sact=area]').forEach(b => b.setAttribute('aria-pressed', b.dataset.a === painArea)); return; }
  if (a === 'sev') { painSev = +ds.v; document.querySelectorAll('[data-sact=sev]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === painSev)); return; }
  if (a === 'painSave') {
    if (!painArea) { toast('Vælg et område'); return; }
    c.pain.push({ id: Date.now() * 1000 + (logSeq++ % 1000), date: todayISO(), area: painArea, sev: painSev }); c.pain = c.pain.slice(-80);
    addDossier({ type: 'pain', text: `${AREA_NAME[painArea]}: ${['', 'let', 'middel', 'slem'][painSev]} smerte eller ømhed noteret.` });
    save(); toast(painSev >= 3 ? 'Noteret. Stop området og få det tjekket' : 'Noteret'); painArea = '';
    if (c.active) refreshPlan(); else updateStatus(); renderStatus(); return;
  }
  if (a === 'painDel') { c.pain = c.pain.filter(p => String(p.id) !== ds.id); save(); if (c.active) refreshPlan(); else updateStatus(); renderStatus(); return; }
  if (a === 'noteAdd') { const t = $('stNote').value.trim(); if (!t) { toast('Skriv en note'); return; } addDossier({ type: 'note', text: t.slice(0, 260) }); save(); renderStatus(); toast('Note gemt'); return; }
  if (a === 'noteDel') { c.dossier = c.dossier.filter(d => String(d.id) !== ds.id); save(); renderStatus(); return; }
  if (a === 'copy') { const txt = JSON.stringify(buildStatusDoc(), null, 2); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Kopieret'), () => { const r = document.createRange(); r.selectNodeContents($('stDoc')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast('Markeret. Kopiér manuelt'); }); }
}

/* ===== Start ===== */
function renderAll() {
  rebuildWeeks();
  updateStatus();
  renderProgress(); renderToday(); renderDays(); renderWeekNav(); renderWeek();
  renderHome(); renderFriday(); renderLibrary(); renderRPE(); renderRates(); renderTracker();
  $('tgSound').setAttribute('aria-pressed', ST.settings.sound); $('tgVib').setAttribute('aria-pressed', ST.settings.vib);
  initVibrationToggle(); buildSteppers(); renderCurrent(); updateBackupNote();
  updateTrainButton();
  renderPlanBanner(); renderCoach(); renderCoachCard(); renderWeekSummary();
}
fillIcons();
renderAll();
loadPreset('p1');
showPage(routeFromHash());

/* PWA: cacher appen, så den virker offline. Kræver hosting over HTTPS —
   registreres ikke, hvis filen åbnes direkte fra disk (file://) eller
   hostes uden sikker forbindelse. */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
