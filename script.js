const TEAM_CONFIG = {
  team1: {
    id: 'team1',
    name: 'Team 1',
    route: 'pages/team-1.html',
    phonePath: 'phone-team-1.html',
    finalPasswords: ['krise1', 'lockdown1', 'focus1'],
  },
  team2: {
    id: 'team2',
    name: 'Team 2',
    route: 'pages/team-2.html',
    phonePath: 'phone-team-2.html',
    finalPasswords: ['krise2', 'lockdown2', 'focus2'],
  },
  team3: {
    id: 'team3',
    name: 'Team 3',
    route: 'pages/team-3.html',
    phonePath: 'phone-team-3.html',
    finalPasswords: ['krise3', 'lockdown3', 'focus3'],
  },
};

const PASSWORD_ROUTES = new Map([
  ['team1', 'pages/team-1.html'],
  ['team2', 'pages/team-2.html'],
  ['team3', 'pages/team-3.html'],
]);

const TEAM_BY_UNLOCK = new Map(Object.values(TEAM_CONFIG).map((team) => [team.id, team]));

const PAGE_TRANSITION_DURATION = 520;
const HACK_SEQUENCE_LOAD_DURATION = 2250;
const HACK_SEQUENCE_TOTAL_DURATION = 3900;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
const prefetchedPages = new Set();
let navigationInProgress = false;

function normalizePassword(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_-]+/g, '');
}

function setFeedback(element, message, type) {
  if (!element) return;
  element.textContent = message;
  element.classList.remove('success', 'error');
  if (type) {
    element.classList.add(type);
  }
}

function getSiteRootUrl() {
  const script = document.querySelector('script[src$="script.js"]');
  const scriptUrl = script ? new URL(script.getAttribute('src'), document.baseURI) : new URL('./script.js', document.baseURI);
  return new URL('./', scriptUrl).href;
}

function toAbsoluteUrl(destination) {
  return new URL(destination, window.location.href);
}

function isSamePageHash(url) {
  return url.origin === window.location.origin
    && url.pathname === window.location.pathname
    && url.search === window.location.search
    && url.hash;
}

function prefetchPage(destination) {
  let url;
  try {
    url = toAbsoluteUrl(destination);
  } catch {
    return;
  }

  if (url.origin !== window.location.origin || prefetchedPages.has(url.href)) return;
  prefetchedPages.add(url.href);

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'document';
  link.href = url.href;
  document.head.append(link);
}

function prefetchKnownPages() {
  const rootUrl = getSiteRootUrl();
  const knownPaths = [
    'index.html',
    'pages/victory.html',
    ...Object.values(TEAM_CONFIG).flatMap((team) => [team.route, `pages/${team.phonePath}`]),
  ];

  knownPaths.forEach((path) => prefetchPage(new URL(path, rootUrl).href));
}

function ensurePageTransitionCurtain() {
  if (REDUCED_MOTION.matches || document.querySelector('.page-transition-curtain')) return;

  const curtain = document.createElement('div');
  curtain.className = 'page-transition-curtain';
  curtain.setAttribute('aria-hidden', 'true');
  document.body.append(curtain);

  window.requestAnimationFrame(() => {
    document.body.classList.add('is-page-ready');
  });
}

function navigateWithTransition(destination, delay = 0) {
  window.setTimeout(() => {
    if (navigationInProgress) return;
    navigationInProgress = true;

    const url = toAbsoluteUrl(destination);
    prefetchPage(url.href);

    if (REDUCED_MOTION.matches) {
      window.location.href = url.href;
      return;
    }

    ensurePageTransitionCurtain();
    document.documentElement.classList.add('is-navigating');
    document.body.classList.add('is-page-exiting');

    window.setTimeout(() => {
      window.location.href = url.href;
    }, PAGE_TRANSITION_DURATION);
  }, delay);
}

function anchorIsTransitionable(event, anchor) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (!anchor || anchor.hasAttribute('download')) return false;
  if (anchor.target && anchor.target !== '_self') return false;

  let url;
  try {
    url = toAbsoluteUrl(anchor.href);
  } catch {
    return false;
  }

  return url.origin === window.location.origin && !isSamePageHash(url);
}

