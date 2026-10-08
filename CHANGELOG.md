# Alterações do simulador

## 1.1.0 — 07/10/2026

- Fotos multipart recebidas com tamanho e SHA-256 dos bytes; mensagens vazias deixam de receber confirmação de entrega.
- Semeadura de cotações reais por CEP. No replay com fixtures, CEP sem cotação retorna erro, sem preço sintético.
- Cotações capturadas ficam associadas à conversa semeada, permitindo conferência pelo rodador.
- O painel de registros deixa de aceitar o token padrão conhecido ou token na URL. Configure `REGISTRO_TOKEN` no ambiente caso precise desse painel; sem configuração, o token é aleatório e não é exposto.
- Testes locais usam servidor temporário e não carregam credenciais nem persistem no Supabase.
- Build usa `npm ci` com lockfile. Suíte: 15 contratos HTTP e prova de foto multipart.

O serviço continua destinado à homologação. Validação local não comprova a versão publicada na VPS.
