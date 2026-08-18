// js/chat.js
import { showToast } from './notifications.js';
import { appConfig } from './config.js';
import { getActiveModel } from './models.js';
import { sendMessageToAPI } from './api.js';
import { createMessageElement } from './markdown.js';

let sessoes = [];
let proximoId = 1;
let sessaoAtiva = null;
let filtroBusca = '';

let scrollListEl, messageHistoryEl, messageInput, sendButton;
let statusArea, statusIcon, statusText, statusTimer, cancelBtn;
let statusController = null;

const CHAT_CACHE_KEY = 'chat_sessions';

export function initChat(elements) {
  scrollListEl = elements.scrollList;
  messageHistoryEl = elements.messageHistory;
  messageInput = elements.messageInput;
  sendButton = elements.sendButton;

  statusArea = document.getElementById('statusArea');
  statusIcon = document.getElementById('statusIcon');
  statusText = document.getElementById('statusText');
  statusTimer = document.getElementById('statusTimer');
  cancelBtn = document.getElementById('cancelRequest');

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (statusController) {
        statusController.abortController.abort();
        statusController.canceled = true;
        updateStatus('canceled', 'Cancelando...');
        cancelBtn.disabled = true;
      }
    });
  }

  carregarCache();

  sendButton.addEventListener('click', handleSend);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendButton.click();
  });

    document.addEventListener('message-edited', salvarCache);
}

// ========== CACHE ==========
function carregarCache() {
  const stored = localStorage.getItem(CHAT_CACHE_KEY);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (data.sessoes && data.proximoId) {
        sessoes = data.sessoes;
        proximoId = data.proximoId;
        // Garantir que cada sessão tenha propriedades novas (fixado, nome)
        sessoes = sessoes.map(s => ({
          ...s,
          fixado: s.fixado || false,
          nome: s.nome || `Chat ${s.ID}`
        }));
        if (sessoes.length > 0) {
          selecionarSessao(sessoes[0].ID);
          return;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar cache:', e);
    }
  }
  adicionarNovaSessao();
}

function salvarCache() {
  try {
    const data = { sessoes, proximoId };
    localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Erro ao salvar cache:', e);
  }
}

// ========== ORDENAÇÃO E FILTRO ==========
function getSessoesOrdenadas() {
  // Fixadas primeiro, depois por ordem de criação (ID) ou posição
  const fixadas = sessoes.filter(s => s.fixado);
  const normais = sessoes.filter(s => !s.fixado);
  // Ordenar fixadas por ID (ou por ordem definida)
  fixadas.sort((a, b) => a.ID - b.ID);
  normais.sort((a, b) => a.ID - b.ID);
  return [...fixadas, ...normais];
}

function getSessoesFiltradas(termo) {
  if (!termo) return getSessoesOrdenadas();
  const lower = termo.toLowerCase();
  const filtradas = sessoes.filter(s => s.nome.toLowerCase().includes(lower));
  // Aplicar ordem (fixadas primeiro)
  const fixadas = filtradas.filter(s => s.fixado);
  const normais = filtradas.filter(s => !s.fixado);
  fixadas.sort((a, b) => a.ID - b.ID);
  normais.sort((a, b) => a.ID - b.ID);
  return [...fixadas, ...normais];
}

export function buscarSessoes(termo) {
  filtroBusca = termo;
  atualizarScrollList();
}

// ========== STATUS ==========
const STATUS_ICONS = ['-', ';', '/', '.', '..', '.:', ';:', ':;', ':.'];
let iconInterval = null;

