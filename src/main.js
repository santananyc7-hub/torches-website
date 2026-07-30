/* ============================================================
   Torches — scroll-driven landing
   Lenis smooth scroll · GSAP ScrollTrigger · scroll-scrubbed
   background video · pinned reveals · card gallery
   ============================================================ */

import "./style.css";
import "./glass.css";

import Lenis from "lenis";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

import { loadLiveMenu, renderMenu } from "./menu.js";

gsap.registerPlugin(ScrollTrigger);

const bgVideo = document.querySelector("#bgv");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(hover: none), (max-width: 768px)").matches;

/* ------------------------------------------------------------
   Lenis smooth scroll, driven by GSAP's ticker (single RAF)
   ------------------------------------------------------------ */
const lenis = new Lenis({
  duration: 1.15,
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 1.4,
});

lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// Anchor links use Lenis
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: 0, duration: 1.2 });
  });
});

/* Shared deals-popup opener (assigned in setupDealsModal) + once-per-session intro */
let openDealsModal = null;
function dealsIntroOncePerSession() {
  try {
    if (sessionStorage.getItem("torches_deals_shown")) return;
    sessionStorage.setItem("torches_deals_shown", "1");
  } catch (_) {}
  setTimeout(() => {
    if (openDealsModal) openDealsModal();
  }, 550);
}

/* ------------------------------------------------------------
   21+ age gate
   ------------------------------------------------------------ */
function setupAgeGate() {
  const gate = document.querySelector("#agegate");
  if (!gate) return;
  const KEY = "torches_age_ok";
  let verified = false;
  try {
    verified = localStorage.getItem(KEY) === "1";
  } catch (_) {}

  if (verified) {
    gate.hidden = true;
    dealsIntroOncePerSession();
    return;
  }

  gate.hidden = false;
  lenis.stop();
  document.documentElement.style.overflow = "hidden";

  const yes = gate.querySelector("#age-yes");
  const no = gate.querySelector("#age-no");
  const deny = gate.querySelector("#age-deny");

  yes.addEventListener("click", () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch (_) {}
    gate.style.transition = "opacity 0.5s ease";
    gate.style.opacity = "0";
    document.documentElement.style.overflow = "";
    lenis.start();
    setTimeout(() => {
      gate.hidden = true;
      gate.style.opacity = "";
      ScrollTrigger.refresh();
    }, 500);
    dealsIntroOncePerSession();
  });

  no.addEventListener("click", () => {
    deny.hidden = false;
    yes.hidden = true;
    no.hidden = true;
  });
}
setupAgeGate();

/* ------------------------------------------------------------
   Deals popup / modal
   ------------------------------------------------------------ */
function setupDealsModal() {
  const modal = document.querySelector("#dealsmodal");
  if (!modal) return;
  const grid = modal.querySelector("#dealsmodal-grid");
  const src = document.querySelector(".deals__grid");
  if (grid && src && !grid.childElementCount) {
    grid.innerHTML = src.innerHTML; // mirror the live deals into the popup
    grid.querySelectorAll("img").forEach((i) => i.setAttribute("loading", "eager"));
  }
  const closeBtn = modal.querySelector("#dealsClose");

  const open = (e) => {
    if (e) e.preventDefault();
    modal.hidden = false;
    document.documentElement.style.overflow = "hidden";
    lenis.stop();
  };
  openDealsModal = open;
  const close = () => {
    modal.hidden = true;
    document.documentElement.style.overflow = "";
    lenis.start();
  };

  document
    .querySelectorAll("[data-deals-open]")
    .forEach((el) => el.addEventListener("click", open));
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) close();
  });
}
setupDealsModal();

/* Analytics: fire a lightweight event on every tracked CTA.
   Works with GA4 (gtag) or GTM (dataLayer) when present; no-ops otherwise. */
function track(name) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "cta_click", cta: name });
    if (typeof window.gtag === "function") {
      window.gtag("event", "cta_click", { cta: name });
    }
  } catch (_) {}
}
document.addEventListener(
  "click",
  (e) => {
    const el = e.target.closest("[data-cta]");
    if (el) track(el.getAttribute("data-cta"));
  },
  { passive: true }
);

