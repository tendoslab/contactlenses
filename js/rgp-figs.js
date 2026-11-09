/* Cross-section diagrams for the rigid lens design cards in the lens guide.
 * Schematic, not to scale: curvature and tear-layer depth are exaggerated so the
 * fit is visible. Colours come from CSS (.rgpfig …) so both themes work. */
(function () {
  const W = 260, H = 132;
  const f1 = (n) => n.toFixed(1);
  const sample = (fn, x0, x1, n = 48) => Array.from({ length: n + 1 }, (_, i) => { const x = x0 + ((x1 - x0) * i) / n; return [x, fn(x)]; });
  const line = (pts) => 'M' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L');
  /* Closed shape between an upper curve and a lower curve over [x0, x1]. */
  const band = (top, bot, x0, x1, cls) => `<path class="${cls}" d="${line(sample(top, x0, x1))}L${line(sample(bot, x0, x1).reverse()).slice(1)}Z"/>`;
  const circ = (R, apex, cx) => (x) => { const d = Math.min(Math.abs(x - cx), R - 0.01); return apex + R - Math.sqrt(R * R - d * d); };
  const label = (x, y, tx, ty, text, anchor = 'start') => `<path class="lead" d="M${f1(x)} ${f1(y)}L${f1(tx)} ${f1(ty)}"/><text x="${f1(tx + (anchor === 'end' ? -2 : anchor === 'start' ? 2 : 0))}" y="${f1(ty + (ty < y ? -2 : 9))}" text-anchor="${anchor}">${text}</text>`;
  const title = (x, text) => `<text class="ttl" x="${x}" y="12" text-anchor="middle">${text}</text>`;

  /* One eye + lens section. eye(x) = front surface; back(x) = lens back; thick(x) = lens thickness. */
  function section({ eye, ex0, ex1, back, front, lx0, lx1, eyeCls = 'eye', lensCls = 'lens' }) {
    const tissue = (x) => eye(x) + 9;
    return band(eye, tissue, ex0, ex1, eyeCls) + band(back, eye, lx0, lx1, 'tear') + band(front, back, lx0, lx1, lensCls);
  }

  /* Lens back that follows `curve` but never sits closer than `gap` to the eye, plus edge lift past `liftFrom`. */
  const fitBack = (curve, eye, cx, gap, liftFrom, lift) => (x) => {
    const d = Math.abs(x - cx);
    return Math.min(curve(x), eye(x) - gap - Math.max(0, d - liftFrom) * lift);
  };
  const thickness = (back, cx, centre, edge, half) => (x) => back(x) - (centre + (edge - centre) * Math.min(1, Math.abs(x - cx) / half));

  const FIGS = {
    spherical() {
      const cx = 130, eye = circ(150, 58, cx);
      const back = fitBack(circ(150, 56.5, cx), eye, cx, 1.4, 48, 0.32);
      const front = thickness(back, cx, 5, 2, 62);
      return section({ eye, ex0: 22, ex1: 238, back, front, lx0: cx - 62, lx1: cx + 62 })
        + label(cx - 20, back(cx - 20) - 3, cx - 52, 24, 'Lens (BOZR ≈ alignment)', 'middle')
        + label(cx + 59, eye(cx + 59) - 4, 214, 50, 'Edge lift', 'middle')
        + label(cx + 20, eye(cx + 20) - 0.7, cx + 46, 30, 'Thin, even tear lens', 'start')
        + label(cx - 90, eye(cx - 90) + 4, cx - 104, 118, 'Cornea', 'start');
    },
    fst() {
      // Vertical section: superior on the left. Prism base down = thicker below; truncated lower edge.
      const cx = 130, eye = circ(150, 58, cx);
      const x0 = cx - 50, x1 = cx + 72;
      const back = fitBack(circ(150, 56.5, cx), eye, cx, 1.4, 48, 0.32);
      const front = (x) => back(x) - (3 + 8 * (x - x0) / (x1 - x0));
      return section({ eye, ex0: 22, ex1: 238, back, front, lx0: x0, lx1: x1 })
        + '<text class="dir" x="14" y="14">← Superior</text><text class="dir" x="246" y="14" text-anchor="end">Inferior →</text>'
        + label(x0 + 8, front(x0 + 8) - 1, x0 - 6, 28, 'Thin at the top', 'middle')
        + label(x1 - 10, front(x1 - 10), x1 + 6, 42, 'Prism base down', 'middle')
        + label(x1, back(x1) + 2, x1 + 8, 108, 'Truncated edge', 'middle')
        + label(cx + 10, front(cx + 10), cx + 10, 22, 'Front toric', 'middle');
    },
    bst() { return twoMeridians('sphere', 'Back toric, spherical front'); },
    spe() { return twoMeridians('spe', 'Front cyl = induced cyl only'); },
    cpe() { return twoMeridians('cpe', 'Front cyl = induced + residual'); },
    kc() {
      const cx = 130, base = circ(150, 64, cx);
      const eye = (x) => base(x) - 7 * Math.exp(-((x - cx - 8) ** 2) / (2 * 13 ** 2));
      const back = fitBack(circ(98, 55.5, cx), eye, cx, 0.6, 54, 0.4);
      const front = thickness(back, cx, 5, 2, 64);
      return section({ eye, ex0: 22, ex1: 238, back, front, lx0: cx - 64, lx1: cx + 64 })
        + label(cx + 8, eye(cx + 8) - 1, cx + 30, 24, 'Light apical touch', 'start')
        + label(cx - 28, eye(cx - 28) - 2, cx - 60, 26, 'Pooling', 'middle')
        + label(cx + 52, eye(cx + 52) - 0.5, cx + 82, 60, 'Mid-peripheral bearing', 'middle')
        + label(cx + 8, eye(cx + 8) + 6, cx + 30, 116, 'Cone (often decentred down)', 'middle');
    },
    scleral() {
      const cx = 130, R = 120, apex = 58, lim = 66;
      const c = circ(R, apex, cx), cL = c(cx + lim);
      const eye = (x) => { const d = Math.abs(x - cx); return d < lim ? c(x) : cL + (d - lim) * 0.6; };
      const vault = (x) => 41 + 0.0062 * (x - cx) ** 2;
      const back = fitBack(vault, eye, cx, 0.4, 104, 0.6);
      const front = thickness(back, cx, 4.5, 3.5, 108);
      const limbus = (sx) => `<path class="lead" d="M${f1(sx)} ${f1(eye(sx) + 1)}L${f1(sx)} ${f1(eye(sx) + 8)}" stroke-dasharray="2 2"/>`;
      return section({ eye, ex0: 12, ex1: 248, back, front, lx0: cx - 108, lx1: cx + 108 })
        + limbus(cx - lim) + limbus(cx + lim)
        + label(cx, (back(cx) + eye(cx)) / 2, cx + 26, 22, 'Central clearance', 'start')
        + label(cx - lim, (back(cx - lim) + eye(cx - lim)) / 2, cx - lim - 10, 24, 'Limbal clearance', 'middle')
        + label(cx + 98, eye(cx + 98) - 1, 226, 66, 'Landing zone', 'middle')
        + label(cx - 96, eye(cx - 96) + 5, cx - 112, 110, 'Sclera', 'start');
    },
    orthok() {
      const cx = 130, eye = circ(140, 60, cx);
      const gap = (d) => 0.6 + 6 * Math.exp(-((d - 31) ** 2) / (2 * 6 ** 2)) + Math.max(0, d - 54) * 0.45;
      const back = (x) => eye(x) - gap(Math.abs(x - cx));
      // Smooth front surface over the reverse-geometry back.
      const front = (x) => { const d = Math.abs(x - cx); return eye(x) - 9.5 + 6 * Math.max(0, d - 44) / 20 - Math.max(0, d - 54) * 0.45; };
      return section({ eye, ex0: 22, ex1: 238, back, front, lx0: cx - 64, lx1: cx + 64 })
        + label(cx, eye(cx) - 0.5, cx, 22, 'Flat centre presses', 'middle')
        + label(cx + 31, eye(cx + 31) - 2, cx + 62, 34, 'Reservoir ring', 'start')
        + label(cx - 46, eye(cx - 46) - 0.4, cx - 78, 34, 'Alignment curve', 'middle')
        + label(cx - 61, eye(cx - 61) - 3, cx - 98, 66, 'Edge lift', 'middle');
    },
    hybrid() {
      const half = (cx, kind) => {
        const eye = circ(92, 50, cx);
        if (kind === 'hybrid') {
          const backR = fitBack(circ(92, 47.5, cx), eye, cx, 1.6, 99, 0);
          const frontR = thickness(backR, cx, 4.5, 3, 26);
          const soft = (x) => eye(x) - 0.3, softF = (x) => soft(x) - 2.6;
          return band(eye, (x) => eye(x) + 8, cx - 60, cx + 60, 'eye')
            + band(soft, eye, cx - 52, cx + 52, 'tear')
            + band(softF, soft, cx - 52, cx - 26, 'soft') + band(softF, soft, cx + 26, cx + 52, 'soft')
            + band(backR, eye, cx - 26, cx + 26, 'tear') + band(frontR, backR, cx - 26, cx + 26, 'lens')
            + title(cx, 'Hybrid')
            + label(cx, frontR(cx), cx, 26, 'Rigid centre', 'middle')
            + label(cx + 42, softF(cx + 42), cx + 44, 104, 'Soft skirt', 'middle');
        }
        const soft = (x) => eye(x) - 0.3, softF = (x) => soft(x) - 2.4;
        const backR = fitBack(circ(92, 44, cx), softF, cx, 1, 22, 0.3);
        const frontR = thickness(backR, cx, 4, 2, 30);
        return band(eye, (x) => eye(x) + 8, cx - 60, cx + 60, 'eye')
          + band(softF, eye, cx - 54, cx + 54, 'soft')
          + band(backR, softF, cx - 30, cx + 30, 'tear') + band(frontR, backR, cx - 30, cx + 30, 'lens')
          + title(cx, 'Piggyback')
          + label(cx, frontR(cx), cx, 26, 'Corneal RGP', 'middle')
          + label(cx + 44, softF(cx + 44), cx + 44, 104, 'SiHy carrier', 'middle');
      };
      return half(66, 'hybrid') + half(194, 'piggy') + '<path class="lead" d="M130 18V126" stroke-dasharray="2 3"/>';
    },
  };

  /* Flat and steep meridian sections side by side. Back surface matches the cornea in both. */
  function twoMeridians(frontKind, caption) {
    const panel = (cx, R, name, frontR) => {
      const eye = circ(R, 50, cx);
      const back = fitBack(circ(R, 48.6, cx), eye, cx, 1.4, 38, 0.3);
      const fr = circ(frontR, 0, cx), off = back(cx) - 4.5;
      const front = (x) => Math.min(back(x) - 1.6, off + fr(x));
      return band(eye, (x) => eye(x) + 8, cx - 60, cx + 60, 'eye') + band(back, eye, cx - 46, cx + 46, 'tear') + band(front, back, cx - 46, cx + 46, 'lens')
        + title(cx, name);
    };
    const fronts = { sphere: [118, 118], spe: [125, 92], cpe: [125, 78] }[frontKind];
    return panel(66, 125, 'Flat meridian', fronts[0]) + panel(194, 88, 'Steep meridian', fronts[1])
      + '<path class="lead" d="M130 18V126" stroke-dasharray="2 3"/>'
      + `<text class="cap" x="130" y="126" text-anchor="middle">${caption}</text>`;
  }

  const LEGEND = '<span><i class="sw lens"></i>Rigid lens</span><span><i class="sw tear"></i>Tear layer (as fluorescein shows it)</span><span><i class="sw eye"></i>Cornea / sclera</span>';

  window.rgpFigure = function (id, name) {
    const draw = FIGS[id];
    if (!draw) return '';
    const soft = id === 'hybrid' ? '<span><i class="sw soft"></i>Soft lens</span>' : '';
    return `<figure class="rgpfig"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cross-section of a ${name} on the eye">${draw()}</svg>
      <figcaption>${LEGEND}${soft}</figcaption></figure>`;
  };
})();
