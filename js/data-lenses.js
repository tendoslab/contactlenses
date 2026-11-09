/* Lens, solution and RGP material reference data.
 *
 * Checked October 2026 against manufacturer releases, Australian retailer notices and
 * product inserts (see SOURCES at the bottom). Stock ranges change, so anything marked
 * `confirm: true` should be double-checked against the current Australian fitting guide
 * before you quote it as gospel in an oral.
 *
 * sph: { min, max, fine } means 0.25 D steps between -fine and +fine, 0.50 D steps beyond.
 * restrict(sph, cyl, axis) returns a string when that combination is NOT made, else null.
 */

const between = (x, a, b) => x >= a - 1e-9 && x <= b + 1e-9;

const LENSES = [
  // ---------- Daily disposables ----------
  {
    id: 'myday-toric', name: 'CooperVision MyDay toric', maker: 'CooperVision',
    modality: 'Daily', type: 'Toric', material: 'stenfilcon A (SiHy)', water: 54, dkt: 80, modulus: 0.4,
    bc: '8.6', dia: '14.5', stab: 'Optimised toric lens geometry (ballast)', ew: 'No',
    sph: { min: -10, max: 8, fine: 6 }, cyl: [-0.75, -1.25, -1.75, -2.25], axisStep: 10,
    notes: 'Widest-range daily toric in Australia: the only stock DD toric that reaches high plus (+8.00). Expanded range is "around the clock" in common powers; confirm -2.25 DC axes in high plus/high minus with the current guide.',
    confirm: true,
  },
  {
    id: 'dt1-toric', name: 'Alcon Dailies Total1 for Astigmatism', maker: 'Alcon',
    modality: 'Daily', type: 'Toric', material: 'delefilcon A (water-gradient SiHy)', water: 33, dkt: 127, modulus: 0.7,
    bc: '8.6', dia: '14.5', stab: 'Precision Balance 8|4', ew: 'No',
    sph: { min: -8, max: 4, fine: 6 }, cyl: [-0.75, -1.25, -1.75, -2.25], axisStep: 10,
    restrict: (s, c) => (s > 0 && c <= -2.25 ? 'High cyl in plus powers has restricted availability' : null),
    notes: 'Plus powers stop at +4.00, so it fails most of the hyperope cases. Axis restrictions apply at higher cyl and outside plano to -6.00; check the Alcon guide.',
    confirm: true,
  },
  {
    id: 'oasys1d-toric', name: 'Acuvue Oasys 1-Day for Astigmatism', maker: 'Johnson & Johnson',
    modality: 'Daily', type: 'Toric', material: 'senofilcon A (SiHy)', water: 38, dkt: null, modulus: 0.7,
    bc: '8.5', dia: '14.3', stab: 'Blink Stabilized design', ew: 'No',
    sph: { min: -9, max: 4, fine: 6 }, cyl: [-0.75, -1.25, -1.75, -2.25], axisStep: 10,
    restrict: (s, c, a) => {
      if (c <= -2.25) {
        if (!between(s, -6, 0)) return '-2.25 DC only made from plano to -6.00';
        if (![10, 20, 70, 80, 90, 100, 110, 160, 170, 180].includes(a)) return '-2.25 DC only in axes 10, 20, 70–110, 160–180';
      }
      if ((s > 0 || s < -6) && ![10, 20, 60, 70, 80, 90, 100, 110, 120, 160, 170, 180].includes(a)) return 'Restricted axes outside plano to -6.00';
      return null;
    },
    notes: 'Full axis wheel only from plano to -6.00. -2.25 DC limited to plano to -6.00 in selected axes.',
    confirm: true,
  },
  {
    id: 'biotrue-toric', name: 'Bausch + Lomb Biotrue ONEday for Astigmatism', maker: 'Bausch + Lomb',
    modality: 'Daily', type: 'Toric', material: 'nesofilcon A (hydrogel)', water: 78, dkt: 42, modulus: null,
    bc: '8.4', dia: '14.5', stab: 'Peri-ballast', ew: 'No',
    sph: { min: -9, max: 4, fine: 6 }, cyl: [-0.75, -1.25, -1.75, -2.25, -2.75], axisStep: 10,
    restrict: (s, c, a) => {
      if (c <= -2.75) {
        if (!between(s, -6, 0)) return '-2.75 DC only made from plano to -6.00';
        if (Math.abs(s * 2 - Math.round(s * 2)) > 1e-9) return '-2.75 DC sphere powers are in 0.50 D steps';
        if (![10, 20, 90, 160, 170, 180].includes(a)) return '-2.75 DC only in axes 10, 20, 90, 160, 170, 180';
      }
      return null;
    },
    notes: 'The only daily toric with -2.75 DC, but it is a hydrogel (Dk/t 42), and -2.75 comes in limited spheres and axes. Hypoxia is the trade-off.',
    confirm: true,
  },

  // ---------- Two-weekly ----------
  {
    id: 'oasys-toric', name: 'Acuvue Oasys for Astigmatism (2-week)', maker: 'Johnson & Johnson',
    modality: 'Two-weekly', type: 'Toric', material: 'senofilcon A (SiHy)', water: 38, dkt: 129, modulus: 0.7,
    bc: '8.6', dia: '14.5', stab: 'Blink Stabilized design', ew: 'Up to 6 nights / 7 days',
    sph: { min: -9, max: 6, fine: 6 }, cyl: [-0.75, -1.25, -1.75, -2.25, -2.75], axisStep: 10,
    restrict: (s, c, a) => {
      if (s > 0 && c < -1.75) return 'Plus powers only go to -1.75 DC';
      if (c <= -2.25) {
        if (between(s, -6, 0) && ![10, 20, 70, 80, 90, 100, 110, 160, 170, 180].includes(a)) return '-2.25/-2.75 DC (plano to -6.00) only in axes 10, 20, 70–110, 160–180';
        if (s < -6 && ![10, 20, 160, 170, 180].includes(a)) return '-2.25/-2.75 DC (-6.50 to -9.00) only in axes 10, 20, 160–180';
      }
      return null;
    },
    notes: 'Goes to -2.75 DC in minus powers, with restricted axes. Approved for up to 6 nights extended wear.',
    confirm: true,
  },
  {
    id: 'cair-toric', name: 'CooperVision clariti / cAIR toric', maker: 'CooperVision',
    modality: 'Two-weekly', type: 'Toric', material: 'somofilcon A (SiHy)', water: 56, dkt: null, modulus: null,
    bc: '8.6', dia: '14.3', stab: 'Prism ballast', ew: 'No',
    sph: { min: -10, max: 8, fine: 6 }, cyl: [-0.75, -1.25, -1.75, -2.25], axisStep: 10,
    notes: 'Fortnightly SiHy toric listed by students; confirm current Australian range before quoting.',
    confirm: true,
  },

  // ---------- Monthly ----------
  {
    id: 'biofinity-toric', name: 'CooperVision Biofinity toric', maker: 'CooperVision',
    modality: 'Monthly', type: 'Toric', material: 'comfilcon A (SiHy, Aquaform)', water: 48, dkt: 116, modulus: 0.75,
    bc: '8.7', dia: '14.5', stab: 'Optimised toric lens geometry (prism-ballast type, wide ballast band)', ew: 'Up to 6 nights / 7 days (Australia, since 27 May 2024)',
    sph: { min: -10, max: 8, fine: 6 }, cyl: [-0.75, -1.25, -1.75, -2.25], axisStep: 10,
    notes: 'Workhorse monthly toric. Axes are 10° steps, which is why an odd axis like x25 gets rounded and nasal torque decides the direction. Was 29 nights EW in Australia until May 2024.',
  },
  {
    id: 'biofinity-xr-toric', name: 'CooperVision Biofinity XR toric', maker: 'CooperVision',
    modality: 'Monthly', type: 'Toric', material: 'comfilcon A (SiHy)', water: 48, dkt: 116, modulus: 0.75,
    bc: '8.7', dia: '14.5', stab: 'Optimised toric lens geometry', ew: 'Up to 6 nights / 7 days',
    sph: { min: -20, max: 20, fine: 6 }, cyl: [-0.75, -1.25, -1.75, -2.25, -2.75, -3.25, -3.75, -4.25, -4.75, -5.25, -5.75], axisStep: 5,
    restrict: (s, c) => (c > -2.75 && between(s, -10, 8) ? 'Low cyl (-0.75 to -2.25) in XR only beyond +8.00 / -10.00; use standard Biofinity toric' : null),
    notes: 'Cyl -2.75 to -5.75 in 0.50 D steps (so no -3.00 or -3.50). Axes in 5° steps. Sphere ±20.00.',
  },
  {
    id: 'total30-toric', name: 'Alcon Total30 for Astigmatism', maker: 'Alcon',
    modality: 'Monthly', type: 'Toric', material: 'lehfilcon A (water-gradient SiHy)', water: 55, dkt: 123, modulus: 0.6,
    bc: '8.6', dia: '14.5', stab: 'Precision Balance 8|4', ew: 'No',
    sph: { min: -10, max: 6, fine: 6 }, cyl: [-0.75, -1.25, -1.75, -2.25], axisStep: 10,
    notes: 'A -2.75 DC expansion launched in the US in Oct 2024; Australian availability not confirmed, so treat -2.25 as the max here.',
    confirm: true,
  },
  {
    id: 'aoph-toric', name: 'Alcon Air Optix plus HydraGlyde for Astigmatism', maker: 'Alcon',
    modality: 'Monthly', type: 'Toric', material: 'lotrafilcon B (SiHy)', water: 33, dkt: 108, modulus: 1.0,
    bc: '8.7', dia: '14.5', stab: 'Precision Balance 8|4', ew: 'Up to 6 nights (per insert; confirm)',
    sph: { min: -10, max: 6, fine: 6 }, cyl: [-0.75, -1.25, -1.75, -2.25], axisStep: 10,
    notes: 'Higher modulus SiHy toric. Orientation marks at 3, 6 and 9 o\'clock.',
    confirm: true,
  },
  {
    id: 'ultra-toric', name: 'Bausch + Lomb ULTRA for Astigmatism', maker: 'Bausch + Lomb',
    modality: 'Monthly', type: 'Toric', material: 'samfilcon A (SiHy)', water: 46, dkt: 114, modulus: null,
    bc: '8.6', dia: '14.5', stab: 'OpticAlign (low-positioned ballast)', ew: 'Check insert',
    sph: { min: -9, max: 6, fine: 6 }, cyl: [-0.75, -1.25, -1.75, -2.25, -2.75], axisStep: 10,
    notes: 'Students quoted -2.75 DC. Confirm Australian range.',
    confirm: true,
  },
  {
    id: 'biofinity-toric-mf', name: 'CooperVision Biofinity toric multifocal', maker: 'CooperVision',
    modality: 'Monthly', type: 'Toric multifocal', material: 'comfilcon A (SiHy)', water: 48, dkt: null, modulus: 0.75,
    bc: '8.7', dia: '14.5', stab: 'Optimised toric lens geometry', ew: 'Up to 6 nights / 7 days',
    sph: { min: -10, max: 10, fine: 6 }, cyl: [-0.75, -1.25, -1.75, -2.25, -2.75, -3.25, -3.75, -4.25, -4.75, -5.25, -5.75], axisStep: 5,
    notes: 'Adds +1.00, +1.50, +2.00, +2.50 in D (centre-distance) and N (centre-near) designs. The stock SiHy toric multifocal to name in the oral.',
  },

  {
    id: 'proclear-mf-toric', name: 'CooperVision Proclear Multifocal Toric', maker: 'CooperVision',
    modality: 'Monthly', type: 'Toric multifocal', material: 'omafilcon B (hydrogel, PC Technology)', water: 62, dkt: null, modulus: null,
    bc: '8.4 / 8.8', dia: '14.4', stab: 'Prism ballast', ew: 'No',
    sph: { min: -20, max: 20, fine: 6 }, cyl: [-0.75, -1.25, -1.75, -2.25, -2.75, -3.25, -3.75, -4.25, -4.75, -5.25, -5.75], axisStep: 5,
    notes: 'Custom-made hydrogel toric multifocal. Adds +1.00 to +4.00 in 0.50 D steps (D and N designs), so it reaches adds that Biofinity toric multifocal (max +2.50) can\'t. Hydrogel Dk/t is low, worst at the thick ballast. Confirm current Australian supply.',
    confirm: true,
  },

  // ---------- Spheres / multifocals (for EW, presbyopia and Ortho-K cases) ----------
  {
    id: 'biofinity', name: 'CooperVision Biofinity (sphere)', maker: 'CooperVision',
    modality: 'Monthly', type: 'Sphere', material: 'comfilcon A (SiHy)', water: 48, dkt: 160, modulus: 0.75,
    bc: '8.6', dia: '14.0', stab: '–', ew: 'Up to 6 nights / 7 days (Australia, since May 2024)',
    sph: { min: -12, max: 8, fine: 6 }, cyl: [0], axisStep: 0,
    notes: 'Sphere Dk/t is 160. Do not quote 160 for the toric (116).',
  },
  {
    id: 'aond', name: 'Alcon Air Optix Night & Day Aqua', maker: 'Alcon',
    modality: 'Monthly', type: 'Sphere', material: 'lotrafilcon A (SiHy)', water: 24, dkt: 175, modulus: 1.4,
    bc: '8.4 / 8.6', dia: '13.8', stab: '–', ew: 'Up to 30 nights continuous wear',
    sph: { min: -10, max: 6, fine: 8 }, cyl: [0], axisStep: 0,
    notes: 'Highest Dk/t and highest modulus soft lens students are expected to know. Sphere only, so no use for astigmats. Also used as a bandage lens.',
  },
  {
    id: 'oasys', name: 'Acuvue Oasys (2-week sphere)', maker: 'Johnson & Johnson',
    modality: 'Two-weekly', type: 'Sphere', material: 'senofilcon A (SiHy)', water: 38, dkt: 147, modulus: 0.7,
    bc: '8.4 / 8.8', dia: '14.0', stab: '–', ew: 'Up to 6 nights / 7 days',
    sph: { min: -12, max: 8, fine: 6 }, cyl: [0], axisStep: 0, notes: '',
  },
  {
    id: 'myday', name: 'CooperVision MyDay (sphere)', maker: 'CooperVision',
    modality: 'Daily', type: 'Sphere', material: 'stenfilcon A (SiHy)', water: 54, dkt: 100, modulus: 0.4,
    bc: '8.4', dia: '14.2', stab: '–', ew: 'No',
    sph: { min: -12, max: 8, fine: 6 }, cyl: [0], axisStep: 0,
    notes: 'Lowest modulus SiHy in common use (~0.4 MPa). Also comes as MyDay multifocal.',
  },
  {
    id: 'dt1', name: 'Alcon Dailies Total1 (sphere)', maker: 'Alcon',
    modality: 'Daily', type: 'Sphere', material: 'delefilcon A (water-gradient SiHy)', water: 33, dkt: 156, modulus: 0.7,
    bc: '8.5', dia: '14.1', stab: '–', ew: 'No',
    sph: { min: -12, max: 6, fine: 6 }, cyl: [0], axisStep: 0,
    notes: 'Core 33% water, surface >80%. Also comes as DT1 Multifocal (low/med/high add).',
  },
];