/* Populate hero deals + category tiles from Dutchie Plus (native cards, no iframe).
   The static markup in index.html is the SEO / no-JS fallback; when MENU_API is set
   in src/menu.js, live data overrides it. */
async function hydrateMenu() {
  const live = await loadLiveMenu();
  if (live) {
    renderMenu(live);
    ScrollTrigger.refresh();
  }
}

/* Mobile nav toggle */
function setupNav() {
  const toggle = document.querySelector("#navToggle");
  const links = document.querySelector("#navLinks");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );
}

/* Sticky mobile action bar — show after the hero, hide over the footer */
function setupMobileBar() {
  const bar = document.querySelector("#mobilebar");
  const hero = document.querySelector("#home");
  const footer = document.querySelector(".footer");
  if (!bar) return;
  function update() {
    const y = window.scrollY;
    const past = y > (hero ? hero.offsetHeight : 600) * 0.6;
    const nearFooter =
      footer && y + window.innerHeight > footer.offsetTop + 60;
    bar.classList.toggle("is-visible", past && !nearFooter);
  }
  update();
  lenis.on("scroll", update);
  window.addEventListener("resize", update);
}

/* ------------------------------------------------------------
   Scroll-scrubbed background video
   Map whole-page scroll progress -> currentTime
   ------------------------------------------------------------ */
let lastVideoT = -1;
let videoReady = false;

function primeVideo() {
  videoReady = true;
  // nudge first frame so the poster hands off to the video cleanly
  try {
    bgVideo.currentTime = 0.001;
  } catch (_) {}
}

if (bgVideo) {
  if (bgVideo.readyState >= 1) primeVideo();
  bgVideo.addEventListener("loadedmetadata", primeVideo);
}

function scrubVideo() {
  if (!videoReady || !bgVideo || !bgVideo.duration) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const progress = max > 0 ? gsap.utils.clamp(0, 1, window.scrollY / max) : 0;
  const t = progress * (bgVideo.duration - 0.05);
  if (Math.abs(t - lastVideoT) > 0.008) {
    bgVideo.currentTime = t;
    lastVideoT = t;
  }
}

lenis.on("scroll", scrubVideo);

/* On touch devices Lenis scroll events can be sparse and iOS renders video
   seeks far better on animation frames — so drive the scrub with a continuous
   rAF loop that reads the live scroll position every frame. */
if (isTouch) {
  const rafScrub = () => {
    scrubVideo();
    requestAnimationFrame(rafScrub);
  };
  requestAnimationFrame(rafScrub);
}

/* Drifting accent glow follows scroll subtly (never dominant) */
const glow = document.querySelector("#glow");
function moveGlow() {
  if (!glow) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const p = max > 0 ? window.scrollY / max : 0;
  glow.style.top = 20 + p * 55 + "%";
}
lenis.on("scroll", moveGlow);

/* ------------------------------------------------------------
   Nav scrolled state
   ------------------------------------------------------------ */
const nav = document.querySelector("#nav");
ScrollTrigger.create({
  start: "top -80",
  end: 99999,
  onUpdate: (self) => nav.classList.toggle("is-scrolled", self.scroll() > 80),
});

/* ------------------------------------------------------------
   Hero intro (after preloader)
   ------------------------------------------------------------ */
function heroIntro() {
  if (reduceMotion) return;
  gsap.from(".hero .eyebrow", { y: 20, opacity: 0, duration: 0.8, delay: 0.1 });
  gsap.from(".hero__title .line", {
    yPercent: 115,
    opacity: 0,
    duration: 1,
    stagger: 0.09,
    ease: "power4.out",
    delay: 0.2,
  });
  gsap.from(".hero__sub", { y: 24, opacity: 0, duration: 0.9, delay: 0.55 });
  gsap.from(".hero__cta > *", {
    y: 20,
    opacity: 0,
    duration: 0.7,
    stagger: 0.1,
    delay: 0.75,
  });
  gsap.from(".trust", { opacity: 0, duration: 0.9, delay: 1 });
  gsap.from(".hero__deals", {
    y: 30,
    opacity: 0,
    duration: 1,
    delay: 0.5,
    ease: "power3.out",
  });
}

