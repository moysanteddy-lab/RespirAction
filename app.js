// ===== BreathFlow App =====

// État global
const state = {
  currentPage: 'home',
  breathingSession: null,
  isPlaying: false,
  settings: {
    darkMode: true,  // Dark mode par defaut (plus beau)
    vibration: true,
    sounds: true,
    audioGuide: true,
    voiceGuide: false,
    selectedVoice: ''
  },
  stats: {
    breathingSessions: 0,
    workouts: 0,
    lastActiveDate: null,
    streak: 0
  },
  workouts: [],
  history: [],  // Historique des sessions de respiration
  pomodoro: {
    isRunning: false,
    timeLeft: 25 * 60,
    mode: 'work', // work, break, longBreak
    sessionsCompleted: 0
  },
  reminders: {
    enabled: false,
    times: ['08:00', '12:00', '18:00'],  // Heures de rappel par defaut
    customMessage: ''  // Message personnalise optionnel
  }
};

// Techniques de respiration avec métadonnées audio
// throughNose: true = nez, false = bouche
// intensity: 'normal', 'strong', 'gentle'
const techniques = {
  // Sinus
  bhastrika: {
    name: 'Bhastrika',
    category: 'sinus',
    description: 'Souffle du forgeron. Respirations rapides et puissantes par le nez. Décongestionnant puissant pour les sinus.',
    instructions: 'Inspire et expire rapidement par le nez (1 sec chaque). Garde le ventre actif.',
    phases: [
      { type: 'rapid', duration: 30, breaths: 30, instruction: 'Respirations rapides', throughNose: true, intensity: 'strong' },
      { type: 'inhale', duration: 4, instruction: 'Inspire profond', throughNose: true, intensity: 'strong' },
      { type: 'hold', duration: 15, instruction: 'Rétention' },
      { type: 'exhale', duration: 8, instruction: 'Expire lentement', throughNose: true, intensity: 'gentle' }
    ],
    rounds: 3
  },
  kapalbhati: {
    name: 'Kapalbhati',
    category: 'sinus',
    description: 'Crâne brillant. Expirations courtes et actives, inspirations passives. Nettoie les voies nasales.',
    instructions: 'Expire fortement par le nez en contractant le ventre. L\'inspiration est passive.',
    phases: [
      { type: 'rapid', duration: 60, breaths: 60, instruction: 'Expire actif / Inspire passif', throughNose: true, intensity: 'strong' },
      { type: 'inhale', duration: 4, instruction: 'Inspire profond', throughNose: true },
      { type: 'hold', duration: 20, instruction: 'Rétention' },
      { type: 'exhale', duration: 6, instruction: 'Expire', throughNose: true }
    ],
    rounds: 3
  },
  nadiShodhana: {
    name: 'Nadi Shodhana',
    category: 'sinus',
    description: 'Respiration alternée. Équilibre les deux narines et apaise l\'inflammation.',
    instructions: 'Alterne entre narine droite et gauche. Bouche fermée.',
    phases: [
      { type: 'inhale', duration: 4, instruction: 'Inspire narine gauche', throughNose: true, intensity: 'gentle' },
      { type: 'hold', duration: 4, instruction: 'Rétention' },
      { type: 'exhale', duration: 4, instruction: 'Expire narine droite', throughNose: true, intensity: 'gentle' },
      { type: 'inhale', duration: 4, instruction: 'Inspire narine droite', throughNose: true, intensity: 'gentle' },
      { type: 'hold', duration: 4, instruction: 'Rétention' },
      { type: 'exhale', duration: 4, instruction: 'Expire narine gauche', throughNose: true, intensity: 'gentle' }
    ],
    rounds: 6
  },
  // Bronches
  diaphragm: {
    name: 'Respiration Diaphragmatique',
    category: 'bronches',
    description: 'Respiration abdominale profonde. Renforce le diaphragme et améliore la capacité pulmonaire.',
    instructions: 'Place une main sur le ventre. Le ventre se gonfle à l\'inspiration, rentre à l\'expiration.',
    phases: [
      { type: 'inhale', duration: 4, instruction: 'Inspire - gonfle le ventre', throughNose: true },
      { type: 'hold', duration: 2, instruction: 'Pause' },
      { type: 'exhale', duration: 6, instruction: 'Expire - rentre le ventre', throughNose: true },
      { type: 'hold', duration: 2, instruction: 'Pause' }
    ],
    rounds: 8
  },
  ujjayi: {
    name: 'Ujjayi',
    category: 'bronches',
    description: 'Souffle océanique victorieux. Renforce les poumons et crée de la chaleur interne.',
    instructions: 'Contracte légèrement la gorge pour créer un son d\'océan. Bouche fermée.',
    phases: [
      { type: 'inhale', duration: 5, instruction: 'Inspire - son d\'océan', throughNose: true, intensity: 'strong' },
      { type: 'exhale', duration: 5, instruction: 'Expire - son d\'océan', throughNose: true, intensity: 'strong' }
    ],
    rounds: 12
  },
  pursedLip: {
    name: 'Lèvres Pincées',
    category: 'bronches',
    description: 'Expire par les lèvres pincées. Aide à vider complètement les poumons.',
    instructions: 'Inspire par le nez, expire lentement par les lèvres pincées (comme souffler une bougie).',
    phases: [
      { type: 'inhale', duration: 3, instruction: 'Inspire par le nez', throughNose: true },
      { type: 'exhale', duration: 6, instruction: 'Expire lèvres pincées', throughNose: false, intensity: 'gentle' }
    ],
    rounds: 10
  },
  // Sommeil
  sleep478: {
    name: '4-7-8',
    category: 'sleep',
    description: 'Technique Dr. Andrew Weil. Induit naturellement le sommeil en quelques minutes.',
    instructions: 'Langue contre le palais. Cette technique ralentit le système nerveux.',
    phases: [
      { type: 'inhale', duration: 4, instruction: 'Inspire par le nez', throughNose: true, intensity: 'gentle' },
      { type: 'hold', duration: 7, instruction: 'Rétention' },
      { type: 'exhale', duration: 8, instruction: 'Expire par la bouche', throughNose: false, intensity: 'gentle' }
    ],
    rounds: 4
  },
  coherence: {
    name: 'Cohérence Cardiaque',
    category: 'sleep',
    description: '5.5 secondes inspire / 5.5 secondes expire. Synchronise coeur et respiration.',
    instructions: 'Respiration régulière et fluide. Pas de pause entre les phases.',
    phases: [
      { type: 'inhale', duration: 5.5, instruction: 'Inspire', throughNose: true, intensity: 'gentle' },
      { type: 'exhale', duration: 5.5, instruction: 'Expire', throughNose: true, intensity: 'gentle' }
    ],
    rounds: 30
  },
  moonBreath: {
    name: 'Respiration Lunaire',
    category: 'sleep',
    description: 'Chandra Bhedana. Respirer uniquement par la narine gauche calme et refroidit.',
    instructions: 'Bouche la narine droite avec le pouce. Respire uniquement par la gauche.',
    phases: [
      { type: 'inhale', duration: 4, instruction: 'Inspire narine gauche', throughNose: true, intensity: 'gentle' },
      { type: 'hold', duration: 2, instruction: 'Pause' },
      { type: 'exhale', duration: 6, instruction: 'Expire narine gauche', throughNose: true, intensity: 'gentle' }
    ],
    rounds: 10
  },
  // Immunitaire
  wimHof: {
    name: 'Wim Hof',
    category: 'immune',
    description: 'Méthode scientifiquement prouvée. Booste le système immunitaire et l\'énergie.',
    instructions: '30 respirations profondes, puis rétention poumons vides, puis récupération.',
    phases: [
      { type: 'rapid', duration: 90, breaths: 30, instruction: '30 respirations profondes', throughNose: false, intensity: 'strong' },
      { type: 'exhale', duration: 3, instruction: 'Expire tout l\'air', throughNose: false, intensity: 'strong' },
      { type: 'holdEmpty', duration: 90, instruction: 'Rétention poumons VIDES' },
      { type: 'inhale', duration: 3, instruction: 'Inspire profond', throughNose: false, intensity: 'strong' },
      { type: 'hold', duration: 15, instruction: 'Rétention poumons pleins' }
    ],
    rounds: 3
  },
  tummo: {
    name: 'Tummo',
    category: 'immune',
    description: 'Technique tibétaine de chaleur intérieure. Active le système immunitaire.',
    instructions: 'Visualise une flamme au niveau du nombril qui grandit à chaque inspiration.',
    phases: [
      { type: 'inhale', duration: 5, instruction: 'Inspire - nourris la flamme', throughNose: true, intensity: 'strong' },
      { type: 'hold', duration: 10, instruction: 'Rétention - chaleur monte' },
      { type: 'exhale', duration: 5, instruction: 'Expire - flamme se stabilise', throughNose: true }
    ],
    rounds: 7
  },
  // Anti-stress
  boxBreathing: {
    name: 'Box Breathing',
    category: 'stress',
    description: 'Technique Navy SEALs. 4-4-4-4. Calme instantané sous pression.',
    instructions: 'Respiration carrée : inspire, tiens, expire, tiens. Chaque phase = 4 secondes.',
    phases: [
      { type: 'inhale', duration: 4, instruction: 'Inspire', throughNose: true },
      { type: 'hold', duration: 4, instruction: 'Tiens' },
      { type: 'exhale', duration: 4, instruction: 'Expire', throughNose: true },
      { type: 'hold', duration: 4, instruction: 'Tiens' }
    ],
    rounds: 6
  },
  physiologicalSigh: {
    name: 'Soupir Physiologique',
    category: 'stress',
    description: 'Découvert par Stanford. Le moyen le plus rapide de calmer le stress.',
    instructions: 'Double inspiration nasale, puis longue expiration par la bouche.',
    phases: [
      { type: 'inhale', duration: 2, instruction: 'Inspire 1', throughNose: true },
      { type: 'inhale', duration: 1, instruction: 'Inspire 2 (petit)', throughNose: true, intensity: 'gentle' },
      { type: 'exhale', duration: 6, instruction: 'Longue expire bouche', throughNose: false, intensity: 'gentle' }
    ],
    rounds: 6
  },
  // === FOCUS COGNITIF - Pour concentration, travail, Pomodoro ===
  focusBreath: {
    name: 'Focus Breath 4-4-4',
    category: 'focus',
    description: 'Active le cortex préfrontal. Idéal avant une session de travail intense.',
    instructions: 'Respiration équilibrée qui prépare le cerveau à la concentration.',
    phases: [
      { type: 'inhale', duration: 4, instruction: 'Inspire - active', throughNose: true },
      { type: 'hold', duration: 4, instruction: 'Retiens - prépare' },
      { type: 'exhale', duration: 4, instruction: 'Expire - focus', throughNose: true }
    ],
    rounds: 6
  },
  brainBoost: {
    name: 'Brain Boost',
    category: 'focus',
    description: 'Boost rapide d\'oxygène au cerveau. Parfait pour un coup de mou.',
    instructions: 'Respirations profondes suivies de rétention. Augmente la vigilance.',
    phases: [
      { type: 'inhale', duration: 3, instruction: 'Inspire profond', throughNose: true, intensity: 'strong' },
      { type: 'hold', duration: 3, instruction: 'Retiens' },
      { type: 'exhale', duration: 3, instruction: 'Expire', throughNose: true },
      { type: 'inhale', duration: 3, instruction: 'Inspire profond', throughNose: true, intensity: 'strong' },
      { type: 'hold', duration: 6, instruction: 'Retiens longtemps' },
      { type: 'exhale', duration: 4, instruction: 'Expire lentement', throughNose: true }
    ],
    rounds: 4
  },
  energize: {
    name: 'Energize Express',
    category: 'focus',
    description: 'Respiration énergisante rapide. Réveille le corps et l\'esprit en 2 minutes.',
    instructions: 'Respirations dynamiques pour booster l\'énergie sans café.',
    phases: [
      { type: 'rapid', duration: 20, breaths: 20, instruction: 'Respirations rapides', throughNose: true, intensity: 'strong' },
      { type: 'inhale', duration: 4, instruction: 'Grande inspire', throughNose: true, intensity: 'strong' },
      { type: 'hold', duration: 10, instruction: 'Retiens - énergie' },
      { type: 'exhale', duration: 4, instruction: 'Expire puissant', throughNose: false, intensity: 'strong' }
    ],
    rounds: 3
  },
  pomodoroPre: {
    name: 'Pomodoro Prep (2min)',
    category: 'focus',
    description: 'Préparation mentale avant 25min de travail. Calme + focus.',
    instructions: 'À faire avant chaque session Pomodoro pour maximiser ta concentration.',
    phases: [
      { type: 'inhale', duration: 4, instruction: 'Inspire - intention', throughNose: true },
      { type: 'hold', duration: 4, instruction: 'Visualise ton objectif' },
      { type: 'exhale', duration: 6, instruction: 'Expire le stress', throughNose: true, intensity: 'gentle' },
      { type: 'hold', duration: 2, instruction: 'Pause' }
    ],
    rounds: 8
  },
  pomodoroBreak: {
    name: 'Pomodoro Pause (5min)',
    category: 'focus',
    description: 'Récupération entre deux sessions Pomodoro. Recharge les batteries.',
    instructions: 'Respiration de récupération pour tes pauses de 5 minutes.',
    phases: [
      { type: 'inhale', duration: 5, instruction: 'Inspire - détends', throughNose: true, intensity: 'gentle' },
      { type: 'exhale', duration: 7, instruction: 'Expire - relâche', throughNose: true, intensity: 'gentle' }
    ],
    rounds: 25
  }
};

