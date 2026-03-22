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
const DEFAULT_AUTO_ORDER = ['Ba', 'Al', 'P', 'Fe', 'Ni', 'Cu', 'Zn', 'Pb', 'Cr', 'Mn', 'Co', 'Li', 'B', 'Cd'];
const STORAGE_KEY = 'concentration-calculator-settings-v3';
const EXCEL_SOURCE_STATUS = {
  available: false,
  message:
    'No se encontraron los Excel de referencia en el repositorio ni en los recursos del entorno; se aplica la lógica base del prompt y la app queda preparada para ajustar reglas cuando esos archivos estén disponibles.',
};

const TEXTS = {
  es: {
    tabs: ['Inicio', 'Cálculo', 'Resultados', 'Settings'],
  },
};

const defaultSettings = {
  locale: 'es',
  safetyFactor: 1.25,
  operationMode: 'real',
  warningThresholdRatio: 0.9,
  contaminantOrder: CONTAMINANTS.map((item) => item.key),
  automaticOrder: [...DEFAULT_AUTO_ORDER],
  coolingComposition: Object.fromEntries(CONTAMINANTS.map((item) => [item.key, 0])),
  limits: Object.fromEntries(CONTAMINANTS.map((item) => [item.key, item.regulatoryLimit])),
};

const state = {
  activeScreen: 0,
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
  tabs: document.getElementById('tabs'),
  screens: [...document.querySelectorAll('.screen')],
  calcModeSelector: document.getElementById('calculation-mode-selector'),
  inputModeSelector: document.getElementById('input-mode-selector'),
  singleParameterField: document.getElementById('single-parameter-field'),
  singleSelect: document.getElementById('single-parameter-select'),
  settingsOperationModeInline: document.getElementById('settings-operation-mode-inline'),
  summaryChips: document.getElementById('summary-chips'),
  autoInputPanel: document.getElementById('auto-input-panel'),
  autoInputText: document.getElementById('auto-input-text'),
  autoPreview: document.getElementById('auto-preview'),
  initialVolume: document.getElementById('initial-volume'),
  incomingVolume: document.getElementById('incoming-volume'),
  coolingVolume: document.getElementById('cooling-volume'),
  factorReadout: document.getElementById('factor-readout'),
  coolingModeReadout: document.getElementById('cooling-mode-readout'),
  initialContainer: document.getElementById('initial-concentrations'),
  incomingContainer: document.getElementById('incoming-concentrations'),
  coolingPreview: document.getElementById('cooling-preview'),
  validationMessages: document.getElementById('validation-messages'),
  headlineMetrics: document.getElementById('headline-metrics'),
  resultsCards: document.getElementById('results-cards'),
  settingsSafetyFactor: document.getElementById('settings-safety-factor'),
  settingsOperationMode: document.getElementById('settings-operation-mode'),
  settingsWarningThreshold: document.getElementById('settings-warning-threshold'),
  settingsOrderReadout: document.getElementById('settings-order-readout'),
  settingsOrderList: document.getElementById('settings-order-list'),
  settingsLimitsGrid: document.getElementById('settings-limits-grid'),
  settingsCoolingGrid: document.getElementById('settings-cooling-grid'),
  homeButton: document.getElementById('home-button'),
  backButton: document.getElementById('back-button'),
  nextButton: document.getElementById('next-button'),
  openDevModal: document.getElementById('open-dev-modal'),
  closeDevModal: document.getElementById('close-dev-modal'),
  devModal: document.getElementById('dev-modal'),
};

init();

function init() {
  renderTabs();
  populateSingleSelect();
  bindEvents();
  render();
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved) return clone(defaultSettings);
    return {
      locale: saved.locale ?? defaultSettings.locale,
      safetyFactor: saved.safetyFactor ?? defaultSettings.safetyFactor,
      operationMode: saved.operationMode ?? defaultSettings.operationMode,
      warningThresholdRatio: saved.warningThresholdRatio ?? defaultSettings.warningThresholdRatio,
      contaminantOrder: Array.isArray(saved.contaminantOrder) ? saved.contaminantOrder : [...defaultSettings.contaminantOrder],
      automaticOrder: Array.isArray(saved.automaticOrder) ? saved.automaticOrder : [...defaultSettings.automaticOrder],
      coolingComposition: { ...defaultSettings.coolingComposition, ...(saved.coolingComposition || {}) },
      limits: { ...defaultSettings.limits, ...(saved.limits || {}) },
    };
  } catch {
    return clone(defaultSettings);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
}

