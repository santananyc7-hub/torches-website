/* ============================================================
   Torches — menu data layer
   ------------------------------------------------------------
   We use DUTCHIE PLUS (headless GraphQL API) + a custom menu, so
   products render as NATIVE cards (no iframe).

   - By default the hero deals + category tiles are the static
     markup already in index.html (great for SEO / no-JS).
   - Set MENU_API to your Dutchie Plus PROXY endpoint to render
     live products/specials instead. The Plus API key is private
     and must stay server-side, so MENU_API should point at your
     own serverless function that runs the GraphQL query and
     returns JSON in the { featured, categories } shapes below.

   Example Dutchie Plus GraphQL (run server-side in the proxy):
     query ($retailerId: ID!) {
       menu(retailerId: $retailerId, filter: { Status: Active }) {
         products { id name brand { name } category
                    variants { option priceRec }
                    specialPrices }
       }
       specials(retailerId: $retailerId) { id name }
     }
   Map the response into the shapes below and return it as JSON.
   ============================================================ */

export const MENU_URL = "https://torches.nyc"; // custom Dutchie Plus menu base
export const SHOP_URL = MENU_URL + "/shop/";
export const DEALS_URL = MENU_URL + "/midtown-nyc-cannabis-deals/";
export const MENU_API = ""; // e.g. "/api/menu" (your proxy) — empty keeps the static fallback

// Category tiles — link to the single Dutchie Plus menu (categories filter in-menu).
export const CATEGORIES = [
  { name: "Flower", href: SHOP_URL },
  { name: "Pre-Rolls", href: SHOP_URL },
  { name: "Vapes", href: SHOP_URL },
  { name: "Edibles", href: SHOP_URL },
  { name: "Concentrates", href: SHOP_URL },
  { name: "Tinctures", href: SHOP_URL },
  { name: "Topicals", href: SHOP_URL },
  { name: "Beverages", href: SHOP_URL },
  { name: "Accessories", href: SHOP_URL },
];

// Hero deal/product cards (real, current — update as specials rotate, or via MENU_API).
export const FEATURED = [
  {
    feature: true,
    tag: "Deal of the week",
    name: "STIIIZY — Buy One, Get One 40% Off",
    cta: "Shop the deal",
    img: "/img/products/stiiizy.jpg",
    href: DEALS_URL,
  },
  {
    category: "Flower · Hybrid · 27% THC",
    name: "Wizard Trees · RS-11 · 3.5g",
    price: "$62",
    img: "/img/products/wizardtrees.jpg",
    href: MENU_URL + "/products/wizard-trees-rs-11-flower-3-5g/",
  },
  {
    category: "Pre-Rolls · Sativa · 29% THC",
    name: "Ruby Farms · Sour Diesel · 7pk",
    price: "$40",
    img: "/img/products/rubyfarms.jpg",
    href: MENU_URL + "/products/ruby-farms-sour-diesel-pre-roll-7pk-3-5g/",
  },
];

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function heroCardHTML(p) {
  const href = esc(p.href || MENU_URL);
  if (p.feature) {
    return `<a class="pcard pcard--feature" href="${href}" target="_blank" rel="noopener" data-cta="hero-deal-featured">
      ${p.img ? `<img class="pcard__thumb pcard__thumb--lg" src="${esc(p.img)}" alt="" loading="eager" />` : ""}
      <div class="pcard__feat">
        <span class="pcard__tag">${esc(p.tag || "Featured")}</span>
        <h3 class="pcard__name">${esc(p.name)}</h3>
        ${p.meta ? `<p class="pcard__meta">${esc(p.meta)}</p>` : ""}
        <span class="pcard__cta">${esc(p.cta || "Shop")} →</span>
      </div></a>`;
  }
  return `<a class="pcard" href="${href}" target="_blank" rel="noopener" data-cta="hero-prod">
    ${p.img ? `<img class="pcard__thumb" src="${esc(p.img)}" alt="" loading="lazy" />` : ""}
    <div class="pcard__info">${p.category ? `<span class="pcard__cat">${esc(p.category)}</span>` : ""}<h3 class="pcard__name">${esc(p.name)}</h3></div>
    <div class="pcard__buy">${p.price ? `<span class="pcard__price">${esc(p.price)}</span>` : ""}<span class="pcard__cta">Shop →</span></div></a>`;
}

function catTileHTML(c) {
  const href = esc(c.href || `${MENU_URL}/menu/${c.slug || ""}`);
  return `<a class="cat glass" data-cta="cat-${esc(c.slug || c.name)}" href="${href}" target="_blank" rel="noopener"><span class="cat__name">${esc(c.name)}</span><span class="cat__go">Shop →</span></a>`;
}

/* Replace the static hero cards + category grid with the given data. */
export function renderMenu({ featured, categories } = {}) {
  const list = document.querySelector("#hero-deals-list");
  if (list && featured?.length) list.innerHTML = featured.map(heroCardHTML).join("");
  const grid = document.querySelector("#shop-grid");
  if (grid && categories?.length) grid.innerHTML = categories.map(catTileHTML).join("");
}

/* Fetch live data from your Dutchie Plus proxy. Returns null if not configured
   or on any error (static markup then stays as the fallback). */
export async function loadLiveMenu() {
  if (!MENU_API) return null;
  try {
    const r = await fetch(MENU_API, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const data = await r.json();
    return {
      featured: data.featured || FEATURED,
      categories: data.categories || CATEGORIES,
    };
  } catch (_) {
    return null;
  }
}
