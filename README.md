# CL Orals Lab

A practice site for the contact lens oral exam. It runs past oral cases the way the examiner runs them, one patient and one spectacle Rx at a time, and backs them up with a topic question bank, a vertex/LARS calculator and an Australian lens parameter guide.

Open `index.html` in a browser. There is no build step and no server needed. Progress (missed questions, "got it" marks) is saved in your browser's local storage.

## What's in it

| Page | What it does |
|---|---|
| **Oral simulator** | 37 cases: 21 rebuilt from the 2022 and 2025 orals, 8 from the 5th-year examiner question lists (Michael, Judy, Lily, Eric), 5 aftercare/complication cases from the orals study doc and slide notes, 2 cases built on the scripts in the practice doc, and a slide round from the slide exam notes. *Full cases* mode runs each case in exam order (history → convert Rx → pick one lens → justify → fit → complications → lifestyle twist → care → plan B). *Topic drill* mode mixes single questions from one or more topics. Pools: All / New / Missed. Source filter: 2025, 2022, or notes, practice doc & slides. |
| **Question bank** | All 221 case questions plus 93 theory questions from the past-paper booklet, practice doc, CL orals study doc, slide exam notes, Lily's commonly-asked list and the 2022/2025 orals notes, filterable by topic, searchable, with model answers and Got it / Review again marks. |
| **Rx lab** | Calculator (both meridians, any BVD, nasal-torque axis rounding, spherical-equivalent compromise), a random-Rx conversion drill, a LARS helper, and a step-by-step guide to vertexing and converting a spectacle Rx (worked example, 12 mm quick-reference table, common slips). Values typed here and in the lens finder are remembered across tabs and reloads. |
| **Lens guide** | Parameters for the lenses that come up in the orals, a "will it fit?" checker for a CL Rx, care systems and RGP materials. |
| **Fact check** | Claims in the student notes that were wrong or out of date, with the correction and sources. |

## Topics

Every question is tagged with one of these topics:

History & patient selection · Rx conversion & optics · Lens selection & modality · Materials, Dk & modulus · Fit assessment & toric stability · Rigid lenses (RGP) · Presbyopia · Extended wear · Water, sport & travel · Care systems · Complications · Ortho-K & specialty

Case categories add **Aftercare & complications** (tight lens, SEAL, SLK, red eye after EW, RGP 3 & 9 staining, slide questions).

## Files

```
index.html            page shell and navigation
img/                  favicon (SVG + PNG fallbacks) and Apple touch icon
css/styles.css        all styling (light and dark theme tokens at the top)
js/data-lenses.js     lens parameters, solutions, RGP materials, fact-check list, sources
js/data-theory.js     past-paper theory questions
js/cases-2025.js      cases from the 2025 orals
js/cases-2022.js      cases from the 2022 orals
js/cases-notes.js     cases from the examiner question lists and aftercare notes
js/cases-practice.js  cases from the practice doc scripts and a slide round from the slide exam notes
CL orals/             the source past papers, orals notes and study documents
js/app.js             simulator, question bank, Rx lab, lens guide, fact check
```

## Adding a case

Copy any case object in `js/cases-2025.js` and edit it. Each step needs `phase`, `topic` (one of the topic ids in `app.js`), `type`, `q`, `good`, `bad` and `model`. Step types:

- `mcq`: `options` and `answer` (index of the best option)
- `multi`: `options` and `answers` (all correct indices) for "what else?" questions

For `mcq` and `multi`, add `why: { <index>: 'one line on why this option is wrong' }` for every wrong option. The notes show under each option in the simulator feedback and as "Why the other options are wrong" in the question bank.
- `rx`: `accept: { R: { sph: [...], cyl: [...], axis: [...] }, L: {...} }`; optional `from` if the step works from a different spectacle Rx (e.g. a monovision near Rx)
- `match`: `rows: [{ label, options, answer }]`
- `open`: say the answer aloud, reveal the model answer, mark yourself

Optional case fields: `findings` (Ks, slit-lamp findings, current lens) shows under the Rx; `spec: {}` for aftercare cases with no Rx. In an `rx` step, `cyl: [0], axis: []` expects a DS answer (axis left blank).

The examiner's name in the feedback is set by `EXAMINER` at the top of `js/app.js`.

## How the answers were checked

- Every Rx conversion was recalculated with F / (1 − dF) at 12 mm on both principal meridians, then rounded to powers that are actually made.
- Lens choices were checked against the ranges in `js/data-lenses.js`. Ranges marked **confirm** come from the manufacturers' global pages or Australian retailer notices rather than an Australian product page, so check them against the current Australian fitting guide.
- Student answers that were wrong (for example "Biofinity is approved for 29 nights", "Biofinity XR comes in −3.50 DC", "adding the near add to the vertexed CL Rx") are corrected in the model answers and listed on the Fact check page.
