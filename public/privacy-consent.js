(function () {
  'use strict';

  var measurementId = 'G-97S58XTPEL';
  var consentKey = 'vanguard_analytics_consent_v1';
  var allowedEvents = new Set(['page_view', 'sign_up', 'game_start', 'vip_checkout_opened']);
  var allowedModes = new Set(['online', 'computer', 'local', 'training']);
  var gaLoaded = false;

  function currentPage() {
    return window.location.origin + window.location.pathname;
  }

  function loadAnalytics() {
    if (gaLoaded || localStorage.getItem(consentKey) !== 'accepted') return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('config', measurementId, {
      send_page_view: false,
      page_location: currentPage(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      anonymize_ip: true
    });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(script);
    window.gtag('event', 'page_view', { page_location: currentPage() });
  }

  function track(name, parameters) {
    if (!allowedEvents.has(name) || localStorage.getItem(consentKey) !== 'accepted') return;
    loadAnalytics();
    var safeParameters = { page_location: currentPage() };
    if (name === 'page_view' && typeof parameters?.screen_name === 'string') {
      safeParameters.screen_name = parameters.screen_name.slice(0, 32);
    }
    if (name === 'game_start' && allowedModes.has(parameters?.mode)) {
      safeParameters.mode = parameters.mode;
    }
    if (name === 'sign_up' && ['email', 'google', 'apple', 'phone', 'guest'].includes(parameters?.method)) {
      safeParameters.method = parameters.method;
    }
    window.gtag('event', name, safeParameters);
  }

  window.vanguardTrack = track;

  function setConsent(value) {
    localStorage.setItem(consentKey, value);
    if (value === 'accepted') loadAnalytics();
    else if (gaLoaded && window.gtag) {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
      document.cookie.split(';').forEach(function (cookie) {
        var name = cookie.split('=')[0].trim();
        if (name === '_ga' || name.indexOf('_ga_') === 0) {
          document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
          document.cookie = name + '=; Max-Age=0; path=/; domain=' + window.location.hostname + '; SameSite=Lax';
        }
      });
    }
    render();
  }

  function render() {
    var old = document.getElementById('vanguard-privacy-controls');
    if (old) old.remove();

    var accepted = localStorage.getItem(consentKey) === 'accepted';
    var section = document.createElement('section');
    section.id = 'vanguard-privacy-controls';
    section.setAttribute('aria-label', 'Preferências de privacidade');
    section.innerHTML = '<style>' +
      '#vanguard-privacy-controls{position:fixed;z-index:99999;left:calc(16px + env(safe-area-inset-left, 0px));bottom:calc(16px + env(safe-area-inset-bottom, 0px));font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#f4f4f5}' +
      '#vanguard-privacy-controls .vc-manage{border:1px solid #52525b;background:#18181b;color:#e4e4e7;border-radius:999px;padding:8px 13px;cursor:pointer;box-shadow:0 4px 18px #0008}' +
      '#vanguard-privacy-controls .vc-panel{width:min(440px,calc(100vw - 32px));margin-bottom:10px;padding:18px;border:1px solid #3f3f46;border-radius:16px;background:#18181b;box-shadow:0 12px 40px #000b}' +
      '#vanguard-privacy-controls h2{margin:0 0 8px;font-size:17px;color:#fff}' +
      '#vanguard-privacy-controls p{margin:0 0 14px;color:#d4d4d8}' +
      '#vanguard-privacy-controls a{color:#6ee7b7;text-decoration:underline}' +
      '#vanguard-privacy-controls .vc-actions{display:flex;flex-wrap:wrap;gap:8px}' +
      '#vanguard-privacy-controls .vc-actions button{border:1px solid #52525b;border-radius:9px;padding:9px 12px;background:#27272a;color:#fff;font-weight:650;cursor:pointer}' +
      '#vanguard-privacy-controls .vc-actions .vc-accept{background:#059669;border-color:#059669;color:#04130e}' +
      '@media(prefers-reduced-motion:reduce){#vanguard-privacy-controls *{scroll-behavior:auto!important}}' +
      '</style>';
    section.innerHTML += '<button class="vc-manage" type="button">Privacidade</button>';
    var manageButton = section.querySelector('.vc-manage');
    manageButton.addEventListener('click', function () {
      var panel = section.querySelector('.vc-panel');
      if (panel) panel.remove(); else showPanel(section);
    });
    document.body.appendChild(section);
    if (window.location.hash === '#preferencias' || !localStorage.getItem(consentKey)) showPanel(section);
    else if (accepted) manageButton.setAttribute('aria-label', 'Gerenciar preferências de privacidade');
  }

  function showPanel(section) {
    var existing = section.querySelector('.vc-panel');
    if (existing) return;
    var panel = document.createElement('div');
    panel.className = 'vc-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'vc-title');
    panel.innerHTML = '<h2 id="vc-title">Sua privacidade no Vanguard Chess</h2>' +
      '<p>Usamos o Google Analytics apenas se você aceitar, para entender visitas e melhorar o site. Não enviamos seu nome, e-mail, telefone, mensagens ou dados de partidas ao Analytics. Você pode mudar sua escolha quando quiser. <a href="/politica-de-privacidade/">Leia a política de privacidade</a>.</p>' +
      '<div class="vc-actions"><button class="vc-accept" type="button">Aceitar Analytics</button><button class="vc-reject" type="button">Recusar</button></div>';
    panel.querySelector('.vc-accept').addEventListener('click', function () { setConsent('accepted'); });
    panel.querySelector('.vc-reject').addEventListener('click', function () { setConsent('rejected'); });
    section.prepend(panel);
  }

  function start() {
    if (localStorage.getItem(consentKey) === 'accepted') loadAnalytics();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
