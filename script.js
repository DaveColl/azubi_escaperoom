const TEAM_CONFIG = {
  team1: {
    id: 'team1',
    number: 1,
    name: 'Team 1',
    route: 'pages/team.html?team=1',
    phonePath: 'phone.html?team=1',
    finalPasswords: ['krise1', 'lockdown1', 'focus1'],
    fragment: 'KRISE + 1',
    task: 'Macht ein Bild von allen aus dem Team, wie sie gleichzeitig springen. Kein Fuß darf den Boden berühren!',
    lageplan: '../Escape Office/Team1Lageplan.jpeg',
  },
  team2: {
    id: 'team2',
    number: 2,
    name: 'Team 2',
    route: 'pages/team.html?team=2',
    phonePath: 'phone.html?team=2',
    finalPasswords: ['krise2', 'lockdown2', 'focus2'],
    fragment: 'KRISE + 2',
    task: 'Stellt das Wort „Aareon“ mit euren Händen dar und dokumentiert den Beweis für die Systemfreigabe.',
    lageplan: '../Escape Office/Team2Lageplan.jpeg',
  },
  team3: {
    id: 'team3',
    number: 3,
    name: 'Team 3',
    route: 'pages/team.html?team=3',
    phonePath: 'phone.html?team=3',
    finalPasswords: ['krise3', 'lockdown3', 'focus3'],
    fragment: 'KRISE + 3',
    task: 'Findet 3 Dinge im Raum, die hier nicht hingehören, und kombiniert eure Beobachtung mit dem Krisenhinweis.',
    lageplan: '../Escape Office/Team3Lageplan.jpeg',
  },
};

// Final "safe" puzzle shown after the lock is opened. Each team gets a
// different riddle (top) that reveals where the locker/safe is hidden, and a
// code made of the four season emojis in the exact order from the printed card.
// The meaning of the emojis is intentionally NOT revealed on screen.
const SAFE_PUZZLE = {
  team1: {
    id: 'team1',
    number: 1,
    name: 'Team 1',
    riddle: 'Um den Schatz zu finden, sucht unter der Agora nach dem Spind den ihr erhaltet, wenn ihr die Anzahl der Reifen eines Fahrrads mit der Anzahl der Chromosomen, die ein Mensch von einem Elternteil erbt, multipliziert.',
    code: ['🌸', '🍂', '🦩', '❄️'],
  },
  team2: {
    id: 'team2',
    number: 2,
    name: 'Team 2',
    riddle: 'Um den Schatz zu finden, sucht unter der Agora nach dem Spind den ihr erhaltet, wenn ihr die Anzahl der Seiten eines Würfels mit der Anzahl der Kontinente auf der Erde multipliziert.',
    code: ['🎃', '🦋', '☃️', '⛱️'],
  },
  team3: {
    id: 'team3',
    number: 3,
    name: 'Team 3',
    riddle: 'Um den Schatz zu finden, sucht unter der Agora nach dem Spind den ihr erhaltet, wenn ihr die Anzahl der Stunden auf einer Wanduhr mit der Anzahl der Primärfarben multipliziert und die Anzahl der Monde der Erde addiert.',
    code: ['🏖️', '🌼', '🎄', '🌰'],
  },
};

const PASSWORD_ROUTES = new Map([
  ['team1', 'pages/team.html?team=1'],
  ['team2', 'pages/team.html?team=2'],
  ['team3', 'pages/team.html?team=3'],
]);

const TEAM_BY_UNLOCK = new Map(Object.values(TEAM_CONFIG).map((team) => [team.id, team]));

const SETUP_STORAGE_KEY = 'escapeOfficeSetup';

