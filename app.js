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
    voiceLang: 'fr'  // Langue du guidage vocal
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
    this.playVoiceInstruction(throughNose ? 'inhaleNose' : 'inhaleMouth');
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

    // Voix optionnelle
    this.playVoiceInstruction(throughNose ? 'exhaleNose' : 'exhaleMouth');
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

    // Voix optionnelle
    this.playVoiceInstruction(isEmpty ? 'holdEmpty' : 'hold');
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

    // Voix optionnelle
    this.playVoiceInstruction('rapid');
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

    // Voix optionnelle
    setTimeout(() => this.playVoiceInstruction('complete'), 1000);
  }

  // Synthese vocale - utilise Google TTS via VoicePlayer
  speak(text) {
    console.log('speak() called, voiceGuide:', state.settings.voiceGuide);
    if (!state.settings.voiceGuide) return;
    voicePlayer.speak(text);
  }

  // Joue une instruction par cle (inhaleNose, exhaleNose, etc.)
  playVoiceInstruction(key) {
    console.log('playVoiceInstruction() called, key:', key, 'voiceGuide:', state.settings.voiceGuide);
    if (!state.settings.voiceGuide) return;
    voicePlayer.play(key);
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
    voicePlayer.stop();
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

// ===== Systeme de voix simplifie avec speechSynthesis =====
class VoicePlayer {
  constructor() {
    this.selectedLang = 'fr';
    this.isSpeaking = false;
  }

  // Mapping des codes langue vers les codes BCP 47
  getLangCode(lang) {
    const codes = {
      'fr': 'fr-FR',
      'en': 'en-US',
      'es': 'es-ES',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-BR'
    };
    return codes[lang] || 'fr-FR';
  }

  // Joue une instruction par cle
  play(key) {
    const translations = voiceTranslations[this.selectedLang] || voiceTranslations.fr;
    const text = translations[key];
    if (text) {
      this.speak(text, this.selectedLang);
    }
  }

  // Parle un texte
  speak(text, lang = null) {
    if (!('speechSynthesis' in window)) {
      console.log('speechSynthesis not supported');
      return;
    }

    // Arreter tout son en cours
    this.stop();

    const useLang = lang || this.selectedLang;
    const langCode = this.getLangCode(useLang);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Essayer de trouver une voix pour cette langue
    const voices = speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(useLang));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      console.log('Voice started:', text);
    };
    utterance.onend = () => {
      this.isSpeaking = false;
    };
    utterance.onerror = (e) => {
      console.log('Voice error:', e.error);
      this.isSpeaking = false;
    };

    // Petit hack pour Android - parfois il faut un delai
    setTimeout(() => {
      speechSynthesis.speak(utterance);
    }, 50);
  }

  stop() {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    this.isSpeaking = false;
  }

  setLanguage(lang) {
    this.selectedLang = lang;
    console.log('Voice language set to:', lang);
  }

  preloadLanguage(lang) {
    // Pas besoin de precharger avec speechSynthesis
    console.log('Voice ready for:', lang);
  }
}

// Instance globale
const voicePlayer = new VoicePlayer();

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
  },
  // === EPIC - Pour douches froides, défis, motivation ===
  epicCinematic: {
    name: 'Cinematic Epic - Douche Froide',
    url: 'https://cdn.pixabay.com/audio/2022/02/15/audio_0f628a4e1c.mp3',
    category: 'epic'
  },
  epicMotivation: {
    name: 'Epic Motivation - Douche Froide',
    url: 'https://cdn.pixabay.com/audio/2022/10/25/audio_52c1a60cec.mp3',
    category: 'epic'
  },
  epicAction: {
    name: 'Action Hero - Douche Froide',
    url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_d6c6c8f540.mp3',
    category: 'epic'
  },
  epicPower: {
    name: 'Power & Glory - Douche Froide',
    url: 'https://cdn.pixabay.com/audio/2022/05/17/audio_407815a716.mp3',
    category: 'epic'
  },
  epicRising: {
    name: 'Rising Warrior - Douche Froide',
    url: 'https://cdn.pixabay.com/audio/2023/07/27/audio_66a802fd40.mp3',
    category: 'epic'
  },
  epicVictor: {
    name: 'Victorious - Douche Froide',
    url: 'https://cdn.pixabay.com/audio/2021/08/08/audio_6a38ad5d8e.mp3',
    category: 'epic'
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
  initColdShower();
  initSettings();
  initMusic();
  initReminders();
  initMeditation();
  updateStats();
  renderHistory();
  updateHistoryStats();

  // Initialiser le systeme de particules
  particleSystem = new ParticleSystem('particles-canvas');

  // Initialiser le systeme de voix
  voicePlayer.setLanguage(state.settings.voiceLang || 'fr');
  voicePlayer.preloadLanguage(state.settings.voiceLang || 'fr');
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
      coldshower: 'Douche Froide',
      meditation: 'Méditation',
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

  // Bouton test voix (ancien, garde pour compatibilite)
  const testVoiceBtn = document.getElementById('test-voice-btn');
  if (testVoiceBtn) {
    testVoiceBtn.addEventListener('click', () => {
      voicePlayer.speak('Inspire doucement. Expire lentement.', state.settings.voiceLang || 'fr');
    });
  }

  // Selecteur de langue pour le guidage vocal
  const voiceLangSelect = document.getElementById('voice-lang-select');
  const testVoiceLangBtn = document.getElementById('test-voice-lang-btn');

  if (voiceLangSelect) {
    // Charger la langue sauvegardee
    voiceLangSelect.value = state.settings.voiceLang || 'fr';
    voicePlayer.setLanguage(state.settings.voiceLang || 'fr');

    voiceLangSelect.addEventListener('change', () => {
      state.settings.voiceLang = voiceLangSelect.value;
      voicePlayer.setLanguage(voiceLangSelect.value);
      saveData();
    });
  }

  if (testVoiceLangBtn) {
    testVoiceLangBtn.addEventListener('click', () => {
      console.log('=== TEST VOICE BUTTON CLICKED ===');
      const lang = state.settings.voiceLang || 'fr';
      console.log('Language:', lang);
      console.log('speechSynthesis available:', 'speechSynthesis' in window);

      const testPhrases = {
        fr: 'Bonjour, ceci est un test',
        en: 'Hello, this is a test',
        es: 'Hola, esto es una prueba',
        de: 'Hallo, das ist ein Test',
        it: 'Ciao, questo è un test',
        pt: 'Olá, isto é um teste'
      };

      const text = testPhrases[lang] || testPhrases.fr;
      console.log('Speaking:', text);

      // Test direct sans passer par voicePlayer
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang + '-' + lang.toUpperCase();
        utterance.onstart = () => console.log('>>> SPEECH STARTED');
        utterance.onend = () => console.log('>>> SPEECH ENDED');
        utterance.onerror = (e) => console.log('>>> SPEECH ERROR:', e.error);
        speechSynthesis.speak(utterance);
        console.log('speechSynthesis.speak() called');
      }
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

// ===== Module Douche Froide =====
const coldShowerEncouragements = {
  fr: [
    "TIENS BON !!!",
    "TU PEUX LE FAIRE !!!",
    "ALLEZ, RÉSISTE !!!",
    "T'ES LE MEILLEUR !!!",
    "T'ES UN GUERRIER !!!",
    "RESPIRE !!! TU GÈRES !!!",
    "LÂCHE RIEN !!!",
    "C'EST DANS LA TÊTE !!!",
    "TON CORPS S'ADAPTE !!!",
    "ENCORE UN PEU !!!",
    "T'ES UNE MACHINE !!!",
    "PLUS FORT QUE LE FROID !!!",
    "MENTAL D'ACIER !!!",
    "TU VAS Y ARRIVER !!!",
    "CHAMPION !!!",
    "INDESTRUCTIBLE !!!"
  ],
  en: [
    "HOLD ON !!!",
    "YOU CAN DO IT !!!",
    "KEEP GOING !!!",
    "YOU'RE THE BEST !!!",
    "YOU'RE A WARRIOR !!!",
    "BREATHE !!! YOU GOT THIS !!!",
    "DON'T GIVE UP !!!",
    "IT'S ALL IN YOUR HEAD !!!",
    "YOUR BODY IS ADAPTING !!!",
    "ALMOST THERE !!!",
    "YOU'RE A MACHINE !!!",
    "STRONGER THAN THE COLD !!!",
    "STEEL MINDSET !!!",
    "YOU WILL MAKE IT !!!",
    "CHAMPION !!!",
    "UNSTOPPABLE !!!"
  ],
  es: [
    "¡¡¡AGUANTA !!!",
    "¡¡¡TÚ PUEDES !!!",
    "¡¡¡SIGUE ADELANTE !!!",
    "¡¡¡ERES EL MEJOR !!!",
    "¡¡¡ERES UN GUERRERO !!!",
    "¡¡¡RESPIRA !!! ¡¡¡LO TIENES !!!",
    "¡¡¡NO TE RINDAS !!!",
    "¡¡¡ESTÁ EN TU MENTE !!!",
    "¡¡¡TU CUERPO SE ADAPTA !!!",
    "¡¡¡YA CASI !!!",
    "¡¡¡ERES UNA MÁQUINA !!!",
    "¡¡¡MÁS FUERTE QUE EL FRÍO !!!",
    "¡¡¡MENTALIDAD DE ACERO !!!",
    "¡¡¡LO VAS A LOGRAR !!!",
    "¡¡¡CAMPEÓN !!!",
    "¡¡¡IMPARABLE !!!"
  ],
  de: [
    "HALTE DURCH !!!",
    "DU SCHAFFST DAS !!!",
    "WEITERMACHEN !!!",
    "DU BIST DER BESTE !!!",
    "DU BIST EIN KRIEGER !!!",
    "ATME !!! DU PACKST DAS !!!",
    "GIB NICHT AUF !!!",
    "ES IST NUR IM KOPF !!!",
    "DEIN KÖRPER PASST SICH AN !!!",
    "FAST GESCHAFFT !!!",
    "DU BIST EINE MASCHINE !!!",
    "STÄRKER ALS DIE KÄLTE !!!",
    "STAHLHARTE MENTALITÄT !!!",
    "DU WIRST ES SCHAFFEN !!!",
    "CHAMPION !!!",
    "UNAUFHALTSAM !!!"
  ],
  it: [
    "RESISTI !!!",
    "CE LA PUOI FARE !!!",
    "VAI AVANTI !!!",
    "SEI IL MIGLIORE !!!",
    "SEI UN GUERRIERO !!!",
    "RESPIRA !!! CE LA FAI !!!",
    "NON MOLLARE !!!",
    "È TUTTO NELLA TESTA !!!",
    "IL TUO CORPO SI ADATTA !!!",
    "CI SEI QUASI !!!",
    "SEI UNA MACCHINA !!!",
    "PIÙ FORTE DEL FREDDO !!!",
    "MENTALITÀ D'ACCIAIO !!!",
    "CE LA FARAI !!!",
    "CAMPIONE !!!",
    "INARRESTABILE !!!"
  ],
  pt: [
    "AGUENTA !!!",
    "VOCÊ CONSEGUE !!!",
    "CONTINUE !!!",
    "VOCÊ É O MELHOR !!!",
    "VOCÊ É UM GUERREIRO !!!",
    "RESPIRE !!! VOCÊ CONSEGUE !!!",
    "NÃO DESISTA !!!",
    "ESTÁ NA SUA MENTE !!!",
    "SEU CORPO ESTÁ SE ADAPTANDO !!!",
    "QUASE LÁ !!!",
    "VOCÊ É UMA MÁQUINA !!!",
    "MAIS FORTE QUE O FRIO !!!",
    "MENTALIDADE DE AÇO !!!",
    "VOCÊ VAI CONSEGUIR !!!",
    "CAMPEÃO !!!",
    "IMPARÁVEL !!!"
  ]
};

const coldShowerState = {
  isRunning: false,
  duration: 30,
  timeLeft: 30,
  timer: null,
  encouragementTimer: null,
  lastEncouragement: -1,
  musicPlaying: false,
  stats: {
    streak: 0,
    total: 0,
    bestTime: 0,
    lastDate: null
  }
};

function initColdShower() {
  console.log('=== initColdShower() ===');

  // Charger les stats sauvegardées
  const savedStats = localStorage.getItem('breathflow_coldshower');
  if (savedStats) {
    coldShowerState.stats = JSON.parse(savedStats);
    updateColdShowerStats();
  }

  // Boutons de durée
  const levelBtns = document.querySelectorAll('.level-btn');
  console.log('Level buttons found:', levelBtns.length);

  levelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      console.log('Level btn clicked:', btn.dataset.duration);
      if (coldShowerState.isRunning) return;

      levelBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      coldShowerState.duration = parseInt(btn.dataset.duration);
      coldShowerState.timeLeft = coldShowerState.duration;
      updateColdTimerDisplay();
      updateColdLevel();
    });
  });

  // Bouton start
  const startBtn = document.getElementById('cold-start-btn');
  const stopBtn = document.getElementById('cold-stop-btn');

  console.log('Start btn found:', !!startBtn);
  console.log('Stop btn found:', !!stopBtn);

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      console.log('=== START BUTTON CLICKED ===');
      startColdShower();
    });
  }
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      console.log('=== STOP BUTTON CLICKED ===');
      stopColdShower();
    });
  }

  updateColdTimerDisplay();
  updateColdLevel();

  // Musique épique pour la douche froide
  const musicSelect = document.getElementById('cold-music-select');
  const musicToggle = document.getElementById('cold-music-toggle');

  if (musicSelect && musicToggle) {
    musicToggle.addEventListener('click', () => {
      const trackId = musicSelect.value;
      if (!trackId) return;

      const audioPlayer = document.getElementById('audio-player');
      const track = musicTracks[trackId];

      if (!track) return;

      if (coldShowerState.musicPlaying) {
        // Arrêter
        audioPlayer.pause();
        coldShowerState.musicPlaying = false;
        musicToggle.classList.remove('playing');
        musicToggle.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z"/></svg>';
      } else {
        // Jouer
        audioPlayer.src = track.url;
        audioPlayer.loop = true;
        audioPlayer.volume = 0.7;
        audioPlayer.play().catch(() => {});
        coldShowerState.musicPlaying = true;
        musicToggle.classList.add('playing');
        musicToggle.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
      }
    });

    musicSelect.addEventListener('change', () => {
      // Si musique en cours, changer la piste
      if (coldShowerState.musicPlaying) {
        const trackId = musicSelect.value;
        if (trackId && musicTracks[trackId]) {
          const audioPlayer = document.getElementById('audio-player');
          audioPlayer.src = musicTracks[trackId].url;
          audioPlayer.play().catch(() => {});
        }
      }
    });
  }
}

