// ═══════════════════════════════════════════════════════════════════════════
// SAGAE — Configuración ÚNICA del programa.
// Si el servidor (Apps Script) cambia de dirección —por ejemplo tras una
// reconstrucción— SOLO hay que editar este archivo y publicarlo.
//   API       = dirección de la aplicación web (termina en /exec)
//   API_TOKEN = debe ser IDÉNTICO a la propiedad SAGAE_API_TOKEN del servidor
// (el token es un filtro de tráfico, no un secreto; la seguridad real es la sesión).
// Las tres páginas traen una copia de respaldo de estos valores por si este archivo no cargara.
// ═══════════════════════════════════════════════════════════════════════════
window.SAGAE_CONFIG = {
  API: "https://script.google.com/macros/s/AKfycbxSA74xU_zCdMuS6GFwbwWcYwW0JxyzlPgb08TWaJPyu8AxthZVzuY9tYbwK6oXxFPU/exec",
  API_TOKEN: "SAGAE-7F2A9C41E8B6D053A1C4F9082EB37A65"
};