const SOLUTIONS = [
  { use: 'soft', name: 'Opti-Free PureMoist (Alcon)', kind: 'MPS (soft)', actives: 'Polyquad (polyquaternium-1) 0.001% + Aldox (myristamidopropyl dimethylamine) 0.0006%; HydraGlyde wetting agent', soak: '≥6 h', notes: 'Aldox gives some activity against Acanthamoeba trophozoites and fungi. It does NOT reliably kill cysts. Rub and rinse each side before storing.' },
  { use: 'soft', name: 'Biotrue multi-purpose (B+L)', kind: 'MPS (soft)', actives: 'Polyquaternium-1 + PHMB (polyaminopropyl biguanide)', soak: '≥4 h', notes: 'Biguanide-based. PHMB has been linked to solution-induced corneal staining (SICS) with some lens/solution pairings.' },
  { use: 'soft', name: 'ReNu MultiPlus (B+L)', kind: 'MPS (soft)', actives: 'PHMB (Dymed)', soak: '≥4 h', notes: 'Classic SICS example with some SiHy lenses.' },
  { use: 'both', name: 'AOSEPT Plus with HydraGlyde (Alcon)', kind: 'One-step H₂O₂ (soft and RGP)', actives: '3% hydrogen peroxide, platinum-disc neutraliser', soak: '≥6 h to neutralise', notes: 'Preservative-free, no rub step needed. Never rinse lenses with it or put it in the eye. Not for shift workers or anyone who might pull lenses out early. Use only the case supplied, which has the disc.' },
  { use: 'soft', name: 'One-step catalase-tablet H₂O₂ (e.g. Oxysept 1-Step)', kind: 'One-step H₂O₂', actives: '3% hydrogen peroxide + catalase tablet', soak: '≥6 h', notes: 'Tablet neutraliser; some versions have a colour indicator. Check current Australian availability before naming it.' },
  { use: 'rgp', name: 'Menicare Plus (Menicon)', kind: 'MPS (RGP)', actives: 'Multipurpose RGP solution', soak: 'Per insert', notes: 'Simple one-bottle RGP care; good for convenience or travel.' },
  { use: 'rgp', name: 'Boston Advance cleaner + conditioning solution (B+L)', kind: 'Two-bottle RGP system', actives: 'Abrasive surfactant cleaner + preserved conditioning/storage solution', soak: 'Per insert', notes: 'RGP only. Soft lenses absorb the preservatives (toxicity) and the abrasive cleaner can damage them.' },
  { use: 'rgp', name: 'Boston Simplus (B+L)', kind: 'MPS (RGP)', actives: 'Multipurpose RGP solution', soak: 'Per insert', notes: 'One-bottle RGP alternative to Advance.' },
  { use: 'rgp', name: 'Menicon Progent', kind: 'Periodic RGP protein remover', actives: 'Progent A sodium hypochlorite + Progent B potassium bromide', soak: '30 min', notes: 'Every 2 weeks (no more often than every 5 days). Restores wettability and removes stubborn protein.' },
];

