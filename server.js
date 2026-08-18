// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARES =====
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ===== CONFIGURAÇÃO DE TOKEN (2ª camada) =====
const CONFIG_FILE = path.join(__dirname, 'server-config.json');
let config = { token: '' };

// Carrega o token do arquivo, se existir
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = JSON.parse(raw);
  } catch (e) {
    console.warn('Erro ao ler server-config.json:', e);
  }
}

// Middleware para verificar token (para rotas protegidas)
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : '';
  const bodyToken = req.body?.token || '';
  const finalToken = token || bodyToken;

  // Se não houver token configurado, permite qualquer um
  if (!config.token) {
    return next();
  }

  if (finalToken !== config.token) {
    return res.status(403).json({ error: 'Token inválido' });
  }
  next();
}

// ===== ROTAS PÚBLICAS =====

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fornece o token para o frontend (1ª camada)
app.get('/api/config', (req, res) => {
  res.json({ token: config.token || '' });
});

// Atualiza o token (protegido)
app.post('/api/config', verifyToken, (req, res) => {
  const { token } = req.body;
  if (token === undefined) {
    return res.status(400).json({ error: 'Token não fornecido' });
  }
  config.token = token;
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ token }, null, 2));
    res.json({ success: true, message: 'Token atualizado com sucesso' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao salvar token' });
  }
});

// ===== ROTA PRINCIPAL (OpenRouter) =====
app.post('/api/chat', async (req, res) => {
  try {
    const { model, messages, temperature = 0.7, top_p = 1.0, max_tokens = 2048 } = req.body;

    if (!model) {
      return res.status(400).json({ error: 'Modelo não especificado' });
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Mensagens inválidas' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY não configurada no .env');
      return res.status(500).json({ error: 'Servidor não configurado corretamente' });
    }

    const payload = {
      model,
      messages,
      temperature,
      top_p,
      max_tokens,
      ...(req.body.top_k && { top_k: req.body.top_k }),
         ...(req.body.min_p && { min_p: req.body.min_p }),
         ...(req.body.frequency_penalty && { frequency_penalty: req.body.frequency_penalty }),
         ...(req.body.presence_penalty && { presence_penalty: req.body.presence_penalty })
    };

    console.log(`📤 Enviando requisição para OpenRouter com modelo: ${model}`);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
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
      console.error('❌ Erro na OpenRouter:', errorData);
      return res.status(response.status).json({
        error: errorData.error?.message || errorData.error || `Erro HTTP ${response.status}`
      });
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('❌ Erro no servidor:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// ===== CONTROLE DO PREVIEW =====
let previewProcess = null;

// Inicia o preview (npm run preview)
app.post('/api/start-preview', verifyToken, (req, res) => {
  if (previewProcess) {
    return res.json({ message: 'Preview já está rodando' });
  }

  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  previewProcess = spawn(npmCmd, ['run', 'preview'], {
    cwd: __dirname,
    stdio: 'pipe',
    shell: true,
    detached: true
  });

  previewProcess.stdout.on('data', (data) => {
    console.log(`[Preview] ${data}`);
  });
  previewProcess.stderr.on('data', (data) => {
    console.error(`[Preview ERR] ${data}`);
  });

  previewProcess.on('close', (code) => {
    console.log(`Preview finalizado com código ${code}`);
    previewProcess = null;
  });

  previewProcess.unref();

  res.json({ message: 'Preview iniciado com sucesso! Acesse http://localhost:4173' });
});

// Para o preview
app.post('/api/stop-preview', verifyToken, (req, res) => {
  if (!previewProcess) {
    return res.json({ message: 'Preview não está rodando' });
  }
  previewProcess.kill('SIGTERM');
  previewProcess = null;
  res.json({ message: 'Preview parado' });
});

// Status do preview
app.get('/api/status', verifyToken, (req, res) => {
  res.json({
    serverRunning: true,
    previewRunning: !!previewProcess
  });
});

// ===== FALLBACK 404 =====
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ===== INICIA O SERVIDOR =====
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`🔑 Token: ${config.token ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`🌐 Frontend permitido: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`📦 Preview: use POST /api/start-preview para iniciar`);
});