function loadSetup() {
  try {
    const raw = window.localStorage.getItem(SETUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !TEAM_CONFIG[parsed.team] || typeof parsed.password !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSetup(setup) {
  try {
    window.localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(setup));
    return true;
  } catch {
    return false;
  }
}

function clearSetup() {
  try {
    window.localStorage.removeItem(SETUP_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const PAGE_TRANSITION_DURATION = 520;
const HACK_SEQUENCE_LOAD_DURATION = 5200;
const HACK_SEQUENCE_TOTAL_DURATION = 7600;
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

  let progressTimer = 0;
  if (!REDUCED_MOTION.matches && message) {
    const startedAt = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const ratio = Math.min(elapsed / revealHackDelay, 1);
      const percent = Math.min(Math.round(ratio * 95), 95);
      if (!overlay.classList.contains('is-hacked')) {
        message.textContent = `Fortschritt ${percent}% · Verschlüsselte Sicherheitsroute wird entschlüsselt...`;
      }
      if (ratio < 1) {
        progressTimer = window.setTimeout(tick, 140);
      }
    };
    progressTimer = window.setTimeout(tick, 140);
  }

  window.setTimeout(() => {
    window.clearTimeout(progressTimer);
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
    const setup = loadSetup();
    let team;
    if (setup) {
      team = normalizePassword(setup.password) === password ? TEAM_CONFIG[setup.team] : null;
    } else {
      team = TEAM_BY_UNLOCK.get(password);
    }
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

function wireSetupForm() {
  const form = document.querySelector('#setupForm');
  if (!form) return;

  const passwordInput = document.querySelector('#setupPassword');
  const finalPasswordInput = document.querySelector('#setupFinalPassword');
  const emailInput = document.querySelector('#setupEmail');
  const feedback = document.querySelector('#setupFeedback');
  const hint = document.querySelector('#setupHint');
  const resetButton = document.querySelector('#setupReset');

  const applyExisting = () => {
    const setup = loadSetup();
    if (!setup) {
      if (hint) hint.textContent = 'Aktuell ist noch kein Setup gespeichert.';
      return;
    }
    const teamRadio = form.querySelector(`input[name="team"][value="${setup.team}"]`);
    if (teamRadio) teamRadio.checked = true;
    if (passwordInput) passwordInput.value = setup.password;
    if (finalPasswordInput) finalPasswordInput.value = setup.finalPassword || '';
    if (emailInput) emailInput.value = setup.email || '';
    if (hint) hint.textContent = `Gespeichert: ${TEAM_CONFIG[setup.team].name} · Zugang „${setup.password}“ · Krise „${setup.finalPassword || '—'}“ · Mail „${setup.email || '—'}“`;
  };

  applyExisting();

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const team = form.querySelector('input[name="team"]:checked')?.value || '';
    const password = (passwordInput?.value || '').trim();
    const finalPassword = (finalPasswordInput?.value || '').trim();
    const email = (emailInput?.value || '').trim();

    if (!TEAM_CONFIG[team]) {
      setFeedback(feedback, 'Bitte ein Ziel-Team auswählen.', 'error');
      return;
    }

    if (!password) {
      setFeedback(feedback, 'Bitte einen Zugangscode festlegen.', 'error');
      passwordInput?.focus();
      return;
    }

    if (!finalPassword) {
      setFeedback(feedback, 'Bitte ein Krisenpasswort festlegen.', 'error');
      finalPasswordInput?.focus();
      return;
    }

    const stored = saveSetup({ team, password, finalPassword, email });
    if (!stored) {
      setFeedback(feedback, 'Speichern fehlgeschlagen. Ist der Speicher blockiert?', 'error');
      return;
    }

    setFeedback(feedback, `Gespeichert: ${TEAM_CONFIG[team].name} · Zugang „${password}“ · Krise „${finalPassword}“ · Mail „${email || '—'}“.`, 'success');
    if (hint) hint.textContent = `Gespeichert: ${TEAM_CONFIG[team].name} · Zugang „${password}“ · Krise „${finalPassword}“ · Mail „${email || '—'}“`;
  });

  resetButton?.addEventListener('click', () => {
    clearSetup();
    if (passwordInput) passwordInput.value = '';
    if (finalPasswordInput) finalPasswordInput.value = '';
    if (emailInput) emailInput.value = '';
    if (hint) hint.textContent = 'Aktuell ist noch kein Setup gespeichert.';
    setFeedback(feedback, 'Setup zurückgesetzt. Standardcodes sind wieder aktiv.', 'success');
  });
}

function getTeamFromQuery() {
  const raw = new URLSearchParams(window.location.search).get('team') || '';
  const key = `team${raw.replace(/[^0-9]/g, '')}`;
  return TEAM_CONFIG[key] || null;
}

function renderTeamPage() {
  const root = document.querySelector('[data-team-page]');
  if (!root) return;

  const team = getTeamFromQuery();
  if (!team) {
    window.location.replace('../index.html');
    return;
  }

  document.title = `Escape Office | ${team.name} Lockdown`;
  root.querySelectorAll('[data-team-name]').forEach((el) => { el.textContent = team.name; });

  const lead = root.querySelector('[data-team-lead]');
  if (lead) {
    lead.textContent = `${team.name} wurde identifiziert. Der Zugriff bleibt gesperrt, bis der mobile Hinweis gescannt und der finale Krisencode eingegeben wurde.`;
  }

  const qrIntro = root.querySelector('[data-team-qr-intro]');
  if (qrIntro) {
    qrIntro.textContent = `Der QR-Code führt zu eurer ${team.name}-Unterseite. Öffnet sie mit dem Smartphone und nutzt die Hinweise für den finalen Code.`;
  }

  const finalIntro = root.querySelector('[data-team-final-intro]');
  if (finalIntro) {
    finalIntro.textContent = `Wenn ihr den ${team.name}-Code gelöst habt, gebt ihn hier ein und beendet den Lockdown.`;
  }

  const canvas = root.querySelector('[data-qr-code]');
  if (canvas) {
    const setup = loadSetup();
    const email = (setup && setup.team === team.id && setup.email) ? setup.email : '';
    let qrPath = `./phone.html?team=${team.number}`;
    if (email) qrPath += `&mail=${encodeURIComponent(email)}`;
    canvas.setAttribute('data-qr-path', qrPath);
    canvas.setAttribute('aria-label', `Animierter QR-Code für ${team.name}`);
  }

  const input = root.querySelector('[data-final-password-form] input');
  if (input) input.placeholder = `Code ${team.name}`;

  const form = root.querySelector('[data-final-password-form]');
  if (form) form.setAttribute('data-team', team.id);
}

function formatDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function renderPhonePage() {
  const root = document.querySelector('[data-phone-page]');
  if (!root) return;

  const team = getTeamFromQuery();
  if (!team) {
    window.location.replace('../index.html');
    return;
  }

  const setup = loadSetup();

  document.title = `Escape Office | ${team.name} Mobile Spur`;
  root.querySelectorAll('[data-team-name]').forEach((el) => { el.textContent = team.name; });

  const eyebrow = root.querySelector('[data-phone-eyebrow]');
  if (eyebrow) eyebrow.textContent = `Mobile Freigabe · ${team.name}`;

  const task = root.querySelector('[data-team-task]');
  if (task) task.textContent = team.task;

  const lageplanImage = root.querySelector('[data-lageplan-image]');
  if (lageplanImage && team.lageplan) {
    lageplanImage.src = team.lageplan;
    lageplanImage.alt = `Lageplan für ${team.name}`;
  }

  // --- Step navigation ---
  const steps = Array.from(root.querySelectorAll('[data-phone-step]'));
  const showStep = (name) => {
    steps.forEach((step) => {
      const isActive = step.getAttribute('data-phone-step') === name;
      step.hidden = !isActive;
      if (isActive) {
        step.setAttribute('data-step-active', '');
      } else {
        step.removeAttribute('data-step-active');
      }
    });
    root.scrollTop = 0;
  };

  root.querySelectorAll('[data-phone-next]').forEach((button) => {
    button.addEventListener('click', () => showStep(button.getAttribute('data-phone-next')));
  });
  root.querySelectorAll('[data-phone-prev]').forEach((button) => {
    button.addEventListener('click', () => showStep(button.getAttribute('data-phone-prev')));
  });

  // --- Camera capture, preview, auto-download ---
  const captureInput = root.querySelector('[data-phone-capture]');
  const preview = root.querySelector('[data-phone-preview]');
  const previewImage = root.querySelector('[data-phone-preview-image]');
  const downloadNote = root.querySelector('[data-phone-download-note]');
  const downloadLink = root.querySelector('[data-phone-download]');
  const nextMailButton = root.querySelector('[data-phone-next-mail]');
  const fileName = `team${team.number}-jump-${formatDateStamp()}.jpg`;

  let lastCapturedFile = null;

  // On iOS the <a download> is ignored, so re-open the share sheet on tap.
  downloadLink?.addEventListener('click', (event) => {
    if (lastCapturedFile && navigator.canShare && navigator.canShare({ files: [lastCapturedFile] })) {
      event.preventDefault();
      navigator.share({ files: [lastCapturedFile], title: 'Escape Office · Beweisfoto' }).catch(() => {});
    }
  });

  captureInput?.addEventListener('change', () => {
    const file = captureInput.files && captureInput.files[0];
    if (!file) return;

    // Normalise the captured file to a .jpg named File so it saves nicely everywhere.
    const namedFile = new File([file], fileName, { type: file.type || 'image/jpeg' });
    lastCapturedFile = namedFile;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (previewImage) previewImage.src = dataUrl;
      preview?.removeAttribute('hidden');

      // Always provide a manual download link (blob URL works on Android/desktop).
      if (downloadLink) {
        const blobUrl = URL.createObjectURL(namedFile);
        downloadLink.href = blobUrl;
        downloadLink.setAttribute('download', fileName);
        downloadLink.removeAttribute('hidden');
      }

      // iOS Safari ignores the <a download> attribute, so use the native share
      // sheet ("In Fotos sichern"/"In Dateien sichern") when available. This
      // runs inside the file-input change handler, which counts as a user
      // gesture, so navigator.share is allowed.
      const canShareFile = navigator.canShare && navigator.canShare({ files: [namedFile] });
      if (canShareFile) {
        navigator.share({ files: [namedFile], title: 'Escape Office · Beweisfoto' })
          .then(() => {
            if (downloadNote) downloadNote.textContent = `Foto „${fileName}“ – wählt „In Fotos sichern“ oder „In Dateien sichern“.`;
          })
          .catch(() => {
            // User cancelled the share sheet – keep the manual download link visible.
            if (downloadNote) downloadNote.textContent = `Nicht gespeichert? Tippt auf „Foto erneut speichern“ und wählt „Sichern“.`;
          });
      } else if (downloadLink) {
        // Android/desktop: trigger the download automatically.
        downloadLink.click();
        if (downloadNote) downloadNote.textContent = `Gespeichert als „${fileName}“. Falls das Foto nur geöffnet wurde, sichert es manuell.`;
      }

      nextMailButton?.removeAttribute('hidden');
    };
    reader.readAsDataURL(file);
  });

  // --- Mail handoff (mailto:) ---
  const mailtoLink = root.querySelector('[data-phone-mailto]');
  const mailHint = root.querySelector('[data-phone-mail-hint]');
  const emailFromQuery = (new URLSearchParams(window.location.search).get('mail') || '').trim();
  const emailFromSetup = (setup && setup.team === team.id && setup.email) ? setup.email : '';
  const email = emailFromQuery || emailFromSetup;
  const subject = `Escape Office · ${team.name} · Beweisfoto`;
  const body = [
    `${team.name} meldet: Aufgabe erledigt.`,
    '',
    `Aufgabe: ${team.task}`,
    '',
    `WICHTIG: Bitte das gespeicherte Foto „${fileName}“ an diese Mail anhängen, bevor ihr sendet.`,
  ].join('\n');

  if (mailtoLink) {
    const params = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    mailtoLink.href = `mailto:${encodeURIComponent(email)}?${params}`;
  }
  if (mailHint) {
    mailHint.textContent = email
      ? `Mail wird vorbereitet an: ${email}`
      : 'Keine Ziel-Mail im Setup hinterlegt – bitte Empfänger manuell eintragen.';
  }

  showStep('lageplan');
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
      const setup = loadSetup();
      const useSetup = Boolean(setup && setup.team === teamId && setup.finalPassword);
      const accepted = useSetup
        ? normalizePassword(setup.finalPassword) === password
        : Boolean(team?.finalPasswords.some((candidate) => normalizePassword(candidate) === password));

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

      setFeedback(feedback, `${team.name}: Krise gelöst. Tresor wird entriegelt...`, 'success');
      if (input) input.disabled = true;
      form.querySelector('button[type="submit"]')?.setAttribute('disabled', '');
      playLockUnlockSequence(team, `victory.html?team=${team.number}`);
    });
  });
}

