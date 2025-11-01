// service_worker.js
const DEFAULT_THRESHOLD = 2; // score acima -> suspeito
const REMOTE_BLACKLIST_URL = "https://seu-servidor.com/api/blacklist"; // opcional

// pequenas utilidades
function isIpHostname(host) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

async function fetchRemoteBlacklist() {
  try {
    const res = await fetch(REMOTE_BLACKLIST_URL);
    if (!res.ok) return [];
    return await res.json(); // espera array de domínios
  } catch (e) {
    return [];
  }
}

// recebe mensagem do content script com a url para analisar
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'check_url') {
    const url = msg.url;
    analyzeUrl(url).then(result => {
      // envia de volta o resultado
      chrome.tabs.sendMessage(sender.tab.id, { type: 'analysis_result', result });
    });
  }
});

async function analyzeUrl(rawUrl) {
  try {
    const urlObj = new URL(rawUrl);
    const hostname = urlObj.hostname;
    const path = urlObj.pathname + urlObj.search;
    let score = 0;
    const reasons = [];

    // 1. IP in host
    if (isIpHostname(hostname)) {
      score += 3;
      reasons.push('Hostname é um IP');
    }
    // 2. punycode
    if (hostname.includes('xn--')) {
      score += 3;
      reasons.push('Hostname com punycode (possível homograph)');
    }
    // 3. subdomains excessivos
    const parts = hostname.split('.');
    if (parts.length >= 5) {
      score += 1;
      reasons.push('Muitos subdomínios');
    }
    // 4. url muito longa
    if (rawUrl.length > 200) {
      score += 1;
      reasons.push('URL muito longa');
    }
    // 5. suspicious query (base64 chunk)
    if (/[A-Za-z0-9+/]{40,}={0,2}/.test(urlObj.search)) {
      score += 1;
      reasons.push('Parâmetros aparentam conter payload codificado');
    }
    // 6. shortener detection (exemplos)
    if (/^(bit\.ly|t\.co|tinyurl\.com|goo\.gl|buff\.ly|ow\.ly)$/.test(parts.slice(-2).join('.'))) {
      score += 2;
      reasons.push('URL encurtada');
    }

    // 7. remote blacklist check (opcional)
    const remoteBlacklist = await fetchRemoteBlacklist();
    if (remoteBlacklist.includes(hostname)) {
      score += 5;
      reasons.push('Hostname presente em blacklist remota');
    }

    // 8. typosquat check against small list (exemplo)
    const popular = ['google.com','facebook.com','paypal.com','amazon.com','apple.com','microsoft.com'];
    for (const pd of popular) {
      const dscore = levenshteinDistance(hostname.replace(/^www\./,''), pd);
      if (dscore <= 2 && hostname !== pd) {
        score += 2;
        reasons.push(`Hostname similar a ${pd} (possível typosquatting)`);
        break;
      }
    }

    // final
    const suspicious = score >= DEFAULT_THRESHOLD;
    return { suspicious, score, reasons, hostname, url: rawUrl };
  } catch (err) {
    return { suspicious: false, score: 0, reasons: ['Erro ao analisar URL'], url: rawUrl };
  }
}

// Levenshtein (simples e suficiente)
function levenshteinDistance(a, b) {
  const al = a.length, bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const matrix = Array.from({length: al+1}, (_, i) => new Array(bl+1).fill(0));
  for (let i=0;i<=al;i++) matrix[i][0] = i;
  for (let j=0;j<=bl;j++) matrix[0][j] = j;
  for (let i=1;i<=al;i++){
    for (let j=1;j<=bl;j++){
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i-1][j] + 1,
        matrix[i][j-1] + 1,
        matrix[i-1][j-1] + cost
      );
    }
  }
  return matrix[al][bl];
}

