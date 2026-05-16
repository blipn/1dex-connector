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
  .filter((link) => link.getAttribute('href')?.startsWith('#'))
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

const explorer = document.getElementById('api-explorer');

if (explorer) {
  const form = document.getElementById('api-request-form');
  const baseUrlInput = document.getElementById('api-base-url');
  const addressInput = document.getElementById('api-address');
  const layerInput = document.getElementById('api-layer');
  const renderModeInput = document.getElementById('api-render-mode');
  const curlOutput = document.querySelector('#api-curl code');
  const responseOutput = document.querySelector('#api-response code');
  const resultMeta = document.getElementById('api-result-meta');
  const routeLabel = document.getElementById('api-route-label');
  const openUrlLink = document.getElementById('api-open-url');

  const optionalQueryFieldNames = [
    'city_code',
    'lon',
    'lat',
    'viewport_bbox',
    'viewport_zoom',
  ];

  function prettyJson(value) {
    return JSON.stringify(value, null, 2);
  }

  function readBaseUrl() {
    return baseUrlInput.value.trim().replace(/\/+$/, '');
  }

  function buildRequest() {
    const baseUrl = readBaseUrl();
    if (!baseUrl) {
      throw new Error('Base URL requise.');
    }
    const address = addressInput.value.trim();
    if (!address) {
      throw new Error('Adresse requise.');
    }

    const layer = layerInput.value || 'parcelles';
    const path = `/explore/map-layer/${encodeURIComponent(layer)}`;
    const query = new URLSearchParams();
    query.set('address', address);

    if (renderModeInput.value) {
      query.set('viewport_render_mode', renderModeInput.value);
    }

    for (const name of optionalQueryFieldNames) {
      const value = form.elements[name]?.value?.trim() ?? '';
      if (!value) {
        continue;
      }
      query.set(name, value);
    }

    const queryString = query.toString();
    return {
      method: 'GET',
      path,
      url: `${baseUrl}${path}?${queryString}`,
    };
  }

  function shellQuote(value) {
    return `'${String(value).replaceAll("'", "'\\''")}'`;
  }

  function renderCurl() {
    try {
      const request = buildRequest();
      const lines = [
        `curl ${shellQuote(request.url)}`,
        '  -H "Accept: application/json"',
      ];

      curlOutput.textContent = lines.join(' \\\n');
      routeLabel.textContent = `${request.method} ${request.path}`;
      openUrlLink.href = request.url;
      return request;
    } catch (error) {
      curlOutput.textContent = error.message;
      return null;
    }
  }

  for (const input of form.querySelectorAll('input, select')) {
    input.addEventListener('input', renderCurl);
    input.addEventListener('change', renderCurl);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const request = renderCurl();
    if (!request) {
      resultMeta.textContent = 'JSON invalide';
      return;
    }

    const startedAt = performance.now();
    resultMeta.textContent = 'Envoi...';
    responseOutput.textContent = '';

    const headers = { accept: 'application/json' };
    const options = {
      method: request.method,
      headers,
    };

    try {
      const response = await fetch(request.url, options);
      const text = await response.text();
      const duration = Math.round(performance.now() - startedAt);
      resultMeta.textContent = `${response.status} ${response.statusText || ''} · ${duration} ms`.trim();

      try {
        responseOutput.textContent = prettyJson(JSON.parse(text));
      } catch {
        responseOutput.textContent = text || '(réponse vide)';
      }
    } catch (error) {
      resultMeta.textContent = 'Erreur réseau';
      responseOutput.textContent = prettyJson({
        error: error.message,
        hint: "L'URL fonctionne en accès direct, mais le navigateur peut bloquer la lecture cross-origin sans header CORS.",
        direct_url: request.url,
      });
    }
  });

  renderCurl();
}
