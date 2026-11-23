const nodemailer = require("nodemailer");

const RECIPIENT = "geral@danalbangola.com";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(res, status, body) {
  return res.status(status).json(body);
}

function field(value, limit) {
  if (typeof value !== "string") return "";
  const cleaned = value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  return cleaned.length <= limit ? cleaned : null;
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function todayInLuanda() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Luanda",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${date.year}-${date.month}-${date.day}`;
}

function matchesRequestOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;

  const requestHost = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim()
    .toLowerCase();

  try {
    return new URL(origin).host.toLowerCase() === requestHost;
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { message: "Método não permitido." });
  }

  if (!matchesRequestOrigin(req)) {
    return json(res, 403, { message: "Pedido não autorizado." });
  }

  const contentType = String(req.headers["content-type"] || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return json(res, 415, { message: "Formato de pedido não suportado." });
  }

  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json(res, 400, { message: "Verifique os dados e tente novamente." });
  }

  if (Buffer.byteLength(JSON.stringify(body), "utf8") > 12000) {
    return json(res, 413, { message: "O pedido é demasiado grande." });
  }

  if (field(body.website, 200)) {
    return json(res, 400, { message: "Verifique os dados e tente novamente." });
  }

  const request = {
    name: field(body.nome, 100),
    phone: field(body.telefone, 25),
    email: field(body.email, 254),
    company: field(body.empresa, 120),
    origin: field(body.origem, 200),
    destination: field(body.destino, 200),
    date: field(body.data, 10),
    time: field(body.hora, 5),
    passengers: Number(body.passageiros),
    message: field(body.mensagem, 1000),
  };

  if (Object.values(request).some((value) => value === null)) {
    return json(res, 400, { message: "Um ou mais campos excedem o limite permitido." });
  }

  const phoneDigits = request.phone.replace(/\D/g, "");
  const validPhone = /^[+\d\s().-]+$/.test(request.phone) && phoneDigits.length >= 9 && phoneDigits.length <= 15;
  const validEmail = !request.email || EMAIL_PATTERN.test(request.email);
  const validPassengers = Number.isInteger(request.passengers) && request.passengers >= 1 && request.passengers <= 4;
  const validDate = isIsoDate(request.date) && request.date >= todayInLuanda();
  const validTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(request.time);

  if (
    !request.name ||
    !validPhone ||
    !validEmail ||
    !request.origin ||
    !request.destination ||
    !validDate ||
    !validTime ||
    !validPassengers ||
    body.consentimento !== "sim"
  ) {
    return json(res, 400, { message: "Verifique os dados obrigatórios e tente novamente." });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM;

  if (
    !smtpHost ||
    ![465, 587].includes(smtpPort) ||
    !smtpUser ||
    !smtpPassword ||
    !smtpFrom ||
    !EMAIL_PATTERN.test(smtpFrom)
  ) {
    return json(res, 503, { message: "O serviço de e-mail está temporariamente indisponível." });
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: smtpPort === 587,
    auth: { user: smtpUser, pass: smtpPassword },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 20000,
    tls: { minVersion: "TLSv1.2" },
  });

  const dateParts = request.date.split("-");
  const message = [
    "Novo pedido de transporte — DANALB Angola",
    "",
    `Nome: ${request.name}`,
    `Telefone / WhatsApp: ${request.phone}`,
    `E-mail: ${request.email || "Não indicado"}`,
    `Empresa: ${request.company || "Não indicada"}`,
    `Local de partida: ${request.origin}`,
    `Destino: ${request.destination}`,
    `Data: ${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`,
    `Hora: ${request.time}`,
    `Número de passageiros: ${request.passengers}`,
    `Mensagem adicional: ${request.message || "Nenhuma"}`,
  ].join("\n");

  try {
    await transporter.sendMail({
      from: { name: "DANALB Angola", address: smtpFrom },
      to: RECIPIENT,
      replyTo: request.email || undefined,
      subject: "Novo pedido de transporte — DANALB Angola",
      text: message,
    });
    return json(res, 200, { message: "Pedido enviado por e-mail. A nossa equipa confirmará a disponibilidade." });
  } catch {
    return json(res, 502, { message: "Não foi possível enviar o pedido por e-mail. Tente novamente mais tarde." });
  } finally {
    transporter.close();
  }
};