const RGP_MATERIALS = [
  { name: 'PMMA', family: 'Polymethyl methacrylate', dk: '≈0', notes: 'No oxygen permeability. Trial sets only; never dispense.' },
  { name: 'Boston II / IV', family: 'Silicone acrylate (1st gen)', dk: '12–19', notes: 'Siloxane raises Dk but reduces wettability, so more deposits.' },
  { name: 'Boston EO', family: 'Fluorosilicone acrylate', dk: '58', notes: 'Moderate Dk.' },
  { name: 'Boston XO', family: 'Fluorosilicone acrylate (super-Dk)', dk: '100', notes: 'Very commonly prescribed: good Dk, wettability and stability.' },
  { name: 'Boston XO2', family: 'Fluorosilicone acrylate (hyper-Dk)', dk: '141', notes: 'Higher Dk, used for overnight (e.g. Ortho-K) and thick designs. Higher-Dk materials are generally softer and less dimensionally stable, so flexure and scratching become concerns.' },
  { name: 'Menicon Z', family: 'Fluorosilicone methacrylate (hyper-Dk)', dk: '163 (ISO) / 189 (Fatt)', notes: 'Hyper-Dk. Plasma-treated surface for wettability.' },
];

/* Soft toric stabilisation designs, shown with front-view and thickness diagrams in the soft lens guide.
 * match: tests a lens's `stab` text so each card can list the lenses in this guide that use it. */
