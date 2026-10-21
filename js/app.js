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
  const KEEP = /^[clf]-/;
  let fields = {};
  try { fields = JSON.parse(localStorage.getItem(FIELDS_KEY)) || {}; } catch (e) { /* storage unavailable */ }
  function restoreFields() {
    view.querySelectorAll('input[id], select[id]').forEach((el) => { if (KEEP.test(el.id) && fields[el.id] !== undefined) el.value = fields[el.id]; });
  }
  const stepKey = (c, i) => `${c.id}#${i}`;

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
    || (sim.source === 'notes' ? !/^20\d\d/.test(c.source) : c.source.startsWith(sim.source));
  function poolCases() {
    return CASES.filter((c) => sim.cats.has(c.cat) && casePasses(c)).filter((c) => {
      if (sim.pool === 'new') return !saved.done[c.id];
      if (sim.pool === 'missed') return c.steps.some((_, i) => saved.missed[stepKey(c, i)]);
      return true;
    });
  }
  function poolSteps() {
    const out = [];
    CASES.filter(casePasses).forEach((c) => c.steps.forEach((s, i) => {
      if (!sim.topics.has(s.topic)) return;
      const k = stepKey(c, i);
      if (sim.pool === 'new' && saved.seen[k]) return;
      if (sim.pool === 'missed' && !saved.missed[k]) return;
      out.push({ c, s: i });
    }));
    return out;
  }
  const poolSize = () => (sim.mode === 'cases' ? poolCases().length : poolSteps().length);
  function clampCount() {
    const max = poolSize();
    if (!sim.count || sim.count > max) sim.count = Math.min(max, sim.mode === 'cases' ? 4 : 15);
    if (max > 0 && sim.count < 1) sim.count = 1;
  }

  function startSession(items) {
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
    saved.seen[k] = 1;
    if (points < PTS) saved.missed[k] = 1; else delete saved.missed[k];
    sim.results.push({ c: it.c, s: it.s, points });
    const lastOfCase = !sim.items[sim.i + 1] || sim.items[sim.i + 1].c !== it.c || sim.items[sim.i + 1].intro;
    if (lastOfCase && sim.mode === 'cases') saved.done[it.c.id] = 1;
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
      const pts = right === total ? PTS : right >= 4 ? PTS / 2 : 0;
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
    const all = isCases ? CASES.filter((c) => sim.cats.has(c.cat) && casePasses(c)) : null;
    const counts = isCases
      ? { all: all.length, new: all.filter((c) => !saved.done[c.id]).length, missed: all.filter((c) => c.steps.some((_, i) => saved.missed[stepKey(c, i)])).length }
      : (() => { const p = sim.pool; const r = {}; ['all', 'new', 'missed'].forEach((k) => { sim.pool = k; r[k] = poolSteps().length; }); sim.pool = p; return r; })();
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
              ${[['all', 'All sources'], ['2025', '2025 orals'], ['2022', '2022 orals'], ['notes', 'Notes, practice doc & slides']].map(([s, label]) => `<button class="chip" data-act="source" data-v="${s}" aria-pressed="${sim.source === s}">${label}</button>`).join('')}
            </div>
          </div>
          <div>
            <p class="label">Pool</p>
            <div class="seg">
              ${['all', 'new', 'missed'].map((p) => `<button data-act="pool" data-v="${p}" aria-pressed="${sim.pool === p}" ${counts[p] ? '' : 'disabled'}>${p[0].toUpperCase() + p.slice(1)}<small>${counts[p]}</small></button>`).join('')}
            </div>
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
    </div>`;
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
    if (sim.mode === 'cases') {
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
      const from = st.from ? `<p class="muted" style="font-size:.9rem">Working from: <span class="mono">R ${esc(rxStr(st.from.R))} · L ${esc(rxStr(st.from.L))}</span></p>` : '';
      body = `${st.from ? from : `<div style="margin-bottom:.8rem"><p class="label">Spectacle Rx</p>${padHTML(c.spec)}</div>`}<div class="rxgrid">
        <span></span><span class="label">Sphere</span><span class="label">Cyl</span><span class="label">Axis</span>
        ${['R', 'L'].map((e) => `<span class="eye">${e}</span>${['sph', 'cyl', 'axis'].map((f) => f === 'axis' ? `<input type="text" inputmode="numeric" autocomplete="off" id="rx-${e}-${f}" aria-label="${e} ${f}" placeholder="×">` : signed(`<input type="text" inputmode="decimal" autocomplete="off" id="rx-${e}-${f}" aria-label="${e} ${f}" placeholder="±0.00">`, `rx-${e}-${f}`)).join('')}`).join('')}
      </div>
      <p class="muted" style="font-size:.85rem;margin-top:.6rem">Type values like +5.25, −2.25, 20 (tap ± to flip the sign). Use "pl" for plano; for a DS answer put 0 in cyl and leave axis blank.</p>
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

  function viewFeedback() {
    const it = cur(), c = it.c, st = curStep(), L = sim.last;
    const head = { good: ['✓', 'Correct'], part: ['½', 'Partly right'], bad: ['✕', 'Not quite'] }[L.outcome];
    const quote = L.outcome === 'good' ? st.good : st.bad || st.good;
    let detail = '';
    if (st.type === 'mcq') {
      detail = `<div class="opts">${sim.perm.map((oi) => {
        const cls = oi === st.answer ? 'right' : oi === L.detail.pick ? 'wrong' : '';
        return `<div class="opt ${cls}"><span class="dot" aria-hidden="true"></span><span>${esc(st.options[oi])}</span></div>`;
      }).join('')}</div>`;
    } else if (st.type === 'multi') {
      const want = new Set(st.answers), got = new Set(L.detail.picked);
      detail = `<div class="opts">${sim.perm.map((oi) => {
        const cls = want.has(oi) ? 'right' : got.has(oi) ? 'wrong' : '';
        const note = want.has(oi) && !got.has(oi) ? ' <span class="pill bad">missed</span>' : !want.has(oi) && got.has(oi) ? ' <span class="pill bad">shouldn\'t pick</span>' : '';
        return `<div class="opt box ${cls}"><span class="dot" aria-hidden="true"></span><span>${esc(st.options[oi])}${note}</span></div>`;
      }).join('')}</div>`;
    } else if (st.type === 'rx') {
      const src = st.from || c.spec;
      detail = `<div class="tablewrap"><table class="t"><tr><th>Eye</th><th>Field</th><th>You</th><th>Accepted</th></tr>
        ${L.detail.rows.map((r) => `<tr><td class="mono">${r.e}</td><td>${r.f}</td><td class="mono">${esc(r.raw || '—')} <span class="${r.ok ? 'ok' : 'no'}">${r.ok ? '✓' : '✕'}</span></td>
        <td class="mono">${r.acc.length ? r.acc.map((a) => (r.f === 'axis' ? a : D(a))).join(' or ') : 'none (DS)'}</td></tr>`).join('')}</table></div>
        <div class="crosses">${['R', 'L'].map((e) => crossSVG(src[e], e === 'R' ? 'Right eye' : 'Left eye')).join('')}</div>
        <div class="tablewrap"><table class="t"><tr><th>Eye</th><th>Meridian 1</th><th>Meridian 2</th><th>Exact cyl</th><th>Exact SE</th></tr>${workings(src)}</table></div>`;
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
    const verdict = pct >= 85 ? 'Exam-ready on these cases. Keep the numbers fresh.' : pct >= 65 ? 'A pass, but the "what else?" follow-ups would cost you. Review the misses.' : 'Not there yet. Work through the misses and the Fact check page, then go again.';
    const byCase = [];
    sim.results.forEach((r) => {
      let row = byCase.find((x) => x.c === r.c);
      if (!row) { row = { c: r.c, got: 0, max: 0, miss: [] }; byCase.push(row); }
      row.got += r.points; row.max += PTS;
      if (r.points < PTS) row.miss.push(r.c.steps[r.s].phase);
    });
    return `<section class="card stack" style="max-width:46rem;margin:1rem auto">
      <p class="label">Session complete</p>
      <div class="row" style="align-items:baseline"><span class="big-score">${sim.score}</span><span class="muted mono" style="font-size:1.4rem">/ ${sim.max} · ${pct}%</span></div>
      <div class="says"><span class="who">${esc(EXAMINER)}</span><p>${esc(verdict)}</p></div>
      <div>${byCase.map((r) => `<div class="result-row"><div><b>${esc(r.c.title)}</b><br><small class="muted">${r.miss.length ? 'Missed: ' + esc([...new Set(r.miss)].join(', ')) : 'Clean sweep'}</small></div><span class="mono">${r.got}/${r.max}</span></div>`).join('')}</div>
      <div class="row"><button class="btn primary" data-act="restart">Back to setup</button><a class="btn" href="#bank">Review in the question bank</a></div>
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
  function bankStatus(it) {
    if (saved.bank[it.key]) return saved.bank[it.key];
    if (saved.missed[it.key]) return 'missed';
    return '';
  }
  function correctAnswerHTML(st) {
    if (!st) return '';
    if (st.type === 'mcq') return `<div><p class="label">Best answer</p><p>${esc(st.options[st.answer])}</p></div>`;
    if (st.type === 'multi') return `<div><p class="label">Correct selections</p><ul class="answer-list">${st.answers.map((a) => `<li>${esc(st.options[a])}</li>`).join('')}</ul></div>`;
    if (st.type === 'match') return `<div class="tablewrap"><table class="t">${st.rows.map((r) => `<tr><td><b>${esc(r.label)}</b></td><td>${esc(r.options[r.answer])}</td></tr>`).join('')}</table></div>`;
    if (st.type === 'rx') return `<div><p class="label">Accepted CL Rx</p><div class="pad">${['R', 'L'].map((e) => `<div><span class="eye">${e}</span>${st.accept[e].sph.map((x) => D(x)).join(' or ')}${st.accept[e].axis.length ? ` / ${st.accept[e].cyl.map((x) => D(x)).join(' or ')} × ${st.accept[e].axis.join(' or ')}` : ' DS'}</div>`).join('')}</div></div>`;
    return '';
  }
  function renderBank() {
    const all = bankItems();
    const ql = bank.q.trim().toLowerCase();
    const list = all.filter((it) => (bank.topic === 'all' || it.topic === bank.topic)
      && (bank.status === 'all' || (bank.status === 'unmarked' ? !bankStatus(it) : bankStatus(it) === bank.status))
      && (!ql || (it.q + ' ' + it.model + ' ' + it.source).toLowerCase().includes(ql)));
    const counts = {};
    all.forEach((it) => { counts[it.topic] = (counts[it.topic] || 0) + 1; });
    view.innerHTML = `<div class="fade">
      <section class="hero"><div><p class="label">Question bank</p><h1>Every question, sorted by topic</h1>
      <p>${all.length} questions: each examiner step from the oral cases plus the past-paper theory questions. Open one, answer it out loud, then check the model answer and mark it.</p></div></section>
      <div class="toolbar">
        <input type="search" id="bank-q" placeholder="Search (e.g. Aldox, LARS, bitoric)" value="${esc(bank.q)}" aria-label="Search questions">
        <select id="bank-status" aria-label="Filter by status" style="width:auto">
          ${[['all', 'All statuses'], ['unmarked', 'Not yet marked'], ['known', 'Got it'], ['missed', 'Review again']].map(([v, l]) => `<option value="${v}" ${bank.status === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="row" style="gap:.4rem;margin-bottom:1rem">
        <button class="chip" data-act="bank-topic" data-v="all" aria-pressed="${bank.topic === 'all'}">All topics · ${all.length}</button>
        ${Object.entries(TOPICS).map(([id, n]) => `<button class="chip" data-act="bank-topic" data-v="${id}" aria-pressed="${bank.topic === id}">${esc(n)} · ${counts[id] || 0}</button>`).join('')}
      </div>
      <p class="muted" style="font-size:.9rem">${list.length} shown</p>
      <div class="stack" id="bank-list">${list.map((it) => {
        const stt = bankStatus(it);
        return `<details class="qitem ${stt}" data-key="${esc(it.key)}" ${bank.open.has(it.key) ? 'open' : ''}>
          <summary><div><div class="qtext">${esc(it.q)}</div><div class="qmeta">${topicPill(it.topic)}<span class="pill">${esc(it.source)}</span>${stt === 'known' ? '<span class="pill good">Got it</span>' : stt === 'missed' ? '<span class="pill bad">Review again</span>' : ''}</div></div><span class="muted" aria-hidden="true">▾</span></summary>
          <div class="body">${correctAnswerHTML(it.step)}<div class="model"><p class="label">Model answer</p>${it.model}</div>
          <div class="row"><button class="btn" data-act="bank-mark" data-v="known" data-key="${esc(it.key)}">Got it</button><button class="btn" data-act="bank-mark" data-v="missed" data-key="${esc(it.key)}">Review again</button></div></div>
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
  const lensView = { modality: 'all', type: 'all' };
  function renderLenses() {
    const mods = ['all', 'Daily', 'Two-weekly', 'Monthly'], types = ['all', 'Toric', 'Toric multifocal', 'Sphere'];
    const list = LENSES.filter((l) => (lensView.modality === 'all' || l.modality === lensView.modality) && (lensView.type === 'all' || l.type === lensView.type));
    const sphTxt = (l) => `${D(l.sph.max)} to ${D(l.sph.min)}${l.sph.fine ? ` (0.50 steps beyond ±${l.sph.fine.toFixed(2)})` : ''}`;
    view.innerHTML = `<div class="fade">
    <section class="hero"><div><p class="label">Lens guide · Australia</p><h1>Know the ranges before you are asked</h1>
    <p>Parameters for the lenses that come up in the orals, checked October 2026. <span class="pill warn">confirm</span> marks figures to double-check against the current Australian fitting guide.</p></div></section>
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
      <dt>Stabilisation</dt><dd>${esc(l.stab)}</dd><dt>Overnight</dt><dd>${esc(l.ew)}</dd></dl>
      ${l.notes ? `<p class="muted" style="font-size:.9rem;margin:0">${esc(l.notes)}</p>` : ''}</article>`).join('')}</div>
    <section style="margin-top:2rem" class="stack"><h2>Care systems</h2><div class="tablewrap"><table class="t"><tr><th>Product</th><th>Type</th><th>Actives</th><th>Soak</th><th>Notes</th></tr>
      ${SOLUTIONS.map((s) => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.kind)}</td><td>${esc(s.actives)}</td><td class="mono">${esc(s.soak)}</td><td>${esc(s.notes)}</td></tr>`).join('')}</table></div></section>
    <section style="margin-top:2rem" class="stack"><h2>RGP materials</h2><div class="tablewrap"><table class="t"><tr><th>Material</th><th>Family</th><th>Dk</th><th>Notes</th></tr>
      ${RGP_MATERIALS.map((m) => `<tr><td><b>${esc(m.name)}</b></td><td>${esc(m.family)}</td><td class="mono">${esc(m.dk)}</td><td>${esc(m.notes)}</td></tr>`).join('')}</table></div></section>
    </div>`;
    restoreFields(); finder();
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
    <p>The 2022 and 2025 notes are student recollections and answers, written under pressure. These are the claims that needed correcting or updating. The case answer keys already use the corrected versions.</p></div></section>
    <div class="stack">${FACTCHECK.map((f) => `<article class="card fc"><div class="row" style="gap:.5rem"><span class="pill ${cls(f.verdict)}">${esc(f.verdict)}</span></div>
      <p class="claim">"${esc(f.claim)}"</p><p style="margin:0">${esc(f.fix)}</p></article>`).join('')}</div>
    <section class="card stack" style="margin-top:2rem"><h2 style="font-size:1.15rem">Sources checked</h2>
      <ul>${SOURCES.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('')}</ul>
      <p class="muted" style="margin:0">Several manufacturer pages for Australia couldn't be reached directly, so some ranges come from the manufacturers' global pages and Australian retailer notices. Those are flagged "confirm" in the lens guide.</p></section>
    </div>`;
  }

  // ------------------------------------------------------------------ routing and events
  function route() {
    const r = (location.hash || '#sim').slice(1);
    document.querySelectorAll('.nav a').forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === `#${r}` ? 'page' : 'false'));
    scorePill.hidden = true;
    if (r === 'bank') renderBank();
    else if (r === 'rx') renderLab();
    else if (r === 'lenses') renderLenses();
    else if (r === 'facts') renderFacts();
    else renderSim();
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
      case 'bank-mark': saved.bank[b.dataset.key] = v; if (v === 'known') delete saved.missed[b.dataset.key]; persist(); bank.open.add(b.dataset.key); renderBank(); break;
      case 'drill-new': newDrill(); break;
      case 'to-guide': { const g = document.getElementById('guide'); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); break; }
      case 'drill-check': checkDrill(); break;
      case 'lens-mod': lensView.modality = v; renderLenses(); break;
      case 'lens-type': lensView.type = v; renderLenses(); break;
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
    else if (sim.view === 'question' && /^(rx-|m-|open-notes$)/.test(id)) sim.draft[id] = el.value;
  }
  document.addEventListener('input', (ev) => {
    remember(ev.target);
    const id = ev.target.id;
    if (id === 'count-range') { sim.count = Number(ev.target.value); const o = document.getElementById('count-out'); if (o) o.textContent = sim.count; const s = document.querySelector('[data-act="start"]'); if (s) s.textContent = `Start ${sim.count} ${sim.mode === 'cases' ? (sim.count === 1 ? 'case' : 'cases') : 'questions'}`; }
    else if (id === 'bank-q') { bank.q = ev.target.value; const pos = ev.target.selectionStart; renderBank(); const el = document.getElementById('bank-q'); el.focus(); el.setSelectionRange(pos, pos); }
    else if (id && id.startsWith('c-')) calc();
    else if (id && id.startsWith('l-')) lars();
    else if (id && id.startsWith('f-')) finder();
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
    if (ev.key === 'Enter' && sim.view === 'question' && ev.target.matches && ev.target.matches('.rxgrid input')) { ev.preventDefault(); submit(); }
    if (ev.key === 'Enter' && ev.target.matches && ev.target.matches('#drill input')) { ev.preventDefault(); checkDrill(); }
  });

  try { const t = localStorage.getItem(STORE_KEY + ':theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) { /* ignore */ }
  route();
})();
