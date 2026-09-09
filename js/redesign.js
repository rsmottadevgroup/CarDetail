/* ============================================================
   REDESIGN.JS
   Motion design e microinterações do redesign premium da home.
   Cada bloco é independente e defensivo: se um elemento não
   existir na página, o bloco simplesmente não faz nada — nunca
   quebra o restante do site nem as funcionalidades já existentes.
   ============================================================ */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", function () {
    initNavbarGlass();
    initCustomCursor();
    initRevealOnScroll();
    initHeroCinematic();
    initMarqueeDuplication();
    initCounters();
    initProcessScroll();
    initCompareSlider();
  });

  /* ---------------------------------------------------------
     Navbar: transparente no topo, glass após rolar
  --------------------------------------------------------- */
  function initNavbarGlass() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------------------------------------------------
     Cursor customizado (apenas dispositivos com ponteiro fino)
  --------------------------------------------------------- */
  function initCustomCursor() {
    var isFine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!isFine) return;

    document.documentElement.classList.add("has-fine-pointer");

    var cursor = document.createElement("div");
    cursor.className = "fd-cursor";
    document.body.appendChild(cursor);

    var x = 0, y = 0, tx = 0, ty = 0;
    var raf = null;

    window.addEventListener("mousemove", function (e) {
      x = e.clientX; y = e.clientY;
      if (!document.documentElement.classList.contains("cursor-ready")) {
        document.documentElement.classList.add("cursor-ready");
      }
      if (!raf) {
        raf = requestAnimationFrame(render);
      }
    });

    function render() {
      tx += (x - tx) * 0.35;
      ty += (y - ty) * 0.35;
      cursor.style.transform = "translate3d(" + tx + "px," + ty + "px,0)";
      if (Math.abs(x - tx) > 0.3 || Math.abs(y - ty) > 0.3) {
        raf = requestAnimationFrame(render);
      } else {
        raf = null;
      }
    }

    var targets = document.querySelectorAll("[data-cursor]");
    targets.forEach(function (el) {
      el.addEventListener("mouseenter", function () {
        cursor.classList.add("is-label");
        cursor.setAttribute("data-label", el.getAttribute("data-cursor"));
      });
      el.addEventListener("mouseleave", function () {
        cursor.classList.remove("is-label");
      });
    });
  }

  /* ---------------------------------------------------------
     Reveal on scroll (fade + translate genérico)
  --------------------------------------------------------- */
  function initRevealOnScroll() {
    var els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     Hero cinematográfico: vídeo carregado sob demanda + scrub
     de scroll (headline funde, vídeo avança conforme o progresso)
  --------------------------------------------------------- */
  function initHeroCinematic() {
    var hero = document.querySelector(".hero[data-hero]");
    if (!hero) return;

    var video = hero.querySelector(".hero-video");
    var fallback = hero.querySelector(".hero-fallback-img");
    var mid = hero.querySelector(".hero-mid");
    var bottomRow = hero.querySelector(".hero-bottom-row");
    var topRow = hero.querySelector(".hero-top-row");

    // Carrega e reproduz o vídeo apenas quando o hero está perto da viewport,
    // para não travar o carregamento inicial da página (performance).
    if (video) {
      var startVideo = function () {
        var src = video.getAttribute("data-src");
        if (src && !video.currentSrc) {
          var source = document.createElement("source");
          source.src = src;
          source.type = "video/mp4";
          video.appendChild(source);
          video.load();
        }
        var playPromise = video.play();
        if (playPromise && playPromise.catch) {
          playPromise.catch(function () {
            /* autoplay bloqueado ou vídeo indisponível: mantém o fallback visível */
          });
        }
        video.addEventListener("playing", function () {
          video.classList.add("is-ready");
          if (fallback) fallback.style.opacity = "0";
        });
        video.addEventListener("error", function () {
          video.classList.remove("is-ready");
        });
      };

      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              startVideo();
              io.disconnect();
            }
          });
        }, { threshold: 0.05 });
        io.observe(hero);
      } else {
        startVideo();
      }
    }

    if (reduceMotion) return;

    // Efeito de scroll scrub: conforme o usuário rola pelo hero,
    // o cabeçalho funde/escala e o vídeo levemente acelera.
    var ticking = false;
    var heroHeight = hero.offsetHeight || window.innerHeight;

    function update() {
      ticking = false;
      var rect = hero.getBoundingClientRect();
      var progress = Math.min(Math.max(-rect.top / (heroHeight * 0.9), 0), 1);

      if (mid) {
        mid.style.transform = "translateY(" + (progress * 60) + "px) scale(" + (1 - progress * 0.06) + ")";
        mid.style.opacity = String(1 - progress * 1.05);
      }
      if (bottomRow) {
        bottomRow.style.opacity = String(1 - progress * 1.6);
        bottomRow.style.transform = "translateY(" + (progress * 30) + "px)";
      }
      if (topRow) {
        topRow.style.opacity = String(1 - progress * 2.2);
      }
      if (video && video.duration && !isNaN(video.duration)) {
        video.playbackRate = 1 + progress * 0.35;
      }
    }

    window.addEventListener("scroll", function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    window.addEventListener("resize", function () { heroHeight = hero.offsetHeight || window.innerHeight; });
    update();
  }

  /* ---------------------------------------------------------
     Ticker: duplica o conteúdo para o loop infinito ficar contínuo
  --------------------------------------------------------- */
  function initMarqueeDuplication() {
    var track = document.querySelector(".marquee-track");
    if (!track) return;
    track.innerHTML += track.innerHTML;
  }

  /* ---------------------------------------------------------
     Contadores (count-up) dos diferenciais
  --------------------------------------------------------- */
  function initCounters() {
    var counters = document.querySelectorAll("[data-count]");
    if (!counters.length) return;

    function animate(el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var suffix = el.getAttribute("data-suffix") || "";
      var decimals = el.getAttribute("data-decimals") ? parseInt(el.getAttribute("data-decimals"), 10) : 0;
      if (reduceMotion) {
        el.textContent = target.toFixed(decimals) + suffix;
        return;
      }
      var duration = 1400;
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (!("IntersectionObserver" in window)) {
      counters.forEach(animate);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     Seção "Nosso Processo": ativa etapas e preenche a linha
     de progresso conforme o scroll passa pela seção
  --------------------------------------------------------- */
  function initProcessScroll() {
    var section = document.querySelector(".process-section");
    var steps = document.querySelectorAll(".process-step");
    var rail = document.querySelector(".process-rail-fill");
    var visuals = document.querySelectorAll(".process-visual img");
    if (!section || !steps.length) return;

    function setActive(index) {
      steps.forEach(function (s, i) { s.classList.toggle("is-active", i <= index); });
      visuals.forEach(function (img, i) { img.classList.toggle("is-active", i === index); });
    }
    setActive(0);

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var idx = Array.prototype.indexOf.call(steps, entry.target);
            setActive(idx);
          }
        });
      }, { threshold: 0.5, rootMargin: "-20% 0px -20% 0px" });
      steps.forEach(function (s) { io.observe(s); });
    }

    var ticking = false;
    function updateRail() {
      ticking = false;
      if (!rail) return;
      var rect = section.getBoundingClientRect();
      var vh = window.innerHeight;
      var total = rect.height + vh * 0.4;
      var passed = Math.min(Math.max(vh * 0.6 - rect.top, 0), total);
      var pct = total > 0 ? (passed / total) * 100 : 0;
      rail.style.height = Math.min(pct, 100) + "%";
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { requestAnimationFrame(updateRail); ticking = true; }
    }, { passive: true });
    updateRail();
  }

  /* ---------------------------------------------------------
     Slider Antes/Depois arrastável
  --------------------------------------------------------- */
  function initCompareSlider() {
    var slider = document.querySelector(".compare-slider");
    if (!slider) return;
    var beforeWrap = slider.querySelector(".compare-before-wrap");
    var handle = slider.querySelector(".compare-handle");
    var dragging = false;

    function setPosition(clientX) {
      var rect = slider.getBoundingClientRect();
      var pct = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100);
      beforeWrap.style.clipPath = "inset(0 " + (100 - pct) + "% 0 0)";
      handle.style.left = pct + "%";
    }

    function start(e) {
      dragging = true;
      slider.classList.add("is-dragging");
      move(e);
    }
    function move(e) {
      if (!dragging && e.type.indexOf("move") !== -1 && e.type.indexOf("touch") === -1) return;
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      setPosition(clientX);
    }
    function end() {
      dragging = false;
      slider.classList.remove("is-dragging");
    }

    slider.addEventListener("mousedown", function (e) { start(e); });
    window.addEventListener("mousemove", function (e) { if (dragging) move(e); });
    window.addEventListener("mouseup", end);

    slider.addEventListener("touchstart", function (e) { start(e); }, { passive: true });
    slider.addEventListener("touchmove", function (e) { move(e); }, { passive: true });
    slider.addEventListener("touchend", end);

    // Pequena animação de sedução: desliza sozinho uma vez ao entrar na tela
    if (!reduceMotion && "IntersectionObserver" in window) {
      var played = false;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !played) {
            played = true;
            var t = 0;
            var seq = [65, 35, 50];
            var i = 0;
            var interval = setInterval(function () {
              var rect = slider.getBoundingClientRect();
              var clientX = rect.left + (rect.width * seq[i] / 100);
              setPosition(clientX);
              i++;
              if (i >= seq.length) clearInterval(interval);
            }, 500);
            io.disconnect();
          }
        });
      }, { threshold: 0.6 });
      io.observe(slider);
    }
  }
})();
