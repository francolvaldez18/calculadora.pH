const CONTAMINANTS = [
  { key: 'Ba', label: 'Ba', regulatoryLimit: 2 },
  { key: 'Al', label: 'Al', regulatoryLimit: 5 },
  { key: 'P', label: 'P', regulatoryLimit: 10 },
  { key: 'Fe', label: 'Fe', regulatoryLimit: 2 },
  { key: 'Ni', label: 'Ni', regulatoryLimit: 2 },
  { key: 'Cu', label: 'Cu', regulatoryLimit: 1 },
  { key: 'Zn', label: 'Zn', regulatoryLimit: 2 },
  { key: 'Pb', label: 'Pb', regulatoryLimit: 0.1 },
  { key: 'Cr', label: 'Cr', regulatoryLimit: 0.5 },
  { key: 'Mn', label: 'Mn', regulatoryLimit: 0.5 },
  { key: 'Co', label: 'Co', regulatoryLimit: 2 },
  { key: 'Li', label: 'Li', regulatoryLimit: null },
  { key: 'B', label: 'B', regulatoryLimit: 2 },
  { key: 'Cd', label: 'Cd', regulatoryLimit: 0.1 },
];

const MULTIPLE_KEYS = ['Ba', 'Al', 'P', 'Fe', 'Ni', 'Cu', 'Zn', 'Pb', 'Cr', 'Mn', 'Co', 'B', 'Cd'];
const STORAGE_KEY = 'concentration-calculator-settings-v1';

const defaultSettings = {
  safetyFactor: 1.25,
  operationMode: 'real',
  contaminantOrder: CONTAMINANTS.map((item) => item.key),
  coolingComposition: Object.fromEntries(CONTAMINANTS.map((item) => [item.key, 0])),
  limits: Object.fromEntries(CONTAMINANTS.map((item) => [item.key, item.regulatoryLimit])),
};

const state = {
  calculationMode: 'single',
  inputMode: 'manual',
  selectedParameter: 'Ba',
  initialVolume: 100,
  incomingVolume: 10,
  coolingVolume: 0,
  autoInput: '',
  initialConcentrations: Object.fromEntries(CONTAMINANTS.map((item) => [item.key, 0])),
  incomingConcentrations: Object.fromEntries(CONTAMINANTS.map((item) => [item.key, 0])),
  settings: loadSettings(),
};

const elements = {
  singleSelect: document.getElementById('single-parameter-select'),
  calcModeSelector: document.getElementById('calculation-mode-selector'),
  inputModeSelector: document.getElementById('input-mode-selector'),
  autoInputPanel: document.getElementById('auto-input-panel'),
  autoInputText: document.getElementById('auto-input-text'),
  autoPreview: document.getElementById('auto-preview'),
  initialVolume: document.getElementById('initial-volume'),
  incomingVolume: document.getElementById('incoming-volume'),
  coolingVolume: document.getElementById('cooling-volume'),
  initialContainer: document.getElementById('initial-concentrations'),
  incomingContainer: document.getElementById('incoming-concentrations'),
  resultsWrapper: document.getElementById('results-table-wrapper'),
  validationMessages: document.getElementById('validation-messages'),
  summaryMode: document.getElementById('summary-mode'),
  summaryInputMode: document.getElementById('summary-input-mode'),
  summaryFactor: document.getElementById('summary-factor'),
  factorPill: document.getElementById('factor-pill'),
  operationModeLabel: document.getElementById('operation-mode-label'),
  coolingPreview: document.getElementById('cooling-preview'),
  settingsOverlay: document.getElementById('settings-overlay'),
  settingsDrawer: document.getElementById('settings-drawer'),
  openSettingsButtons: [
    document.getElementById('open-settings-button'),
    document.getElementById('open-settings-nav'),
  ],
  closeSettingsButton: document.getElementById('close-settings-button'),
  settingsSafetyFactor: document.getElementById('settings-safety-factor'),
  settingsOperationMode: document.getElementById('settings-operation-mode'),
  settingsOrderList: document.getElementById('settings-order-list'),
  settingsLimitsGrid: document.getElementById('settings-limits-grid'),
  settingsCoolingGrid: document.getElementById('settings-cooling-grid'),
  resetButton: document.getElementById('reset-button'),
};

init();