const SOFT_STAB = [
  { id: 'prism', name: 'Prism ballast', match: /prism ballast|optimised toric/i,
    how: '0.75–1.5Δ base-down prism across the whole lens, optic zone included, so the lens is thickest at 6 o\'clock. Gravity and the upper lid squeezing the lens down ("watermelon seed") keep the heavy edge at the bottom.',
    lids: 'Works with most lid shapes; the most forgiving for oblique axes.',
    watch: 'Thick inferior edge: lower Dk/t at 6 o\'clock (hydrogels), more awareness of the lower lid, vertical prism if only one eye wears it. CooperVision\'s "optimised toric lens geometry" is a prism-ballast type with a wide ballast band of even thickness.' },
  { id: 'peri', name: 'Peri-ballast / low-positioned ballast', match: /peri-ballast|opticalign/i,
    how: 'Ballast only in the lower periphery, outside the optic zone, so there\'s no prism through the optics and the centre stays thinner.',
    lids: 'Lower lid and gravity hold the thick crescent down; the upper lid rides over the thin top.',
    watch: 'Less prism and thickness than full prism ballast, but still relies on the lower lid; can be slower to settle.' },
  { id: 'pb84', name: 'Ballast band from 8 to 4 o\'clock (Alcon Precision Balance 8|4)', match: /8\|4/i, confirm: true,
    how: 'A ballast zone across the lower lens, roughly from 8 o\'clock to 4 o\'clock, with a thin upper half. A ballast design that keeps the thick zone out of the upper lid\'s way.',
    lids: 'Upper lid passes over the thin top; the inferior ballast keeps the lens oriented between blinks.',
    watch: 'Still thicker below, so check the lower lid edge and inferior Dk/t. Confirm the exact geometry against Alcon\'s fitting guide.' },
  { id: 'asd', name: 'Accelerated / blink stabilisation (Acuvue Blink Stabilized)', match: /blink stabili[sz]ed/i,
    how: 'Thin top and bottom, with four thicker stabilisation zones in the mid-periphery near 3 and 9 o\'clock. No prism in the optic zone.',
    lids: 'Each blink, the lids push on the thick zones and turn the lens back into place, so it suits a firm blink and lids that cover the top and bottom of the lens.',
    watch: 'Wide palpebral apertures, loose lids or a weak blink give the lids less to work with. Same thickness in both eyes, so no vertical prism imbalance.' },
  { id: 'dyn', name: 'Dynamic stabilisation / double slab-off', match: /double slab|dynamic stabili/i,
    how: 'Thin zones cut away top and bottom (slab-off), leaving the lens thickest along the horizontal at 3 and 9 o\'clock. Symmetrical, so it can\'t sit upside down.',
    lids: 'The upper and lower lids squeeze the thin zones and hold the thick horizontal band in the aperture ("melon seed" between the lids).',
    watch: 'Needs lids that cover the top and bottom of the lens; less stable with a wide aperture. Thick zones at 3 and 9 are exposed: check Dk/t there with hydrogels.' },
  { id: 'trunc', name: 'Truncation', match: /truncat/i,
    how: 'The bottom 1–1.5 mm of a prism-ballast lens is cut off, leaving a flat edge that sits on the lower lid margin.',
    lids: 'Needs a lower lid at or just above the limbus for the flat edge to rest on.',
    watch: 'Last resort, mostly in custom lenses: the flat edge is felt more and can catch the lower lid. Often combined with prism.' },
];