// ===== Systeme Audio Guide =====
class AudioGuide {
  constructor() {
    this.audioCtx = null;
    this.isEnabled = true;
    this.voiceEnabled = false;
    this.currentOscillator = null;
    this.currentGain = null;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Son d'inspiration - tonalite montante douce
  playInhale(duration, throughNose = true, intensity = 'normal') {
    if (!this.isEnabled || !state.settings.audioGuide) return;
    this.init();
    this.stopCurrent();

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Oscillateur principal (bruit filtre pour effet de souffle)
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Son different selon nez ou bouche
    if (throughNose) {
      // Nez: son plus aigu, plus "sifflant"
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(280, now);
      oscillator.frequency.linearRampToValueAtTime(420, now + duration);
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 2;
    } else {
      // Bouche: son plus grave, plus "ouvert"
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(180, now);
      oscillator.frequency.linearRampToValueAtTime(320, now + duration);
      filter.type = 'lowpass';
      filter.frequency.value = 600;
    }

    // Intensite selon le type
    const maxGain = intensity === 'strong' ? 0.25 : 0.12;

    // Envelope montante (inspire = son qui monte en volume)
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(maxGain, now + duration * 0.3);
    gainNode.gain.linearRampToValueAtTime(maxGain * 0.7, now + duration * 0.8);
    gainNode.gain.linearRampToValueAtTime(0.01, now + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);

    this.currentOscillator = oscillator;
    this.currentGain = gainNode;

    // Voix optionnelle
    if (this.voiceEnabled && state.settings.voiceGuide) {
      this.speak(throughNose ? getTranslation('inhaleNose') : getTranslation('inhaleMouth'));
    }
  }

  // Son d'expiration - tonalite descendante
  playExhale(duration, throughNose = true, intensity = 'normal') {
    if (!this.isEnabled || !state.settings.audioGuide) return;
    this.init();
    this.stopCurrent();

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    if (throughNose) {
      // Nez: son descendant doux
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(380, now);
      oscillator.frequency.linearRampToValueAtTime(220, now + duration);
      filter.type = 'bandpass';
      filter.frequency.value = 600;
      filter.Q.value = 1.5;
    } else {
      // Bouche: "whoosh" descendant plus prononce
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(300, now);
      oscillator.frequency.exponentialRampToValueAtTime(80, now + duration);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + duration);
    }

    const maxGain = intensity === 'strong' ? 0.2 : 0.1;

    // Envelope descendante (expire = volume qui descend)
    gainNode.gain.setValueAtTime(maxGain, now);
    gainNode.gain.linearRampToValueAtTime(maxGain * 0.8, now + duration * 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);

    this.currentOscillator = oscillator;
    this.currentGain = gainNode;

    if (this.voiceEnabled && state.settings.voiceGuide) {
      this.speak(throughNose ? getTranslation('exhaleNose') : getTranslation('exhaleMouth'));
    }
  }

  // Son de retention - bip statique doux
  playHold(duration, isEmpty = false) {
    if (!this.isEnabled || !state.settings.audioGuide) return;
    this.init();
    this.stopCurrent();

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Bip doux toutes les 2 secondes pour indiquer qu'on retient
    const beepInterval = 2;
    const numBeeps = Math.floor(duration / beepInterval);

    for (let i = 0; i < numBeeps; i++) {
      const beepTime = now + i * beepInterval;
      this.scheduleBeep(beepTime, isEmpty ? 280 : 350, 0.15);
    }

    if (this.voiceEnabled && state.settings.voiceGuide) {
      this.speak(isEmpty ? getTranslation('holdEmpty') : getTranslation('hold'));
    }
  }