function init() {
  populateSingleSelect();
  renderSettings();
  bindEvents();
  render();
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved) return structuredClone(defaultSettings);

    return {
      safetyFactor: saved.safetyFactor ?? defaultSettings.safetyFactor,
      operationMode: saved.operationMode ?? defaultSettings.operationMode,
      contaminantOrder: Array.isArray(saved.contaminantOrder)
        ? saved.contaminantOrder.filter((key) => CONTAMINANTS.some((item) => item.key === key))
        : [...defaultSettings.contaminantOrder],
      coolingComposition: {
        ...defaultSettings.coolingComposition,
        ...(saved.coolingComposition || {}),
      },
      limits: {
        ...defaultSettings.limits,
        ...(saved.limits || {}),
      },
    };
  } catch {
    return structuredClone(defaultSettings);
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
}

function bindEvents() {
  elements.calcModeSelector.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-mode]');
    if (!button) return;
    state.calculationMode = button.dataset.mode;
    if (state.calculationMode === 'ibc') {
      state.incomingVolume = 1;
      elements.incomingVolume.value = '1';
    }
    render();
  });

  elements.inputModeSelector.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-input-mode]');
    if (!button) return;
    state.inputMode = button.dataset.inputMode;
    render();
  });

  elements.singleSelect.addEventListener('change', (event) => {
    state.selectedParameter = event.target.value;
    render();
  });

  elements.autoInputText.addEventListener('input', (event) => {
    state.autoInput = event.target.value;
    parseAutomaticInput();
    render();
  });

  elements.initialVolume.addEventListener('input', (event) => {
    state.initialVolume = sanitizeNumber(event.target.value);
    render();
  });

  elements.incomingVolume.addEventListener('input', (event) => {
    if (state.calculationMode === 'ibc') {
      state.incomingVolume = 1;
      event.target.value = '1';
    } else {
      state.incomingVolume = sanitizeNumber(event.target.value);
    }
    render();
  });

  elements.coolingVolume.addEventListener('input', (event) => {
    state.coolingVolume = sanitizeNumber(event.target.value);
    render();
  });

  elements.openSettingsButtons.forEach((button) => {
    button.addEventListener('click', () => toggleSettings(true));
  });

  elements.closeSettingsButton.addEventListener('click', () => toggleSettings(false));
  elements.settingsOverlay.addEventListener('click', () => toggleSettings(false));

  elements.settingsSafetyFactor.addEventListener('input', (event) => {
    state.settings.safetyFactor = Math.max(1, sanitizeNumber(event.target.value, 1));
    saveSettings();
    render();
  });

  elements.settingsOperationMode.addEventListener('change', (event) => {
    state.settings.operationMode = event.target.value;
    saveSettings();
    render();
  });

  elements.settingsLimitsGrid.addEventListener('input', (event) => {
    const input = event.target.closest('input[data-limit-key]');
    if (!input) return;
    state.settings.limits[input.dataset.limitKey] = input.value === '' ? null : sanitizeNumber(input.value);
    saveSettings();
    render();
  });

  elements.settingsCoolingGrid.addEventListener('input', (event) => {
    const input = event.target.closest('input[data-cooling-key]');
    if (!input) return;
    state.settings.coolingComposition[input.dataset.coolingKey] = sanitizeNumber(input.value);
    saveSettings();
    render();
  });

  elements.resetButton.addEventListener('click', () => {
    state.calculationMode = 'single';
    state.inputMode = 'manual';
    state.selectedParameter = 'Ba';
    state.initialVolume = 100;
    state.incomingVolume = 10;
    state.coolingVolume = 0;
    state.autoInput = '';
    state.initialConcentrations = Object.fromEntries(CONTAMINANTS.map((item) => [item.key, 0]));
    state.incomingConcentrations = Object.fromEntries(CONTAMINANTS.map((item) => [item.key, 0]));
    elements.autoInputText.value = '';
    render();
  });
}

function populateSingleSelect() {
  elements.singleSelect.innerHTML = state.settings.contaminantOrder
    .map((key) => {
      const contaminant = getContaminant(key);
      return `<option value="${key}">${contaminant.label}</option>`;
    })
    .join('');
  elements.singleSelect.value = state.selectedParameter;
}

function render() {
  ensureSelectedParameter();
  populateSingleSelect();
  renderModeSelectors();
  renderInputs();
  renderAutoPanel();
  renderCoolingPreview();
  renderResults();
  renderSummary();
  renderSettings();
}

