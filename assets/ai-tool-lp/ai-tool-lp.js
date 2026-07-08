/* AIツール診断 LP — vanilla JS (no framework/runtime dependency)
   - count-up on the two stat numbers
   - fade/slide-in reveal on scroll
   - sticky bottom CTA that appears once the hero is scrolled past
   All effects are skipped when the user prefers reduced motion. */
(function () {
  'use strict';

  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var dur = parseFloat(el.getAttribute('data-dur') || '1400');
    var start = performance.now();
    function step(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased).toString();
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = String(target);
    }
    requestAnimationFrame(step);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- count-up numbers ----
    var nums = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
    if (nums.length) {
      if (reduce) {
        nums.forEach(function (n) { n.textContent = n.getAttribute('data-count'); });
      } else {
        nums.forEach(function (n) { n.textContent = '0'; });
        var countIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) { animateCount(e.target); countIO.unobserve(e.target); }
          });
        }, { threshold: 0.6 });
        nums.forEach(function (n) { countIO.observe(n); });
      }
    }

    // ---- scroll reveal ----
    var revs = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (revs.length && !reduce) {
      var hidden = [];
      revs.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var inView = r.top < window.innerHeight * 0.92 && r.bottom > 0;
        if (!inView) {
          el.style.opacity = '0';
          el.style.transform = 'translateY(20px)';
          el.style.transition = 'opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1)';
          hidden.push(el);
        }
      });
      var revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            var el = e.target;
            var d = parseFloat(el.getAttribute('data-reveal-delay') || '0');
            el.style.transitionDelay = d + 'ms';
            el.style.opacity = '1';
            el.style.transform = 'none';
            revealIO.unobserve(el);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      hidden.forEach(function (el) { revealIO.observe(el); });
    }

    // ---- sticky bottom CTA ----
    var bar = document.getElementById('sticky-cta');
    var hero = document.getElementById('hero');
    if (bar && hero) {
      var barIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var show = !e.isIntersecting;
          bar.style.transform = show ? 'translate(-50%,0)' : 'translate(-50%,120%)';
          bar.style.opacity = show ? '1' : '0';
        });
      }, { threshold: 0, rootMargin: '-40px 0px 0px 0px' });
      barIO.observe(hero);
    }
  });
})();
