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
  return { hip, sh, head, legs, arms, front: !!p.front };
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
  parts.forEach(([a, b, w, c, tag, i]) => {
    if (isHl(tag, i)) halo += ln(a, b, w + 13, COL.lime, ' opacity=".26"');
    body += ln(a, b, w, c);
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
  '10 reps', '60 sek', ['Albuerne peger ned mellem knæene.', 'Hælene bliver i gulvet.'], { illu: 'squat', log: true });
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
  '8/ben', '30 sek', ['Hoften forbliver vandret.', 'Spænd ballen, ikke lænden.'], { illu: 'glutebridge' });
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
  '10 reps', '60 sek', ['Ryggen er lige hele tiden.', 'Hold vægtene tæt på kroppen.'], { illu: 'rdl', log: true });

/* --- Skub --- */
A('kneepushup', 'Armstrækninger på knæ', 'Styrke', ['Styrke'], 'Ingen udstyr', 'push',
  'Lettere version af armstrækninger, når du skal bygge op.',
  ['Knæene i gulvet, hænderne lidt bredere end skuldrene.', 'Sænk brystet mod gulvet med albuerne skråt ud.', 'Pres dig op, til armene er strakte.'],
  '10 reps', '30 sek', ['Kroppen er en lige linje fra knæ til hoved.', 'Gå videre til almindelige, når du kan lave 12.'], { illu: 'pushup' });
A('diamondpush', 'Diamant-armstrækninger', 'Styrke', ['Styrke'], 'Ingen udstyr', 'push',
  'Armstrækninger med fokus på triceps.',
  ['Placér hænderne tæt sammen under brystet, så tommel og pegefinger danner en diamant.', 'Sænk brystet mod hænderne med albuerne tæt ind.', 'Pres dig op.'],
  '8 reps', '45 sek', ['Fokus på triceps.', 'Lav dem på knæ, hvis det er for tungt.'], { illu: 'pushup' });
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
  '10/side', '30 sek', ['Hofter og skuldre peger frem.', 'Træd længere væk for mere modstand.'], { illu: 'pallof' });
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
  '6/side', '45 sek', ['Land på forfoden.', 'Knæet følger tæerne.'], { illu: 'bounds' });
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
  '10/ben', '30 sek', ['Hold et kort stop i toppen.', 'Rolig bevægelse, ingen vippen.'], { illu: 'calf' });
A('tibraise', 'Tibialis raise', 'Styrke', ['Skadesforebyggelse', 'Styrke'], 'Ingen udstyr', 'calf',
  'Stærke skinneben, der beskytter mod stød og forkert landing.',
  ['Stå med ryggen mod en væg og fødderne et skridt frem.', 'Løft forfoden og tæerne op mod skinnebenet.', 'Sænk langsomt tilbage.'],
  '15 reps', '30 sek', ['Hælene bliver i gulvet.', 'Langsomt og kontrolleret.']);
A('stepcalf', 'Calf raise på trin', 'Styrke', ['Styrke', 'Skadesforebyggelse'], 'Bænk/kasse', 'calf',
  'Stærke læg med fuldt bevægeudslag.',
  ['Stå med forfoden på kanten af et trin og hælene frit.', 'Pres op på tæerne, så højt du kan.', 'Sænk hælene under trinnet, og stræk læggen.'],
  '12 reps', '45 sek', ['Fuldt bevægeudslag giver stærkere ankler.', 'Hold let fast i noget.'], { illu: 'calf' });

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
const WEEKS = Array.from({ length: 8 }, (_, i) => buildWeek(i + 1));

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