  scheduleBeep(time, freq, duration) {
    const ctx = this.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.08, time + 0.05);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + duration);
  }

  // Son de respirations rapides - ticks rythmiques
  playRapidBreathing(duration, breaths) {
    if (!this.isEnabled || !state.settings.audioGuide) return;
    this.init();

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const interval = duration / breaths;

    for (let i = 0; i < breaths; i++) {
      const time = now + i * interval;
      const isInhale = i % 2 === 0;

      // Son court alternant haut/bas pour inspire/expire rapide
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.value = isInhale ? 400 : 280;

      filter.type = 'bandpass';
      filter.frequency.value = isInhale ? 600 : 400;

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(isInhale ? 0.12 : 0.08, time + 0.05);
      gain.gain.linearRampToValueAtTime(0, time + interval * 0.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + interval);
    }

    if (this.voiceEnabled && state.settings.voiceGuide) {
      this.speak(getTranslation('rapid'));
    }
  }

  // Signal de fin de phase
  playPhaseEnd() {
    if (!this.isEnabled || !state.settings.sounds) return;
    this.init();

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Double bip court
    this.scheduleBeep(now, 520, 0.08);
    this.scheduleBeep(now + 0.12, 620, 0.08);
  }

  // Signal de fin de round
  playRoundEnd() {
    if (!this.isEnabled || !state.settings.sounds) return;
    this.init();

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Triple bip melodique
    this.scheduleBeep(now, 440, 0.1);
    this.scheduleBeep(now + 0.15, 550, 0.1);
    this.scheduleBeep(now + 0.3, 660, 0.15);
  }

  // Signal de fin de session
  playSessionEnd() {
    if (!this.isEnabled || !state.settings.sounds) return;
    this.init();

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Melodie de completion
    const notes = [523, 659, 784, 1047]; // Do Mi Sol Do (octave)
    notes.forEach((freq, i) => {
      this.scheduleBeep(now + i * 0.2, freq, 0.25);
    });

    if (this.voiceEnabled && state.settings.voiceGuide) {
      setTimeout(() => this.speak(getTranslation('complete')), 1000);
    }
  }

  // Synthese vocale - utilise la voix selectionnee avec la bonne langue
  speak(text) {
    if (!('speechSynthesis' in window)) return;

    const voices = speechSynthesis.getVoices();
    const utterance = new SpeechSynthesisUtterance(text);

    // Utiliser la voix selectionnee dans les settings
    if (state.settings.selectedVoice) {
      const savedVoice = voices.find(v => v.name === state.settings.selectedVoice);
      if (savedVoice) {
        utterance.voice = savedVoice;
        utterance.lang = savedVoice.lang; // Utiliser la langue de la voix
        utterance.rate = 0.85;
        utterance.pitch = 1.05;
        utterance.volume = 0.75;
        // Ajuster selon le type de voix
        if (savedVoice.name.toLowerCase().includes('google')) {
          utterance.rate = 0.8;
        }
        speechSynthesis.speak(utterance);
        return;
      }
    }

    // Fallback: chercher la meilleure voix francaise
    utterance.lang = 'fr-FR';
    utterance.rate = 0.85;
    utterance.pitch = 1.05;
    utterance.volume = 0.75;

    let selectedVoice = voices.find(v => v.lang.startsWith('fr'));
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    speechSynthesis.speak(utterance);
  }

  // Obtenir la liste des voix disponibles
  getAvailableVoices() {
    if (!('speechSynthesis' in window)) return [];
    return speechSynthesis.getVoices();
  }

  stopCurrent() {
    if (this.currentOscillator) {
      try {
        this.currentOscillator.stop();
      } catch (e) {}
      this.currentOscillator = null;
    }
  }

  stop() {
    this.stopCurrent();
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }
}

// Instance globale du guide audio
const audioGuide = new AudioGuide();

// ===== Traductions des instructions vocales =====
const voiceTranslations = {
  fr: {
    inhaleNose: 'Inspire par le nez',
    inhaleMouth: 'Inspire par la bouche',
    exhaleNose: 'Expire par le nez',
    exhaleMouth: 'Expire par la bouche',
    hold: 'Retiens',
    holdEmpty: 'Retiens poumons vides',
    rapid: 'Respirations rapides',
    complete: 'Bravo, session terminée',
    prepare: 'Prépare-toi',
    relax: 'Détends-toi'
  },
  en: {
    inhaleNose: 'Breathe in through your nose',
    inhaleMouth: 'Breathe in through your mouth',
    exhaleNose: 'Breathe out through your nose',
    exhaleMouth: 'Breathe out through your mouth',
    hold: 'Hold',
    holdEmpty: 'Hold with empty lungs',
    rapid: 'Rapid breathing',
    complete: 'Well done, session complete',
    prepare: 'Get ready',
    relax: 'Relax'
  },
  es: {
    inhaleNose: 'Inspira por la nariz',
    inhaleMouth: 'Inspira por la boca',
    exhaleNose: 'Exhala por la nariz',
    exhaleMouth: 'Exhala por la boca',
    hold: 'Mantén',
    holdEmpty: 'Mantén con pulmones vacíos',
    rapid: 'Respiraciones rápidas',
    complete: 'Muy bien, sesión completada',
    prepare: 'Prepárate',
    relax: 'Relájate'
  },
  de: {
    inhaleNose: 'Atme durch die Nase ein',
    inhaleMouth: 'Atme durch den Mund ein',
    exhaleNose: 'Atme durch die Nase aus',
    exhaleMouth: 'Atme durch den Mund aus',
    hold: 'Halten',
    holdEmpty: 'Mit leeren Lungen halten',
    rapid: 'Schnelles Atmen',
    complete: 'Gut gemacht, Sitzung beendet',
    prepare: 'Mach dich bereit',
    relax: 'Entspanne dich'
  },
  it: {
    inhaleNose: 'Inspira dal naso',
    inhaleMouth: 'Inspira dalla bocca',
    exhaleNose: 'Espira dal naso',
    exhaleMouth: 'Espira dalla bocca',
    hold: 'Trattieni',
    holdEmpty: 'Trattieni a polmoni vuoti',
    rapid: 'Respirazioni rapide',
    complete: 'Bravo, sessione completata',
    prepare: 'Preparati',
    relax: 'Rilassati'
  },
  pt: {
    inhaleNose: 'Inspire pelo nariz',
    inhaleMouth: 'Inspire pela boca',
    exhaleNose: 'Expire pelo nariz',
    exhaleMouth: 'Expire pela boca',
    hold: 'Segure',
    holdEmpty: 'Segure com pulmões vazios',
    rapid: 'Respirações rápidas',
    complete: 'Parabéns, sessão concluída',
    prepare: 'Prepare-se',
    relax: 'Relaxe'
  }
};

// Obtenir la langue de la voix selectionnee
function getVoiceLanguage() {
  const voices = speechSynthesis.getVoices();
  const selectedVoiceName = state.settings.selectedVoice;

  if (selectedVoiceName) {
    const voice = voices.find(v => v.name === selectedVoiceName);
    if (voice) {
      const langCode = voice.lang.substring(0, 2).toLowerCase();
      return langCode;
    }
  }
  return 'fr'; // Default
}

// Obtenir une traduction
function getTranslation(key) {
  const lang = getVoiceLanguage();
  const translations = voiceTranslations[lang] || voiceTranslations.en;
  return translations[key] || voiceTranslations.fr[key];
}