function wirePageTransitions() {
  ensurePageTransitionCurtain();

  const idle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 120));
  idle(prefetchKnownPages);

  document.addEventListener('mouseover', (event) => {
    const anchor = event.target.closest?.('a[href]');
    if (anchor) prefetchPage(anchor.href);
  });

  document.addEventListener('focusin', (event) => {
    const anchor = event.target.closest?.('a[href]');
    if (anchor) prefetchPage(anchor.href);
  });

  document.addEventListener('touchstart', (event) => {
    const anchor = event.target.closest?.('a[href]');
    if (anchor) prefetchPage(anchor.href);
  }, { passive: true });

  document.addEventListener('click', (event) => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchorIsTransitionable(event, anchor)) return;

    event.preventDefault();
    navigateWithTransition(anchor.href);
  });
}

function playTeamHackSequence(team, destination) {
  const overlay = document.querySelector('#teamHackOverlay');
  const title = document.querySelector('#hackOverlayTitle');
  const teamLabel = document.querySelector('#hackOverlayTeam');
  const message = document.querySelector('#hackOverlayMessage');
  const progressFill = document.querySelector('#hackProgressFill');
  const duration = REDUCED_MOTION.matches ? 900 : HACK_SEQUENCE_TOTAL_DURATION;
  const revealHackDelay = REDUCED_MOTION.matches ? 120 : HACK_SEQUENCE_LOAD_DURATION;

  prefetchPage(destination);

  if (!overlay) {
    navigateWithTransition(destination, duration);
    return;
  }

  overlay.hidden = false;
  overlay.classList.remove('is-visible', 'is-loading', 'is-hacked');
  progressFill?.style.removeProperty('animation');

  if (title) title.textContent = 'Sicherheitsroute wird geladen';
  if (teamLabel) teamLabel.textContent = `${team.name} erkannt`;
  if (message) message.textContent = 'Fortschritt 0% · Verbindung zum Lockdown-System wird aufgebaut...';

  window.requestAnimationFrame(() => {
    overlay.classList.add('is-visible', 'is-loading');
  });

  window.setTimeout(() => {
    overlay.classList.add('is-hacked');
    if (title) title.textContent = 'DU WURDEST GEHACKT';
    if (teamLabel) teamLabel.textContent = `${team.name}-Bereich kompromittiert`;
    if (message) message.textContent = 'Fortschritt 96% · Zugriff abgefangen · Team-Screen wird erzwungen...';
  }, revealHackDelay);

  navigateWithTransition(destination, duration);
}

function wirePasswordForm() {
  const form = document.querySelector('#passwordForm');
  if (!form) return;

  const input = document.querySelector('#passwordInput');
  const feedback = document.querySelector('#passwordFeedback');
  const unlockTeam = document.querySelector('#unlockTeam');
  const terminalPanel = document.querySelector('#terminalPanel');
  const laptop = document.querySelector('.laptop');
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const password = normalizePassword(input.value);
    const team = TEAM_BY_UNLOCK.get(password);
    const destination = team?.route;

    terminalPanel?.classList.remove('is-shaking');
    laptop?.classList.remove('is-unlocking');
    unlockTeam?.classList.remove('is-visible');

    if (!password) {
      setFeedback(feedback, 'Bitte einen Zugangscode eingeben.', 'error');
      terminalPanel?.classList.add('is-shaking');
      input.focus();
      return;
    }

    if (!destination) {
      setFeedback(feedback, 'Zugriff verweigert. Prüft das Passwort und versucht es erneut.', 'error');
      terminalPanel?.classList.add('is-shaking');
      input.select();
      return;
    }

    setFeedback(feedback, '', null);
    unlockTeam?.setAttribute('hidden', '');
    input.disabled = true;
    submitButton?.setAttribute('disabled', '');
    input.blur();
    laptop?.classList.add('is-unlocking');
    playTeamHackSequence(team, destination);
  });
}

function wireRevealButtons() {
  const buttons = document.querySelectorAll('[data-reveal-target]');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetSelector = button.getAttribute('data-reveal-target');
      const target = targetSelector ? document.querySelector(targetSelector) : null;
      if (!target) return;

      target.classList.add('is-visible');
      target.removeAttribute('hidden');
      button.textContent = 'Anweisung freigeschaltet';
      button.setAttribute('aria-expanded', 'true');
      button.disabled = true;
    });
  });
}

