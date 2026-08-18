// js/app.js
import '../src/scss/style.scss';

import { initChat, adicionarNovaSessao, buscarSessoes } from './chat.js';
import { initModels } from './models.js';
import { loadConfig, appConfig } from './config.js';
import { showToast } from './notifications.js';
import { registerSW, setupInstallButton, isStandalone } from './pwa.js';
import { startPreview, stopPreview, openPreview, getStatus } from './server-control.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM carregado');

  // ===== PWA =====
  registerSW();
  setupInstallButton();
  if (isStandalone()) {
    console.log('📱 App rodando em modo standalone (PWA)');
    document.body.classList.add('pwa-mode');
  }

  // ===== CONFIGURAÇÕES =====
  loadConfig();

  // ===== CHAT =====
  initChat({
    scrollList: document.getElementById('scrollList'),
           messageHistory: document.getElementById('messageHistory'),
           messageInput: document.getElementById('messageInput'),
           sendButton: document.getElementById('sendButton')
  });

  // ===== MODELOS =====
  initModels({
    modelSelector: document.getElementById('modelSelector'),
             modelDisplay: document.getElementById('modelDisplay'),
             modelArrow: document.getElementById('modelArrow'),
             modelDropdown: document.getElementById('modelDropdown')
  });

  // ===== BOTÃO CHAT+ =====
  const chatPlus = document.getElementById('chatPlusButton');
  if (chatPlus) {
    chatPlus.addEventListener('click', () => {
      adicionarNovaSessao();
      showToast('Nova conversa criada!', 'error', 2000);
    });
  }

  // ===== BUSCA DE SESSÕES =====
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.trim().toLowerCase();
      buscarSessoes(term);
    });
  }

  // ===== BOTÃO CONTROLE DO SERVIDOR (🖥️) =====
  const serverCtrlBtn = document.createElement('span');
  serverCtrlBtn.className = 'gear-icon';
  serverCtrlBtn.textContent = '🖥️';
  serverCtrlBtn.title = 'Controle do Servidor (Preview)';
  serverCtrlBtn.style.cursor = 'pointer';
  serverCtrlBtn.style.fontSize = '20px';
  serverCtrlBtn.style.marginLeft = '8px';
  serverCtrlBtn.style.transition = 'transform 0.2s';

  const toolbar = document.getElementById('toolbar');
  if (toolbar) {
    toolbar.appendChild(serverCtrlBtn);
  }

  serverCtrlBtn.addEventListener('click', async () => {
    try {
      const status = await getStatus();
      const previewRunning = status.previewRunning || false;

      const choice = confirm(
        `🖥️ Controle do Servidor\n\n` +
        `Preview: ${previewRunning ? '🟢 Rodando' : '🔴 Parado'}\n\n` +
        `Clique em OK para INICIAR/PARAR o preview\n` +
        `Clique em CANCELAR para ABRIR no navegador (se estiver rodando)`
      );

      if (choice === true) {
        // Iniciar/Parar
        if (previewRunning) {
          await stopPreview();
        } else {
          await startPreview();
        }
        // Atualiza o ícone com um feedback
        serverCtrlBtn.style.transform = 'scale(1.3)';
        setTimeout(() => {
          serverCtrlBtn.style.transform = 'scale(1)';
        }, 300);
      } else if (choice === false) {
        // Abrir no navegador
        if (previewRunning) {
          openPreview();
        } else {
          showToast('Preview não está rodando. Inicie primeiro.', 'error', 3000);
        }
      }
    } catch (error) {
      console.error('Erro no controle do servidor:', error);
      showToast('Erro ao comunicar com o servidor. Verifique se o backend está rodando.', 'error', 5000);
    }
  });

  // ===== CONFIGURAÇÕES (MODAL) =====
  setupConfigModal();

  // ===== NOTIFICAÇÃO INICIAL =====
  if (!appConfig.key) {
    showToast('Bem-vindo! Configure sua chave API OpenRouter ou use o modo mock.', 'error', 6000);
  }
});

