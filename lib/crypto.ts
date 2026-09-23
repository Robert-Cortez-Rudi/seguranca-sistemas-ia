// A04 — Criptografia de dados sensíveis em repouso.
// encrypt/decrypt: AES-256-GCM com IV aleatório de 12 bytes por registro.
// blindIndex: HMAC-SHA256 com chave própria, para buscar e garantir unicidade sem decifrar.
// Tokens (sessão, reset): SHA-256, pois já são aleatórios de 32 bytes.
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12;

function loadKey(name: "ENCRYPTION_KEY" | "BLIND_INDEX_KEY"): Buffer {
  const raw = process.env[name];
  const key = raw ? Buffer.from(raw, "base64") : Buffer.alloc(0);
  // Fail closed: sem chave válida, nada é cifrado nem decifrado.
  if (key.length !== 32) throw new Error(`${name} ausente ou inválida (esperado: 32 bytes em base64)`);
  return key;
}

/**
 * Cifra um texto. `context` entra como dado autenticado (AAD): um valor cifrado
 * para "user.cpf" não decifra se for copiado para outra coluna.
 * Formato: v1:<iv>:<tag>:<cifra>, tudo em base64url.
 */
export function encrypt(plaintext: string, context: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", loadKey("ENCRYPTION_KEY"), iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ct].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(":");
}

export function decrypt(payload: string, context: string): string {
  const [version, iv, tag, ct] = payload.split(":");
  if (version !== VERSION || !iv || !tag || ct === undefined) throw new Error("Payload cifrado inválido");
  const decipher = createDecipheriv("aes-256-gcm", loadKey("ENCRYPTION_KEY"), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}

/** HMAC-SHA256 determinístico. Normalize o valor antes (ex.: CPF só com dígitos). */
export function blindIndex(value: string): string {
  return createHmac("sha256", loadKey("BLIND_INDEX_KEY")).update(value, "utf8").digest("hex");
}

/** Token aleatório para cookie ou link; só o hash vai para o banco. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Comparação em tempo constante para assinaturas em hex. */
export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && ba.length > 0 && timingSafeEqual(ba, bb);
}