// URLs de musiques categorisees (Archive.org - stables et libres de droits)
const musicTracks = {
  // === CALME - Pour relaxation, sommeil, coherence cardiaque ===
  calmBamboo: {
    name: 'Bamboo Flute Zen - Calme',
    url: 'https://archive.org/download/sleepingmusicz/sleeping%20music/1%20HOUR%20of%20The%20Best%20Relaxing%20Music%20Bamboo%20Flute%20-%20Meditation%20-%20Healing%20-%20Sleep%20-%20Zen%20-%20Peace.mp3',
    category: 'calme'
  },
  calmJapanese: {
    name: 'Japanese Garden - Calme',
    url: 'https://archive.org/download/meditation-music/Japanese%20Garden%20Relaxing%20Music.mp3',
    category: 'calme'
  },
  calmPiano: {
    name: 'Piano Relaxant - Calme',
    url: 'https://archive.org/download/meditation-music-for-focus/Soft%20Piano%20Music.mp3',
    category: 'calme'
  },
  calmNature: {
    name: 'Ambient Nature - Calme',
    url: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3',
    category: 'calme'
  },
  // === FOCUS - Pour concentration, travail, Pomodoro ===
  focusAlpha: {
    name: 'Alpha Waves - Focus',
    url: 'https://archive.org/download/meditation-music-for-focus/Study%20Music%20Alpha%20Waves.mp3',
    category: 'focus'
  },
  focusDeep: {
    name: 'Deep Concentration - Focus',
    url: 'https://archive.org/download/meditation-music-for-focus/Music%20for%20Deep%20Focus%20and%20Concentration.mp3',
    category: 'focus'
  },
  focusBrain: {
    name: 'Brain Stimulation - Focus',
    url: 'https://archive.org/download/meditation-music-for-focus/Deep%20Brain%20Stimulation%20Music.mp3',
    category: 'focus'
  },
  focusAmbient: {
    name: 'Ambient Study - Focus',
    url: 'https://archive.org/download/meditation-music-for-focus/Ambient%20Study%20Music%20To%20Concentrate.mp3',
    category: 'focus'
  },
  // === NEUTRE - Pour box breathing, exercices equilibres ===
  neutralBuddhist: {
    name: 'Buddhist Meditation - Neutre',
    url: 'https://archive.org/download/meditation-music/Buddhist%20Meditation%20Music%20for%20Positive%20Energy.mp3',
    category: 'neutre'
  },
  neutralSamurai: {
    name: 'Samurai Zen - Neutre',
    url: 'https://archive.org/download/meditation-music/Samurai%20Relax%20Meditation%20Music.mp3',
    category: 'neutre'
  },
  neutralForest: {
    name: 'Forest Stream - Neutre',
    url: 'https://cdn.pixabay.com/audio/2022/06/07/audio_b9bd4170e4.mp3',
    category: 'neutre'
  },
  // === ACTIVE - Pour Wim Hof, Bhastrika, Tummo ===
  activeChi: {
    name: 'Chi Activation - Active',
    url: 'https://archive.org/download/meditation-music-for-focus/3%20Hours%20Chi%20Activation%20Music.mp3',
    category: 'active'
  },
  activeBinaural: {
    name: 'Binaural Power - Active',
    url: 'https://archive.org/download/meditation-music-for-focus/Extremely%20Powerful%20Brainwave%20Binaural.mp3',
    category: 'active'
  },
  activeIntelligence: {
    name: 'Super Intelligence - Active',
    url: 'https://archive.org/download/meditation-music-for-focus/Super%20Intelligence.mp3',
    category: 'active'
  }
};

// ===== Systeme de Particules Futuriste =====
class ParticleSystem {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.isActive = false;
    this.breathPhase = 'idle'; // idle, inhale, hold, exhale
    this.animationId = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = 400;
    this.canvas.height = 400;
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
  }

  start() {
    this.isActive = true;
    this.particles = [];
    this.animate();
  }

  stop() {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  setPhase(phase) {
    this.breathPhase = phase;
  }

  createParticle() {
    const angle = Math.random() * Math.PI * 2;
    const colors = ['#00f5ff', '#8b5cf6', '#ff00ff', '#00ff88'];

    if (this.breathPhase === 'inhale') {
      // Particules venant de l'exterieur vers le centre
      const distance = 150 + Math.random() * 50;
      return {
        x: this.centerX + Math.cos(angle) * distance,
        y: this.centerY + Math.sin(angle) * distance,
        vx: -Math.cos(angle) * (1 + Math.random()),
        vy: -Math.sin(angle) * (1 + Math.random()),
        size: 2 + Math.random() * 3,
        color: colors[0],
        alpha: 0.8,
        life: 1
      };
    } else if (this.breathPhase === 'exhale') {
      // Particules du centre vers l'exterieur
      const distance = 30 + Math.random() * 20;
      return {
        x: this.centerX + Math.cos(angle) * distance,
        y: this.centerY + Math.sin(angle) * distance,
        vx: Math.cos(angle) * (1.5 + Math.random()),
        vy: Math.sin(angle) * (1.5 + Math.random()),
        size: 2 + Math.random() * 3,
        color: colors[2],
        alpha: 0.8,
        life: 1
      };
    } else if (this.breathPhase === 'hold') {
      // Particules orbitant autour du centre
      const distance = 70 + Math.random() * 30;
      return {
        x: this.centerX + Math.cos(angle) * distance,
        y: this.centerY + Math.sin(angle) * distance,
        angle: angle,
        distance: distance,
        speed: 0.01 + Math.random() * 0.02,
        size: 1 + Math.random() * 2,
        color: colors[1],
        alpha: 0.6,
        life: 1,
        orbit: true
      };
    }
    return null;
  }

  animate() {
    if (!this.isActive || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Creer de nouvelles particules
    if (this.breathPhase !== 'idle' && Math.random() > 0.7) {
      const p = this.createParticle();
      if (p) this.particles.push(p);
    }

    // Limiter le nombre de particules
    if (this.particles.length > 100) {
      this.particles = this.particles.slice(-100);
    }

    // Mettre a jour et dessiner les particules
    this.particles = this.particles.filter(p => {
      // Mise a jour position
      if (p.orbit) {
        p.angle += p.speed;
        p.x = this.centerX + Math.cos(p.angle) * p.distance;
        p.y = this.centerY + Math.sin(p.angle) * p.distance;
      } else {
        p.x += p.vx;
        p.y += p.vy;
      }

      p.life -= 0.01;
      p.alpha = p.life * 0.8;

      // Dessiner
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fill();

      // Effet de glow
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 10;

      return p.life > 0;
    });

    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 0;

    this.animationId = requestAnimationFrame(() => this.animate());
  }
}

// Instance globale
let particleSystem = null;

// ===== Initialisation =====
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initNavigation();
  initBreathing();
  initCalisthenics();
  initPomodoro();
  initSettings();
  initMusic();
  initReminders();
  updateStats();
  renderHistory();
  updateHistoryStats();

  // Initialiser le systeme de particules
  particleSystem = new ParticleSystem('particles-canvas');

  // Precharger les voix pour la synthese vocale
  if ('speechSynthesis' in window) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  }
});

// ===== Chargement/Sauvegarde données =====
function loadData() {
  try {
    const savedSettings = localStorage.getItem('breathflow_settings');
    if (savedSettings) {
      state.settings = { ...state.settings, ...JSON.parse(savedSettings) };
    }

    const savedStats = localStorage.getItem('breathflow_stats');
    if (savedStats) {
      state.stats = { ...state.stats, ...JSON.parse(savedStats) };
    }

    const savedWorkouts = localStorage.getItem('breathflow_workouts');
    if (savedWorkouts) {
      state.workouts = JSON.parse(savedWorkouts);
    }

    const savedHistory = localStorage.getItem('breathflow_history');
    if (savedHistory) {
      state.history = JSON.parse(savedHistory);
    }

    const savedReminders = localStorage.getItem('breathflow_reminders');
    if (savedReminders) {
      state.reminders = { ...state.reminders, ...JSON.parse(savedReminders) };
    }

    // Appliquer le thème (dark par defaut)
    document.documentElement.setAttribute('data-theme', state.settings.darkMode ? 'dark' : 'light');
    document.getElementById('dark-mode-toggle').checked = state.settings.darkMode;

    // Appliquer les settings audio
    audioGuide.isEnabled = state.settings.audioGuide;
    audioGuide.voiceEnabled = state.settings.voiceGuide;
  } catch (e) {
    console.error('Erreur chargement données:', e);
  }
}

function saveData() {
  try {
    localStorage.setItem('breathflow_settings', JSON.stringify(state.settings));
    localStorage.setItem('breathflow_stats', JSON.stringify(state.stats));
    localStorage.setItem('breathflow_workouts', JSON.stringify(state.workouts));
    localStorage.setItem('breathflow_history', JSON.stringify(state.history));
    localStorage.setItem('breathflow_reminders', JSON.stringify(state.reminders));
  } catch (e) {
    console.error('Erreur sauvegarde données:', e);
  }
}

// ===== Navigation =====
function initNavigation() {
  const menuBtn = document.getElementById('menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const closeBtn = document.getElementById('close-sidebar');
  const navLinks = document.querySelectorAll('.nav-link');
  const homeCards = document.querySelectorAll('.home-card');

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  }

  menuBtn.addEventListener('click', openSidebar);
  closeBtn.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      navigateTo(page);
      closeSidebar();
    });
  });

  homeCards.forEach(card => {
    card.addEventListener('click', () => {
      const page = card.dataset.goto;
      navigateTo(page);
    });
  });
}

function navigateTo(pageName) {
  // Masquer toutes les pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  // Afficher la page cible
  const targetPage = document.getElementById(`page-${pageName}`);
  if (targetPage) {
    targetPage.classList.add('active');
    state.currentPage = pageName;

    // Mettre à jour le titre
    const titles = {
      home: 'BreathFlow',
      breathing: 'Respiration',
      pomodoro: 'Pomodoro',
      history: 'Historique',
      calisthenics: 'Calisthénie',
      settings: 'Réglages'
    };
    document.getElementById('page-title').textContent = titles[pageName] || 'BreathFlow';

    // Mettre à jour nav active
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === pageName);
    });
  }

  // Reset breathing view si on quitte
  if (pageName === 'breathing') {
    showBreathingList();
  }
}