/* Rigid lens designs, shown as cards in the Rigid lenses part of the lens guide. */
const RGP_DESIGNS = [
  { name: 'Spherical corneal RGP', fig: 'spherical', group: 'Corneal',
    when: 'Spherical Rx, or corneal cyl up to about 2 D with little residual cyl. First choice for WTR corneal astigmatism the soft torics struggle with.',
    fit: 'Tricurve or aspheric back. BOZR from flat K by toricity (see the table below). TD ≈ HVID − 2 (usually 9.2–9.6). BOZD about 1 mm bigger than the dim-light pupil.',
    stab: 'Rotation doesn\'t matter; the tear lens masks the corneal cyl.',
    watch: 'Above ~2 D of corneal cyl it rocks along the flat meridian, decentres and gives 3 & 9 staining. Spherical RGPs decentre laterally on ATR corneas. Flexure leaves residual cyl.' },
  { name: 'Front-surface toric RGP', fig: 'fst', group: 'Toric',
    when: 'Spherical (or near-spherical) cornea with internal (lenticular) cyl, so a spherical RGP leaves residual cyl.',
    fit: 'Spherical back fitted like a spherical RGP. Cyl on the front, found by over-refraction over a spherical trial lens.',
    stab: 'Spherical back has nothing to lock onto, so it needs 1.5–2Δ base-down prism, ± truncation.',
    watch: 'Thicker and heavier: rides low, less oxygen, prism can be noticed. A soft toric is usually the easier answer.' },
  { name: 'Back-surface toric (BST)', fig: 'bst', group: 'Toric',
    when: 'Corneal cyl ≥ 2 D and refractive cyl about 1.2–1.4 × the corneal cyl (residual in the same direction as the corneal cyl).',
    fit: 'Both back curves from the Ks with Mandell–Moore factors. Spherical front. Order one BVP: the flat meridian\'s, after SAM-FAP.',
    stab: 'The toric back locks onto the toric cornea.',
    watch: 'Index mismatch between lens and tears induces cyl of about 0.5 × the back-surface toricity (ΔK of the lens back). That only works if it matches the residual cyl.' },
  { name: 'SPE bitoric', fig: 'spe', group: 'Toric',
    when: 'Corneal cyl ≥ 2 D and refractive cyl ≈ corneal cyl (no residual).',
    fit: 'Mandell–Moore BOZRs. Front cyl corrects only the induced cyl, so the lens behaves like a sphere.',
    stab: 'Spherical power effect: rotation doesn\'t change the optics.',
    watch: 'Order by meridian (BOZR and BVP in each); the lab works out the front surface.' },
  { name: 'CPE bitoric', fig: 'cpe', group: 'Toric',
    when: 'Corneal cyl ≥ 2 D and refractive cyl ≠ corneal cyl (residual cyl that a BST can\'t cover).',
    fit: 'Mandell–Moore BOZRs. Front cyl corrects induced + residual cyl.',
    stab: 'Cylinder power effect: relies on the toric back staying locked, so rotation blurs.',
    watch: 'Check rotation at the fit. Over-refract with the trial bitoric on.' },
  { name: 'Keratoconus corneal designs (e.g. Rose K2)', fig: 'kc', group: 'Specialty',
    when: 'Mild to moderate, central or near-central cones; irregular astigmatism a soft lens can\'t correct.',
    fit: 'Smaller optic zones, steeper central and flatter peripheral curves than a standard tricurve. Aim for light three-point touch. Fit from the manufacturer\'s trial set and guide.',
    stab: 'Rigid optic replaces the irregular front surface; the tear lens fills the gaps.',
    watch: 'Apical touch on the cone → scarring risk. Low or decentred cones and RGP intolerance → scleral, hybrid or piggyback.', confirm: true },
  { name: 'Scleral / mini-scleral', fig: 'scleral', group: 'Specialty',
    when: 'Advanced or decentred keratoconus, pellucid, post-graft, severe ocular surface disease, RGP intolerance, rigid optics for sport.',
    fit: 'Vaults the cornea and limbus and lands on the sclera. Fill the bowl with preservative-free saline; check central and limbal clearance and the landing zone.',
    stab: 'Lands on the sclera, so it is very stable and rarely dislodges.',
    watch: 'Hypoxia (little tear exchange), midday fogging, seal-off and conjunctival blanching at the landing zone, limbal stress. Use hyper-Dk material.' },
  { name: 'Ortho-K (reverse geometry)', fig: 'orthok', group: 'Specialty',
    when: 'Low myopia (about −2.00 or less is ideal; designs go to around −4.00) and myopia control in children. Ideal topography: < 1.50 D WTR corneal cyl that isn\'t limbus to limbus, normal e-value. Small pupils and lids that aren\'t tight.',
    fit: 'Flat central BOZR, steeper reverse curve, alignment and edge curves. Fitted from topography; judged by the bull\'s-eye treatment zone on post-wear topography.',
    stab: 'Worn overnight; centration is everything (decentred "smiley face"/central island patterns mean refit).',
    watch: 'Overnight wear of a rigid lens: MK risk higher than daily-wear RGP, so strict hygiene, no tap water, hyper-Dk material.' },
  { name: 'Hybrid / piggyback', fig: 'hybrid', group: 'Specialty',
    when: 'Needs rigid optics but can\'t tolerate a corneal RGP, or the RGP won\'t centre.',
    fit: 'Hybrid: rigid centre with a soft skirt. Piggyback: high-Dk SiHy soft lens under a corneal RGP.',
    stab: 'The soft skirt or carrier lens centres the rigid optic.',
    watch: 'Two lenses (piggyback) = more handling, care and lower oxygen. Hybrids can tighten and the junction can tear.' },
];

