/* CL Orals Lab: app logic. No build step, no framework.
 * Data comes from data-lenses.js, data-theory.js and the cases-*.js files. */
(() => {
  'use strict';

  // Rename the examiner here if you want a different voice in the feedback.
  const EXAMINER = 'Examiner';
  const STORE_KEY = 'cl-orals-lab:v1';
  const PTS = 10;

  const TOPICS = {
    history: 'History & patient selection',
    rx: 'Rx conversion & optics',
    lenschoice: 'Lens selection & modality',
    materials: 'Materials, Dk & modulus',
    fitting: 'Fit assessment & toric stability',
    rgp: 'Rigid lenses (RGP)',
    presbyopia: 'Presbyopia',
    ew: 'Extended wear',
    lifestyle: 'Water, sport & travel',
    care: 'Care systems',
    complications: 'Complications',
    specialty: 'Ortho-K & specialty',
  };
  const CATS = {
    soft: 'Soft toric & daily wear',
    rgp: 'Rigid lenses (RGP)',
    presbyopia: 'Presbyopia & multifocals',
    ew: 'Extended wear',
    lifestyle: 'Water, sport & travel',
    specialty: 'Ortho-K & specialty',
    aftercare: 'Aftercare & complications',
  };
  // Colour wheel positions (hue) so each topic and case category gets its own tint.
  const TOPIC_HUE = { complications: 0, history: 30, fitting: 55, care: 95, materials: 135, lenschoice: 170, lifestyle: 195, rx: 225, specialty: 250, rgp: 275, presbyopia: 305, ew: 335 };
  const CAT_HUE = { soft: 225, rgp: 275, presbyopia: 305, ew: 335, lifestyle: 195, specialty: 160, aftercare: 15 };
  const MOD_HUE = { Daily: 170, 'Two-weekly': 275, Monthly: 225 };
  const topicPill = (id) => `<span class="pill tint" style="--h:${TOPIC_HUE[id] ?? 225}">${esc(TOPICS[id] || id)}</span>`;

  const CASES = window.CASES || [];
  const view = document.getElementById('view');
  const scorePill = document.getElementById('score-pill');

  // ------------------------------------------------------------------ storage
  let saved = { done: {}, missed: {}, seen: {}, bank: {} };
  try { saved = Object.assign(saved, JSON.parse(localStorage.getItem(STORE_KEY)) || {}); } catch (e) { /* storage unavailable */ }
  const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch (e) { /* ignore */ } };
  // Values typed into the Rx lab and lens finder survive switching tabs and reloading.
  const FIELDS_KEY = STORE_KEY + ':fields';
  const KEEP = /^[clfg]-/;
  let fields = {};
  try { fields = JSON.parse(localStorage.getItem(FIELDS_KEY)) || {}; } catch (e) { /* storage unavailable */ }
  function restoreFields() {
    view.querySelectorAll('input[id], select[id]').forEach((el) => { if (KEEP.test(el.id) && fields[el.id] !== undefined) el.value = fields[el.id]; });
  }
  const stepKey = (c, i) => `${c.id}#${i}`;

  // Your last result on each question: 'right' (full marks), 'part' (half marks) or 'wrong' (none); '' = not tried.
  // saved.missed (anything under full marks) and saved.seen are kept in step for Ocumon.
  if (!saved.res) saved.res = {};
  const RES = { right: { label: 'Right', cls: 'good' }, part: { label: 'Partly right', cls: 'warn' }, wrong: { label: 'Wrong', cls: 'bad' }, '': { label: 'Not tried', cls: '' } };
  const RES_ORDER = ['wrong', 'part', 'right', ''];
  function resultOf(k) {
    if (saved.res[k]) return saved.res[k];
    // Progress saved before results were split three ways.
    if (saved.bank[k] === 'known') return 'right';
    if (saved.bank[k] === 'missed' || saved.missed[k]) return 'wrong';
    if (saved.seen[k]) return 'right';
    return '';
  }
  function setResult(k, points) {
    saved.seen[k] = 1;
    saved.res[k] = points >= PTS ? 'right' : points > 0 ? 'part' : 'wrong';
    if (points < PTS) saved.missed[k] = 1; else delete saved.missed[k];
    delete saved.bank[k];
  }
  const needsWork = (r) => r === 'wrong' || r === 'part';
  const resPill = (r) => (r ? `<span class="pill ${RES[r].cls}">${RES[r].label}</span>` : '');

  // ------------------------------------------------------------------ helpers
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const shuffled = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // iOS decimal keypads have no +/− key, so signed power fields get a tap-to-flip sign button.
  const signed = (input, id) => `<span class="signed">${input}<button type="button" class="sign-btn" data-sign="${id}" aria-label="Flip sign" tabindex="-1">±</button></span>`;
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  const vtx = (F, d = 0.012) => F / (1 - d * F);
  const q25 = (x) => Math.round(x * 4) / 4;
  const D = (x, plano = true) => {
    if (Math.abs(x) < 1e-9) return plano ? 'pl' : '0.00';
    return (x > 0 ? '+' : '−') + Math.abs(x).toFixed(2);
  };
  const rxStr = ([s, c, a]) => (c ? `${D(s)} / ${D(c)} × ${a}` : `${D(s)} DS`);
  const normAxis = (a) => { let x = ((Math.round(a) % 180) + 180) % 180; return x === 0 ? 180 : x; };
  const parseNum = (v) => {
    let t = String(v ?? '').trim().toLowerCase().replace(/[−–]/g, '-').replace(/^x\s*/, '').replace(/\s/g, '');
    if (t === 'pl' || t === 'plano' || t === 'ds') return 0;
    if (t === '') return NaN;
    return Number(t);
  };

  function padHTML(spec) {
    const lines = ['R', 'L'].filter((e) => spec[e]).map((e) => `<div><span class="eye">${e}</span>${esc(rxStr(spec[e]))}</div>`);
    if (spec.add) lines.push(`<div><span class="eye">Add</span>+${spec.add.toFixed(2)}</div>`);
    if (!lines.length) return '<p class="muted" style="margin:0">Not given for this case.</p>';
    return `<div class="pad">${lines.join('')}</div>`;
  }
  /* Optional extra record (K readings, slit-lamp findings, current lens) shown under the Rx. */
  function findingsHTML(c) {
    return c.findings ? `<div><p class="label">Findings</p><p style="margin:0">${esc(c.findings)}</p></div>` : '';
  }

  /* Power cross: spectacle meridian powers and their corneal-plane values. */
  function crossSVG(spec, label) {
    const [s, c, a] = spec;
    const m1 = s, m2 = s + c;
    const ang = (deg) => (deg * Math.PI) / 180;
    const R = 70, cx = 120, cy = 110;
    const end = (deg, r) => [cx + r * Math.cos(ang(deg)), cy - r * Math.sin(ang(deg))];
    const [x1, y1] = end(a, R), [x2, y2] = end(a + 180, R);
    const [x3, y3] = end(a + 90, R), [x4, y4] = end(a + 270, R);
    const [t1x, t1y] = end(a, R + 26);
    const [t2x, t2y] = end(a + 90, R + 26);
    const txt = (x, y, main, sub) => `<text x="${x.toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle">${main}</text><text class="sub" x="${x.toFixed(1)}" y="${(y + 9).toFixed(1)}" text-anchor="middle">${sub}</text>`;
    return `<figure><svg class="cross" viewBox="-38 -4 316 228" role="img" aria-label="Power cross ${esc(label)}">
      <circle cx="${cx}" cy="${cy}" r="${R}"></circle>
      <line class="m" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>
      <line class="m2" x1="${x3}" y1="${y3}" x2="${x4}" y2="${y4}"></line>
      ${txt(t1x, t1y, `${D(m1)} @${normAxis(a)}`, `→ ${vtx(m1).toFixed(2)}`)}
      ${txt(t2x, t2y, `${D(m2)} @${normAxis(a + 90)}`, `→ ${vtx(m2).toFixed(2)}`)}
    </svg><figcaption>${esc(label)}: spectacle → cornea (12 mm)</figcaption></figure>`;
  }

  function workings(spec) {
    return ['R', 'L'].filter((e) => spec[e]).map((e) => {
      const [s, c] = spec[e];
      const a = vtx(s), b = vtx(s + c);
      return `<tr><td class="mono">${e}</td><td class="mono">${D(s)} → ${a.toFixed(2)}</td><td class="mono">${D(s + c)} → ${b.toFixed(2)}</td><td class="mono">${(b - a).toFixed(2)}</td><td class="mono">${(a + (b - a) / 2).toFixed(2)}</td></tr>`;
    }).join('');
  }

  // ------------------------------------------------------------------ simulator state
  const sim = {
    view: 'start', mode: 'cases',
    cats: new Set(Object.keys(CATS)), topics: new Set(Object.keys(TOPICS)),
    source: 'all', pool: 'all', count: 0,
    items: [], i: 0, score: 0, max: 0, results: [],
    perm: null, picked: new Set(), last: null,
  };

  const casePasses = (c) => sim.source === 'all'
    || (sim.source === 'notes' ? !/^(20\d\d|Predicted)/.test(c.source)
      : sim.source === 'pred' ? c.source.startsWith('Predicted') : c.source.startsWith(sim.source));
  // Pools, by your last result on each question. A case is "not tried" until you answer any of it,
  // "needs work" while any question in it was wrong or partly right, and "got right" once every question is.
  const POOLS = {
    all: { label: 'All', cases: 'every case', drill: 'every question' },
    new: { label: 'Not tried', cases: 'cases you haven’t answered any question of yet', drill: 'questions you haven’t answered yet' },
    review: { label: 'Needs work', cases: 'cases with a question you got wrong or only partly right last time', drill: 'questions you got wrong or only partly right last time' },
    right: { label: 'Got right', cases: 'cases where every question was right last time', drill: 'questions you got right last time (check they’ve stuck)' },
  };
  const caseRes = (c) => c.steps.map((_, i) => resultOf(stepKey(c, i)));
  function poolHas(pool, rs) {
    if (pool === 'new') return rs.every((r) => !r);
    if (pool === 'review') return rs.some(needsWork);
    if (pool === 'right') return rs.every((r) => r === 'right');
    return true;
  }
  function poolCases(pool = sim.pool) {
    return CASES.filter((c) => sim.cats.has(c.cat) && casePasses(c) && poolHas(pool, caseRes(c)));
  }
  function poolSteps(pool = sim.pool, topics = sim.topics) {
    const out = [];
    CASES.filter(casePasses).forEach((c) => c.steps.forEach((s, i) => {
      if (topics.has(s.topic) && poolHas(pool, [resultOf(stepKey(c, i))])) out.push({ c, s: i });
    }));
    return out;
  }
  const poolSize = () => (sim.mode === 'cases' ? poolCases().length : poolSteps().length);
  function clampCount() {
    const max = poolSize();
    if (!sim.count || sim.count > max) sim.count = Math.min(max, sim.mode === 'cases' ? 4 : 15);
    if (max > 0 && sim.count < 1) sim.count = 1;
  }

  // kind: 'cases' (whole cases with intros) or 'drill' (single questions), whatever the setup screen says.
  function startSession(items, kind = sim.mode) {
    sim.kind = kind;
    sim.items = items; sim.i = 0; sim.score = 0; sim.max = 0; sim.results = [];
    sim.view = items[0] && items[0].intro ? 'intro' : 'question';
    prepStep(); renderSim();
  }
  function buildSession() {
    clampCount();
    if (sim.mode === 'cases') {
      const cs = shuffled(poolCases()).slice(0, sim.count);
      const items = [];
      cs.forEach((c) => { items.push({ c, intro: true }); c.steps.forEach((_, i) => items.push({ c, s: i })); });
      startSession(items);
    } else {
      startSession(shuffled(poolSteps()).slice(0, sim.count));
    }
  }

  const cur = () => sim.items[sim.i];
  const curStep = () => { const it = cur(); return it && it.s !== undefined ? it.c.steps[it.s] : null; };

  function prepStep() {
    const st = curStep();
    sim.picked = new Set(); sim.last = null; sim.revealed = false; sim.draft = {};
    if (!st) { sim.perm = null; return; }
    if (st.type === 'mcq' || st.type === 'multi') sim.perm = shuffled(range(st.options.length));
    else if (st.type === 'match') sim.perm = st.rows.map((r) => shuffled(range(r.options.length)));
    else sim.perm = null;
  }

  function record(points, outcome, detail) {
    const it = cur(), k = stepKey(it.c, it.s);
    sim.score += points; sim.max += PTS;
    setResult(k, points);
    sim.results.push({ c: it.c, s: it.s, points });
    const lastOfCase = !sim.items[sim.i + 1] || sim.items[sim.i + 1].c !== it.c || sim.items[sim.i + 1].intro;
    if (lastOfCase && sim.kind === 'cases') saved.done[it.c.id] = 1;
    persist();
    sim.last = { points, outcome, detail };
  }

  function submit() {
    const st = curStep();
    if (st.type === 'mcq') {
      const pick = [...sim.picked][0];
      if (pick === undefined) return;
      const ok = pick === st.answer;
      record(ok ? PTS : 0, ok ? 'good' : 'bad', { pick });
    } else if (st.type === 'multi') {
      const want = new Set(st.answers);
      const hits = [...sim.picked].filter((x) => want.has(x)).length;
      const wrong = [...sim.picked].filter((x) => !want.has(x)).length;
      const ok = hits === want.size && wrong === 0;
      const partial = !ok && hits >= Math.ceil(want.size / 2) && wrong <= 1;
      record(ok ? PTS : partial ? PTS / 2 : 0, ok ? 'good' : partial ? 'part' : 'bad', { picked: [...sim.picked] });
    } else if (st.type === 'rx') {
      const { pts, rows } = rxCheck(st);
      record(pts, pts === PTS ? 'good' : pts ? 'part' : 'bad', { rows });
    } else if (st.type === 'match') {
      const res = st.rows.map((r, i) => {
        const v = document.getElementById(`m-${i}`).value;
        return { v: v === '' ? null : Number(v), ok: Number(v) === r.answer && v !== '' };
      });
      const right = res.filter((r) => r.ok).length;
      const pts = right === st.rows.length ? PTS : right >= st.rows.length - 1 ? PTS / 2 : 0;
      record(pts, pts === PTS ? 'good' : pts ? 'part' : 'bad', { res });
    }
    sim.view = 'feedback';
    renderSim();
  }

  // Marks the CL Rx typed into the rx-<eye>-<field> boxes (shared by the simulator and Ocumon fights).
  function rxCheck(st) {
    const rows = [];
    let right = 0, total = 0;
    ['R', 'L'].forEach((e) => ['sph', 'cyl', 'axis'].forEach((f) => {
      const el = document.getElementById(`rx-${e}-${f}`);
      const raw = el ? el.value : '';
      const n = parseNum(raw);
      const acc = st.accept[e][f];
      const ok = f === 'axis' && !acc.length ? raw.trim() === '' || n === 0 || Number.isNaN(n)
        : !Number.isNaN(n) && acc.some((a) => (f === 'axis' ? normAxis(n) === normAxis(a) : Math.abs(n - a) < 1e-3));
      total++; if (ok) right++;
      rows.push({ e, f, raw, ok, acc });
    }));
    return { pts: right === total ? PTS : right >= 4 ? PTS / 2 : 0, rows };
  }

  function selfMark(points) {
    record(points, points === PTS ? 'good' : points ? 'part' : 'bad', {});
    next();
  }

  function next() {
    sim.i++;
    if (sim.i >= sim.items.length) { sim.view = 'end'; renderSim(); return; }
    sim.view = cur().intro ? 'intro' : 'question';
    prepStep(); renderSim();
  }

  // ------------------------------------------------------------------ simulator views
  function renderSim() {
    if (location.hash.replace('#', '') && location.hash !== '#sim') return;
    scorePill.hidden = !(sim.view === 'question' || sim.view === 'feedback' || sim.view === 'intro');
    scorePill.textContent = `Score ${sim.score} / ${sim.max}`;
    const fn = { start: viewStart, intro: viewIntro, question: viewQuestion, feedback: viewFeedback, end: viewEnd }[sim.view];
    view.innerHTML = `<div class="fade">${fn()}</div>`;
    // Put back anything typed into this question before a tab switch or the model-answer reveal.
    if (sim.view === 'question') Object.entries(sim.draft || {}).forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.value = v; });
    if (sim.view !== 'start') window.scrollTo({ top: 0 });
  }

  function viewStart() {
    clampCount();
    const isCases = sim.mode === 'cases';
    const list = isCases
      ? Object.entries(CATS).map(([id, name]) => {
        const n = CASES.filter((c) => c.cat === id && casePasses(c)).length;
        return catButton('cat', id, name, `${n} case${n === 1 ? '' : 's'}`, sim.cats.has(id), CAT_HUE[id]);
      })
      : Object.entries(TOPICS).map(([id, name]) => {
        const n = CASES.filter(casePasses).reduce((a, c) => a + c.steps.filter((s) => s.topic === id).length, 0);
        return catButton('topic', id, name, `${n} question${n === 1 ? '' : 's'}`, sim.topics.has(id), TOPIC_HUE[id]);
      });
    const counts = {};
    Object.keys(POOLS).forEach((p) => { counts[p] = isCases ? poolCases(p).length : poolSteps(p).length; });
    const max = poolSize();
    const totalSteps = CASES.reduce((a, c) => a + c.steps.length, 0);
    return `
    <section class="hero">
      <div>
        <p class="label">Contact lens oral practice</p>
        <h1>Sit the oral before the oral</h1>
        <p>${CASES.length} cases rebuilt from past orals and aftercare notes (${totalSteps} examiner questions), checked against current Australian lens parameters. Run whole cases the way the examiner does, or drill one topic.</p>
      </div>
    </section>
    <div class="grid-2">
      <section class="card stack" aria-labelledby="pick-h">
        <div class="row" style="justify-content:space-between">
          <h2 id="pick-h" style="font-size:1.15rem">${isCases ? 'Case topics' : 'Question topics'}</h2>
          <div class="row" style="gap:.4rem">
            <button class="chip" data-act="all-cats">All</button><button class="chip" data-act="no-cats">None</button>
          </div>
        </div>
        <div class="cat-list">${list.join('')}</div>
      </section>
      <section class="stack">
        <div class="card stack">
          <div>
            <p class="label">Format</p>
            <div class="seg" style="grid-template-columns:1fr 1fr">
              <button data-act="mode" data-v="cases" aria-pressed="${isCases}">Full cases<small>exam style</small></button>
              <button data-act="mode" data-v="drill" aria-pressed="${!isCases}">Topic drill<small>mixed questions</small></button>
            </div>
          </div>
          <div>
            <p class="label">Source</p>
            <div class="row" style="gap:.4rem">
              ${[['all', 'All sources'], ['2026', '2026 orals'], ['2025', '2025 orals'], ['2022', '2022 orals'], ['notes', 'Notes, practice doc & slides'], ['pred', 'Predicted (Wed/Thu)']].map(([s, label]) => `<button class="chip" data-act="source" data-v="${s}" aria-pressed="${sim.source === s}">${label}</button>`).join('')}
            </div>
          </div>
          <div>
            <p class="label">Pool</p>
            <div class="seg seg-4">
              ${Object.entries(POOLS).map(([p, o]) => `<button data-act="pool" data-v="${p}" aria-pressed="${sim.pool === p}" ${counts[p] || sim.pool === p ? '' : 'disabled'}>${o.label}<small>${counts[p]}</small></button>`).join('')}
            </div>
            <p class="muted" style="font-size:.88rem;margin:.45rem 0 0"><b>${POOLS[sim.pool].label}:</b> ${isCases ? POOLS[sim.pool].cases : POOLS[sim.pool].drill}.</p>
          </div>
          <div>
            <div class="row" style="justify-content:space-between"><p class="label">${isCases ? 'Cases' : 'Questions'}</p><span class="muted mono" style="font-size:.85rem">${max} available</span></div>
            <div class="stepper">
              <button class="btn" data-act="count" data-v="-1" aria-label="Fewer">−</button>
              <output id="count-out">${sim.count}</output>
              <button class="btn" data-act="count" data-v="1" aria-label="More">+</button>
              <button class="btn" data-act="count-max">Max</button>
            </div>
            <input type="range" id="count-range" min="1" max="${Math.max(1, max)}" value="${sim.count || 1}" aria-label="${isCases ? 'Number of cases' : 'Number of questions'}" ${max ? '' : 'disabled'}>
          </div>
          <button class="btn primary big" data-act="start" ${max ? '' : 'disabled'}>Start ${sim.count} ${isCases ? (sim.count === 1 ? 'case' : 'cases') : 'questions'}</button>
        </div>
        <div class="card">
          <p class="label">How the oral runs</p>
          <p class="muted" style="margin:0">One patient and a spectacle Rx. History → convert the Rx in your head → pick ONE lens → justify the material → fit → complications → a lifestyle twist → care system → plan B. Expect "why?" and "what else?" at every step. Pen and paper allowed, no calculator.</p>
        </div>
      </section>
    </div>
    ${progressHTML()}`;
  }

  // Stacked bar of right / partly right / wrong / not tried for a list of results.
  function tally(rs) {
    const n = { right: 0, part: 0, wrong: 0, '': 0 };
    rs.forEach((r) => { n[r]++; });
    return n;
  }
  function resBar(n, total) {
    return `<div class="pbar" role="img" aria-label="${n.right} right, ${n.part} partly right, ${n.wrong} wrong, ${n['']} not tried">${['right', 'part', 'wrong'].map((r) => (n[r] ? `<i class="${r}" style="width:${((n[r] / total) * 100).toFixed(2)}%"></i>` : '')).join('')}</div>`;
  }
  const resCounts = (n) => ['right', 'part', 'wrong', ''].map((r) => `<span class="rc ${r || 'none'}">${n[r]} ${RES[r].label.toLowerCase()}</span>`).join('');

  // Where you stand on every simulator question, by topic, weakest first, with a one-tap drill of what needs work.
  function progressHTML() {
    const steps = [];
    CASES.filter(casePasses).forEach((c) => c.steps.forEach((s, i) => steps.push({ topic: s.topic, r: resultOf(stepKey(c, i)) })));
    if (!steps.length) return '';
    const all = tally(steps.map((x) => x.r));
    const rows = Object.entries(TOPICS).map(([id, name]) => {
      const rs = steps.filter((x) => x.topic === id).map((x) => x.r);
      const n = tally(rs), done = rs.length - n[''];
      return { id, name, n, total: rs.length, score: done ? (n.right + n.part / 2) / done : 2 };
    }).filter((t) => t.total).sort((a, b) => a.score - b.score);
    const action = (t) => (t.n.wrong + t.n.part
      ? `<button class="chip" data-act="drill-topic" data-v="${t.id}" data-pool="review">Redo ${t.n.wrong + t.n.part}</button>`
      : t.n[''] ? `<button class="chip" data-act="drill-topic" data-v="${t.id}" data-pool="new">Try ${Math.min(15, t.n[''])} new</button>` : '<span class="pill good">All right</span>');
    return `<section class="card stack" style="margin-top:1.5rem" aria-labelledby="prog-h">
      <div class="row" style="justify-content:space-between"><h2 id="prog-h" style="font-size:1.15rem">Your progress</h2>
        <button class="chip" data-act="clear-progress">Clear progress</button></div>
      <p class="muted" style="margin:0;font-size:.9rem">Your last answer to each of the ${steps.length} examiner questions${sim.source === 'all' ? '' : ' from this source'}. Topics you're weakest on come first: redo what's wrong or partly right before moving on to new questions.</p>
      ${resBar(all, steps.length)}
      <div class="rcs">${resCounts(all)}</div>
      <div class="prog-list">${rows.map((t) => `<div class="prog-row">
        <div><b>${esc(t.name)}</b><div class="rcs">${resCounts(t.n)}</div></div>
        ${resBar(t.n, t.total)}
        <div>${action(t)}</div></div>`).join('')}</div>
    </section>`;
  }

  function catButton(kind, id, name, sub, on, hue) {
    return `<button class="cat" style="--h:${hue}" data-act="toggle-${kind}" data-v="${id}" aria-pressed="${on}">
      <span class="tick" aria-hidden="true">${on ? '✓' : ''}</span>
      <span><b>${esc(name)}</b><small>${esc(sub)}</small></span><span></span></button>`;
  }

  function viewIntro() {
    const c = cur().c;
    const caseNo = sim.items.slice(0, sim.i + 1).filter((x) => x.intro).length;
    const nCases = sim.items.filter((x) => x.intro).length;
    return `<article class="intro card stack">
      <div class="meta"><span class="pill tint" style="--h:${CAT_HUE[c.cat]}">${esc(CATS[c.cat])}</span><span class="pill">${esc(c.source)}</span><span class="pill">Case ${caseNo} of ${nCases}</span></div>
      <h1>${esc(c.title)}</h1>
      <p class="muted">${esc(c.theme)}</p>
      <div><p class="label">Patient</p><p style="font-size:1.1rem">${esc(c.patient)}</p></div>
      <div><p class="label">Spectacle Rx</p>${padHTML(c.spec)}</div>
      ${findingsHTML(c)}
      <button class="btn primary big" data-act="begin">Begin: ${esc(c.steps[0].phase)}</button>
    </article>`;
  }

  function recordPanel(c, st) {
    return `<aside class="record card">
      <div><p class="label">Patient</p><p style="margin:0">${esc(c.patient)}</p></div>
      <div><p class="label">Spectacle Rx</p>${padHTML(c.spec)}</div>
      ${findingsHTML(c)}
      <div><p class="label">Phase</p><span class="phase">${esc(st.phase)}</span></div>
      <div class="row" style="gap:.35rem">${topicPill(st.topic)}<span class="muted" style="font-size:.85rem">${esc(c.source)}</span></div>
    </aside>`;
  }

  function progressBar() {
    const it = cur();
    let label, frac;
    if (sim.kind === 'cases') {
      const steps = it.c.steps.length;
      label = `${esc(it.c.title)} · Step ${it.s + 1} of ${steps}`;
      frac = it.s / steps;
    } else {
      label = `Question ${sim.i + 1} of ${sim.items.length} · ${esc(it.c.title)}`;
      frac = sim.i / sim.items.length;
    }
    return `<div class="row" style="justify-content:space-between"><span class="label">${label}</span><button class="chip" data-act="quit">End session</button></div>
      <div class="progress" aria-hidden="true"><i style="width:${(frac * 100).toFixed(1)}%"></i></div>`;
  }

  // The CL Rx entry grid (shared by the simulator and Ocumon fights).
  function rxInputHTML(c, st) {
    const from = st.from ? `<p class="muted" style="font-size:.9rem">Working from: <span class="mono">R ${esc(rxStr(st.from.R))} · L ${esc(rxStr(st.from.L))}</span></p>` : '';
    return `${st.from ? from : `<div style="margin-bottom:.8rem"><p class="label">Spectacle Rx</p>${padHTML(c.spec)}</div>`}<div class="rxgrid">
      <span></span><span class="label">Sphere</span><span class="label">Cyl</span><span class="label">Axis</span>
      ${['R', 'L'].map((e) => `<span class="eye">${e}</span>${['sph', 'cyl', 'axis'].map((f) => f === 'axis' ? `<input type="text" inputmode="numeric" autocomplete="off" id="rx-${e}-${f}" aria-label="${e} ${f}" placeholder="×">` : signed(`<input type="text" inputmode="decimal" autocomplete="off" id="rx-${e}-${f}" aria-label="${e} ${f}" placeholder="±0.00">`, `rx-${e}-${f}`)).join('')}`).join('')}
    </div>
    <p class="muted" style="font-size:.85rem;margin-top:.6rem">Type values like +5.25, −2.25, 20 (tap ± to flip the sign). Use "pl" for plano; for a DS answer put 0 in cyl and leave axis blank.</p>`;
  }

  function viewQuestion() {
    const it = cur(), c = it.c, st = curStep();
    let body = '';
    if (st.type === 'mcq' || st.type === 'multi') {
      const multi = st.type === 'multi';
      body = `<div class="opts" role="${multi ? 'group' : 'radiogroup'}">${sim.perm.map((oi) => `
        <button class="opt ${multi ? 'box' : ''}" data-act="pick" data-v="${oi}" aria-pressed="${sim.picked.has(oi)}"><span class="dot" aria-hidden="true"></span><span>${esc(st.options[oi])}</span></button>`).join('')}</div>
        <div class="row" style="margin-top:1rem"><button class="btn primary" data-act="submit" ${sim.picked.size ? '' : 'disabled'} id="submit-btn">${multi ? 'Submit selection' : 'Lock in answer'}</button>
        ${multi ? '<span class="muted" style="font-size:.9rem">Select all that apply.</span>' : ''}</div>`;
    } else if (st.type === 'rx') {
      body = `${rxInputHTML(c, st)}
      <button class="btn primary" data-act="submit">Check my Rx</button>`;
    } else if (st.type === 'match') {
      body = `<div>${st.rows.map((r, i) => `<div class="matchrow"><label for="m-${i}"><b>${esc(r.label)}</b></label>
        <select id="m-${i}"><option value="">Choose…</option>${sim.perm[i].map((oi) => `<option value="${oi}">${esc(r.options[oi])}</option>`).join('')}</select></div>`).join('')}</div>
        <button class="btn primary" data-act="submit" style="margin-top:1rem">Submit</button>`;
    } else if (st.type === 'open') {
      body = `<label class="field"><span class="label">Your answer (optional notes)</span><textarea id="open-notes" placeholder="Say it out loud as you would to the examiner, or jot the key points."></textarea></label>
        ${sim.revealed ? `<div class="model"><p class="label">Model answer</p>${st.model}</div>
          <p class="label" style="margin-top:.5rem">How did you do?</p>
          <div class="row"><button class="btn" data-act="self" data-v="10">Nailed it</button><button class="btn" data-act="self" data-v="5">Partly</button><button class="btn" data-act="self" data-v="0">Missed it</button></div>`
        : '<button class="btn primary" data-act="reveal">Reveal model answer</button>'}`;
    }
    return `${progressBar()}<div class="qlayout">${recordPanel(c, st)}
      <section class="card qcard"><h2>${esc(st.q)}</h2>${body}</section></div>`;
  }

  // Why a wrong option is wrong (st.why is keyed by option index; correct options have no entry).
  function whyNote(st, oi) {
    return st.why && st.why[oi] ? `<span class="why">${esc(st.why[oi])}</span>` : '';
  }

  // What was typed against what's accepted, the power crosses and the exact workings.
  function rxDetailHTML(c, st, rows) {
    const src = st.from || c.spec;
    return `<div class="tablewrap"><table class="t"><tr><th>Eye</th><th>Field</th><th>You</th><th>Accepted</th></tr>
      ${rows.map((r) => `<tr><td class="mono">${r.e}</td><td>${r.f}</td><td class="mono">${esc(r.raw || '—')} <span class="${r.ok ? 'ok' : 'no'}">${r.ok ? '✓' : '✕'}</span></td>
      <td class="mono">${r.acc.length ? r.acc.map((a) => (r.f === 'axis' ? a : D(a))).join(' or ') : 'none (DS)'}</td></tr>`).join('')}</table></div>
      <div class="crosses">${['R', 'L'].map((e) => crossSVG(src[e], e === 'R' ? 'Right eye' : 'Left eye')).join('')}</div>
      <div class="tablewrap"><table class="t"><tr><th>Eye</th><th>Meridian 1</th><th>Meridian 2</th><th>Exact cyl</th><th>Exact SE</th></tr>${workings(src)}</table></div>`;
  }

  function viewFeedback() {
    const it = cur(), c = it.c, st = curStep(), L = sim.last;
    const head = { good: ['✓', 'Correct'], part: ['½', 'Partly right'], bad: ['✕', 'Not quite'] }[L.outcome];
    const quote = L.outcome === 'good' ? st.good : st.bad || st.good;
    let detail = '';
    if (st.type === 'mcq') {
      detail = `<div class="opts">${sim.perm.map((oi) => {
        const cls = oi === st.answer ? 'right' : oi === L.detail.pick ? 'wrong' : '';
        return `<div class="opt ${cls}"><span class="dot" aria-hidden="true"></span><span>${esc(st.options[oi])}${whyNote(st, oi)}</span></div>`;
      }).join('')}</div>`;
    } else if (st.type === 'multi') {
      const want = new Set(st.answers), got = new Set(L.detail.picked);
      detail = `<div class="opts">${sim.perm.map((oi) => {
        const cls = want.has(oi) ? 'right' : got.has(oi) ? 'wrong' : '';
        const note = want.has(oi) && !got.has(oi) ? ' <span class="pill bad">missed</span>' : !want.has(oi) && got.has(oi) ? ' <span class="pill bad">shouldn\'t pick</span>' : '';
        return `<div class="opt box ${cls}"><span class="dot" aria-hidden="true"></span><span>${esc(st.options[oi])}${note}${whyNote(st, oi)}</span></div>`;
      }).join('')}</div>`;
    } else if (st.type === 'rx') {
      detail = rxDetailHTML(c, st, L.detail.rows);
    } else if (st.type === 'match') {
      detail = `<div class="tablewrap"><table class="t"><tr><th>Item</th><th>Correct match</th><th></th></tr>${st.rows.map((r, i) => `<tr><td><b>${esc(r.label)}</b></td><td>${esc(r.options[r.answer])}</td><td class="${L.detail.res[i].ok ? 'ok' : 'no'}">${L.detail.res[i].ok ? '✓' : '✕'}</td></tr>`).join('')}</table></div>`;
    }
    const nextLabel = sim.i + 1 >= sim.items.length ? 'See results' : sim.items[sim.i + 1].intro ? 'Next case' : 'Next question';
    return `${progressBar()}<div class="qlayout">${recordPanel(c, st)}
      <section class="card qcard">
        <div class="verdict ${L.outcome}"><span class="mark" aria-hidden="true">${head[0]}</span><div><h2 style="margin:0">${head[1]}</h2><span class="muted mono">+${L.points} points</span></div></div>
        <p class="muted" style="margin-bottom:1rem">${esc(st.q)}</p>
        ${quote ? `<div class="says"><span class="who">${esc(EXAMINER)}</span><p>${esc(quote)}</p></div>` : ''}
        ${detail}
        <div class="model" style="margin-top:1rem"><p class="label">Model answer</p>${st.model}</div>
        <button class="btn primary big" data-act="next" style="margin-top:1rem">${nextLabel}</button>
      </section></div>`;
  }

  function viewEnd() {
    const pct = sim.max ? Math.round((sim.score / sim.max) * 100) : 0;
    const verdict = pct >= 85 ? 'Exam-ready on these cases. Keep the numbers fresh.' : pct >= 65 ? 'A pass, but the "what else?" follow-ups would cost you. Go through the wrong and partly right ones below.' : 'Not there yet. Work through the wrong and partly right ones below and the Fact check page, then go again.';
    const groups = { wrong: [], part: [], right: [] };
    sim.results.forEach((r) => { groups[r.points >= PTS ? 'right' : r.points > 0 ? 'part' : 'wrong'].push(r); });
    const redo = groups.wrong.length + groups.part.length;
    const item = (r, res) => {
      const st = r.c.steps[r.s];
      return `<details class="qitem ${res}"><summary><div><div class="qtext">${esc(st.q)}</div>
        <div class="qmeta">${resPill(res)}${topicPill(st.topic)}<span class="pill">${esc(r.c.title)} · ${esc(st.phase)}</span></div></div><span class="muted" aria-hidden="true">▾</span></summary>
        <div class="body">${correctAnswerHTML(st)}<div class="model"><p class="label">Model answer</p>${st.model}</div></div></details>`;
    };
    const group = (res, intro) => (groups[res].length ? `<section class="stack end-group">
      <h2 style="font-size:1.1rem;margin:0">${resPill(res)} ${groups[res].length} question${groups[res].length === 1 ? '' : 's'}</h2>
      <p class="muted" style="margin:0;font-size:.9rem">${intro}</p>
      ${groups[res].map((r) => item(r, res)).join('')}</section>` : '');
    const byCase = [];
    if (sim.kind === 'cases') sim.results.forEach((r) => {
      let row = byCase.find((x) => x.c === r.c);
      if (!row) { row = { c: r.c, got: 0, max: 0 }; byCase.push(row); }
      row.got += r.points; row.max += PTS;
    });
    return `<section class="card stack" style="max-width:46rem;margin:1rem auto">
      <p class="label">Session complete</p>
      <div class="row" style="align-items:baseline"><span class="big-score">${sim.score}</span><span class="muted mono" style="font-size:1.4rem">/ ${sim.max} · ${pct}%</span></div>
      ${resBar(tally(sim.results.map((r) => (r.points >= PTS ? 'right' : r.points > 0 ? 'part' : 'wrong'))), sim.results.length)}
      <div class="says"><span class="who">${esc(EXAMINER)}</span><p>${esc(verdict)}</p></div>
      ${byCase.length ? `<div>${byCase.map((r) => `<div class="result-row"><b>${esc(r.c.title)}</b><span class="mono">${r.got}/${r.max}</span></div>`).join('')}</div>` : ''}
      <div class="row">${redo ? `<button class="btn primary" data-act="redo">Redo the ${redo} that need${redo === 1 ? 's' : ''} work</button>` : ''}<button class="btn${redo ? '' : ' primary'}" data-act="restart">Back to setup</button></div>
      ${group('wrong', 'Read the model answer, then say it back out loud before you redo these.')}
      ${group('part', 'You had some of it. Check what the model answer adds: usually the "what else?" or the numbers.')}
      ${groups.right.length ? `<details class="end-right"><summary>${resPill('right')} ${groups.right.length} question${groups.right.length === 1 ? '' : 's'} right <span class="muted">(show)</span></summary>
        <div class="stack" style="margin-top:.8rem">${groups.right.map((r) => item(r, 'right')).join('')}</div></details>` : ''}
    </section>`;
  }

  // ------------------------------------------------------------------ question bank
  const bank = { topic: 'all', status: 'all', q: '', open: new Set() };
  function bankItems() {
    const items = [];
    CASES.forEach((c) => c.steps.forEach((s, i) => items.push({
      key: stepKey(c, i), topic: s.topic, q: s.q, model: s.model, source: `${c.source} · ${c.title}`, step: s,
    })));
    THEORY.forEach((t, i) => items.push({ key: `theory#${i}`, topic: t.topic, q: t.q, model: t.model, source: t.source }));
    return items;
  }
  const bankStatus = (it) => resultOf(it.key);
  const BANK_FILTERS = [['all', 'All questions'], ['review', 'Needs work (wrong + partly right)'], ['wrong', 'Wrong'], ['part', 'Partly right'], ['right', 'Right'], ['new', 'Not tried']];
  const bankPasses = (st, f) => f === 'all' || (f === 'review' ? needsWork(st) : f === 'new' ? !st : st === f);
  function wrongOptionsHTML(st) {
    if (!st.why) return '';
    const items = Object.keys(st.why).map((oi) => `<li><span class="muted">${esc(st.options[oi])}</span>${whyNote(st, oi)}</li>`).join('');
    return `<div><p class="label">Why the other options are wrong</p><ul class="answer-list wrong-list">${items}</ul></div>`;
  }

  function correctAnswerHTML(st) {
    if (!st) return '';
    if (st.type === 'mcq') return `<div><p class="label">Best answer</p><p>${esc(st.options[st.answer])}</p></div>${wrongOptionsHTML(st)}`;
    if (st.type === 'multi') return `<div><p class="label">Correct selections</p><ul class="answer-list">${st.answers.map((a) => `<li>${esc(st.options[a])}</li>`).join('')}</ul></div>${wrongOptionsHTML(st)}`;
    if (st.type === 'match') return `<div class="tablewrap"><table class="t">${st.rows.map((r) => `<tr><td><b>${esc(r.label)}</b></td><td>${esc(r.options[r.answer])}</td></tr>`).join('')}</table></div>`;
    if (st.type === 'rx') return `<div><p class="label">Accepted CL Rx</p><div class="pad">${['R', 'L'].map((e) => `<div><span class="eye">${e}</span>${st.accept[e].sph.map((x) => D(x)).join(' or ')}${st.accept[e].axis.length ? ` / ${st.accept[e].cyl.map((x) => D(x)).join(' or ')} × ${st.accept[e].axis.join(' or ')}` : ' DS'}</div>`).join('')}</div></div>`;
    return '';
  }
  function renderBank() {
    const all = bankItems();
    const ql = bank.q.trim().toLowerCase();
    const list = all.filter((it) => (bank.topic === 'all' || it.topic === bank.topic)
      && bankPasses(bankStatus(it), bank.status)
      && (!ql || (it.q + ' ' + it.model + ' ' + it.source).toLowerCase().includes(ql)));
    const counts = {};
    all.forEach((it) => { counts[it.topic] = (counts[it.topic] || 0) + 1; });
    const inTopic = all.filter((it) => bank.topic === 'all' || it.topic === bank.topic).map(bankStatus);
    view.innerHTML = `<div class="fade">
      <section class="hero"><div><p class="label">Question bank</p><h1>Every question, sorted by topic</h1>
      <p>${all.length} questions: each examiner step from the oral cases plus the past-paper theory questions. Open one, answer it out loud, then check the model answer and mark how you did. Simulator and Ocumon answers are marked for you.</p></div></section>
      <div class="toolbar">
        <input type="search" id="bank-q" placeholder="Search (e.g. Aldox, LARS, bitoric)" value="${esc(bank.q)}" aria-label="Search questions">
        <select id="bank-status" aria-label="Filter by status" style="width:auto">
          ${BANK_FILTERS.map(([v, l]) => `<option value="${v}" ${bank.status === v ? 'selected' : ''}>${l} · ${inTopic.filter((r) => bankPasses(r, v)).length}</option>`).join('')}
        </select>
      </div>
      <div class="row" style="gap:.4rem;margin-bottom:1rem">
        <button class="chip" data-act="bank-topic" data-v="all" aria-pressed="${bank.topic === 'all'}">All topics · ${all.length}</button>
        ${Object.entries(TOPICS).map(([id, n]) => `<button class="chip" data-act="bank-topic" data-v="${id}" aria-pressed="${bank.topic === id}">${esc(n)} · ${counts[id] || 0}</button>`).join('')}
      </div>
      ${resBar(tally(inTopic), inTopic.length)}<div class="rcs" style="margin:.4rem 0 .6rem">${resCounts(tally(inTopic))}</div>
      <p class="muted" style="font-size:.9rem">${list.length} shown</p>
      <div class="stack" id="bank-list">${list.map((it) => {
        const stt = bankStatus(it);
        return `<details class="qitem ${stt}" data-key="${esc(it.key)}" ${bank.open.has(it.key) ? 'open' : ''}>
          <summary><div><div class="qtext">${esc(it.q)}</div><div class="qmeta">${topicPill(it.topic)}<span class="pill">${esc(it.source)}</span>${resPill(stt)}</div></div><span class="muted" aria-hidden="true">▾</span></summary>
          <div class="body">${correctAnswerHTML(it.step)}<div class="model"><p class="label">Model answer</p>${it.model}</div>
          <div><p class="label">How did you do?</p><div class="row"><button class="btn" data-act="bank-mark" data-v="10" data-key="${esc(it.key)}" aria-pressed="${stt === 'right'}">Right</button><button class="btn" data-act="bank-mark" data-v="5" data-key="${esc(it.key)}" aria-pressed="${stt === 'part'}">Partly right</button><button class="btn" data-act="bank-mark" data-v="0" data-key="${esc(it.key)}" aria-pressed="${stt === 'wrong'}">Wrong</button></div></div></div>
        </details>`;
      }).join('') || '<p class="muted">No questions match these filters.</p>'}</div></div>`;
  }

  // ------------------------------------------------------------------ Rx lab
  const lab = { drill: null, drillRes: null, typed: {} };
  function convert(s, c, a, d) {
    const m1 = vtx(s, d / 1000), m2 = vtx(s + c, d / 1000);
    return { m1, m2, sph: m1, cyl: m2 - m1, axis: a };
  }
  function roundAxis(a, eye, step) {
    if (step <= 1 || a % step === 0) return { axis: normAxis(a), note: 'Axis is made; no change.' };
    const down = Math.floor(a / step) * step, up = down + step;
    const pick = eye === 'R' ? down : up;
    return { axis: normAxis(pick), note: `${a} isn't made in ${step}° steps. ${eye === 'R' ? 'RE nasal rotation swings the lens to your right → subtract' : 'LE nasal rotation swings the lens to your left → add'} → ${normAxis(pick)}.` };
  }
  function orderable(x) {
    const step = Math.abs(x) > 6.0001 ? 0.5 : 0.25;
    return Math.round(x / step) * step;
  }
  function renderLab() {
    view.innerHTML = `<div class="fade">
    <section class="hero"><div><p class="label">Rx lab</p><h1>Vertex, round, rotate</h1>
    <p>Practise the mental maths the examiner asks for: both meridians to the corneal plane, snap to a lens you can order, nasal torque, LARS and the spherical-equivalent compromise.</p>
    <button class="btn" data-act="to-guide" style="margin-top:.8rem">How to convert a spectacle Rx, step by step ↓</button></div></section>
    <div class="lab-grid">
      <section class="card stack hue-top" style="--h:225">
        <h2 style="font-size:1.15rem">Calculator</h2>
        <div class="inputs-4" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          <div class="field"><label for="c-s">Sphere</label>${signed('<input type="text" id="c-s" value="+4.00" inputmode="decimal">', 'c-s')}</div>
          <div class="field"><label for="c-c">Cyl</label>${signed('<input type="text" id="c-c" value="-3.00" inputmode="decimal">', 'c-c')}</div>
          <div class="field"><label for="c-a">Axis</label><input type="text" id="c-a" value="135" inputmode="numeric"></div>
          <div class="field"><label for="c-d">BVD (mm)</label><input type="text" id="c-d" value="12" inputmode="numeric"></div>
        </div>
        <div class="inputs-4" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          <div class="field"><label for="c-e">Eye</label><select id="c-e"><option value="R">Right</option><option value="L">Left</option></select></div>
          <div class="field"><label for="c-step">Axis steps</label><select id="c-step"><option value="10">10° (most torics)</option><option value="5">5° (Biofinity XR / toric MF)</option><option value="1">1° (RGP lab)</option></select></div>
          <div class="field" style="grid-column:1 / -1"><label for="c-max">Max cyl in chosen lens</label><select id="c-max"><option value="0">No limit</option><option value="-2.25" selected>−2.25 (most daily torics)</option><option value="-2.75">−2.75</option><option value="-5.75">−5.75 (Biofinity XR)</option></select></div>
        </div>
        <div id="calc-out"></div>
      </section>
      <section class="card stack hue-top" style="--h:170">
        <h2 style="font-size:1.15rem">Drill: convert this Rx</h2>
        <p class="muted" style="margin:0">Round sphere and cyl to 0.25 D (0.50 D beyond ±6.00), axes to 10° steps using nasal torque.</p>
        <div id="drill"></div>
      </section>
      <section class="card stack hue-top" style="--h:275">
        <h2 style="font-size:1.15rem">LARS helper</h2>
        <div class="inputs-4">
          <div class="field"><label for="l-a">Ordered axis</label><input type="text" id="l-a" value="130" inputmode="numeric"></div>
          <div class="field" style="grid-column:span 3"><label for="l-p">Mark sits at (as you look at the patient)</label>
            <select id="l-p">${[4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8].map((p) => `<option value="${p}" ${p === 5 ? 'selected' : ''}>${Math.floor(p)}:${p % 1 ? '30' : '00'} o'clock${p < 6 ? ' (your right)' : p > 6 ? ' (your left)' : ''}</option>`).join('')}</select></div>
        </div>
        <div id="lars-out"></div>
        <p class="muted" style="font-size:.9rem;margin:0">Only for a lens that sits STABLY off-axis. A rocking lens needs a different design, not LARS. Each clock hour is 30°.</p>
      </section>
    </div>
    ${guideHTML()}</div>`;
    restoreFields();
    calc(); lars();
    if (lab.drill) drawDrill(); else newDrill();
  }

  /* Step-by-step conversion guide under the Rx lab tools. The worked example and the
     quick-reference table are computed with the same functions the calculator uses. */
  function guideHTML() {
    const ex = convert(4, -3, 135, 12);
    const exSph = orderable(ex.sph), exCyl = q25(ex.cyl);
    const exAx = roundAxis(135, 'R', 10).axis;
    const seSph = orderable(exSph + (exCyl + 2.25) / 2);
    const powers = [4, 5, 6, 7, 8, 9, 10, 12];
    const refRows = powers.map((p) => `<tr><td class="mono">±${p.toFixed(2)}</td>
      <td class="mono">${D(-p)} → <b>${D(orderable(vtx(-p)))}</b> <span class="muted">(${vtx(-p).toFixed(2)})</span></td>
      <td class="mono">${D(p)} → <b>${D(orderable(vtx(p)))}</b> <span class="muted">(${vtx(p).toFixed(2)})</span></td></tr>`).join('');
    return `<section class="card guide hue-top" id="guide" style="--h:30;margin-top:1.5rem">
      <p class="label">Guide</p>
      <h2>Converting a spectacle Rx to a contact lens Rx</h2>
      <p class="muted">The examiner wants to see the method, not just the answer. Say each step out loud. Pen and paper are allowed; a calculator isn't.</p>
      <ol class="steps">
        <li><h3>Check it's in minus-cyl form</h3>
          <p>Soft torics are written in minus cyl. If the Rx is in plus cyl, transpose: add the cyl to the sphere, flip the cyl sign, and turn the axis 90°.</p>
          <p class="mono eg">+1.00 / +3.00 × 45 → +4.00 / −3.00 × 135</p></li>
        <li><h3>Decide if it needs vertexing</h3>
          <p>Vertex distance matters once either principal meridian is <b>±4.00 D or more</b>. Below that, the change is under 0.20 D and the spectacle powers carry straight over. Look at both meridians, not just the sphere: +1.00 / −4.00 has a −3.00 meridian, which still doesn't need it, while −3.50 / −1.00 has a −4.50 meridian, which does.</p></li>
        <li><h3>Split into the two principal meridians</h3>
          <p>Draw a power cross. One meridian carries the sphere power along the axis; the other, 90° away, carries sphere + cyl.</p>
          <p class="mono eg">+4.00 / −3.00 × 135 → +4.00 @ 135 and +1.00 @ 45</p></li>
        <li><h3>Vertex each meridian to the cornea</h3>
          <p>Use <span class="mono">F<sub>c</sub> = F / (1 − dF)</span> with d in metres (12 mm = 0.012). Do it for <b>both</b> meridians. Never vertex the sphere and copy the cyl across: the cyl changes too.</p>
          <p class="mono eg">+4.00 / (1 − 0.012 × 4.00) = ${ex.m1.toFixed(2)}<br>+1.00 / (1 − 0.012 × 1.00) = ${ex.m2.toFixed(2)}</p>
          <p class="muted">Quick check in your head: the change is about <span class="mono">F² × d</span> (4² × 0.012 ≈ 0.19). <b>Plus gets more plus, minus gets less minus.</b></p></li>
        <li><h3>Rebuild the sphero-cyl</h3>
          <p>Sphere = the vertexed power on the axis meridian. Cyl = the other vertexed meridian minus that one. The axis doesn't change.</p>
          <p class="mono eg">${ex.sph.toFixed(2)} / (${ex.m2.toFixed(2)} − ${ex.m1.toFixed(2)}) = ${ex.sph.toFixed(2)} / ${ex.cyl.toFixed(2)} × 135</p></li>
        <li><h3>Round to powers that are made</h3>
          <p>Sphere to the nearest 0.25 D (0.50 D steps beyond ±6.00 in most soft lenses). Cyl to a power the lens actually comes in: most soft torics only make −0.75, −1.25, −1.75 and −2.25, and extended-range lenses go on to −2.75, −3.25 and beyond. On a half-way value, lean towards the more positive power (less minus, more plus) and confirm with an over-refraction at the fit.</p>
          <p class="mono eg">${ex.sph.toFixed(2)} → ${D(exSph)}; ${ex.cyl.toFixed(2)} → ${D(exCyl)}</p></li>
        <li><h3>Round the axis with nasal torque</h3>
          <p>Most torics come in 10° steps (some in 5°). If the axis isn't made, round it the way the lens tends to rotate: lids drive it nasally. As you face the patient, a <b>right</b> lens swings to your right → round <b>down</b> (subtract); a <b>left</b> lens swings to your left → round <b>up</b> (add).</p>
          <p class="mono eg">RE × 135 → × ${exAx}</p></li>
        <li><h3>If the cyl is out of range, use the spherical equivalent</h3>
          <p>If the lens you've picked doesn't make that much cyl, drop the cyl to its maximum and add half of what you dropped to the sphere, so the spherical equivalent stays the same. Tell the examiner the trade-off: some residual astigmatism, or go to an extended-range toric or RGP instead.</p>
          <p class="mono eg">${D(exSph)} / ${D(exCyl)} with a −2.25 max: drop ${D(exCyl + 2.25)} → sphere ${D((exCyl + 2.25) / 2)} → ${D(seSph)} / −2.25 × ${exAx}</p></li>
        <li><h3>Write the final CL Rx</h3>
          <p class="mono eg"><b>RE ${D(exSph)} / ${D(exCyl)} × ${exAx}</b> (extended-range toric), or <b>${D(seSph)} / −2.25 × ${exAx}</b> in a standard daily toric</p></li>
        <li><h3>At the fit: LARS for a stable, rotated lens</h3>
          <p><b>L</b>eft <b>A</b>dd, <b>R</b>ight <b>S</b>ubtract, judged as you look at the patient. If the marker sits away from 6 o'clock but stays put on the blink, add or subtract the rotation from the ordered axis. Each clock hour is 30° (one minute mark is 6°). If it rocks, don't LARS: change the design or fit.</p></li>
      </ol>
      <div class="grid-2" style="gap:1rem">
        <div><p class="label">Quick reference at 12 mm (spherical powers)</p>
          <div class="tablewrap"><table class="t"><tr><th>Spectacle</th><th>Myope</th><th>Hyperope</th></tr>${refRows}</table></div>
          <p class="muted" style="font-size:.85rem;margin:0">Order value in bold (0.50 D steps past ±6.00), exact corneal-plane power in brackets.</p></div>
        <div class="stack" style="gap:.6rem">
          <div><p class="label">Common slips</p>
          <ul class="answer-list">
            <li>Vertexing only the sphere and copying the cyl across.</li>
            <li>Ordering a cyl that isn't made (−1.00, −1.50, −2.00 in most soft torics).</li>
            <li>Rounding the axis the wrong way for the eye.</li>
            <li>Adding the near add to the vertexed distance Rx for a multifocal. Vertex the distance Rx; the add goes on as the lens's own add (low/med/high).</li>
            <li>Forgetting that RGPs also need a tear-lens correction: steeper than K adds plus, so add minus to the lens (SAM-FAP, about 0.25 D per 0.05 mm).</li>
          </ul></div>
        </div>
      </div>
    </section>`;
  }
  function calc() {
    const s = parseNum(document.getElementById('c-s').value), c = parseNum(document.getElementById('c-c').value);
    const a = parseNum(document.getElementById('c-a').value), d = parseNum(document.getElementById('c-d').value) || 12;
    const eye = document.getElementById('c-e').value, step = Number(document.getElementById('c-step').value);
    const maxCyl = Number(document.getElementById('c-max').value);
    const out = document.getElementById('calc-out');
    if ([s, c, a].some(Number.isNaN)) { out.innerHTML = '<p class="no">Enter sphere, cyl (minus) and axis.</p>'; return; }
    const r = convert(s, c, a, d);
    const sph = orderable(r.sph), cyl = q25(r.cyl);
    const ax = roundAxis(normAxis(a), eye, step);
    let se = '';
    if (maxCyl && cyl < maxCyl - 1e-9) {
      const drop = cyl - maxCyl;
      const ns = orderable(sph + drop / 2);
      se = `<div class="model"><p class="label">Spherical-equivalent compromise (max ${D(maxCyl)})</p><p class="mono">${D(sph)} / ${D(cyl)} → drop ${D(drop)} DC → sphere ${D(drop / 2)} → <b>${D(ns)} / ${D(maxCyl)} × ${ax.axis}</b></p><p class="muted" style="margin:0">SE before ${(sph + cyl / 2).toFixed(3)}, after ${(ns + maxCyl / 2).toFixed(3)}.</p></div>`;
    }
    out.innerHTML = `<div class="tablewrap"><table class="t"><tr><th>Meridian</th><th>Spectacle</th><th>Cornea (exact)</th></tr>
      <tr><td class="mono">@${normAxis(a)}</td><td class="mono">${D(s)}</td><td class="mono">${r.m1.toFixed(3)}</td></tr>
      <tr><td class="mono">@${normAxis(a + 90)}</td><td class="mono">${D(s + c)}</td><td class="mono">${r.m2.toFixed(3)}</td></tr></table></div>
      <div class="pad"><div><span class="eye">Exact</span>${r.sph.toFixed(2)} / ${r.cyl.toFixed(2)} × ${normAxis(a)}</div><div><span class="eye">Order</span><b>${D(sph)} / ${D(cyl)} × ${ax.axis}</b></div></div>
      <p class="muted" style="font-size:.9rem;margin:0">${esc(ax.note)} Soft torics only make −0.75, −1.25, −1.75, −2.25 (then −2.75, −3.25… in XR), so snap the cyl to a made value.</p>
      ${se}<div class="crosses">${crossSVG([s, c, normAxis(a)], eye === 'R' ? 'Right eye' : 'Left eye')}</div>`;
  }
  function lars() {
    const a = parseNum(document.getElementById('l-a').value), p = Number(document.getElementById('l-p').value);
    const out = document.getElementById('lars-out');
    if (Number.isNaN(a)) { out.innerHTML = ''; return; }
    const delta = (p - 6) * 30;
    const na = normAxis(a + delta);
    out.innerHTML = `<div class="pad"><div><span class="eye">New</span><b>× ${na}</b> <span class="muted">(${delta === 0 ? 'on axis' : delta < 0 ? `swung right → subtract ${-delta}°` : `swung left → add ${delta}°`})</span></div></div>`;
  }
  function newDrill() {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const s = pick([-9, -8, -7, -6.5, -6, -5.5, -5, -4.5, -4, -3, -2, 1, 2, 3, 4, 4.5, 5, 5.5, 6, 6.5, 7]);
    const c = pick([-0.75, -1, -1.25, -1.5, -2, -2.5, -3, -4]);
    const eye = pick(['R', 'L']);
    const a = pick(range(36).map((i) => (i + 1) * 5));
    lab.drill = { s, c, a, eye }; lab.drillRes = null; lab.typed = {};
    drawDrill();
  }
  function drillAccepts(x, coarse) {
    const step = coarse && Math.abs(x) > 6 ? 0.5 : 0.25;
    const lo = Math.floor(x / step) * step, hi = lo + step;
    const near = Math.abs(x - lo) <= Math.abs(hi - x) ? lo : hi;
    const out = [near];
    if (Math.abs(Math.abs(x - lo) - Math.abs(hi - x)) < 0.06) out.push(near === lo ? hi : lo);
    return out;
  }
  function drawDrill() {
    const { s, c, a, eye } = lab.drill;
    const r = convert(s, c, a, 12);
    const want = { sph: drillAccepts(r.sph, true), cyl: drillAccepts(r.cyl, false), axis: [roundAxis(a, eye, 10).axis] };
    lab.drill.want = want;
    const res = lab.drillRes;
    document.getElementById('drill').innerHTML = `<div class="pad"><div><span class="eye">${eye}</span>${esc(rxStr([s, c, a]))}</div></div>
      <div class="rxgrid"><span></span><span class="label">Sphere</span><span class="label">Cyl</span><span class="label">Axis</span><span class="eye">${eye}</span>
      ${['sph', 'cyl', 'axis'].map((f) => { const inp = `<input type="text" id="d-${f}" inputmode="${f === 'axis' ? 'numeric' : 'decimal'}" autocomplete="off" aria-label="${f}" value="${esc(lab.typed[f] || '')}">`; return f === 'axis' ? inp : signed(inp, `d-${f}`); }).join('')}</div>
      <div class="row"><button class="btn primary" data-act="drill-check">Check</button><button class="btn" data-act="drill-new">New Rx</button></div>
      ${res ? `<div class="model"><p class="label">${res.all ? '<span class="ok">All correct</span>' : '<span class="no">Check the workings</span>'}</p>
        <p class="mono" style="margin:0">${D(s)} → ${r.m1.toFixed(2)}; ${D(s + c)} → ${r.m2.toFixed(2)}; cyl ${r.cyl.toFixed(2)}</p>
        <p class="mono">Order: ${want.sph.map((x) => D(x)).join(' or ')} / ${want.cyl.map((x) => D(x)).join(' or ')} × ${want.axis[0]}</p>
        <p class="muted" style="margin:0;font-size:.9rem">${esc(roundAxis(a, eye, 10).note)} Remember cyl powers like −1.00 or −1.50 aren't made in most soft torics: snap to −0.75/−1.25/−1.75.</p></div>` : ''}`;
  }
  function checkDrill() {
    const want = lab.drill.want;
    const res = { all: true };
    ['sph', 'cyl', 'axis'].forEach((f) => {
      const raw = document.getElementById(`d-${f}`).value, n = parseNum(raw);
      const ok = !Number.isNaN(n) && want[f].some((w) => (f === 'axis' ? normAxis(n) === w : Math.abs(n - w) < 1e-3));
      res[f] = { raw, ok }; if (!ok) res.all = false;
    });
    lab.drillRes = res; drawDrill();
  }

  // ------------------------------------------------------------------ lens guide
  const lensView = { modality: 'all', type: 'all', kind: 'soft', group: 'all' };
  try { if (localStorage.getItem(STORE_KEY + ':lenskind') === 'rigid') lensView.kind = 'rigid'; } catch (e) { /* ignore */ }
  const kindSwitch = () => `<div class="seg kind-switch" role="group" aria-label="Lens family">
      <button data-act="lens-kind" data-v="soft" aria-pressed="${lensView.kind === 'soft'}">Soft lenses<small>${LENSES.length} lenses · care</small></button>
      <button data-act="lens-kind" data-v="rigid" aria-pressed="${lensView.kind === 'rigid'}">Rigid lenses (RGP)<small>designs · fitting · materials</small></button></div>`;
  const careTable = (list) => `<div class="tablewrap"><table class="t"><tr><th>Product</th><th>Type</th><th>Actives</th><th>Soak</th><th>Notes</th></tr>
      ${list.map((s) => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.kind)}</td><td>${esc(s.actives)}</td><td class="mono">${esc(s.soak)}</td><td>${esc(s.notes)}</td></tr>`).join('')}</table></div>`;
  function renderLenses() {
    if (lensView.kind === 'rigid') { renderRigid(); return; }
    const mods = ['all', 'Daily', 'Two-weekly', 'Monthly'], types = ['all', 'Toric', 'Toric multifocal', 'Sphere'];
    const list = LENSES.filter((l) => (lensView.modality === 'all' || l.modality === lensView.modality) && (lensView.type === 'all' || l.type === lensView.type));
    const sphTxt = (l) => `${D(l.sph.max)} to ${D(l.sph.min)}${l.sph.fine ? ` (0.50 steps beyond ±${l.sph.fine.toFixed(2)})` : ''}`;
    view.innerHTML = `<div class="fade">
    <section class="hero"><div><p class="label">Lens guide · Australia</p><h1>Know the ranges before you are asked</h1>
    <p>Parameters for the lenses that come up in the orals, checked October 2026. <span class="pill warn">confirm</span> marks figures to double-check against the current Australian fitting guide.</p></div></section>
    ${kindSwitch()}
    <section class="card stack" style="margin-bottom:1.5rem">
      <h2 style="font-size:1.15rem">Will it fit? Enter the CL Rx (after vertexing)</h2>
      <div class="finder">${['R', 'L'].map((e) => `<div><p class="label">${e === 'R' ? 'Right' : 'Left'} eye</p><div class="inputs-4" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        <div class="field"><label for="f-${e}-s">Sphere</label><input type="text" id="f-${e}-s" value="${e === 'R' ? '+4.25' : '+6.50'}"></div>
        <div class="field"><label for="f-${e}-c">Cyl</label><input type="text" id="f-${e}-c" value="${e === 'R' ? '-3.25' : '-2.25'}"></div>
        <div class="field"><label for="f-${e}-a">Axis</label><input type="text" id="f-${e}-a" value="${e === 'R' ? '130' : '180'}"></div></div></div>`).join('')}</div>
      <div id="finder-out"></div>
    </section>
    <div class="row" style="gap:.4rem;margin-bottom:.6rem">${mods.map((m) => `<button class="chip" data-act="lens-mod" data-v="${m}" aria-pressed="${lensView.modality === m}">${m === 'all' ? 'All modalities' : m}</button>`).join('')}</div>
    <div class="row" style="gap:.4rem;margin-bottom:1rem">${types.map((t) => `<button class="chip" data-act="lens-type" data-v="${t}" aria-pressed="${lensView.type === t}">${t === 'all' ? 'All designs' : t}</button>`).join('')}</div>
    <div class="lens-grid">${list.map((l) => `<article class="card lens hue-top" style="--h:${MOD_HUE[l.modality] ?? 225}">
      <div class="row" style="gap:.35rem"><span class="pill tint">${esc(l.modality)}</span><span class="pill">${esc(l.type)}</span>${l.confirm ? '<span class="pill warn">confirm</span>' : ''}</div>
      <h3>${esc(l.name)}</h3>
      <dl><dt>Material</dt><dd>${esc(l.material)}</dd><dt>Water</dt><dd>${l.water}%</dd><dt>Dk/t</dt><dd>${l.dkt ?? '—'}</dd><dt>Modulus</dt><dd>${l.modulus ? l.modulus + ' MPa' : '—'}</dd>
      <dt>BC / Dia</dt><dd>${esc(l.bc)} / ${esc(l.dia)}</dd><dt>Sphere</dt><dd>${esc(sphTxt(l))}</dd>
      ${l.type !== 'Sphere' ? `<dt>Cyl</dt><dd>${l.cyl.map((x) => D(x)).join(', ')}</dd><dt>Axes</dt><dd>${l.axisStep}° steps</dd>` : ''}
      <dt>Stabilisation</dt><dd>${(() => { const d = typeof SOFT_STAB !== 'undefined' && SOFT_STAB.find((x) => x.match.test(l.stab)); return d ? `<button class="linkbtn" data-act="stab-go" data-v="${d.id}">${esc(l.stab)}</button>` : esc(l.stab); })()}</dd><dt>Overnight</dt><dd>${esc(l.ew)}</dd></dl>
      ${l.notes ? `<p class="muted" style="font-size:.9rem;margin:0">${esc(l.notes)}</p>` : ''}</article>`).join('')}</div>
    <section style="margin-top:2rem" class="stack"><h2>Toric stabilisation designs</h2>
      <p class="muted" style="margin:0">How each design keeps the cyl axis in place. Front views are shaded by relative thickness (darker = thicker) and sit between the lids; the profiles show thickness along the vertical and horizontal meridians. Schematic, not to scale.</p>
      <div class="lens-grid">${SOFT_STAB.map((d) => { const uses = LENSES.filter((l) => d.match.test(l.stab)).map((l) => l.name); return `<article class="card lens hue-top" id="stab-${d.id}" style="--h:195">
        <div class="row" style="gap:.35rem"><span class="pill tint">Soft toric</span>${d.confirm ? '<span class="pill warn">confirm</span>' : ''}</div>
        <h3>${esc(d.name)}</h3>
        ${typeof softStabFigure === 'function' ? softStabFigure(d.id, esc(d.name)) : ''}
        <dl><dt>How</dt><dd class="prose">${esc(d.how)}</dd><dt>Lids</dt><dd class="prose">${esc(d.lids)}</dd>${uses.length ? `<dt>In this guide</dt><dd class="prose">${uses.map(esc).join(', ')}</dd>` : ''}</dl>
        <p class="muted" style="font-size:.9rem;margin:0"><b>Watch for:</b> ${esc(d.watch)}</p></article>`; }).join('')}
        <article class="card lens hue-top" id="stab-lars" style="--h:195"><div class="row" style="gap:.35rem"><span class="pill tint">Soft toric</span></div>
        <h3>Reading rotation: LARS</h3>${typeof larsFigure === 'function' ? larsFigure() : ''}
        <p class="muted" style="font-size:.9rem;margin:0">Rotation is judged as you see it from in front. Mark to your left → add; to your right → subtract. Expect 5–10° nasal rotation with most designs. If the rotation isn't stable from blink to blink, change the lens or design rather than compensating.</p></article>
      </div></section>
    <section style="margin-top:2rem" class="stack"><h2>Soft lens care systems</h2>${careTable(SOLUTIONS.filter((x) => x.use !== 'rgp'))}
      <p class="muted" style="margin:0">RGP solutions and materials are under <button class="linkbtn" data-act="lens-kind" data-v="rigid">Rigid lenses</button>.</p></section>
    </div>`;
    restoreFields(); finder();
  }

  // Rigid lenses: starting-lens calculator, designs, fitting reference, materials and care.
  function renderRigid() {
    const groups = ['all', ...new Set(RGP_DESIGNS.map((d) => d.group))];
    const list = RGP_DESIGNS.filter((d) => lensView.group === 'all' || d.group === lensView.group);
    const GROUP_HUE = { Corneal: 275, Toric: 225, Specialty: 160 };
    const tbl = (head, rows) => `<div class="tablewrap"><table class="t"><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c, i) => `<td>${i ? esc(c) : `<b>${esc(c)}</b>`}</td>`).join('')}</tr>`).join('')}</table></div>`;
    const inp = (id, label, val) => `<div class="field"><label for="${id}">${label}</label><input type="text" id="${id}" value="${val}"></div>`;
    view.innerHTML = `<div class="fade">
    <section class="hero"><div><p class="label">Lens guide · Rigid lenses</p><h1>Pick the rigid design from the Ks and the Rx</h1>
    <p>Corneal cyl, residual cyl and the tear lens decide the design. Work out a starting lens, then check it against the designs, fluorescein patterns and materials below.</p></div></section>
    ${kindSwitch()}
    <section class="card stack" style="margin-bottom:1.5rem">
      <h2 style="font-size:1.15rem">Starting lens from the Ks and the spectacle Rx</h2>
      <div class="finder">
        <div><p class="label">Keratometry (D or mm)</p><div class="inputs-4" style="grid-template-columns:repeat(3,minmax(0,1fr))">
          ${inp('g-k1', 'K1', '42.50')}${inp('g-k1a', 'K1 meridian', '180')}${inp('g-k2', 'K2 (90° away)', '44.25')}</div></div>
        <div><p class="label">Spectacle Rx (12 mm)</p><div class="inputs-4" style="grid-template-columns:repeat(3,minmax(0,1fr))">
          ${inp('g-s', 'Sphere', '-4.50')}${inp('g-c', 'Cyl', '-2.00')}${inp('g-a', 'Axis', '180')}</div></div>
      </div>
      <div id="rgp-out"></div>
    </section>
    <section class="card stack" style="margin-bottom:1.5rem">
      <h2 style="font-size:1.15rem">Which design for which astigmatism?</h2>
      ${tbl(['Design', 'Corneal cyl', 'Refractive cyl', 'Why'], RGP_FIT.astig)}
      <p class="muted" style="margin:0;font-size:.9rem">Induced astigmatism of a back-surface toric ≈ 0.5 × ΔK of the back surface (in dioptres of back-surface toricity). Residual cyl = refractive cyl at the cornea − corneal cyl.</p>
    </section>
    <h2>Designs</h2>
    <div class="row" style="gap:.4rem;margin:.6rem 0 1rem">${groups.map((g) => `<button class="chip" data-act="rgp-group" data-v="${g}" aria-pressed="${lensView.group === g}">${g === 'all' ? 'All designs' : g}</button>`).join('')}</div>
    <div class="lens-grid">${list.map((d) => `<article class="card lens hue-top" style="--h:${GROUP_HUE[d.group] ?? 275}">
      <div class="row" style="gap:.35rem"><span class="pill tint">${esc(d.group)}</span>${d.confirm ? '<span class="pill warn">confirm</span>' : ''}</div>
      <h3>${esc(d.name)}</h3>
      ${typeof rgpFigure === 'function' ? rgpFigure(d.fig, esc(d.name)) : ''}
      <dl><dt>When</dt><dd class="prose">${esc(d.when)}</dd><dt>Fitting</dt><dd class="prose">${esc(d.fit)}</dd><dt>Stability</dt><dd class="prose">${esc(d.stab)}</dd></dl>
      <p class="muted" style="font-size:.9rem;margin:0"><b>Watch for:</b> ${esc(d.watch)}</p></article>`).join('')}</div>
    <h2 style="margin-top:2rem">Fitting reference</h2>
    <div class="lab-grid" style="margin-top:.8rem">
      <section class="card stack"><h3>Starting parameters</h3>${tbl(['Parameter', 'Rule of thumb'], RGP_FIT.start)}</section>
      <section class="card stack"><h3>Spherical RGP: BOZR by corneal toricity</h3>${tbl(['Corneal cyl', 'BOZR'], RGP_FIT.bozr)}
        <p class="muted" style="margin:0;font-size:.9rem">The fit guide from the past paper (its worked example uses it). Other notes give 0.50 D steeper for 1–2 D, or ⅓ΔK. All land within 0.25 D, so just name the rule you use.</p></section>
      <section class="card stack"><h3>Bitoric / BST: Mandell–Moore</h3>${tbl(['Corneal cyl', 'Flat meridian', 'Steep meridian'], RGP_FIT.mandell)}
        <p class="muted" style="margin:0;font-size:.9rem">Each BOZR is relative to its own K. Round the toricity to the nearest row (2.75 D → 3.00 D row). Induced cyl ≈ 0.5 × the lens's back toricity.</p></section>
      <section class="card stack"><h3>Tighten or loosen</h3>${tbl(['Change', 'Tighten', 'Loosen'], RGP_FIT.adjust)}
        <p class="muted" style="margin:0;font-size:.9rem">Typical steps: BOZR 0.05 mm, TD/BOZD 0.2–0.5 mm.</p></section>
      <section class="card stack"><h3>Optics to say out loud</h3>${tbl(['Rule', ''], RGP_FIT.rules)}</section>
    </div>
    <section class="card stack" style="margin-top:1rem"><h3>Fluorescein patterns</h3>${tbl(['Pattern', 'What you see', 'What to do'], RGP_FIT.patterns)}
      <p class="muted" style="margin:0;font-size:.9rem">Cobalt blue with a Wratten filter, after the lens has settled and is centred. Judge the fit dynamically first (centration, movement 1–2 mm with the blink, lid attachment), then statically.</p></section>
    <section style="margin-top:2rem" class="stack"><h2>RGP materials</h2>${tbl(['Material', 'Family', 'Dk', 'Notes'], RGP_MATERIALS.map((m) => [m.name, m.family, m.dk, m.notes]))}</section>
    <section style="margin-top:2rem" class="stack"><h2>RGP care systems</h2>${careTable(SOLUTIONS.filter((x) => x.use !== 'soft'))}</section>
    </div>`;
    restoreFields(); rgpCalc();
  }

  /* Starting RGP from Ks + spectacle Rx. Residual cyl uses power vectors so oblique cases work. */
  const rad = (deg) => (deg * Math.PI) / 180;
  const toVec = (c, a) => [(-c / 2) * Math.cos(2 * rad(a)), (-c / 2) * Math.sin(2 * rad(a))];
  const fromVec = ([j0, j45]) => [-2 * Math.hypot(j0, j45), normAxis((Math.atan2(j45, j0) * 180) / Math.PI / 2)];
  const axisGap = (a, b) => { const d = Math.abs(normAxis(a) - normAxis(b)) % 180; return Math.min(d, 180 - d); };
  function rgpCalc() {
    const out = document.getElementById('rgp-out');
    if (!out) return;
    const g = (id) => parseNum(document.getElementById(id).value);
    let k1 = g('g-k1'), k2 = g('g-k2'), k1a = g('g-k1a'), s = g('g-s'), c = g('g-c'), a = g('g-a');
    if ([k1, k2, s].some(Number.isNaN) || k1 <= 0 || k2 <= 0) { out.innerHTML = '<p class="no">Enter both Ks and a sphere.</p>'; return; }
    if (Number.isNaN(k1a)) k1a = 180;
    if (Number.isNaN(c)) c = 0;
    if (Number.isNaN(a)) a = 180;
    if (c > 0) { s += c; c = -c; a += 90; }
    a = normAxis(a);
    const toD = (k) => (k < 20 ? 337.5 / k : k);
    let kf = toD(k1), ks = toD(k2), F = normAxis(k1a);
    if (kf > ks) { [kf, ks] = [ks, kf]; F = normAxis(F + 90); }
    const dK = ks - kf;
    // Ocular (corneal-plane) Rx, then power in any meridian.
    const so = vtx(s), oc = vtx(s + c) - so;
    const pm = (m) => so + oc * Math.sin(rad(m - a)) ** 2;
    const [resC, resA] = fromVec(toVec(oc, a).map((x, i) => x - toVec(-dK, F)[i]));
    const resMag = Math.abs(resC);
    const kind = dK < 0.25 ? 'spherical' : axisGap(F, 180) <= 30 ? 'WTR' : axisGap(F, 90) <= 30 ? 'ATR' : 'oblique';
    const mm = (d) => Math.round((337.5 / d) * 100) / 100;
    const notes = [];
    let design, rows;
    const row = (label, k, bozrD) => {
      const r = mm(bozrD), tear = 337.5 / r - k;
      const m = label === 'flat' ? F : normAxis(F + 90);
      return { label: `${label === 'flat' ? 'Flat' : 'Steep'} (${m}°)`, k, r, tear, bvp: q25(pm(m) - tear) };
    };
    if (dK < 2 - 1e-6) {
      // Past-paper fit guide: on flat K to 1.00 D, then a quarter of the toricity, rounded to 0.25 D.
      const adj = dK <= 1 + 1e-6 ? 0 : q25(dK / 4);
      design = 'Spherical RGP';
      const r = row('flat', kf, kf + adj);
      rows = [{ ...r, label: 'Spherical lens' }];
      notes.push(adj ? `BOZR = flat K + ¼ΔK (${dK.toFixed(2)} / 4 → ${adj.toFixed(2)} D steeper) → plus tear lens, so add minus (SAM).` : 'BOZR on flat K: no tear-lens power to correct for.');
      if (resMag >= 0.75) notes.push(`A spherical RGP leaves ${D(resC)} × ${resA} residual cyl. Consider a front-surface toric RGP (prism ballast) or a soft toric.`);
      else if (resMag >= 0.5) notes.push(`Small residual cyl (${D(resC)} × ${resA}); usually acceptable, but check the VA and over-refraction.`);
      if (kind === 'ATR' && dK >= 1) notes.push('ATR cornea: spherical RGPs tend to decentre laterally. A soft toric may be the easier fit.');
    } else {
      // Mandell–Moore, toricity rounded to the nearest 0.50 D row (2.00–5.00 D).
      const MM = { 2: [0, 0.5], 2.5: [0.25, 0.5], 3: [0.25, 0.75], 3.5: [0.25, 0.75], 4: [0.25, 1], 4.5: [0.25, 1], 5: [0.25, 1.25] };
      const mmRow = Math.min(5, Math.max(2, Math.round(dK * 2) / 2));
      const [ff, fac] = MM[mmRow];
      const flat = row('flat', kf, kf - ff), steep = row('steep', ks, ks - fac);
      rows = [flat, steep];
      const backTor = 337.5 / steep.r - 337.5 / flat.r, induced = 0.5 * backTor;
      if (resMag < 0.5) { design = 'SPE bitoric'; notes.push('Refractive cyl ≈ corneal cyl, so no residual: the front cyl only corrects the induced cyl and rotation doesn\'t matter.'); }
      else if (axisGap(resA, F) <= 20 && Math.abs(resMag - induced) <= 0.5) { design = 'Back-surface toric'; steep.bvp = null; notes.push('BST: order ONE BVP, the flat meridian\'s (SAM-FAP on the flat K). The induced cyl takes care of the rest.'); notes.push(`Residual ${D(resC)} × ${resA} ≈ induced cyl (0.5 × ${backTor.toFixed(2)} D back toricity ≈ ${induced.toFixed(2)} D), so a spherical front works.`); }
      else { design = 'CPE bitoric'; notes.push(`Residual ${D(resC)} × ${resA} doesn't match the induced cyl (≈ ${induced.toFixed(2)} D), so the front cyl corrects both. Relies on the toric back staying locked: check rotation.`); }
      notes.push(`Mandell–Moore (${mmRow.toFixed(2)} D row for ${dK.toFixed(2)} D): flat meridian ${ff ? `${ff.toFixed(2)} D flatter than K` : 'on K'}, steep meridian ${fac.toFixed(2)} D flatter.${steep.bvp === null ? '' : ' Bitoric: give the BVP in each meridian (SAM-FAP each one); the lab works out the front surface.'}`);
    }
    if (axisGap(a, F) > 20 && axisGap(a, F) < 70 && Math.abs(oc) >= 0.5 && dK >= 0.5) notes.push('The refractive cyl is oblique to the corneal cyl, so the residual is oblique too. Over-refract carefully.');
    out.innerHTML = `<div class="stack" style="gap:.6rem">
      <div class="row" style="gap:.4rem"><span class="pill accent">${esc(design)}</span><span class="pill">${kind === 'spherical' ? 'Spherical cornea' : `${kind} corneal cyl`}</span></div>
      <dl class="rgp-sum"><dt>Corneal cyl</dt><dd>${dK < 0.005 ? 'none' : `${D(-dK)} × ${F}`} <span class="muted">(${kf.toFixed(2)} @${F} / ${ks.toFixed(2)} @${normAxis(F + 90)})</span></dd>
        <dt>Ocular Rx</dt><dd>${D(so)}${Math.abs(oc) >= 0.005 ? ` / ${D(oc)} × ${a}` : ' DS'}</dd>
        <dt>Residual cyl</dt><dd>${resMag < 0.005 ? 'none' : `${D(resC)} × ${resA}`}</dd></dl>
      <div class="tablewrap"><table class="t"><tr><th>Meridian</th><th>K</th><th>BOZR</th><th>Tear lens</th><th>BVP</th></tr>
        ${rows.map((r) => `<tr><td>${esc(r.label)}</td><td class="mono">${r.k.toFixed(2)} D</td><td class="mono"><b>${r.r.toFixed(2)} mm</b> <span class="muted">(${(337.5 / r.r).toFixed(2)} D)</span></td><td class="mono">${D(Math.round(r.tear * 100) / 100, false)}</td><td class="mono"><b>${r.bvp === null ? '—' : D(r.bvp)}</b></td></tr>`).join('')}</table></div>
      <ul class="answer-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
      <p class="muted" style="font-size:.85rem;margin:0">A trial lens to start from, not a final order. Confirm with fluorescein and an over-refraction; TD and BOZD come from the HVID and pupil (see the fitting reference).</p></div>`;
  }
  function finder() {
    const out = document.getElementById('finder-out');
    if (!out) return;
    const eyes = ['R', 'L'].map((e) => ({ e, s: parseNum(document.getElementById(`f-${e}-s`).value), c: parseNum(document.getElementById(`f-${e}-c`).value) || 0, a: parseNum(document.getElementById(`f-${e}-a`).value) || 180 }));
    if (eyes.some((x) => Number.isNaN(x.s))) { out.innerHTML = '<p class="no">Enter a sphere for each eye.</p>'; return; }
    const relevant = LENSES.filter((l) => (eyes.some((x) => x.c !== 0) ? l.type !== 'Sphere' : l.type === 'Sphere'));
    out.innerHTML = `<div class="fit-list">${relevant.map((l) => {
      const r = eyes.map((x) => lensCovers(l, x.s, x.c, normAxis(x.a)));
      const both = r.every((x) => x.ok);
      return `<div class="fit-row"><div><b>${esc(l.name)}</b>${r.map((x, i) => (x.ok ? '' : `<small>${eyes[i].e}: ${esc(x.reason)}</small>`)).join('')}</div>
        <span class="pill ${r[0].ok ? 'good' : 'bad'}">R ${r[0].ok ? '✓' : '✕'}</span><span class="pill ${r[1].ok ? 'good' : 'bad'}">L ${r[1].ok ? '✓' : '✕'}</span></div>`;
    }).join('')}</div><p class="muted" style="font-size:.85rem;margin-top:.5rem">Simplified rules from published ranges. Always confirm with the manufacturer's current guide before ordering.</p>`;
  }

  // ------------------------------------------------------------------ fact check
  function renderFacts() {
    const cls = (v) => (/wrong|unsafe|not made/i.test(v) ? 'bad' : /fine/i.test(v) ? 'good' : 'warn');
    view.innerHTML = `<div class="fade">
    <section class="hero"><div><p class="label">Fact check</p><h1>What the student notes got wrong</h1>
    <p>The 2022, 2025 and 2026 notes are student recollections and answers, written under pressure. These are the claims that needed correcting or updating. The case answer keys already use the corrected versions.</p></div></section>
    <div class="stack">${FACTCHECK.map((f) => `<article class="card fc"><div class="row" style="gap:.5rem"><span class="pill ${cls(f.verdict)}">${esc(f.verdict)}</span></div>
      <p class="claim">"${esc(f.claim)}"</p><p style="margin:0">${esc(f.fix)}</p></article>`).join('')}</div>
    <section class="card stack" style="margin-top:2rem"><h2 style="font-size:1.15rem">Sources checked</h2>
      <ul>${SOURCES.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('')}</ul>
      <p class="muted" style="margin:0">Several manufacturer pages for Australia couldn't be reached directly, so some ranges come from the manufacturers' global pages and Australian retailer notices. Those are flagged "confirm" in the lens guide.</p></section>
    </div>`;
  }

  // ------------------------------------------------------------------ Ocumon: raise partners by catching CL conditions
  // Ported from the Ocumon mode on the companion Thera Orals site (itself inspired by the Anki add-on Ankimon).
  // - Its own mode: only fights on this tab count. A fight is one whole case, start to finish, and the case is the
  //   boss: the catch is decided when the case ends, and only if you got MON_NEED of it right. Partner bonuses
  //   (favourite topics, rank, fixing a missed question) add XP, never damage, so they can't make a catch easier.
  //   Fight answers still update the missed list the simulator and question bank use.
  // - Rewards accuracy, not volume: a right answer hits the wild creature, a wrong one hurts your partner. A
  //   question you already got right today earns no XP, and XP slows to a quarter after MON_DAILY_XP in a day.
  // - Can't break the page: the save is checked on load (bad values fall back to defaults), the art is local
  //   (pixel sprites in img/sprites, emoji for the wild creatures), and nothing is fetched from elsewhere.
  const isMap = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const topbar = document.querySelector('.topbar');
  const MON = window.OCUMON || { partners: [], wild: [] };
  const MON_MAX_LV = 40, MON_RANK = [8, 18], MON_UNLOCK = 2, MON_REPEATS = 3, MON_DAILY_XP = 400, MON_LOG = 8, MON_RECENT = 6;
  const TIER_HP = [0, 40, 70, 110];
  const TIER_LV = [0, 10, 25, 40]; // shown as the wild creature's level: more HP and more XP
  const TIER_NAME = ['', 'Common', 'Uncommon', 'Rare'];
  const TIER_SPAWN = [0, 1, 0.6, 0.3]; // commons, the themes asked most in the orals, turn up most
  const MON_NEED = [0, 0.8, 0.85, 0.9]; // share of its case you need right, by the end of it, to catch it, by level
  const MON_PAIRS = 4; // most rows a matching question asks in a fight
  const STEP_PASS = PTS; // as in the simulator: anything under full marks goes on the missed list
  const TOPIC_SHORT = { history: 'history', rx: 'Rx conversion', lenschoice: 'lens choice', materials: 'materials', fitting: 'fit assessment', rgp: 'RGPs', presbyopia: 'presbyopia', ew: 'extended wear', lifestyle: 'water, sport and travel', care: 'care systems', complications: 'complications', specialty: 'specialty lenses' };
  const wildLv = (w) => `Lv${TIER_LV[w.tier]}`;
  const monMaxHp = (lv) => 40 + 4 * lv;
  const xpNeed = (lv) => 40 + 20 * lv;
  const wildById = (id) => MON.wild.find((w) => w.id === id);
  const partnerById = (id) => MON.partners.find((p) => p.id === id);
  const caseById = (id) => CASES.find((c) => c.id === id);
  const rankOf = (lv) => (lv >= MON_RANK[1] ? 2 : lv >= MON_RANK[0] ? 1 : 0); // ★ at Lv 8, ★★ at Lv 18
  const companion = (m = mon()) => { const p = partnerById(m.active); return p && Object.assign({}, p, { rank: rankOf(m.level) }); };
  const wildRe = {};
  const inPool = (w, c) => (wildRe[w.id] = wildRe[w.id] || new RegExp(w.match, 'i')).test(`${c.title} ${c.theme || ''}`);
  // Rarity follows the exam: common when 3 or more cases from the 2022, 2025 and 2026 orals match the creature,
  // uncommon for 1 or 2, and rare when only the notes, practice doc and slides cover it.
  MON.wild.forEach((w) => {
    w.asked = CASES.filter((c) => inPool(w, c) && /^20\d\d/.test(c.source)).length;
    w.tier = w.tier || (w.asked >= 3 ? 1 : w.asked ? 2 : 3);
  });
  const askedLine = (w) => (w.asked ? `In ${w.asked} case${w.asked === 1 ? '' : 's'} from the 2022, 2025 and 2026 orals` : 'Only in the notes, practice doc and slides so far');
  let hunt = null, lastCat = null;

  // The partner sent out when the one in battle faints: the highest level of those still standing.
  const healthiest = (party, not) => Object.keys(party).filter((id) => id !== not && party[id].hp > 0).sort((a, b) => party[b].level - party[a].level)[0];
  // Keeps only values that make sense, so an old, damaged or edited save can never stop the page loading.
  function cleanMon(o) {
    o = isMap(o) ? o : {};
    const num = (v, lo, hi, d) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);
    const party = {};
    if (isMap(o.party)) Object.keys(o.party).forEach((id) => {
      const v = o.party[id];
      if (!partnerById(id) || !isMap(v)) return;
      const lv = num(v.level, 1, MON_MAX_LV, 1);
      party[id] = { level: lv, xp: num(v.xp, 0, xpNeed(lv) - 1, 0), hp: num(v.hp, 0, monMaxHp(lv), monMaxHp(lv)) };
    });
    const dex = {};
    if (isMap(o.dex)) Object.keys(o.dex).forEach((id) => { const d = o.dex[id]; if (wildById(id) && isMap(d)) dex[id] = Object.assign({ n: num(d.n, 1, 1e6, 1), first: typeof d.first === 'string' ? d.first.slice(0, 10) : today() }, d.perfect ? { perfect: 1 } : {}); });
    const w = isMap(o.wild) && wildById(o.wild.id);
    const day = typeof o.day === 'string' ? o.day.slice(0, 10) : today();
    // The order partners join in: shuffled once per save; any missing from it go on the end in a random order.
    const order = Array.isArray(o.order) ? [...new Set(o.order.filter((id) => partnerById(id)))] : [];
    order.push(...shuffled(MON.partners.map((p) => p.id).filter((id) => !order.includes(id))));
    const m = {
      party, active: party[o.active] && party[o.active].hp > 0 ? o.active : healthiest(party) || Object.keys(party)[0] || null, order,
      wild: w ? { id: w.id, hp: num(o.wild.hp, 1, TIER_HP[w.tier], TIER_HP[w.tier]) } : null,
      dex, day, dayXp: num(o.dayXp, 0, 1e6, 0),
      recent: Array.isArray(o.recent) ? o.recent.filter((id) => wildById(id)).slice(0, MON_RECENT) : [],
      cases: Array.isArray(o.cases) ? o.cases.filter((id) => caseById(id)).slice(0, 4) : [],
      done: isMap(o.done) && day === today() ? o.done : {},
      log: Array.isArray(o.log) ? o.log.filter((x) => isMap(x) && typeof x.msg === 'string').slice(0, MON_LOG) : [],
    };
    // m.level, m.xp and m.hp read and write the active partner's stats. They aren't enumerable, so the save
    // (JSON) only holds the party.
    ['level', 'xp', 'hp'].forEach((key) => Object.defineProperty(m, key, {
      get() { const v = this.party[this.active]; return v ? v[key] : key === 'level' ? 1 : key === 'hp' ? monMaxHp(1) : 0; },
      set(x) { const v = this.party[this.active]; if (v) v[key] = x; },
    }));
    return m;
  }
  saved.mon = cleanMon(saved.mon);
  const mon = () => saved.mon;
  const monLog = (msg, kind = '') => { mon().log.unshift({ msg, kind, date: today() }); mon().log.length = Math.min(mon().log.length, MON_LOG); };
  function monRender(opts = {}) {
    const y = window.scrollY;
    renderMon();
    monChip();
    window.scrollTo({ top: opts.keepScroll ? y : 0 });
  }

  // A new day: the whole team wakes up healed, and the XP pace and the repeat list start over.
  function monDay() {
    const m = mon();
    if (m.day === today()) return;
    Object.assign(m, { day: today(), dayXp: 0, done: {} });
    Object.values(m.party).forEach((v) => { v.hp = monMaxHp(v.level); });
  }
  const joinOrder = (m = mon()) => m.order.map(partnerById);
  const caughtCount = (m = mon()) => Object.keys(m.dex).length;
  // Team points: 1 for each new species, and 1 for every MON_REPEATS repeat catches.
  const repeatCount = (m = mon()) => Object.values(m.dex).reduce((a, d) => a + d.n - 1, 0);
  const teamPoints = (m = mon()) => caughtCount(m) + Math.floor(repeatCount(m) / MON_REPEATS);
  const joinsAt = (i) => i * MON_UNLOCK;
  // Adds every partner your catches have earned. They join a couple of levels under your strongest, so they're usable.
  function monUnlock() {
    const m = mon(), want = Math.min(MON.partners.length, 1 + Math.floor(teamPoints(m) / MON_UNLOCK)), joined = [];
    if (!m.active) return joined;
    while (Object.keys(m.party).length < want) {
      const p = joinOrder(m).find((x) => !m.party[x.id]);
      if (!p) break;
      const lv = Math.max(1, Math.max(...Object.values(m.party).map((v) => v.level)) - 2);
      m.party[p.id] = { level: lv, xp: 0, hp: monMaxHp(lv) };
      joined.push(p);
      monLog(`${p.name} joined your team at Lv ${lv}!`, 'good');
    }
    return joined;
  }
  function monSwitch(id) {
    const m = mon();
    if (!m.party[id] || m.active === id || m.party[id].hp <= 0) return false;
    m.active = id; persist();
    return true;
  }
  // Spawn weight: rarity, then ×3 if not caught yet, ×2 if its group has missed questions and ×1.5 if it's the
  // group of your last fight. Creatures from the last few spawns drop right down, so the same one doesn't keep coming.
  function spawnWeight(x, m, open) {
    const seen = m.recent.indexOf(x.id);
    return TIER_SPAWN[x.tier] * (m.dex[x.id] ? 1 : 3) * (open.has(x.cat) ? 2 : 1) * (x.cat === lastCat ? 1.5 : 1)
      * (seen === 0 ? 0.05 : seen > 0 ? 0.2 : 1);
  }
  function monSpawn(id) {
    const m = mon();
    let w = wildById(id);
    if (!w) {
      const open = new Set(Object.keys(saved.missed).map((k) => (caseById(k.split('#')[0]) || {}).cat));
      const weights = MON.wild.map((x) => spawnWeight(x, m, open));
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      w = MON.wild.find((x, i) => (r -= weights[i]) < 0) || MON.wild[0];
    }
    m.wild = w ? { id: w.id, hp: TIER_HP[w.tier] } : null;
    if (w) m.recent = [w.id, ...m.recent.filter((x) => x !== w.id)].slice(0, MON_RECENT);
  }
  function monChoose(id) {
    const m = mon();
    const p = partnerById(id);
    if (!p || !p.starter || m.active) return;
    Object.assign(m, cleanMon({ dex: m.dex }), { party: { [id]: { level: 1, xp: 0, hp: monMaxHp(1) } }, active: id });
    monSpawn();
    monLog(`${p.name} joined you. A wild ${wildById(m.wild.id).name} appeared!`);
    monUnlock();
    persist(); monRender();
  }
  function monChase(id) {
    if (!wildById(id) || !mon().active || !mon().dex[id]) return; // new creatures only turn up in the wild
    monSpawn(id); hunt = null; persist();
    monRender();
  }
  function monReroll() {
    const prev = mon().wild && mon().wild.id;
    for (let i = 0; i < 5 && mon().wild && mon().wild.id === prev; i++) monSpawn();
    hunt = null; persist(); monRender();
  }

  // Called for every scored turn of a fight. The creature's HP is shared out over the case's questions, so its bar
  // shows how much of the case is still to get right, and it can't drop to 0 before the last question. On the last
  // question it's caught if you got MON_NEED of the case right (o.share). Bonuses add XP only.
  // o: { key, fixed (was on the missed list), weight (share of a step), units (steps), final, share }.
  function monHit(c, st, points, o) {
    const m = mon();
    monDay();
    const w = wildById(m.wild.id), pal = companion();
    const fx = { w, topic: st.topic, dmg: 0, hurt: 0, xp: 0, crit: false, eff: false, repeat: false, tired: false };
    lastCat = c.cat;
    if (points >= 4) {
      const pass = points >= STEP_PASS;
      fx.repeat = pass && !!m.done[o.key];
      fx.crit = pass && o.fixed;
      fx.eff = pal.strong.includes(st.topic);
      fx.dmg = Math.max(1, Math.round((TIER_HP[w.tier] * o.weight * points) / (PTS * o.units)));
      m.wild.hp = Math.max(o.final ? 0 : 1, m.wild.hp - fx.dmg);
      // ×2 for a fixed miss, ×1.25 on a favourite topic, and ★ +10%, ★★ +20%
      const xp = (pass ? (fx.crit ? 20 : 10) : 4) * o.weight * (fx.eff ? 1.25 : 1) * (1 + 0.1 * rankOf(m.level));
      if (!fx.repeat) fx.xp = Math.max(1, Math.round(xp));
      if (pass) m.done[o.key] = 1;
    } else {
      fx.hurt = Math.max(1, Math.round((5 + 4 * w.tier) * o.weight));
      m.hp -= fx.hurt;
    }
    if (o.final && o.share >= MON_NEED[w.tier] - 1e-9) {
      m.wild.hp = 0;
      fx.caught = w;
      const d = m.dex[w.id];
      m.dex[w.id] = Object.assign({ n: d ? d.n + 1 : 1, first: d ? d.first : today() }, d && d.perfect ? { perfect: 1 } : {});
      fx.firstCatch = !d;
      fx.xp += 25 * w.tier;
      // A perfect case doubles the catch XP and marks the creature Mastered in the Ocudex.
      if (o.share >= 1 - 1e-9) { fx.perfect = true; fx.xp += 25 * w.tier; m.dex[w.id].perfect = 1; }
      m.hp = Math.min(monMaxHp(m.level), Math.max(m.hp, 0) + Math.round(monMaxHp(m.level) / 4));
      monLog(`Caught ${w.name}${d ? ` (×${d.n + 1})` : ' (new!)'}${fx.perfect ? ' · perfect case' : ''}`, 'good');
    } else if (m.hp <= 0) {
      // Fainted partners rest at 0 HP until the morning. The next one standing comes out and the fight goes on;
      // only when the whole team is down does the creature get away, and then everyone is healed.
      m.hp = 0;
      const next = healthiest(m.party, m.active);
      fx.down = pal;
      if (next) {
        fx.tagIn = partnerById(next);
        monLog(`${pal.name} fainted. Go, ${fx.tagIn.name}!`, 'bad');
      } else {
        fx.fainted = w;
        Object.values(m.party).forEach((v) => { v.hp = monMaxHp(v.level); });
        monLog(`${Object.keys(m.party).length > 1 ? 'Your whole team' : pal.name} fainted and ${w.name} got away. No XP lost.`, 'bad');
      }
    } else if (fx.dmg) monLog(`${w.name} −${fx.dmg}${fx.crit ? ' · critical: needs-work question fixed' : ''}${fx.eff ? ' · favourite topic' : ''}${fx.repeat ? ' · repeat today' : ''}`);
    else monLog(`${w.name} hit ${pal.name} −${fx.hurt}`, 'bad');
    if (fx.caught || fx.fainted) monSpawn();
    monXp(fx);
    if (fx.tagIn) m.active = fx.tagIn.id;
    if (fx.caught) fx.joined = monUnlock();
    monChip();
    return fx;
  }
  // XP slows to a quarter once the day's allowance is used, so a long grind is never the best way to level.
  function monXp(fx) {
    const m = mon();
    if (!fx.xp) return;
    const room = Math.max(0, MON_DAILY_XP - m.dayXp), full = Math.min(fx.xp, room);
    fx.tired = fx.xp > room;
    fx.xp = full + Math.ceil((fx.xp - full) / 4);
    m.dayXp += fx.xp; m.xp += fx.xp;
    while (m.level < MON_MAX_LV && m.xp >= xpNeed(m.level)) {
      m.xp -= xpNeed(m.level); m.level++;
      m.hp = monMaxHp(m.level);
      fx.lvUp = m.level;
      if (MON_RANK.includes(m.level)) { fx.ranked = rankOf(m.level); monLog(`${companion().name} ranked up to ${'★'.repeat(fx.ranked)}!`, 'good'); }
    }
    if (m.level >= MON_MAX_LV) m.xp = Math.min(m.xp, xpNeed(m.level) - 1);
    if (fx.lvUp) monLog(`${companion().name} reached Lv ${fx.lvUp}`, 'good');
  }

  // The Ocumon tab's badge: how much HP the wild creature has left (details on hover).
  function monChip() {
    const badge = document.getElementById('mon-badge'), link = document.getElementById('mon-link'), m = mon(), pal = companion();
    if (!badge) return;
    const w = pal && m.wild && wildById(m.wild.id);
    badge.hidden = !w;
    link.title = w ? `${pal.name}, Lv ${m.level}, ${m.hp}/${monMaxHp(m.level)} HP. Wild ${w.name}: ${m.wild.hp}/${TIER_HP[w.tier]} HP` : '';
    if (w) { badge.textContent = `${Math.ceil((100 * m.wild.hp) / TIER_HP[w.tier])}%`; badge.setAttribute('aria-label', `: wild ${w.name} at ${badge.textContent} HP`); }
  }

  // ---- fights: one case from start to finish, against a wild creature that matches it
  // Every step becomes one or more turns: single best answer as it is; select-all as "which one is right" (or
  // "which one isn't" when nearly all options are right); matching as one pick per row (up to MON_PAIRS); an Rx
  // conversion as the Rx grid; an open question as a special move: say it, reveal the model answer, mark yourself.
  function huntTurns(c) {
    const turns = [];
    c.steps.forEach((st, s) => {
      const k = stepKey(c, s), base = { s, k, st, key: k, weight: 1, last: true };
      if (st.type === 'mcq') turns.push(Object.assign(base, { kind: 'pick', options: st.options, src: range(st.options.length), answer: st.answer }));
      else if (st.type === 'rx') turns.push(Object.assign(base, { kind: 'rx' }));
      else if (st.type === 'multi') {
        const yes = shuffled(st.answers), no = shuffled(range(st.options.length).filter((i) => !st.answers.includes(i)));
        if (!no.length) { turns.push(Object.assign(base, { kind: 'self' })); return; }
        const odd = no.length < 3 && yes.length >= 3;
        const xs = odd ? [...yes.slice(0, 3), no[0]] : [yes[0], ...no.slice(0, 3)];
        turns.push(Object.assign(base, { kind: 'pick', options: xs.map((i) => st.options[i]), src: xs, answer: odd ? 3 : 0,
          sub: odd ? 'Three of these are right. Which one isn’t?' : 'Only one of these is right. Which one?' }));
      } else if (st.type === 'match') {
        const rows = shuffled(range(st.rows.length)).slice(0, MON_PAIRS).sort((a, b) => a - b).map((i) => st.rows[i]);
        rows.forEach((r, j) => {
          const idx = [r.answer, ...shuffled(range(r.options.length).filter((i) => i !== r.answer)).slice(0, 3)];
          turns.push(Object.assign({}, base, { kind: 'pick', key: `${k}/${j}`, weight: 1 / rows.length, last: j === rows.length - 1, part: [j + 1, rows.length],
            sub: r.label, options: idx.map((i) => r.options[i]), answer: 0 }));
        });
      } else turns.push(Object.assign(base, { kind: 'self' }));
    });
    turns.forEach((t) => { if (t.kind === 'pick') t.perm = shuffled(range(t.options.length)); });
    return turns;
  }
  // The creature brings a case that matches it: one with missed questions first, then one you haven't seen,
  // and a case you've already got fully right today last. Your last few cases are put back a step.
  function huntCase(w) {
    const m = mon();
    const xs = CASES.filter((c) => inPool(w, c) && c.steps.length);
    if (!xs.length) return null;
    const rank = (c) => {
      const ks = c.steps.map((_, s) => stepKey(c, s));
      return (ks.every((k) => m.done[k]) ? 3 : ks.some((k) => saved.missed[k]) ? 0 : ks.some((k) => !saved.seen[k]) ? 1 : 2) + (m.cases.includes(c.id) ? 2 : 0);
    };
    const top = Math.min(...xs.map(rank));
    return shuffled(xs.filter((c) => rank(c) === top))[0];
  }
  function huntStart() {
    const m = mon();
    if (!m.active) return;
    monDay();
    if (!m.wild) monSpawn();
    const w = wildById(m.wild.id), c = huntCase(w);
    if (!c) { monReroll(); return; }
    m.wild.hp = TIER_HP[w.tier]; // a new case: the creature starts at full HP
    m.cases = [c.id, ...m.cases.filter((x) => x !== c.id)].slice(0, 4);
    hunt = { c, w, turns: huntTurns(c), i: 0, units: c.steps.length, got: 0,
      fixed: c.steps.map((_, s) => !!saved.missed[stepKey(c, s)]), scores: {}, pts: 0, over: null, endS: null, last: null, think: false, finished: false };
    persist(); monRender();
  }
  // Fight answers go on the same missed list as the simulator's.
  function monTrack(k, points) { setResult(k, points); }
  // Scores the current turn: damage (or a hit back) while the battle is on, and the missed list once the step's
  // last turn is in. When the case runs out of questions with the creature still standing, it gets away.
  function huntScore(points, extra) {
    if (!hunt || hunt.last || hunt.finished) return;
    const t = hunt.turns[hunt.i], w = hunt.w, before = hunt.over ? null : btNow('');
    let fx = null;
    const final = hunt.i >= hunt.turns.length - 1;
    hunt.got += (points / PTS) * t.weight;
    if (!hunt.over) {
      fx = monHit(hunt.c, t.st, points, { key: t.key, fixed: hunt.fixed[t.s], weight: t.weight, units: hunt.units, final, share: hunt.got / hunt.units });
      if (fx.caught) hunt.over = 'caught'; else if (fx.fainted) hunt.over = 'fainted';
    }
    hunt.pts += points * t.weight;
    if (t.last) {
      const p = Math.round(hunt.pts);
      monTrack(t.k, p);
      if (p >= STEP_PASS) mon().done[t.k] = 1;
      hunt.scores[t.s] = p; hunt.pts = 0;
    }
    if (final) saved.done[hunt.c.id] = 1;
    if (!hunt.over && final) {
      fx.fled = w; hunt.over = 'fled';
      monLog(`${w.name} got away: get ${Math.round(100 * MON_NEED[w.tier])}% of its case right to catch it.`, 'bad');
      monSpawn(); monChip();
    }
    if (fx && hunt.over) hunt.endS = btAfter(before, fx);
    hunt.last = Object.assign({ points, ok: points >= STEP_PASS, before, fx }, extra);
    persist(); monRender({ keepScroll: true });
  }
  function huntPick(oi) {
    const t = hunt && hunt.turns[hunt.i];
    if (!t || t.kind !== 'pick' || hunt.last) return;
    huntScore(oi === t.answer ? PTS : 0, { pick: oi });
  }
  function huntRx() {
    const t = hunt && hunt.turns[hunt.i];
    if (!t || t.kind !== 'rx' || hunt.last) return;
    const { pts, rows } = rxCheck(t.st);
    huntScore(pts, { rows });
  }
  function huntSelf(points) {
    const t = hunt && hunt.turns[hunt.i];
    if (!t || t.kind !== 'self' || hunt.last) return;
    huntScore(points, {});
  }
  function huntNext() {
    if (!hunt) return;
    if (hunt.finished) { hunt = null; monRender(); return; }
    if (!hunt.last) return;
    hunt.i++; hunt.last = null; hunt.think = false;
    if (hunt.i >= hunt.turns.length) hunt.finished = true;
    monRender(); huntScroll();
  }
  // Brings the next question up under whatever stays on screen (the battle on a phone, the top bar on a wide screen).
  function huntScroll() {
    const ask = view.querySelector('.bt-ask'), bt = view.querySelector('.fight .bt');
    if (!ask || !bt) return;
    const above = getComputedStyle(bt).position === 'sticky' ? bt.offsetHeight : topbar.offsetHeight;
    window.scrollTo({ top: Math.max(0, ask.getBoundingClientRect().top + window.scrollY - above - 12) });
  }

  // ---- views: the tab is drawn like a handheld monster battle, and every answer plays out on it: attack,
  // HP drain, catch, level-up.
  const MOVES = { history: 'Case History', rx: 'Vertex Blast', lenschoice: 'Lens Pick', materials: 'Dk Surge', fitting: 'Push-up Test', rgp: 'Fluorescein Glow', presbyopia: 'Add Power', ew: 'Night Watch', lifestyle: 'Splash Guard', care: 'Peroxide Fizz', complications: 'Slit-lamp Scan', specialty: 'Reverse Curve' };
  const calm = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const hpTone = (pct) => (pct <= 20 ? 'low' : pct <= 50 ? 'mid' : '');
  const pctOf = (v, max) => Math.max(0, Math.min(100, (100 * v) / max));
  const btHp = (hp, max, label) => `<div class="bt-hp" role="img" aria-label="${esc(label)}: ${Math.max(0, hp)} of ${max} HP"><b aria-hidden="true">HP</b><div class="bt-track"><span class="${hpTone(pctOf(hp, max))}" style="width:${pctOf(hp, max)}%"></span></div></div>`;
  let fxRun = 0, fxFast = false, introSeen = null, swapIn = false;

  // Pixel sprites in img/sprites (see js/data-ocumon.js). 'char' sheets have 64px frames and one row per
  // animation; 'animal' sheets have 32px frames: front idle, then the back view idle, attack, hurt and faint;
  // 'gk' sheets list their own `anims`. Each animation: [row, frames, ms a frame, loops].
  const SPR = {
    char: { cols: 12, rows: 7, anims: { front: [0, 4, 160, 1], idle: [0, 4, 160, 1], hurt: [1, 4, 110], faint: [2, 10, 90], spawn: [3, 12, 55], attack: [4, 8, 70], power: [5, 12, 70], vanish: [6, 11, 55] } },
    animal: { cols: 5, rows: 5, anims: { front: [0, 2, 420, 1], idle: [1, 2, 420, 1], attack: [2, 5, 90], hurt: [3, 3, 130], faint: [4, 4, 160] } },
    gk: { cols: 12, rows: 5, anims: {} },
  };
  const pxAnim = (p, anim) => (p.anims || SPR[p.kind].anims)[anim];
  // The url goes straight into background-image: a relative url inside a custom property can resolve against the stylesheet.
  const pxStyle = (p, a) => `background-image:url('img/sprites/${p.sprite}.png');--cols:${SPR[p.kind].cols};--rows:${SPR[p.kind].rows};--row:${a[0]};--n:${a[1]};--ms:${a[2]}`;
  const pxSprite = (p, anim = 'front', cls = '') => { const a = pxAnim(p, anim) || pxAnim(p, 'idle'); return `<i class="px ${a[3] ? 'loop' : 'once'} ${p.kind} ${cls}" style="${pxStyle(p, a)}" aria-hidden="true"></i>`; };
  // Plays one animation on a sprite; returns how long it takes, or 0 if this kind of sprite doesn't have it.
  function pxPlay(el, p, anim) {
    const a = el && pxAnim(p, anim);
    if (!a) return 0;
    el.setAttribute('style', pxStyle(p, a));
    el.classList.toggle('loop', !!a[3]); el.classList.toggle('once', !a[3]);
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    return a[1] * a[2];
  }
  const rankStars = (p) => (p.rank ? ` <em class="bt-rank" title="Rank">${'★'.repeat(p.rank)}</em>` : '');

  // A battle frame. S is what it shows: { w, wHp, pal, lv, hp, xp, msg }, so an answer can be drawn as it was
  // before the hit and then animated to what it is now.
  function btScene(S, menu, cls = '') {
    const wMax = TIER_HP[S.w.tier], pMax = monMaxHp(S.lv), caught = mon().dex[S.w.id];
    return `<section class="bt ${cls}" aria-label="Battle: ${esc(S.pal.name)} against a wild ${esc(S.w.name)}">
      <div class="bt-stage" data-act="bt-skip">
        <div class="bt-sky" aria-hidden="true"></div>
        <div class="bt-pad foe" aria-hidden="true"></div><div class="bt-pad pal" aria-hidden="true"></div>
        <div class="bt-mon foe ${S.wHp / wMax <= 0.25 ? 'slow' : ''}" aria-hidden="true"><div class="bt-fx"><span>${S.w.icon}</span></div></div>
        <div class="bt-mon pal ${S.pal.kind} ${S.hp / pMax <= 0.25 ? 'slow' : ''}" style="--rank:${S.pal.rank}" aria-hidden="true"><div class="bt-fx">${pxSprite(S.pal, 'idle')}</div></div>
        <div class="bt-box foe"><div class="bt-name"><span>${esc(S.w.name)}</span>${caught ? '<i class="bt-ball" title="Caught before"></i>' : ''}<small>${wildLv(S.w)}</small></div>${btHp(S.wHp, wMax, `Wild ${S.w.name}`)}</div>
        <div class="bt-box pal"><div class="bt-name"><span>${esc(S.pal.name)}${rankStars(S.pal)}</span><small class="bt-lv">Lv${S.lv}</small></div>${btHp(S.hp, pMax, S.pal.name)}
          <div class="bt-hpnum">${Math.max(0, S.hp)}/${pMax}</div><div class="bt-xp" aria-hidden="true"><span style="width:${S.lv >= MON_MAX_LV ? 100 : pctOf(S.xp, xpNeed(S.lv))}%"></span></div></div>
      </div>
      <div class="bt-bar"><p class="bt-msg" data-act="bt-skip" aria-live="polite">${esc(S.msg || '')}</p>${menu || ''}</div>
    </section>`;
  }
  const btAfter = (P, fx) => { const m = mon(); return Object.assign({}, P, { wHp: fx.caught ? 0 : fx.fainted || fx.fled ? Math.max(0, P.wHp - fx.dmg) : m.wild.hp, pal: companion(), lv: m.level, hp: m.hp, xp: m.xp, msg: '' }); };
  const btNow = (msg) => { const m = mon(); return { w: wildById(m.wild.id), wHp: m.wild.hp, pal: companion(), lv: m.level, hp: m.hp, xp: m.xp, msg }; };

  // Animation helpers. Each run gets a number; a new render or run makes the old one stop where it is.
  // A click on the scene speeds the rest of the run up, and reduced motion skips straight to the end.
  function btKit() {
    const run = ++fxRun, root = view.querySelector('.bt');
    fxFast = false;
    const live = () => run === fxRun && !!root && root.isConnected;
    const q = (s) => root.querySelector(s);
    const wait = (ms) => new Promise((r) => setTimeout(r, fxFast ? ms / 6 : ms));
    async function say(text, hold = 650) {
      const el = q('.bt-msg');
      if (!live() || !el) return;
      el.textContent = '';
      for (let i = 1; i <= text.length; i++) {
        if (!live()) return;
        if (fxFast) { el.textContent = text; break; }
        el.textContent = text.slice(0, i);
        await wait(18);
      }
      await wait(hold);
    }
    async function act(sel, name, ms) {
      const el = q(sel);
      if (!live() || !el) return;
      el.classList.remove(name); void el.offsetWidth; el.classList.add(name);
      await wait(ms);
      el.classList.remove(name);
    }
    // Drains (or fills) an HP bar, changing colour as it passes half and a fifth.
    function drain(side, from, to, max) {
      const bar = q(`.bt-box.${side} .bt-track > span`), num = side === 'pal' && q('.bt-hpnum');
      if (!live() || !bar) return Promise.resolve();
      const ms = (fxFast ? 0.2 : 1) * Math.min(1100, Math.max(350, (1400 * Math.abs(from - to)) / max)), t0 = performance.now();
      return new Promise((done) => {
        const step = (t) => {
          if (!live()) return done();
          const k = Math.min(1, (t - t0) / ms), v = from + (to - from) * k, pct = pctOf(v, max);
          bar.style.width = `${pct}%`; bar.className = hpTone(pct);
          if (num) num.textContent = `${Math.max(0, Math.round(v))}/${max}`;
          if (k < 1) requestAnimationFrame(step); else done();
        };
        requestAnimationFrame(step);
      });
    }
    function fill(sel, to) {
      const el = q(sel);
      if (!live() || !el) return Promise.resolve();
      el.style.width = `${to}%`;
      return wait(700);
    }
    function pop(text, kind) {
      const st = q('.bt-stage');
      if (!live() || !st) return;
      const d = document.createElement('span');
      d.className = `bt-pop ${kind}`; d.textContent = text;
      st.appendChild(d);
      setTimeout(() => d.remove(), 1200);
    }
    // Plays a sprite animation on your partner and waits for it; 'idle' again afterwards unless told to keep the last frame.
    async function px(p, anim, keep) {
      const el = q('.bt-mon.pal .px');
      if (!live() || !el) return;
      const ms = pxPlay(el, p, anim);
      if (!ms) return;
      await wait(ms);
      if (!keep && live()) pxPlay(el, p, 'idle');
    }
    return { root, live, q, wait, say, act, drain, fill, pop, px };
  }

  // Wild creature appears: white flash, the platforms slide in, the silhouette fills in, then your partner is sent out.
  async function btIntro() {
    const K = btKit(), m = mon(), w = wildById(m.wild.id), pal = companion();
    if (!K.root) return;
    if (swapIn && !calm()) { swapIn = false; return btSwapIn(K, pal); }
    swapIn = false;
    if (calm() || introSeen === m.wild.id) { K.root.classList.remove('bt-intro'); K.q('.bt-msg').textContent = `What will ${pal.name} do?`; return; }
    introSeen = m.wild.id;
    void K.root.offsetWidth;
    K.root.classList.add('in1');
    await K.wait(900);
    await K.say(`A wild ${w.name} appeared!`, 500);
    if (!K.live()) return;
    K.root.classList.add('in2');
    K.px(pal, 'spawn');
    await K.say(`Go! ${pal.name}!`, 700);
    if (!K.live()) return;
    K.root.classList.remove('bt-intro', 'in1', 'in2');
    await K.say(`What will ${pal.name} do?`, 0);
  }

  // One answer, played out: P is the state before the answer, fx what monHit() did.
  async function btAnswer(P, fx, ok) {
    const K = btKit(), m = mon(), wMax = TIER_HP[P.w.tier];
    if (!K.root || !fx) return;
    const left = fx.dmg ? `${P.w.name} has ${Math.max(0, P.wHp - fx.dmg)} HP left.` : `${P.pal.name} has ${m.hp} HP left.`;
    const end = fx.caught ? `Gotcha! ${P.w.name} was caught!${fx.perfect ? ' A perfect case: bonus XP!' : ''}` : fx.tagIn ? `${P.pal.name} fainted! Go, ${fx.tagIn.name}!` : fx.fainted ? `${P.pal.name} fainted! ${P.w.name} got away.` : fx.fled ? `${left} The case is over… ${P.w.name} got away!` : left;
    const side = K.q('.bt-side'), sideHTML = side ? side.outerHTML : '';
    if (calm()) {
      K.root.outerHTML = btScene(btAfter(P, fx), sideHTML, `hunt ${fx.caught ? 'caught' : fx.fainted ? 'fainted' : fx.fled ? 'fled' : ''}`);
      view.querySelector('.bt-msg').textContent = [fx.crit && 'A critical hit! Double XP.', fx.eff && 'Favourite topic: bonus XP!', end, fx.lvUp && `${companion().name} grew to Lv ${fx.lvUp}!`].filter(Boolean).join(' ');
      return;
    }
    if (ok || fx.dmg) {
      await K.say(`${P.pal.name} used ${MOVES[fx.topic] || 'Slit-lamp Scan'}!`, 250);
      K.px(P.pal, 'attack');
      await K.act('.bt-mon.pal .bt-fx', 'lunge', 320);
      K.pop(`−${fx.dmg}`, fx.crit ? 'crit' : '');
      if (fx.crit) K.act('.bt-stage', 'quake', 450);
      await K.act('.bt-mon.foe .bt-fx', 'hit', 650);
      await K.drain('foe', P.wHp, Math.max(0, P.wHp - fx.dmg), wMax);
      if (fx.crit) await K.say('A critical hit! Needs-work question fixed: double XP.');
      if (fx.eff) await K.say(`It’s ${P.pal.name}’s favourite topic: bonus XP!`);
      if (fx.repeat) await K.say('Already right today… no XP this time.');
    } else {
      await K.say(`${P.pal.name}’s answer missed!`, 300);
      await K.say(`The wild ${P.w.name} struck back!`, 150);
      await K.act('.bt-mon.foe .bt-fx', 'lunge', 320);
      K.pop(`−${fx.hurt}`, 'hurt');
      K.px(P.pal, 'hurt');
      await K.act('.bt-mon.pal .bt-fx', 'hit', 650);
      await K.drain('pal', P.hp, Math.max(0, P.hp - fx.hurt), monMaxHp(P.lv));
      if (fx.down) {
        await K.px(P.pal, 'faint', true);
        await K.act('.bt-mon.pal', 'faint', 700);
        if (!K.live()) return;
        K.q('.bt-mon.pal').classList.add('gone');
        if (fx.tagIn) {
          await K.say(`${P.pal.name} fainted!`);
          if (!K.live()) return;
          K.root.outerHTML = btScene(btAfter(P, fx), sideHTML, 'hunt');
          await btSwapIn(btKit(), fx.tagIn, fx.fled ? `That was the last question… ${P.w.name} got away!` : `The fight goes on. What will ${fx.tagIn.name} do?`);
          return;
        }
        await K.say(`${P.pal.name} fainted! ${P.w.name} got away.`);
        await K.say('No XP lost. Your team is healed for the next one.');
        return;
      }
    }
    // The catch comes with the case's last question, right or wrong, once enough of the case is right.
    if (fx.caught) {
      await K.say('That was the last question, and you got enough of the case right!', 300);
      const hp = Math.max(0, P.wHp - fx.dmg);
      if (hp > 0) await K.drain('foe', hp, 0, wMax);
      await K.say(`${P.w.name} is worn out!`, 300);
      if (!K.live()) return;
      K.q('.bt-stage').insertAdjacentHTML('beforeend', '<div class="bt-throw" aria-hidden="true"><i class="bt-ball big"></i></div>');
      await K.wait(750);
      await K.act('.bt-mon.foe', 'absorb', 550);
      if (!K.live()) return;
      K.q('.bt-mon.foe').classList.add('gone');
      K.q('.bt-throw').classList.add('wobble');
      await K.wait(2000);
      if (!K.live()) return;
      K.q('.bt-throw').classList.add('click');
      await K.say(`Gotcha! ${P.w.name} was caught!`);
      if (fx.perfect) { K.act('.bt-stage', 'flash', 500); await K.say(`A perfect case! Bonus XP, and ${P.w.name} is marked Mastered.`); }
    }
    if (fx.xp) {
      await K.say(`${P.pal.name} gained ${fx.xp} XP!${fx.tired ? ' (tired: quarter XP)' : ''}`, 200);
      if (fx.lvUp) {
        await K.fill('.bt-xp > span', 100);
        if (!K.live()) return;
        K.q('.bt-lv').textContent = `Lv${m.level}`;
        const bar = K.q('.bt-xp > span');
        bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth; bar.style.transition = '';
        K.act('.bt-mon.pal .bt-fx', 'glow', 900);
        await K.say(`${P.pal.name} grew to Lv ${fx.lvUp}!`);
      }
      await K.fill('.bt-xp > span', m.level >= MON_MAX_LV ? 100 : pctOf(m.xp, xpNeed(m.level)));
    }
    // Catches and level-ups heal: fill the bar up to the new HP.
    if (m.hp !== P.hp || m.level !== P.lv) { if (fx.lvUp) K.q('.bt-hpnum').textContent = `${P.hp}/${monMaxHp(m.level)}`; await K.drain('pal', Math.max(0, ok ? P.hp : P.hp - fx.hurt), m.hp, monMaxHp(m.level)); }
    if (fx.ranked) {
      await K.say(`What? ${P.pal.name} is powering up!`, 200);
      K.px(P.pal, 'power');
      await K.act('.bt-mon.pal .bt-fx', 'evolve', 1800);
      if (!K.live()) return;
      K.q('.bt-mon.pal').style.setProperty('--rank', fx.ranked);
      K.q('.bt-box.pal .bt-name span').innerHTML = esc(P.pal.name) + rankStars({ rank: fx.ranked });
      K.act('.bt-stage', 'flash', 500);
      await K.say(`${P.pal.name} ranked up to ${'★'.repeat(fx.ranked)}! It earns a little more XP and looks the part.`);
    }
    for (const j of fx.joined || []) await K.say(`${j.name} wants to join your team! Send it out from Your team on the Ocumon tab.`);
    if (fx.fled) {
      await K.say('That was the last question in the case…', 300);
      if (!K.live()) return;
      K.root.classList.add('fled');
      await K.say(`${P.w.name} got away!`, 0);
      return;
    }
    await K.say(fx.caught ? `${P.w.name} was added to your Ocudex.` : end, 0);
  }

  // Switch partner: the one in battle is called back, then the new one is sent out.
  async function btSwitch(id) {
    const m = mon(), old = companion(), next = partnerById(id);
    if (!next || !m.party[id] || m.active === id) return;
    const K = btKit();
    if (K.root && !calm()) {
      view.querySelector('.bt').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      await K.say(`That’s enough, ${old.name}! Come back!`, 150);
      if (!K.live()) return;
      if (pxAnim(old, 'vanish')) await K.px(old, 'vanish', true); else await K.act('.bt-mon.pal', 'bt-back', 450);
      if (!K.live()) return;
    }
    monSwitch(id);
    swapIn = true;
    monRender({ keepScroll: true });
  }
  async function btSwapIn(K, pal, then) {
    K.root.classList.add('swap');
    void K.root.offsetWidth;
    K.root.classList.add('go');
    K.px(pal, 'spawn');
    await K.say(`Go! ${pal.name}!`, 600);
    if (!K.live()) return;
    K.root.classList.remove('swap', 'go');
    await K.say(then || `What will ${pal.name} do?`, 0);
  }

  async function btRun() {
    const K = btKit();
    if (!K.root || calm()) { monReroll(); return; }
    K.root.classList.add('fled');
    await K.say('Got away safely!', 500);
    if (!K.live()) return;
    introSeen = null;
    monReroll();
  }
  const topicsOf = (p) => p.strong.map((t) => TOPIC_SHORT[t] || t).join(' and ');
  function btParty() {
    const K = btKit(), m = mon(), p = companion(), n = Object.keys(m.party).length;
    K.act('.bt-mon.pal .bt-fx', 'hop', 600);
    K.say(`${p.name} · Lv ${m.level} · strong on ${topicsOf(p)}. ${n > 1 ? `${n} Ocumon on your team: pick who to send out below.` : `Catch ${MON_UNLOCK} new creatures and another Ocumon joins your team.`}`, 0);
    const t = document.getElementById('team');
    if (t) t.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'center' });
  }
  // Your team: every partner that has joined, with the next few still to come as silhouettes.
  function teamHTML() {
    const m = mon(), got = teamPoints(m);
    const cards = joinOrder(m).filter((p) => !m.party[p.id]).map((p, i) => ({ p, at: joinsAt(Object.keys(m.party).length + i) }));
    const mine = MON.partners.filter((p) => m.party[p.id]).sort((a, b) => (a.id === m.active ? -1 : b.id === m.active ? 1 : m.party[b.id].level - m.party[a.id].level));
    return `<section class="card stack" id="team" style="margin-top:1.2rem;scroll-margin-top:5rem">
      <div class="row" style="justify-content:space-between"><h2 style="font-size:1.15rem">Your team</h2><span class="mono muted">${mine.length} / ${MON.partners.length}</span></div>
      <div class="mon-team">${mine.map((p) => {
        const v = m.party[p.id], q = Object.assign({}, p, { rank: rankOf(v.level) }), now = p.id === m.active;
        return `<article class="mon-mate ${now ? 'now' : ''}" style="--h:${p.hue}">
          <div class="mon-mate-art">${pxSprite(q, 'front')}</div>
          <div class="mon-mate-info"><b>${esc(p.name)}</b>${rankStars(q)} <span class="mono muted">Lv ${v.level}</span>
            ${btHp(v.hp, monMaxHp(v.level), p.name)}
            <p class="muted">Strong on ${esc(topicsOf(p))}</p>
            ${now ? '<span class="pill good">In battle</span>' : v.hp <= 0 ? '<span class="pill bad">Fainted: rests until tomorrow</span>' : `<button class="btn small" data-act="mon-switch" data-v="${p.id}">Send out</button>`}</div></article>`;
      }).join('')}
      ${cards.slice(0, 4).map(({ p, at }) => `<article class="mon-mate locked" title="Joins at ${at} team points">
          <div class="mon-mate-art">${pxSprite(Object.assign({}, p, { rank: 0 }), 'front', 'mon-sil')}</div>
          <div class="mon-mate-info"><b>???</b><p class="muted">Joins at ${at} team points (${Math.max(0, at - got)} to go)</p></div></article>`).join('')}</div>
      ${cards.length > 4 ? `<p class="muted" style="margin:0">…and ${cards.length - 4} more to meet.</p>` : ''}
    </section>`;
  }
  const btMenu = () => `<div class="bt-cmd" role="group" aria-label="Battle commands">
    <button class="bt-btn atk" data-act="mon-hunt" title="Battle it with a case">Fight</button>
    <button class="bt-btn bag" data-act="mon-bag" title="Open your Ocudex">Ocudex</button>
    <button class="bt-btn party" data-act="mon-party" title="Your team: check on or switch your Ocumon">Ocumon</button>
    <button class="bt-btn run" data-act="mon-reroll" title="Find another creature">Run</button></div>`;

  function renderMon() {
    const m = mon();
    if (!MON.wild.length) { view.innerHTML = '<div class="fade"><section class="card"><p>Ocumon data did not load.</p></section></div>'; return; }
    if (!m.active) {
      view.innerHTML = `<div class="fade"><section class="hero"><div><p class="label">Ocumon</p><h1>Pick your first partner</h1>
        <p>Wild contact lens conditions turn up here, and each one brings a whole oral case. Fight it by working through the case from start to finish: every question you get right hits it, and every miss lets it hit back. Get enough of the case right to catch it and fill your Ocudex with all ${MON.wild.length}. Every ${MON_UNLOCK} new catches, another Ocumon joins your team (${MON.partners.length} in all), and each one levels up on its own. The common creatures are the themes the 2022, 2025 and 2026 orals asked most, so they turn up most.</p></div></section>
        <div class="arc-games">${MON.partners.filter((x) => x.starter).map((x, i) => `<section class="card arc-game hue-top mon-starter" style="--h:${x.hue};--i:${i}">
          <div class="mon-pick">${pxSprite(Object.assign({}, x, { rank: 0 }), 'front')}</div>
          <h2>${esc(x.name)}</h2><p class="muted">${esc(x.blurb)}</p>
          <button class="btn primary big" data-act="mon-starter" data-v="${x.id}">Choose ${esc(x.name)}</button></section>`).join('')}</div>
        <p class="muted" style="margin-top:1rem;font-size:.85rem">The two you don’t pick join your team later.</p></div>`;
      return;
    }
    if (m.day !== today() || !m.wild) { monDay(); if (!m.wild) monSpawn(); persist(); }
    if (monUnlock().length) persist();
    if (hunt) return monHunt();
    const total = MON.wild.length, got = MON.wild.filter((w) => m.dex[w.id]).length;
    const tired = m.dayXp >= MON_DAILY_XP;
    const log = m.log.length ? `<ul class="mon-log">${m.log.map((l) => `<li class="${l.kind}">${esc(l.msg)}</li>`).join('')}</ul>` : '<p class="muted">Nothing yet. Press Fight to start.</p>';
    const dex = Object.entries(CATS).map(([cid, title]) => {
      const ws = MON.wild.filter((w) => w.cat === cid);
      if (!ws.length) return '';
      const n = ws.filter((w) => m.dex[w.id]).length;
      return `<section class="mon-dex-group"><h3>${esc(title)} <span class="muted mono">${n} / ${ws.length}</span></h3><div class="mon-dex">${ws.map((w) => {
        const d = m.dex[w.id], now = m.wild.id === w.id;
        return `<article class="mon-card ${d ? '' : 'unknown'} ${now ? 'now' : ''}" style="--h:${CAT_HUE[cid] ?? 225}">
          <div class="mon-art small" aria-hidden="true"><span class="${d ? '' : 'mon-sil'}">${w.icon}</span></div>
          <div><b>${d ? esc(w.name) : '???'}</b> <span class="mon-lv mono" title="Level: higher means more HP and more XP when caught">${wildLv(w)}</span> <span class="mon-rarity t${w.tier}" title="${esc(askedLine(w))}">${TIER_NAME[w.tier]}</span>
          <p>${d ? `${esc(w.hint)}<span class="muted"> · caught ×${d.n}</span>${d.perfect ? ' <span class="pill good" title="You got one of its cases 100% right">🌟 Mastered</span>' : ''}` : `Turns up in the wild${w.tier === 3 ? ', rarely' : ''}. Catch it to log its notes.`}</p>
          <p class="mon-asked muted">${esc(askedLine(w))}</p>
          ${now ? '<span class="pill">In front of you</span>' : d ? `<button class="btn ghost small" data-act="mon-chase" data-v="${w.id}" aria-label="Battle ${esc(w.name)} again">Battle again</button>` : ''}</div></article>`;
      }).join('')}</div></section>`;
    }).join('');
    const intro = !calm() && introSeen !== m.wild.id;
    view.innerHTML = `<div class="fade">
      <div class="mon-head"><div><p class="label">Ocumon</p><h1>Catch the conditions you know</h1></div><span class="mono muted">${got} / ${total} caught</span></div>
      ${btScene(btNow(intro ? '' : `What will ${companion().name} do?`), btMenu(), intro ? 'bt-intro' : '')}
      <div class="mon-today card"><span class="label" style="margin:0">Today’s XP</span><span class="mono">${m.dayXp} / ${MON_DAILY_XP}</span><div class="mon-meter xp" aria-hidden="true"><span style="width:${Math.min(100, (100 * m.dayXp) / MON_DAILY_XP)}%"></span></div>
        ${tired ? `<p class="warn-text" style="margin:0">${esc(companion().name)} is tired: XP is at a quarter for the rest of today. Catches and damage still count. Come back tomorrow, when spaced practice sticks better anyway.</p>` : ''}</div>
      ${teamHTML()}
      <div class="grid-2" style="margin-top:1.2rem">
        <section class="card stack"><h2 style="font-size:1.15rem">Recent</h2>${log}</section>
        <section class="card stack"><h2 style="font-size:1.15rem">How it works</h2>
          <ul class="arc-rules">
            <li>⚔️ <b>Fight</b> takes you through one whole oral case that matches the creature (ones with questions that need work first). Your answers are marked right, partly right or wrong, the same as in the simulator and question bank</li>
            <li>🎯 You always play the whole case: the catch is decided at the end. Get ${Math.round(100 * MON_NEED[1])}% of the case right to catch a Lv ${TIER_LV[1]}, ${Math.round(100 * MON_NEED[2])}% for Lv ${TIER_LV[2]} and ${Math.round(100 * MON_NEED[3])}% for Lv ${TIER_LV[3]}, or it gets away. Its HP bar shows how much of the case is still to get right</li>
            <li>🔤 Select-all questions become “which one is right?” (or “which one isn’t?”), matching asks one row at a time, Rx conversions use the Rx grid, and open questions are a special move: say it out loud, reveal the model answer, then mark yourself</li>
            <li>✅ Right answer: damage and 10 XP. Half marks still do half damage</li>
            <li>💥 Fix a question that needed work (wrong or partly right last time): critical hit, double XP. Your partner’s favourite topics give ×1.25 XP, and each rank +10%. Bonuses never change damage, so only your answers decide a catch</li>
            <li>🌟 Get the whole case right for a perfect catch: double the catch XP, and the creature is marked Mastered in your Ocudex</li>
            <li>❌ Wrong answer: it hits back. If your partner faints, your strongest teammate still standing takes over. Fainted Ocumon rest until tomorrow, so share the fights out. If your whole team faints the creature escapes, but you lose nothing and can finish the case for practice</li>
            <li>🏃 <b>Run</b> finds another creature. New ones only turn up in the wild; ones you’ve caught can be battled again from the Ocudex</li>
            <li>🎓 Rarity follows the exam. <b>Common</b> (Lv ${TIER_LV[1]}) creatures match 3 or more cases from the 2022, 2025 and 2026 orals, so they turn up most and are the best ones to drill. <b>Uncommon</b> (Lv ${TIER_LV[2]}) match 1 or 2. <b>Rare</b> (Lv ${TIER_LV[3]}) are only in the notes, practice doc and slides</li>
            <li>🎲 Creatures you haven’t caught, groups with questions that need work and the group you just fought turn up more often; ones you’ve just seen turn up less, and so do cases you’ve just done</li>
            <li>🔁 Got it right already today? No XP. New questions beat repeats</li>
            <li>🌙 XP slows after ${MON_DAILY_XP} a day; HP is restored each morning</li>
            <li>🤝 Team points: 1 for each new creature and 1 for every ${MON_REPEATS} repeat catches. Every ${MON_UNLOCK} points, another Ocumon joins your team. Send out whoever you like: each keeps its own level and favourite topics</li>
            <li>⭐ Ranks up at Lv ${MON_RANK[0]} and Lv ${MON_RANK[1]}</li>
          </ul></section>
      </div>
      <section id="ocudex" style="margin-top:1.4rem;scroll-margin-top:5rem"><div class="row" style="justify-content:space-between;margin-bottom:.7rem"><h2 style="font-size:1.3rem">Ocudex</h2><span class="mono muted">${got} / ${total} caught</span></div>
        <div class="mon-meter xp" aria-hidden="true" style="margin-bottom:1rem"><span style="width:${(100 * got) / total}%"></span></div>
        ${dex}</section>
      <section class="card stack" style="margin-top:1.4rem"><h2 style="font-size:1.15rem">Your save</h2>
        <p class="muted" style="margin:0">Ocumon progress lives in this browser, alongside your right / partly right / wrong marks.</p>
        <div class="row" style="gap:.5rem"><button class="btn ghost small" data-act="mon-reset">Start Ocumon again</button></div></section>
    </div>`;
    btIntro();
  }
  // A fight: the battle beside (or, on a phone, pinned above) the case and the question, so every hit plays out
  // in view while you answer.
  function monHunt() {
    const { c, last: L } = hunt, fx = L && L.fx, t = hunt.turns[hunt.i], pal = companion();
    const qn = Math.min(hunt.i + 1, hunt.turns.length);
    const side = `<div class="bt-side mono" aria-hidden="true">${hunt.finished ? '✓' : `Q${qn}/${hunt.turns.length}`}</div>`;
    const endCls = hunt.over ? ` ${hunt.over}` : '';
    // After an answer the scene starts from the state before it (L.before) and btAnswer() animates the change.
    const play = !!(L && fx && !L.played);
    const msg = hunt.finished ? '' : hunt.over ? 'The battle is over. Finish the case for practice.' : `What will ${pal.name} do?`;
    const S = play ? L.before : hunt.over ? Object.assign({}, hunt.endS, { msg: L && !L.played ? '' : msg }) : btNow(msg);
    const scene = btScene(S, side, `hunt${play ? '' : endCls}`);
    if (hunt.finished) {
      const pct = Math.round((100 * hunt.got) / hunt.units), w = hunt.w, need = Math.round(100 * MON_NEED[w.tier]);
      const head = { caught: `🎉 You caught ${esc(w.name)}!`, fainted: `💫 ${Object.keys(mon().party).length > 1 ? 'Your whole team' : esc(pal.name)} fainted and ${esc(w.name)} got away`, fled: `${esc(w.name)} got away` }[hunt.over];
      view.innerHTML = `<div class="fade fight"><div class="fight-side">${scene}</div><div class="fight-main">${recordPanel(c, c.steps[c.steps.length - 1])}
        <section class="card stack bt-ask"><p class="label">Case complete</p><h2>${head}</h2>
          <p>You got <b>${pct}%</b> of this case right. ${hunt.over === 'caught' ? '' : `A ${wildLv(w)} creature needs ${need}% to catch. It still turns up in the wild, so you’ll get another go.`}</p>
          <div class="mon-meter xp" aria-hidden="true"><span style="width:${Math.min(100, pct)}%"></span></div>
          ${pct < 100 ? '<p class="muted" style="margin:0">Questions under full marks are marked as needing work, so fixing them in a later fight earns double XP.</p>' : ''}
          <div class="row"><button class="btn primary" data-act="mon-next" id="mon-next">Back to Ocumon →</button><button class="btn ghost small" data-act="mon-case" data-v="${c.id}">Run this case in the simulator</button></div>
        </section></div></div>`;
      const nb = document.getElementById('mon-next'); if (nb) nb.focus({ preventScroll: true });
      return;
    }
    const st = t.st;
    let body = '';
    if (t.kind === 'pick') {
      body = `${t.sub ? `<p class="bt-sub">${t.part ? `<span class="label">Match ${t.part[0]} of ${t.part[1]}: which goes with</span>` : ''}${esc(t.sub)}</p>` : ''}<div class="opts bt-moves">${t.perm.map((oi, n) => {
        if (!L) return `<button class="opt arc-opt bt-move" data-act="mon-pick" data-v="${oi}"><span class="arc-key mono" aria-hidden="true">${n + 1}</span><span>${esc(t.options[oi])}</span><span></span></button>`;
        const cls = oi === t.answer ? 'right' : oi === L.pick ? 'wrong' : 'dim';
        return `<div class="opt arc-opt bt-move ${cls}"><span class="arc-key mono" aria-hidden="true">${n + 1}</span><span>${esc(t.options[oi])}${t.src ? whyNote(st, t.src[oi]) : ''}</span><span class="tag">${oi === t.answer ? '✓' : oi === L.pick ? '✕' : ''}</span></div>`;
      }).join('')}</div>`;
    } else if (t.kind === 'rx') {
      body = L ? rxDetailHTML(c, st, L.rows) : `${rxInputHTML(c, st)}<div class="row"><button class="btn primary" data-act="mon-rx" id="mon-rx">Use move: check my Rx</button></div>`;
    } else if (!hunt.think && !L) {
      body = `<p class="bt-sub">Special move: answer out loud as you would to the examiner, then reveal the model answer and mark yourself honestly.</p>
        <div class="row"><button class="btn primary" data-act="mon-think" id="mon-think">Reveal model answer</button></div>`;
    } else {
      body = `<div class="model"><p class="label">Model answer</p>${st.model}</div>
        ${L ? '' : '<p class="bt-sub">How did you do? More of it said, more damage.</p><div class="row"><button class="btn" data-act="mon-self" data-v="10">Nailed it</button><button class="btn" data-act="mon-self" data-v="5">Partly</button><button class="btn" data-act="mon-self" data-v="0">Missed it</button></div>'}`;
    }
    let after = '';
    if (L) {
      if (fx) {
        const tags = [fx.crit && 'critical: needs-work question fixed', fx.eff && `bonus XP: ${pal.name}’s topic`, fx.repeat && 'repeat today: no XP', fx.tired && 'tired: quarter XP'].filter(Boolean);
        after += fx.dmg
          ? `<div class="arc-verdict ${L.ok ? 'good' : 'part'}"><b>${L.ok ? '✓' : '½'} ${fx.w.icon} ${esc(fx.w.name)} −${fx.dmg}</b><span class="arc-gain mono">${fx.xp ? `+${fx.xp} XP` : ''}</span></div>`
          : `<div class="arc-verdict bad"><b>✕ ${esc(fx.w.name)} hit back</b><span class="mono">−${fx.hurt} HP</span></div>`;
        if (tags.length) after += `<p class="mon-tags">${tags.map((x) => `<span class="pill">${esc(x)}</span>`).join('')}</p>`;
        if (fx.caught) after += `<div class="mon-catch"><div class="mon-art" aria-hidden="true">${fx.caught.icon}</div><div><h2>Caught ${esc(fx.caught.name)}!${fx.firstCatch ? ' <span class="pill good">New</span>' : ''}</h2><p>${esc(fx.caught.hint)}</p></div></div>`;
        (fx.joined || []).forEach((j) => { after += `<div class="mon-catch"><div class="mon-mate-art">${pxSprite(Object.assign({}, j, { rank: 0 }), 'front')}</div><div><h2>${esc(j.name)} joined your team!</h2><p>${esc(j.blurb)}</p></div></div>`; });
        if (fx.ranked) after += `<p class="mon-up">✨ ${esc(pal.name)} reached Lv ${fx.lvUp} and ranked up to ${'★'.repeat(fx.ranked)}</p>`;
        else if (fx.lvUp) after += `<p class="mon-up">⬆️ ${esc(pal.name)} reached Lv ${fx.lvUp}</p>`;
        if (fx.tagIn) after += `<div class="arc-verdict bad"><b>💫 ${esc(fx.down.name)} fainted. ${esc(fx.tagIn.name)} takes over.</b><span>${esc(fx.down.name)} rests until tomorrow</span></div>`;
        if (fx.fainted) after += `<div class="arc-verdict bad"><b>💫 ${esc(fx.down.name)} fainted and ${esc(fx.fainted.name)} got away.</b><span>No XP lost</span></div>`;
        if (fx.perfect) after += `<div class="arc-verdict good"><b>🌟 Perfect case: ${esc(fx.caught.name)} is Mastered</b><span class="arc-gain mono">+${25 * fx.caught.tier} bonus XP</span></div>`;
        if (fx.fled) after += `<div class="arc-verdict bad"><b>${esc(fx.fled.name)} got away.</b><span>Needed ${Math.round(100 * MON_NEED[fx.fled.tier])}% of the case</span></div>`;
      } else after += `<div class="arc-verdict ${L.ok ? 'good' : 'bad'}"><b>${L.ok ? '✓ Right' : L.points ? '½ Partly right' : '✕ Not quite'}</b><span class="mono">${L.points} / 10</span></div>`;
      // A select-all or matching question was cut down to fit, so its last turn shows the whole answer.
      if (t.last && t.kind !== 'self') {
        const full = st.type === 'multi' || st.type === 'match' ? `<p class="label">Full answer</p>${correctAnswerHTML(st)}` : '';
        after += `<div class="model">${full}<p class="label"${full ? ' style="margin-top:.8rem"' : ''}>Model answer</p>${st.model}</div>`;
      }
      after += `<div class="row"><button class="btn primary" data-act="mon-next" id="mon-next">${hunt.i >= hunt.turns.length - 1 ? 'Finish the case' : 'Next question'} →</button>${hunt.over ? '<button class="btn ghost small" data-act="mon-stop">Back to Ocumon</button>' : ''}</div>`;
    }
    view.innerHTML = `<div class="fade fight"><div class="fight-side">${scene}</div><div class="fight-main">${recordPanel(c, st)}
      <section class="card stack bt-ask">
        <div class="pills">${topicPill(st.topic)}<span class="pill">Question ${qn} of ${hunt.turns.length}</span>${hunt.fixed[t.s] && !L ? '<span class="pill warn">Needs work: double XP if right</span>' : ''}</div>
        <h2 class="arc-q">${esc(st.q)}</h2>
        ${body}${after}
        ${L ? '' : `<div class="row"><button class="btn ghost small" data-act="mon-stop">Run from this battle</button><span class="muted" style="font-size:.85rem">${t.kind === 'pick' ? 'Keys 1–4 answer, Enter moves on' : 'Enter moves on'}</span></div>`}
      </section></div></div>`;
    const nb = document.getElementById('mon-next'); if (nb && L) nb.focus({ preventScroll: true });
    if (play) { L.played = true; btAnswer(L.before, fx, L.ok); }
  }
  // Opens a fight's case in the simulator, as a one-case session.
  function simCase(id) {
    const c = caseById(id);
    if (!c) return;
    hunt = null;
    sim.mode = 'cases'; sim.kind = 'cases';
    const items = [{ c, intro: true }];
    c.steps.forEach((_, i) => items.push({ c, s: i }));
    sim.items = items; sim.i = 0; sim.score = 0; sim.max = 0; sim.results = []; sim.view = 'intro';
    prepStep();
    location.hash = '#sim';
  }
  document.addEventListener('keydown', (ev) => {
    if (location.hash !== '#mon' || !hunt || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const t = hunt.turns[hunt.i];
    if (t && t.kind === 'rx' && !hunt.last && ev.key === 'Enter' && ev.target.matches && ev.target.matches('.rxgrid input')) { ev.preventDefault(); huntRx(); return; }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
    if (t && t.kind === 'pick' && !hunt.last && /^[1-9]$/.test(ev.key)) { const oi = t.perm[Number(ev.key) - 1]; if (oi !== undefined) { ev.preventDefault(); huntPick(oi); } }
    else if ((hunt.last || hunt.finished) && ev.key === 'Enter' && ev.target.tagName !== 'BUTTON') { ev.preventDefault(); huntNext(); }
  });

  // ------------------------------------------------------------------ routing and events
  function route() {
    const r = (location.hash || '#sim').slice(1);
    document.querySelectorAll('.nav a').forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === `#${r}` ? 'page' : 'false'));
    scorePill.hidden = true;
    if (r === 'bank') renderBank();
    else if (r === 'rx') renderLab();
    else if (r === 'lenses') renderLenses();
    else if (r === 'facts') renderFacts();
    else if (r === 'mon') monRender();
    else renderSim();
    if (r !== 'mon') introSeen = null; // coming back to Ocumon plays the battle intro again
    monChip();
    try { localStorage.setItem(STORE_KEY + ':route', r); } catch (e) { /* ignore */ }
  }
  window.addEventListener('hashchange', route);

  // Keep focus (and the on-screen keyboard) in the field when tapping the sign button.
  document.addEventListener('pointerdown', (ev) => { if (ev.target.closest('.sign-btn')) ev.preventDefault(); });
  document.addEventListener('click', (ev) => {
    const sb = ev.target.closest('.sign-btn');
    if (sb) {
      const inp = document.getElementById(sb.dataset.sign);
      const v = inp.value.trim();
      inp.value = /^[-−]/.test(v) ? '+' + v.slice(1) : '-' + v.replace(/^\+/, '');
      inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act, v = b.dataset.v;
    switch (act) {
      case 'toggle-cat': sim.cats.has(v) ? sim.cats.delete(v) : sim.cats.add(v); sim.count = 0; renderSim(); break;
      case 'toggle-topic': sim.topics.has(v) ? sim.topics.delete(v) : sim.topics.add(v); sim.count = 0; renderSim(); break;
      case 'all-cats': (sim.mode === 'cases' ? Object.keys(CATS) : Object.keys(TOPICS)).forEach((k) => (sim.mode === 'cases' ? sim.cats : sim.topics).add(k)); sim.count = 0; renderSim(); break;
      case 'no-cats': (sim.mode === 'cases' ? sim.cats : sim.topics).clear(); sim.count = 0; renderSim(); break;
      case 'mode': sim.mode = v; sim.pool = 'all'; sim.count = 0; renderSim(); break;
      case 'source': sim.source = v; sim.count = 0; renderSim(); break;
      case 'pool': sim.pool = v; sim.count = 0; renderSim(); break;
      case 'count': sim.count = Math.max(1, Math.min(poolSize(), sim.count + Number(v))); renderSim(); break;
      case 'count-max': sim.count = poolSize(); renderSim(); break;
      case 'start': buildSession(); break;
      case 'begin': sim.i++; sim.view = 'question'; prepStep(); renderSim(); break;
      case 'pick': {
        const st = curStep(), n = Number(v);
        if (st.type === 'mcq') sim.picked = new Set([n]);
        else sim.picked.has(n) ? sim.picked.delete(n) : sim.picked.add(n);
        document.querySelectorAll('.opt[data-act="pick"]').forEach((el) => el.setAttribute('aria-pressed', String(sim.picked.has(Number(el.dataset.v)))));
        const sb = document.getElementById('submit-btn'); if (sb) sb.disabled = !sim.picked.size;
        break;
      }
      case 'submit': submit(); break;
      case 'reveal': sim.revealed = true; renderSim(); break;
      case 'self': selfMark(Number(v)); break;
      case 'next': next(); break;
      case 'quit': sim.view = sim.results.length ? 'end' : 'start'; renderSim(); break;
      case 'restart': sim.view = 'start'; sim.count = 0; renderSim(); break;
      case 'bank-topic': bank.topic = v; renderBank(); break;
      case 'bank-mark': setResult(b.dataset.key, Number(v)); persist(); bank.open.add(b.dataset.key); renderBank(); break;
      case 'drill-topic': startSession(shuffled(poolSteps(b.dataset.pool, new Set([v]))).slice(0, 15), 'drill'); break;
      case 'redo': startSession(sim.results.filter((r) => r.points < PTS).map((r) => ({ c: r.c, s: r.s })), 'drill'); break;
      case 'clear-progress':
        if (confirm('Clear your right / partly right / wrong marks on every question? Ocumon partners and the Ocudex are kept.')) {
          saved.res = {}; saved.missed = {}; saved.seen = {}; saved.done = {}; saved.bank = {}; persist(); renderSim();
        }
        break;
      case 'drill-new': newDrill(); break;
      case 'to-guide': { const g = document.getElementById('guide'); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); break; }
      case 'drill-check': checkDrill(); break;
      case 'lens-mod': lensView.modality = v; renderLenses(); break;
      case 'lens-type': lensView.type = v; renderLenses(); break;
      case 'lens-kind': lensView.kind = v; try { localStorage.setItem(STORE_KEY + ':lenskind', v); } catch (e) { /* ignore */ } renderLenses(); window.scrollTo(0, 0); break;
      case 'stab-go': { const el = document.getElementById('stab-' + v); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); break; }
      case 'rgp-group': lensView.group = v; renderLenses(); break;
      case 'mon-starter': monChoose(v); break;
      case 'mon-hunt': huntStart(); break;
      case 'mon-chase': monChase(v); break;
      case 'mon-reroll': btRun(); break;
      case 'mon-bag': document.getElementById('ocudex').scrollIntoView({ behavior: calm() ? 'auto' : 'smooth' }); break;
      case 'mon-party': btParty(); break;
      case 'mon-switch': btSwitch(v); break;
      case 'bt-skip': fxFast = true; break;
      case 'mon-pick': huntPick(Number(v)); break;
      case 'mon-rx': huntRx(); break;
      case 'mon-think': hunt.think = true; monRender({ keepScroll: true }); break;
      case 'mon-self': huntSelf(Number(v)); break;
      case 'mon-next': huntNext(); break;
      case 'mon-stop': hunt = null; monRender({ keepScroll: true }); break;
      case 'mon-case': simCase(v); break;
      case 'mon-reset':
        if (confirm('Start Ocumon again? Your partners, their levels and your Ocudex are cleared. Your right / partly right / wrong marks are not touched.')) { saved.mon = cleanMon({}); hunt = null; persist(); monRender(); }
        break;
      case 'theme': {
        const root = document.documentElement;
        const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
        root.dataset.theme = dark ? 'light' : 'dark';
        try { localStorage.setItem(STORE_KEY + ':theme', root.dataset.theme); } catch (e) { /* ignore */ }
        break;
      }
      default: break;
    }
  });
  // Remember what's typed so a re-render (tab switch, reveal, reload) doesn't wipe it.
  function remember(el) {
    const id = el.id;
    if (!id || !('value' in el)) return;
    if (KEEP.test(id)) { fields[id] = el.value; try { localStorage.setItem(FIELDS_KEY, JSON.stringify(fields)); } catch (e) { /* ignore */ } }
    else if (id.startsWith('d-')) lab.typed[id.slice(2)] = el.value;
    else if (location.hash !== '#mon' && sim.view === 'question' && /^(rx-|m-|open-notes$)/.test(id)) sim.draft[id] = el.value;
  }
  document.addEventListener('input', (ev) => {
    remember(ev.target);
    const id = ev.target.id;
    if (id === 'count-range') { sim.count = Number(ev.target.value); const o = document.getElementById('count-out'); if (o) o.textContent = sim.count; const s = document.querySelector('[data-act="start"]'); if (s) s.textContent = `Start ${sim.count} ${sim.mode === 'cases' ? (sim.count === 1 ? 'case' : 'cases') : 'questions'}`; }
    else if (id === 'bank-q') { bank.q = ev.target.value; const pos = ev.target.selectionStart; renderBank(); const el = document.getElementById('bank-q'); el.focus(); el.setSelectionRange(pos, pos); }
    else if (id && id.startsWith('c-')) calc();
    else if (id && id.startsWith('l-')) lars();
    else if (id && id.startsWith('f-')) finder();
    else if (id && id.startsWith('g-')) rgpCalc();
  });
  document.addEventListener('change', (ev) => {
    remember(ev.target);
    if (ev.target.id === 'bank-status') { bank.status = ev.target.value; renderBank(); }
    else if (ev.target.id && ev.target.id.startsWith('c-')) calc();
    else if (ev.target.id && ev.target.id.startsWith('l-')) lars();
  });
  document.addEventListener('toggle', (ev) => {
    const d = ev.target;
    if (d.classList && d.classList.contains('qitem')) { d.open ? bank.open.add(d.dataset.key) : bank.open.delete(d.dataset.key); }
  }, true);
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && location.hash !== '#mon' && sim.view === 'question' && ev.target.matches && ev.target.matches('.rxgrid input')) { ev.preventDefault(); submit(); }
    if (ev.key === 'Enter' && ev.target.matches && ev.target.matches('#drill input')) { ev.preventDefault(); checkDrill(); }
  });

  try { const t = localStorage.getItem(STORE_KEY + ':theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) { /* ignore */ }
  route();
})();