// ===== Module Respiration =====
function initBreathing() {
  const techniqueCards = document.querySelectorAll('.technique-card');
  const backBtn = document.getElementById('back-to-list');
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const stopBtn = document.getElementById('stop-btn');

  techniqueCards.forEach(card => {
    card.addEventListener('click', () => {
      const techniqueId = card.dataset.technique;
      showBreathingSession(techniqueId);
    });
  });

  backBtn.addEventListener('click', () => {
    stopSession();
    showBreathingList();
  });

  startBtn.addEventListener('click', startSession);
  pauseBtn.addEventListener('click', togglePause);
  stopBtn.addEventListener('click', stopSession);
}

function showBreathingList() {
  document.getElementById('breathing-list').classList.remove('hidden');
  document.getElementById('breathing-session').classList.add('hidden');
  stopSession();
}

function showBreathingSession(techniqueId) {
  const technique = techniques[techniqueId];
  if (!technique) return;

  state.breathingSession = {
    techniqueId,
    technique,
    currentRound: 1,
    currentPhase: 0,
    isRunning: false,
    isPaused: false,
    startTime: null,
    timer: null,
    phaseTimer: null
  };

  document.getElementById('technique-title').textContent = technique.name;
  document.getElementById('technique-description').textContent = technique.description;
  document.getElementById('current-round').textContent = `1/${technique.rounds}`;
  document.getElementById('session-time').textContent = '0:00';
  document.getElementById('breath-instruction').textContent = 'Prêt ?';
  document.getElementById('breath-counter').textContent = '';

  // Reset cercle
  const circle = document.getElementById('breath-circle');
  circle.classList.remove('inhale', 'hold', 'exhale', 'active');

  // Reset boutons
  document.getElementById('start-btn').classList.remove('hidden');
  document.getElementById('pause-btn').classList.add('hidden');
  document.getElementById('stop-btn').classList.add('hidden');

  document.getElementById('breathing-list').classList.add('hidden');
  document.getElementById('breathing-session').classList.remove('hidden');
}

function startSession() {
  if (!state.breathingSession) return;

  // Initialiser le contexte audio (doit etre fait apres une interaction utilisateur)
  audioGuide.init();

  // Demarrer les particules
  if (particleSystem) {
    particleSystem.start();
  }

  // Activer les animations du container
  const container = document.getElementById('breath-container');
  if (container) container.classList.add('breathing');

  const session = state.breathingSession;
  session.isRunning = true;
  session.startTime = Date.now();

  document.getElementById('start-btn').classList.add('hidden');
  document.getElementById('pause-btn').classList.remove('hidden');
  document.getElementById('stop-btn').classList.remove('hidden');

  // Timer global
  session.timer = setInterval(updateSessionTime, 1000);

  // Démarrer les phases
  runPhase();
}

function togglePause() {
  if (!state.breathingSession) return;

  const session = state.breathingSession;
  session.isPaused = !session.isPaused;

  // Arreter les sons si on met en pause
  if (session.isPaused) {
    audioGuide.stop();
  }

  const pauseBtn = document.getElementById('pause-btn');
  pauseBtn.innerHTML = session.isPaused
    ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Reprendre'
    : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pause';
}

function stopSession() {
  if (!state.breathingSession) return;

  const session = state.breathingSession;

  if (session.timer) clearInterval(session.timer);
  if (session.phaseTimer) clearTimeout(session.phaseTimer);
  if (session.countdownInterval) clearInterval(session.countdownInterval);

  // Arreter les sons
  audioGuide.stop();

  // Arreter les particules
  if (particleSystem) {
    particleSystem.stop();
  }

  // Desactiver les animations du container
  const container = document.getElementById('breath-container');
  if (container) container.classList.remove('breathing');

  // Si session terminée correctement, incrémenter stats
  if (session.isRunning && session.currentRound >= session.technique.rounds) {
    state.stats.breathingSessions++;
    updateStreak();
    saveData();
    updateStats();
  }

  session.isRunning = false;

  // Reset UI
  document.getElementById('start-btn').classList.remove('hidden');
  document.getElementById('pause-btn').classList.add('hidden');
  document.getElementById('stop-btn').classList.add('hidden');

  const circle = document.getElementById('breath-circle');
  circle.classList.remove('inhale', 'hold', 'exhale', 'active');
  document.getElementById('breath-instruction').textContent = 'Terminé';
  document.getElementById('breath-counter').textContent = '';
}

