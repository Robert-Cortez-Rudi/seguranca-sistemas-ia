// A07 — Senhas comuns com 12+ caracteres (as menores já caem na regra de tamanho).
// Fontes: listas públicas de senhas vazadas (SecLists, top 100k) filtradas por tamanho,
// mais variações comuns em português. Comparação feita em minúsculas.
const LIST = [
  "123456789012", "1234567890123", "12345678901234", "123456789123", "1234567891011",
  "123123123123", "123412341234", "111111111111", "000000000000", "121212121212",
  "123456123456", "987654321098", "qwertyuiopas", "qwertyuiop123", "qwerty123456",
  "qwertyqwerty", "asdfghjklasd", "zxcvbnmasdfg", "1q2w3e4r5t6y", "1qaz2wsx3edc",
  "q1w2e3r4t5y6", "a1b2c3d4e5f6", "abcdefghijkl", "abcd12345678", "abc123456789",
  "password1234", "password123!", "password12345", "passwordpassword", "p@ssw0rd1234",
  "p@ssword1234", "iloveyou1234", "iloveyouiloveyou", "letmein12345", "welcome12345",
  "welcome123456", "administrator", "administrador", "admin12345678", "admin@123456",
  "changeme1234", "trustno1trustno1", "football1234", "baseball1234", "superman1234",
  "princess1234", "sunshine1234", "starwars1234", "dragon123456", "monkey123456",
  "master123456", "shadow123456", "michael12345", "jennifer1234", "whatever1234",
  "computer1234", "internet1234", "linkedin1234", "facebook1234", "instagram123",
  "senha1234567", "senha12345678", "senha123456789", "senhasenha12", "minhasenha123",
  "minhasenha1234", "mudar123456", "mudar12345678", "trocar123456", "brasil123456",
  "brasil2024!!", "brasil2025!!", "brasil2026!!", "flamengo1234", "corinthians1",
  "corinthians123", "palmeiras123", "saopaulo1234", "vasco1234567", "gremio123456",
  "eusouofoda123", "teamo1234567", "teamo123456789", "amor12345678", "deusefiel123",
  "jesus1234567", "jesuscristo1", "familia12345", "familia123456", "meuamor12345",
  "aaaaaaaaaaaa", "abcabcabcabc", "secureshop123", "secureshop1234", "secureshop2026",
];

export const COMMON_PASSWORDS: ReadonlySet<string> = new Set(LIST);
