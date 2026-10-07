/**
 * Simulador de Chatwoot, Evolution, Telegram e Melhor Envio
 * Bancada de Homologação da Letícia (Kabra Bruto)
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// Tenta carregar variaveis do ambiente local se disponivel
const localEnvPath = "D:\\Iteraflow\\_dados_locais\\supabase_homolog.env";
if (fs.existsSync(localEnvPath)) {
  const content = fs.readFileSync(localEnvPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const k = trimmed.substring(0, idx).trim();
      const v = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[k]) {
        process.env[k] = v;
      }
    }
  }
}

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_HOMOLOG_URL;
const SUPABASE_KEY = process.env.SUPABASE_HOMOLOG_SERVICE_ROLE_KEY;
const REGISTRO_TOKEN = process.env.REGISTRO_TOKEN || "iteraflow-homolog-token";

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Armazenamento em memoria
const memoriaConversas = new Map(); // conversaId -> Array de mensagens
const memoriaLabels = new Map();     // conversaId -> Array de strings
const memoriaEventos = [];          // Todos os eventos recebidos

// Garante diretorio de logs locais
const LOGS_DIR = path.join(__dirname, "logs");
if (!fs.existsSync(LOGS_DIR)) {
  try { fs.mkdirSync(LOGS_DIR, { recursive: true }); } catch (e) {}
}
const LOG_FILE = path.join(LOGS_DIR, "simulador_saidas.jsonl");

// Gravador de saidas (em memoria, arquivo JSONL e Supabase homolog)
async function registrarSaida(servico, endpoint, metodo, reqData, resposta, conversaId = null) {
  const registro = {
    timestamp: new Date().toISOString(),
    conversa_id: conversaId ? String(conversaId) : null,
    servico,
    endpoint,
    metodo,
    payload: reqData,
    resposta
  };

  memoriaEventos.push(registro);

  // 1. Gravar em arquivo JSONL local
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(registro) + "\n", "utf-8");
  } catch (e) {}

  // 2. Gravar no Supabase homolog se configurado
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/homolog_saidas`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          conversa_id: conversaId ? String(conversaId) : null,
          servico,
          endpoint,
          metodo,
          payload: reqData,
          resposta
        })
      });
      if (!res.ok) {
        console.error(`Erro ao gravar homolog_saidas: HTTP ${res.status}`);
      }
    } catch (e) {
      console.error(`Excecao ao gravar homolog_saidas: ${e.message}`);
    }
  }
}

// ==========================================
// 1. HEALTHCHECK
// ==========================================
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "simulador-homologacao",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 2. CHATWOOT MOCK ROUTES
// ==========================================

// GET Historico de Mensagens
app.get("/api/v1/accounts/:accountId/conversations/:conversationId/messages", async (req, res) => {
  const { conversationId } = req.params;
  const msgs = memoriaConversas.get(String(conversationId)) || [];
  
  const responseData = {
    meta: {
      count: msgs.length,
      current_page: 1
    },
    payload: msgs
  };

  await registrarSaida("chatwoot", req.originalUrl, "GET", req.query, responseData, conversationId);
  res.json(responseData);
});

// POST Nova Mensagem / Nota Interna / Anexo
app.post("/api/v1/accounts/:accountId/conversations/:conversationId/messages", async (req, res) => {
  const { conversationId } = req.params;
  const body = req.body || {};
  const isPrivate = body.private === true || body.private === "true";

  const msgId = 900000 + (Date.now() % 100000);
  const novaMsg = {
    id: msgId,
    content: body.content || "",
    message_type: isPrivate ? 2 : 1, // 1 = outgoing da loja, 2 = private note
    content_type: body.content_type || "text",
    private: isPrivate,
    created_at: Math.floor(Date.now() / 1000),
    conversation_id: Number(conversationId),
    sender: {
      id: 99,
      name: "Letícia (IA Homolog)",
      type: "user"
    },
    attachments: body.attachments || []
  };

  if (!memoriaConversas.has(String(conversationId))) {
    memoriaConversas.set(String(conversationId), []);
  }
  memoriaConversas.get(String(conversationId)).push(novaMsg);

  await registrarSaida("chatwoot", req.originalUrl, "POST", body, novaMsg, conversationId);
  res.status(200).json(novaMsg);
});

// GET Labels da Conversa
app.get("/api/v1/accounts/:accountId/conversations/:conversationId/labels", async (req, res) => {
  const { conversationId } = req.params;
  const labels = memoriaLabels.get(String(conversationId)) || [];
  const responseData = { payload: labels };
  await registrarSaida("chatwoot", req.originalUrl, "GET", req.query, responseData, conversationId);
  res.json(responseData);
});

// POST Atualizar Labels da Conversa
app.post("/api/v1/accounts/:accountId/conversations/:conversationId/labels", async (req, res) => {
  const { conversationId } = req.params;
  const labels = req.body && req.body.labels ? req.body.labels : [];
  memoriaLabels.set(String(conversationId), labels);
  const responseData = { payload: labels };
  await registrarSaida("chatwoot", req.originalUrl, "POST", req.body, responseData, conversationId);
  res.json(responseData);
});

// POST Atribuir Conversa
app.post("/api/v1/accounts/:accountId/conversations/:conversationId/assignments", async (req, res) => {
  const { conversationId } = req.params;
  const responseData = {
    id: Number(conversationId),
    assignee: req.body && req.body.assignee_id ? { id: req.body.assignee_id, name: "Atendente Mock" } : null
  };
  await registrarSaida("chatwoot", req.originalUrl, "POST", req.body, responseData, conversationId);
  res.json(responseData);
});

// GET Detalhes da Conversa
app.get("/api/v1/accounts/:accountId/conversations/:conversationId", async (req, res) => {
  const { conversationId } = req.params;
  const labels = memoriaLabels.get(String(conversationId)) || [];
  const responseData = {
    id: Number(conversationId),
    status: "open",
    labels: labels,
    custom_attributes: {}
  };
  await registrarSaida("chatwoot", req.originalUrl, "GET", req.query, responseData, conversationId);
  res.json(responseData);
});

// ==========================================
// 3. EVOLUTION API MOCK
// ==========================================
app.post("/message/sendText/:instance?", async (req, res) => {
  const responseData = {
    status: "SUCCESS",
    message: {
      key: {
        id: "EVO_MOCK_" + Date.now(),
        remoteJid: req.body && req.body.number ? `${req.body.number}@s.whatsapp.net` : "grupo@g.us",
        fromMe: true
      },
      message: {
        conversation: (req.body && req.body.text) || ""
      }
    }
  };
  await registrarSaida("evolution", req.originalUrl, "POST", req.body, responseData);
  res.status(200).json(responseData);
});

// ==========================================
// 4. TELEGRAM BOT MOCK
// ==========================================
app.all(["/bot:token/sendMessage", "/sendMessage"], async (req, res) => {
  const responseData = {
    ok: true,
    result: {
      message_id: Math.floor(Math.random() * 100000),
      date: Math.floor(Date.now() / 1000),
      chat: {
        id: (req.body && req.body.chat_id) || 12345678,
        type: "private"
      },
      text: (req.body && req.body.text) || ""
    }
  };
  await registrarSaida("telegram", req.originalUrl, "POST", req.body, responseData);
  res.status(200).json(responseData);
});

app.all(["/bot:token/getMe", "/getMe"], (req, res) => {
  res.json({
    ok: true,
    result: {
      id: 99999999,
      is_bot: true,
      first_name: "MockTelegramBot",
      username: "mock_telegram_bot"
    }
  });
});

// ==========================================
// 5. MELHOR ENVIO MOCK
// ==========================================
app.post("/api/v2/me/shipment/calculate", async (req, res) => {
  const body = req.body || {};
  const cep = (body.to && body.to.postal_code) ? String(body.to.postal_code).replace(/\D/g, "") : "01001000";

  // Preço e prazo determinísticos baseados na região do CEP
  const primeiroDigito = cep[0] || "7";
  let precoPac = "28.50";
  let prazoPac = 6;
  let precoSedex = "52.30";
  let prazoSedex = 2;

  if (primeiroDigito === "7") { // Centro-Oeste / Goias
    precoPac = "19.90"; prazoPac = 3;
    precoSedex = "32.50"; prazoSedex = 1;
  } else if (primeiroDigito === "0" || primeiroDigito === "1") { // SP
    precoPac = "27.80"; prazoPac = 5;
    precoSedex = "48.20"; prazoSedex = 2;
  } else if (primeiroDigito === "2" || primeiroDigito === "3") { // RJ/MG/ES
    precoPac = "29.90"; prazoPac = 6;
    precoSedex = "54.00"; prazoSedex = 2;
  } else if (primeiroDigito >= "8") { // Sul
    precoPac = "34.20"; prazoPac = 7;
    precoSedex = "62.10"; prazoSedex = 3;
  } else { // Norte / Nordeste
    precoPac = "39.50"; prazoPac = 9;
    precoSedex = "76.40"; prazoSedex = 4;
  }

  const responseData = [
    {
      id: 1,
      name: "PAC",
      price: precoPac,
      custom_price: precoPac,
      discount: "0.00",
      currency: "R$",
      delivery_time: prazoPac,
      delivery_range: { min: prazoPac - 1, max: prazoPac },
      custom_delivery_time: prazoPac,
      company: { id: 1, name: "Correios", picture: "https://sandbox.melhorenvio.com.br/images/shipping-companies/correios.png" }
    },
    {
      id: 2,
      name: "SEDEX",
      price: precoSedex,
      custom_price: precoSedex,
      discount: "0.00",
      currency: "R$",
      delivery_time: prazoSedex,
      delivery_range: { min: Math.max(1, prazoSedex - 1), max: prazoSedex },
      custom_delivery_time: prazoSedex,
      company: { id: 1, name: "Correios", picture: "https://sandbox.melhorenvio.com.br/images/shipping-companies/correios.png" }
    }
  ];

  await registrarSaida("melhor_envio", req.originalUrl, "POST", body, responseData);
  res.status(200).json(responseData);
});

// ==========================================
// 6. PAINEL DE REGISTRO E SEMENTE
// ==========================================

// Semente: injeta historico de mensagens para uma conversa antes de rodar o teste
app.post("/semente/historico", (req, res) => {
  const { conversa_id, mensagens, labels } = req.body || {};
  if (!conversa_id) {
    return res.status(400).json({ error: "conversa_id e obrigatorio" });
  }

  if (Array.isArray(mensagens)) {
    memoriaConversas.set(String(conversa_id), mensagens);
  }
  if (Array.isArray(labels)) {
    memoriaLabels.set(String(conversa_id), labels);
  }

  res.json({
    status: "ok",
    conversa_id: String(conversa_id),
    total_mensagens: (memoriaConversas.get(String(conversa_id)) || []).length,
    labels: memoriaLabels.get(String(conversa_id)) || []
  });
});

// Consulta de registros
app.get("/registro", (req, res) => {
  const token = req.headers["authorization"] ? req.headers["authorization"].replace(/^Bearer\s+/i, "") : req.query.token;
  if (token !== REGISTRO_TOKEN) {
    return res.status(401).json({ error: "Nao autorizado" });
  }

  const { conversa_id, servico } = req.query;
  let filtrados = memoriaEventos;
  if (conversa_id) {
    filtrados = filtrados.filter(e => e.conversa_id === String(conversa_id));
  }
  if (servico) {
    filtrados = filtrados.filter(e => e.servico === servico);
  }
  res.json({ total: filtrados.length, eventos: filtrados });
});

// Limpeza de memoria de registros
app.delete("/registro", (req, res) => {
  const token = req.headers["authorization"] ? req.headers["authorization"].replace(/^Bearer\s+/i, "") : req.query.token;
  if (token !== REGISTRO_TOKEN) {
    return res.status(401).json({ error: "Nao autorizado" });
  }

  memoriaEventos.length = 0;
  memoriaConversas.clear();
  memoriaLabels.clear();
  res.json({ status: "ok", message: "Registros limpos com sucesso" });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Simulador de homologacao rodando na porta ${PORT}`);
  console.log(`- Supabase URL: ${SUPABASE_URL || 'Nao configurado'}`);
});
