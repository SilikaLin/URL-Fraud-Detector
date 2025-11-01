function analisarURL(url) {
  let score = 0;
  const urlObj = new URL(url);
  const domain = urlObj.hostname;

  // Domínios confiáveis
  const dominiosConfiaveis = [
    "google.com", "youtube.com", "facebook.com", "twitter.com",
    "wikipedia.org", "amazon.com", "linkedin.com", "microsoft.com",
    "instagram.com", "whatsapp.com", "paypal.com"
  ];

  if (dominiosConfiaveis.some(d => domain.endsWith(d))) {
    return { risco: 0, motivo: "Domínio confiável" };
  }

  // Sem HTTPS
  if (urlObj.protocol !== "https:") score += 30;

  // Domínio muito longo
  if (domain.length > 25) score += 15;

  // Subdomínios excessivos
  if (domain.split(".").length > 3) score += 10;

  // Palavras suspeitas
  const palavrasSuspeitas = [
    "login", "verify", "update", "free", "gift", "secure",
    "password", "bank", "wallet", "account", "signin", "win"
  ];
  if (palavrasSuspeitas.some(p => url.toLowerCase().includes(p))) score += 20;

  //  Caracteres estranhos ou domínios suspeitos
  if (domain.includes("--") || domain.match(/[0-9]{3,}/) ||
      domain.endsWith(".xyz") || domain.endsWith(".ru"))
    score += 20;

  // URLs curtas mas sem HTTPS
  if (url.length < 20 && urlObj.protocol !== "https:") score += 15;

  if (score >= 50) return { risco: score, motivo: "Possível fraude" };
  if (score >= 30) return { risco: score, motivo: "Suspeito" };
  return { risco: score, motivo: "Provavelmente seguro" };
}

// Detecta troca de URL e atualiza ícone conforme risco
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const resultado = analisarURL(changeInfo.url);
    console.log("Análise de URL:", resultado);

    if (resultado.risco >= 50) {
      chrome.action.setIcon({ path: "icons/icon_alert.png", tabId });
      chrome.action.setTitle({ title: "⚠️ Site potencialmente fraudulento!" });
    } else if (resultado.risco >= 30) {
      chrome.action.setIcon({ path: "icons/icon_warning.png", tabId });
      chrome.action.setTitle({ title: "🟡 Site suspeito" });
    } else {
      chrome.action.setIcon({ path: "icons/icon_safe.png", tabId });
      chrome.action.setTitle({ title: "🟢 Site seguro" });
    }

    // envia para o popup (se quiser exibir o status lá)
    chrome.storage.local.set({ resultado });
  }
});
