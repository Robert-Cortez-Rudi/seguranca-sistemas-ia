// Servidor HTTP que entrega as requisições ao Next.
//
// A07/A04 — Por que ele existe: o Next só preenche X-Forwarded-For quando o cabeçalho
// vem vazio (base-server.js: `??=`). Sem este servidor, qualquer cliente mandaria
// "X-Forwarded-For: <ip inventado>" a cada tentativa e furaria o rate limit por IP.
// Aqui o cabeçalho é sempre reescrito com um IP em que confiamos.
import { existsSync } from "node:fs";
import { createServer } from "node:http";

// PORT, HOST e TRUST_PROXY_HOPS são lidos aqui, antes de o Next carregar o .env.
// Variável já definida no ambiente continua valendo sobre o .env.
if (existsSync(".env")) process.loadEnvFile(".env");

const dev = !process.argv.includes("--prod");
// NODE_ENV precisa estar definido antes de carregar o Next.
process.env.NODE_ENV ??= dev ? "development" : "production";
const { default: next } = await import("next");
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "localhost";
// Quantos proxies reversos confiáveis ficam na frente da aplicação (0 = acesso direto).
const trustedHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);

function clientIp(req) {
  const socketIp = req.socket.remoteAddress ?? "desconhecido";
  if (trustedHops <= 0) return socketIp;
  // Cada proxy confiável acrescenta um IP no fim; o cliente real é o que está
  // `trustedHops` posições antes do fim. Entradas mais à esquerda são do cliente e não valem.
  const chain = String(req.headers["x-forwarded-for"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return chain[chain.length - trustedHops] ?? socketIp;
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

createServer((req, res) => {
  req.headers["x-forwarded-for"] = clientIp(req);
  delete req.headers["x-real-ip"];
  handle(req, res);
}).listen(port, hostname, () => {
  console.log(`> SecureShop em http://${hostname}:${port} (${dev ? "dev" : "produção"})`);
});