const LOCK_SEQUENCE_DURATION = 2600;

function playLockUnlockSequence(team, destination) {
  prefetchPage(destination);

  if (REDUCED_MOTION.matches) {
    document.body.classList.add('crisis-resolving');
    navigateWithTransition(destination, 400);
    return;
  }

  let overlay = document.querySelector('#lockOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'lockOverlay';
    overlay.className = 'lock-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="lock-stage">
        <svg class="lock-svg" viewBox="0 0 200 220" role="img" aria-label="Schloss wird entriegelt">
          <path class="lock-shackle" d="M60 92 V60 a40 40 0 0 1 80 0 V92" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round"/>
          <rect class="lock-body" x="42" y="92" width="116" height="96" rx="16"/>
          <circle class="lock-keyhole" cx="100" cy="132" r="11"/>
          <rect class="lock-keyhole-slot" x="95" y="132" width="10" height="30" rx="4"/>
        </svg>
        <div class="lock-key" aria-hidden="true">
          <svg viewBox="0 0 120 40">
            <circle cx="100" cy="20" r="14" fill="none" stroke="currentColor" stroke-width="6"/>
            <rect x="22" y="16" width="72" height="8" rx="2"/>
            <rect x="16" y="24" width="8" height="12" rx="2"/>
            <rect x="30" y="24" width="8" height="10" rx="2"/>
          </svg>
        </div>
        <p class="lock-caption">${team.name}: Tresor wird entriegelt&hellip;</p>
      </div>`;
    document.body.append(overlay);
  }

  window.requestAnimationFrame(() => {
    overlay.classList.add('is-visible');
    window.requestAnimationFrame(() => overlay.classList.add('is-turning'));
  });

  window.setTimeout(() => overlay.classList.add('is-open'), LOCK_SEQUENCE_DURATION - 700);
  navigateWithTransition(destination, LOCK_SEQUENCE_DURATION);
}

function renderVictoryPuzzle() {
  const root = document.querySelector('[data-safe-puzzle]');
  if (!root) return;

  const team = getTeamFromQuery();
  const puzzle = team ? SAFE_PUZZLE[team.id] : null;
  if (!puzzle) {
    // Fallback: keep a generic resolved screen if no team is provided.
    return;
  }

  document.title = `Escape Office | ${puzzle.name} · Tresor`;
  root.querySelectorAll('[data-team-name]').forEach((el) => { el.textContent = puzzle.name; });

  const question = root.querySelector('[data-safe-question]');
  if (question) question.textContent = puzzle.riddle;

  const code = root.querySelector('[data-safe-code]');
  if (code) {
    code.innerHTML = '';
    puzzle.code.forEach((emoji, index) => {
      const cell = document.createElement('div');
      cell.className = 'season-cell';
      cell.style.setProperty('--season-delay', `${index * 140}ms`);
      cell.innerHTML = `<span class="season-icon" aria-hidden="true">${emoji}</span>`;
      code.append(cell);
    });
  }
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
  for (let index = 0; index < 8; index += 1) setFormat(QR_SIZE - 1 - index, 8, index);
  for (let index = 8; index < 15; index += 1) setFormat(8, QR_SIZE - 15 + index, index);

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
wireSetupForm();
renderTeamPage();
renderPhonePage();
renderVictoryPuzzle();
wireRevealButtons();
wireFinalPasswordForms();
wireQrCodes();