function bindEvents() {
  elements.calcModeSelector.addEventListener('click', (event) => {
    const button = event.target.closest('[data-mode]');
    if (!button) return;
    state.calculationMode = button.dataset.mode;
    if (state.calculationMode === 'ibc') state.incomingVolume = 1;
    render();
  });

  elements.inputModeSelector.addEventListener('click', (event) => {
    const button = event.target.closest('[data-input-mode]');
    if (!button) return;
    state.inputMode = button.dataset.inputMode;
    render();
  });

  elements.singleSelect.addEventListener('change', (event) => {
    state.selectedParameter = event.target.value;
    render();
  });

  elements.settingsOperationModeInline.addEventListener('change', (event) => {
    state.settings.operationMode = event.target.value;
    saveSettings();
    render();
  });

  elements.autoInputText.addEventListener('input', (event) => {
    state.autoInput = event.target.value;
    applyAutomaticInput();
    render();
  });

  elements.initialVolume.addEventListener('input', (event) => {
    state.initialVolume = sanitizeNumber(event.target.value);
    render();
  });

  elements.incomingVolume.addEventListener('input', (event) => {
    state.incomingVolume = state.calculationMode === 'ibc' ? 1 : sanitizeNumber(event.target.value);
    render();
  });

  elements.coolingVolume.addEventListener('input', (event) => {
    state.coolingVolume = sanitizeNumber(event.target.value);
    render();
  });

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

  elements.settingsWarningThreshold.addEventListener('input', (event) => {
    state.settings.warningThresholdRatio = clamp(sanitizeNumber(event.target.value, defaultSettings.warningThresholdRatio), 0.5, 1);
    saveSettings();
    render();
  });

  elements.settingsLimitsGrid.addEventListener('input', (event) => {
    const input = event.target.closest('input[data-limit-key]');
    if (!input) return;
    state.settings.limits[input.dataset.limitKey] = input.value === '' ? null : sanitizeNumber(input.value);
    saveSettings();
    renderResults();
  });

  elements.settingsCoolingGrid.addEventListener('input', (event) => {
    const input = event.target.closest('input[data-cooling-key]');
    if (!input) return;
    state.settings.coolingComposition[input.dataset.coolingKey] = sanitizeNumber(input.value);
    saveSettings();
    render();
  });

  elements.homeButton.addEventListener('click', () => setActiveScreen(0));
  elements.backButton.addEventListener('click', () => setActiveScreen(Math.max(0, state.activeScreen - 1)));
  elements.nextButton.addEventListener('click', () => setActiveScreen(Math.min(elements.screens.length - 1, state.activeScreen + 1)));

  elements.openDevModal.addEventListener('click', () => elements.devModal.classList.remove('hidden'));
  elements.closeDevModal.addEventListener('click', () => elements.devModal.classList.add('hidden'));
  elements.devModal.addEventListener('click', (event) => {
    if (event.target === elements.devModal) elements.devModal.classList.add('hidden');
  });
}

function render() {
  ensureSelectedParameter();
  renderTabs();
  renderScreenState();
  renderModeButtons();
  populateSingleSelect();
  renderSummary();
  renderAutoPanel();
  renderInputs();
  renderCoolingPreview();
  renderSettings();
  renderResults();
}

function renderTabs() {
  elements.tabs.innerHTML = TEXTS[state.settings.locale].tabs
    .map((label, index) => `<button type="button" class="tab ${index === state.activeScreen ? 'is-active' : ''}" data-tab-index="${index}">${label}</button>`)
    .join('');
  elements.tabs.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => setActiveScreen(Number(tab.dataset.tabIndex)));
  });
}

function setActiveScreen(index) {
  state.activeScreen = index;
  renderScreenState();
  renderTabs();
}

function renderScreenState() {
  elements.screens.forEach((screen, index) => {
    screen.classList.toggle('is-active', index === state.activeScreen);
  });
  elements.backButton.disabled = state.activeScreen === 0;
  elements.nextButton.disabled = state.activeScreen === elements.screens.length - 1;
}

