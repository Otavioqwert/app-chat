import { appConfig } from './config.js';
import { showToast } from './notifications.js';

// Usa variável de ambiente do Vite, ou fallback para o proxy local
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/chat';

export function sendMessageToAPI(userMessage, model, history, callback, signal) {
  // Se não tiver chave (no frontend), avisa e usa mock
  if (!appConfig.key || appConfig.key.trim() === '') {
    const mockResponse = `[MOCK] Você disse: "${userMessage}"`;
    showToast('Modo mock ativado – chave não configurada.', 'error', 3000);
    setTimeout(() => callback(mockResponse), 500);
    return;
  }

  const safeHistory = Array.isArray(history) ? history : [];
  const messages = [
    ...safeHistory,
    { role: 'user', content: userMessage }
  ];

  const payload = {
    model: model,
    messages: messages,
    temperature: appConfig.temperatura || 0.7,
    top_p: appConfig.topP || 1.0,
    max_tokens: appConfig.tokens || 2048,
    ...(appConfig.maxK && { top_k: appConfig.maxK }),
    ...(appConfig.minP && { min_p: appConfig.minP }),
  };

  // Não envia a chave para o proxy, o proxy usa a dele
  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  };

  if (signal) fetchOptions.signal = signal;

  fetch(API_URL, fetchOptions)
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => {
        throw new Error(err.error?.message || `Erro HTTP ${response.status}`);
      });
    }
    return response.json();
  })
  .then(data => {
    const choice = data.choices?.[0];
    if (choice?.message?.content) {
      callback(choice.message.content);
    } else {
      throw new Error('Resposta inválida da API');
    }
  })
  .catch(error => {
    if (error.name === 'AbortError') {
      showToast('Requisição cancelada.', 'error', 3000);
      callback('[CANCELADO] Requisição cancelada pelo usuário.');
    } else {
      console.error('Erro na API:', error);
      showToast('Erro na API: ' + error.message, 'error', 5000);
      callback(`[ERRO] ${error.message}`);
    }
  });
}
