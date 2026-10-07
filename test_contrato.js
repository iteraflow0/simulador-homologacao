/**
 * Testes de contrato do Simulador de Homologação
 */

const http = require("http");

const BASE = "http://localhost:3000";

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("Iniciando testes de contrato do Simulador...");
  let pass = 0;
  let total = 0;

  function assert(condition, desc) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      pass++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      process.exitCode = 1;
    }
  }

  // 1. Health
  const h = await request("GET", "/health");
  assert(h.status === 200 && h.body.status === "ok", "GET /health responde status 200 ok");

  // 2. Chatwoot - Semeadura e leitura de mensagens
  const semente = await request("POST", "/semente/historico", {
    conversa_id: "101",
    mensagens: [
      { id: 1, content: "Oi, quero saber o valor do tênis", message_type: 0, created_at: 1728280000 }
    ],
    labels: ["cliente_novo"]
  });
  assert(semente.status === 200 && semente.body.total_mensagens === 1, "POST /semente/historico popula histórico");

  const msgs = await request("GET", "/api/v1/accounts/1/conversations/101/messages");
  assert(msgs.status === 200 && Array.isArray(msgs.body.payload) && msgs.body.payload.length === 1, "GET messages retorna histórico semeado");

  // 3. Chatwoot - Enviar mensagem da loja
  const novaMsg = await request("POST", "/api/v1/accounts/1/conversations/101/messages", {
    content: "O tênis custa R$ 250,00",
    private: false
  });
  assert(novaMsg.status === 200 && novaMsg.body.message_type === 1 && novaMsg.body.content.includes("250"), "POST message (texto loja) retorna mensagem de saída");

  // 4. Chatwoot - Postar nota privada
  const nota = await request("POST", "/api/v1/accounts/1/conversations/101/messages", {
    content: "Transferência para humano solicitada",
    private: true
  });
  assert(nota.status === 200 && nota.body.message_type === 2 && nota.body.private === true, "POST message (nota privada) retorna nota com private=true");

  // 5. Chatwoot - Labels
  const labels = await request("GET", "/api/v1/accounts/1/conversations/101/labels");
  assert(labels.status === 200 && labels.body.payload.includes("cliente_novo"), "GET labels retorna etiquetas atuais");

  const updateLabels = await request("POST", "/api/v1/accounts/1/conversations/101/labels", {
    labels: ["cliente_novo", "transferir_humano"]
  });
  assert(updateLabels.status === 200 && updateLabels.body.payload.includes("transferir_humano"), "POST labels atualiza etiquetas");

  // 6. Evolution API
  const evo = await request("POST", "/message/sendText/Alertas", {
    number: "556299999999",
    text: "Alerta de transferência"
  });
  assert(evo.status === 200 && evo.body.status === "SUCCESS", "POST Evolution sendText retorna SUCCESS");

  // 7. Telegram Bot
  const tg = await request("POST", "/bot12345/sendMessage", {
    chat_id: 1234,
    text: "Alerta telegram"
  });
  assert(tg.status === 200 && tg.body.ok === true && tg.body.result.message_id > 0, "POST Telegram sendMessage retorna ok=true com message_id");

  // 8. Melhor Envio
  const frete = await request("POST", "/api/v2/me/shipment/calculate", {
    to: { postal_code: "74083300" }
  });
  assert(frete.status === 200 && Array.isArray(frete.body) && frete.body.length >= 2, "POST Melhor Envio calculate retorna opções de frete (PAC/SEDEX)");
  assert(frete.body.some(o => o.name === "PAC") && frete.body.some(o => o.name === "SEDEX"), "Melhor Envio contém PAC e SEDEX");

  // 9. Painel de registro
  const reg = await request("GET", "/registro?conversa_id=101", null, {
    Authorization: "Bearer iteraflow-homolog-token"
  });
  assert(reg.status === 200 && reg.body.total >= 3, "GET /registro retorna todas as saídas registradas para a conversa");

  console.log(`\n==========================================`);
  console.log(`RESULTADO DOS TESTES DE CONTRATO:`);
  console.log(`Aprovados: ${pass}/${total}`);
  console.log(`==========================================`);

  if (pass === total) {
    console.log("Contratos do Simulador 100% VALIDADOS!");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Inicia servidor temporario se chamado diretamente
if (require.main === module) {
  const child = require("child_process").spawn("node", ["server.js"], {
    cwd: __dirname,
    stdio: "inherit"
  });

  setTimeout(async () => {
    try {
      await runTests();
    } finally {
      child.kill();
    }
  }, 1000);
}
