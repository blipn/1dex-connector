const revealElements = document.querySelectorAll('[data-reveal]');
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }
}, { threshold: 0.14 });

for (const element of revealElements) {
  observer.observe(element);
}

const navLinks = [...document.querySelectorAll('.nav a')];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

const navObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) {
      continue;
    }
    const id = `#${entry.target.id}`;
    for (const link of navLinks) {
      link.classList.toggle('is-active', link.getAttribute('href') === id);
    }
  }
}, { rootMargin: '-35% 0px -55% 0px' });

for (const section of sections) {
  navObserver.observe(section);
}

for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    const target = document.getElementById(button.dataset.copy);
    const text = target?.innerText ?? '';
    if (!text) {
      return;
    }
    await navigator.clipboard.writeText(text);
    const previous = button.textContent;
    button.textContent = 'Copié';
    setTimeout(() => {
      button.textContent = previous;
    }, 1200);
  });
}