function renderModeButtons() {
  toggleActiveButton(elements.calcModeSelector, 'mode', state.calculationMode);
  toggleActiveButton(elements.inputModeSelector, 'inputMode', state.inputMode);
  elements.singleParameterField.classList.toggle('hidden', state.calculationMode !== 'single');
  elements.incomingVolume.disabled = state.calculationMode === 'ibc';
  if (state.calculationMode === 'ibc') elements.incomingVolume.value = '1';
}

function toggleActiveButton(container, datasetName, activeValue) {
  container.querySelectorAll('button').forEach((button) => {
    const value = datasetName === 'mode' ? button.dataset.mode : button.dataset.inputMode;
    button.classList.toggle('is-active', value === activeValue);
  });
}

function ensureSelectedParameter() {
  const visible = getVisibleContaminants().map((item) => item.key);
  if (!visible.includes(state.selectedParameter)) state.selectedParameter = visible[0];
}

function getVisibleContaminants() {
  const ordered = state.settings.contaminantOrder.map(getContaminant).filter(Boolean);
  if (state.calculationMode === 'single') return ordered.filter((item) => item.key === state.selectedParameter);
  return ordered.filter((item) => MULTIPLE_KEYS.includes(item.key));
}

function getAutomaticOrder() {
  return state.settings.automaticOrder.filter((key) => CONTAMINANTS.some((item) => item.key === key));
}

function populateSingleSelect() {
  elements.singleSelect.innerHTML = state.settings.contaminantOrder
    .map((key) => `<option value="${key}">${key}</option>`)
    .join('');
  elements.singleSelect.value = state.selectedParameter;
}

function renderSummary() {
  const visibleCount = getVisibleContaminants().length;
  const modeLabel = state.calculationMode === 'single' ? 'Único' : state.calculationMode === 'multiple' ? 'Múltiple' : 'IBC';
  const inputLabel = state.inputMode === 'manual' ? 'Manual' : 'Automático';
  const incomingVolume = getIncomingVolume();

  elements.summaryChips.innerHTML = [
    metricChip('Modo', modeLabel),
    metricChip('Carga', inputLabel),
    metricChip('Factor', `${formatNumber(state.settings.safetyFactor)}x`),
    metricChip('Parámetros', String(visibleCount)),
    metricChip('V ingreso', `${formatNumber(incomingVolume)} m³`),
  ].join('');

  elements.factorReadout.textContent =
    state.settings.operationMode === 'real'
      ? `Modo real · la concentración de ingreso se corrige con FS (${formatNumber(state.settings.safetyFactor)}).`
      : 'Modo teórico · se usa la concentración de ingreso sin corrección.';

  elements.coolingModeReadout.textContent = `Cooling water como etapa final adicional. ${EXCEL_SOURCE_STATUS.message}`;
}

function renderAutoPanel() {
  elements.autoInputPanel.classList.toggle('hidden', state.inputMode !== 'automatic');
  if (state.inputMode !== 'automatic') return;

  const parsed = parseAutomaticLine(state.autoInput, getAutomaticOrder());
  if (!state.autoInput.trim()) {
    elements.autoPreview.innerHTML = '<div class="notice">Pegá una línea para ver la asignación de contaminantes antes del cálculo.</div>';
    return;
  }

  if (!parsed.valid) {
    elements.autoPreview.innerHTML = `<div class="error">${parsed.error}</div>`;
    return;
  }

  elements.autoPreview.innerHTML = parsed.assignments
    .map(
      ({ key, value }) =>
        `<div class="card"><strong>${key}</strong><div class="readonly-output">${formatNumber(value)} mg/L</div></div>`,
    )
    .join('');
}

function parseAutomaticLine(rawInput, fullOrder) {
  const raw = rawInput.trim();
  if (!raw) return { valid: false, error: '', assignments: [] };

  const values = raw.split(/[\s,;]+/).filter(Boolean).map(Number);
  if (values.some((value) => Number.isNaN(value) || value < 0)) {
    return { valid: false, error: 'La línea contiene valores inválidos o negativos.', assignments: [] };
  }

  const orderWithoutLi = fullOrder.filter((key) => key !== 'Li');
  let chosenOrder = null;
  if (values.length === fullOrder.length) chosenOrder = fullOrder;
  if (values.length === orderWithoutLi.length) chosenOrder = orderWithoutLi;
  if (!chosenOrder) {
    return {
      valid: false,
      error: `La línea debe tener ${orderWithoutLi.length} valores sin Li o ${fullOrder.length} valores con Li según el orden configurado.`,
      assignments: [],
    };
  }

  return {
    valid: true,
    error: '',
    assignments: chosenOrder.map((key, index) => ({ key, value: values[index] ?? 0 })),
  };
}