/* RGP fitting quick reference. */
const RGP_FIT = {
  start: [
    ['Total diameter (TD)', '≈ HVID − 2 mm, usually 9.2–9.6. Bigger for a wide aperture or lid attachment.'],
    ['BOZD', '≈ dim-light pupil + 1 mm: pupil < 5 mm → 7.6, 5–7 mm → 7.8, > 7 mm → 8.0.'],
    ['Peripheral curves', 'Flatter outwards (bigger mm): SCR ≈ BOZR + 1 mm, PCR ≈ SCR + 2 mm. Aim for a 0.4–0.5 mm edge band.'],
    ['Centre thickness', 'About 0.15 mm for low minus. Thicker for plus and high-Dk materials; lenticulate high plus and high minus.'],
  ],
  bozr: [
    ['0.00–1.00 D', 'On flat K'],
    ['1.12–2.00 D', 'Flat K + ¼ΔK'],
    ['2.12–2.87 D', 'Flat K + ⅓ΔK (or go toric)'],
    ['3.00 D or more', 'BST / bitoric'],
  ],
  mandell: [
    ['2.00 D', 'On K', '0.50 D flatter'],
    ['2.50 D', '0.25 D flatter', '0.50 D flatter'],
    ['3.00 D', '0.25 D flatter', '0.75 D flatter'],
    ['3.50 D', '0.25 D flatter', '0.75 D flatter'],
    ['4.00 D', '0.25 D flatter', '1.00 D flatter'],
    ['5.00 D', '0.25 D flatter', '1.25 D flatter'],
  ],
  patterns: [
    ['Alignment', 'Thin, even film centrally and mid-periphery; 0.4–0.5 mm bright edge band.', 'The target.'],
    ['Steep (apical clearance)', 'Central pooling, maybe a bubble; dark mid-peripheral touch ring. Trapped debris, dimple veiling.', 'Flatten the BOZR (or reduce BOZD).'],
    ['Flat (apical touch)', 'Dark central touch with wide peripheral pooling; lens rocks and decentres. Central bearing → Fischer–Schweitzer mosaic, abrasion.', 'Steepen the BOZR (or enlarge BOZD/TD).'],
    ['WTR cornea, spherical lens', 'Horizontal band of touch at 3 and 9 (the flat meridian), pooling at 12 and 6.', 'Normal up to ~2 D. More than that → BST or bitoric.'],
    ['ATR cornea, spherical lens', 'Vertical band of touch, pooling at 3 and 9; lens decentres laterally.', 'Consider a soft toric or toric RGP.'],
    ['Tight edge (low edge lift)', 'Thin or absent edge band, little tear exchange, possible seal-off and indentation. Small tear reservoir → 3 & 9 staining.', 'Flatten the peripheral curves.'],
    ['Loose edge (high edge lift)', 'Wide, bright edge band, bubbles under the edge, lens awareness, may fall out. Thirsty tear meniscus → 3 & 9 staining.', 'Steepen the peripheral curves.'],
    ['Thick edge (bridging)', 'Edge stands off the cornea so the lid can\'t resurface it → 3 & 9 staining (worse with poor blinking).', 'Thinner edge / edge redesign; blinking exercises.'],
  ],
  adjust: [
    ['Total diameter', '↑', '↓'],
    ['BOZD', '↑', '↓'],
    ['BOZR', '↓ (steeper)', '↑ (flatter)'],
    ['Peripheral radii', '↓', '↑'],
    ['Thickness', '↓', '↑'],
  ],
  rules: [
    ['mm ↔ D', 'K (D) = 337.5 / r (mm). Around 7.80 mm, 0.05 mm ≈ 0.25 D.'],
    ['Tear lens (SAM-FAP)', 'Steeper than K → plus tear lens → Add Minus to the lens. Flatter → minus tear lens → Add Plus. About 0.25 D per 0.05 mm.'],
    ['BVP', 'Vertex the spectacle Rx to the cornea first (both meridians), then correct for the tear lens.'],
    ['Changing BOZD', 'Keep the same fit: every 0.5 mm change in BOZD needs a 0.05 mm change in BOZR in the same direction (bigger zone → flatter BOZR).'],
    ['Residual cyl', 'Refractive cyl at the cornea minus corneal cyl. It is what a spherical RGP leaves uncorrected.'],
  ],
};