function updateColdLevel() {
  const levelEl = document.getElementById('cold-level');
  if (!levelEl) return;

  const levels = {
    30: 'NIVEAU 1 - DÉBUTANT',
    60: 'NIVEAU 2 - INTERMÉDIAIRE',
    120: 'NIVEAU 3 - AVANCÉ',
    180: 'NIVEAU 4 - EXPERT',
    300: 'NIVEAU 5 - LÉGENDE'
  };
  levelEl.textContent = levels[coldShowerState.duration] || 'NIVEAU 1';
}

function updateColdTimerDisplay() {
  const timerEl = document.getElementById('cold-timer');
  if (!timerEl) return;

  const minutes = Math.floor(coldShowerState.timeLeft / 60);
  const seconds = coldShowerState.timeLeft % 60;

  if (minutes > 0) {
    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } else {
    timerEl.textContent = `${seconds}`;
  }

  // Update progress ring
  const progressRing = document.getElementById('cold-progress-ring');
  if (progressRing) {
    const circumference = 565.48;
    const progress = coldShowerState.timeLeft / coldShowerState.duration;
    const offset = circumference * (1 - progress);
    progressRing.style.strokeDashoffset = offset;
  }
}

function updateColdShowerStats() {
  const streakEl = document.getElementById('cold-streak');
  const totalEl = document.getElementById('cold-total');
  const bestEl = document.getElementById('cold-best');

  if (streakEl) streakEl.textContent = coldShowerState.stats.streak;
  if (totalEl) totalEl.textContent = coldShowerState.stats.total;
  if (bestEl) {
    const best = coldShowerState.stats.bestTime;
    if (best >= 60) {
      bestEl.textContent = `${Math.floor(best / 60)}m${best % 60}s`;
    } else {
      bestEl.textContent = `${best}s`;
    }
  }
}

function startColdShower() {
  console.log('startColdShower() called, isRunning:', coldShowerState.isRunning);

  if (coldShowerState.isRunning) {
    console.log('Already running, returning');
    return;
  }

  coldShowerState.isRunning = true;
  coldShowerState.timeLeft = coldShowerState.duration;
  console.log('Duration:', coldShowerState.duration, 'TimeLeft:', coldShowerState.timeLeft);

  // Update UI
  const startBtn = document.getElementById('cold-start-btn');
  const stopBtn = document.getElementById('cold-stop-btn');
  console.log('Hiding start, showing stop');

  if (startBtn) startBtn.classList.add('hidden');
  if (stopBtn) stopBtn.classList.remove('hidden');

  // Démarrer la musique épique si sélectionnée
  const musicSelect = document.getElementById('cold-music-select');
  const musicToggle = document.getElementById('cold-music-toggle');
  if (musicSelect && musicSelect.value && musicTracks[musicSelect.value]) {
    const audioPlayer = document.getElementById('audio-player');
    audioPlayer.src = musicTracks[musicSelect.value].url;
    audioPlayer.loop = true;
    audioPlayer.volume = 0.7;
    audioPlayer.play().catch(() => {});
    coldShowerState.musicPlaying = true;
    if (musicToggle) {
      musicToggle.classList.add('playing');
      musicToggle.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    }
  }

  // Premier encouragement immédiat
  showEncouragement();

  // Voix de départ
  const lang = state.settings.voiceLang || 'fr';
  const startPhrases = {
    fr: "C'est parti ! Tu vas gérer !",
    en: "Let's go! You got this!",
    es: "¡Vamos! ¡Tú puedes!",
    de: "Los geht's! Du schaffst das!",
    it: "Andiamo! Ce la fai!",
    pt: "Vamos lá! Você consegue!"
  };
  voicePlayer.speak(startPhrases[lang] || startPhrases.fr, lang);

  // Timer principal
  coldShowerState.timer = setInterval(() => {
    coldShowerState.timeLeft--;
    updateColdTimerDisplay();

    // Vibration chaque 10 secondes
    if (coldShowerState.timeLeft % 10 === 0 && coldShowerState.timeLeft > 0) {
      if (state.settings.vibration && navigator.vibrate) {
        navigator.vibrate(100);
      }
    }

    if (coldShowerState.timeLeft <= 0) {
      completeColdShower();
    }
  }, 1000);

  // Timer pour les encouragements (toutes les 5-8 secondes)
  coldShowerState.encouragementTimer = setInterval(() => {
    showEncouragement();
  }, 5000 + Math.random() * 3000);
}

function showEncouragement() {
  const lang = state.settings.voiceLang || 'fr';
  const encouragements = coldShowerEncouragements[lang] || coldShowerEncouragements.fr;

  // Éviter de répéter le même encouragement
  let index;
  do {
    index = Math.floor(Math.random() * encouragements.length);
  } while (index === coldShowerState.lastEncouragement && encouragements.length > 1);

  coldShowerState.lastEncouragement = index;
  const text = encouragements[index];

  // Afficher à l'écran
  const encouragementEl = document.getElementById('cold-encouragement');
  if (encouragementEl) {
    encouragementEl.textContent = text;
    encouragementEl.style.animation = 'none';
    setTimeout(() => {
      encouragementEl.style.animation = 'pulse-text 0.5s ease-in-out';
    }, 10);
  }

  // Dire à voix haute
  voicePlayer.speak(text, lang);

  // Vibration
  if (state.settings.vibration && navigator.vibrate) {
    navigator.vibrate([50, 50, 50]);
  }
}

function stopColdShower() {
  if (!coldShowerState.isRunning) return;

  clearInterval(coldShowerState.timer);
  clearInterval(coldShowerState.encouragementTimer);
  coldShowerState.isRunning = false;

  // Arrêter la musique
  stopColdShowerMusic();

  // Reset UI
  document.getElementById('cold-start-btn').classList.remove('hidden');
  document.getElementById('cold-stop-btn').classList.add('hidden');
  document.getElementById('cold-encouragement').textContent = '';

  // Reset timer
  coldShowerState.timeLeft = coldShowerState.duration;
  updateColdTimerDisplay();

  voicePlayer.stop();
}

function stopColdShowerMusic() {
  if (coldShowerState.musicPlaying) {
    const audioPlayer = document.getElementById('audio-player');
    audioPlayer.pause();
    coldShowerState.musicPlaying = false;

    const musicToggle = document.getElementById('cold-music-toggle');
    if (musicToggle) {
      musicToggle.classList.remove('playing');
      musicToggle.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z"/></svg>';
    }
  }
}

function completeColdShower() {
  clearInterval(coldShowerState.timer);
  clearInterval(coldShowerState.encouragementTimer);
  coldShowerState.isRunning = false;

  // Update stats
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (coldShowerState.stats.lastDate === yesterday) {
    coldShowerState.stats.streak++;
  } else if (coldShowerState.stats.lastDate !== today) {
    coldShowerState.stats.streak = 1;
  }

  coldShowerState.stats.lastDate = today;
  coldShowerState.stats.total++;

  if (coldShowerState.duration > coldShowerState.stats.bestTime) {
    coldShowerState.stats.bestTime = coldShowerState.duration;
  }

  // Sauvegarder
  localStorage.setItem('breathflow_coldshower', JSON.stringify(coldShowerState.stats));
  updateColdShowerStats();

  // Update UI
  document.getElementById('cold-start-btn').classList.remove('hidden');
  document.getElementById('cold-stop-btn').classList.add('hidden');

  // Message de victoire
  const lang = state.settings.voiceLang || 'fr';
  const victoryPhrases = {
    fr: "BRAVO !!! T'ES UN CHAMPION !!! Tu as réussi !!!",
    en: "AMAZING !!! YOU'RE A CHAMPION !!! You did it !!!",
    es: "¡¡¡BRAVO !!! ¡¡¡ERES UN CAMPEÓN !!! ¡¡¡Lo lograste !!!",
    de: "BRAVO !!! DU BIST EIN CHAMPION !!! Du hast es geschafft !!!",
    it: "BRAVO !!! SEI UN CAMPIONE !!! Ce l'hai fatta !!!",
    pt: "PARABÉNS !!! VOCÊ É UM CAMPEÃO !!! Você conseguiu !!!"
  };

  const encouragementEl = document.getElementById('cold-encouragement');
  if (encouragementEl) {
    encouragementEl.textContent = '🏆 VICTOIRE !!! 🏆';
    encouragementEl.style.color = 'var(--neon-green)';
  }

  voicePlayer.speak(victoryPhrases[lang] || victoryPhrases.fr, lang);

  // Vibration de victoire
  if (state.settings.vibration && navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 400]);
  }

  // Son de victoire
  audioGuide.playSessionEnd();

  // Reset après 3 secondes
  setTimeout(() => {
    if (encouragementEl) {
      encouragementEl.textContent = '';
      encouragementEl.style.color = '';
    }
    coldShowerState.timeLeft = coldShowerState.duration;
    updateColdTimerDisplay();
  }, 5000);
}

// ===== MODULE MÉDITATION GUIDÉE =====