function wireFinalPasswordForms() {
  const forms = document.querySelectorAll('[data-final-password-form]');
  forms.forEach((form) => {
    const teamId = form.getAttribute('data-team');
    const team = teamId ? TEAM_CONFIG[teamId] : null;
    const input = form.querySelector('input[type="password"], input[type="text"]');
    const feedback = form.querySelector('.feedback');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      form.classList.remove('is-shaking');

      const password = normalizePassword(input?.value || '');
      const accepted = Boolean(team?.finalPasswords.some((candidate) => normalizePassword(candidate) === password));

      if (!password) {
        setFeedback(feedback, 'Bitte den finalen Code eingeben.', 'error');
        form.classList.add('is-shaking');
        input?.focus();
        return;
      }

      if (!accepted) {
        setFeedback(feedback, 'Code abgelehnt. Lockdown bleibt aktiv.', 'error');
        form.classList.add('is-shaking');
        input?.select();
        return;
      }

      setFeedback(feedback, `${team.name}: Krise gelöst. System wird freigegeben...`, 'success');
      document.body.classList.add('crisis-resolving');
      navigateWithTransition('victory.html', 950);
    });
  });
}

function createBitBuffer() {
  const bits = [];
  return {
    bits,
    push(value, length) {
      for (let index = length - 1; index >= 0; index -= 1) {
        bits.push((value >>> index) & 1);
      }
    },
  };
}

const QR_VERSION = 5;
const QR_SIZE = 17 + QR_VERSION * 4;
const QR_DATA_CODEWORDS = 108;
const QR_ECC_CODEWORDS = 26;

function gfTables() {
  const exp = new Array(512);
  const log = new Array(256);
  let value = 1;
  for (let index = 0; index < 255; index += 1) {
    exp[index] = value;
    log[value] = index;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let index = 255; index < 512; index += 1) {
    exp[index] = exp[index - 255];
  }
  return { exp, log };
}

const GF = gfTables();

function gfMultiply(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF.exp[GF.log[a] + GF.log[b]];
}

function reedSolomonGenerator(degree) {
  let polynomial = [1];
  for (let index = 0; index < degree; index += 1) {
    const next = new Array(polynomial.length + 1).fill(0);
    polynomial.forEach((coefficient, position) => {
      next[position] ^= coefficient;
      next[position + 1] ^= gfMultiply(coefficient, GF.exp[index]);
    });
    polynomial = next;
  }
  return polynomial;
}

function reedSolomonRemainder(data, degree) {
  const generator = reedSolomonGenerator(degree);
  const result = new Array(degree).fill(0);

  data.forEach((byte) => {
    const factor = byte ^ result.shift();
    result.push(0);
    for (let index = 0; index < degree; index += 1) {
      result[index] ^= gfMultiply(generator[index + 1], factor);
    }
  });

  return result;
}

function encodeQrCodewords(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  const buffer = createBitBuffer();
  buffer.push(0b0100, 4);
  buffer.push(bytes.length, 8);
  bytes.forEach((byte) => buffer.push(byte, 8));

  const capacityBits = QR_DATA_CODEWORDS * 8;
  if (buffer.bits.length > capacityBits) {
    throw new Error('QR payload is too long for this prototype generator.');
  }

  buffer.push(0, Math.min(4, capacityBits - buffer.bits.length));
  while (buffer.bits.length % 8 !== 0) buffer.bits.push(0);

  const data = [];
  for (let index = 0; index < buffer.bits.length; index += 8) {
    data.push(Number.parseInt(buffer.bits.slice(index, index + 8).join(''), 2));
  }
  for (let pad = 0; data.length < QR_DATA_CODEWORDS; pad += 1) {
    data.push(pad % 2 === 0 ? 0xec : 0x11);
  }

  return [...data, ...reedSolomonRemainder(data, QR_ECC_CODEWORDS)];
}

function maskBit(mask, x, y) {
  if (mask === 0) return (x + y) % 2 === 0;
  return false;
}

function formatBits(mask) {
  const errorCorrectionLevelL = 1;
  const data = (errorCorrectionLevelL << 3) | mask;
  let value = data << 10;
  for (let bit = 14; bit >= 10; bit -= 1) {
    if (((value >>> bit) & 1) !== 0) {
      value ^= 0x537 << (bit - 10);
    }
  }
  return ((data << 10) | value) ^ 0x5412;
}