/* What students wrote vs what is actually right. Shown on the Fact check page. */
const FACTCHECK = [
  { claim: 'Biofinity is approved for 29 nights of extended wear.', verdict: 'Out of date', fix: 'In Australia CooperVision changed Biofinity to daily wear plus EW of up to 6 nights / 7 days from 27 May 2024 (EU MDR relabelling). Before that it was 29 nights. Say "6 nights" in the oral.' },
  { claim: 'Biofinity toric Dk/t is 160–171.', verdict: 'Wrong lens', fix: '160 is the Biofinity sphere. Biofinity toric and XR toric are 116 (at -3.00 D).' },
  { claim: 'Biofinity XR comes in -3.50 DC.', verdict: 'Not made', fix: 'XR cyl runs -2.75 to -5.75 in 0.50 D steps: -2.75, -3.25, -3.75, -4.25, -4.75, -5.25, -5.75. Round a calculated -3.50 to -3.25 or -3.75 and say why.' },
  { claim: 'Biofinity XR toric only starts at +8.50 sphere.', verdict: 'Half right', fix: 'That limit only applies to LOW cyl (-0.75 to -2.25) in XR. Cyl -2.75 to -5.75 is available across the full ±20.00 sphere range.' },
  { claim: 'MyDay toric only goes to -6.00 (or only to +4.00).', verdict: 'Wrong', fix: 'MyDay toric covers +8.00 to -10.00 with -0.75 to -2.25 DC. It is the daily toric to name for high plus. Dailies Total1 for Astigmatism and Oasys 1-Day for Astigmatism stop at +4.00.' },
  { claim: 'For swimming give the left eye +4.25/-2.25x90 (just drop the extra cyl).', verdict: 'Incomplete', fix: 'Keep the spherical equivalent. CL Rx +4.25/-3.25x90: you lose -1.00 DC, so add half of it (-0.50) to the sphere → +3.75/-2.25x90. SE before = SE after = +2.625.' },
  { claim: 'Monovision near lens = vertexed distance CL Rx + add.', verdict: 'Wrong order', fix: 'Add the near add to the SPECTACLE Rx first, then vertex both meridians. -6.00/-1.00 + 1.00 → -5.00/-1.00 → -4.75/-0.75. Adding to the vertexed -5.50 gives -4.50, which over-plusses.' },
  { claim: 'Opti-Free PureMoist\'s active ingredient is citrate.', verdict: 'Wrong', fix: 'Disinfectants are Polyquad 0.001% and Aldox 0.0006%. Citrate is a buffer/cleaning agent.' },
  { claim: 'Opti-Free PureMoist / H₂O₂ kills Acanthamoeba, so monthlies can be cleaned after swimming.', verdict: 'Unsafe', fix: 'Aldox has some activity against trophozoites only. Cysts survive MPS, and one-step peroxide is unreliable against cysts. No care system makes swimming in a reusable lens safe. DD and discard, or Rx goggles.' },
  { claim: 'CLPU is an infection.', verdict: 'Wrong', fix: 'CLPU is a sterile inflammatory response (usually to Gram-positive exotoxins, often S. aureus). Small, round, peripheral, anterior-stromal infiltrate with overlying staining; usually resolves within days and may leave a small faint scar. MK is the infectious one.' },
  { claim: 'Vegetative matter (dirt, plants) is a risk for Acanthamoeba.', verdict: 'Mixed up', fix: 'Vegetative-matter trauma is the classic risk for FUNGAL keratitis. Acanthamoeba is linked to water (tap, pool, hot tub, sea) and soil.' },
  { claim: 'A CPE bitoric needs prism ballast.', verdict: 'Wrong', fix: 'Bitorics are stabilised by the toric back surface aligning with the toric cornea; no prism needed. A CPE bitoric must not rotate (so it relies on that alignment), while an SPE bitoric can rotate without affecting vision. Prism ballast (1–1.5Δ base down) is for front-surface torics.' },
  { claim: 'Air Optix Night & Day is a daily disposable.', verdict: 'Wrong', fix: 'It is a monthly SiHy sphere approved for up to 30 nights continuous wear. Dk/t 175, modulus about 1.4 MPa.' },
  { claim: 'Acuvue Oasys for Astigmatism has -2.75 DC from -6.50 to -9.00 only.', verdict: 'Wrong', fix: '-2.25/-2.75 DC is made from plano to -6.00 (axes 10, 20, 70–110, 160–180) and from -6.50 to -9.00 (axes 10, 20, 160–180). Plus powers only go to -1.75 DC.' },
  { claim: 'Proclear does not come in toric.', verdict: 'Wrong', fix: 'Proclear toric (hydrogel, omafilcon A) exists. What is true: for a stock silicone hydrogel toric MULTIFOCAL, Biofinity toric multifocal is the lens to name.' },
  { claim: 'RE -2.00/-4.00x30 converts to -2.00/-3.50x30.', verdict: 'Close, slightly under', fix: 'Meridians -2.00 → -1.95 and -6.00 → -5.60, so cyl = -3.64 → nearest -3.75. -3.50 was accepted in the room, but know where the number comes from. For a bitoric RGP the lab works from both meridians anyway.' },
  { claim: 'A -6.00/-1.00x125 spectacle Rx only needs the sphere vertexed (-5.50/-1.00).', verdict: 'Wrong', fix: 'Both meridians need vertexing: -6.00 → -5.60, -7.00 → -6.46. CL Rx -5.50/-0.75x120 (RE nasal rotation → subtract when rounding 125 to a 10° axis).' },
  { claim: 'You can just tell a presbyope the near-dominance test is "which eye is blurrier".', verdict: 'Depends on the set-up', fix: 'With the near Rx in place the +1.50 lens BLURS the near target, so the eye where the blur is more noticeable is near-dominant. With only distance Rx in place the +1.50 IMPROVES near vision, so the eye whose improvement is more noticeable is near-dominant. Say which set-up you use.' },
  { claim: 'DDs are always cheaper / cost is a good reason to choose a lens.', verdict: 'Weak answer', fix: 'Students reported the examiner did not like cost as the main argument. Lead with eye health (infection severity, deposits, no solutions, SICS), compliance and lifestyle; mention cost only as a patient factor.' },
  { claim: 'Diabetes is a contraindication to CL wear.', verdict: 'Wrong', fix: 'Not contraindicated. Reduced corneal sensitivity, fragile epithelial basement membrane adhesion and slower healing mean closer review, avoid EW, prefer DD and SiHy.' },
  { claim: 'Striae appear at 5% swelling and folds at 8%.', verdict: 'Fine', fix: 'Commonly taught as striae at ~5% and folds at ~8% (some sources say 10%). Each additional 1% oedema adds roughly one fold.' },
  { claim: 'A 10° nasal rotation in the RE means add 10°.', verdict: 'Wrong', fix: 'From the examiner\'s view, RE nasal rotation swings the bottom of the lens to your RIGHT, so LARS says subtract. LE nasal rotation swings left: add.' },
  { claim: 'Ideal Ortho-K candidate has a flat K under 40 D.', verdict: 'Wrong', fix: 'Very flat corneas are harder to fit and correct less myopia. Typical guidance is Ks of roughly 41–46 D, corneal toricity ≤1.50 D WTR (less if ATR), astigmatism not limbus to limbus, and a normal or higher e-value (more e = more flattening available).' },
  { claim: 'Harvitt–Bonanno\'s Dk/t of 125 limits overnight swelling to 3%.', verdict: 'Mixed up', fix: 'Holden–Mertz: 24 (no daytime oedema), 34 (8% overnight), 87 (4% overnight, same as no lens). Harvitt–Bonanno: 35 to avoid stromal anoxia by day, 125 to avoid anoxia anywhere in the cornea overnight.' },
  { claim: 'A soft toric suits ATR because the thick part of the lens sits under the lids.', verdict: 'Right answer, wrong reason', fix: 'A minus-cyl lens is thickest along its most-minus meridian. For ATR (axis ~90) that is at 3 and 9, in the aperture; for WTR (axis ~180) it is at 12 and 6, under the lids. Soft torics suit ATR because spherical RGPs decentre laterally on ATR corneas and the 3/9 thickness works with thin-zone stabilisation.' },
  { claim: 'A chef should get a low-water lens because the kitchen is hot.', verdict: 'Half right', fix: 'Heat does dehydrate high-water hydrogels. But for a diabetic chef the lead reason is oxygen: a SiHy daily disposable (high Dk/t, moderate water, no solutions) covers both.' },
  { claim: 'Wait 5 minutes after anti-allergy drops before putting lenses in.', verdict: 'Too short', fix: 'Instil without lenses in and wait 10–15 minutes if the drop is preserved (BAK binds to soft lenses), or use a preservative-free unit dose such as ketotifen.' },
  { claim: 'Wait 15–20 minutes after swimming before removing your lenses.', verdict: 'Not standard advice', fix: 'Remove and discard daily disposables as soon as practical after water exposure (rewet with sterile saline first if the lens feels stuck after fresh water). Better still, wear tight goggles. Never reuse a lens that has been in the water.' },
  { claim: 'Proclear multifocal toric is the only soft option for low sphere / high cyl / high add.', verdict: 'Mostly right', fix: 'Biofinity toric multifocal covers the cyl (to −5.75) but its adds stop at +2.50. For a +3.25 add, Proclear Multifocal Toric (hydrogel, adds to +4.00) is the custom option; otherwise distance torics with readers, or RGPs.' },
  { claim: 'A tight soft lens: vision is clear after a blink because the steep lens has plus power.', verdict: 'Imprecise', fix: 'The pattern is right (tight: clear just after the blink, then blurs; loose: blurs after the blink, then clears). The mechanism: the blink momentarily presses the vaulting lens onto the cornea; as it vaults again, the tear lens and lens flexure blur vision. The loose lens is dragged off the visual axis by the blink, then recentres.' },
  { claim: 'Biofinity multifocal: the D lens is centre-near and the N lens is centre-distance.', verdict: 'Backwards', fix: 'D = centre-distance, N = centre-near (CL types table had them swapped). Fitting guide: adds +1.00 and +1.50 → D lens in both eyes; +2.00 and +2.50 → D in the dominant eye, N in the non-dominant eye.' },
  { claim: 'Biofinity and Acuvue Oasys (2-week) are approved for 7 nights of extended wear.', verdict: 'Out by one', fix: 'Both are up to 6 nights / 7 days of continuous wear, then a night out of the lens. Say "6 nights".' },
  { claim: 'Specular reflection: light and microscope 45° apart, 25× magnification.', verdict: 'Wrong', fix: 'Set the illumination and observation arms equal and opposite about the normal, about 60° apart in total, use the highest magnification (~40×) and a narrow-to-moderate beam, and focus back from the bright epithelial reflex to the dim endothelial one.' },
  { claim: 'High-Dk RGP materials make the lens very thin.', verdict: 'Wrong', fix: 'Dk is a material property; it doesn\'t set thickness. Higher-Dk materials are softer and flex more, so they are usually made the same or slightly thicker. Avoid them for rough handlers and ultra-thin designs.' },
  { claim: 'With +5.25 sphere the 4:1 rule means the sphere masks −1.25 DC.', verdict: 'Misleading', fix: 'A sphere doesn\'t mask cyl. Spherical equivalent puts the circle of least confusion on the retina; the rough 4:1 sphere-to-cyl ratio only predicts whether the blur will be tolerable. For full-time wear with −1.25 DC, use a toric (toric MF, monovision torics) rather than abandoning the cyl.' },
];

