# Torches — Scroll-Driven Landing Page

A premium, single-page, scroll-driven motion site for **Torches**, a New York
cannabis emporium. The generated store film plays as one **fixed full-screen
background** that **scrubs frame-by-frame with scroll** — content scrolls over
it with dark overlays for readability.

Built following `.claude/skills/BRAND-landing/SKILL.md`, with all brand
decisions derived from `../copy/brand-kit.md`.

## Stack

- **Vite** + vanilla JavaScript (ES modules)
- **GSAP** + **ScrollTrigger** — scroll animation, pinned sections
- **Lenis** — smooth scrolling (driven by GSAP's ticker)
- Fixed, scroll-scrubbed background video (`public/bg.mp4`, all-keyframe H.264)
- CSS variables for brand tokens (navy / off-white / neon-sky / brass)
- Google Fonts: Anton (display), Archivo (body), EB Garamond (accent)

## Run locally

```bash
cd website
npm install
npm run dev
```

Then open the printed URL (default http://localhost:5173).

## Production build

```bash
npm run build          # base is already "./" via vite.config.js
npm run preview        # preview the built site over HTTP
# or:  npx serve dist
```

Do **not** open the build via `file://` — use the dev server or a static
server so the video and modules load correctly.

## Structure

```
website/
├─ index.html          # markup + Google Fonts + fixed background layers
├─ vite.config.js      # base: "./" (portable build)
├─ src/
│  ├─ main.js          # Lenis, ScrollTrigger, video scrub, pins, cursor
│  ├─ style.css        # tokens, layout, sections, video layer, responsive
│  └─ glass.css        # glass panels, buttons, chips
└─ public/
   ├─ bg.mp4           # scroll-scrubbed all-keyframe background video
   └─ img/
      ├─ poster.jpg        # hero/mobile poster (frame from the film)
      └─ poster-neon.jpg
```

## How the background scrub works

`src/main.js` maps whole-page scroll progress to `bgVideo.currentTime` (not
autoplay), throttling redundant seeks. Because the source video is encoded
**all-keyframe** (`-g 1`), every frame is independently seekable, so scrubbing
stays smooth in both directions.

## Sections

1. Hero — "The future of New York consumption"
2. Why Torches — pinned statement reveal
3. The Selection — curated breadth
4. The Guidance — expert, no-pressure service
5. The Space — the landmark apothecary materials
6. Built for every New Yorker — pinned guides gallery
7. The Particulars — store facts
8. Come see the future — closing CTA
9. Footer

## Re-encode a new background video (if the film changes)

The site video is already all-keyframe. If you swap in a new raw file, re-encode
it with the helper (per the skill):

```bash
# from the project root (one level above website/)
ffmpeg -y -i assets/videos/torches-scroll-background.mp4 -an \
  -c:v libx264 -preset slow -crf 20 -g 1 -keyint_min 1 -sc_threshold 0 \
  -pix_fmt yuv420p -movflags +faststart website/public/bg.mp4
```

## Notes

- Mobile / touch: the video is replaced by a poster image, the custom cursor is
  disabled, and the guides gallery stacks vertically.
- No fabricated prices or pre-orders (Torches is a licensed dispensary); the
  closing CTA drives to Shop / Delivery / Visit.
- Dev console hooks (dev mode): `window.__bgv`, `window.__lenis`, `window.__ST`.