function updateStatus(state, message) {
  if (!statusArea) return;
  switch (state) {
    case 'thinking':
      statusArea.style.display = 'flex';
      statusText.textContent = message || 'Pensando...';
      statusIcon.textContent = '⏳';
      if (cancelBtn) { cancelBtn.style.display = 'inline-block'; cancelBtn.disabled = false; }
      if (iconInterval) clearInterval(iconInterval);
      let idx = 0;
    iconInterval = setInterval(() => {
      statusIcon.textContent = STATUS_ICONS[idx % STATUS_ICONS.length];
      idx++;
    }, 250);
    break;
    case 'success':
      statusText.textContent = message || 'Concluído';
      statusIcon.textContent = '✅';
      if (cancelBtn) cancelBtn.style.display = 'none';
      if (iconInterval) clearInterval(iconInterval);
      setTimeout(hideStatus, 2000);
    break;
    case 'error':
      statusText.textContent = message || 'Erro';
      statusIcon.textContent = '❌';
      if (cancelBtn) cancelBtn.style.display = 'none';
      if (iconInterval) clearInterval(iconInterval);
      break;
    case 'timeout':
      statusText.textContent = message || 'Tempo limite excedido';
      statusIcon.textContent = '⏰';
      if (cancelBtn) cancelBtn.style.display = 'none';
      if (iconInterval) clearInterval(iconInterval);
      break;
    case 'canceled':
      statusText.textContent = message || 'Cancelado';
      statusIcon.textContent = '🚫';
      if (cancelBtn) cancelBtn.style.display = 'none';
      if (iconInterval) clearInterval(iconInterval);
      break;
    default:
      hideStatus();
  }
}

function hideStatus() {
  if (statusArea) statusArea.style.display = 'none';
  if (iconInterval) { clearInterval(iconInterval); iconInterval = null; }
  if (statusTimer) statusTimer.textContent = '00:00:00';
  if (cancelBtn) cancelBtn.style.display = 'none';
  statusController = null;
}

function startTimer() {
  const start = Date.now();
  if (statusTimer) statusTimer.textContent = '00:00:00';
  if (statusController && statusController.timerInterval) {
    clearInterval(statusController.timerInterval);
  }
  if (!statusController) statusController = { timerInterval: null, canceled: false };
  statusController.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - start) / 1000);
    const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const seconds = String(elapsed % 60).padStart(2, '0');
    if (statusTimer) statusTimer.textContent = `${hours}:${minutes}:${seconds}`;
  }, 1000);
}

function stopTimer() {
  if (statusController && statusController.timerInterval) {
    clearInterval(statusController.timerInterval);
    statusController.timerInterval = null;
  }
}

// ========== FUNÇÕES DE SESSÃO ==========
function criarSessao(id) {
  return {
    ID: id,
    nome: `Chat ${id}`,
    fixado: false,
    mensagensOutput: [],
    mensagensInput: []
  };
}

export function adicionarNovaSessao() {
  const novaSessao = criarSessao(proximoId);
  sessoes.push(novaSessao);
  proximoId++;
  selecionarSessao(novaSessao.ID);
  salvarCache();
}

export function removerSessao(id) {
  if (!confirm(`Deseja realmente excluir a sessão "${sessoes.find(s => s.ID === id)?.nome || id}"?`)) {
    return;
  }
  const index = sessoes.findIndex(s => s.ID === id);
  if (index === -1) return;
  sessoes.splice(index, 1);
  if (sessaoAtiva && sessaoAtiva.ID === id) {
    if (sessoes.length > 0) {
      selecionarSessao(sessoes[0].ID);
    } else {
      adicionarNovaSessao();
    }
  }
  salvarCache();
  atualizarScrollList();
  showToast('Sessão removida.', 'error', 2000);
}

export function renomearSessao(id, novoNome) {
  const sessao = sessoes.find(s => s.ID === id);
  if (!sessao) return;
  const trimmed = novoNome.trim();
  if (!trimmed) {
    showToast('Nome não pode ficar vazio.', 'error');
    return;
  }
  sessao.nome = trimmed;
  salvarCache();
  atualizarScrollList();
  // Atualiza o título do chat na área principal
  // (opcional: mostrar o nome em algum lugar)
  showToast(`Sessão renomeada para "${trimmed}"`, 'error', 2000);
}