function ensureSelectedParameter() {
  const visibleKeys = getVisibleContaminants().map((item) => item.key);
  if (!visibleKeys.includes(state.selectedParameter)) {
    state.selectedParameter = visibleKeys[0];
  }
}

function getVisibleContaminants() {
  const ordered = state.settings.contaminantOrder.map(getContaminant).filter(Boolean);
  if (state.calculationMode === 'single') {
    return ordered.filter((item) => item.key === state.selectedParameter);
  }
  if (state.calculationMode === 'multiple') {
    return ordered.filter((item) => MULTIPLE_KEYS.includes(item.key));
  }
  return ordered.filter((item) => MULTIPLE_KEYS.includes(item.key));
}

function renderModeSelectors() {
  [...elements.calcModeSelector.querySelectorAll('button')].forEach((button) => {
    button.classList.toggle('is-active', button.dataset.mode === state.calculationMode);
  });
  [...elements.inputModeSelector.querySelectorAll('button')].forEach((button) => {
    button.classList.toggle('is-active', button.dataset.inputMode === state.inputMode);
  });

  const isSingle = state.calculationMode === 'single';
  elements.singleSelect.closest('.field').classList.toggle('hidden', !isSingle);
  elements.incomingVolume.disabled = state.calculationMode === 'ibc';
  if (state.calculationMode === 'ibc') {
    elements.incomingVolume.value = '1';
    state.incomingVolume = 1;
  }
}

function renderInputs() {
  const contaminants = getVisibleContaminants();
  elements.initialContainer.innerHTML = contaminants.map((item) => renderConcentrationField(item, 'initial')).join('');
  elements.incomingContainer.innerHTML = contaminants.map((item) => renderConcentrationField(item, 'incoming')).join('');

  bindConcentrationInputs('initial');
  bindConcentrationInputs('incoming');

  elements.initialVolume.value = String(state.initialVolume);
  elements.incomingVolume.value = String(state.incomingVolume);
  elements.coolingVolume.value = String(state.coolingVolume);
}

function renderConcentrationField(item, type) {
  const value = type === 'initial' ? state.initialConcentrations[item.key] : state.incomingConcentrations[item.key];
  return `
    <label class="contaminant-field field">
      <strong>${item.label}</strong>
      <span>${type === 'initial' ? 'Initial concentration C₀ (mg/L)' : 'Incoming concentration C₁ (mg/L)'}</span>
      <input type="number" min="0" step="0.0001" value="${value}" data-type="${type}" data-key="${item.key}" />
    </label>
  `;
}

function bindConcentrationInputs(type) {
  const container = type === 'initial' ? elements.initialContainer : elements.incomingContainer;
  container.querySelectorAll('input[data-key]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const key = event.target.dataset.key;
      const nextValue = sanitizeNumber(event.target.value);
      if (type === 'initial') {
        state.initialConcentrations[key] = nextValue;
      } else {
        state.incomingConcentrations[key] = nextValue;
      }
      renderResults();
      renderSummary();
    });
  });
}

function renderAutoPanel() {
  elements.autoInputPanel.classList.toggle('hidden', state.inputMode !== 'automatic');
  if (state.inputMode !== 'automatic') return;

  const parseResult = parseAutomaticInput();
  if (!parseResult.values.length) {
    elements.autoPreview.innerHTML = '<span>No automatic data parsed yet.</span>';
    return;
  }

  const previewItems = parseResult.orderUsed.map(({ key, value }) => `
    <div class="preview-item">
      <span>${key}</span>
      <strong>${formatNumber(value)} mg/L</strong>
    </div>
  `);

  elements.autoPreview.innerHTML = `
    <div class="preview-grid">${previewItems.join('')}</div>
  `;
}

