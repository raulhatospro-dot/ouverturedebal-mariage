(function () {
  if (typeof IntersectionObserver === 'undefined') {
    document.querySelectorAll('.fade-up').forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
  );

  document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));
})();
