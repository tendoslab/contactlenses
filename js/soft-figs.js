/* Diagrams for the soft toric stabilisation designs in the lens guide: a front view of the
 * lens between the lids, shaded by thickness, and thickness profiles along 12→6 and 9→3.
 * Schematic: thickness is relative, not measured. Colours come from CSS (.softfig …). */
(function () {
  const f1 = (n) => n.toFixed(1);
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const OZ = 0.55; // optic zone radius as a fraction of the lens radius
  const blob = (x, y, cx, cy, s) => Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s));

  /* Relative thickness at (x, y) on the unit lens: x to the viewer's right (3 o'clock), y down (6 o'clock). */
  const THICK = {
    prism: (x, y) => 0.2 + 0.55 * (y + 1) / 2,
    trunc: (x, y) => 0.2 + 0.55 * (y + 1) / 2,
    peri: (x, y, r) => 0.28 + 0.6 * clamp((y - 0.3) / 0.45) * clamp((r - OZ) / 0.15),
    pb84: (x, y, r) => 0.3 - 0.1 * clamp(-y / 0.6) * clamp((r - OZ) / 0.15) + 0.5 * clamp((y / (r || 1) - 0.3) / 0.3) * clamp((r - OZ) / 0.15),
    asd: (x, y) => 0.24 + 0.62 * [[0.68, 0.25], [0.68, -0.25], [-0.68, 0.25], [-0.68, -0.25]].reduce((a, [cx, cy]) => Math.max(a, blob(x, y, cx, cy, 0.15)), 0),
    dyn: (x, y, r) => 0.28 + (0.55 * (x / (r || 1)) ** 2 - 0.12) * clamp((r - OZ) / 0.15),
  };
  const thick = (id, x, y) => {
    const r = Math.hypot(x, y);
    const taper = r < 0.86 ? 1 : 0.2 + 0.8 * Math.max(0, 1 - r) / 0.14;
    return Math.max(0.05, THICK[id](x, y, r) * taper);
  };
  const CUT = 0.78; // truncation line (fraction of radius below centre)

  const LIDS = (cx, cy, R) => {
    const up = `M${cx - 60} ${cy - R - 20}H${cx + 60}V${cy - 10}Q${cx} ${cy - 60} ${cx - 60} ${cy - 10}Z`;
    const lo = `M${cx - 60} ${cy + R + 20}H${cx + 60}V${cy + 18}Q${cx} ${cy + 58} ${cx - 60} ${cy + 18}Z`;
    return `<path class="lid" d="${up}"/><path class="lid" d="${lo}"/>`;
  };

  function front(id, cx, cy, R, uid) {
    const step = 3, cells = [];
    for (let py = cy - R; py < cy + R; py += step) {
      for (let px = cx - R; px < cx + R; px += step) {
        const x = (px + step / 2 - cx) / R, y = (py + step / 2 - cy) / R;
        if (Math.hypot(x, y) > 1.02) continue;
        const t = Math.round(thick(id, x, y) * 8) / 8;
        cells.push(`<rect x="${px}" y="${py}" width="${step + 0.4}" height="${step + 0.4}" fill-opacity="${t.toFixed(3)}"/>`);
      }
    }
    const cut = id === 'trunc' ? cy + CUT * R : cy + R;
    const clip = `<clipPath id="${uid}"><circle cx="${cx}" cy="${cy}" r="${R}"/>${''}</clipPath>`
      + (id === 'trunc' ? `<clipPath id="${uid}t"><rect x="${cx - R}" y="${cy - R}" width="${2 * R}" height="${cut - (cy - R)}"/></clipPath>` : '');
    const outline = id === 'trunc'
      ? (() => { const hx = Math.sqrt(R * R - (CUT * R) ** 2); return `<path class="edge" d="M${f1(cx - hx)} ${f1(cut)}A${R} ${R} 0 1 1 ${f1(cx + hx)} ${f1(cut)}Z"/>`; })()
      : `<circle class="edge" cx="${cx}" cy="${cy}" r="${R}"/>`;
    return `<defs>${clip}</defs><ellipse class="sclera" cx="${cx}" cy="${cy}" rx="62" ry="${R + 8}"/><circle class="iris" cx="${cx}" cy="${cy}" r="${R * 0.62}"/>`
      + `<g clip-path="url(#${uid})"${id === 'trunc' ? '' : ''}><g${id === 'trunc' ? ` clip-path="url(#${uid}t)"` : ''} class="thick">${cells.join('')}</g></g>`
      + outline + `<circle class="oz" cx="${cx}" cy="${cy}" r="${f1(R * OZ)}"/>`
      + LIDS(cx, cy, R)
      + `<path class="mark" d="M${cx} ${f1(cy + R * 0.82)}V${f1(cy + R * 0.94)}"/>`;
  }

  function profile(id, x0, y0, w, h, axis) {
    const n = 60, pts = [];
    for (let i = 0; i <= n; i++) {
      const u = -1 + (2 * i) / n;
      if (axis === 'v' && id === 'trunc' && u > CUT) break;
      const t = axis === 'v' ? thick(id, 0, u) : thick(id, u, 0);
      pts.push([x0 + ((u + 1) / 2) * w, y0 - t * h]);
    }
    const last = pts[pts.length - 1][0];
    const d = `M${x0} ${y0}` + pts.map(([x, y]) => `L${f1(x)} ${f1(y)}`).join('') + `L${f1(last)} ${y0}Z`;
    const [a, b] = axis === 'v' ? ['12', id === 'trunc' ? 'cut' : '6'] : ['9', '3'];
    return `<text class="ttl" x="${x0}" y="${y0 - h - 6}">${axis === 'v' ? 'Thickness, 12 → 6 o\'clock' : 'Thickness, 9 → 3 o\'clock'}</text>`
      + `<path class="base" d="M${x0} ${y0}H${x0 + w}"/><path class="prof" d="${d}"/>`
      + `<text x="${x0}" y="${y0 + 9}">${a}</text><text x="${f1(last)}" y="${y0 + 9}" text-anchor="end">${b}</text>`;
  }

  const LEGEND = '<span><i class="sw thin"></i>Thin</span><span><i class="sw thk"></i>Thick</span><span><i class="sw oz"></i>Optic zone</span><span><i class="sw mk"></i>6 o\'clock mark</span>';

  window.softStabFigure = function (id, name) {
    if (!THICK[id]) return '';
    const uid = 'sf-' + id;
    return `<figure class="rgpfig softfig"><svg viewBox="0 0 260 132" role="img" aria-label="Front view and thickness profile of a ${name}">
      ${front(id, 66, 66, 44, uid)}${profile(id, 150, 56, 100, 26, 'v')}${profile(id, 150, 114, 100, 26, 'h')}</svg>
      <figcaption>${LEGEND}</figcaption></figure>`;
  };

  /* Reading rotation: mark 10° to the viewer's left → Left Add. */
  window.larsFigure = function () {
    const cx = 66, cy = 66, R = 44, rot = 10 * Math.PI / 180;
    const mx = cx - Math.sin(rot) * R, my = cy + Math.cos(rot) * R;
    const ax = cx - Math.sin(rot) * (R + 10), ay = cy + Math.cos(rot) * (R + 10);
    return `<figure class="rgpfig softfig"><svg viewBox="0 0 260 132" role="img" aria-label="Toric lens rotated 10 degrees to the left, read with LARS">
      <ellipse class="sclera" cx="${cx}" cy="${cy}" rx="62" ry="${R + 8}"/><circle class="iris" cx="${cx}" cy="${cy}" r="${R * 0.62}"/>
      <circle class="edge lensfill" cx="${cx}" cy="${cy}" r="${R}"/>
      ${LIDS(cx, cy, R)}
      <path class="ref" d="M${cx} ${cy}V${cy + R + 12}"/>
      <path class="mark" d="M${f1(cx - Math.sin(rot) * R * 0.8)} ${f1(cy + Math.cos(rot) * R * 0.8)}L${f1(mx)} ${f1(my)}"/>
      <path class="lead" d="M${cx} ${cy}L${f1(ax)} ${f1(ay)}"/>
      <path class="arc" d="M${cx} ${cy + R + 8}A${R + 8} ${R + 8} 0 0 1 ${f1(cx - Math.sin(rot) * (R + 8))} ${f1(cy + Math.cos(rot) * (R + 8))}"/>
      <text class="ttl" x="140" y="26">Mark 10° to your left</text>
      <text x="140" y="42">Left Add, Right Subtract:</text>
      <text x="140" y="54">add the rotation to the axis.</text>
      <text class="mono" x="140" y="74">Rx  −2.00 / −1.25 × 180</text>
      <text class="mono" x="140" y="88">Order  × 180 + 10 = × 010</text>
      <text x="140" y="108">Judge rotation after 5–10 min,</text>
      <text x="140" y="120">with the lens settled.</text></svg>
      <figcaption><span><i class="sw mk"></i>Lens mark</span><span><i class="sw ref"></i>Where 6 o'clock should be</span></figcaption></figure>`;
  };
})();