function applyAutomaticInput() {
  const parsed = parseAutomaticLine(state.autoInput, getAutomaticOrder());
  if (!parsed.valid) return parsed;

  CONTAMINANTS.forEach((item) => {
    state.incomingConcentrations[item.key] = 0;
  });
  parsed.assignments.forEach(({ key, value }) => {
    state.incomingConcentrations[key] = value;
  });
  return parsed;
}

function renderInputs() {
  const contaminants = getVisibleContaminants();
  elements.initialContainer.innerHTML = contaminants.map((item) => renderConcentrationField(item, 'initial')).join('');
  elements.incomingContainer.innerHTML = contaminants.map((item) => renderConcentrationField(item, 'incoming')).join('');

  bindConcentrationInputs(elements.initialContainer, 'initial');
  bindConcentrationInputs(elements.incomingContainer, 'incoming');

  elements.initialVolume.value = String(state.initialVolume);
  elements.incomingVolume.value = String(getIncomingVolume());
  elements.coolingVolume.value = String(state.coolingVolume);
}

function renderConcentrationField(item, type) {
  const label = type === 'initial' ? 'C₀ inicial (mg/L)' : 'C ingreso (mg/L)';
  const value = type === 'initial' ? state.initialConcentrations[item.key] : state.incomingConcentrations[item.key];
  return `
    <label class="contaminant-field field">
      <strong>${item.label}</strong>
      <span>${label}</span>
      <input type="number" min="0" step="0.0001" data-type="${type}" data-key="${item.key}" value="${value}" />
    </label>
  `;
}

function bindConcentrationInputs(container, type) {
  container.querySelectorAll('input[data-key]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const key = event.target.dataset.key;
      const value = sanitizeNumber(event.target.value);
      if (type === 'initial') {
        state.initialConcentrations[key] = value;
      } else {
        state.incomingConcentrations[key] = value;
      }
      renderResults();
    });
  });
}

function renderCoolingPreview() {
  elements.coolingPreview.innerHTML = getVisibleContaminants()
    .map(
      (item) => `
        <div class="card">
          <strong>${item.label}</strong>
          <div class="readonly-output">${formatNumber(state.settings.coolingComposition[item.key] || 0)} mg/L</div>
        </div>
      `,
    )
    .join('');
}

function renderSettings() {
  elements.settingsSafetyFactor.value = String(state.settings.safetyFactor);
  elements.settingsOperationMode.value = state.settings.operationMode;
  elements.settingsOperationModeInline.value = state.settings.operationMode;
  elements.settingsWarningThreshold.value = String(state.settings.warningThresholdRatio);
  elements.settingsOrderReadout.textContent = `Orden automático: ${getAutomaticOrder().join(', ')}`;
  elements.settingsOrderList.innerHTML = state.settings.contaminantOrder.map((key) => metricChip(key, 'Visible', 'info')).join('');
  elements.settingsLimitsGrid.innerHTML = state.settings.contaminantOrder.map((key) => renderSettingsField(key, 'limit')).join('');
  elements.settingsCoolingGrid.innerHTML = state.settings.contaminantOrder.map((key) => renderSettingsField(key, 'cooling')).join('');
}

function renderSettingsField(key, type) {
  const value = type === 'limit' ? state.settings.limits[key] : state.settings.coolingComposition[key];
  const attr = type === 'limit' ? 'data-limit-key' : 'data-cooling-key';
  return `
    <label class="field">
      <span>${key}</span>
      <input type="number" min="0" step="0.0001" ${attr}="${key}" value="${value ?? ''}" />
    </label>
  `;
}

function renderResults() {
  const validations = validateState();
  const results = getVisibleContaminants().map(calculateContaminantResult);

  elements.validationMessages.innerHTML = validations
    .map((message) => `<div class="${message.type === 'error' ? 'error' : 'notice'}">${message.text}</div>`)
    .join('');
  elements.headlineMetrics.innerHTML = renderHeadlineMetrics(results);
  elements.resultsCards.innerHTML = results.map(renderResultCard).join('');
}