/* ------------------------------------------------------------
   Generic reveals
   ------------------------------------------------------------ */
function setupReveals() {
  const targets = [
    ".shop__head > *",
    ".cat",
    ".deals__head > *",
    ".deal",
    ".feature__text > *",
    ".feature__panel",
    ".design__head > *",
    ".material",
    ".journal__head > *",
    ".post",
    ".specs__head > *",
    ".specs__table",
    ".buy__panel",
  ];
  document.querySelectorAll(targets.join(",")).forEach((el) => {
    el.classList.add("reveal");
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () =>
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
        }),
    });
  });

  // Stagger materials within their row
  gsap.utils.toArray(".material-row").forEach((row) => {
    const cards = row.querySelectorAll(".material");
    ScrollTrigger.create({
      trigger: row,
      start: "top 80%",
      once: true,
      onEnter: () =>
        gsap.to(cards, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.12,
          ease: "power3.out",
        }),
    });
  });
}

/* ------------------------------------------------------------
   Impact — pinned word reveal
   ------------------------------------------------------------ */
function setupImpact() {
  const section = document.querySelector("#impact");
  const pin = section.querySelector(".impact__pin");
  const words = [...section.querySelectorAll(".word")];
  const note = section.querySelector(".impact__note");

  function render(p) {
    words.forEach((word, i) => {
      const start = (i / words.length) * 0.7;
      const o = gsap.utils.clamp(0, 1, (p - start) / 0.16);
      word.style.opacity = 0.1 + o * 0.9;
      word.style.filter = `blur(${(1 - o) * 8}px)`;
      word.style.transform = `translateY(${(1 - o) * 20}px)`;
    });
    const no = gsap.utils.clamp(0, 1, (p - 0.72) / 0.2);
    note.style.opacity = no;
    note.style.transform = `translateY(${(1 - no) * 16}px)`;
  }

  render(0);

  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: () => "+=" + window.innerHeight * 1.6,
    pin: pin,
    scrub: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => render(self.progress),
  });
}

/* ------------------------------------------------------------
   Workflow — one-card-at-a-time pinned gallery
   ------------------------------------------------------------ */
let galleryST = null;
function setupGallery() {
  const track = document.querySelector("#workflow-track");
  const slides = [...track.querySelectorAll(".workflow-card")];
  const N = slides.length;

  function render(p) {
    const pos = p * (N - 1);
    slides.forEach((el, i) => {
      const d = pos - i;
      const ad = Math.abs(d);
      el.style.opacity = Math.max(0, 1 - ad / 0.6);
      el.style.transform = `translateY(-50%) translateX(${-d * 130}px) scale(${
        1 - Math.min(ad, 1) * 0.06
      })`;
      el.style.filter = `blur(${Math.min(ad * 10, 14)}px)`;
      el.style.zIndex = String(100 - Math.round(ad * 10));
      el.style.pointerEvents = 1 - ad / 0.6 > 0.6 ? "auto" : "none";
    });
  }

  render(0);

  galleryST = ScrollTrigger.create({
    trigger: "#workflow",
    start: "top top",
    end: () => "+=" + Math.max(1, N - 1) * window.innerHeight * 0.8,
    pin: ".workflow__pin",
    scrub: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => render(self.progress),
  });
}

/* ------------------------------------------------------------
   Smoke-trail cursor (canvas, desktop only)
   Emits soft light-smoke puffs that drift up and fade.
   ------------------------------------------------------------ */
