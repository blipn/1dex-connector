const currentPage = window.location.pathname.split('/').pop() || 'index.html';
if (currentPage === 'api.html' && window.location.hash === '#redoc') {
  window.location.replace('./documentation-api.html');
} else if (currentPage === 'api.html' && window.location.hash.startsWith('#operation/')) {
  window.location.replace(`./documentation-api.html${window.location.hash}`);
} else if (currentPage === 'api.html' && window.location.hash === '#getMapLayer') {
  window.location.replace('./documentation-api.html#operation/getMapLayer');
}

function findTargetById(targetId) {
  if (!targetId) {
    return null;
  }
  const decodedId = decodeURIComponent(targetId);
  return document.getElementById(decodedId)
    ?? document.querySelector(`[data-section-id="${CSS.escape(decodedId)}"]`)
    ?? document.querySelector(`[data-item-id="${CSS.escape(decodedId)}"]`);
}

function scrollToTargetId(targetId) {
  const target = findTargetById(targetId);
  if (!target) {
    return false;
  }
  const stickyOffset = 84;
  const top = target.getBoundingClientRect().top + window.scrollY - stickyOffset;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  return true;
}

function scheduleTargetScroll(targetId) {
  if (!targetId) {
    return;
  }
  let attempts = 0;
  const maxAttempts = 200;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (scrollToTargetId(targetId) || attempts >= maxAttempts) {
      window.clearInterval(timer);
    }
  }, 50);
}

function scheduleHashScroll() {
  scheduleTargetScroll(window.location.hash.slice(1));
}

function readClickedTargetId(target) {
  const link = target.closest('a[href^="#"]');
  if (link) {
    return link.getAttribute('href').slice(1);
  }
  const menuItem = target.closest('[data-item-id], [role="menuitem"]');
  const itemId = menuItem?.getAttribute('data-item-id') ?? menuItem?.getAttribute('aria-controls') ?? '';
  return itemId.startsWith('#') ? itemId.slice(1) : itemId;
}

const operationConsoleLinks = {
  getAddressOverview: './api.html?operation=address-overview',
  getAddressDetails: './api.html?operation=address-details&fields=summary,rail',
  unlockAddress: './api.html?operation=address-unlock',
  getAccountUsage: './api.html?operation=account-usage',
  autocompleteAddress: './api.html?operation=autocomplete',
  searchCommunes: './api.html?operation=communes&address=aix&limit=5',
  getPublicPreviewByPath: './api.html?operation=public-preview&path=/ville/aix-en-provence-13001',
  getAddressPageState: './api.html?operation=address-page-state',
  getMapLayer: './api.html?operation=map-layer&layer=parcelles',
  getMapViewport: './api.html?operation=map-viewport&layers=context,iris',
  focusMapAddress: './api.html?operation=map-focus-address',
  focusPublicLocation: './api.html?operation=map-focus-public-location&lon=5.446766&lat=43.529667',
  focusParcel: './api.html?operation=map-focus-parcelle&record_key=13001000AB0022',
  focusParcels: './api.html?operation=map-focus-parcelles&record_keys=13001000AB0022,13001000AB0023',
  focusMapFeature: './api.html?operation=map-focus-feature&layer=parcelles&feature_key=13001000AB0022',
  scoreAddresses: './api.html?operation=score-address',
  compareScoredAddresses: './api.html?operation=score-compare',
  getScoreGrid: './api.html?operation=score-grid&bbox=5.4457,43.5274,5.4468,43.5282&zoom=15&category=global',
  suggestScoreAddresses: './api.html?operation=score-suggest&address=10%20rue%20des%20cordeliers%20aix&limit=5',
};

function addOperationTestLinks() {
  for (const [operationId, href] of Object.entries(operationConsoleLinks)) {
    const target = document.getElementById(`operation/${operationId}`);
    if (!target || target.querySelector('.redoc-operation-actions')) {
      continue;
    }
    const actions = document.createElement('div');
    actions.className = 'redoc-operation-actions';
    const link = document.createElement('a');
    link.className = 'secondary-action';
    link.href = href;
    link.textContent = 'Tester cette requête';
    actions.append(link);
    target.prepend(actions);
  }
}

