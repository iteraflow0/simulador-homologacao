const assert = require('node:assert/strict');
const crypto = require('node:crypto');
process.env.SIMULADOR_LOCAL_ENV = '0';
delete process.env.SUPABASE_HOMOLOG_URL;
delete process.env.SUPABASE_HOMOLOG_SERVICE_ROLE_KEY;
const app = require('./server');
const server = app.listen(0, '127.0.0.1', async () => {
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZsAAAAASUVORK5CYII=', 'base64');
    const data = new FormData();
    data.append('private', 'false');
    data.append('attachments[]', new Blob([bytes], { type: 'image/png' }), 'modelo.png');
    const sent = await fetch(base + '/api/v1/accounts/1/conversations/909/messages', { method: 'POST', body: data });
    assert.equal(sent.status, 200);
    const result = await sent.json();
    assert.equal(result.private, false);
    assert.equal(result.attachments.length, 1);
    assert.equal(result.attachments[0].file_size, bytes.length);
    assert.equal(result.attachments[0].sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
    const history = await (await fetch(base + '/api/v1/accounts/1/conversations/909/messages')).json();
    assert.equal(history.payload[0].attachments[0].sha256, result.attachments[0].sha256);
    const empty = await fetch(base + '/api/v1/accounts/1/conversations/909/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(empty.status, 400);
    const fake = await fetch(base + '/api/v1/accounts/1/conversations/909/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attachments: [{url:'foto.jpg'}] }) });
    assert.equal(fake.status, 400);
    console.log('Foto multipart recebida com hash/bytes confirmados; mensagens vazias e anexos fictícios bloqueados.');
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { server.close(); }
});
