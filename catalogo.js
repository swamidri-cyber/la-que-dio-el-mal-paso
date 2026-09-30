// Catálogo: arma las secciones desde window.CATALOGO y maneja el visor de fotos
(function () {
  var data = window.CATALOGO || [];
  var cont = document.getElementById("catalogo");
  var chips = document.getElementById("chips");
  var grupos = [];

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  data.forEach(function (cat, ci) {
    var li = el("li");
    var a = el("a", null, cat.nombre);
    a.href = "#" + cat.id;
    li.appendChild(a);
    chips.appendChild(li);

    var sec = el("section", "sec cat" + (ci % 2 ? " cat-alt" : ""));
    sec.id = cat.id;
    var wrap = el("div", "wrap");
    var head = el("div", "cat-head");
    head.appendChild(el("i", "mark m-" + cat.mark + " reveal"));
    head.lastChild.setAttribute("aria-hidden", "true");
    var ht = el("div");
    ht.appendChild(el("h2", "reveal", cat.nombre));
    if (cat.desc) ht.appendChild(el("p", "muted reveal", cat.desc));
    head.appendChild(ht);
    wrap.appendChild(head);

    cat.subs.forEach(function (sub) {
      var g = { nombre: sub.nombre || cat.nombre, fotos: sub.fotos };
      var gi = grupos.push(g) - 1;
      var box = el("div", "sub");
      if (sub.nombre) {
        var sh = el("div", "sub-head reveal");
        sh.appendChild(el("h3", null, sub.nombre));
        sh.appendChild(el("span", null, sub.fotos.length + (sub.fotos.length === 1 ? " foto" : " fotos")));
        box.appendChild(sh);
      }
      if (sub.desc) box.appendChild(el("p", "sub-desc muted reveal", sub.desc));
      var grid = el("div", "galeria" + (sub.fotos.length < 3 ? " pocas" : ""));
      sub.fotos.forEach(function (f, fi) {
        var b = el("button", "foto reveal");
        b.type = "button";
        b.style.setProperty("--i", Math.min(fi, 6));
        b.setAttribute("aria-label", "Ampliar foto " + (fi + 1) + " de " + g.nombre);
        var img = el("img");
        img.src = f.t;
        img.width = f.tw;
        img.height = f.th;
        img.loading = "lazy";
        img.decoding = "async";
        img.alt = g.nombre + ", foto " + (fi + 1);
        b.appendChild(img);
        b.addEventListener("click", function () { abrir(gi, fi); });
        grid.appendChild(b);
      });
      box.appendChild(grid);
      wrap.appendChild(box);
    });
    sec.appendChild(wrap);
    cont.appendChild(sec);
  });

  // Chip activo según la sección visible
  if ("IntersectionObserver" in window) {
    var links = chips.querySelectorAll("a");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute("href") === "#" + en.target.id;
          a.classList.toggle("on", on);
          if (on && chips.scrollTo) {
            chips.scrollTo({ left: a.offsetLeft - 16, behavior: "smooth" });
          }
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    cont.querySelectorAll(".cat").forEach(function (s) { io.observe(s); });
  }

  // Visor
  var dlg = document.getElementById("visor");
  var vimg = document.getElementById("visor-img");
  var cap = document.getElementById("visor-cap");
  var num = document.getElementById("visor-num");
  var cur = { g: 0, f: 0 };
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function mostrar(dir) {
    var g = grupos[cur.g], f = g.fotos[cur.f];
    cap.textContent = g.nombre;
    num.textContent = (cur.f + 1) + " / " + g.fotos.length;
    vimg.alt = g.nombre + ", foto " + (cur.f + 1);
    var many = g.fotos.length > 1;
    dlg.classList.toggle("una", !many);
    // mostrar primero la miniatura (ya cargada) y cambiar a la grande al llegar
    vimg.src = f.t;
    var big = new Image();
    big.onload = function () { if (grupos[cur.g].fotos[cur.f] === f) vimg.src = f.src; };
    big.src = f.src;
    if (!reduce && dir) {
      vimg.animate(
        { opacity: [0, 1], transform: ["translateX(" + dir * 28 + "px)", "translateX(0)"] },
        { duration: 380, easing: "cubic-bezier(.16,1,.3,1)" }
      );
    }
  }
  function abrir(g, f) {
    cur = { g: g, f: f };
    mostrar(0);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    document.documentElement.style.overflow = "hidden";
  }
  function cerrar() {
    if (reduce || !dlg.animate) { dlg.close(); return; }
    var a = dlg.animate({ opacity: [1, 0] }, { duration: 200, easing: "ease-out" });
    a.onfinish = function () { dlg.close(); };
  }
  function paso(d) {
    var n = grupos[cur.g].fotos.length;
    if (n < 2) return;
    cur.f = (cur.f + d + n) % n;
    mostrar(d);
  }
  dlg.addEventListener("close", function () { document.documentElement.style.overflow = ""; });
  dlg.querySelector(".v-cerrar").addEventListener("click", cerrar);
  dlg.querySelector(".v-prev").addEventListener("click", function () { paso(-1); });
  dlg.querySelector(".v-next").addEventListener("click", function () { paso(1); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) cerrar(); });
  dlg.addEventListener("cancel", function (e) { e.preventDefault(); cerrar(); });
  dlg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") paso(1);
    if (e.key === "ArrowLeft") paso(-1);
  });
  // deslizar con el dedo
  var x0 = null;
  dlg.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
  dlg.addEventListener("pointerup", function (e) {
    if (x0 === null) return;
    var dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50) paso(dx < 0 ? 1 : -1);
  });
})();
