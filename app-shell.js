(() => {
  const sidebar = document.querySelector('#sidebar');
  const trigger = document.querySelector('#menuTrigger');
  const close = document.querySelector('#sidebarClose');
  const scrim = document.querySelector('#scrim');

  function setMenu(open) {
    sidebar?.classList.toggle('open', open);
    scrim?.classList.toggle('show', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  trigger?.addEventListener('click', () => setMenu(true));
  close?.addEventListener('click', () => setMenu(false));
  scrim?.addEventListener('click', () => setMenu(false));

  document.querySelectorAll('#sidebar [data-page]').forEach((button) => {
    button.addEventListener('click', () => setMenu(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const input = document.querySelector('.header-search input');
      input?.focus();
    }
  });
})();