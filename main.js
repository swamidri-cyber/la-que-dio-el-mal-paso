// Aparición al entrar en pantalla
  (function () {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (e) { io.observe(e); });
  })();

  // Temario: abre y cierra con movimiento suave, de a un módulo por vez
  (function () {
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ease = "cubic-bezier(.16, 1, .3, 1)";
    var mods = Array.prototype.slice.call(document.querySelectorAll(".modulo"));
    mods.forEach(function (d) { if (d.open) d.classList.add("is-open"); });

    function set(d, opening) {
      var s = d.querySelector("summary"), body = d.querySelector("ol");
      if (d._anim) d._anim.cancel();
      d.classList.toggle("is-open", opening);
      if (reduce) { d.open = opening; return; }
      var start = d.offsetHeight;
      d.style.overflow = "hidden";
      d.style.height = start + "px";
      if (opening) d.open = true;
      var border = d.offsetHeight - d.clientHeight;
      var end = s.offsetHeight + border + (opening ? body.offsetHeight : 0);
      d._anim = d.animate({ height: [start + "px", end + "px"] }, { duration: opening ? 520 : 380, easing: ease });
      d._anim.onfinish = function () {
        d.open = opening;
        d.style.height = d.style.overflow = "";
        d._anim = null;
      };
      d._anim.oncancel = function () { d.style.height = d.style.overflow = ""; };
      if (opening) {
        body.querySelectorAll("li").forEach(function (li, i) {
          li.animate(
            { opacity: [0, 1], transform: ["translateY(-8px)", "translateY(0)"] },
            { duration: 420, delay: 90 + i * 60, easing: ease, fill: "backwards" }
          );
        });
      }
    }

    mods.forEach(function (d) {
      d.querySelector("summary").addEventListener("click", function (e) {
        e.preventDefault();
        var opening = !d.classList.contains("is-open");
        if (opening) mods.forEach(function (o) { if (o !== d && o.classList.contains("is-open")) set(o, false); });
        set(d, opening);
      });
    });
  })();

  // Modo claro / oscuro (respeta el sistema hasta que se elija uno)
  (function () {
    var root = document.documentElement, btn = document.querySelector(".theme-toggle");
    var saved = null;
    try { saved = localStorage.getItem("tema"); } catch (e) {}
    if (saved) root.setAttribute("data-theme", saved);
    function isDark() {
      var t = root.getAttribute("data-theme");
      return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    }
    function icon() { btn.innerHTML = isDark() ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>'; }
    icon();
    btn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("tema", next); } catch (e) {}
      icon();
    });
  })();