export function fixarSessao(id) {
  const sessao = sessoes.find(s => s.ID === id);
  if (!sessao) return;
  sessao.fixado = !sessao.fixado;
  salvarCache();
  atualizarScrollList();
  showToast(sessao.fixado ? 'Sessão fixada!' : 'Sessão desafixada!', 'error', 1500);
}

export function moverSessao(id, direcao) {
  // direcao: 'up' ou 'down'
  const index = sessoes.findIndex(s => s.ID === id);
  if (index === -1) return;
  // Não permite mover se houver filtro ativo (para simplificar)
  if (filtroBusca) {
    showToast('Limpe a busca para mover sessões.', 'error');
    return;
  }
  // Pegar lista ordenada
  const ordenadas = getSessoesOrdenadas();
  const posAtual = ordenadas.findIndex(s => s.ID === id);
  if (posAtual === -1) return;
  let novoIndex = posAtual + (direcao === 'up' ? -1 : 1);
  if (novoIndex < 0 || novoIndex >= ordenadas.length) return;
  // Trocar posições no array original
  const indexOrig = sessoes.indexOf(sessoes.find(s => s.ID === id));
  const indexDest = sessoes.indexOf(ordenadas[novoIndex]);
  if (indexOrig === -1 || indexDest === -1) return;
  [sessoes[indexOrig], sessoes[indexDest]] = [sessoes[indexDest], sessoes[indexOrig]];
  salvarCache();
  atualizarScrollList();
}

// ========== RENDERIZAÇÃO DA LISTA ==========
function atualizarScrollList() {
  if (!scrollListEl) {
    console.error('scrollListEl não encontrado!');
    return;
  }
  const lista = filtroBusca ? getSessoesFiltradas(filtroBusca) : getSessoesOrdenadas();
  scrollListEl.innerHTML = '';
  lista.forEach(sessao => {
    const item = document.createElement('div');
    item.className = 'chat-history-item';
    if (sessaoAtiva && sessaoAtiva.ID === sessao.ID) {
      item.classList.add('active');
    }
    if (sessao.fixado) {
      item.classList.add('fixado');
    }

    // Nome da sessão
    const nomeSpan = document.createElement('span');
    nomeSpan.className = 'session-name';
    nomeSpan.textContent = sessao.nome;

    // Container de ações
    const actions = document.createElement('div');
    actions.className = 'session-actions';

    // Botão fixar
    const pinBtn = document.createElement('button');
    pinBtn.className = 'session-btn pin-btn';
    pinBtn.textContent = sessao.fixado ? '📌' : '📍';
    pinBtn.title = sessao.fixado ? 'Desafixar' : 'Fixar';
    pinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fixarSessao(sessao.ID);
    });

    // Botão mover para cima
    const upBtn = document.createElement('button');
    upBtn.className = 'session-btn move-up-btn';
    upBtn.textContent = '⬆';
    upBtn.title = 'Mover para cima';
    upBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      moverSessao(sessao.ID, 'up');
    });

    // Botão mover para baixo
    const downBtn = document.createElement('button');
    downBtn.className = 'session-btn move-down-btn';
    downBtn.textContent = '⬇';
    downBtn.title = 'Mover para baixo';
    downBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      moverSessao(sessao.ID, 'down');
    });

    // Botão renomear
    const renameBtn = document.createElement('button');
    renameBtn.className = 'session-btn rename-btn';
    renameBtn.textContent = '✏️';
    renameBtn.title = 'Renomear';
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const novoNome = prompt('Novo nome para a sessão:', sessao.nome);
      if (novoNome !== null && novoNome.trim() !== '') {
        renomearSessao(sessao.ID, novoNome);
      }
    });

    // Botão excluir (X)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'session-btn delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.title = 'Excluir sessão';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removerSessao(sessao.ID);
    });

    actions.appendChild(pinBtn);
    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(nomeSpan);
    item.appendChild(actions);

    item.addEventListener('click', () => selecionarSessao(sessao.ID));
    scrollListEl.appendChild(item);
  });
}

