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
    const previous = button.textContent;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(text);
      button.textContent = 'Copié';
    } catch {
      button.textContent = 'Erreur';
    }
    setTimeout(() => {
      button.textContent = previous;
    }, 1200);
  });
}

const explorer = document.getElementById('api-explorer');

if (explorer) {
  const form = document.getElementById('api-request-form');
  const operationInput = document.getElementById('api-operation');
  const baseUrlInput = document.getElementById('api-base-url');
  const curlOutput = document.querySelector('#api-curl code');
  const responseOutput = document.querySelector('#api-response code');
  const resultMeta = document.getElementById('api-result-meta');
  const routeLabel = document.getElementById('api-route-label');
  const operationFields = [...form.querySelectorAll('[data-visible-for]')];

  function readValue(name) {
    return form.elements[name]?.value?.trim() ?? '';
  }

  function prettyJson(value) {
    return JSON.stringify(value, null, 2);
  }

  function readBaseUrl() {
    return baseUrlInput.value.trim().replace(/\/+$/, '');
  }

  function appendIfPresent(query, key, value) {
    if (value !== '') {
      query.set(key, value);
    }
  }

  function buildRequest() {
    const baseUrl = readBaseUrl();
    if (!baseUrl) {
      throw new Error('Racine API requise.');
    }

    const operation = operationInput.value;
    const query = new URLSearchParams();
    let path = '/api/v1/address-overview';

    if (operation === 'address-overview') {
      appendIfPresent(query, 'address', readValue('address'));
      appendIfPresent(query, 'city_code', readValue('city_code'));
      appendIfPresent(query, 'lon', readValue('lon'));
      appendIfPresent(query, 'lat', readValue('lat'));
      appendIfPresent(query, 'dvf_radius_m', readValue('dvf_radius_m'));
      if (!query.has('address') && (!query.has('lon') || !query.has('lat'))) {
        throw new Error('Adresse ou coordonnées requises.');
      }
    } else if (operation === 'autocomplete') {
      path = '/api/v1/autocomplete/address';
      const q = readValue('address');
      if (q.length < 3) {
        throw new Error('Recherche de 3 caractères minimum requise.');
      }
      query.set('q', q);
      appendIfPresent(query, 'limit', readValue('limit'));
    } else if (operation === 'map-layer') {
      const layer = readValue('layer') || 'context';
      path = `/api/v1/map-layer/${encodeURIComponent(layer)}`;
      appendIfPresent(query, 'address', readValue('address'));
      appendIfPresent(query, 'city_code', readValue('city_code'));
      appendIfPresent(query, 'lon', readValue('lon'));
      appendIfPresent(query, 'lat', readValue('lat'));
      appendIfPresent(query, 'viewport_render_mode', readValue('viewport_render_mode'));
      if (!query.has('address') && (!query.has('lon') || !query.has('lat'))) {
        throw new Error('Adresse ou coordonnées requises.');
      }
    }

    const queryString = query.toString();
    const url = queryString ? `${baseUrl}${path}?${queryString}` : `${baseUrl}${path}`;
    return {
      method: 'GET',
      path,
      url,
      apiKey: readValue('api_key'),
    };
  }

  function updateOperationFields() {
    const operation = operationInput.value;
    for (const field of operationFields) {
      const visibleOperations = field.dataset.visibleFor.split(',').map((value) => value.trim());
      field.hidden = !visibleOperations.includes(operation);
    }
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

      if (request.apiKey) {
        lines.push('  -H "Authorization: Bearer $ONEDEX_API_KEY"');
      }

      curlOutput.textContent = lines.join(' \\\n');
      routeLabel.textContent = `${request.method} ${request.path}`;
      return request;
    } catch (error) {
      curlOutput.textContent = error.message;
      routeLabel.textContent = 'Requête incomplète';
      return null;
    }
  }

  for (const input of form.querySelectorAll('input, select')) {
    input.addEventListener('input', renderCurl);
    input.addEventListener('change', renderCurl);
  }

  operationInput.addEventListener('change', updateOperationFields);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const request = renderCurl();
    if (!request) {
      resultMeta.textContent = 'Paramètres incomplets';
      return;
    }

    const startedAt = performance.now();
    resultMeta.textContent = 'Envoi...';
    responseOutput.textContent = '';

    const headers = { accept: 'application/json' };
    if (request.apiKey) {
      headers.authorization = `Bearer ${request.apiKey}`;
    }

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers,
      });
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
        hint: "Si la requête échoue dans le navigateur, copiez le curl.",
      });
    }
  });

  updateOperationFields();
  renderCurl();
}