const SOURCES = [
  { label: 'Lensworld (AU): Biofinity wear schedule change to 6 nights, 27 May 2024', url: 'https://www.lensworld.com.au/blog/biofinity-contact-lens-wear-schedule/' },
  { label: 'CooperVision: Biofinity toric & Biofinity XR toric practitioner page', url: 'https://coopervision.com/practitioner/brilliance-of-biofinity-toric' },
  { label: 'CooperVision UK: 2021 Biofinity toric/XR parameter expansion', url: 'https://coopervision.co.uk/our-company/news-center/press-release/parameter-expansion-means-biofinity-now-provides-correction' },
  { label: 'CooperVision UK: Biofinity toric multifocal parameters', url: 'https://coopervision.co.uk/practitioner/contact-lenses/biofinity-toric-multifocal' },
  { label: 'Optometry Australia: CooperVision MF fitting guide for Biofinity toric', url: 'https://www.optometry.org.au/wp-content/uploads/States/WA/ECOWA/Coopervision-MF-Fitting-Guide-for-Biofinity-Toric.pdf' },
  { label: 'CooperVision: MyDay toric parameter expansion', url: 'https://coopervision.com/practitioner/ecp-viewpoints/eyes-coopervision/coopervision-expands-myday-toric-parameters' },
  { label: 'Insight (AU): expanded parameters for CooperVision toric', url: 'https://www.insightnews.com.au/expanded-parameters-for-coopervision-toric/' },
  { label: 'J&J Vision Care (SE): Acuvue Oasys 1-Day for Astigmatism parameters', url: 'https://www.jnjvisioncare.se/contact-lenses/all-acuvue-brand-contact-lenses/toric/acuvue_oasys_1day_for_astigmatism' },
  { label: 'J&J Vision Care: Acuvue Oasys 2-week for Astigmatism', url: 'https://jnjvisioncare.com/products/acuvue-oasys-2-week-contacts-astigmatism' },
  { label: 'Bausch + Lomb: -2.75 DC for Biotrue ONEday for Astigmatism', url: 'https://www.bausch.com/newsroom/news/archive-news-releases/?id=649' },
  { label: 'Optometry Times: Total30 for Astigmatism expanded parameters', url: 'https://optometrytimes.com/view/alcon-introduces-expanded-parameters-for-total30-for-astigmatism-contact-lens' },
  { label: 'MyAlcon AU: Opti-Free PureMoist', url: 'https://www.myalcon.com/au/en-AU/node/1941' },
  { label: 'FDA 510(k) K122273: Menicon Progent', url: 'https://fda.innolitics.com/device/K122273' },
  { label: 'FDA 510(k) K103561: Menicon Z (Dk 189/163)', url: 'https://fda.innolitics.com/device/K103561' },
  { label: 'CL Spectrum: modulus values (Biofinity 0.75, Night & Day 1.4 MPa)', url: 'https://clspectrum.com/issues/2009/march/letters-to-the-editor/' },
];

/* Generic sphere-step check: 0.25 D steps within ±fine, 0.50 D steps beyond. */
function sphereMade(lens, s) {
  const { min, max, fine } = lens.sph;
  if (!between(s, min, max)) return false;
  const step = Math.abs(s) <= fine + 1e-9 ? 0.25 : 0.5;
  return Math.abs(s / step - Math.round(s / step)) < 1e-6;
}

/* Returns { ok, reason } for one eye's CL Rx against one lens. */
function lensCovers(lens, s, c, a) {
  if (!sphereMade(lens, s)) return { ok: false, reason: `Sphere ${fmtD(s)} not in range/steps (${fmtD(lens.sph.min)} to ${fmtD(lens.sph.max)})` };
  if (lens.type === 'Sphere') return c === 0 ? { ok: true } : { ok: false, reason: 'Sphere-only lens' };
  if (c === 0) return { ok: false, reason: 'Toric lens; no cyl to correct' };
  if (!lens.cyl.some((x) => Math.abs(x - c) < 1e-6)) return { ok: false, reason: `Cyl ${fmtD(c)} not made (${lens.cyl.map(fmtD).join(', ')})` };
  if (lens.axisStep && (a % lens.axisStep !== 0 || a < lens.axisStep || a > 180)) return { ok: false, reason: `Axis ${a} not made (${lens.axisStep}° steps)` };
  const r = lens.restrict ? lens.restrict(s, c, a) : null;
  return r ? { ok: false, reason: r } : { ok: true };
}

function fmtD(x) {
  if (x === 0) return 'plano';
  return (x > 0 ? '+' : '−') + Math.abs(x).toFixed(2);
}