// Scripts de méditation en 6 langues
const meditationScripts = {
  // ===== BODY SCAN =====
  bodyscan: {
    duration: 10 * 60, // 10 minutes
    fr: {
      name: "Scan Corporel",
      intro: "Bienvenue dans cette méditation de scan corporel. Installe-toi confortablement, ferme les yeux, et laisse ton corps se détendre.",
      steps: [
        { time: 0, text: "Commence par prendre trois grandes respirations profondes. Inspire... et expire lentement." },
        { time: 30, text: "Porte ton attention sur le sommet de ta tête. Ressens toutes les sensations présentes... tension, chaleur, picotements..." },
        { time: 60, text: "Descends maintenant vers ton front. Détends les muscles de ton visage. Relâche les sourcils, les yeux, les joues." },
        { time: 90, text: "Observe ta mâchoire. Laisse-la se détendre. Desserre les dents. Relâche la langue." },
        { time: 120, text: "Porte ton attention sur ton cou et tes épaules. Ces zones accumulent souvent beaucoup de tension. Laisse-les s'adoucir." },
        { time: 180, text: "Descends dans tes bras. Ressens tes biceps, tes avant-bras, tes poignets, tes mains, jusqu'au bout des doigts." },
        { time: 240, text: "Reviens maintenant à ta poitrine. Observe le mouvement naturel de ta respiration. Ton cœur qui bat." },
        { time: 300, text: "Porte ton attention sur ton ventre. À chaque expiration, laisse-le se détendre un peu plus." },
        { time: 360, text: "Observe le bas de ton dos. Cette zone porte souvent le poids du quotidien. Offre-lui de la douceur." },
        { time: 420, text: "Descends dans ton bassin, tes hanches. Laisse cette zone se relâcher complètement." },
        { time: 480, text: "Porte ton attention sur tes cuisses, tes genoux, tes mollets. Ressens le contact avec le sol ou le support." },
        { time: 540, text: "Termine par tes pieds. Tes chevilles, tes talons, la plante des pieds, chaque orteil." },
        { time: 580, text: "Maintenant, ressens ton corps dans son ensemble. Unifié, détendu, présent. Tu es ici, maintenant." },
        { time: 600, text: "Doucement, commence à bouger les doigts, les orteils. Prends une grande inspiration. Ouvre les yeux quand tu es prêt." }
      ]
    },
    en: {
      name: "Body Scan",
      intro: "Welcome to this body scan meditation. Get comfortable, close your eyes, and let your body relax.",
      steps: [
        { time: 0, text: "Start by taking three deep breaths. Inhale... and exhale slowly." },
        { time: 30, text: "Bring your attention to the top of your head. Feel any sensations present... tension, warmth, tingling..." },
        { time: 60, text: "Move down to your forehead. Relax your facial muscles. Release your eyebrows, eyes, cheeks." },
        { time: 90, text: "Notice your jaw. Let it relax. Unclench your teeth. Release your tongue." },
        { time: 120, text: "Bring attention to your neck and shoulders. These areas often hold a lot of tension. Let them soften." },
        { time: 180, text: "Move down into your arms. Feel your biceps, forearms, wrists, hands, down to your fingertips." },
        { time: 240, text: "Return to your chest. Observe the natural movement of your breath. Your heart beating." },
        { time: 300, text: "Bring attention to your belly. With each exhale, let it relax a little more." },
        { time: 360, text: "Notice your lower back. This area often carries the weight of daily life. Offer it gentleness." },
        { time: 420, text: "Move down to your pelvis, your hips. Let this area release completely." },
        { time: 480, text: "Bring attention to your thighs, knees, calves. Feel the contact with the ground or support." },
        { time: 540, text: "End with your feet. Ankles, heels, soles, each toe." },
        { time: 580, text: "Now feel your whole body. Unified, relaxed, present. You are here, now." },
        { time: 600, text: "Gently begin to move your fingers, your toes. Take a deep breath. Open your eyes when ready." }
      ]
    },
    es: {
      name: "Escaneo Corporal",
      intro: "Bienvenido a esta meditación de escaneo corporal. Ponte cómodo, cierra los ojos y deja que tu cuerpo se relaje.",
      steps: [
        { time: 0, text: "Comienza tomando tres respiraciones profundas. Inhala... y exhala lentamente." },
        { time: 30, text: "Lleva tu atención a la parte superior de tu cabeza. Siente las sensaciones presentes... tensión, calor, hormigueo..." },
        { time: 60, text: "Baja hacia tu frente. Relaja los músculos de tu cara. Suelta las cejas, los ojos, las mejillas." },
        { time: 90, text: "Observa tu mandíbula. Déjala relajarse. Afloja los dientes. Suelta la lengua." },
        { time: 120, text: "Lleva la atención a tu cuello y hombros. Estas zonas acumulan mucha tensión. Déjalas suavizarse." },
        { time: 180, text: "Baja por tus brazos. Siente tus bíceps, antebrazos, muñecas, manos, hasta las puntas de los dedos." },
        { time: 240, text: "Vuelve a tu pecho. Observa el movimiento natural de tu respiración. Tu corazón latiendo." },
        { time: 300, text: "Lleva la atención a tu vientre. Con cada exhalación, déjalo relajarse un poco más." },
        { time: 360, text: "Observa la parte baja de tu espalda. Esta zona carga el peso del día a día. Ofrécele suavidad." },
        { time: 420, text: "Baja a tu pelvis, tus caderas. Deja que esta zona se suelte completamente." },
        { time: 480, text: "Lleva la atención a tus muslos, rodillas, pantorrillas. Siente el contacto con el suelo." },
        { time: 540, text: "Termina con tus pies. Tobillos, talones, plantas, cada dedo del pie." },
        { time: 580, text: "Ahora siente tu cuerpo completo. Unificado, relajado, presente. Estás aquí, ahora." },
        { time: 600, text: "Suavemente comienza a mover los dedos de las manos y pies. Respira profundo. Abre los ojos cuando estés listo." }
      ]
    },
    de: {
      name: "Körper-Scan",
      intro: "Willkommen zu dieser Körper-Scan-Meditation. Mach es dir bequem, schließe die Augen und lass deinen Körper entspannen.",
      steps: [
        { time: 0, text: "Beginne mit drei tiefen Atemzügen. Einatmen... und langsam ausatmen." },
        { time: 30, text: "Bringe deine Aufmerksamkeit zum Scheitel deines Kopfes. Spüre alle Empfindungen... Spannung, Wärme, Kribbeln..." },
        { time: 60, text: "Gehe hinunter zur Stirn. Entspanne deine Gesichtsmuskeln. Löse Augenbrauen, Augen, Wangen." },
        { time: 90, text: "Beachte deinen Kiefer. Lass ihn entspannen. Löse die Zähne. Entspanne die Zunge." },
        { time: 120, text: "Bringe Aufmerksamkeit zu Nacken und Schultern. Diese Bereiche halten oft viel Spannung. Lass sie weich werden." },
        { time: 180, text: "Gehe hinunter in deine Arme. Spüre Bizeps, Unterarme, Handgelenke, Hände, bis zu den Fingerspitzen." },
        { time: 240, text: "Kehre zurück zur Brust. Beobachte die natürliche Bewegung deines Atems. Dein Herzschlag." },
        { time: 300, text: "Bringe Aufmerksamkeit zum Bauch. Mit jedem Ausatmen lass ihn etwas mehr entspannen." },
        { time: 360, text: "Beachte den unteren Rücken. Dieser Bereich trägt oft die Last des Alltags. Schenke ihm Sanftheit." },
        { time: 420, text: "Gehe hinunter zum Becken, den Hüften. Lass diesen Bereich vollständig loslassen." },
        { time: 480, text: "Bringe Aufmerksamkeit zu Oberschenkeln, Knien, Waden. Spüre den Kontakt mit dem Boden." },
        { time: 540, text: "Ende bei deinen Füßen. Knöchel, Fersen, Fußsohlen, jeder Zeh." },
        { time: 580, text: "Spüre nun deinen ganzen Körper. Vereint, entspannt, präsent. Du bist hier, jetzt." },
        { time: 600, text: "Bewege sanft Finger und Zehen. Atme tief ein. Öffne die Augen, wenn du bereit bist." }
      ]
    },
    it: {
      name: "Scansione Corporea",
      intro: "Benvenuto in questa meditazione di scansione corporea. Mettiti comodo, chiudi gli occhi e lascia che il corpo si rilassi.",
      steps: [
        { time: 0, text: "Inizia con tre respiri profondi. Inspira... ed espira lentamente." },
        { time: 30, text: "Porta l'attenzione alla sommità della testa. Senti le sensazioni presenti... tensione, calore, formicolio..." },
        { time: 60, text: "Scendi verso la fronte. Rilassa i muscoli del viso. Lascia andare sopracciglia, occhi, guance." },
        { time: 90, text: "Osserva la mascella. Lasciala rilassare. Allenta i denti. Rilassa la lingua." },
        { time: 120, text: "Porta l'attenzione a collo e spalle. Queste zone accumulano molta tensione. Lasciale ammorbidire." },
        { time: 180, text: "Scendi nelle braccia. Senti bicipiti, avambracci, polsi, mani, fino alle punte delle dita." },
        { time: 240, text: "Torna al petto. Osserva il movimento naturale del respiro. Il battito del cuore." },
        { time: 300, text: "Porta l'attenzione alla pancia. Ad ogni espirazione, lasciala rilassare un po' di più." },
        { time: 360, text: "Osserva la parte bassa della schiena. Quest'area porta spesso il peso del quotidiano. Offrile dolcezza." },
        { time: 420, text: "Scendi nel bacino, nei fianchi. Lascia che quest'area si rilasci completamente." },
        { time: 480, text: "Porta l'attenzione a cosce, ginocchia, polpacci. Senti il contatto con il pavimento." },
        { time: 540, text: "Termina con i piedi. Caviglie, talloni, piante, ogni dito del piede." },
        { time: 580, text: "Ora senti tutto il corpo. Unificato, rilassato, presente. Sei qui, ora." },
        { time: 600, text: "Dolcemente muovi le dita delle mani e dei piedi. Fai un respiro profondo. Apri gli occhi quando sei pronto." }
      ]
    },
    pt: {
      name: "Escaneamento Corporal",
      intro: "Bem-vindo a esta meditação de escaneamento corporal. Fique confortável, feche os olhos e deixe seu corpo relaxar.",
      steps: [
        { time: 0, text: "Comece com três respirações profundas. Inspire... e expire lentamente." },
        { time: 30, text: "Leve sua atenção ao topo da cabeça. Sinta as sensações presentes... tensão, calor, formigamento..." },
        { time: 60, text: "Desça para a testa. Relaxe os músculos do rosto. Solte sobrancelhas, olhos, bochechas." },
        { time: 90, text: "Observe sua mandíbula. Deixe-a relaxar. Solte os dentes. Relaxe a língua." },
        { time: 120, text: "Leve a atenção ao pescoço e ombros. Essas áreas acumulam muita tensão. Deixe-as suavizar." },
        { time: 180, text: "Desça pelos braços. Sinta bíceps, antebraços, pulsos, mãos, até as pontas dos dedos." },
        { time: 240, text: "Volte ao peito. Observe o movimento natural da respiração. Seu coração batendo." },
        { time: 300, text: "Leve a atenção à barriga. A cada expiração, deixe-a relaxar um pouco mais." },
        { time: 360, text: "Observe a parte baixa das costas. Essa área carrega o peso do dia a dia. Ofereça-lhe suavidade." },
        { time: 420, text: "Desça para a pélvis, os quadris. Deixe essa área soltar completamente." },
        { time: 480, text: "Leve a atenção às coxas, joelhos, panturrilhas. Sinta o contato com o chão." },
        { time: 540, text: "Termine com os pés. Tornozelos, calcanhares, plantas, cada dedo do pé." },
        { time: 580, text: "Agora sinta todo o seu corpo. Unificado, relaxado, presente. Você está aqui, agora." },
        { time: 600, text: "Suavemente mova os dedos das mãos e dos pés. Respire fundo. Abra os olhos quando estiver pronto." }
      ]
    }
  },

  // ===== BREATH AWARENESS =====
  breathaware: {
    duration: 8 * 60, // 8 minutes
    fr: {
      name: "Conscience Respiratoire",
      intro: "Cette méditation te guide vers une conscience profonde de ta respiration. Installe-toi confortablement.",
      steps: [
        { time: 0, text: "Ferme doucement les yeux. Laisse ton corps trouver sa position naturelle." },
        { time: 20, text: "Sans rien changer, observe simplement ta respiration. Comment respires-tu en ce moment ?" },
        { time: 45, text: "Remarque l'air qui entre par tes narines. Est-il frais ? Chaud ? Observe sans juger." },
        { time: 70, text: "Suis le trajet de l'air. Il descend dans ta gorge, remplit tes poumons, fait se soulever ton ventre." },
        { time: 100, text: "Observe la pause naturelle entre l'inspiration et l'expiration. Ce moment suspendu." },
        { time: 130, text: "Maintenant l'air ressort. Sens-le quitter ton corps. Plus chaud qu'à l'entrée." },
        { time: 160, text: "Ta respiration est comme une vague. Elle monte, elle descend. Naturellement. Sans effort." },
        { time: 200, text: "Si des pensées arrivent, c'est normal. Observe-les passer comme des nuages, puis reviens au souffle." },
        { time: 240, text: "Inspire... et sens la vie qui entre en toi. Expire... et relâche tout ce qui n'est plus nécessaire." },
        { time: 280, text: "Chaque respiration est unique. Chaque respiration est un nouveau commencement." },
        { time: 320, text: "Tu n'as rien à faire. Juste être là. Respirer. Exister." },
        { time: 360, text: "Apprécie ce moment de calme. Cette connexion avec toi-même." },
        { time: 400, text: "Ta respiration t'accompagne depuis ta naissance. Elle sera toujours là pour toi." },
        { time: 440, text: "Doucement, reprends conscience de ton environnement. Les sons autour de toi." },
        { time: 470, text: "Prends une dernière grande inspiration. Ouvre les yeux quand tu es prêt. Merci pour cette pratique." }
      ]
    },
    en: {
      name: "Breath Awareness",
      intro: "This meditation guides you to deep awareness of your breath. Get comfortable.",
      steps: [
        { time: 0, text: "Gently close your eyes. Let your body find its natural position." },
        { time: 20, text: "Without changing anything, simply observe your breath. How are you breathing right now?" },
        { time: 45, text: "Notice the air entering through your nostrils. Is it cool? Warm? Observe without judging." },
        { time: 70, text: "Follow the air's journey. It descends into your throat, fills your lungs, makes your belly rise." },
        { time: 100, text: "Notice the natural pause between inhale and exhale. That suspended moment." },
        { time: 130, text: "Now the air leaves. Feel it exit your body. Warmer than when it entered." },
        { time: 160, text: "Your breath is like a wave. It rises, it falls. Naturally. Effortlessly." },
        { time: 200, text: "If thoughts arise, that's normal. Watch them pass like clouds, then return to the breath." },
        { time: 240, text: "Inhale... feel life entering you. Exhale... release everything no longer needed." },
        { time: 280, text: "Each breath is unique. Each breath is a new beginning." },
        { time: 320, text: "You don't have to do anything. Just be here. Breathe. Exist." },
        { time: 360, text: "Appreciate this moment of calm. This connection with yourself." },
        { time: 400, text: "Your breath has been with you since birth. It will always be there for you." },
        { time: 440, text: "Gently become aware of your surroundings. The sounds around you." },
        { time: 470, text: "Take one last deep breath. Open your eyes when ready. Thank you for this practice." }
      ]
    },
    es: {
      name: "Conciencia Respiratoria",
      intro: "Esta meditación te guía hacia una conciencia profunda de tu respiración. Ponte cómodo.",
      steps: [
        { time: 0, text: "Cierra suavemente los ojos. Deja que tu cuerpo encuentre su posición natural." },
        { time: 20, text: "Sin cambiar nada, simplemente observa tu respiración. ¿Cómo respiras en este momento?" },
        { time: 45, text: "Nota el aire entrando por tus fosas nasales. ¿Es fresco? ¿Cálido? Observa sin juzgar." },
        { time: 70, text: "Sigue el viaje del aire. Desciende por tu garganta, llena tus pulmones, eleva tu vientre." },
        { time: 100, text: "Nota la pausa natural entre inhalación y exhalación. Ese momento suspendido." },
        { time: 130, text: "Ahora el aire sale. Siéntelo salir de tu cuerpo. Más cálido que al entrar." },
        { time: 160, text: "Tu respiración es como una ola. Sube, baja. Naturalmente. Sin esfuerzo." },
        { time: 200, text: "Si llegan pensamientos, es normal. Míralos pasar como nubes, luego vuelve a la respiración." },
        { time: 240, text: "Inhala... siente la vida entrando en ti. Exhala... suelta todo lo que ya no necesitas." },
        { time: 280, text: "Cada respiración es única. Cada respiración es un nuevo comienzo." },
        { time: 320, text: "No tienes que hacer nada. Solo estar aquí. Respirar. Existir." },
        { time: 360, text: "Aprecia este momento de calma. Esta conexión contigo mismo." },
        { time: 400, text: "Tu respiración te acompaña desde tu nacimiento. Siempre estará ahí para ti." },
        { time: 440, text: "Suavemente toma conciencia de tu entorno. Los sonidos a tu alrededor." },
        { time: 470, text: "Toma una última respiración profunda. Abre los ojos cuando estés listo. Gracias por esta práctica." }
      ]
    },
    de: {
      name: "Atem-Bewusstsein",
      intro: "Diese Meditation führt dich zu einem tiefen Bewusstsein deines Atems. Mach es dir bequem.",
      steps: [
        { time: 0, text: "Schließe sanft die Augen. Lass deinen Körper seine natürliche Position finden." },
        { time: 20, text: "Ohne etwas zu ändern, beobachte einfach deinen Atem. Wie atmest du gerade?" },
        { time: 45, text: "Bemerke die Luft, die durch deine Nasenlöcher eintritt. Ist sie kühl? Warm? Beobachte ohne zu urteilen." },
        { time: 70, text: "Folge dem Weg der Luft. Sie sinkt in deinen Hals, füllt deine Lungen, hebt deinen Bauch." },
        { time: 100, text: "Bemerke die natürliche Pause zwischen Ein- und Ausatmen. Dieser schwebende Moment." },
        { time: 130, text: "Jetzt verlässt die Luft deinen Körper. Spüre es. Wärmer als beim Eintreten." },
        { time: 160, text: "Dein Atem ist wie eine Welle. Er steigt, er fällt. Natürlich. Mühelos." },
        { time: 200, text: "Wenn Gedanken kommen, ist das normal. Sieh sie wie Wolken vorbeiziehen, kehre dann zum Atem zurück." },
        { time: 240, text: "Einatmen... spüre das Leben in dir. Ausatmen... lass alles los, was nicht mehr nötig ist." },
        { time: 280, text: "Jeder Atemzug ist einzigartig. Jeder Atemzug ist ein neuer Anfang." },
        { time: 320, text: "Du musst nichts tun. Einfach hier sein. Atmen. Existieren." },
        { time: 360, text: "Genieße diesen Moment der Ruhe. Diese Verbindung mit dir selbst." },
        { time: 400, text: "Dein Atem begleitet dich seit deiner Geburt. Er wird immer für dich da sein." },
        { time: 440, text: "Werde dir langsam deiner Umgebung bewusst. Die Geräusche um dich herum." },
        { time: 470, text: "Nimm einen letzten tiefen Atemzug. Öffne die Augen, wenn du bereit bist. Danke für diese Übung." }
      ]
    },
    it: {
      name: "Consapevolezza del Respiro",
      intro: "Questa meditazione ti guida verso una profonda consapevolezza del respiro. Mettiti comodo.",
      steps: [
        { time: 0, text: "Chiudi dolcemente gli occhi. Lascia che il corpo trovi la sua posizione naturale." },
        { time: 20, text: "Senza cambiare nulla, osserva semplicemente il tuo respiro. Come respiri in questo momento?" },
        { time: 45, text: "Nota l'aria che entra dalle narici. È fresca? Calda? Osserva senza giudicare." },
        { time: 70, text: "Segui il viaggio dell'aria. Scende nella gola, riempie i polmoni, solleva la pancia." },
        { time: 100, text: "Nota la pausa naturale tra inspirazione ed espirazione. Quel momento sospeso." },
        { time: 130, text: "Ora l'aria esce. Sentila lasciare il corpo. Più calda di quando è entrata." },
        { time: 160, text: "Il tuo respiro è come un'onda. Sale, scende. Naturalmente. Senza sforzo." },
        { time: 200, text: "Se arrivano pensieri, è normale. Guardali passare come nuvole, poi torna al respiro." },
        { time: 240, text: "Inspira... senti la vita che entra in te. Espira... lascia andare tutto ciò che non serve più." },
        { time: 280, text: "Ogni respiro è unico. Ogni respiro è un nuovo inizio." },
        { time: 320, text: "Non devi fare nulla. Solo essere qui. Respirare. Esistere." },
        { time: 360, text: "Apprezza questo momento di calma. Questa connessione con te stesso." },
        { time: 400, text: "Il tuo respiro ti accompagna dalla nascita. Sarà sempre lì per te." },
        { time: 440, text: "Dolcemente prendi coscienza dell'ambiente. I suoni intorno a te." },
        { time: 470, text: "Fai un ultimo respiro profondo. Apri gli occhi quando sei pronto. Grazie per questa pratica." }
      ]
    },
    pt: {
      name: "Consciência Respiratória",
      intro: "Esta meditação te guia para uma consciência profunda da sua respiração. Fique confortável.",
      steps: [
        { time: 0, text: "Feche suavemente os olhos. Deixe seu corpo encontrar sua posição natural." },
        { time: 20, text: "Sem mudar nada, simplesmente observe sua respiração. Como você está respirando agora?" },
        { time: 45, text: "Note o ar entrando pelas narinas. É fresco? Quente? Observe sem julgar." },
        { time: 70, text: "Siga a jornada do ar. Desce pela garganta, enche os pulmões, levanta a barriga." },
        { time: 100, text: "Note a pausa natural entre inspiração e expiração. Esse momento suspenso." },
        { time: 130, text: "Agora o ar sai. Sinta-o deixar seu corpo. Mais quente do que quando entrou." },
        { time: 160, text: "Sua respiração é como uma onda. Sobe, desce. Naturalmente. Sem esforço." },
        { time: 200, text: "Se pensamentos chegarem, é normal. Observe-os passar como nuvens, depois volte à respiração." },
        { time: 240, text: "Inspire... sinta a vida entrando em você. Expire... solte tudo que não é mais necessário." },
        { time: 280, text: "Cada respiração é única. Cada respiração é um novo começo." },
        { time: 320, text: "Você não precisa fazer nada. Apenas estar aqui. Respirar. Existir." },
        { time: 360, text: "Aprecie este momento de calma. Esta conexão consigo mesmo." },
        { time: 400, text: "Sua respiração te acompanha desde o nascimento. Sempre estará lá para você." },
        { time: 440, text: "Suavemente tome consciência do ambiente. Os sons ao seu redor." },
        { time: 470, text: "Faça uma última respiração profunda. Abra os olhos quando estiver pronto. Obrigado por esta prática." }
      ]
    }
  },

  // ===== THOUGHT OBSERVATION =====
  thoughts: {
    duration: 12 * 60, // 12 minutes
    fr: {
      name: "Observation des Pensées",
      intro: "Cette méditation t'invite à observer tes pensées sans les juger. Une pratique de purification mentale et d'introspection profonde.",
      steps: [
        { time: 0, text: "Installe-toi confortablement. Ferme les yeux. Prends trois respirations profondes pour t'ancrer dans l'instant." },
        { time: 30, text: "Imagine que ton esprit est un vaste ciel bleu. Infini. Paisible. C'est ta vraie nature." },
        { time: 60, text: "Les pensées vont arriver. Comme des nuages qui traversent ce ciel. C'est parfaitement normal." },
        { time: 90, text: "Ton rôle n'est pas de contrôler les pensées. Simplement de les observer. Comme un spectateur bienveillant." },
        { time: 120, text: "Une pensée apparaît ? Observe-la. D'où vient-elle ? Quelle forme a-t-elle ? Quelle émotion l'accompagne ?" },
        { time: 160, text: "Ne la juge pas. Une pensée n'est ni bonne ni mauvaise. Elle existe, c'est tout. Laisse-la passer." },
        { time: 200, text: "Tu n'es pas tes pensées. Tu es celui qui les observe. L'espace dans lequel elles apparaissent." },
        { time: 240, text: "Si une pensée t'emporte, c'est normal. Dès que tu t'en rends compte, reviens doucement à l'observation." },
        { time: 280, text: "Observe les pensées sans t'y accrocher. Comme des feuilles qui flottent sur une rivière." },
        { time: 320, text: "Certaines pensées reviennent souvent. Observe cette répétition avec curiosité, sans frustration." },
        { time: 360, text: "À chaque pensée que tu laisses passer, ton esprit se purifie un peu plus. Se clarifie." },
        { time: 400, text: "Tu apprends à créer de l'espace entre toi et tes pensées. C'est là que réside la liberté." },
        { time: 440, text: "Les pensées ralentissent naturellement quand tu les observes sans les nourrir. Ressens ce calme qui s'installe." },
        { time: 500, text: "Tu es le ciel, pas les nuages. Vaste. Immuable. Serein." },
        { time: 560, text: "Garde cette capacité d'observation avec toi dans ta vie quotidienne. Elle est un trésor." },
        { time: 620, text: "Prends une grande inspiration. Remercie-toi pour cette pratique. Ouvre doucement les yeux." },
        { time: 700, text: "Tu as fait un beau travail de purification mentale. Emporte cette clarté avec toi." }
      ]
    },
    en: {
      name: "Thought Observation",
      intro: "This meditation invites you to observe your thoughts without judging them. A practice of mental purification and deep introspection.",
      steps: [
        { time: 0, text: "Get comfortable. Close your eyes. Take three deep breaths to anchor yourself in the present." },
        { time: 30, text: "Imagine your mind as a vast blue sky. Infinite. Peaceful. This is your true nature." },
        { time: 60, text: "Thoughts will come. Like clouds crossing this sky. That's perfectly normal." },
        { time: 90, text: "Your role is not to control thoughts. Simply to observe them. Like a kind spectator." },
        { time: 120, text: "A thought appears? Observe it. Where does it come from? What shape does it have? What emotion accompanies it?" },
        { time: 160, text: "Don't judge it. A thought is neither good nor bad. It exists, that's all. Let it pass." },
        { time: 200, text: "You are not your thoughts. You are the one observing them. The space in which they appear." },
        { time: 240, text: "If a thought carries you away, that's normal. As soon as you notice, gently return to observing." },
        { time: 280, text: "Observe thoughts without clinging. Like leaves floating on a river." },
        { time: 320, text: "Some thoughts return often. Observe this repetition with curiosity, without frustration." },
        { time: 360, text: "With each thought you let pass, your mind purifies a little more. Clarifies." },
        { time: 400, text: "You're learning to create space between you and your thoughts. That's where freedom lives." },
        { time: 440, text: "Thoughts naturally slow down when you observe them without feeding them. Feel this calm settling in." },
        { time: 500, text: "You are the sky, not the clouds. Vast. Unchanging. Serene." },
        { time: 560, text: "Keep this ability to observe with you in daily life. It's a treasure." },
        { time: 620, text: "Take a deep breath. Thank yourself for this practice. Gently open your eyes." },
        { time: 700, text: "You've done beautiful work of mental purification. Carry this clarity with you." }
      ]
    },
    es: {
      name: "Observación de Pensamientos",
      intro: "Esta meditación te invita a observar tus pensamientos sin juzgarlos. Una práctica de purificación mental e introspección profunda.",
      steps: [
        { time: 0, text: "Ponte cómodo. Cierra los ojos. Toma tres respiraciones profundas para anclarte en el presente." },
        { time: 30, text: "Imagina tu mente como un vasto cielo azul. Infinito. Pacífico. Esta es tu verdadera naturaleza." },
        { time: 60, text: "Los pensamientos vendrán. Como nubes cruzando este cielo. Es perfectamente normal." },
        { time: 90, text: "Tu rol no es controlar pensamientos. Simplemente observarlos. Como un espectador amable." },
        { time: 120, text: "¿Aparece un pensamiento? Obsérvalo. ¿De dónde viene? ¿Qué forma tiene? ¿Qué emoción lo acompaña?" },
        { time: 160, text: "No lo juzgues. Un pensamiento no es bueno ni malo. Existe, eso es todo. Déjalo pasar." },
        { time: 200, text: "No eres tus pensamientos. Eres quien los observa. El espacio en el que aparecen." },
        { time: 240, text: "Si un pensamiento te arrastra, es normal. Cuando lo notes, vuelve suavemente a observar." },
        { time: 280, text: "Observa pensamientos sin aferrarte. Como hojas flotando en un río." },
        { time: 320, text: "Algunos pensamientos vuelven seguido. Observa esta repetición con curiosidad, sin frustración." },
        { time: 360, text: "Con cada pensamiento que dejas pasar, tu mente se purifica un poco más. Se clarifica." },
        { time: 400, text: "Estás aprendiendo a crear espacio entre tú y tus pensamientos. Ahí vive la libertad." },
        { time: 440, text: "Los pensamientos se calman naturalmente cuando los observas sin alimentarlos. Siente esta calma." },
        { time: 500, text: "Eres el cielo, no las nubes. Vasto. Inmutable. Sereno." },
        { time: 560, text: "Guarda esta capacidad de observación contigo en la vida diaria. Es un tesoro." },
        { time: 620, text: "Respira profundo. Agradécete por esta práctica. Abre suavemente los ojos." },
        { time: 700, text: "Has hecho un hermoso trabajo de purificación mental. Lleva esta claridad contigo." }
      ]
    },
    de: {
      name: "Gedankenbeobachtung",
      intro: "Diese Meditation lädt dich ein, deine Gedanken ohne Urteil zu beobachten. Eine Praxis der mentalen Reinigung und tiefen Introspektion.",
      steps: [
        { time: 0, text: "Mach es dir bequem. Schließe die Augen. Nimm drei tiefe Atemzüge, um dich im Jetzt zu verankern." },
        { time: 30, text: "Stelle dir deinen Geist als weiten blauen Himmel vor. Unendlich. Friedlich. Das ist deine wahre Natur." },
        { time: 60, text: "Gedanken werden kommen. Wie Wolken, die diesen Himmel durchqueren. Das ist völlig normal." },
        { time: 90, text: "Deine Rolle ist nicht, Gedanken zu kontrollieren. Einfach sie zu beobachten. Wie ein freundlicher Zuschauer." },
        { time: 120, text: "Ein Gedanke erscheint? Beobachte ihn. Woher kommt er? Welche Form hat er? Welche Emotion begleitet ihn?" },
        { time: 160, text: "Urteile nicht. Ein Gedanke ist weder gut noch schlecht. Er existiert, das ist alles. Lass ihn vorbeiziehen." },
        { time: 200, text: "Du bist nicht deine Gedanken. Du bist derjenige, der sie beobachtet. Der Raum, in dem sie erscheinen." },
        { time: 240, text: "Wenn ein Gedanke dich mitreißt, ist das normal. Sobald du es merkst, kehre sanft zum Beobachten zurück." },
        { time: 280, text: "Beobachte Gedanken ohne festzuhalten. Wie Blätter, die auf einem Fluss treiben." },
        { time: 320, text: "Manche Gedanken kehren oft zurück. Beobachte diese Wiederholung mit Neugier, ohne Frustration." },
        { time: 360, text: "Mit jedem Gedanken, den du vorbeiziehen lässt, reinigt sich dein Geist ein wenig mehr. Klärt sich." },
        { time: 400, text: "Du lernst, Raum zwischen dir und deinen Gedanken zu schaffen. Dort lebt die Freiheit." },
        { time: 440, text: "Gedanken verlangsamen sich natürlich, wenn du sie beobachtest, ohne sie zu nähren. Spüre diese Ruhe." },
        { time: 500, text: "Du bist der Himmel, nicht die Wolken. Weit. Unveränderlich. Gelassen." },
        { time: 560, text: "Behalte diese Fähigkeit zur Beobachtung im Alltag. Sie ist ein Schatz." },
        { time: 620, text: "Atme tief ein. Danke dir für diese Übung. Öffne sanft die Augen." },
        { time: 700, text: "Du hast wunderbare Arbeit der mentalen Reinigung geleistet. Trage diese Klarheit mit dir." }
      ]
    },
    it: {
      name: "Osservazione dei Pensieri",
      intro: "Questa meditazione ti invita a osservare i tuoi pensieri senza giudicarli. Una pratica di purificazione mentale e introspezione profonda.",
      steps: [
        { time: 0, text: "Mettiti comodo. Chiudi gli occhi. Fai tre respiri profondi per ancorarti nel presente." },
        { time: 30, text: "Immagina la tua mente come un vasto cielo blu. Infinito. Pacifico. Questa è la tua vera natura." },
        { time: 60, text: "I pensieri arriveranno. Come nuvole che attraversano questo cielo. È perfettamente normale." },
        { time: 90, text: "Il tuo ruolo non è controllare i pensieri. Semplicemente osservarli. Come uno spettatore gentile." },
        { time: 120, text: "Appare un pensiero? Osservalo. Da dove viene? Che forma ha? Quale emozione lo accompagna?" },
        { time: 160, text: "Non giudicarlo. Un pensiero non è né buono né cattivo. Esiste, tutto qui. Lascialo passare." },
        { time: 200, text: "Tu non sei i tuoi pensieri. Sei colui che li osserva. Lo spazio in cui appaiono." },
        { time: 240, text: "Se un pensiero ti trascina, è normale. Appena te ne accorgi, torna dolcemente a osservare." },
        { time: 280, text: "Osserva i pensieri senza aggrapparti. Come foglie che galleggiano su un fiume." },
        { time: 320, text: "Alcuni pensieri tornano spesso. Osserva questa ripetizione con curiosità, senza frustrazione." },
        { time: 360, text: "Con ogni pensiero che lasci passare, la tua mente si purifica un po' di più. Si chiarisce." },
        { time: 400, text: "Stai imparando a creare spazio tra te e i tuoi pensieri. Lì vive la libertà." },
        { time: 440, text: "I pensieri rallentano naturalmente quando li osservi senza nutrirli. Senti questa calma." },
        { time: 500, text: "Sei il cielo, non le nuvole. Vasto. Immutabile. Sereno." },
        { time: 560, text: "Porta con te questa capacità di osservazione nella vita quotidiana. È un tesoro." },
        { time: 620, text: "Fai un respiro profondo. Ringraziati per questa pratica. Apri dolcemente gli occhi." },
        { time: 700, text: "Hai fatto un bel lavoro di purificazione mentale. Porta questa chiarezza con te." }
      ]
    },
    pt: {
      name: "Observação dos Pensamentos",
      intro: "Esta meditação te convida a observar seus pensamentos sem julgá-los. Uma prática de purificação mental e introspecção profunda.",
      steps: [
        { time: 0, text: "Fique confortável. Feche os olhos. Faça três respirações profundas para se ancorar no presente." },
        { time: 30, text: "Imagine sua mente como um vasto céu azul. Infinito. Pacífico. Esta é sua verdadeira natureza." },
        { time: 60, text: "Pensamentos virão. Como nuvens cruzando este céu. É perfeitamente normal." },
        { time: 90, text: "Seu papel não é controlar pensamentos. Simplesmente observá-los. Como um espectador gentil." },
        { time: 120, text: "Um pensamento aparece? Observe-o. De onde vem? Que forma tem? Que emoção o acompanha?" },
        { time: 160, text: "Não julgue. Um pensamento não é bom nem mau. Ele existe, só isso. Deixe-o passar." },
        { time: 200, text: "Você não é seus pensamentos. Você é quem os observa. O espaço no qual eles aparecem." },
        { time: 240, text: "Se um pensamento te levar, é normal. Assim que perceber, volte suavemente a observar." },
        { time: 280, text: "Observe pensamentos sem se apegar. Como folhas flutuando em um rio." },
        { time: 320, text: "Alguns pensamentos voltam frequentemente. Observe esta repetição com curiosidade, sem frustração." },
        { time: 360, text: "Com cada pensamento que você deixa passar, sua mente se purifica um pouco mais. Clarifica." },
        { time: 400, text: "Você está aprendendo a criar espaço entre você e seus pensamentos. É lá que vive a liberdade." },
        { time: 440, text: "Os pensamentos diminuem naturalmente quando você os observa sem alimentá-los. Sinta esta calma." },
        { time: 500, text: "Você é o céu, não as nuvens. Vasto. Imutável. Sereno." },
        { time: 560, text: "Guarde esta capacidade de observação com você na vida diária. É um tesouro." },
        { time: 620, text: "Respire fundo. Agradeça a si mesmo por esta prática. Abra suavemente os olhos." },
        { time: 700, text: "Você fez um lindo trabalho de purificação mental. Leve esta clareza com você." }
      ]
    }
  },

  // ===== POSITIVE VISUALIZATION =====
  visualization: {
    duration: 15 * 60, // 15 minutes
    fr: {
      name: "Visualisation Positive",
      intro: "Cette méditation puissante te guide à visualiser ta vie idéale. Santé, mission, amour, succès. Tout ce que tu mérites.",
      steps: [
        { time: 0, text: "Ferme les yeux. Prends quelques respirations profondes. Laisse le monde extérieur s'éloigner." },
        { time: 30, text: "Tu vas créer dans ton esprit la vision de ta vie la plus belle. Celle que tu mérites profondément." },
        { time: 60, text: "Commence par visualiser ton corps. Tu as une santé de fer. Une énergie débordante." },
        { time: 90, text: "Vois-toi te réveiller chaque matin plein de vitalité. Ton corps est fort, souple, en parfaite santé." },
        { time: 120, text: "Ressens cette énergie qui circule en toi. Chaque cellule vibre de santé. Tu es invincible." },
        { time: 160, text: "Maintenant, visualise ta mission de vie. Cette chose importante pour laquelle tu es né." },
        { time: 200, text: "Vois ta mission de démocratie avancer dans le monde. Tes idées touchent des milliers de personnes." },
        { time: 240, text: "Tu as un impact réel. Les gens écoutent. Les choses changent grâce à toi. Tu fais la différence." },
        { time: 280, text: "Ressens la fierté de contribuer à quelque chose de plus grand que toi. Ta mission est en marche." },
        { time: 320, text: "Visualise maintenant ta vie amoureuse. Ta femme te regarde avec des yeux pleins d'amour." },
        { time: 360, text: "Elle t'admire. Elle te soutient. Ensemble, vous formez une équipe invincible." },
        { time: 400, text: "Vos conversations sont profondes. Vos silences sont confortables. L'amour est partout." },
        { time: 440, text: "Vois maintenant tes enfants. Ils te regardent avec admiration. Tu es leur héros." },
        { time: 480, text: "Ils sont fiers de toi. Ils veulent être comme toi. Tu leur transmets le meilleur." },
        { time: 520, text: "Ta famille est unie. Pleine de rires, de tendresse, de moments précieux." },
        { time: 560, text: "Visualise ton succès professionnel. Les portes s'ouvrent. Les opportunités affluent." },
        { time: 600, text: "Tu atteins tes objectifs. L'argent coule. L'abondance est ton état naturel." },
        { time: 640, text: "Tu es reconnu pour ton travail. Respecté. Admiré. Tu mérites tout ce succès." },
        { time: 700, text: "Maintenant, ressens toutes ces visualisations en même temps. Santé. Mission. Amour. Succès." },
        { time: 760, text: "C'est ta vie. Pas un rêve. Ta réalité qui se construit jour après jour." },
        { time: 820, text: "Ancre ces images dans ton cœur. Elles te guident. Elles deviennent réalité." },
        { time: 880, text: "Prends une grande inspiration. Ouvre doucement les yeux. Tu es prêt à créer cette vie." }
      ]
    },
    en: {
      name: "Positive Visualization",
      intro: "This powerful meditation guides you to visualize your ideal life. Health, mission, love, success. Everything you deserve.",
      steps: [
        { time: 0, text: "Close your eyes. Take a few deep breaths. Let the outside world fade away." },
        { time: 30, text: "You will create in your mind the vision of your most beautiful life. The one you deeply deserve." },
        { time: 60, text: "Start by visualizing your body. You have ironclad health. Overflowing energy." },
        { time: 90, text: "See yourself waking up each morning full of vitality. Your body is strong, flexible, in perfect health." },
        { time: 120, text: "Feel this energy flowing through you. Every cell vibrates with health. You are invincible." },
        { time: 160, text: "Now visualize your life mission. That important thing you were born for." },
        { time: 200, text: "See your democracy mission advancing in the world. Your ideas touch thousands of people." },
        { time: 240, text: "You have real impact. People listen. Things change because of you. You make a difference." },
        { time: 280, text: "Feel the pride of contributing to something greater than yourself. Your mission is underway." },
        { time: 320, text: "Now visualize your love life. Your wife looks at you with eyes full of love." },
        { time: 360, text: "She admires you. She supports you. Together, you form an invincible team." },
        { time: 400, text: "Your conversations are deep. Your silences are comfortable. Love is everywhere." },
        { time: 440, text: "Now see your children. They look at you with admiration. You are their hero." },
        { time: 480, text: "They are proud of you. They want to be like you. You pass on the best to them." },
        { time: 520, text: "Your family is united. Full of laughter, tenderness, precious moments." },
        { time: 560, text: "Visualize your professional success. Doors open. Opportunities flow in." },
        { time: 600, text: "You reach your goals. Money flows. Abundance is your natural state." },
        { time: 640, text: "You are recognized for your work. Respected. Admired. You deserve all this success." },
        { time: 700, text: "Now feel all these visualizations at once. Health. Mission. Love. Success." },
        { time: 760, text: "This is your life. Not a dream. Your reality being built day by day." },
        { time: 820, text: "Anchor these images in your heart. They guide you. They become reality." },
        { time: 880, text: "Take a deep breath. Slowly open your eyes. You are ready to create this life." }
      ]
    },
    es: {
      name: "Visualización Positiva",
      intro: "Esta poderosa meditación te guía a visualizar tu vida ideal. Salud, misión, amor, éxito. Todo lo que mereces.",
      steps: [
        { time: 0, text: "Cierra los ojos. Toma algunas respiraciones profundas. Deja que el mundo exterior se aleje." },
        { time: 30, text: "Vas a crear en tu mente la visión de tu vida más hermosa. La que profundamente mereces." },
        { time: 60, text: "Comienza visualizando tu cuerpo. Tienes una salud de hierro. Energía desbordante." },
        { time: 90, text: "Mírate despertar cada mañana lleno de vitalidad. Tu cuerpo es fuerte, flexible, en perfecta salud." },
        { time: 120, text: "Siente esta energía fluyendo en ti. Cada célula vibra con salud. Eres invencible." },
        { time: 160, text: "Ahora visualiza tu misión de vida. Esa cosa importante para la que naciste." },
        { time: 200, text: "Ve tu misión de democracia avanzando en el mundo. Tus ideas tocan a miles de personas." },
        { time: 240, text: "Tienes un impacto real. La gente escucha. Las cosas cambian gracias a ti. Marcas la diferencia." },
        { time: 280, text: "Siente el orgullo de contribuir a algo más grande que tú. Tu misión está en marcha." },
        { time: 320, text: "Visualiza ahora tu vida amorosa. Tu esposa te mira con ojos llenos de amor." },
        { time: 360, text: "Ella te admira. Te apoya. Juntos forman un equipo invencible." },
        { time: 400, text: "Sus conversaciones son profundas. Sus silencios son cómodos. El amor está en todas partes." },
        { time: 440, text: "Ahora ve a tus hijos. Te miran con admiración. Eres su héroe." },
        { time: 480, text: "Están orgullosos de ti. Quieren ser como tú. Les transmites lo mejor." },
        { time: 520, text: "Tu familia está unida. Llena de risas, ternura, momentos preciosos." },
        { time: 560, text: "Visualiza tu éxito profesional. Las puertas se abren. Las oportunidades fluyen." },
        { time: 600, text: "Alcanzas tus metas. El dinero fluye. La abundancia es tu estado natural." },
        { time: 640, text: "Eres reconocido por tu trabajo. Respetado. Admirado. Mereces todo este éxito." },
        { time: 700, text: "Ahora siente todas estas visualizaciones a la vez. Salud. Misión. Amor. Éxito." },
        { time: 760, text: "Esta es tu vida. No un sueño. Tu realidad construyéndose día a día." },
        { time: 820, text: "Ancla estas imágenes en tu corazón. Te guían. Se convierten en realidad." },
        { time: 880, text: "Respira profundo. Abre lentamente los ojos. Estás listo para crear esta vida." }
      ]
    },
    de: {
      name: "Positive Visualisierung",
      intro: "Diese kraftvolle Meditation führt dich zur Visualisierung deines idealen Lebens. Gesundheit, Mission, Liebe, Erfolg. Alles, was du verdienst.",
      steps: [
        { time: 0, text: "Schließe die Augen. Nimm einige tiefe Atemzüge. Lass die Außenwelt verblassen." },
        { time: 30, text: "Du wirst in deinem Geist die Vision deines schönsten Lebens erschaffen. Das, was du zutiefst verdienst." },
        { time: 60, text: "Beginne mit der Visualisierung deines Körpers. Du hast eine eiserne Gesundheit. Überfließende Energie." },
        { time: 90, text: "Sieh dich jeden Morgen voller Vitalität aufwachen. Dein Körper ist stark, flexibel, in perfekter Gesundheit." },
        { time: 120, text: "Spüre diese Energie, die durch dich fließt. Jede Zelle vibriert vor Gesundheit. Du bist unbesiegbar." },
        { time: 160, text: "Visualisiere jetzt deine Lebensmission. Diese wichtige Sache, für die du geboren wurdest." },
        { time: 200, text: "Sieh deine Demokratie-Mission in der Welt voranschreiten. Deine Ideen berühren Tausende von Menschen." },
        { time: 240, text: "Du hast echten Einfluss. Menschen hören zu. Dinge ändern sich durch dich. Du machst einen Unterschied." },
        { time: 280, text: "Spüre den Stolz, zu etwas Größerem beizutragen. Deine Mission ist im Gange." },
        { time: 320, text: "Visualisiere nun dein Liebesleben. Deine Frau schaut dich mit liebevollen Augen an." },
        { time: 360, text: "Sie bewundert dich. Sie unterstützt dich. Zusammen seid ihr ein unschlagbares Team." },
        { time: 400, text: "Eure Gespräche sind tief. Eure Stille ist angenehm. Liebe ist überall." },
        { time: 440, text: "Sieh jetzt deine Kinder. Sie schauen dich mit Bewunderung an. Du bist ihr Held." },
        { time: 480, text: "Sie sind stolz auf dich. Sie wollen wie du sein. Du gibst ihnen das Beste weiter." },
        { time: 520, text: "Deine Familie ist vereint. Voller Lachen, Zärtlichkeit, kostbarer Momente." },
        { time: 560, text: "Visualisiere deinen beruflichen Erfolg. Türen öffnen sich. Chancen strömen herein." },
        { time: 600, text: "Du erreichst deine Ziele. Geld fließt. Fülle ist dein natürlicher Zustand." },
        { time: 640, text: "Du wirst für deine Arbeit anerkannt. Respektiert. Bewundert. Du verdienst all diesen Erfolg." },
        { time: 700, text: "Spüre jetzt alle diese Visualisierungen gleichzeitig. Gesundheit. Mission. Liebe. Erfolg." },
        { time: 760, text: "Das ist dein Leben. Kein Traum. Deine Realität, die Tag für Tag aufgebaut wird." },
        { time: 820, text: "Verankere diese Bilder in deinem Herzen. Sie leiten dich. Sie werden Wirklichkeit." },
        { time: 880, text: "Atme tief ein. Öffne langsam die Augen. Du bist bereit, dieses Leben zu erschaffen." }
      ]
    },
    it: {
      name: "Visualizzazione Positiva",
      intro: "Questa potente meditazione ti guida a visualizzare la tua vita ideale. Salute, missione, amore, successo. Tutto ciò che meriti.",
      steps: [
        { time: 0, text: "Chiudi gli occhi. Fai alcuni respiri profondi. Lascia che il mondo esterno svanisca." },
        { time: 30, text: "Creerai nella tua mente la visione della tua vita più bella. Quella che meriti profondamente." },
        { time: 60, text: "Inizia visualizzando il tuo corpo. Hai una salute di ferro. Energia traboccante." },
        { time: 90, text: "Vedi te stesso svegliarti ogni mattina pieno di vitalità. Il tuo corpo è forte, flessibile, in perfetta salute." },
        { time: 120, text: "Senti questa energia che scorre in te. Ogni cellula vibra di salute. Sei invincibile." },
        { time: 160, text: "Ora visualizza la tua missione di vita. Quella cosa importante per cui sei nato." },
        { time: 200, text: "Vedi la tua missione democratica avanzare nel mondo. Le tue idee toccano migliaia di persone." },
        { time: 240, text: "Hai un impatto reale. Le persone ascoltano. Le cose cambiano grazie a te. Fai la differenza." },
        { time: 280, text: "Senti l'orgoglio di contribuire a qualcosa di più grande di te. La tua missione è in corso." },
        { time: 320, text: "Visualizza ora la tua vita amorosa. Tua moglie ti guarda con occhi pieni d'amore." },
        { time: 360, text: "Ti ammira. Ti sostiene. Insieme formate una squadra invincibile." },
        { time: 400, text: "Le vostre conversazioni sono profonde. I vostri silenzi sono confortevoli. L'amore è ovunque." },
        { time: 440, text: "Ora vedi i tuoi figli. Ti guardano con ammirazione. Sei il loro eroe." },
        { time: 480, text: "Sono orgogliosi di te. Vogliono essere come te. Trasmetti loro il meglio." },
        { time: 520, text: "La tua famiglia è unita. Piena di risate, tenerezza, momenti preziosi." },
        { time: 560, text: "Visualizza il tuo successo professionale. Le porte si aprono. Le opportunità affluiscono." },
        { time: 600, text: "Raggiungi i tuoi obiettivi. Il denaro scorre. L'abbondanza è il tuo stato naturale." },
        { time: 640, text: "Sei riconosciuto per il tuo lavoro. Rispettato. Ammirato. Meriti tutto questo successo." },
        { time: 700, text: "Ora senti tutte queste visualizzazioni insieme. Salute. Missione. Amore. Successo." },
        { time: 760, text: "Questa è la tua vita. Non un sogno. La tua realtà che si costruisce giorno dopo giorno." },
        { time: 820, text: "Ancora queste immagini nel tuo cuore. Ti guidano. Diventano realtà." },
        { time: 880, text: "Fai un respiro profondo. Apri lentamente gli occhi. Sei pronto a creare questa vita." }
      ]
    },
    pt: {
      name: "Visualização Positiva",
      intro: "Esta meditação poderosa te guia a visualizar sua vida ideal. Saúde, missão, amor, sucesso. Tudo o que você merece.",
      steps: [
        { time: 0, text: "Feche os olhos. Faça algumas respirações profundas. Deixe o mundo exterior se afastar." },
        { time: 30, text: "Você vai criar em sua mente a visão da sua vida mais bonita. Aquela que você profundamente merece." },
        { time: 60, text: "Comece visualizando seu corpo. Você tem uma saúde de ferro. Energia transbordante." },
        { time: 90, text: "Veja-se acordando cada manhã cheio de vitalidade. Seu corpo é forte, flexível, em perfeita saúde." },
        { time: 120, text: "Sinta esta energia fluindo através de você. Cada célula vibra com saúde. Você é invencível." },
        { time: 160, text: "Agora visualize sua missão de vida. Aquela coisa importante para a qual você nasceu." },
        { time: 200, text: "Veja sua missão de democracia avançando no mundo. Suas ideias tocam milhares de pessoas." },
        { time: 240, text: "Você tem impacto real. As pessoas ouvem. As coisas mudam por sua causa. Você faz a diferença." },
        { time: 280, text: "Sinta o orgulho de contribuir para algo maior que você. Sua missão está em andamento." },
        { time: 320, text: "Visualize agora sua vida amorosa. Sua esposa te olha com olhos cheios de amor." },
        { time: 360, text: "Ela te admira. Te apoia. Juntos, vocês formam uma equipe invencível." },
        { time: 400, text: "Suas conversas são profundas. Seus silêncios são confortáveis. O amor está em toda parte." },
        { time: 440, text: "Agora veja seus filhos. Eles te olham com admiração. Você é o herói deles." },
        { time: 480, text: "Eles têm orgulho de você. Querem ser como você. Você transmite o melhor a eles." },
        { time: 520, text: "Sua família é unida. Cheia de risadas, ternura, momentos preciosos." },
        { time: 560, text: "Visualize seu sucesso profissional. Portas se abrem. Oportunidades fluem." },
        { time: 600, text: "Você alcança seus objetivos. O dinheiro flui. A abundância é seu estado natural." },
        { time: 640, text: "Você é reconhecido pelo seu trabalho. Respeitado. Admirado. Você merece todo este sucesso." },
        { time: 700, text: "Agora sinta todas essas visualizações de uma vez. Saúde. Missão. Amor. Sucesso." },
        { time: 760, text: "Esta é sua vida. Não um sonho. Sua realidade sendo construída dia após dia." },
        { time: 820, text: "Ancore essas imagens em seu coração. Elas te guiam. Elas se tornam realidade." },
        { time: 880, text: "Respire fundo. Abra lentamente os olhos. Você está pronto para criar esta vida." }
      ]
    }
  },

  // ===== GRATITUDE =====
  gratitude: {
    duration: 8 * 60, // 8 minutes
    fr: {
      name: "Gratitude",
      intro: "Cette méditation cultive la gratitude, l'émotion la plus puissante pour transformer ta vie.",
      steps: [
        { time: 0, text: "Ferme les yeux. Prends quelques respirations profondes. Laisse ton corps se détendre." },
        { time: 25, text: "La gratitude est une force magique. Elle transforme ce que nous avons en suffisance." },
        { time: 50, text: "Pense à ton corps. Il te porte chaque jour. Tes yeux voient, tes oreilles entendent. Merci, corps." },
        { time: 80, text: "Ressens la gratitude pour chaque battement de ton cœur. Il bat depuis ta naissance, sans relâche." },
        { time: 110, text: "Pense maintenant à un être cher. Quelqu'un qui t'aime. Visualise son visage. Ressens l'amour." },
        { time: 150, text: "Merci pour cette personne. Pour sa présence dans ta vie. Pour tout ce qu'elle t'apporte." },
        { time: 190, text: "Pense à un moment de bonheur récent. Un sourire, un rire, une petite victoire. Revisite-le." },
        { time: 230, text: "Ressens cette joie à nouveau. La vie t'offre ces cadeaux chaque jour. Merci." },
        { time: 270, text: "Pense à ta maison, ton refuge. Un endroit où tu es en sécurité. Beaucoup n'ont pas cette chance." },
        { time: 310, text: "Gratitude pour le toit au-dessus de ta tête. Pour la nourriture qui te nourrit. L'eau qui te désaltère." },
        { time: 350, text: "Pense à une difficulté passée. Elle t'a rendu plus fort. Plus sage. Remercie-la aussi." },
        { time: 390, text: "Chaque épreuve est un enseignement. Chaque obstacle, une opportunité de grandir." },
        { time: 420, text: "Ressens maintenant une gratitude globale. Pour ta vie. Pour ce moment. Pour tout." },
        { time: 450, text: "Tu es vivant. Tu respires. Tu as le pouvoir de changer ta vie. C'est extraordinaire." },
        { time: 480, text: "Prends une grande inspiration de gratitude. Ouvre les yeux. Emporte cette énergie avec toi." }
      ]
    },
    en: {
      name: "Gratitude",
      intro: "This meditation cultivates gratitude, the most powerful emotion for transforming your life.",
      steps: [
        { time: 0, text: "Close your eyes. Take a few deep breaths. Let your body relax." },
        { time: 25, text: "Gratitude is a magical force. It transforms what we have into enough." },
        { time: 50, text: "Think about your body. It carries you every day. Your eyes see, your ears hear. Thank you, body." },
        { time: 80, text: "Feel gratitude for every heartbeat. It has been beating since birth, without rest." },
        { time: 110, text: "Now think of a loved one. Someone who loves you. Visualize their face. Feel the love." },
        { time: 150, text: "Thank you for this person. For their presence in your life. For everything they bring you." },
        { time: 190, text: "Think of a recent happy moment. A smile, a laugh, a small victory. Revisit it." },
        { time: 230, text: "Feel that joy again. Life offers you these gifts every day. Thank you." },
        { time: 270, text: "Think of your home, your refuge. A place where you are safe. Many don't have this luck." },
        { time: 310, text: "Gratitude for the roof over your head. For the food that nourishes you. The water that quenches." },
        { time: 350, text: "Think of a past difficulty. It made you stronger. Wiser. Thank it too." },
        { time: 390, text: "Every trial is a teaching. Every obstacle, an opportunity to grow." },
        { time: 420, text: "Now feel a global gratitude. For your life. For this moment. For everything." },
        { time: 450, text: "You are alive. You are breathing. You have the power to change your life. That's extraordinary." },
        { time: 480, text: "Take a deep breath of gratitude. Open your eyes. Carry this energy with you." }
      ]
    },
    es: {
      name: "Gratitud",
      intro: "Esta meditación cultiva la gratitud, la emoción más poderosa para transformar tu vida.",
      steps: [
        { time: 0, text: "Cierra los ojos. Toma algunas respiraciones profundas. Deja que tu cuerpo se relaje." },
        { time: 25, text: "La gratitud es una fuerza mágica. Transforma lo que tenemos en suficiente." },
        { time: 50, text: "Piensa en tu cuerpo. Te lleva cada día. Tus ojos ven, tus oídos escuchan. Gracias, cuerpo." },
        { time: 80, text: "Siente gratitud por cada latido de tu corazón. Ha latido desde tu nacimiento, sin descanso." },
        { time: 110, text: "Ahora piensa en un ser querido. Alguien que te ama. Visualiza su rostro. Siente el amor." },
        { time: 150, text: "Gracias por esta persona. Por su presencia en tu vida. Por todo lo que te aporta." },
        { time: 190, text: "Piensa en un momento feliz reciente. Una sonrisa, una risa, una pequeña victoria. Revívelo." },
        { time: 230, text: "Siente esa alegría de nuevo. La vida te ofrece estos regalos cada día. Gracias." },
        { time: 270, text: "Piensa en tu hogar, tu refugio. Un lugar donde estás seguro. Muchos no tienen esta suerte." },
        { time: 310, text: "Gratitud por el techo sobre tu cabeza. Por la comida que te nutre. El agua que te sacia." },
        { time: 350, text: "Piensa en una dificultad pasada. Te hizo más fuerte. Más sabio. Agradécele también." },
        { time: 390, text: "Cada prueba es una enseñanza. Cada obstáculo, una oportunidad de crecer." },
        { time: 420, text: "Ahora siente una gratitud global. Por tu vida. Por este momento. Por todo." },
        { time: 450, text: "Estás vivo. Respiras. Tienes el poder de cambiar tu vida. Es extraordinario." },
        { time: 480, text: "Toma una respiración profunda de gratitud. Abre los ojos. Lleva esta energía contigo." }
      ]
    },
    de: {
      name: "Dankbarkeit",
      intro: "Diese Meditation kultiviert Dankbarkeit, die kraftvollste Emotion zur Transformation deines Lebens.",
      steps: [
        { time: 0, text: "Schließe die Augen. Nimm einige tiefe Atemzüge. Lass deinen Körper entspannen." },
        { time: 25, text: "Dankbarkeit ist eine magische Kraft. Sie verwandelt das, was wir haben, in Genug." },
        { time: 50, text: "Denke an deinen Körper. Er trägt dich jeden Tag. Deine Augen sehen, deine Ohren hören. Danke, Körper." },
        { time: 80, text: "Spüre Dankbarkeit für jeden Herzschlag. Es schlägt seit deiner Geburt, ohne Pause." },
        { time: 110, text: "Denke jetzt an einen geliebten Menschen. Jemand, der dich liebt. Visualisiere sein Gesicht. Spüre die Liebe." },
        { time: 150, text: "Danke für diese Person. Für ihre Gegenwart in deinem Leben. Für alles, was sie dir gibt." },
        { time: 190, text: "Denke an einen kürzlichen glücklichen Moment. Ein Lächeln, ein Lachen, ein kleiner Sieg. Erlebe ihn wieder." },
        { time: 230, text: "Spüre diese Freude erneut. Das Leben bietet dir diese Geschenke jeden Tag. Danke." },
        { time: 270, text: "Denke an dein Zuhause, deine Zuflucht. Ein Ort, wo du sicher bist. Viele haben dieses Glück nicht." },
        { time: 310, text: "Dankbarkeit für das Dach über deinem Kopf. Für das Essen, das dich nährt. Das Wasser, das dich erfrischt." },
        { time: 350, text: "Denke an eine vergangene Schwierigkeit. Sie machte dich stärker. Weiser. Danke ihr auch." },
        { time: 390, text: "Jede Prüfung ist eine Lehre. Jedes Hindernis eine Chance zu wachsen." },
        { time: 420, text: "Spüre jetzt eine globale Dankbarkeit. Für dein Leben. Für diesen Moment. Für alles." },
        { time: 450, text: "Du lebst. Du atmest. Du hast die Kraft, dein Leben zu ändern. Das ist außergewöhnlich." },
        { time: 480, text: "Nimm einen tiefen Atemzug der Dankbarkeit. Öffne die Augen. Trage diese Energie mit dir." }
      ]
    },
    it: {
      name: "Gratitudine",
      intro: "Questa meditazione coltiva la gratitudine, l'emozione più potente per trasformare la tua vita.",
      steps: [
        { time: 0, text: "Chiudi gli occhi. Fai alcuni respiri profondi. Lascia che il corpo si rilassi." },
        { time: 25, text: "La gratitudine è una forza magica. Trasforma ciò che abbiamo in abbastanza." },
        { time: 50, text: "Pensa al tuo corpo. Ti porta ogni giorno. I tuoi occhi vedono, le tue orecchie sentono. Grazie, corpo." },
        { time: 80, text: "Senti gratitudine per ogni battito del cuore. Batte dalla nascita, senza sosta." },
        { time: 110, text: "Ora pensa a una persona cara. Qualcuno che ti ama. Visualizza il suo volto. Senti l'amore." },
        { time: 150, text: "Grazie per questa persona. Per la sua presenza nella tua vita. Per tutto ciò che ti dona." },
        { time: 190, text: "Pensa a un momento felice recente. Un sorriso, una risata, una piccola vittoria. Rivivilo." },
        { time: 230, text: "Senti quella gioia di nuovo. La vita ti offre questi doni ogni giorno. Grazie." },
        { time: 270, text: "Pensa alla tua casa, il tuo rifugio. Un posto dove sei al sicuro. Molti non hanno questa fortuna." },
        { time: 310, text: "Gratitudine per il tetto sopra la tua testa. Per il cibo che ti nutre. L'acqua che ti disseta." },
        { time: 350, text: "Pensa a una difficoltà passata. Ti ha reso più forte. Più saggio. Ringraziala anche." },
        { time: 390, text: "Ogni prova è un insegnamento. Ogni ostacolo un'opportunità di crescere." },
        { time: 420, text: "Ora senti una gratitudine globale. Per la tua vita. Per questo momento. Per tutto." },
        { time: 450, text: "Sei vivo. Respiri. Hai il potere di cambiare la tua vita. È straordinario." },
        { time: 480, text: "Fai un respiro profondo di gratitudine. Apri gli occhi. Porta questa energia con te." }
      ]
    },
    pt: {
      name: "Gratidão",
      intro: "Esta meditação cultiva a gratidão, a emoção mais poderosa para transformar sua vida.",
      steps: [
        { time: 0, text: "Feche os olhos. Faça algumas respirações profundas. Deixe seu corpo relaxar." },
        { time: 25, text: "A gratidão é uma força mágica. Ela transforma o que temos em suficiente." },
        { time: 50, text: "Pense no seu corpo. Ele te carrega todos os dias. Seus olhos veem, seus ouvidos ouvem. Obrigado, corpo." },
        { time: 80, text: "Sinta gratidão por cada batida do seu coração. Ele bate desde seu nascimento, sem parar." },
        { time: 110, text: "Agora pense em alguém querido. Alguém que te ama. Visualize seu rosto. Sinta o amor." },
        { time: 150, text: "Obrigado por essa pessoa. Por sua presença em sua vida. Por tudo que ela te traz." },
        { time: 190, text: "Pense em um momento feliz recente. Um sorriso, uma risada, uma pequena vitória. Reviva-o." },
        { time: 230, text: "Sinta essa alegria novamente. A vida te oferece esses presentes todos os dias. Obrigado." },
        { time: 270, text: "Pense na sua casa, seu refúgio. Um lugar onde você está seguro. Muitos não têm essa sorte." },
        { time: 310, text: "Gratidão pelo teto sobre sua cabeça. Pela comida que te nutre. A água que te sacia." },
        { time: 350, text: "Pense em uma dificuldade passada. Ela te fez mais forte. Mais sábio. Agradeça a ela também." },
        { time: 390, text: "Cada provação é um ensinamento. Cada obstáculo, uma oportunidade de crescer." },
        { time: 420, text: "Agora sinta uma gratidão global. Por sua vida. Por este momento. Por tudo." },
        { time: 450, text: "Você está vivo. Você respira. Você tem o poder de mudar sua vida. Isso é extraordinário." },
        { time: 480, text: "Faça uma respiração profunda de gratidão. Abra os olhos. Leve essa energia com você." }
      ]
    }
  }
};

