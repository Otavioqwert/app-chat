// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração para __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Em produção, defina a URL do Netlify
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ===== ROTAS DA API (DEVEM VIR ANTES DO FALLBACK) =====

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rota principal do chat
app.post('/api/chat', async (req, res) => {
  try {
    const { model, messages, temperature = 0.7, top_p = 1.0, max_tokens = 2048 } = req.body;

    // Validações
    if (!model) {
      return res.status(400).json({ error: 'Modelo não especificado' });
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Mensagens inválidas' });
    }

    // Chave da OpenRouter (do .env ou variável de ambiente)
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY não configurada');
      return res.status(500).json({ error: 'Servidor não configurado corretamente' });
    }

    // Payload para OpenRouter
    const payload = {
      model,
      messages,
      temperature,
      top_p,
      max_tokens,
    };

    // Parâmetros opcionais
    if (req.body.top_k) payload.top_k = req.body.top_k;
    if (req.body.min_p) payload.min_p = req.body.min_p;
    if (req.body.frequency_penalty) payload.frequency_penalty = req.body.frequency_penalty;
    if (req.body.presence_penalty) payload.presence_penalty = req.body.presence_penalty;

    console.log(`[API] Enviando requisição para OpenRouter com modelo: ${model}`);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://chat-app-preview.netlify.app',
        'X-Title': 'Chat App - Pseudocódigo'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `Erro HTTP ${response.status}` };
      }
      console.error('Erro na OpenRouter:', errorData);
      return res.status(response.status).json({
        error: errorData.error?.message || errorData.error || `Erro HTTP ${response.status}`
      });
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Erro no servidor:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// ===== SERVE ARQUIVOS ESTÁTICOS (FRONTEND) =====
// Serve a pasta dist (frontend build)
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback: qualquer rota não reconhecida serve o index.html (para SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ===== INICIA O SERVIDOR =====
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`🔑 Chave API: ${process.env.OPENROUTER_API_KEY ? '✅ Configurada' : '❌ Não configurada'}`);
  console.log(`🌐 Frontend permitido: ${process.env.FRONTEND_URL || '*'}`);
});
