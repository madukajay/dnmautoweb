/* API base for Sold Prices queries.
 * Localhost → same-origin Node/Python server.
 * Live site → Render API.
 * Never put BeForward cookies or .env values here.
 */
(() => {
  const host = location.hostname;
  const local = host === "localhost" || host === "127.0.0.1";
  window.DNM_API_BASE = local ? "" : "https://dnm-auto-api.onrender.com";
})();