// État de la méditation
const meditationState = {
  isRunning: false,
  currentMeditation: null,
  selectedType: null,
  currentStepIndex: 0,
  timer: null,
  startTime: null,
  timeElapsed: 0,
  isPaused: false
};

// Initialisation du module méditation
function initMeditation() {
  const meditationCards = document.querySelectorAll('.meditation-card');
  const backBtn = document.getElementById('back-to-meditations');
  const startBtn = document.getElementById('meditation-start-btn');
  const pauseBtn = document.getElementById('meditation-pause-btn');
  const stopBtn = document.getElementById('meditation-stop-btn');

  meditationCards.forEach(card => {
    card.addEventListener('click', () => {
      const meditationType = card.dataset.meditation;
      prepareMeditation(meditationType);
    });
  });

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      document.getElementById('meditation-session').classList.add('hidden');
      document.getElementById('meditation-list').classList.remove('hidden');
      stopMeditation();
    });
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (meditationState.selectedType) {
        startMeditation(meditationState.selectedType);
      }
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener('click', toggleMeditationPause);
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      stopMeditation();
      document.getElementById('meditation-session').classList.add('hidden');
      document.getElementById('meditation-list').classList.remove('hidden');
    });
  }
}

function prepareMeditation(type) {
  const script = meditationScripts[type];
  if (!script) return;

  const lang = state.settings.voiceLang || 'fr';
  const langScript = script[lang] || script.fr;

  meditationState.selectedType = type;

  // Show session view
  document.getElementById('meditation-list').classList.add('hidden');
  document.getElementById('meditation-session').classList.remove('hidden');

  // Update UI
  document.getElementById('meditation-title').textContent = langScript.name;
  document.getElementById('meditation-instruction').textContent = langScript.intro;
  updateMeditationTimer(0, script.duration);

  // Reset progress ring
  const progressRing = document.getElementById('meditation-progress-ring');
  if (progressRing) {
    progressRing.style.strokeDashoffset = '565.48';
  }

  // Show start button, hide others
  document.getElementById('meditation-start-btn').classList.remove('hidden');
  document.getElementById('meditation-pause-btn').classList.add('hidden');
  document.getElementById('meditation-stop-btn').classList.add('hidden');
}