function renderHeadlineMetrics(results) {
  const statusCount = {
    ok: results.filter((item) => item.status.tone === 'ok').length,
    warning: results.filter((item) => item.status.tone === 'warning').length,
    danger: results.filter((item) => item.status.tone === 'danger').length,
  };

  const maxFinal = results.reduce((acc, item) => Math.max(acc, item.finalConcentration ?? 0), 0);
  const maxVolume = results.reduce((acc, item) => Math.max(acc, item.finalVolume ?? 0), 0);

  return [
    metricChip('OK', String(statusCount.ok), 'ok'),
    metricChip('Advertencia', String(statusCount.warning), statusCount.warning ? 'warning' : 'info'),
    metricChip('Excede', String(statusCount.danger), statusCount.danger ? 'danger' : 'info'),
    metricChip('C final máx', `${formatNumber(maxFinal)} mg/L`, 'info'),
    metricChip('V final', `${formatNumber(maxVolume)} m³`, 'info'),
  ].join('');
}

function calculateContaminantResult(item) {
  const incomingVolume = getIncomingVolume();
  const initialConcentration = state.initialConcentrations[item.key] || 0;
  const incomingRawConcentration = state.incomingConcentrations[item.key] || 0;
  const incomingCorrectedConcentration = applySafetyFactor(incomingRawConcentration);
  const coolingConcentration = state.settings.coolingComposition[item.key] || 0;

  const initialState = createInitialState(state.initialVolume, initialConcentration);
  const incomingStage = applyFlowStage(initialState, {
    label: state.calculationMode === 'ibc' ? 'Ingreso IBC' : 'Ingreso efluente',
    addedVolume: incomingVolume,
    addedConcentration: incomingCorrectedConcentration,
  });

  const coolingStage = applyFlowStage(incomingStage.finalState, {
    label: 'Cooling water',
    addedVolume: state.coolingVolume,
    addedConcentration: coolingConcentration,
  });

  const regulatoryLimit = state.settings.limits[item.key];
  const operativeLimit = typeof regulatoryLimit === 'number' ? regulatoryLimit * 0.8 : null;
  const warningLimit = operativeLimit === null ? null : operativeLimit * state.settings.warningThresholdRatio;
  const finalConcentration = coolingStage.finalState.concentration;
  const margin = operativeLimit === null || finalConcentration === null ? null : operativeLimit - finalConcentration;
  const status = evaluateStatus(finalConcentration, warningLimit, operativeLimit);

  return {
    item,
    incomingRawConcentration,
    incomingCorrectedConcentration,
    initialMass: initialState.mass,
    incomingMass: incomingStage.addedMass,
    massAfterIncoming: incomingStage.finalState.mass,
    coolingMass: coolingStage.addedMass,
    finalMass: coolingStage.finalState.mass,
    finalVolume: coolingStage.finalState.volume,
    afterIncomingConcentration: incomingStage.finalState.concentration,
    finalConcentration,
    regulatoryLimit,
    operativeLimit,
    warningLimit,
    margin,
    status,
  };
}

function createInitialState(volume, concentration) {
  return {
    volume,
    concentration: volume === 0 ? null : concentration,
    mass: volume * concentration,
  };
}

function applyFlowStage(initialState, stage) {
  const addedMass = stage.addedVolume * stage.addedConcentration;
  const finalMass = initialState.mass + addedMass;
  const finalVolume = initialState.volume + stage.addedVolume;

  return {
    label: stage.label,
    addedMass,
    finalState: {
      volume: finalVolume,
      mass: finalMass,
      concentration: finalVolume === 0 ? null : finalMass / finalVolume,
    },
  };
}

function applySafetyFactor(concentration) {
  if (state.settings.operationMode !== 'real') return concentration;
  return concentration * state.settings.safetyFactor;
}

function evaluateStatus(finalConcentration, warningLimit, operativeLimit) {
  if (finalConcentration === null) return { label: 'Sin cálculo', tone: 'info' };
  if (operativeLimit === null) return { label: 'Info', tone: 'info' };
  if (finalConcentration >= operativeLimit) return { label: 'Excede límite', tone: 'danger' };
  if (warningLimit !== null && finalConcentration >= warningLimit) return { label: 'Advertencia', tone: 'warning' };
  return { label: 'OK', tone: 'ok' };
}

