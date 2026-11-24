// server/index.js
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// Carrega variáveis de ambiente do .env (na mesma pasta)
dotenv.config();

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  SMTP_TO,
} = process.env;

// Verificação mínima das variáveis necessárias
if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM || !SMTP_TO) {
  console.error('❌ Variáveis de ambiente SMTP incompletas. Verifique o arquivo .env.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Permitir chamadas do front‑end (ajuste a origem se precisar)
app.use(cors({ origin: '*'}));
app.use(express.json());

// Configura o transportador do Nodemailer
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === 'true', // true para 465, false para 587 etc.
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// Testa a conexão ao iniciar
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Erro de conexão SMTP:', error);
  } else {
    console.log('✅ Conexão SMTP OK');
  }
});

// Endpoint que recebe o pedido do formulário e envia e‑mail
app.post('/api/order', async (req, res) => {
  const order = req.body;

  // Monta o corpo da mensagem (texto simples)
  const mailBody = [
    '*Pedido de transporte — DANALB Angola*',
    '',
    `*Nome:* ${order.nome || ''}`,
    `*Telefone:* ${order.telefone || ''}`,
    `*E‑mail:* ${order.email || ''}`,
    order.empresa ? `*Empresa / Instituição:* ${order.empresa}` : '',
    `*Origem:* ${order.origem || ''}`,
    `*Destino:* ${order.destino || ''}`,
    `*Data:* ${order.data || ''}`,
    `*Hora:* ${order.hora || ''}`,
    `*Passageiros:* ${order.passageiros || ''}`,
    order.mensagem ? `*Notas:* ${order.mensagem}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const mailOptions = {
    from: SMTP_FROM,
    to: SMTP_TO,
    subject: `🚖 Novo pedido – ${order.nome || 'Cliente'} – ${order.data || ''}`,
    text: mailBody,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ E‑mail enviado para', SMTP_TO);
    res.json({ success: true, message: 'Pedido enviado por e‑mail.' });
  } catch (err) {
    console.error('❌ Falha ao enviar e‑mail:', err);
    res.status(500).json({ success: false, error: 'Falha ao enviar e‑mail.' });
  }
});

// Health‑check simples
app.get('/health', (_req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`🚀 Servidor SMTP rodando em http://localhost:${PORT}`);
});