function startMeditation(type) {
  const script = meditationScripts[type];
  if (!script) return;

  const lang = state.settings.voiceLang || 'fr';
  const langScript = script[lang] || script.fr;

  meditationState.currentMeditation = type;
  meditationState.currentStepIndex = 0;
  meditationState.isRunning = true;
  meditationState.isPaused = false;
  meditationState.startTime = Date.now();
  meditationState.timeElapsed = 0;

  // Hide start, show pause/stop
  document.getElementById('meditation-start-btn').classList.add('hidden');
  document.getElementById('meditation-pause-btn').classList.remove('hidden');
  document.getElementById('meditation-stop-btn').classList.remove('hidden');

  // Update UI
  document.getElementById('meditation-instruction').textContent = langScript.intro;

  // Speak intro
  voicePlayer.speak(langScript.intro, lang);

  // Start timer after intro delay
  setTimeout(() => {
    if (meditationState.isRunning) {
      runMeditationTimer(type, langScript, script.duration, lang);
    }
  }, 5000);
}

function runMeditationTimer(type, langScript, totalDuration, lang) {
  meditationState.timer = setInterval(() => {
    if (meditationState.isPaused) return;

    meditationState.timeElapsed++;
    updateMeditationTimer(meditationState.timeElapsed, totalDuration);

    // Update progress ring
    const progress = meditationState.timeElapsed / totalDuration;
    const progressRing = document.getElementById('meditation-progress-ring');
    if (progressRing) {
      const circumference = 565.48;
      progressRing.style.strokeDashoffset = circumference - (progress * circumference);
    }

    // Check for next step
    const steps = langScript.steps;
    for (let i = meditationState.currentStepIndex; i < steps.length; i++) {
      if (steps[i].time <= meditationState.timeElapsed && i > meditationState.currentStepIndex - 1) {
        if (i !== meditationState.currentStepIndex || meditationState.timeElapsed === steps[i].time) {
          if (meditationState.timeElapsed >= steps[i].time && meditationState.timeElapsed < steps[i].time + 2) {
            meditationState.currentStepIndex = i + 1;
            document.getElementById('meditation-instruction').textContent = steps[i].text;
            voicePlayer.speak(steps[i].text, lang);
            break;
          }
        }
      }
    }

    // End meditation
    if (meditationState.timeElapsed >= totalDuration) {
      completeMeditation();
    }
  }, 1000);
}