function runPhase() {
  const session = state.breathingSession;
  if (!session || !session.isRunning) return;

  if (session.isPaused) {
    session.phaseTimer = setTimeout(runPhase, 100);
    return;
  }

  const technique = session.technique;
  const phase = technique.phases[session.currentPhase];

  if (!phase) {
    // Fin du round
    session.currentRound++;
    if (session.currentRound > technique.rounds) {
      // Fin de la session
      completeSession();
      return;
    }
    session.currentPhase = 0;
    document.getElementById('current-round').textContent = `${session.currentRound}/${technique.rounds}`;

    // Petite pause entre rounds
    if (state.settings.vibration && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    audioGuide.playRoundEnd();

    session.phaseTimer = setTimeout(runPhase, 1000);
    return;
  }

  // Extraire les parametres audio de la phase
  const throughNose = phase.throughNose !== false; // Par defaut nez
  const intensity = phase.intensity || 'normal';

  // Exécuter la phase
  const circle = document.getElementById('breath-circle');
  const instruction = document.getElementById('breath-instruction');
  const counter = document.getElementById('breath-counter');

  circle.classList.remove('inhale', 'hold', 'exhale');

  if (phase.type === 'rapid') {
    // Respirations rapides (Wim Hof, Bhastrika, etc.)
    instruction.textContent = phase.instruction;
    circle.classList.add('active');

    // Jouer le son des respirations rapides
    audioGuide.playRapidBreathing(phase.duration, phase.breaths);

    let breathCount = phase.breaths;
    const breathInterval = (phase.duration * 1000) / phase.breaths;

    counter.textContent = breathCount;

    if (session.countdownInterval) clearInterval(session.countdownInterval);
    session.countdownInterval = setInterval(() => {
      if (session.isPaused) return;
      breathCount--;
      counter.textContent = breathCount > 0 ? breathCount : '';

      // Alterner animation pour respiration rapide
      if (breathCount % 2 === 0) {
        circle.style.transform = 'translate(-50%, -50%) scale(0.9)';
      } else {
        circle.style.transform = 'translate(-50%, -50%) scale(0.7)';
      }

      if (breathCount <= 0) {
        clearInterval(session.countdownInterval);
      }
    }, breathInterval);

    session.phaseTimer = setTimeout(() => {
      clearInterval(session.countdownInterval);
      circle.classList.remove('active');
      circle.style.transform = '';
      session.currentPhase++;
      audioGuide.playPhaseEnd();
      runPhase();
    }, phase.duration * 1000);

  } else if (phase.type === 'holdEmpty') {
    // Rétention poumons vides (spécial Wim Hof)
    instruction.textContent = phase.instruction;
    circle.classList.add('exhale');

    // Son de retention poumons vides
    audioGuide.playHold(phase.duration, true);

    let remaining = phase.duration;
    counter.textContent = remaining;

    if (session.countdownInterval) clearInterval(session.countdownInterval);
    session.countdownInterval = setInterval(() => {
      if (session.isPaused) return;
      remaining--;
      counter.textContent = remaining > 0 ? remaining : '';
    }, 1000);

    session.phaseTimer = setTimeout(() => {
      clearInterval(session.countdownInterval);
      session.currentPhase++;

      if (state.settings.vibration && navigator.vibrate) {
        navigator.vibrate(200);
      }
      audioGuide.playPhaseEnd();
      playBell();

      runPhase();
    }, phase.duration * 1000);

  } else {
    // Phases normales
    instruction.textContent = phase.instruction;

    if (phase.type === 'inhale') {
      circle.classList.add('inhale');
      circle.style.transitionDuration = `${phase.duration}s`;
      // Jouer le son d'inspiration
      audioGuide.playInhale(phase.duration, throughNose, intensity);
      // Particules vers le centre
      if (particleSystem) particleSystem.setPhase('inhale');
    } else if (phase.type === 'exhale') {
      circle.classList.add('exhale');
      circle.style.transitionDuration = `${phase.duration}s`;
      // Jouer le son d'expiration
      audioGuide.playExhale(phase.duration, throughNose, intensity);
      // Particules vers l'exterieur
      if (particleSystem) particleSystem.setPhase('exhale');
    } else if (phase.type === 'hold') {
      circle.classList.add('hold');
      // Jouer le son de retention
      audioGuide.playHold(phase.duration, false);
      // Particules en orbite
      if (particleSystem) particleSystem.setPhase('hold');
    }

    // Countdown
    let remaining = Math.ceil(phase.duration);
    counter.textContent = remaining;

    if (session.countdownInterval) clearInterval(session.countdownInterval);
    session.countdownInterval = setInterval(() => {
      if (session.isPaused) return;
      remaining--;
      counter.textContent = remaining > 0 ? remaining : '';
    }, 1000);

    session.phaseTimer = setTimeout(() => {
      clearInterval(session.countdownInterval);
      session.currentPhase++;
      audioGuide.playPhaseEnd();
      runPhase();
    }, phase.duration * 1000);
  }

  // Vibration au changement de phase
  if (state.settings.vibration && navigator.vibrate) {
    navigator.vibrate(50);
  }
}

function completeSession() {
  const session = state.breathingSession;

  // Calculer la duree de la session
  const duration = Math.floor((Date.now() - session.startTime) / 1000);

  // Ajouter a l'historique
  state.history.unshift({
    id: Date.now(),
    date: new Date().toISOString(),
    technique: session.technique.name,
    techniqueId: session.techniqueId,
    category: session.technique.category,
    duration: duration,
    rounds: session.technique.rounds
  });

  // Garder seulement les 50 dernieres sessions
  if (state.history.length > 50) {
    state.history = state.history.slice(0, 50);
  }

  state.stats.breathingSessions++;
  updateStreak();
  saveData();
  updateStats();
  renderHistory();

  if (session.timer) clearInterval(session.timer);

  document.getElementById('breath-instruction').textContent = 'Bravo !';
  document.getElementById('breath-counter').textContent = '';

  const circle = document.getElementById('breath-circle');
  circle.classList.remove('inhale', 'hold', 'exhale', 'active');

  if (state.settings.vibration && navigator.vibrate) {
    navigator.vibrate([100, 100, 100, 100, 200]);
  }
  audioGuide.playSessionEnd();
  playBell();

  session.isRunning = false;

  document.getElementById('start-btn').classList.remove('hidden');
  document.getElementById('start-btn').innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg> Recommencer';
  document.getElementById('pause-btn').classList.add('hidden');
  document.getElementById('stop-btn').classList.add('hidden');
}

function updateSessionTime() {
  if (!state.breathingSession || !state.breathingSession.startTime) return;

  const elapsed = Math.floor((Date.now() - state.breathingSession.startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  document.getElementById('session-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function playBell() {
  if (!state.settings.sounds) return;

  try {
    const bell = document.getElementById('bell-sound');
    bell.currentTime = 0;
    bell.play().catch(() => {});
  } catch (e) {}
}

// ===== Module Musique =====
function initMusic() {
  const musicSelect = document.getElementById('music-select');
  const musicToggle = document.getElementById('music-toggle');
  const volumeSlider = document.getElementById('volume-slider');
  const customMusic = document.getElementById('custom-music');
  const audioPlayer = document.getElementById('audio-player');

  musicSelect.addEventListener('change', () => {
    const value = musicSelect.value;

    if (value === 'custom') {
      customMusic.click();
      return;
    }

    if (value && musicTracks[value]) {
      audioPlayer.src = musicTracks[value].url;
      audioPlayer.loop = true;
    } else {
      audioPlayer.pause();
      audioPlayer.src = '';
      musicToggle.classList.remove('playing');
      state.isPlaying = false;
    }
  });

  customMusic.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      audioPlayer.src = url;
      audioPlayer.loop = true;
    }
  });

  musicToggle.addEventListener('click', () => {
    if (!audioPlayer.src) {
      // Sélectionner la première piste par défaut
      musicSelect.value = 'hangdrum1';
      audioPlayer.src = musicTracks.hangdrum1.url;
      audioPlayer.loop = true;
    }

    if (state.isPlaying) {
      audioPlayer.pause();
      musicToggle.classList.remove('playing');
    } else {
      audioPlayer.play().catch(() => {});
      musicToggle.classList.add('playing');
    }
    state.isPlaying = !state.isPlaying;
  });

  volumeSlider.addEventListener('input', () => {
    audioPlayer.volume = volumeSlider.value / 100;
  });

  audioPlayer.volume = 0.5;
}

// ===== Module Calisthénie =====
function initCalisthenics() {
  const addBtn = document.getElementById('add-workout-btn');
  const modal = document.getElementById('workout-modal');
  const closeModal = document.getElementById('close-modal');
  const cancelBtn = document.getElementById('cancel-workout');
  const form = document.getElementById('workout-form');
  const addExerciseBtn = document.getElementById('add-exercise-btn');

  addBtn.addEventListener('click', () => {
    openWorkoutModal();
  });

  closeModal.addEventListener('click', () => closeWorkoutModal());
  cancelBtn.addEventListener('click', () => closeWorkoutModal());

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeWorkoutModal();
  });

  addExerciseBtn.addEventListener('click', addExerciseInput);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    saveWorkout();
  });

  renderWorkouts();
}

function openWorkoutModal(editId = null) {
  const modal = document.getElementById('workout-modal');
  const title = document.getElementById('modal-title');
  const dateInput = document.getElementById('workout-date');
  const notesInput = document.getElementById('workout-notes');
  const container = document.getElementById('exercises-container');

  container.innerHTML = '';

  if (editId !== null) {
    const workout = state.workouts.find(w => w.id === editId);
    if (workout) {
      title.textContent = 'Modifier séance';
      dateInput.value = workout.date;
      notesInput.value = workout.notes || '';

      workout.exercises.forEach(ex => {
        addExerciseInput(ex.name, ex.sets);
      });

      modal.dataset.editId = editId;
    }
  } else {
    title.textContent = 'Nouvelle séance';
    dateInput.value = new Date().toISOString().split('T')[0];
    notesInput.value = '';
    addExerciseInput();
    delete modal.dataset.editId;
  }

  modal.classList.remove('hidden');
}

function closeWorkoutModal() {
  document.getElementById('workout-modal').classList.add('hidden');
}

