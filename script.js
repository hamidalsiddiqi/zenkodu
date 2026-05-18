/* ====================================================
 * Zenkodu — interactions
 * ==================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Fade-in body on load ---------- */
  requestAnimationFrame(() => document.body.classList.add('is-ready'));

  /* ---------- Locomotive Scroll ---------- */
  let scroller = null;
  const wrapper = document.querySelector('#page-wrapper');

  if (window.LocomotiveScroll && wrapper && window.matchMedia('(min-width: 900px)').matches) {
    scroller = new LocomotiveScroll({
      el: wrapper,
      smooth: true,
      multiplier: 0.9,
      lerp: 0.08,
      class: 'is-inview',
    });

    /* ---------- GSAP + ScrollTrigger background tweens ---------- */
    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      // Bridge Locomotive Scroll <-> ScrollTrigger so triggers
      // measure positions against Locomotive's transformed scroll,
      // not the (locked) window scroll.
      scroller.on('scroll', ScrollTrigger.update);

      ScrollTrigger.scrollerProxy(wrapper, {
        scrollTop(value) {
          return arguments.length
            ? scroller.scrollTo(value, { duration: 0, disableLerp: true })
            : scroller.scroll.instance.scroll.y;
        },
        getBoundingClientRect() {
          return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
        },
        pinType: wrapper.style.transform ? 'transform' : 'fixed',
      });

      /* ---------- Alternating light/dark sections ----------
       * Each <section> declares data-theme="light|dark" and a
       * data-bg color. As the section becomes the active one
       * (its top crosses the upper-half of the viewport), we
       * tween the body + wrapper background + text color, and
       * toggle .is-dark on the header so it inverts in step.
       * ---------------------------------------------------- */
      const header = document.querySelector('.site-header');

      gsap.utils.toArray('section[data-scroll-section]').forEach((sec) => {
        const bg = sec.dataset.bg;
        if (!bg) return;

        const isDark = sec.dataset.theme === 'dark';
        const fg     = isDark ? '#ECE9E2' : '#1f1c24';

        ScrollTrigger.create({
          trigger: sec,
          scroller: wrapper,
          start: 'top 55%',
          end:   'bottom 45%',
          onEnter:      () => applyTheme(bg, fg, isDark),
          onEnterBack:  () => applyTheme(bg, fg, isDark),
        });
      });

      function applyTheme(bodyColor, fgColor, isDark) {
        // Body + page-wrapper background + global text color tween.
        // Header is intentionally NOT tweened here — it's driven by
        // scroll direction (see the scroll-direction observer below).
        gsap.to([document.body, wrapper], {
          backgroundColor: bodyColor,
          color: fgColor,
          duration: 1.0,
          ease: 'power2.inOut',
          overwrite: 'auto',
        });
      }

      /* ---------- Scroll-direction header inversion ----------
       * Default (top of page)           → light
       * Scrolling DOWN                  → light
       * Scrolling UP                    → dark
       * Returned to top of page         → light
       * ------------------------------------------------------- */
      let lastY = 0;
      const TOP_THRESHOLD = 60; // px from top considered "at top"

      function setHeaderTheme(mode) {
        if (!header) return;
        // mode = "dark" | "light"
        header.classList.toggle('is-dark', mode === 'dark');
        header.classList.toggle('is-light', mode === 'light');
      }
      // Initial state: light at top
      setHeaderTheme('light');

      scroller.on('scroll', (args) => {
        const y = args.scroll?.y ?? 0;

        if (y < TOP_THRESHOLD) {
          // At the top: always light + visible
          setHeaderTheme('light');
          header && header.classList.remove('is-hidden');
        } else if (y > lastY + 2) {
          // Scrolling DOWN — hide
          setHeaderTheme('light');
          header && header.classList.add('is-hidden');
        } else if (y < lastY - 2) {
          // Scrolling UP — show, dark
          setHeaderTheme('dark');
          header && header.classList.remove('is-hidden');
        }
        lastY = y;
      });

      // Re-sync after Locomotive measures images/fonts
      ScrollTrigger.addEventListener('refresh', () => scroller.update());
      ScrollTrigger.refresh();
    }

    // Hash-link support
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length > 1) {
          const target = document.querySelector(id);
          if (target) {
            e.preventDefault();
            scroller.scrollTo(target, { offset: -40 });
          }
        }
      });
    });
  } else {
    // Fallback: simple IntersectionObserver reveal
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-inview');
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('[data-scroll]').forEach((el) => io.observe(el));

    // Fallback alternating-theme transition (no Locomotive) —
    // body/text only. Header is driven by scroll direction below.
    const header = document.querySelector('.site-header');
    const bgIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
          const sec = entry.target;
          const bg = sec.dataset.bg;
          if (!bg) return;
          const isDark = sec.dataset.theme === 'dark';
          const fg = isDark ? '#ECE9E2' : '#1f1c24';
          if (window.gsap) {
            gsap.to(document.body, { backgroundColor: bg, color: fg, duration: 1.0, ease: 'power2.inOut', overwrite: 'auto' });
          } else {
            document.body.style.transition = 'background-color 0.9s ease, color 0.9s ease';
            document.body.style.backgroundColor = bg;
            document.body.style.color = fg;
          }
        }
      });
    }, { threshold: [0.4, 0.6] });
    document.querySelectorAll('section[data-scroll-section][data-bg]').forEach((s) => bgIO.observe(s));

    /* ---- Scroll-direction header inversion (fallback path) ---- */
    let lastYf = 0;
    const TOP_THRESHOLD_F = 60;

    function setHeaderThemeF(mode) {
      if (!header) return;
      header.classList.toggle('is-dark', mode === 'dark');
      header.classList.toggle('is-light', mode === 'light');
    }
    setHeaderThemeF('light');

    window.addEventListener('scroll', () => {
      const y = window.scrollY || window.pageYOffset || 0;
      if (y < TOP_THRESHOLD_F) {
        setHeaderThemeF('light');
        header && header.classList.remove('is-hidden');
      } else if (y > lastYf + 2) {
        setHeaderThemeF('light');
        header && header.classList.add('is-hidden');
      } else if (y < lastYf - 2) {
        setHeaderThemeF('dark');
        header && header.classList.remove('is-hidden');
      }
      lastYf = y;
    }, { passive: true });
  }

  /* ---------- Section-level transition observer ----------
   * Locomotive only flags [data-scroll] children with
   * `is-inview`. We additionally need the parent <section>
   * to receive `is-inview` so the section-wide staggered
   * transitions in CSS can fire.
   * ---------------------------------------------------- */
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // Trigger when at least ~18% of the section is on screen
      if (entry.isIntersecting && entry.intersectionRatio > 0.15) {
        entry.target.classList.add('is-inview');
      } else if (!entry.isIntersecting) {
        // Re-arm when fully scrolled past, so the user gets
        // the same staged entry when scrolling back up.
        const rect = entry.boundingClientRect;
        if (rect.top > window.innerHeight || rect.bottom < 0) {
          entry.target.classList.remove('is-inview');
        }
      }
    });
  }, {
    threshold: [0, 0.15, 0.3, 0.6],
    rootMargin: '0px 0px -10% 0px',
  });
  document
    .querySelectorAll('section[data-scroll-section]')
    .forEach((sec) => sectionIO.observe(sec));

  /* ---------- Custom cursor ---------- */
  const cursor = document.getElementById('cursor');
  const cursorLabel = document.getElementById('cursorLabel');
  if (cursor && window.matchMedia('(min-width: 900px)').matches) {
    let tx = 0, ty = 0, cx = 0, cy = 0;

    window.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
    });

    const tick = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    };
    tick();

    // Hover affordances
    document.querySelectorAll('[data-cursor]').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        cursor.classList.add('is-hover');
        cursorLabel.textContent = el.dataset.cursor || '';
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('is-hover');
        cursorLabel.textContent = '';
      });
    });

    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
    document.addEventListener('mouseenter', () => cursor.style.opacity = '1');
  }

  /* ---------- Cookie bar ---------- */
  const cookie = document.getElementById('cookie');
  const cookieOk = document.getElementById('cookieOk');
  const dismissed = localStorage.getItem('zenkodu_cookie_ack');

  if (cookie && !dismissed) {
    setTimeout(() => cookie.classList.add('is-visible'), 1400);
  }
  if (cookieOk) {
    cookieOk.addEventListener('click', () => {
      cookie.classList.remove('is-visible');
      localStorage.setItem('zenkodu_cookie_ack', '1');
    });
  }
});
