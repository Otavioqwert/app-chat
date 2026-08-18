import { showToast } from './notifications.js';

const MODELS_STORAGE_KEY = 'chat_models';
let models = [];
let activeModel = null;
let modelSelector, modelDisplay, modelArrow, modelDropdown;

export function initModels(elements) {
  modelSelector = elements.modelSelector;
  modelDisplay = elements.modelDisplay;
  modelArrow = elements.modelArrow;
  modelDropdown = elements.modelDropdown;

  loadModels();
  loadActiveModel();

  modelSelector.addEventListener('click', (e) => {
    if (e.target === modelSelector || e.target === modelArrow || e.target === modelDisplay) {
      toggleDropdown();
    }
  });
  document.addEventListener('click', (e) => {
    if (!modelSelector.contains(e.target)) closeDropdown();
  });
}

function loadModels() {
  const stored = localStorage.getItem(MODELS_STORAGE_KEY);
  if (stored) {
    try { models = JSON.parse(stored); if (!Array.isArray(models)) models = []; }
    catch (e) { models = []; }
  } else {
    models = ['openai/gpt-3.5-turbo', 'openai/gpt-4', 'anthropic/claude-3-haiku'];
  }
  models = [...new Set(models)];
  saveModels();
}

function saveModels() {
  localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(models));
}

function renderDropdown() {
  modelDropdown.innerHTML = '';
  const addOption = document.createElement('div');
  addOption.className = 'model-option add-option';
  addOption.textContent = '+ Adicionar';
  addOption.addEventListener('click', (e) => {
    e.stopPropagation();
    const nome = prompt('Digite o nome do novo modelo (ex: openai/gpt-4):');
    if (nome === null) return;
    const trimmed = nome.trim();
    if (trimmed === '') { showToast('Nome vazio.', 'error'); return; }
    if (models.includes(trimmed)) { showToast('Modelo já existe.', 'error'); return; }
    models.push(trimmed);
    saveModels();
    setActiveModel(trimmed);
    renderDropdown();
    closeDropdown();
  });
  modelDropdown.appendChild(addOption);

  if (models.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'model-option';
    empty.textContent = 'Nenhum modelo salvo';
    empty.style.color = '#888';
    empty.style.cursor = 'default';
    modelDropdown.appendChild(empty);
  } else {
    models.forEach(modelName => {
      const option = document.createElement('div');
      option.className = 'model-option';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = modelName;
      nameSpan.style.flex = '1';
      const removeSpan = document.createElement('span');
      removeSpan.className = 'remove-model';
      removeSpan.textContent = '✕';
      removeSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm(`Remover "${modelName}"?`)) return;
        models = models.filter(m => m !== modelName);
        saveModels();
        if (activeModel === modelName) setActiveModel(null);
        renderDropdown();
        if (models.length === 0) {
          showToast('Nenhum modelo restante. Adicione um para continuar.', 'error');
        }
      });
      option.appendChild(nameSpan);
      option.appendChild(removeSpan);
      option.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-model')) return;
        setActiveModel(modelName);
        closeDropdown();
      });
      modelDropdown.appendChild(option);
    });
  }
}

function toggleDropdown() {
  const isOpen = modelDropdown.classList.toggle('open');
  modelArrow.classList.toggle('open', isOpen);
  if (isOpen) renderDropdown();
}

function closeDropdown() {
  modelDropdown.classList.remove('open');
  modelArrow.classList.remove('open');
}

function setActiveModel(modelName) {
  activeModel = modelName;
  modelDisplay.textContent = activeModel || 'Model';
  localStorage.setItem('chat_active_model', activeModel || '');
  closeDropdown();
  if (!activeModel) {
    showToast('Nenhum modelo selecionado. Selecione um modelo para continuar.', 'error');
  }
}

function loadActiveModel() {
  const saved = localStorage.getItem('chat_active_model');
  if (saved && models.includes(saved)) {
    activeModel = saved;
  } else if (models.length > 0) {
    activeModel = models[0];
  } else {
    activeModel = null;
    showToast('Nenhum modelo disponível. Adicione um modelo.', 'error');
  }
  modelDisplay.textContent = activeModel || 'Model';
}

export function getActiveModel() {
  return activeModel;
}