function parseAutomaticInput() {
  const raw = state.autoInput.trim();
  if (!raw) return { values: [], orderUsed: [] };

  const values = raw.split(/[\s,;]+/).filter(Boolean).map((token) => Number(token));
  const hasInvalid = values.some((value) => Number.isNaN(value) || value < 0);
  if (hasInvalid) {
    return { values: [], orderUsed: [] };
  }

  const orderWithoutLi = ['Ba', 'Al', 'P', 'Fe', 'Ni', 'Cu', 'Zn', 'Pb', 'Cr', 'Mn', 'Co', 'B', 'Cd'];
  const orderWithLi = ['Ba', 'Al', 'P', 'Fe', 'Ni', 'Cu', 'Zn', 'Pb', 'Cr', 'Mn', 'Co', 'Li', 'B', 'Cd'];
  const chosenOrder = values.length === orderWithLi.length ? orderWithLi : orderWithoutLi;

  if (![orderWithoutLi.length, orderWithLi.length].includes(values.length)) {
    return { values, orderUsed: [] };
  }

  chosenOrder.forEach((key, index) => {
    state.incomingConcentrations[key] = values[index] ?? 0;
  });

  if (chosenOrder === orderWithoutLi) {
    state.incomingConcentrations.Li = 0;
  }

  return {
    values,
    orderUsed: chosenOrder.map((key, index) => ({ key, value: values[index] })),
  };
}

function renderCoolingPreview() {
  const contaminants = getVisibleContaminants();
  const preview = contaminants.map((item) => `
    <div class="preview-item">
      <span>${item.label}</span>
      <strong>${formatNumber(state.settings.coolingComposition[item.key] || 0)} mg/L</strong>
    </div>
  `);
  elements.coolingPreview.innerHTML = `<div class="preview-grid">${preview.join('')}</div>`;
}

function renderResults() {
  const contaminants = getVisibleContaminants();
  const validations = validateState();
  elements.validationMessages.innerHTML = validations.map((message) => `<div class="message ${message.type}">${message.text}</div>`).join('');

  const rows = contaminants.map((item) => buildResult(item));

  elements.resultsWrapper.innerHTML = `
    <table class="results-table">
      <thead>
        <tr>
          <th>Contaminant</th>
          <th>Initial</th>
          <th>Incoming</th>
          <th>Corrected</th>
          <th>After addition</th>
          <th>Final with cooling</th>
          <th>Operative limit</th>
          <th>Available margin</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(renderResultRow).join('')}
      </tbody>
    </table>
  `;
}

function buildResult(item) {
  const initialVolume = state.initialVolume;
  const incomingVolume = state.calculationMode === 'ibc' ? 1 : state.incomingVolume;
  const coolingVolume = state.coolingVolume;
  const initialConcentration = state.initialConcentrations[item.key] || 0;
  const incomingConcentration = state.incomingConcentrations[item.key] || 0;
  const correctedConcentration =
    state.settings.operationMode === 'real'
      ? incomingConcentration * state.settings.safetyFactor
      : incomingConcentration;

  const firstStage = mixStream({ volume: initialVolume, concentration: initialConcentration }, { volume: incomingVolume, concentration: correctedConcentration });
  const coolingConcentration = state.settings.coolingComposition[item.key] || 0;
  const finalStage = mixStream(
    { volume: firstStage.volume, concentration: firstStage.concentration },
    { volume: coolingVolume, concentration: coolingConcentration },
  );

  const regulatoryLimit = state.settings.limits[item.key];
  const operativeLimit = typeof regulatoryLimit === 'number' ? regulatoryLimit * 0.8 : null;
  const margin = operativeLimit === null ? null : operativeLimit - finalStage.concentration;
  const status = getStatus(finalStage.concentration, operativeLimit, regulatoryLimit);

  return {
    item,
    initialConcentration,
    incomingConcentration,
    correctedConcentration,
    afterAddition: firstStage.concentration,
    finalConcentration: finalStage.concentration,
    operativeLimit,
    margin,
    status,
  };
}

function mixStream(base, addition) {
  const massBase = base.volume * base.concentration;
  const massAdded = addition.volume * addition.concentration;
  const finalVolume = base.volume + addition.volume;
  const finalMass = massBase + massAdded;

  if (finalVolume === 0) {
    return { volume: 0, concentration: 0, mass: finalMass };
  }

  return {
    volume: finalVolume,
    concentration: finalMass / finalVolume,
    mass: finalMass,
  };
}

function getStatus(finalConcentration, operativeLimit, regulatoryLimit) {
  if (regulatoryLimit === null || regulatoryLimit === undefined) {
    return { label: 'Info', tone: 'info' };
  }
  if (finalConcentration > regulatoryLimit) {
    return { label: 'Exceeds limit', tone: 'danger' };
  }
  if (finalConcentration > operativeLimit) {
    return { label: 'Warning', tone: 'warning' };
  }
  return { label: 'OK', tone: 'ok' };
}

