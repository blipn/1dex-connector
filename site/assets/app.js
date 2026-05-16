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
  const endpointButtons = [...explorer.querySelectorAll('[data-endpoint]')];
  const fieldsContainer = document.getElementById('api-fields');
  const form = document.getElementById('api-request-form');
  const baseUrlInput = document.getElementById('api-base-url');
  const bodyInput = document.getElementById('api-body');
  const curlOutput = document.querySelector('#api-curl code');
  const responseOutput = document.querySelector('#api-response code');
  const resultMeta = document.getElementById('api-result-meta');
  const routeLabel = document.getElementById('api-route-label');
  const openUrlLink = document.getElementById('api-open-url');

  const endpointConfigs = {
    parcelles: {
      method: 'GET',
      path: '/adresse/{address_slug}/explore/map-layer/parcelles',
      fields: [
        { name: 'address_slug', label: 'Slug adresse', value: '10-rue-des-cordeliers-aix-en-provence-13100', required: true },
        { name: 'city_code', label: 'Code commune', value: '13001', required: true },
        { name: 'lon', label: 'Longitude', type: 'number', value: '5.446765371857839', required: true, step: 'any' },
        { name: 'lat', label: 'Latitude', type: 'number', value: '43.52966775616209', required: true, step: 'any' },
        { name: 'parcel_record_key', label: 'Parcelle', value: '13001000AS0323' },
        { name: 'parcel_phase', label: 'Phase', value: 'initial' },
        { name: 'viewport_bbox', label: 'Viewport bbox', value: '5.44628,43.52926,5.44725,43.53008' },
        { name: 'viewport_zoom', label: 'Zoom', type: 'number', value: '19.25', step: 'any' },
        { name: 'viewport_render_mode', label: 'Mode', value: 'features' },
      ],
      body: null,
    },
  };

  let activeEndpointKey = 'parcelles';

  function prettyJson(value) {
    return JSON.stringify(value, null, 2);
  }

  function readBaseUrl() {
    return baseUrlInput.value.trim().replace(/\/+$/, '');
  }

  function readFieldValue(name) {
    return fieldsContainer.querySelector(`[name="${name}"]`)?.value?.trim() ?? '';
  }

  function buildRequest() {
    const config = endpointConfigs[activeEndpointKey];
    const baseUrl = readBaseUrl();
    if (!baseUrl) {
      throw new Error('Base URL requise.');
    }
    let path = config.path;
    const query = new URLSearchParams();

    for (const field of config.fields) {
      const value = readFieldValue(field.name);
      if (!value) {
        continue;
      }
      if (path.includes(`{${field.name}}`)) {
        path = path.replace(`{${field.name}}`, encodeURIComponent(value));
      } else {
        query.set(field.name, value);
      }
    }

    const queryString = query.toString();
    const url = `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
    let body = null;

    if (config.body !== null) {
      body = JSON.parse(bodyInput.value || '{}');
    }

    return {
      method: config.method,
      path,
      url,
      body,
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

      if (request.body !== null) {
        lines.push('  -H "Content-Type: application/json"');
        lines.push(`  -d ${shellQuote(JSON.stringify(request.body))}`);
      }

      curlOutput.textContent = lines.join(' \\\n');
      routeLabel.textContent = `${request.method} ${request.path}`;
      openUrlLink.href = request.url;
      bodyInput.classList.remove('has-error');
      return request;
    } catch (error) {
      curlOutput.textContent = error.message;
      bodyInput.classList.toggle('has-error', error instanceof SyntaxError);
      return null;
    }
  }

  function renderFields() {
    const config = endpointConfigs[activeEndpointKey];
    fieldsContainer.replaceChildren();

    for (const field of config.fields) {
      const label = document.createElement('label');
      label.className = 'field-label';
      label.textContent = field.label;

      const input = document.createElement('input');
      input.name = field.name;
      input.type = field.type ?? 'text';
      input.value = field.value ?? '';
      input.autocomplete = 'off';

      if (field.required) {
        input.required = true;
      }
      if (field.min) {
        input.min = field.min;
      }
      if (field.max) {
        input.max = field.max;
      }
      if (field.step) {
        input.step = field.step;
      }

      input.addEventListener('input', renderCurl);
      label.append(input);
      fieldsContainer.append(label);
    }
  }

  function renderEndpoint() {
    const config = endpointConfigs[activeEndpointKey];

    for (const button of endpointButtons) {
      const isActive = button.dataset.endpoint === activeEndpointKey;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    }

    renderFields();
    bodyInput.value = config.body === null ? '' : prettyJson(config.body);
    bodyInput.disabled = config.body === null;
    bodyInput.closest('.api-body-field')?.classList.toggle('is-disabled', config.body === null);
    responseOutput.textContent = prettyJson({ status: 'ready' });
    resultMeta.textContent = 'En attente';
    renderCurl();
  }

  for (const button of endpointButtons) {
    button.addEventListener('click', () => {
      activeEndpointKey = button.dataset.endpoint;
      renderEndpoint();
    });
  }

  for (const input of [baseUrlInput, bodyInput]) {
    input.addEventListener('input', renderCurl);
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

    if (request.body !== null) {
      headers['content-type'] = 'application/json';
      options.body = JSON.stringify(request.body);
    }

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

  renderEndpoint();
}