/* ===== Tilstand (localStorage) ===== */
const KEY = 'gk8-goalkeeper-v1';
const DEF = () => ({
  week: 1, start: '', done: {}, weeksDone: [], matches: [], tests: {}, logs: [], swaps: {},
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
  out.logs = (Array.isArray(d.logs) ? d.logs : []).filter(l => isObj(l) && isISO(l.date) && EX[l.ex]).slice(-500).map((l, i) => ({
    id: Math.round(clampNum(l.id, 0, 9e15, Date.now() + i)), date: l.date, week: Math.round(clampNum(l.week, 1, 8, 1)), ex: l.ex,
    kg: clampNum(l.kg, 0, 1000, 0), reps: clampNum(l.reps, 0, 1000, 0), rpe: Math.round(clampNum(l.rpe, 0, 10, 0))
  }));
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
const scrollToId = id => { const el = $(id); if (el) el.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' }); };
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
  const dose = /^× /.test(it.dose) ? '× ' + e.dose : (String(it.dose).match(/^\d+ × /) || [''])[0] + e.dose; // bevar sæt-/gange-præfikset
  return { ex: sw, dose, secs: e.secs, perSide: e.perSide, swapped: true, orig: it };
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
  $('heroProgress').innerHTML = progHTML(false);
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
function renderToday() {
  const idx = (new Date().getDay() + 6) % 7, day = DAYS[idx], n = curWeek(), W = WEEKS[n - 1];
  const phaseName = W.title.split('·')[1].trim().toLowerCase().replace(/^./, c => c.toUpperCase());
  const st = weekStats(n);
  let cls = '', big = '', text = '', btn = '', target = '';
  switch (day.kind) {
    case 'fit': cls = 'is-fit'; big = `Fitness · uge ${n}`; text = `${phaseName}. ${st.done} af ${st.total} øvelser klaret.`; btn = 'Åbn dagens program'; target = 'program'; break;
    case 'fri': big = 'Aktivering'; text = 'Bliv klar til kamp. Du skal føle dig frisk bagefter.'; btn = 'Åbn fredagens aktivering'; target = 'fredag'; break;
    case 'match': big = 'Kampdag'; text = 'Efter kampen: registrér koncentration, parathed og overskud.'; btn = 'Registrér kampen'; target = 'tracker'; break;
    case 'off': big = 'Fri'; text = 'Restitution. Sov godt, spis godt. Næste fitnesspas er onsdag.'; btn = 'Se din progression'; target = 'progression'; break;
    default:
      big = 'Fodbold';
      text = (idx === 1 ? `I morgen er det fitness: uge ${n}.` : idx === 3 ? 'Kamp lørdag. I morgen: let aktivering.' : 'Næste fitnesspas er onsdag.') + ' Lav hjemmerutinen inden træning: ca. 12 min uden udstyr.';
      btn = 'Før træning · hjemme'; target = 'hjemme';
  }
  $('todayCard').className = `today-card ${cls}`;
  $('todayCard').innerHTML = `<span class="today-ic" aria-hidden="true">${ICON[day.icon]}</span>
    <p class="today-small">I dag er det ${day.full}</p>
    <h2 class="today-big">${big}</h2>
    <p class="today-text">${text}</p>
    <div class="today-actions"><button class="btn ${cls ? '' : 'btn-lime'}" type="button" data-go="${target}">${ICON.play}${btn}</button>${day.kind === 'ball' ? `<button class="btn btn-ghost" type="button" data-go="program">Se uge ${n}</button>` : ''}</div>`;
}
function renderDays() {
  const idx = (new Date().getDay() + 6) % 7;
  $('days').innerHTML = DAYS.map((d, i) => `<li class="day ${d.kind === 'fit' ? 'fit' : ''} ${d.kind === 'match' ? 'match' : ''} ${i === idx ? 'today' : ''}">
      ${i === idx ? '<span class="today-pin">I dag</span>' : ''}
      <span class="dn">${d.kind === 'fit' ? 'ONSDAG' : d.d}</span>${ICON[d.icon]}<span class="dl">${d.label}</span></li>`).join('');
}

/* ===== Ugenavigation og ugevisning ===== */
function renderWeekNav() {
  $('weekNav').innerHTML = WEEKS.map(W => {
    const sel = W.n === ST.week, done = ST.weeksDone.includes(W.n);
    return `<button class="wk" role="tab" type="button" id="tab-${W.n}" data-week="${W.n}" aria-selected="${sel}" aria-controls="weekView" tabindex="${sel ? 0 : -1}">UGE ${W.n}${done ? `<span class="ck" aria-label="gennemført">${ICON.check}</span>` : ''}</button>`;
  }).join('');
  $('weekChip').textContent = `Uge ${ST.week}`;
  const el = $('tab-' + ST.week), sc = $('weekNav');
  if (el) sc.scrollTo({ left: el.offsetLeft - sc.clientWidth / 2 + el.clientWidth / 2, behavior: prefersReduced() ? 'auto' : 'smooth' });
}
function selectWeek(n) {
  ST.week = Math.min(8, Math.max(1, n)); save();
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
      <span class="item-txt"><span class="nm">${name}</span><span class="ds">${it.dose}</span>${it.note ? `<span class="nt">${it.note}</span>` : ''}<span class="nt good">${esc(e.good.slice(0, 3).join(' · '))}</span>${it.swapped ? `<span class="nt swapped">↻ Byttet fra ${esc(it.orig.name || EX[it.orig.ex].name)}</span>` : ''}</span>
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
    <div class="blocks">${W.blocks.map(b => blockHTML(b, W.n)).join('')}
      <button class="btn btn-block wk-done-btn ${wd ? '' : 'btn-lime'}" type="button" data-weekdone="${W.n}" aria-pressed="${wd}">${ICON.check}${wd ? `Uge ${W.n} er gennemført` : `Markér uge ${W.n} som gennemført`}</button>
    </div></div>`;
}
function toggleDone(ctx) {
  const p = ctx.split('|');
  if (p[0] === 'fri') { ST.fri.done[p[1]] = !ST.fri.done[p[1]]; if (!ST.fri.done[p[1]]) delete ST.fri.done[p[1]]; save(); withFocus(renderFriday); return; }
  if (p[0] === 'home') {
    if (ST.home.done[ctx]) delete ST.home.done[ctx]; else ST.home.done[ctx] = true;
    const lv = HOME[+p[1]], t = todayISO();
    if (lv && lv.blocks.every(b => b.items.every((_, i) => ST.home.done[`home|${p[1]}|${b.id}|${i}`])) && !ST.homeLog.includes(t)) {
      ST.homeLog.push(t); ST.homeLog = ST.homeLog.slice(-120); toast('Alle øvelser klaret. Dagens rutine er registreret.');
    }
    save(); withFocus(renderHome); return;
  }
  if (ST.done[ctx]) delete ST.done[ctx]; else ST.done[ctx] = true;
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
    ${goodTagsHTML(e)}
    <p class="ex-goal">${e.goal}</p>
    <ol class="ex-steps">${['Start', 'Bevægelse', 'Slut'].map((l, i) => `<li><b>${l}</b><span>${e.how[i]}</span></li>`).join('')}</ol>
    <ul class="ex-tips">${e.tips.map(t => `<li>${ICON.tip}<span>${t}</span></li>`).join('')}</ul>
    ${origItem ? `<button class="btn btn-ghost btn-block" type="button" data-swap-open>${ICON.repeat}${item.swapped ? 'Skift igen eller gendan original' : 'Skift øvelse'}</button>` : ''}
    ${e.log ? logSectionHTML(exId) : ''}
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
  if (id === c.origEx) delete ST.swaps[ctx]; else ST.swaps[ctx] = id;
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
  return `<ul class="log-list">${list.map(l => `<li><span>${esc(daDate(l.date))}</span><b>${l.kg ? fmtNum(l.kg) + ' kg' : 'kropsvægt'} × ${fmtNum(l.reps)}</b>${l.rpe ? `<small>RPE ${l.rpe}</small>` : ''}</li>`).join('')}</ul>`;
}
function logSectionHTML(exId) {
  const opts = '<option value="0">–</option>' + Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
  return `<section class="logbox" aria-label="Registrér sæt"><h4>Registrér</h4>
    <div class="log-form">
      <label class="field">Vægt (kg)<input id="lgKg" inputmode="decimal" placeholder="0"></label>
      <label class="field">Reps / meter<input id="lgReps" inputmode="numeric" placeholder="fx 8"></label>
      <label class="field">RPE<select id="lgRpe">${opts}</select></label>
      <button class="btn btn-lime" type="button" data-logsave="${esc(exId)}">Gem</button>
    </div><div id="lgList">${logListHTML(exId)}</div></section>`;
}
function saveLog(exId) {
  const kg = Math.max(0, parseNum($('lgKg').value) || 0), reps = parseNum($('lgReps').value);
  if (!EX[exId] || !(reps > 0)) { toast('Skriv antal reps eller meter'); $('lgReps').focus(); return; }
  ST.logs.push({ id: Date.now(), date: todayISO(), week: curWeek(), ex: exId, kg: Math.min(kg, 1000), reps: Math.min(reps, 1000), rpe: +$('lgRpe').value || 0 });
  ST.logs = ST.logs.slice(-500); save();
  $('lgList').innerHTML = logListHTML(exId); $('lgReps').value = ''; toast('Registreret');
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
}
let timerInView = false;
function renderMini(ph, s) {
  const m = $('miniTimer'), active = !['idle', 'done'].includes(ph);
  m.classList.toggle('show', active && !timerInView);
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
  setTimeout(() => { const el = $('timerBox'); el.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' }); }, 60);
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
  $('matchForm').scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' });
  toast('Redigerer kamp. Tryk "Opdatér kamp" for at gemme.');
}
function renderTracker() {
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
  if (ds.go) { if (ds.go === 'program') selectWeek(curWeek()); scrollToId(ds.go); return; }
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
    case 'pcCta': { const n = curWeek(); selectWeek(n); scrollToId('program'); break; }
    case 'weekChip': scrollToId('program'); break;
    case 'tStart': tStart(); break;
    case 'tPause': tPause(); break;
    case 'tReset': tReset(); break;
    case 'tRepsBtn': tAdvance(); break;
    case 'tBack': if (TM.src) { const el = $(TM.src) || $('program'); el.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' }); } break;
    case 'libMore': libShown += LIB_PAGE; renderLibList(); break;
    case 'libReset': ST.settings.lib = 'Alle'; ST.settings.libEquip = 'Alle'; ST.settings.libCat = 'Alle'; libQ = ''; $('libSearch').value = ''; save(); libShown = LIB_PAGE; renderLibrary(); break;
    case 'miniGo': scrollToId('timer'); break;
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
});
let lastDayKey = localISO(new Date());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (TM.running) { keepAwake(true); unlockAudio(); tTick(); }
  // En installeret app kan stå åben i dagevis: opdatér dato-afhængige visninger
  const k = localISO(new Date());
  if (k !== lastDayKey) {
    lastDayKey = k;
    renderDays(); renderToday(); renderHome(); renderFriday();
    if (!mDateTouched && !editMatchId) $('mDate').value = lastSaturday();
    updateBackupNote();
  }
});

/* Synlighed: mini-timer og aktiv bundnavigation */
if ('IntersectionObserver' in window) {
  new IntersectionObserver(es => { timerInView = es[0].isIntersecting; tRender(); }, { threshold: .25 }).observe($('timerBox'));
  const links = [...document.querySelectorAll('.bottomnav a')];
  let activeNav = null;
  // Et smalt bånd midt i skærmen: den sektion, der krydser båndet, er aktiv (virker også for meget høje sektioner)
  const io = new IntersectionObserver(es => {
    es.forEach(x => { if (x.isIntersecting) activeNav = x.target.id; });
    links.forEach(a => a.setAttribute('aria-current', a.dataset.nav === activeNav ? 'true' : 'false'));
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  ['program', 'hjemme', 'fredag', 'timer', 'tracker', 'ovelser'].forEach(id => io.observe($(id)));
}

/* ===== Start ===== */
function renderAll() {
  renderProgress(); renderToday(); renderDays(); renderWeekNav(); renderWeek();
  renderHome(); renderFriday(); renderLibrary(); renderRPE(); renderRates(); renderTracker();
  $('tgSound').setAttribute('aria-pressed', ST.settings.sound); $('tgVib').setAttribute('aria-pressed', ST.settings.vib);
  initVibrationToggle(); buildSteppers(); renderCurrent(); updateBackupNote();
}
fillIcons();
renderAll();
loadPreset('p1');

/* PWA: cacher appen, så den virker offline. Kræver hosting over HTTPS —
   registreres ikke, hvis filen åbnes direkte fra disk (file://) eller
   hostes uden sikker forbindelse. */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