function renderResultRow(result) {
  return `
    <tr>
      <td><strong>${result.item.label}</strong></td>
      <td>${formatNumber(result.initialConcentration)} mg/L</td>
      <td>${formatNumber(result.incomingConcentration)} mg/L</td>
      <td>${formatNumber(result.correctedConcentration)} mg/L</td>
      <td>${formatNumber(result.afterAddition)} mg/L</td>
      <td>${formatNumber(result.finalConcentration)} mg/L</td>
      <td>${result.operativeLimit === null ? 'Not defined' : `${formatNumber(result.operativeLimit)} mg/L`}</td>
      <td>${result.margin === null ? 'N/A' : `${formatSignedNumber(result.margin)} mg/L`}</td>
      <td><span class="badge ${result.status.tone}">${result.status.label}</span></td>
    </tr>
  `;
}

function renderSummary() {
  elements.summaryMode.textContent = capitalize(state.calculationMode);
  elements.summaryInputMode.textContent = capitalize(state.inputMode);
  elements.summaryFactor.textContent = `${formatNumber(state.settings.safetyFactor)}x`;
  elements.operationModeLabel.textContent = `${capitalize(state.settings.operationMode)} mode`;
  elements.factorPill.textContent =
    state.settings.operationMode === 'real'
      ? `Corrected by safety factor (${formatNumber(state.settings.safetyFactor)}x)`
      : 'Theoretical mode without safety factor';
}

function renderSettings() {
  elements.settingsSafetyFactor.value = String(state.settings.safetyFactor);
  elements.settingsOperationMode.value = state.settings.operationMode;
  elements.settingsOrderList.innerHTML = state.settings.contaminantOrder
    .map((key) => `<div class="order-chip">${key}</div>`)
    .join('');
  elements.settingsLimitsGrid.innerHTML = state.settings.contaminantOrder
    .map((key) => renderSettingsInput(key, 'limit'))
    .join('');
  elements.settingsCoolingGrid.innerHTML = state.settings.contaminantOrder
    .map((key) => renderSettingsInput(key, 'cooling'))
    .join('');
}

function renderSettingsInput(key, type) {
  const value = type === 'limit' ? state.settings.limits[key] : state.settings.coolingComposition[key];
  const attr = type === 'limit' ? 'data-limit-key' : 'data-cooling-key';
  const label = type === 'limit' ? 'Regulatory limit' : 'Cooling composition';
  return `
    <label class="field">
      <span>${key} · ${label}</span>
      <input type="number" min="0" step="0.0001" ${attr}="${key}" value="${value ?? ''}" />
    </label>
  `;
}

function validateState() {
  const messages = [];
  if (state.initialVolume < 0 || state.incomingVolume < 0 || state.coolingVolume < 0) {
    messages.push({ type: 'error', text: 'Volumes cannot be negative.' });
  }

  const invalidInitial = Object.values(state.initialConcentrations).some((value) => value < 0);
  const invalidIncoming = Object.values(state.incomingConcentrations).some((value) => value < 0);
  if (invalidInitial || invalidIncoming) {
    messages.push({ type: 'error', text: 'Concentration inputs cannot be negative.' });
  }

  if (state.initialVolume + (state.calculationMode === 'ibc' ? 1 : state.incomingVolume) === 0) {
    messages.push({
      type: 'info',
      text: 'Initial and incoming volumes are both zero, so the first stage concentration is reported as 0 mg/L to avoid division by zero.',
    });
  }

  if (state.inputMode === 'automatic') {
    const parsed = parseAutomaticInput();
    if (state.autoInput.trim() && !parsed.orderUsed.length) {
      messages.push({
        type: 'error',
        text: 'Automatic input must contain 13 values (without Li) or 14 values (with Li), all non-negative.',
      });
    }
  }

  if (state.calculationMode === 'ibc') {
    messages.push({
      type: 'info',
      text: 'IBC mode fixes the added volume to 1 m³ and keeps the logic ready for future flexible alerts.',
    });
  }

  return messages;
}

function toggleSettings(open) {
  elements.settingsOverlay.classList.toggle('hidden', !open);
  elements.settingsDrawer.classList.toggle('hidden', !open);
  elements.settingsDrawer.setAttribute('aria-hidden', String(!open));
}

function getContaminant(key) {
  return CONTAMINANTS.find((item) => item.key === key);
}

function sanitizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(0, parsed);
}

function formatNumber(value) {
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function formatSignedNumber(value) {
  const formatted = formatNumber(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