if (currentPage === 'documentation-api.html') {
  window.addEventListener('hashchange', scheduleHashScroll);
  window.addEventListener('load', scheduleHashScroll);
  document.addEventListener('click', (event) => {
    const targetId = readClickedTargetId(event.target);
    if (!targetId) {
      return;
    }
    window.setTimeout(() => scheduleTargetScroll(targetId), 0);
  }, true);
  window.addEventListener('load', () => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      addOperationTestLinks();
      if (document.querySelectorAll('.redoc-operation-actions').length >= Object.keys(operationConsoleLinks).length || attempts >= 200) {
        window.clearInterval(timer);
      }
    }, 50);
  });
}

const redocContainer = document.getElementById('redoc-container');
if (redocContainer && window.Redoc?.init) {
  window.Redoc.init(
    redocContainer.dataset.specUrl,
    {
      hideHostname: true,
      scrollYOffset: 84,
      theme: {
        spacing: {
          unit: 4,
          sectionVertical: 18,
        },
        typography: {
          fontSize: '13px',
          lineHeight: '1.45em',
          headings: {
            fontSize: '18px',
            lineHeight: '1.25em',
          },
          code: {
            fontSize: '12px',
            lineHeight: '1.45em',
          },
        },
        sidebar: {
          width: '245px',
        },
        rightPanel: {
          width: '34%',
        },
      },
    },
    redocContainer,
    scheduleHashScroll,
  );
}

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
  .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
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
  const docLink = document.getElementById('api-doc-link');
  const operationFields = [...form.querySelectorAll('[data-visible-for]')];
  const pageParams = new URLSearchParams(window.location.search);

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
      if (typeof query.set === 'function') {
        query.set(key, value);
      } else {
        query[key] = value;
      }
    }
  }

  function appendAddressLocator(query) {
    const normalizedAddressKey = readValue('normalized_address_key');
    if (normalizedAddressKey) {
      appendIfPresent(query, 'normalized_address_key', normalizedAddressKey);
      return;
    }
    appendIfPresent(query, 'address', readValue('address'));
    appendIfPresent(query, 'city_code', readValue('city_code'));
    appendIfPresent(query, 'lon', readValue('lon'));
    appendIfPresent(query, 'lat', readValue('lat'));
    appendIfPresent(query, 'parcel_record_key', readValue('parcel_record_key'));
  }

  function hasAddressLocator(query) {
    return query.has('address')
      || query.has('normalized_address_key')
      || query.has('parcel_record_key')
      || (query.has('lon') && query.has('lat'));
  }

  function buildRequest() {
    const baseUrl = readBaseUrl();
    if (!baseUrl) {
      throw new Error('Racine API requise.');
    }

    const operation = operationInput.value;
    const query = new URLSearchParams();
    let path = '/api/v1/address-overview';
    let method = 'GET';
    let body = null;

    if (operation === 'address-overview') {
      appendAddressLocator(query);
      appendIfPresent(query, 'dvf_radius_m', readValue('dvf_radius_m'));
      appendIfPresent(query, 'dvf_year', readValue('dvf_year'));
      if (!query.has('address') && !query.has('city_code') && (!query.has('lon') || !query.has('lat')) && !query.has('parcel_record_key')) {
        throw new Error('Adresse, code commune, coordonnées ou clé parcelle requis.');
      }
    } else if (operation === 'address-details') {
      path = '/api/v1/address-details';
      appendAddressLocator(query);
      appendIfPresent(query, 'fields', readValue('fields'));
      appendIfPresent(query, 'dvf_radius_m', readValue('dvf_radius_m'));
      appendIfPresent(query, 'dvf_year', readValue('dvf_year'));
      if (!hasAddressLocator(query)) {
        throw new Error('Address, normalized key, parcel key, or coordinates required.');
      }
      if (!query.has('fields')) {
        throw new Error('Address details fields required.');
      }
    } else if (operation === 'address-unlock') {
      path = '/api/v1/address-unlocks';
      method = 'POST';
      body = {};
      for (const key of ['address', 'city_code', 'lon', 'lat', 'parcel_record_key', 'normalized_address_key']) {
        appendIfPresent(body, key, readValue(key));
      }
      if (!body.address && !body.normalized_address_key && !body.parcel_record_key && (!body.lon || !body.lat)) {
        throw new Error('Address, normalized key, parcel key, or coordinates required.');
      }
    } else if (operation === 'account-usage') {
      path = '/api/v1/account/usage';
    } else if (operation === 'autocomplete') {
      path = '/api/v1/autocomplete/address';
      const q = readValue('address');
      if (q.length < 3) {
        throw new Error('Recherche de 3 caractères minimum requise.');
      }
      query.set('q', q);
      appendIfPresent(query, 'limit', readValue('limit'));
    } else if (operation === 'communes') {
      path = '/api/v1/communes/search';
      const q = readValue('address');
      if (q.length < 2) {
        throw new Error('Commune query required.');
      }
      query.set('q', q);
      appendIfPresent(query, 'limit', readValue('limit'));
    } else if (operation === 'public-preview') {
      path = '/api/v1/public-preview';
      appendIfPresent(query, 'path', readValue('path'));
      if (!query.has('path')) {
        throw new Error('Public preview path required.');
      }
    } else if (operation === 'address-page-state') {
      const slug = readValue('slug');
      if (!slug) {
        throw new Error('Slug page adresse requis.');
      }
      path = `/api/v1/address-pages/${encodeURIComponent(slug)}/state`;
    } else if (operation === 'map-layer') {
      const layer = readValue('layer') || 'context';
      path = `/api/v1/map-layer/${encodeURIComponent(layer)}`;
      appendIfPresent(query, 'address', readValue('address'));
      appendIfPresent(query, 'city_code', readValue('city_code'));
      appendIfPresent(query, 'lon', readValue('lon'));
      appendIfPresent(query, 'lat', readValue('lat'));
      appendIfPresent(query, 'viewport_render_mode', readValue('viewport_render_mode'));
      if (!query.has('address') && !query.has('city_code') && (!query.has('lon') || !query.has('lat'))) {
        throw new Error('Adresse, code commune ou coordonnées requis.');
      }
    } else if (operation === 'map-viewport') {
      path = '/api/v1/map-viewport';
      appendIfPresent(query, 'layers', readValue('layers') || 'context,iris');
      appendIfPresent(query, 'address', readValue('address'));
      appendIfPresent(query, 'city_code', readValue('city_code'));
      appendIfPresent(query, 'lon', readValue('lon'));
      appendIfPresent(query, 'lat', readValue('lat'));
      if (!query.has('layers')) {
        throw new Error('Calques viewport requis.');
      }
      if (!query.has('address') && !query.has('city_code') && (!query.has('lon') || !query.has('lat'))) {
        throw new Error('Adresse, code commune ou coordonnées requis.');
      }
    } else if (operation === 'map-focus-parcelle') {
      path = '/api/v1/map-focus/parcelle';
      appendIfPresent(query, 'record_key', readValue('record_key'));
      if (!query.has('record_key')) {
        throw new Error('Record key required.');
      }
    } else if (operation === 'map-focus-parcelles') {
      path = '/api/v1/map-focus/parcelles';
      appendIfPresent(query, 'record_keys', readValue('record_keys'));
      if (!query.has('record_keys')) {
        throw new Error('Record keys required.');
      }
    } else if (operation === 'map-focus-address') {
      path = '/api/v1/map-focus/address';
      appendIfPresent(query, 'address', readValue('address'));
      appendIfPresent(query, 'city_code', readValue('city_code'));
      if (!query.has('address')) {
        throw new Error('Focus address required.');
      }
    } else if (operation === 'map-focus-public-location') {
      path = '/api/v1/map-focus/public-location';
      appendIfPresent(query, 'lon', readValue('lon'));
      appendIfPresent(query, 'lat', readValue('lat'));
      if (!query.has('lon') || !query.has('lat')) {
        throw new Error('Focus coordinates required.');
      }
    } else if (operation === 'map-focus-feature') {
      path = '/api/v1/map-focus/feature';
      appendIfPresent(query, 'layer_key', readValue('layer'));
      appendIfPresent(query, 'feature_key', readValue('feature_key'));
      if (!query.has('layer_key') || !query.has('feature_key')) {
        throw new Error('Layer key and feature key required.');
      }
    } else if (operation === 'score-address') {
      path = '/api/v1/score/address';
      method = 'POST';
      const rawItems = readValue('score_items');
      const items = rawItems ? JSON.parse(rawItems) : [{ address: readValue('address') }];
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Items score requis (JSON array).');
      }
      body = { items };
      appendIfPresent(body, 'profile', readValue('profile'));
    } else if (operation === 'score-compare') {
      path = '/api/v1/score/compare';
      method = 'POST';
      const rawItems = readValue('score_items');
      if (!rawItems) {
        throw new Error('Items score requis (JSON array).');
      }
      const items = JSON.parse(rawItems);
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Items score requis (JSON array).');
      }
      body = { items };
      appendIfPresent(body, 'profile', readValue('profile'));
      appendIfPresent(body, 'sortBy', readValue('sortBy') || 'global');
    } else if (operation === 'score-grid') {
      path = '/api/v1/score/grid';
      appendIfPresent(query, 'bbox', readValue('bbox'));
      appendIfPresent(query, 'zoom', readValue('zoom'));
      appendIfPresent(query, 'category', readValue('category'));
      if (!query.has('bbox') || !query.has('zoom')) {
        throw new Error('BBox et zoom requis pour la grille score.');
      }
    } else if (operation === 'score-suggest') {
      path = '/api/v1/score/address-suggest';
      const q = readValue('address');
      if (q.length < 3) {
        throw new Error('Recherche de 3 caractères minimum requise.');
      }
      query.set('q', q);
      appendIfPresent(query, 'limit', readValue('limit'));
    }

    const queryString = query.toString();
    const url = queryString ? `${baseUrl}${path}?${queryString}` : `${baseUrl}${path}`;
    return {
      method,
      path,
      url,
      body,
      apiKey: readValue('api_key'),
    };
  }

  function updateOperationFields() {
    const operation = operationInput.value;
    for (const field of operationFields) {
      const visibleOperations = field.dataset.visibleFor.split(',').map((value) => value.trim());
      field.hidden = !visibleOperations.includes(operation);
    }
    if (docLink) {
      const operationIds = {
        'address-overview': 'getAddressOverview',
        'address-details': 'getAddressDetails',
        'address-unlock': 'unlockAddress',
        'account-usage': 'getAccountUsage',
        autocomplete: 'autocompleteAddress',
        communes: 'searchCommunes',
        'public-preview': 'getPublicPreviewByPath',
        'address-page-state': 'getAddressPageState',
        'map-layer': 'getMapLayer',
        'map-viewport': 'getMapViewport',
        'map-focus-address': 'focusMapAddress',
        'map-focus-public-location': 'focusPublicLocation',
        'map-focus-parcelle': 'focusParcel',
        'map-focus-parcelles': 'focusParcels',
        'map-focus-feature': 'focusMapFeature',
        'score-address': 'scoreAddresses',
        'score-compare': 'compareScoredAddresses',
        'score-grid': 'getScoreGrid',
        'score-suggest': 'suggestScoreAddresses',
      };
      docLink.href = `./documentation-api.html#operation/${operationIds[operation] ?? 'getAddressOverview'}`;
    }
  }

  function applyInitialParams() {
    const requestedOperation = pageParams.get('operation') ?? pageParams.get('op');
    if (requestedOperation && Array.from(operationInput.options).some((option) => option.value === requestedOperation)) {
      operationInput.value = requestedOperation;
    }

    for (const name of [
      'address',
      'path',
      'city_code',
      'normalized_address_key',
      'parcel_record_key',
      'fields',
      'dvf_year',
      'lon',
      'lat',
      'dvf_radius_m',
      'limit',
      'slug',
      'layer',
      'record_key',
      'record_keys',
      'feature_key',
      'layers',
      'viewport_render_mode',
      'bbox',
      'zoom',
      'category',
      'profile',
      'sortBy',
      'score_items',
      'api_key',
    ]) {
      const value = pageParams.get(name);
      if (value !== null && form.elements[name]) {
        form.elements[name].value = value;
      }
    }
  }

  function shellQuote(value) {
    return `'${String(value).replaceAll("'", "'\\''")}'`;
  }

  function renderCurl() {
    try {
      const request = buildRequest();
      const lines = [
        request.method === 'POST' ? `curl -X POST ${shellQuote(request.url)}` : `curl ${shellQuote(request.url)}`,
        '  -H "Accept: application/json"',
      ];

      if (request.body) {
        lines.push('  -H "Content-Type: application/json"');
        lines.push(`  -d ${shellQuote(prettyJson(request.body))}`);
      }

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

  for (const input of form.querySelectorAll('input, select, textarea')) {
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
    if (request.body) {
      headers['content-type'] = 'application/json';
    }
    if (request.apiKey) {
      headers.authorization = `Bearer ${request.apiKey}`;
    }

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
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

  applyInitialParams();
  updateOperationFields();
  renderCurl();
}
