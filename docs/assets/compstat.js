/* CompStat Rio — interações do "Centro de Comando" */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- barra de progresso ---- */
  const bar = document.querySelector(".progress");
  if (bar) {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
    };
    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- menu mobile ---- */
  const toggle = document.querySelector(".nav-toggle");
  const tabs = document.querySelector(".nav-tabs");
  if (toggle && tabs) {
    toggle.addEventListener("click", () => {
      const open = tabs.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    tabs.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => tabs.classList.remove("open"))
    );
  }

  /* ---- reveal no scroll ---- */
  const revs = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    revs.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revs.forEach((el) => io.observe(el));
  }

  /* ---- count-up (pt-BR) ---- */
  const fmt = new Intl.NumberFormat("pt-BR");
  const nums = document.querySelectorAll("[data-target]");
  const animate = (el) => {
    const target = parseFloat(el.dataset.target);
    const dec = parseInt(el.dataset.dec || "0", 10);
    const suffix = el.dataset.suffix || "";
    if (reduce) { el.textContent = fmt.format(target) + suffix; return; }
    const dur = 1500, t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const v = target * ease(p);
      el.textContent = (dec ? v.toFixed(dec).replace(".", ",") : fmt.format(Math.round(v))) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window && !reduce) {
    const io2 = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { animate(e.target); io2.unobserve(e.target); } }),
      { threshold: 0.6 }
    );
    nums.forEach((el) => io2.observe(el));
  } else {
    nums.forEach(animate);
  }

  /* ---- mermaid (tema Centro de Comando) ---- */
  if (window.mermaid) {
    window.mermaid.initialize({
      startOnLoad: true,
      theme: "base",
      securityLevel: "loose",
      fontFamily: "Spline Sans Mono, monospace",
      themeVariables: {
        background: "#0f141e",
        primaryColor: "#141a26",
        primaryTextColor: "#e8eef7",
        primaryBorderColor: "rgba(126,148,178,0.4)",
        secondaryColor: "#11161f",
        tertiaryColor: "#0a0e16",
        lineColor: "#7e94b2",
        textColor: "#c9d4e3",
        fontSize: "14px",
        clusterBkg: "rgba(20,26,38,0.55)",
        clusterBorder: "rgba(126,148,178,0.28)",
        nodeBorder: "rgba(126,148,178,0.4)",
        edgeLabelBackground: "#0a0e16"
      }
    });
  }
})();