function createQrMatrix(text) {
  const modules = Array.from({ length: QR_SIZE }, () => new Array(QR_SIZE).fill(false));
  const fixed = Array.from({ length: QR_SIZE }, () => new Array(QR_SIZE).fill(false));

  const set = (x, y, value, isFixed = true) => {
    if (x < 0 || y < 0 || x >= QR_SIZE || y >= QR_SIZE) return;
    modules[y][x] = Boolean(value);
    if (isFixed) fixed[y][x] = true;
  };

  const drawFinder = (left, top) => {
    for (let y = -1; y <= 7; y += 1) {
      for (let x = -1; x <= 7; x += 1) {
        const xx = left + x;
        const yy = top + y;
        const isBorder = x === 0 || x === 6 || y === 0 || y === 6;
        const isCenter = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        set(xx, yy, isBorder || isCenter);
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(QR_SIZE - 7, 0);
  drawFinder(0, QR_SIZE - 7);

  for (let index = 8; index < QR_SIZE - 8; index += 1) {
    set(index, 6, index % 2 === 0);
    set(6, index, index % 2 === 0);
  }

  const drawAlignment = (centerX, centerY) => {
    for (let y = -2; y <= 2; y += 1) {
      for (let x = -2; x <= 2; x += 1) {
        set(centerX + x, centerY + y, Math.max(Math.abs(x), Math.abs(y)) === 2 || (x === 0 && y === 0));
      }
    }
  };
  drawAlignment(30, 30);

  for (let index = 0; index <= 8; index += 1) {
    if (index !== 6) {
      set(8, index, false);
      set(index, 8, false);
    }
  }
  for (let index = QR_SIZE - 8; index < QR_SIZE; index += 1) {
    set(8, index, false);
    set(index, 8, false);
  }
  set(8, QR_VERSION * 4 + 9, true);

  const codewordBits = encodeQrCodewords(text).flatMap((byte) => {
    const bits = [];
    for (let bit = 7; bit >= 0; bit -= 1) bits.push((byte >>> bit) & 1);
    return bits;
  });

  let bitIndex = 0;
  let upward = true;
  for (let right = QR_SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let vertical = 0; vertical < QR_SIZE; vertical += 1) {
      const y = upward ? QR_SIZE - 1 - vertical : vertical;
      for (let offset = 0; offset < 2; offset += 1) {
        const x = right - offset;
        if (fixed[y][x]) continue;
        const bit = bitIndex < codewordBits.length ? codewordBits[bitIndex] === 1 : false;
        set(x, y, bit !== maskBit(0, x, y), false);
        bitIndex += 1;
      }
    }
    upward = !upward;
  }

  const bits = formatBits(0);
  const setFormat = (x, y, index) => set(x, y, ((bits >>> index) & 1) === 1);
  for (let index = 0; index <= 5; index += 1) setFormat(index, 8, index);
  setFormat(7, 8, 6);
  setFormat(8, 8, 7);
  setFormat(8, 7, 8);
  for (let index = 9; index < 15; index += 1) setFormat(8, 14 - index, index);
  for (let index = 0; index < 8; index += 1) setFormat(8, QR_SIZE - 1 - index, index);
  for (let index = 8; index < 15; index += 1) setFormat(QR_SIZE - 15 + index, 8, index);

  return modules;
}

function drawQrCode(canvas, text) {
  const modules = createQrMatrix(text);
  const quietZone = 4;
  const moduleCount = modules.length + quietZone * 2;
  const size = canvas.width = canvas.height = 420;
  const scale = size / moduleCount;
  const context = canvas.getContext('2d');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  context.fillStyle = '#05070b';
  modules.forEach((row, y) => {
    row.forEach((isDark, x) => {
      if (!isDark) return;
      context.fillRect(Math.round((x + quietZone) * scale), Math.round((y + quietZone) * scale), Math.ceil(scale), Math.ceil(scale));
    });
  });
}

function wireQrCodes() {
  const qrCanvases = document.querySelectorAll('[data-qr-code]');
  qrCanvases.forEach((canvas) => {
    const path = canvas.getAttribute('data-qr-path') || './';
    const targetUrl = new URL(path, window.location.href).href;
    const linkSelector = canvas.getAttribute('data-qr-link');
    const link = linkSelector ? document.querySelector(linkSelector) : null;

    try {
      drawQrCode(canvas, targetUrl);
      canvas.setAttribute('aria-label', `QR-Code zu ${targetUrl}`);
      link?.setAttribute('href', targetUrl);
      if (link) link.textContent = targetUrl;
      window.setTimeout(() => canvas.closest('.qr-vault')?.classList.add('is-online'), 240);
    } catch (error) {
      const context = canvas.getContext('2d');
      context.fillStyle = '#070a10';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#ff6b6b';
      context.font = '18px monospace';
      context.fillText('QR-Fehler', 24, 52);
      console.error(error);
    }
  });
}

wirePageTransitions();
wirePasswordForm();
wireRevealButtons();
wireFinalPasswordForms();
wireQrCodes();

