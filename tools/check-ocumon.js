// Checks every Ocumon creature in js/data-ocumon.js matches at least one case with scored questions,
// and prints its rarity. Run: node tools/check-ocumon.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { window: {} };
vm.createContext(ctx);
['js/cases-2026.js', 'js/cases-2025.js', 'js/cases-2022.js', 'js/cases-notes.js', 'js/cases-practice.js', 'js/cases-predicted.js', 'js/data-ocumon.js']
  .forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const CASES = ctx.window.CASES || [];
const MON = ctx.window.OCUMON;
const TIER = ['', 'Common', 'Uncommon', 'Rare'];
let bad = 0;
const ids = new Set();
MON.wild.forEach((w) => {
  if (ids.has(w.id)) { console.log(`✕ duplicate id ${w.id}`); bad++; }
  ids.add(w.id);
  const re = new RegExp(w.match, 'i');
  const cs = CASES.filter((c) => re.test(`${c.title} ${c.theme || ''}`));
  const exam = cs.filter((c) => /^20\d\d/.test(c.source)).length;
  const tier = w.tier || (exam >= 3 ? 1 : exam ? 2 : 3);
  const ok = cs.length > 0;
  if (!ok) bad++;
  console.log(`${ok ? '✓' : '✕'} ${w.name.padEnd(15)} ${TIER[tier].padEnd(9)} ${String(cs.length).padStart(2)} cases (${exam} from the orals)  ${cs.map((c) => c.id).join(', ')}`);
});
const topics = new Set(CASES.flatMap((c) => c.steps.map((s) => s.topic)));
MON.partners.forEach((p) => p.strong.forEach((t) => { if (!topics.has(t)) { console.log(`✕ ${p.name}: unknown topic ${t}`); bad++; } }));
MON.partners.forEach((p) => { if (!fs.existsSync(path.join(root, 'img/sprites', `${p.sprite}.png`))) { console.log(`✕ ${p.name}: missing sprite ${p.sprite}.png`); bad++; } });
console.log(`\n${MON.wild.length} creatures, ${MON.partners.length} partners, ${bad ? `${bad} problem(s)` : 'no problems'}.`);
process.exit(bad ? 1 : 0);
