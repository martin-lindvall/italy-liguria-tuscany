/* ==========================================================
   Reseguide – bilder, karta och navigering
   ----------------------------------------------------------
   Bilder:  lägg data-wiki="Artikelnamn" (engelska Wikipedia)
            på ett <figure class="media">. Använd data-wiki-lang="it"
            för italienska Wikipedia, eller data-img="Fil.jpg" för
            en specifik bild från Wikimedia Commons.
   Karta:   alla element med class="place" och data-lat/data-lng
            blir markörer på kartan (<div data-map>).
   ========================================================== */
(function () {
  "use strict";

  const CATS = {
    bas:     "Utgångspunkt",
    by:      "Byar & städer",
    kultur:  "Kyrkor, kloster & museer",
    berg:    "Bergsbyar",
    mat:     "Mat & glass",
    vin:     "Vin & olivolja",
    natur:   "Natur & aktiviteter",
    marknad: "Marknader",
    vag:     "Motorväg",
    kust:    "Kustvägen SS1",
    rast:    "Rast & avstickare",
    trafik:  "Parkering & spårvagn",
  };

  /* ---------- Hjälpfunktioner ---------- */
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignorera */ } },
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const gmaps = (q) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);

  /* ---------- Tema (ljust/mörkt) ---------- */
  const root = document.documentElement;
  const savedTheme = (() => { try { return localStorage.getItem("theme"); } catch (e) { return null; } })();
  if (savedTheme) root.setAttribute("data-theme", savedTheme);
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dark = root.getAttribute("data-theme")
        ? root.getAttribute("data-theme") === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
      const next = dark ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { /* ignorera */ }
    });
  });

  /* ---------- Bilder från Wikipedia / Wikimedia Commons ---------- */
  // Wikimedia serverar miniatyrer i standardbredder
  const STEPS = [330, 500, 960, 1280, 1920];
  const pickWidth = (el) => {
    const want = Math.min(1920, (el.clientWidth || 600) * Math.min(window.devicePixelRatio || 1, 2));
    return STEPS.find((w) => w >= want) || 1920;
  };

  async function wikiImage(title, lang) {
    const key = "wimg:" + lang + ":" + title;
    const cached = store.get(key);
    if (cached) return cached;
    const url = "https://" + lang + ".wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title.replace(/ /g, "_"));
    const res = await fetch(url, { headers: { Accept: "application/json" }, referrerPolicy: "no-referrer" });
    if (!res.ok) throw new Error("wiki " + res.status);
    const data = await res.json();
    const img = data.originalimage || data.thumbnail;
    if (!img) throw new Error("ingen bild");
    const src = img.source;
    const file = decodeURIComponent(src.split("/").pop());
    const info = {
      original: src,
      width: img.width || 0,
      file: file,
      page: data.content_urls && data.content_urls.desktop ? data.content_urls.desktop.page : null,
    };
    store.set(key, info);
    return info;
  }

  function thumbUrl(info, width) {
    // https://upload.wikimedia.org/wikipedia/commons/a/ab/Fil.jpg
    //  -> https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Fil.jpg/960px-Fil.jpg
    if (!info.width || info.width <= width || /\.svg$/i.test(info.file)) return info.original;
    const m = info.original.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+)\/(\w\/\w\w\/)(.+)$/);
    if (!m) return info.original;
    return m[1] + "/thumb/" + m[2] + m[3] + "/" + width + "px-" + m[3];
  }

  function showImage(fig, src, fallbackSrc, fileName) {
    const img = new Image();
    img.alt = fig.getAttribute("data-alt") || "";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      img.classList.add("loaded");
      fig.classList.add("has-img");
      const host = fig.closest(".hero");
      if (host) host.classList.add("has-img");
    };
    img.onerror = () => {
      if (fallbackSrc && img.src !== fallbackSrc) img.src = fallbackSrc;
      else img.remove();
    };
    img.src = src;
    fig.prepend(img);

    if (fileName) {
      const credit = document.createElement("a");
      credit.className = "credit";
      credit.href = "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(fileName.replace(/ /g, "_"));
      credit.target = "_blank";
      credit.rel = "noopener noreferrer";
      credit.textContent = "Foto: Wikimedia Commons";
      credit.title = "Fotograf och licens";
      const hero = fig.closest(".hero");
      (hero || fig).appendChild(credit);
    }
  }

  async function loadFigure(fig) {
    const width = pickWidth(fig);
    const direct = fig.getAttribute("data-img");
    if (direct) {
      const src = "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(direct) + "?width=" + width;
      showImage(fig, src, null, direct);
      return;
    }
    const title = fig.getAttribute("data-wiki");
    if (!title) return;
    const lang = fig.getAttribute("data-wiki-lang") || "en";
    try {
      const info = await wikiImage(title, lang);
      showImage(fig, thumbUrl(info, width), info.original, info.file);
    } catch (e) {
      /* behåll den färgade bakgrunden */
    }
  }

  const figures = document.querySelectorAll("figure.media[data-wiki], figure.media[data-img], figure.media[data-label]");
  // Namnetikett som syns tills (eller om inte) bilden laddas
  figures.forEach((fig) => {
    const label = fig.getAttribute("data-label");
    if (!label || !label.trim()) return;
    const span = document.createElement("span");
    span.className = "fallback-label";
    span.textContent = label;
    fig.appendChild(span);
  });
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { io.unobserve(e.target); loadFigure(e.target); }
      });
    }, { rootMargin: "400px 0px" });
    figures.forEach((f) => io.observe(f));
  } else {
    figures.forEach(loadFigure);
  }

  /* ---------- Google Maps-länkar ---------- */
  document.querySelectorAll("[data-q]").forEach((a) => {
    a.href = gmaps(a.getAttribute("data-q"));
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  });

  /* ---------- Sektionsnavigering: markera aktiv sektion ---------- */
  const navLinks = Array.from(document.querySelectorAll(".sectionnav a[href^='#']"));
  if (navLinks.length && "IntersectionObserver" in window) {
    const byId = new Map(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const link = byId.get(e.target.id);
        if (!link) return;
        navLinks.forEach((l) => l.classList.toggle("active", l === link));
        const bar = link.closest("ul");
        if (bar) bar.scrollTo({ left: link.offsetLeft - bar.clientWidth / 2 + link.clientWidth / 2, behavior: "smooth" });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- Karta (Leaflet + OpenStreetMap) ---------- */
  const mapEl = document.querySelector("[data-map]");
  if (!mapEl) return;

  if (typeof window.L === "undefined") {
    mapEl.innerHTML = '<p class="map-fallback">Kartan kunde inte laddas. Använd länkarna "Google Maps" vid varje plats istället.</p>';
    document.querySelectorAll("[data-show-on-map]").forEach((b) => b.remove());
    return;
  }
  const L = window.L;

  const map = L.map(mapEl, { scrollWheelZoom: false, tap: true });
  // OpenStreetMaps kartbilder kräver en Referer-header. Sidan skickar annars
  // ingen referrer, så här skickas bara domännamnet (inte hela adressen).
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    referrerPolicy: "strict-origin",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map);
  map.on("click", () => map.scrollWheelZoom.enable());
  map.on("mouseout", () => map.scrollWheelZoom.disable());

  const layers = {};
  const markersById = {};
  const bounds = [];

  document.querySelectorAll(".place[data-lat][data-lng]").forEach((el) => {
    const lat = parseFloat(el.getAttribute("data-lat"));
    const lng = parseFloat(el.getAttribute("data-lng"));
    if (isNaN(lat) || isNaN(lng)) return;
    const cat = el.getAttribute("data-cat") || "by";
    const nameEl = el.querySelector("h3, h4");
    const name = el.getAttribute("data-name") || (nameEl ? nameEl.textContent.trim() : "");
    const short = el.getAttribute("data-short") || "";
    const q = el.getAttribute("data-mapq") || name;

    const icon = L.divIcon({
      className: "",
      html: '<div class="pin pin--' + cat + '" data-cat="' + cat + '"></div>',
      iconSize: cat === "bas" ? [36, 36] : [30, 30],
      iconAnchor: cat === "bas" ? [18, 36] : [15, 30],
      popupAnchor: [0, -30],
    });
    const html =
      "<h4>" + esc(name) + "</h4>" +
      (short ? "<p>" + esc(short) + "</p>" : "") +
      '<div class="pop-links">' +
      (el.getAttribute("data-href")
        ? '<a href="' + esc(el.getAttribute("data-href")) + '">Öppna guiden →</a>'
        : el.id ? '<a href="#' + esc(el.id) + '">Läs mer ↓</a>' : "") +
      '<a href="' + gmaps(q) + '" target="_blank" rel="noopener noreferrer">Google Maps ↗</a>' +
      "</div>";

    layers[cat] = layers[cat] || L.layerGroup().addTo(map);
    if (!el.hasAttribute("data-nomarker")) {
      const marker = L.marker([lat, lng], { icon: icon, title: name, riseOnHover: true }).bindPopup(html);
      layers[cat].addLayer(marker);
      if (el.id) markersById[el.id] = { marker: marker, cat: cat };
      bounds.push([lat, lng]);
    }

    const route = el.getAttribute("data-route");
    if (route) {
      const pts = route.split(";").map((p) => p.split(",").map(Number));
      const color = getComputedStyle(el).getPropertyValue("--c").trim() || "#2e8060";
      const solid = el.getAttribute("data-route-style") === "solid";
      L.polyline(pts, { color: color, weight: solid ? 6 : 5, opacity: .85, dashArray: solid ? null : "2 8", lineCap: "round" })
        .bindPopup(html).addTo(layers[cat]);
      pts.forEach((p) => bounds.push(p));
    }
  });

  if (bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
  else map.setView([43.9, 7.9], 10);

  // Filterknappar
  const filters = document.querySelector("[data-map-filters]");
  if (filters) {
    let labels = {};
    try { labels = JSON.parse(filters.getAttribute("data-labels") || "{}"); } catch (e) { /* ignorera */ }
    Object.keys(CATS).forEach((cat) => {
      if (!layers[cat]) return;
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("data-cat", cat);
      b.setAttribute("aria-pressed", "true");
      b.textContent = labels[cat] || CATS[cat];
      b.addEventListener("click", () => {
        const on = b.getAttribute("aria-pressed") === "true";
        b.setAttribute("aria-pressed", on ? "false" : "true");
        if (on) map.removeLayer(layers[cat]); else map.addLayer(layers[cat]);
      });
      filters.appendChild(b);
    });
  }

  // "Visa på kartan"-knappar
  document.querySelectorAll("[data-show-on-map]").forEach((btn) => {
    const id = btn.getAttribute("data-show-on-map");
    if (!markersById[id]) { btn.remove(); return; }
    btn.addEventListener("click", () => {
      const m = markersById[id];
      if (!map.hasLayer(layers[m.cat])) {
        map.addLayer(layers[m.cat]);
        const f = filters && filters.querySelector('[data-cat="' + m.cat + '"]');
        if (f) f.setAttribute("aria-pressed", "true");
      }
      mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => { map.setView(m.marker.getLatLng(), 13); m.marker.openPopup(); }, 450);
    });
  });
})();
