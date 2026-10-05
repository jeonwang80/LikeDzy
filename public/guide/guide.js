/* Standalone manual: no account data or external requests. */
(() => {
  const search = document.getElementById('search');
  const clear = document.getElementById('clear-search');
  const sections = [...document.querySelectorAll('.manual-section')];
  const links = [...document.querySelectorAll('.sidebar nav a')];
  const sidebar = document.getElementById('sidebar');
  const menu = document.getElementById('menu-toggle');
  const status = document.getElementById('search-status');
  const index = sections.map(section => ({ section, text: `${section.textContent} ${section.dataset.keywords}`.toLocaleLowerCase().replace(/\s/g, '') }));
  const originalDetails = new Map();
  function setMenu(open) {
    sidebar.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.textContent = open ? '닫기' : '목차';
  }
  function filter() {
    const words = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const searching = words.length > 0;
    let count = 0;
    index.forEach(({ section, text }) => {
      const match = words.every(word => text.includes(word));
      section.hidden = !match;
      if (match) count++;
      links.find(link => link.hash === `#${section.id}`).hidden = !match;
      section.querySelectorAll('details').forEach(detail => {
        if (searching) {
          if (!originalDetails.has(detail)) originalDetails.set(detail, detail.open);
          if (match) detail.open = true;
        } else if (originalDetails.has(detail)) {
          detail.open = originalDetails.get(detail);
          originalDetails.delete(detail);
        }
      });
    });
    clear.hidden = !searching;
    status.textContent = searching ? `${count}개 주제에서 찾았습니다. 목차를 선택하세요.` : '';
    document.getElementById('no-results').hidden = count > 0;
    document.querySelectorAll('.nav-group').forEach(group => {
      let next = group.nextElementSibling;
      let visible = false;
      while (next && !next.classList.contains('nav-group')) {
        if (!next.hidden) visible = true;
        next = next.nextElementSibling;
      }
      group.hidden = !visible;
    });
  }
  search.addEventListener('input', filter);
  function reset() { search.value = ''; filter(); }
  clear.addEventListener('click', () => { reset(); search.focus(); });
  document.getElementById('reset-search').addEventListener('click', reset);
  menu.addEventListener('click', () => setMenu(!sidebar.classList.contains('open')));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sidebar.classList.contains('open')) { setMenu(false); menu.focus(); }
  });
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (anchor) {
      const target = document.getElementById(anchor.hash.slice(1));
      if (target?.hidden) reset();
      setMenu(false);
    } else if (!sidebar.contains(event.target) && !menu.contains(event.target)) setMenu(false);
  });
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting && !entry.target.hidden);
    if (!visible.length) return;
    const id = visible[0].target.id;
    links.forEach(link => {
      const active = link.hash === `#${id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
  sections.forEach(section => observer.observe(section));
  let printDetails = [];
  window.addEventListener('beforeprint', () => {
    printDetails = [...document.querySelectorAll('details')].map(detail => [detail, detail.open]);
    printDetails.forEach(([detail]) => { detail.open = true; });
  });
  window.addEventListener('afterprint', () => { printDetails.forEach(([detail, open]) => { detail.open = open; }); });
  document.getElementById('print').addEventListener('click', () => window.print());
})();