function addExerciseInput(name = '', sets = '') {
  const container = document.getElementById('exercises-container');
  const div = document.createElement('div');
  div.className = 'exercise-input';
  div.innerHTML = `
    <input type="text" placeholder="Exercice (ex: Pompes)" value="${name}" required>
    <input type="text" placeholder="Séries (ex: 3x10)" value="${sets}" required>
    <button type="button" onclick="this.parentElement.remove()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
  container.appendChild(div);
}

function saveWorkout() {
  const modal = document.getElementById('workout-modal');
  const date = document.getElementById('workout-date').value;
  const notes = document.getElementById('workout-notes').value;
  const exerciseInputs = document.querySelectorAll('#exercises-container .exercise-input');

  const exercises = [];
  exerciseInputs.forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs[0].value && inputs[1].value) {
      exercises.push({
        name: inputs[0].value,
        sets: inputs[1].value
      });
    }
  });

  if (exercises.length === 0) {
    alert('Ajoute au moins un exercice');
    return;
  }

  const editId = modal.dataset.editId;

  if (editId) {
    // Modification
    const idx = state.workouts.findIndex(w => w.id === parseInt(editId));
    if (idx !== -1) {
      state.workouts[idx] = {
        ...state.workouts[idx],
        date,
        exercises,
        notes
      };
    }
  } else {
    // Nouvelle séance
    const workout = {
      id: Date.now(),
      date,
      exercises,
      notes
    };
    state.workouts.unshift(workout);
    state.stats.workouts++;
    updateStreak();
  }

  saveData();
  renderWorkouts();
  updateStats();
  closeWorkoutModal();
}

function deleteWorkout(id) {
  if (!confirm('Supprimer cette séance ?')) return;

  state.workouts = state.workouts.filter(w => w.id !== id);
  saveData();
  renderWorkouts();
}

function renderWorkouts() {
  const container = document.getElementById('workouts-list');

  if (state.workouts.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucune séance enregistrée.<br>Commence par ajouter ta première séance !</p>';
    return;
  }

  container.innerHTML = state.workouts.map(workout => {
    const formattedDate = new Date(workout.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    return `
      <div class="workout-card">
        <div class="workout-header">
          <span class="workout-date">${formattedDate}</span>
          <div class="workout-actions">
            <button onclick="openWorkoutModal(${workout.id})" title="Modifier">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button onclick="deleteWorkout(${workout.id})" class="delete" title="Supprimer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="workout-exercises">
          ${workout.exercises.map(ex => `
            <div class="exercise-row">
              <span class="exercise-name">${ex.name}</span>
              <span class="exercise-sets">${ex.sets}</span>
            </div>
          `).join('')}
        </div>
        ${workout.notes ? `<div class="workout-notes">${workout.notes}</div>` : ''}
      </div>
    `;
  }).join('');
}

// Rendre les fonctions accessibles globalement
window.openWorkoutModal = openWorkoutModal;
window.deleteWorkout = deleteWorkout;

// ===== Module Settings =====
function initSettings() {
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  const vibrationToggle = document.getElementById('vibration-toggle');
  const soundToggle = document.getElementById('sound-toggle');
  const audioGuideToggle = document.getElementById('audio-guide-toggle');
  const voiceGuideToggle = document.getElementById('voice-guide-toggle');
  const themeBtn = document.getElementById('theme-btn');
  const exportBtn = document.getElementById('export-btn');
  const importInput = document.getElementById('import-input');
  const resetBtn = document.getElementById('reset-btn');

  // Load saved settings
  vibrationToggle.checked = state.settings.vibration;
  soundToggle.checked = state.settings.sounds;
  if (audioGuideToggle) audioGuideToggle.checked = state.settings.audioGuide;
  if (voiceGuideToggle) voiceGuideToggle.checked = state.settings.voiceGuide;

  darkModeToggle.addEventListener('change', () => {
    state.settings.darkMode = darkModeToggle.checked;
    document.documentElement.setAttribute('data-theme', state.settings.darkMode ? 'dark' : 'light');
    saveData();
  });

  themeBtn.addEventListener('click', () => {
    state.settings.darkMode = !state.settings.darkMode;
    darkModeToggle.checked = state.settings.darkMode;
    document.documentElement.setAttribute('data-theme', state.settings.darkMode ? 'dark' : 'light');
    saveData();
  });

  vibrationToggle.addEventListener('change', () => {
    state.settings.vibration = vibrationToggle.checked;
    saveData();
  });

  soundToggle.addEventListener('change', () => {
    state.settings.sounds = soundToggle.checked;
    saveData();
  });

  if (audioGuideToggle) {
    audioGuideToggle.addEventListener('change', () => {
      state.settings.audioGuide = audioGuideToggle.checked;
      audioGuide.isEnabled = audioGuideToggle.checked;
      saveData();
    });
  }

  if (voiceGuideToggle) {
    voiceGuideToggle.addEventListener('change', () => {
      state.settings.voiceGuide = voiceGuideToggle.checked;
      audioGuide.voiceEnabled = voiceGuideToggle.checked;
      saveData();
    });
  }

  // Bouton test voix
  const testVoiceBtn = document.getElementById('test-voice-btn');
  if (testVoiceBtn) {
    testVoiceBtn.addEventListener('click', () => {
      audioGuide.speak('Inspire doucement... Expire lentement... Tu te sens bien.');
    });
  }

  // Selecteur de voix
  const voiceSelect = document.getElementById('voice-select');
  const voiceCountEl = document.getElementById('voice-count');
  const refreshVoicesBtn = document.getElementById('refresh-voices-btn');

  if (voiceSelect) {
    // Fonction pour populer les voix
    const populateVoices = () => {
      const voices = speechSynthesis.getVoices();
      voiceSelect.innerHTML = '';

      // Afficher le nombre de voix detectees
      if (voiceCountEl) {
        voiceCountEl.textContent = `${voices.length} voix détectées`;
      }

      // Filtrer les voix par langue
      const frenchVoices = voices.filter(v => v.lang.startsWith('fr'));
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));
      const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
      const germanVoices = voices.filter(v => v.lang.startsWith('de'));
      const italianVoices = voices.filter(v => v.lang.startsWith('it'));
      const portugueseVoices = voices.filter(v => v.lang.startsWith('pt'));

      // Option par defaut
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = 'Auto (meilleure voix)';
      voiceSelect.appendChild(defaultOpt);

      // Fonction helper pour creer un groupe
      const addGroup = (label, voiceList, maxCount = 8) => {
        if (voiceList.length > 0) {
          const group = document.createElement('optgroup');
          group.label = `${label} (${voiceList.length})`;
          voiceList.slice(0, maxCount).forEach(voice => {
            const opt = document.createElement('option');
            opt.value = voice.name;
            opt.textContent = voice.name.replace('Microsoft ', '').replace('Google ', '').replace(' Online (Natural)', '');
            if (voice.name === state.settings.selectedVoice) opt.selected = true;
            group.appendChild(opt);
          });
          voiceSelect.appendChild(group);
        }
      };

      // Ajouter les groupes par langue
      addGroup('Français', frenchVoices);
      addGroup('English', englishVoices);
      addGroup('Español', spanishVoices);
      addGroup('Deutsch', germanVoices);
      addGroup('Italiano', italianVoices);
      addGroup('Português', portugueseVoices);

      console.log('Voix chargées:', voices.length, voices.map(v => v.name + ' (' + v.lang + ')'));
    };

    // Les voix peuvent charger de maniere asynchrone
    populateVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = populateVoices;
    }

    // Bouton rafraichir les voix
    if (refreshVoicesBtn) {
      refreshVoicesBtn.addEventListener('click', () => {
        // Forcer le rechargement des voix
        speechSynthesis.cancel();
        setTimeout(() => {
          populateVoices();
          // Feedback visuel
          refreshVoicesBtn.textContent = 'OK !';
          setTimeout(() => {
            refreshVoicesBtn.textContent = 'Rafraîchir';
          }, 1000);
        }, 100);
      });
    }

    voiceSelect.addEventListener('change', () => {
      state.settings.selectedVoice = voiceSelect.value;
      saveData();
      // Test immediat de la nouvelle voix
      audioGuide.speak('Voix sélectionnée');
    });
  }

  // Rappels
  const remindersToggle = document.getElementById('reminders-toggle');
  const remindersConfig = document.getElementById('reminders-times');
  const addReminderBtn = document.getElementById('add-reminder-btn');

  if (remindersToggle) {
    remindersToggle.checked = state.reminders.enabled;
    if (state.reminders.enabled) {
      remindersConfig.classList.remove('hidden');
    }

    remindersToggle.addEventListener('change', async () => {
      // Demander permission notifications si pas encore fait
      if (remindersToggle.checked && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          remindersToggle.checked = false;
          alert('Tu dois autoriser les notifications pour activer les rappels.');
          return;
        }
      }

      state.reminders.enabled = remindersToggle.checked;
      remindersConfig.classList.toggle('hidden', !remindersToggle.checked);
      saveData();
    });

    renderReminderTimes();
  }

  if (addReminderBtn) {
    addReminderBtn.addEventListener('click', () => {
      const timeInput = document.getElementById('new-reminder-time');
      const time = timeInput.value;
      if (time && !state.reminders.times.includes(time)) {
        state.reminders.times.push(time);
        state.reminders.times.sort();
        saveData();
        renderReminderTimes();
      }
    });
  }

  // Message personnalise pour les rappels
  const customMessageInput = document.getElementById('custom-reminder-message');
  if (customMessageInput) {
    // Charger le message sauvegarde
    customMessageInput.value = state.reminders.customMessage || '';

    // Sauvegarder quand l'utilisateur tape
    customMessageInput.addEventListener('input', () => {
      state.reminders.customMessage = customMessageInput.value.trim();
      saveData();
    });
  }

  exportBtn.addEventListener('click', exportData);
  importInput.addEventListener('change', importData);
  resetBtn.addEventListener('click', resetData);
}

function renderReminderTimes() {
  const container = document.getElementById('reminder-times-list');
  if (!container) return;

  container.innerHTML = state.reminders.times.map(time => `
    <span class="reminder-time-tag">
      ${time}
      <button onclick="removeReminderTime('${time}')">&times;</button>
    </span>
  `).join('');
}

function removeReminderTime(time) {
  state.reminders.times = state.reminders.times.filter(t => t !== time);
  saveData();
  renderReminderTimes();
}

// Rendre accessible globalement
window.removeReminderTime = removeReminderTime;

function exportData() {
  const data = {
    settings: state.settings,
    stats: state.stats,
    workouts: state.workouts,
    exportDate: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `breathflow-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);

      if (data.settings) state.settings = { ...state.settings, ...data.settings };
      if (data.stats) state.stats = { ...state.stats, ...data.stats };
      if (data.workouts) state.workouts = data.workouts;

      saveData();
      location.reload();
    } catch (err) {
      alert('Erreur lors de l\'import du fichier');
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm('Supprimer toutes les données ? Cette action est irréversible.')) return;

  localStorage.removeItem('breathflow_settings');
  localStorage.removeItem('breathflow_stats');
  localStorage.removeItem('breathflow_workouts');
  location.reload();
}

// ===== Module Pomodoro =====
let pomodoroTimer = null;
let pomodoroSettings = {
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15
};

