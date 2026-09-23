import "server-only";
import nodemailer from "nodemailer";

// E-mails só em texto puro: nada de HTML montado com dado do usuário.
// No ambiente local o SMTP é o Mailpit (http://localhost:8025).
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "127.0.0.1",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false,
});

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.MAIL_FROM ?? "SecureShop <no-reply@secureshop.local>",
    to,
    subject,
    text,
  });
}

export function appUrl(path: string): string {
  const base = process.env.APP_URL;
  if (!base) throw new Error("APP_URL não definido"); // link com host errado vira phishing
  return new URL(path, base).toString();
}