// =====================================================================
// MODAL DE CONFIGURAÇÕES
// =====================================================================
function setupConfigModal() {
  const modalOverlay = document.getElementById('configModal');
  const gearButton = document.getElementById('gearButton');
  const modalClose = document.getElementById('modalClose');
  const configCancel = document.getElementById('configCancel');
  const configSave = document.getElementById('configSave');

  const cfgTokens = document.getElementById('cfgTokens');
  const cfgKey = document.getElementById('cfgKey');
  const cfgTemp = document.getElementById('cfgTemp');
  const cfgTopP = document.getElementById('cfgTopP');
  const cfgMinK = document.getElementById('cfgMinK');
  const cfgMaxK = document.getElementById('cfgMaxK');
  const cfgMinP = document.getElementById('cfgMinP');
  const cfgMaxP = document.getElementById('cfgMaxP');
  const cfgMaxHistory = document.getElementById('cfgMaxHistory');
  const cfgTimeout = document.getElementById('cfgTimeout');
  const cfgMemoryType = document.getElementById('cfgMemoryType');
  const wobVerbo = document.getElementById('wobVerbo');
  const wobSubjetivo = document.getElementById('wobSubjetivo');
  const wobAdjetivo = document.getElementById('wobAdjetivo');
  const wobAdverbo = document.getElementById('wobAdverbo');
  const cfgTextOrder = document.getElementById('cfgTextOrder');
  const cfgRAG = document.getElementById('cfgRAG');

  const keyStatus = document.getElementById('keyStatus');
  const clearKeyBtn = document.getElementById('clearKeyBtn');

  function populateModal() {
    const key = appConfig.key || '';
    cfgKey.value = key;

    if (key) {
      keyStatus.textContent = '✅';
      keyStatus.style.color = '#4caf50';
      clearKeyBtn.style.display = 'inline-block';
    } else {
      keyStatus.textContent = '❌';
      keyStatus.style.color = '#ff4444';
      clearKeyBtn.style.display = 'none';
    }

    cfgTokens.value = appConfig.tokens;
    cfgTemp.value = appConfig.temperatura;
    cfgTopP.value = appConfig.topP;
    cfgMinK.value = appConfig.minK;
    cfgMaxK.value = appConfig.maxK;
    cfgMinP.value = appConfig.minP;
    cfgMaxP.value = appConfig.maxP;
    cfgMaxHistory.value = appConfig.maxHistory;
    if (cfgTimeout) cfgTimeout.value = appConfig.timeout || 300;
    cfgMemoryType.value = appConfig.memoryType;
    wobVerbo.checked = appConfig.wobVerbo;
    wobSubjetivo.checked = appConfig.wobSubjetivo;
    wobAdjetivo.checked = appConfig.wobAdjetivo;
    wobAdverbo.checked = appConfig.wobAdverbo;
    cfgTextOrder.value = appConfig.textOrder;
    cfgRAG.checked = appConfig.rag;
  }

  if (clearKeyBtn) {
    clearKeyBtn.addEventListener('click', () => {
      if (confirm('Remover a chave da sessão? Isso ativará o modo mock.')) {
        appConfig.key = '';
        localStorage.setItem('chat_app_config', JSON.stringify(appConfig));
        populateModal();
        showToast('Chave removida. Modo mock ativado.', 'error', 3000);
      }
    });
  }

  function openModal() {
    populateModal();
    modalOverlay.classList.add('open');
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
  }

  function saveConfigFromModal() {
    const raw = {
      tokens: parseInt(cfgTokens.value, 10),
      key: cfgKey.value.trim(),
      temperatura: parseFloat(cfgTemp.value),
      topP: parseFloat(cfgTopP.value),
      minK: parseInt(cfgMinK.value, 10),
      maxK: parseInt(cfgMaxK.value, 10),
      minP: parseFloat(cfgMinP.value),
      maxP: parseFloat(cfgMaxP.value),
      maxHistory: parseInt(cfgMaxHistory.value, 10),
      timeout: cfgTimeout ? parseInt(cfgTimeout.value, 10) : 300,
      memoryType: cfgMemoryType.value,
      wobVerbo: wobVerbo.checked,
      wobSubjetivo: wobSubjetivo.checked,
      wobAdjetivo: wobAdjetivo.checked,
      wobAdverbo: wobAdverbo.checked,
      textOrder: cfgTextOrder.value,
      rag: cfgRAG.checked
    };
    import('./config.js').then(module => {
      module.applyConfig(raw);
      closeModal();
      showToast('Configurações salvas com sucesso!', 'error', 3000);
    });
  }

  gearButton.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);
  configCancel.addEventListener('click', closeModal);
  configSave.addEventListener('click', saveConfigFromModal);

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}
