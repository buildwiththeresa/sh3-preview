# SH3 similar source (reconstructed)

**This is not the original DevAssistant / Ridge Runners project source.**  
It is a **similar Vite + React** app rebuilt from the recovered production mirror:

- SSR HTML markup → `src/content/homeMarkup.html` (wired by `src/pages/HomePage.tsx`)
- Pretty-printed production CSS → `src/styles/`
- Images + fonts → `public/_site/assets/`

Use it as an editable starting point that looks like the live SH3-branded page.

**Runnable copy on this machine:** `/agent/sh3-similar-source` (Vite on http://127.0.0.1:5173/)  
**Store / download:** `/cursor/stores/self/docs/sh3-similar-source/` and `sh3-similar-source.zip`

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173/

```bash
npm run build
npm run preview
```

## What’s interactive / motion

Full-page motion modeled on the production Home bundle (`src/motion/initMotion.ts`):

- Lenis smooth scroll
- Hero pin + diamond window scrub + title breathing
- Marquee tickers (velocity-linked)
- Horizontal Membership Rewards pin (`.runs`)
- Scroll rubber titles, diamond crew photos, word scrub quotes
- Steps path draw, gallery 3D tilt, chart bars, pricing rise
- Schedule/FAQ sweep-ins, contact scrub
- Sticky header hide-on-scroll

Open-source stand-ins for Club SplitText (chars/words/lines). Not byte-identical to DevAssistant, but section choreography matches.

## Layout

```
sh3-similar-source/
  src/pages/HomePage.tsx   ← main page markup (editable)
  src/styles/global.css    ← template + base styles
  src/styles/home.css      ← SH3 / home overrides
  public/_site/assets/     ← images + fonts from the mirror
  reference/               ← original SSR fragment for comparison
```

## Honest limits

1. File/component names are reconstructed, not original.
2. Later Ridge template sections still contain leftover placeholder (lorem) copy as on the live build.
3. DevAssistant hosting APIs / analytics are omitted.