function updateMeditationTimer(elapsed, total) {
  const remaining = total - elapsed;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const timerEl = document.getElementById('meditation-time');
  if (timerEl) {
    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

function toggleMeditationPause() {
  meditationState.isPaused = !meditationState.isPaused;

  const pauseBtn = document.getElementById('meditation-pause-btn');
  if (pauseBtn) {
    pauseBtn.innerHTML = meditationState.isPaused
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
  }

  if (meditationState.isPaused) {
    voicePlayer.stop();
  }
}

function stopMeditation() {
  meditationState.isRunning = false;
  meditationState.isPaused = false;

  if (meditationState.timer) {
    clearInterval(meditationState.timer);
    meditationState.timer = null;
  }

  voicePlayer.stop();
  meditationState.currentMeditation = null;
  meditationState.currentStepIndex = 0;
  meditationState.timeElapsed = 0;
}

function completeMeditation() {
  stopMeditation();

  const lang = state.settings.voiceLang || 'fr';
  const completionMessages = {
    fr: "Méditation terminée. Namaste.",
    en: "Meditation complete. Namaste.",
    es: "Meditación completada. Namaste.",
    de: "Meditation abgeschlossen. Namaste.",
    it: "Meditazione completata. Namaste.",
    pt: "Meditação completa. Namaste."
  };

  document.getElementById('meditation-instruction').textContent = completionMessages[lang] || completionMessages.fr;
  voicePlayer.speak(completionMessages[lang] || completionMessages.fr, lang);

  // Vibration de fin
  if (state.settings.vibration && navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }

  // Bell sound
  playBell();

  // Return to list after delay
  setTimeout(() => {
    document.getElementById('meditation-session').classList.add('hidden');
    document.getElementById('meditation-list').classList.remove('hidden');
  }, 5000);
}

// ===== Service Worker =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('SW enregistré'))
    .catch(err => console.log('SW erreur:', err));
}