function setupSmoke() {
  if (isTouch || reduceMotion) return;
  const canvas = document.querySelector("#smoke");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w = 0;
  let h = 0;
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = Math.floor(window.innerWidth * dpr);
    h = canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  }
  resize();
  window.addEventListener("resize", resize);

  const parts = [];
  let lastX = window.innerWidth / 2;
  let lastY = window.innerHeight / 2;
  let primed = false;

  window.addEventListener("mousemove", (e) => {
    if (!primed) {
      lastX = e.clientX;
      lastY = e.clientY;
      primed = true;
      return;
    }
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const dist = Math.hypot(dx, dy);
    const n = Math.min(5, Math.max(1, Math.round(dist / 6)));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      parts.push({
        x: (lastX + dx * t) * dpr,
        y: (lastY + dy * t) * dpr,
        r: (5 + Math.random() * 8) * dpr,
        life: 1,
        vx: (Math.random() - 0.5) * 0.35 * dpr,
        vy: (-0.35 - Math.random() * 0.55) * dpr,
        g: 0.1 + Math.random() * 0.08,
      });
    }
    lastX = e.clientX;
    lastY = e.clientY;
    if (parts.length > 260) parts.splice(0, parts.length - 260);
  });

  gsap.ticker.add(() => {
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= 0.016;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.r += 0.7 * dpr;
      p.vx *= 0.98;
      const a = p.life * p.life * p.g;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, `rgba(198, 224, 246, ${a})`);
      grad.addColorStop(1, "rgba(198, 224, 246, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/* ------------------------------------------------------------
   Preloader -> then build everything
   ------------------------------------------------------------ */
function boot() {
  const pre = document.querySelector("#preloader");
  const bar = pre.querySelector(".preloader__bar span");

  const done = () => {
    pre.classList.add("is-done");
    if (bgVideo) {
      if (isTouch) {
        // Mobile: scrub the video with scroll (same as desktop). Prime the
        // decoder with a muted play()->pause() so iOS honors currentTime seeks
        // (the all-keyframe encode makes those seeks fast), then scrub controls it.
        bgVideo.muted = true;
        bgVideo.loop = false;
        const prime = () => {
          const p = bgVideo.play();
          if (p && p.then) p.then(() => { bgVideo.pause(); scrubVideo(); }).catch(() => {});
          else { bgVideo.pause(); scrubVideo(); }
        };
        prime();
        // iOS often only unlocks seeking after a real gesture — the first
        // touch/scroll re-primes so scrubbing kicks in immediately after.
        const kick = () => prime();
        window.addEventListener("touchstart", kick, { passive: true, once: true });
        window.addEventListener("click", kick, { once: true });
      } else {
        bgVideo.play().catch(() => {}); // decode warm-up; scrub controls it
      }
    }
    heroIntro();
    scrubVideo();
    ScrollTrigger.refresh();
  };

  if (reduceMotion) {
    gsap.set(bar, { width: "100%" });
    done();
    return;
  }

  gsap.to(bar, {
    width: "100%",
    duration: 1.1,
    ease: "power2.inOut",
    onComplete: () => gsap.delayedCall(0.15, done),
  });
}

/* Build scroll systems (safe to set up before preloader finishes) */
setupReveals();
setupImpact();
setupSmoke();
setupNav();
hydrateMenu();
setupMobileBar();

/* Gallery is responsive: pinned on desktop widths, stacked below 769px.
   gsap.matchMedia re-runs on resize and cleans up its ScrollTriggers. */
const mm = gsap.matchMedia();
mm.add("(min-width: 769px)", () => {
  setupGallery();
  return () => {
    galleryST = null;
    document
      .querySelectorAll("#workflow-track .workflow-card")
      .forEach((el) => {
        el.style.opacity = "";
        el.style.transform = "";
        el.style.filter = "";
        el.style.zIndex = "";
        el.style.pointerEvents = "";
      });
  };
});

window.addEventListener("load", boot);
// Fallback if 'load' already fired
if (document.readyState === "complete") boot();

// Keep pins honest after fonts/layout settle
window.addEventListener("resize", () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());

/* ------------------------------------------------------------
   Dev hooks (verification in Claude Preview / console)
   ------------------------------------------------------------ */
if (import.meta.env.DEV) {
  window.__lenis = lenis;
  window.__ST = ScrollTrigger;
  window.__bgv = bgVideo;
}
