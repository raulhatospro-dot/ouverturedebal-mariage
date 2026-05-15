(function () {
  const burger = document.querySelector('[data-burger]');
  const menu = document.querySelector('[data-menu]');
  if (!burger || !menu) return;

  const toggle = (force) => {
    const isOpen = typeof force === 'boolean' ? force : !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  burger.addEventListener('click', () => toggle());

  menu.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => toggle(false))
  );

  window.addEventListener('resize', () => {
    if (window.innerWidth > 720) toggle(false);
  });
})();
