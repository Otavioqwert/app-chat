// js/server-control.js
import { showToast } from './notifications.js';

// Configurações
const STORAGE_KEY = 'chat_server_token';
const CONFIG_ENDPOINT = '/api/config';

// Estado local
let serverRunning = false;
let previewRunning = false;

/**
 * Obtém o token de assinatura (duas camadas)
 * 1ª camada: localStorage
 * 2ª camada: arquivo de configuração no servidor (via fetch)
 */
export async function getAuthToken() {
    // 1. Tenta do localStorage
    let token = localStorage.getItem(STORAGE_KEY);
    if (token) return token;

    // 2. Tenta do servidor (arquivo config.json)
    try {
        const response = await fetch(CONFIG_ENDPOINT);
        if (response.ok) {
            const config = await response.json();
            if (config.token) {
                // Salva no localStorage para cache
                localStorage.setItem(STORAGE_KEY, config.token);
                return config.token;
            }
        }
    } catch (e) {
        console.warn('Erro ao buscar token do servidor:', e);
    }
    return null;
}

/**
 * Define um novo token
 */
export function setAuthToken(token) {
    localStorage.setItem(STORAGE_KEY, token);
}

/**
 * Remove o token
 */
export function clearAuthToken() {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Faz requisição autenticada para uma rota
 */
async function fetchWithAuth(endpoint, options = {}) {
    const token = await getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };
    const response = await fetch(endpoint, {
        ...options,
        headers
    });
    return response;
}

/**
 * Inicia o servidor preview
 */
export async function startPreview() {
    const response = await fetchWithAuth('/api/start-preview', {
        method: 'POST',
        body: JSON.stringify({ action: 'start' })
    });
    const data = await response.json();
    if (response.ok) {
        previewRunning = true;
        showToast(data.message || 'Preview iniciado!', 'error', 3000);
    } else {
        showToast('Erro: ' + (data.error || 'Falha ao iniciar preview'), 'error', 5000);
    }
    return data;
}

/**
 * Para o servidor preview
 */
export async function stopPreview() {
    const response = await fetchWithAuth('/api/stop-preview', {
        method: 'POST',
        body: JSON.stringify({ action: 'stop' })
    });
    const data = await response.json();
    if (response.ok) {
        previewRunning = false;
        showToast(data.message || 'Preview parado.', 'error', 3000);
    } else {
        showToast('Erro: ' + (data.error || 'Falha ao parar preview'), 'error', 5000);
    }
    return data;
}

/**
 * Obtém status atual
 */
export async function getStatus() {
    try {
        const response = await fetchWithAuth('/api/status');
        if (response.ok) {
            const data = await response.json();
            serverRunning = data.serverRunning;
            previewRunning = data.previewRunning;
            return data;
        }
    } catch (e) {
        console.warn('Erro ao obter status:', e);
    }
    return { serverRunning: false, previewRunning: false };
}

/**
 * Abre o preview no navegador
 */
export function openPreview() {
    window.open('http://localhost:4173', '_blank');
}