function renderResultCard(result) {
  const limitLabel = result.operativeLimit === null ? 'No definido' : `${formatNumber(result.operativeLimit)} mg/L`;
  const regulatoryLabel = result.regulatoryLimit === null ? 'No definido' : `${formatNumber(result.regulatoryLimit)} mg/L`;
  const warningLabel = result.warningLimit === null ? 'No definido' : `${formatNumber(result.warningLimit)} mg/L`;
  const marginLabel = result.margin === null ? 'N/A' : `${formatSignedNumber(result.margin)} mg/L`;
  const finalConcentrationLabel = result.finalConcentration === null ? 'No calculable (Vf = 0)' : `${formatNumber(result.finalConcentration)} mg/L`;

  return `
    <article class="card">
      <div class="result-card-header">
        <h2>${result.item.label}</h2>
        <span class="status-pill ${result.status.tone}">${result.status.label}</span>
      </div>
      <div class="result-grid">
        ${readonlyOutput('Concentración inicial', `${formatNumber(state.initialConcentrations[result.item.key] || 0)} mg/L`)}
        ${readonlyOutput('Concentración ingreso', `${formatNumber(result.incomingRawConcentration)} mg/L`)}
        ${readonlyOutput('Concentración corregida', `${formatNumber(result.incomingCorrectedConcentration)} mg/L`)}
        ${readonlyOutput('Masa inicial', `${formatNumber(result.initialMass)}`)}
        ${readonlyOutput('Masa agregada', `${formatNumber(result.incomingMass)}`)}
        ${readonlyOutput('Masa final', `${formatNumber(result.finalMass)}`)}
        ${readonlyOutput('Volumen final', `${formatNumber(result.finalVolume)} m³`)}
        ${readonlyOutput('C luego del ingreso', result.afterIncomingConcentration === null ? 'No calculable' : `${formatNumber(result.afterIncomingConcentration)} mg/L`)}
        ${readonlyOutput('Concentración final', finalConcentrationLabel)}
        ${readonlyOutput('Límite regulatorio', regulatoryLabel)}
        ${readonlyOutput('Límite operativo', limitLabel)}
        ${readonlyOutput('Umbral advertencia', warningLabel)}
        ${readonlyOutput('Margen disponible', marginLabel)}
      </div>
    </article>
  `;
}

function readonlyOutput(label, value) {
  return `<div class="readonly-output"><strong>${label}</strong><br />${value}</div>`;
}

function metricChip(label, value, tone = 'info') {
  return `<div class="metric-chip ${tone}"><span>${label}</span><strong>${value}</strong></div>`;
}

function validateState() {
  const messages = [];
  const autoParsed = parseAutomaticLine(state.autoInput, getAutomaticOrder());
  if (!EXCEL_SOURCE_STATUS.available) {
    messages.push({ type: 'notice', text: EXCEL_SOURCE_STATUS.message });
  }
  if (state.inputMode === 'automatic' && state.autoInput.trim() && !autoParsed.valid) {
    messages.push({ type: 'error', text: autoParsed.error });
  }
  if (state.initialVolume < 0 || state.incomingVolume < 0 || state.coolingVolume < 0) {
    messages.push({ type: 'error', text: 'Los volúmenes no pueden ser negativos.' });
  }
  if (state.initialVolume + getIncomingVolume() === 0) {
    messages.push({ type: 'notice', text: 'La primera etapa queda con Vf = 0. No se calcula concentración hasta que se agregue volumen.' });
  }
  if (state.initialVolume + getIncomingVolume() + state.coolingVolume === 0) {
    messages.push({ type: 'error', text: 'El volumen final total es 0. La concentración final no puede calcularse.' });
  }
  if (state.calculationMode === 'ibc') {
    messages.push({ type: 'notice', text: 'Modo IBC activo: el ingreso queda fijado en 1 m³ y usa la misma secuencia de balance con criterios operativos propios preparados para ampliación.' });
  }
  return messages;
}

function getIncomingVolume() {
  return state.calculationMode === 'ibc' ? 1 : state.incomingVolume;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(0, parsed);
}

function getContaminant(key) {
  return CONTAMINANTS.find((item) => item.key === key);
}

function formatNumber(value) {
  return Number(value).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

function formatSignedNumber(value) {
  const absolute = formatNumber(Math.abs(value));
  return value >= 0 ? `+${absolute}` : `-${absolute}`;
}
