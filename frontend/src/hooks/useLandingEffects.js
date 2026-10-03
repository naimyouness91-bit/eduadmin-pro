import { useEffect } from 'react';

export function useLandingEffects() {
  useEffect(() => {
    const navbar = document.getElementById('landing-navbar');
    const scrollTopBtn = document.getElementById('landing-scroll-top');

    const onScroll = () => {
      if (navbar) navbar.classList.toggle('landing-navbar-scrolled', window.scrollY > 60);
      if (scrollTopBtn) {
        const show = window.scrollY > 400;
        scrollTopBtn.style.opacity = show ? '1' : '0';
        scrollTopBtn.style.pointerEvents = show ? 'auto' : 'none';
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('landing-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.landing-reveal').forEach((el) => revealObserver.observe(el));

    const animateCounter = (el) => {
      const target = parseFloat(el.dataset.target);
      const hasPlus = el.dataset.plus === '1';
      const isPercent = el.dataset.percent === '1';
      const duration = 1800;
      let start = null;

      const step = (ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        const eased = 1 - (1 - progress) ** 3;
        const current = target * eased;
        let formatted = isPercent ? `${current.toFixed(1)}%` : Math.floor(current).toLocaleString();
        if (hasPlus && progress >= 1) formatted += '+';
        el.textContent = formatted;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    document.querySelectorAll('.landing-stat-number').forEach((el) => counterObserver.observe(el));

    const tiltHandlers = [];
    document.querySelectorAll('.landing-tilt').forEach((card) => {
      const onMove = (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `translateY(-6px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg)`;
      };
      const onLeave = () => {
        card.style.transform = '';
      };
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
      tiltHandlers.push({ card, onMove, onLeave });
    });

    const anchorHandler = (e) => {
      const href = e.currentTarget.getAttribute('href');
      if (!href?.startsWith('#') || href.length <= 1) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
    };

    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach((a) => a.addEventListener('click', anchorHandler));

    const scrollTopHandler = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    scrollTopBtn?.addEventListener('click', scrollTopHandler);

    return () => {
      window.removeEventListener('scroll', onScroll);
      revealObserver.disconnect();
      counterObserver.disconnect();
      anchorLinks.forEach((a) => a.removeEventListener('click', anchorHandler));
      scrollTopBtn?.removeEventListener('click', scrollTopHandler);
      tiltHandlers.forEach(({ card, onMove, onLeave }) => {
        card.removeEventListener('mousemove', onMove);
        card.removeEventListener('mouseleave', onLeave);
      });
    };
  }, []);
}
