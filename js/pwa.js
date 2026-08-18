// js/pwa.js
import { showToast } from './notifications.js';

// Estado da instalação
let deferredPrompt = null;
let installButton = null;

/**
 * Registra o Service Worker
 */
export function registerSW() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('[PWA] Service Worker registrado com sucesso:', registration);

                // Verifica atualizações a cada 60 segundos
                setInterval(() => {
                    registration.update();
                }, 60000);

                // Detecta nova versão
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Nova versão disponível
                            showToast('🔄 Nova versão disponível! Clique para atualizar.', 'error', 10000);
                            // Cria botão de atualização
                            showUpdateNotification();
                        }
                    });
                });
            })
            .catch((error) => {
                console.error('[PWA] Erro ao registrar SW:', error);
            });
        });
    } else {
        console.warn('[PWA] Service Worker não suportado neste navegador.');
    }
}

/**
 * Exibe notificação de atualização disponível
 */
function showUpdateNotification() {
    // Cria um toast especial com botão
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast update-toast';
    toast.style.borderLeftColor = '#ffaa44';
    toast.innerHTML = `
    <span class="toast-icon">🔄</span>
    <span class="toast-msg">Nova versão disponível!</span>
    <button id="updateAppBtn" style="background:#1a4a7a;border:1px solid #4a8af4;color:#fff;padding:4px 12px;border-radius:4px;cursor:pointer;">Atualizar</button>
    <button class="toast-close">&times;</button>
    `;
    toastContainer.appendChild(toast);

    // Evento do botão atualizar
    toast.querySelector('#updateAppBtn').addEventListener('click', () => {
        window.location.reload();
    });

    // Fechar
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });

    // Auto-remover após 30s
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 30000);
}

/**
 * Configura o botão de instalação (quando disponível)
 * @param {string} buttonId - ID do botão de instalação
 */
export function setupInstallButton(buttonId = 'installAppBtn') {
    installButton = document.getElementById(buttonId);
    if (!installButton) {
        // Cria o botão se não existir (na barra de ferramentas)
        const toolbar = document.getElementById('toolbar');
        if (toolbar) {
            const btn = document.createElement('span');
            btn.id = buttonId;
            btn.className = 'gear-icon';
            btn.textContent = '📲';
            btn.title = 'Instalar App';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '20px';
            btn.style.display = 'none';
            toolbar.appendChild(btn);
            installButton = btn;
        }
    }

    if (!installButton) return;

    // Evento de instalação
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installButton.style.display = 'inline-block';
        console.log('[PWA] App disponível para instalação');
    });

    installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;
            console.log(`[PWA] Usuário ${result.outcome} a instalação`);
            deferredPrompt = null;
            installButton.style.display = 'none';
        }
    });

    // Evento de instalação concluída
    window.addEventListener('appinstalled', () => {
        console.log('[PWA] App instalado com sucesso!');
        installButton.style.display = 'none';
        showToast('✅ App instalado com sucesso!', 'error', 3000);
    });
}

/**
 * Detecta se o app está rodando no modo standalone (PWA)
 */
export function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true;
}

/**
 * Obtém a versão do app do manifest
 */
export function getAppVersion() {
    return CACHE_VERSION || '1.0.0';
}
