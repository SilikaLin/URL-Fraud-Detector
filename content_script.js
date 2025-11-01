// content_script.js
(function() {
  const currentUrl = location.href;
  // envia para o service worker
  chrome.runtime.sendMessage({ type: 'check_url', url: currentUrl });

  // escuta a resposta
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'analysis_result') {
      const r = msg.result;
      if (r.suspicious) {
        showWarningBanner(r);
      }
    }
  });

  function showWarningBanner(result) {
    if (document.getElementById('fraud-detector-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'fraud-detector-banner';
    banner.style = `
      position:fixed;top:0;left:0;right:0;z-index:999999;
      background:#ffcc00;color:#000;padding:12px 16px;font-family:sans-serif;
      box-shadow:0 2px 8px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:space-between;
    `;
    banner.innerHTML = `
      <div>
        <strong>Site possivelmente fraudulento</strong>
        <div style="font-size:12px">${result.reasons.slice(0,3).join(' • ')}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button id="fd-back" style="padding:6px 10px;border:none;background:#000;color:#fff;border-radius:4px;cursor:pointer;">Voltar</button>
        <button id="fd-continue" style="padding:6px 10px;border:1px solid #000;background:transparent;border-radius:4px;cursor:pointer;">Continuar</button>
      </div>
    `;
    document.documentElement.prepend(banner);

    document.getElementById('fd-back').addEventListener('click', () => {
      history.back();
    });
    document.getElementById('fd-continue').addEventListener('click', () => {
      banner.remove();
    });
  }
})();
