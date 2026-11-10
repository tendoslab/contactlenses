// Ocumon: the partners you raise and the contact lens conditions you catch (see the Ocumon tab).
// Ported from the Ocumon mode on the companion Thera Orals site, and inspired by the Anki add-on Ankimon.
// Each wild creature fights with a whole case: one whose title or theme matches `match` (case-insensitive).
// `cat` is the Ocudex group (a case category from CATS in js/app.js). Run `node tools/check-ocumon.js` after
// editing. Rarity isn't set here: it comes from how many 2022, 2025 and 2026 oral cases match the creature, so the
// themes the examiners keep asking about are the common ones. Add `tier: 1|2|3` to a creature only to override that.
// `hint` is the line shown once caught; keep it short and clinically right.
window.OCUMON = {
  // Partners: the Ocumon you raise. Pick a starter; another joins every MON_UNLOCK team points.
  // `sprite` is a sheet in img/sprites: 'animal' sheets are the Little Animals Pack (free to use, not to resell),
  // 'char' sheets are 72 Cute Pixel Character (BDragon1727, free licence), 'gk' sheets are GrafxKid's Sprite
  // Packs 3, 6 and 8 (CC0), each with its own `anims` ([row, frames, ms a frame, loops]).
  // `strong` lists question topics (TOPICS in js/app.js) that earn ×1.25 XP. Each partner keeps its own level.
  partners: [
    { id: 'torikitty', name: 'Torikitty', sprite: 'cat', kind: 'animal', hue: 350, starter: true, strong: ['fitting', 'rx'], blurb: 'Lands every toric on axis. Strong on fit assessment and Rx conversion.' },
    { id: 'hopsheen', name: 'Hopsheen', sprite: 'bunny', kind: 'animal', hue: 220, starter: true, strong: ['lenschoice', 'materials'], blurb: 'Hops between brands and knows every Dk. Strong on lens choice and materials.' },
    { id: 'blinkster', name: 'Blinkster', sprite: 'char-1', kind: 'char', hue: 45, starter: true, strong: ['complications', 'care'], blurb: 'Never stops blinking. Strong on complications and care systems.' },
    { id: 'ursclera', name: 'Ursclera', sprite: 'bear', kind: 'animal', hue: 30, strong: ['rgp', 'specialty'], blurb: 'Big, slow and steady as a scleral. Strong on rigid and specialty lenses.' },
    { id: 'piggyback', name: 'Piggyback', sprite: 'pig', kind: 'animal', hue: 340, strong: ['specialty', 'rgp'], blurb: 'Rides an RGP on top of a soft lens. Strong on specialty and rigid lenses.' },
    { id: 'lupupil', name: 'Lupupil', sprite: 'wolf', kind: 'animal', hue: 210, strong: ['ew', 'complications'], blurb: 'Howls through the night in extended wear. Strong on EW and complications.' },
    { id: 'mohawkeye', name: 'Mohawkeye', sprite: 'char-4', kind: 'char', hue: 120, strong: ['lifestyle', 'history'], blurb: 'Surfs, skates and plays rugby. Strong on lifestyle and history.' },
    { id: 'rosetint', name: 'Rosetint', sprite: 'char-6', kind: 'char', hue: 330, strong: ['presbyopia', 'lenschoice'], blurb: 'Sees near and far through one lens. Strong on presbyopia and lens choice.' },
    { id: 'patchbeard', name: 'Patchbeard', sprite: 'char-9', kind: 'char', hue: 260, strong: ['history', 'presbyopia'], blurb: 'Asks every history question twice. Strong on history and presbyopia.' },
    { id: 'visorian', name: 'Visorian', sprite: 'char-14', kind: 'char', hue: 200, strong: ['lifestyle', 'ew'], blurb: 'Goggles on for every swim. Strong on water, sport, travel and EW.' },
    { id: 'fluorofox', name: 'Fluorofox', sprite: 'char-15', kind: 'char', hue: 25, strong: ['rgp', 'fitting'], blurb: 'Reads a fluorescein pattern like a map. Strong on RGPs and fit.' },
    { id: 'redreflex', name: 'Redreflex', sprite: 'char-3', kind: 'char', hue: 10, strong: ['complications', 'history'], blurb: 'Spots a red eye from across the room. Strong on complications and history.' },
    { id: 'nightwear', name: 'Nightwear', sprite: 'char-13', kind: 'char', hue: 235, strong: ['ew', 'specialty'], blurb: 'Sleeps in its lenses, with a review booked. Strong on EW and Ortho-K.' },
    { id: 'dktective', name: 'Dktective', sprite: 'char-5', kind: 'char', hue: 190, strong: ['materials', 'care'], blurb: 'Investigates every Dk/t. Strong on materials and care.' },
    { id: 'irisius', name: 'Irisius', sprite: 'char-10', kind: 'char', hue: 0, strong: ['presbyopia', 'fitting'], blurb: 'Knows a pupil size for every multifocal. Strong on presbyopia and fit.' },
    { id: 'bluelight', name: 'Bluelight', sprite: 'char-8', kind: 'char', hue: 215, strong: ['materials', 'lenschoice'], blurb: 'Knows the modulus of every silicone hydrogel. Strong on materials and lens choice.' },
    { id: 'greenlid', name: 'Greenlid', sprite: 'char-7', kind: 'char', hue: 150, strong: ['care', 'complications'], blurb: 'Rubs, rinses and neutralises every night. Strong on care and complications.' },
    { id: 'sparticle', name: 'Sparticle', sprite: 'char-12', kind: 'char', hue: 210, strong: ['lifestyle', 'care'], blurb: 'Shields up against sand and campsite water. Strong on lifestyle and care.' },
    { id: 'pinguecula', name: 'Pinguecula', sprite: 'gk-penguin', kind: 'gk', hue: 200, strong: ['complications', 'lifestyle'], blurb: 'Waddles in from a windy beach. Strong on complications and lifestyle.', anims: { front: [0, 5, 150, 1], idle: [0, 5, 150, 1], hurt: [1, 1, 120], attack: [2, 3, 85], faint: [3, 3, 150], spawn: [4, 6, 110], power: [4, 6, 110] } },
    { id: 'fluorella', name: 'Fluorella', sprite: 'gk-fairy', kind: 'gk', hue: 150, strong: ['fitting', 'rgp'], blurb: 'Glows green under the cobalt filter. Strong on fit and RGPs.', anims: { front: [0, 4, 150, 1], idle: [0, 4, 150, 1], hurt: [1, 1, 120], attack: [2, 8, 85], faint: [3, 3, 150], spawn: [4, 4, 110], power: [4, 4, 110] } },
    { id: 'keratoggle', name: 'Keratoggle', sprite: 'gk-toggle', kind: 'gk', hue: 205, strong: ['rx', 'specialty'], blurb: 'Reads Ks to the nearest 0.01 mm. Strong on Rx conversion and specialty lenses.', anims: { front: [0, 5, 150, 1], idle: [0, 5, 150, 1], hurt: [1, 6, 120], attack: [2, 7, 85], faint: [3, 7, 150], spawn: [4, 7, 110], power: [4, 7, 110] } },
    { id: 'arcus', name: 'Arcus', sprite: 'gk-tracy', kind: 'gk', hue: 15, strong: ['complications', 'materials'], blurb: 'Draws a ring around the limbus and never misses a vessel. Strong on complications and materials.', anims: { front: [0, 5, 150, 1], idle: [0, 5, 150, 1], hurt: [1, 1, 120], attack: [2, 4, 85], faint: [3, 5, 150], spawn: [4, 5, 110], power: [4, 5, 110] } },
    { id: 'slitbot', name: 'Slitbot', sprite: 'gk-j5', kind: 'gk', hue: 25, strong: ['fitting', 'complications'], blurb: 'A beam of light that finds every bit of staining. Strong on fit and complications.', anims: { front: [0, 5, 150, 1], idle: [0, 5, 150, 1], hurt: [1, 1, 120], attack: [2, 3, 85], faint: [3, 2, 150], spawn: [4, 6, 110], power: [4, 6, 110] } },
    { id: 'vertexbot', name: 'Vertexbot', sprite: 'gk-gumbot', kind: 'gk', hue: 200, strong: ['rx', 'presbyopia'], blurb: 'Vertexes every power over ±4.00 without a calculator. Strong on Rx conversion and presbyopia.', anims: { front: [0, 4, 150, 1], idle: [0, 4, 150, 1], hurt: [1, 1, 120], attack: [2, 8, 85], faint: [3, 2, 150], spawn: [4, 6, 110], power: [4, 6, 110] } },
  ],
  wild: [
    // Soft toric & daily wear
    { id: 'torquerot', name: 'Torquerot', icon: '🌀', cat: 'soft', match: 'rotat|LARS|markings|torque', hint: 'A toric that settles off axis. LARS: left add, right subtract, and order the new axis with the rotation built in.' },
    { id: 'cylindrax', name: 'Cylindrax', icon: '📐', cat: 'soft', match: 'high cyl|high-cyl|\\bXR\\b|mixed', hint: 'Cyl past the standard toric range: Biofinity XR toric, or go rigid.' },
    { id: 'vertexa', name: 'Vertexa', icon: '🔭', cat: 'soft', match: 'vertex|BVD|high myope|high plus|high-plus', hint: 'Over ±4.00 the power changes at the cornea: F / (1 − dF) on both meridians, every time.' },
    { id: 'hypoxion', name: 'Hypoxion', icon: '🫁', cat: 'soft', match: 'hypoxia|endothel|microcyst|specular', hint: 'Low Dk/t starves the cornea: microcysts, striae, vessels. More oxygen, less wearing time.' },
    { id: 'readmyope', name: 'Squintmyope', icon: '📖', cat: 'soft', match: 'myopes miserable|can.t read in CLs', hint: 'In CLs a myope accommodates and converges more than in specs, so near work bites sooner.' },
    { id: 'sugarbeet', name: 'Sugarbeet', icon: '🍬', cat: 'soft', match: 'diabet', hint: 'Diabetes: slower healing, a shifting Rx and more infections. Dailies and closer reviews.' },
    { id: 'peroxidon', name: 'Peroxidon', icon: '🫧', cat: 'soft', match: 'H₂O₂|peroxide|MPS|solutions|care', hint: 'Peroxide: no preservatives and the best disinfection, but neutralise it before the lens goes in.' },
    // Rigid lenses (RGP)
    { id: 'bitoros', name: 'Bitoros', icon: '🥨', cat: 'rgp', match: 'bitoric|Mandell|\\bSPE\\b|\\bBST\\b', hint: 'High corneal cyl rocks a spherical RGP. A spherical-power-effect bitoric sits still and keeps the optics simple.' },
    { id: 'rigidon', name: 'Rigidon', icon: '🪨', cat: 'rgp', match: 'RGP vs|soft vs RGP|soft, RGP|RGP or|why not RGP|RGP\\?|decides', hint: 'RGPs mask corneal cyl and give the most oxygen; adaptation, sport and dust count against them.' },
    { id: 'tearlens', name: 'Tearlens', icon: '💧', cat: 'rgp', match: 'tear lens|BC change|residual cyl|internal astig|RGP maths', hint: 'Steepen the BC 0.05 mm and the tear lens adds about +0.25 D. Residual cyl is what the tear lens can’t mask.' },
    { id: 'lowrider', name: 'Lowrider', icon: '⬇️', cat: 'rgp', match: 'low-riding|ordering an RGP|RGP materials|RGP care|RGP solutions', hint: 'High-plus RGPs ride low. A minus carrier (lenticular) edge lets the top lid hold it up.' },
    { id: 'permeon', name: 'Permeon', icon: '🧬', cat: 'rgp', match: 'materials|modulus|SiHy|\\bDk\\b', hint: 'Dk belongs to the material, Dk/t to the lens. Stiffer, high-modulus SiHys cause more mechanical trouble.' },
    // Presbyopia & multifocals
    { id: 'monovisio', name: 'Monovisio', icon: '👁️', cat: 'presbyopia', match: 'monovision|dominance', hint: 'Distance in the dominant eye, near in the other. Check dominance with a +1.00 blur test.' },
    { id: 'multifocalix', name: 'Multifocalix', icon: '🎯', cat: 'presbyopia', match: 'multifocal|\\bMF\\b|EDOF', hint: 'Most soft multifocals are centre-near. Rotation and thickness limit the toric ones.' },
    { id: 'readfade', name: 'Readfade', icon: '📰', cat: 'presbyopia', match: 'presbyop|can.t read|intermediate', hint: 'Early presbyopes: hyperopes feel it first, and a myope in CLs feels it sooner than in specs.' },
    // Extended wear
    { id: 'nightshade', name: 'Nightshade', icon: '🌙', cat: 'ew', match: 'extended wear|\\bEW\\b|overnight', hint: 'Sleeping in lenses raises the MK risk several times over. SiHy, review after the first night, and no wear when red.' },
    { id: 'travelbug', name: 'Travelbug', icon: '✈️', cat: 'ew', match: 'holiday|trip|travel|Fiji|camping|pack', hint: 'Pack dailies, spare specs and a plan for a red eye far from help.' },
    // Water, sport & travel
    { id: 'tapwater-troll', name: 'Tapwater Troll', icon: '🚰', cat: 'lifestyle', match: 'swim|water|scuba', hint: 'Water and lenses don’t mix: Acanthamoeba. Dailies under goggles, then bin them.' },
    { id: 'kickback', name: 'Kickback', icon: '⚽', cat: 'lifestyle', match: 'soccer|rugby|sport|basketball|squash|tennis', hint: 'Contact sport: soft dailies stay put; RGPs dislodge, and dust gets under them.' },
    { id: 'scubaroo', name: 'Scubaroo', icon: '🤿', cat: 'lifestyle', match: 'scuba|pressure|beach|sand', hint: 'Soft lenses under a sealed mask; RGPs can trap bubbles as the pressure changes.' },
    // Ortho-K & specialty
    { id: 'orthokrake', name: 'Orthokrake', icon: '🐙', cat: 'specialty', match: 'ortho-k', hint: 'Reverse geometry flattens the centre overnight. Allow a washout before measuring for anything else.' },
    { id: 'conicorn', name: 'Conicorn', icon: '🦄', cat: 'specialty', match: 'keratoconus|\\bKC\\b', hint: 'A thinning cone and irregular cyl. RGP or scleral for vision, cross-linking to stop it progressing.' },
    // Aftercare & complications
    { id: 'tightoad', name: 'Tightoad', icon: '🐸', cat: 'aftercare', match: 'tight|fluctuating|dehydration', hint: 'No movement, an indent ring, vision that clears after a blink. Flatter BC or another material.' },
    { id: 'sealion', name: 'Sealion', icon: '🦭', cat: 'aftercare', match: '\\bSEAL\\b|arcuate', hint: 'A superior arcuate lesion: a stiff lens pressed on by a tight lid. Lower modulus, or a different design.' },
    { id: 'clarey', name: 'Clarey', icon: '🔴', cat: 'aftercare', match: 'CLARE|red eye|CLPU|\\bMK\\b|\\bIK\\b', hint: 'A red eye after sleeping in lenses: CLARE, CLPU or MK? Pain, VA and the infiltrate decide. Lenses out.' },
    { id: 'slikko', name: 'Slikko', icon: '🪢', cat: 'aftercare', match: '\\bSLK\\b|CLPC|superior redness|preservative', hint: 'Superior limbic redness in a long-term wearer: preservatives and deposits. Peroxide and a refit.' },
    { id: 'ninethree', name: 'Ninethree', icon: '🕒', cat: 'aftercare', match: '3 & 9|3 and 9|\\bVLK\\b|dellen', hint: '3 and 9 o’clock staining from an RGP edge that stands off. Less edge lift, better blinking.' },
    { id: 'depositor', name: 'Depositor', icon: '🧽', cat: 'aftercare', match: 'deposit|mucin|fringes|pre-lens', hint: 'Protein and lipid on the surface. Change the modality or the care system.' },
    { id: 'oedemon', name: 'Oedemon', icon: '🌫️', cat: 'aftercare', match: 'oedema|slide|vessels|\\bMGD\\b', hint: 'Name it, grade it, fix it: oedema, vessels and MGD on the slide.' },
  ],
};
