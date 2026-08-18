import { showToast } from './notifications.js';

export let appConfig = {};
const CONFIG_STORAGE_KEY = 'chat_app_config';

export function validateAndProcessConfig(raw) {
  const errors = [];
  const fallbacks = [];
  const config = {};

  let tokens = parseInt(raw.tokens, 10);
  if (isNaN(tokens) || tokens < 1) {
    fallbacks.push('Tokens inválido, usando fallback: 2048');
    tokens = 2048;
  } else if (tokens > 8192) {
    fallbacks.push('Tokens máximo excedido (8192), ajustado para 8192');
    tokens = 8192;
  }
  config.tokens = tokens;

  config.key = (raw.key || '').trim();
  if (!config.key) {
    fallbacks.push('Chave API não fornecida. Modo mock (sem API) será usado.');
  }

  let temp = parseFloat(raw.temperatura);
  if (isNaN(temp) || temp < 0 || temp > 2) {
    fallbacks.push('Temperatura inválida, usando fallback: 0.7');
    temp = 0.7;
  }
  config.temperatura = temp;

  let topP = parseFloat(raw.topP);
  if (isNaN(topP) || topP < 0 || topP > 1) {
    fallbacks.push('Top P inválido, usando fallback: 1.0');
    topP = 1.0;
  }
  config.topP = topP;

  let minK = parseInt(raw.minK, 10);
  if (isNaN(minK) || minK < 0) {
    fallbacks.push('Min K inválido, usando fallback: 1');
    minK = 1;
  }
  config.minK = minK;

  let maxK = parseInt(raw.maxK, 10);
  if (isNaN(maxK) || maxK < 1) {
    fallbacks.push('Max K inválido, usando fallback: 50');
    maxK = 50;
  }
  if (maxK < minK) {
    fallbacks.push('Max K não pode ser menor que Min K. Ajustado para Min K.');
    maxK = minK;
  }
  config.maxK = maxK;

  let minP = parseFloat(raw.minP);
  if (isNaN(minP) || minP < 0 || minP > 1) {
    fallbacks.push('Min P inválido, usando fallback: 0.0');
    minP = 0.0;
  }
  config.minP = minP;

  let maxP = parseFloat(raw.maxP);
  if (isNaN(maxP) || maxP < 0 || maxP > 1) {
    fallbacks.push('Max P inválido, usando fallback: 1.0');
    maxP = 1.0;
  }
  if (maxP < minP) {
    fallbacks.push('Max P não pode ser menor que Min P. Ajustado para Min P.');
    maxP = minP;
  }
  config.maxP = maxP;

  let maxHistory = parseInt(raw.maxHistory, 10);
  if (isNaN(maxHistory) || maxHistory < 1) {
    fallbacks.push('Histórico máximo inválido, usando fallback: 20');
    maxHistory = 20;
  }
  config.maxHistory = maxHistory;

  let timeout = parseInt(raw.timeout, 10);
  if (isNaN(timeout) || timeout < 5) {
    fallbacks.push('Timeout inválido, usando fallback: 300 segundos');
    timeout = 300;
  }
  config.timeout = timeout;

  config.memoryType = (raw.memoryType === 'tokens') ? 'tokens' : 'palavras';

  config.wobVerbo = raw.wobVerbo !== undefined ? !!raw.wobVerbo : true;
  config.wobSubjetivo = raw.wobSubjetivo !== undefined ? !!raw.wobSubjetivo : true;
  config.wobAdjetivo = raw.wobAdjetivo !== undefined ? !!raw.wobAdjetivo : true;
  config.wobAdverbo = raw.wobAdverbo !== undefined ? !!raw.wobAdverbo : true;

  const validOrders = ['cronologica', 'reversa', 'aleatoria'];
  if (!validOrders.includes(raw.textOrder)) {
    fallbacks.push('Ordem do texto inválida, usando fallback: cronológica');
    config.textOrder = 'cronologica';
  } else {
    config.textOrder = raw.textOrder;
  }

  config.rag = !!raw.rag;

  return { config, errors, fallbacks };
}

export function applyConfig(rawConfig) {
  const result = validateAndProcessConfig(rawConfig);
  appConfig = result.config;
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(appConfig));

  if (result.errors.length > 0) {
    result.errors.forEach(err => showToast('Erro: ' + err, 'error'));
  }
  if (result.fallbacks.length > 0) {
    result.fallbacks.forEach(msg => showToast('⚠️ Fallback: ' + msg, 'error', 5000));
  }
  if (!appConfig.key) {
    showToast('Chave API não definida. As respostas serão simuladas (mock).', 'error', 5000);
  }
  return appConfig;
}

export function loadConfig() {
  const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
  let raw = {};
  if (stored) {
    try { raw = JSON.parse(stored); } catch (e) {}
  }
  const defaults = {
    tokens: 2048,
    key: '',
    temperatura: 0.7,
    topP: 1.0,
    minK: 1,
    maxK: 50,
    minP: 0.0,
    maxP: 1.0,
    maxHistory: 20,
    timeout: 300,
    memoryType: 'palavras',
    wobVerbo: true,
    wobSubjetivo: true,
    wobAdjetivo: true,
    wobAdverbo: true,
    textOrder: 'cronologica',
    rag: false
  };
  const merged = { ...defaults, ...raw };
  return applyConfig(merged);
}