// ========== SELEÇÃO E EXIBIÇÃO ==========
function selecionarSessao(id) {
  const sessao = sessoes.find(s => s.ID === id);
  if (!sessao) return;
  sessaoAtiva = sessao;
  atualizarScrollList();
  exibirMensagens(sessao);
  salvarCache();
}

function exibirMensagens(sessao) {
  if (!messageHistoryEl) {
    console.error('messageHistoryEl não encontrado!');
    return;
  }
  messageHistoryEl.innerHTML = '';
  const total = Math.max(sessao.mensagensInput.length, sessao.mensagensOutput.length);
  for (let i = 0; i < total; i++) {
    if (i < sessao.mensagensInput.length) {
      const msgInput = createMessageElement(sessao.mensagensInput[i], 'input', sessao.mensagensInput[i]);
      messageHistoryEl.appendChild(msgInput);
    }
    if (i < sessao.mensagensOutput.length) {
      const msgOutput = createMessageElement(sessao.mensagensOutput[i], 'output', sessao.mensagensOutput[i]);
      messageHistoryEl.appendChild(msgOutput);
    }
  }
  messageHistoryEl.scrollTop = messageHistoryEl.scrollHeight;
}

export function adicionarMensagem(texto, tipo) {
  if (!sessaoAtiva) {
    showToast('Nenhuma sessão ativa. Crie ou selecione um chat.', 'error');
    return;
  }
  if (tipo === 'input') {
    sessaoAtiva.mensagensInput.push(texto);
  } else if (tipo === 'output') {
    sessaoAtiva.mensagensOutput.push(texto);
  }
  exibirMensagens(sessaoAtiva);
  salvarCache();
}

// ========== ENVIO DE MENSAGEM ==========
function handleSend() {
  const texto = messageInput.value.trim();
  if (texto === '') return;

  if (!sessaoAtiva) {
    showToast('Nenhuma sessão ativa. Crie ou selecione um chat.', 'error');
    return;
  }

  const activeModel = getActiveModel();
  if (!activeModel) {
    showToast('Nenhum modelo selecionado.', 'error');
    return;
  }

  const msgsInput = sessaoAtiva.mensagensInput || [];
  const msgsOutput = sessaoAtiva.mensagensOutput || [];
  const history = [];
  const total = Math.max(msgsInput.length, msgsOutput.length);
  for (let i = 0; i < total; i++) {
    if (i < msgsInput.length) {
      history.push({ role: 'user', content: msgsInput[i] });
    }
    if (i < msgsOutput.length) {
      history.push({ role: 'assistant', content: msgsOutput[i] });
    }
  }

  const maxHistory = appConfig.maxHistory || 20;
  const trimmedHistory = history.slice(-maxHistory);

  adicionarMensagem(texto, 'input');
  messageInput.value = '';

  const abortController = new AbortController();
  statusController = {
    abortController,
    timerInterval: null,
    canceled: false,
    timeoutId: null
  };
  updateStatus('thinking', 'Pensando...');
  startTimer();

  const timeoutSeconds = appConfig.timeout || 300;
  statusController.timeoutId = setTimeout(() => {
    if (!statusController) return;
    if (!statusController.canceled) {
      abortController.abort();
      updateStatus('timeout', `Tempo limite excedido (${timeoutSeconds}s)`);
      stopTimer();
      showToast(`Timeout: a requisição demorou mais de ${timeoutSeconds}s.`, 'error', 5000);
      setTimeout(() => {
        if (statusController) hideStatus();
      }, 4000);
    }
  }, timeoutSeconds * 1000);

  sendMessageToAPI(
    texto,
    activeModel,
    trimmedHistory,
    (resposta) => {
      if (statusController && statusController.timeoutId) {
        clearTimeout(statusController.timeoutId);
        statusController.timeoutId = null;
      }
      if (statusController && statusController.canceled) {
        return;
      }
      stopTimer();
      adicionarMensagem(resposta, 'output');
      updateStatus('success', 'Resposta recebida');
      setTimeout(() => {
        if (statusController) hideStatus();
      }, 2000);
    },
    abortController.signal
  );
}