function initPomodoro() {
  const startBtn = document.getElementById('pomodoro-start');
  const pauseBtn = document.getElementById('pomodoro-pause');
  const resetBtn = document.getElementById('pomodoro-reset');
  const breathBtn = document.getElementById('pomodoro-breath-btn');

  if (!startBtn) return;

  startBtn.addEventListener('click', startPomodoro);
  pauseBtn.addEventListener('click', pausePomodoro);
  resetBtn.addEventListener('click', resetPomodoro);

  if (breathBtn) {
    breathBtn.addEventListener('click', () => {
      navigateTo('breathing');
      setTimeout(() => {
        showBreathingSession('pomodoroPre');
      }, 100);
    });
  }

  // Time adjustment buttons
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const workEl = document.getElementById('work-duration');
      const breakEl = document.getElementById('break-duration');

      if (action === 'work-plus' && pomodoroSettings.workDuration < 60) {
        pomodoroSettings.workDuration += 5;
      } else if (action === 'work-minus' && pomodoroSettings.workDuration > 5) {
        pomodoroSettings.workDuration -= 5;
      } else if (action === 'break-plus' && pomodoroSettings.breakDuration < 30) {
        pomodoroSettings.breakDuration += 1;
      } else if (action === 'break-minus' && pomodoroSettings.breakDuration > 1) {
        pomodoroSettings.breakDuration -= 1;
      }

      workEl.textContent = pomodoroSettings.workDuration;
      breakEl.textContent = pomodoroSettings.breakDuration;

      if (!state.pomodoro.isRunning) {
        state.pomodoro.timeLeft = pomodoroSettings.workDuration * 60;
        updatePomodoroDisplay();
      }
    });
  });

  updatePomodoroDisplay();
}

function startPomodoro() {
  state.pomodoro.isRunning = true;

  document.getElementById('pomodoro-start').classList.add('hidden');
  document.getElementById('pomodoro-pause').classList.remove('hidden');

  pomodoroTimer = setInterval(() => {
    state.pomodoro.timeLeft--;

    if (state.pomodoro.timeLeft <= 0) {
      pomodoroPhaseComplete();
    }

    updatePomodoroDisplay();
  }, 1000);
}

function pausePomodoro() {
  state.pomodoro.isRunning = false;
  clearInterval(pomodoroTimer);

  document.getElementById('pomodoro-start').classList.remove('hidden');
  document.getElementById('pomodoro-pause').classList.add('hidden');
  document.getElementById('pomodoro-start').innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M8 5v14l11-7z"/>
    </svg>
    Reprendre
  `;
}

function resetPomodoro() {
  state.pomodoro.isRunning = false;
  state.pomodoro.mode = 'work';
  state.pomodoro.timeLeft = pomodoroSettings.workDuration * 60;
  state.pomodoro.sessionsCompleted = 0;
  clearInterval(pomodoroTimer);

  document.getElementById('pomodoro-start').classList.remove('hidden');
  document.getElementById('pomodoro-pause').classList.add('hidden');
  document.getElementById('pomodoro-start').innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M8 5v14l11-7z"/>
    </svg>
    Démarrer
  `;

  updatePomodoroDisplay();
}

function pomodoroPhaseComplete() {
  clearInterval(pomodoroTimer);
  state.pomodoro.isRunning = false;

  // Notification
  sendNotification(
    state.pomodoro.mode === 'work' ? 'Pause !' : 'Au travail !',
    state.pomodoro.mode === 'work'
      ? 'Bravo ! Prends une pause de ' + pomodoroSettings.breakDuration + ' minutes.'
      : 'La pause est terminée. C\'est reparti !'
  );

  // Vibration
  if (state.settings.vibration && navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }

  // Son
  audioGuide.playSessionEnd();

  if (state.pomodoro.mode === 'work') {
    state.pomodoro.sessionsCompleted++;
    // Longue pause apres 4 sessions
    if (state.pomodoro.sessionsCompleted % 4 === 0) {
      state.pomodoro.mode = 'longBreak';
      state.pomodoro.timeLeft = pomodoroSettings.longBreakDuration * 60;
    } else {
      state.pomodoro.mode = 'break';
      state.pomodoro.timeLeft = pomodoroSettings.breakDuration * 60;
    }
  } else {
    state.pomodoro.mode = 'work';
    state.pomodoro.timeLeft = pomodoroSettings.workDuration * 60;
  }

  document.getElementById('pomodoro-start').classList.remove('hidden');
  document.getElementById('pomodoro-pause').classList.add('hidden');
  document.getElementById('pomodoro-start').innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M8 5v14l11-7z"/>
    </svg>
    ${state.pomodoro.mode === 'work' ? 'Démarrer' : 'Commencer la pause'}
  `;

  updatePomodoroDisplay();
}

function updatePomodoroDisplay() {
  const minutes = Math.floor(state.pomodoro.timeLeft / 60);
  const seconds = state.pomodoro.timeLeft % 60;

  const timeEl = document.getElementById('pomodoro-time');
  const modeEl = document.getElementById('pomodoro-mode');
  const sessionsEl = document.getElementById('pomodoro-sessions');

  if (timeEl) {
    timeEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  if (modeEl) {
    const modeLabels = {
      work: 'TRAVAIL',
      break: 'PAUSE',
      longBreak: 'LONGUE PAUSE'
    };
    modeEl.textContent = modeLabels[state.pomodoro.mode];
    modeEl.className = 'pomodoro-mode' + (state.pomodoro.mode !== 'work' ? ' break' : '');
  }

  if (sessionsEl) {
    sessionsEl.textContent = state.pomodoro.sessionsCompleted;
  }
}

// ===== Notifications & Rappels =====
function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      vibrate: [200, 100, 200]
    });
  }
}

function initReminders() {
  // Demander la permission pour les notifications
  if ('Notification' in window && Notification.permission === 'default') {
    // On demandera quand l'utilisateur active les rappels
  }

  // Verifier les rappels toutes les minutes
  setInterval(checkReminders, 60000);
}

function checkReminders() {
  if (!state.reminders.enabled) return;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  if (state.reminders.times.includes(currentTime)) {
    // Utiliser le message personnalise s'il existe
    const title = 'C\'est l\'heure de respirer !';
    const body = state.reminders.customMessage || 'Prends quelques minutes pour toi. Une session de respiration t\'attend.';
    sendNotification(title, body);
  }
}

function updateHistoryStats() {
  const totalEl = document.getElementById('history-total');
  const weekEl = document.getElementById('history-week');
  const timeEl = document.getElementById('history-time');

  if (!totalEl) return;

  totalEl.textContent = state.history.length;

  // Sessions cette semaine
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekSessions = state.history.filter(s => new Date(s.date) > oneWeekAgo);
  weekEl.textContent = weekSessions.length;

  // Temps total en minutes
  const totalSeconds = state.history.reduce((acc, s) => acc + s.duration, 0);
  timeEl.textContent = Math.floor(totalSeconds / 60);
}

// ===== Historique =====
function renderHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;

  if (state.history.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucune session enregistrée.<br>Commence ta première session de respiration !</p>';
    return;
  }

  // Grouper par date
  const grouped = {};
  state.history.forEach(session => {
    const date = new Date(session.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(session);
  });

  let html = '';
  for (const [date, sessions] of Object.entries(grouped)) {
    html += `<div class="history-date-group">
      <h3 class="history-date">${date}</h3>
      <div class="history-sessions">`;

    sessions.forEach(session => {
      const minutes = Math.floor(session.duration / 60);
      const seconds = session.duration % 60;
      const time = new Date(session.date).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const categoryColors = {
        sinus: 'var(--neon-cyan)',
        bronches: 'var(--neon-purple)',
        sleep: 'var(--neon-blue)',
        immune: 'var(--neon-green)',
        stress: 'var(--neon-orange)',
        focus: 'var(--neon-magenta)'
      };
      const color = categoryColors[session.category] || 'var(--accent)';

      html += `
        <div class="history-item" style="--category-color: ${color}">
          <div class="history-icon" style="border-color: ${color}; color: ${color}">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div class="history-info">
            <span class="history-technique">${session.technique}</span>
            <span class="history-meta">${time} • ${minutes}:${seconds.toString().padStart(2, '0')} • ${session.rounds} rounds</span>
          </div>
        </div>`;
    });

    html += '</div></div>';
  }

  container.innerHTML = html;
}

// ===== Stats & Streak =====
function updateStreak() {
  const today = new Date().toISOString().split('T')[0];

  if (state.stats.lastActiveDate === today) {
    // Déjà actif aujourd'hui
    return;
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (state.stats.lastActiveDate === yesterday) {
    state.stats.streak++;
  } else if (state.stats.lastActiveDate !== today) {
    state.stats.streak = 1;
  }

  state.stats.lastActiveDate = today;
  saveData();
}

function updateStats() {
  document.getElementById('total-sessions').textContent = state.stats.breathingSessions;
  document.getElementById('total-workouts').textContent = state.stats.workouts;
  document.getElementById('current-streak').textContent = state.stats.streak;
}

// ===== Service Worker =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('SW enregistré'))
    .catch(err => console.log('SW erreur:', err));
}
