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

// ===== Fonction globale d'arrêt de tous les modules =====
// Arrête tous les timers actifs sauf le module spécifié
function stopAllModules(exceptModule = null) {
  // Arrêter la respiration
  if (exceptModule !== 'breathing' && state.breathingSession) {
    if (typeof stopSession === 'function') {
      try { stopSession(); } catch(e) {}
    }
  }

  // Arrêter Pomodoro
  if (exceptModule !== 'pomodoro' && state.pomodoro.isRunning) {
    if (typeof resetPomodoro === 'function') {
      try { resetPomodoro(); } catch(e) {}
    }
  }

  // Arrêter douche froide
  if (exceptModule !== 'coldshower' && typeof coldShowerState !== 'undefined' && coldShowerState.isRunning) {
    if (typeof stopColdShower === 'function') {
      try { stopColdShower(); } catch(e) {}
    }
  }

  // Arrêter méditation
  if (exceptModule !== 'meditation' && typeof meditationState !== 'undefined' && meditationState.isRunning) {
    if (typeof stopMeditation === 'function') {
      try { stopMeditation(); } catch(e) {}
    }
  }

  // Arrêter l'audio global
  const audioPlayer = document.getElementById('audio-player');
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
  }

  // Arrêter le voice player
  if (typeof voicePlayer !== 'undefined' && voicePlayer.stop) {
    voicePlayer.stop();
  }
}

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

// ===== Sons de Méditation (Web Audio API) =====
class MeditationSounds {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.nodes = [];
    this.bowlInterval = null;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Son de bol tibétain (cloche résonnante)
  playBowl() {
    this.init();
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Fréquences harmoniques du bol tibétain
    const frequencies = [220, 440, 660, 880];
    const duration = 8;

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      // Attaque rapide, décroissance lente
      const vol = 0.15 / (i + 1);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // Drone d'ambiance relaxant
  startAmbience() {
    this.init();
    this.isPlaying = true;
    const ctx = this.audioCtx;

    // Drone basse fréquence
    const droneOsc = ctx.createOscillator();
    const droneGain = ctx.createGain();
    droneOsc.type = 'sine';
    droneOsc.frequency.value = 110; // La grave
    droneGain.gain.value = 0.08;
    droneOsc.connect(droneGain);
    droneGain.connect(ctx.destination);
    droneOsc.start();
    this.nodes.push({ osc: droneOsc, gain: droneGain });

    // Harmonique douce
    const harmOsc = ctx.createOscillator();
    const harmGain = ctx.createGain();
    harmOsc.type = 'sine';
    harmOsc.frequency.value = 165; // Quinte
    harmGain.gain.value = 0.04;
    harmOsc.connect(harmGain);
    harmGain.connect(ctx.destination);
    harmOsc.start();
    this.nodes.push({ osc: harmOsc, gain: harmGain });

    // Bol tibétain périodique
    this.playBowl();
    this.bowlInterval = setInterval(() => {
      if (this.isPlaying) this.playBowl();
    }, 15000); // Toutes les 15 secondes
  }

  stop() {
    this.isPlaying = false;

    // Arrêter le bol périodique
    if (this.bowlInterval) {
      clearInterval(this.bowlInterval);
      this.bowlInterval = null;
    }

    // Fade out et arrêt des oscillateurs
    this.nodes.forEach(node => {
      try {
        const now = this.audioCtx.currentTime;
        node.gain.gain.linearRampToValueAtTime(0, now + 0.5);
        setTimeout(() => node.osc.stop(), 600);
      } catch(e) {}
    });
    this.nodes = [];
  }
}

const meditationSounds = new MeditationSounds();

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
    url: 'https://archive.org/download/meditation-music/Peaceful%20Relaxing%20Instrumental%20Music.mp3',
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
    url: 'https://archive.org/download/meditation-music/Relaxing%20Music%20with%20Water%20Sounds.mp3',
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
  // === HANGDRUM - Pour méditation et relaxation ===
  hangdrum1: {
    name: 'Handpan Meditation',
    url: 'https://archive.org/download/meditation-music/Handpan%20Meditation%20Music.mp3',
    category: 'neutre'
  }
};

// ===== Son Épique Synthétique (Web Audio API) =====
class EpicSound {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.nodes = [];
    this.beatInterval = null;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Kick drum épique
  playKick() {
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Snare/caisse claire
  playSnare() {
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Noise burst
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
  }

  // Note de cuivre synthétique (power chord)
  playBrass() {
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const notes = [110, 165, 220]; // La, Mi, La (power chord)
    notes.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
      gain.gain.setValueAtTime(0.15, now + 0.3);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    });
  }

  // Démarrer le beat épique
  start() {
    this.init();
    this.isPlaying = true;

    let beat = 0;
    const bpm = 140;
    const interval = 60000 / bpm / 2; // Demi-temps

    // Pattern épique: KICK - - SNARE - KICK - SNARE -
    const pattern = () => {
      if (!this.isPlaying) return;

      const pos = beat % 8;
      if (pos === 0 || pos === 5) this.playKick();
      if (pos === 3 || pos === 7) this.playSnare();
      if (pos === 0 && beat % 16 === 0) this.playBrass();

      beat++;
    };

    pattern();
    this.beatInterval = setInterval(pattern, interval);
  }

  stop() {
    this.isPlaying = false;
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
  }
}

const epicSound = new EpicSound();

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

  // Arrêter les autres modules
  stopAllModules('breathing');

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
// Exercices pré-définis calisthénie
const presetExercises = {
  'Pompes': '10',
  'Tractions': '5',
  'Dips': '10',
  'Drapeau': '10',
  'Reverse Planche': '10',
  'Reverse Tractions': '5',
  'Pistols': '10',
  'Squat Sautés': '10',
  'Squat': '10'
};

function initCalisthenics() {
  const addBtn = document.getElementById('add-workout-btn');
  const modal = document.getElementById('workout-modal');
  const closeModal = document.getElementById('close-modal');
  const cancelBtn = document.getElementById('cancel-workout');
  const form = document.getElementById('workout-form');
  const addExerciseBtn = document.getElementById('add-exercise-btn');
  const quickAddBtn = document.getElementById('quick-add-exercise-btn');
  const presetSelect = document.getElementById('preset-exercise-select');

  addBtn.addEventListener('click', () => {
    openWorkoutModal();
  });

  closeModal.addEventListener('click', () => closeWorkoutModal());
  cancelBtn.addEventListener('click', () => closeWorkoutModal());

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeWorkoutModal();
  });

  addExerciseBtn.addEventListener('click', () => addExerciseInput());

  // Ajout rapide d'exercice pré-défini
  quickAddBtn.addEventListener('click', () => {
    const exerciseName = presetSelect.value;
    if (exerciseName) {
      const defaultSets = presetExercises[exerciseName] || '3x10';
      addExerciseInput(exerciseName, defaultSets);
      presetSelect.value = '';
    }
  });

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
  // Arrêter les autres modules
  stopAllModules('pomodoro');

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

  // Arrêter les autres modules
  stopAllModules('coldshower');

  coldShowerState.isRunning = true;
  coldShowerState.timeLeft = coldShowerState.duration;
  console.log('Duration:', coldShowerState.duration, 'TimeLeft:', coldShowerState.timeLeft);

  // Update UI
  const startBtn = document.getElementById('cold-start-btn');
  const stopBtn = document.getElementById('cold-stop-btn');
  console.log('Hiding start, showing stop');

  if (startBtn) startBtn.classList.add('hidden');
  if (stopBtn) stopBtn.classList.remove('hidden');

  // Démarrer le son épique si activé
  const epicToggle = document.getElementById('cold-epic-toggle');
  if (epicToggle && epicToggle.checked) {
    epicSound.start();
    coldShowerState.musicPlaying = true;
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
    epicSound.stop();
    coldShowerState.musicPlaying = false;
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

// Scripts de méditation en 6 langues - Timings fluides (15-20 sec)
const meditationScripts = {
  // ===== BODY SCAN =====
  bodyscan: {
    duration: 5 * 60, // 5 minutes
    fr: {
      name: "Scan Corporel",
      intro: "Scan corporel. Ferme les yeux et détends-toi.",
      steps: [
        { time: 0, text: "Prends trois grandes respirations. Inspire... expire..." },
        { time: 15, text: "Relâche ton visage. Front, yeux, mâchoire." },
        { time: 30, text: "Détends ton cou et tes épaules. Laisse la tension partir." },
        { time: 45, text: "Relâche tes bras, tes mains, jusqu'au bout des doigts." },
        { time: 60, text: "Observe ta poitrine. Le mouvement de ta respiration." },
        { time: 80, text: "Détends ton ventre. À chaque expire, relâche un peu plus." },
        { time: 100, text: "Relâche le bas du dos. Offre-lui de la douceur." },
        { time: 120, text: "Détends tes hanches, ton bassin." },
        { time: 140, text: "Relâche tes cuisses, tes genoux, tes mollets." },
        { time: 160, text: "Détends tes pieds. Chevilles, plante, orteils." },
        { time: 180, text: "Ressens ton corps entier. Unifié. Détendu." },
        { time: 200, text: "Tu es présent. Ici. Maintenant." },
        { time: 220, text: "Chaque cellule est en paix." },
        { time: 240, text: "Profite de ce calme profond." },
        { time: 260, text: "Commence à bouger doucement les doigts." },
        { time: 280, text: "Prends une grande inspiration." },
        { time: 295, text: "Ouvre les yeux quand tu es prêt." }
      ]
    },
    en: {
      name: "Body Scan",
      intro: "Body scan. Close your eyes and relax.",
      steps: [
        { time: 0, text: "Take three deep breaths. Inhale... exhale..." },
        { time: 15, text: "Relax your face. Forehead, eyes, jaw." },
        { time: 30, text: "Release your neck and shoulders. Let the tension go." },
        { time: 45, text: "Relax your arms, hands, down to your fingertips." },
        { time: 60, text: "Notice your chest. The movement of your breath." },
        { time: 80, text: "Relax your belly. With each exhale, release more." },
        { time: 100, text: "Release your lower back. Offer it gentleness." },
        { time: 120, text: "Relax your hips, your pelvis." },
        { time: 140, text: "Release your thighs, knees, calves." },
        { time: 160, text: "Relax your feet. Ankles, soles, toes." },
        { time: 180, text: "Feel your whole body. Unified. Relaxed." },
        { time: 200, text: "You are present. Here. Now." },
        { time: 220, text: "Every cell is at peace." },
        { time: 240, text: "Enjoy this deep calm." },
        { time: 260, text: "Begin to gently move your fingers." },
        { time: 280, text: "Take a deep breath." },
        { time: 295, text: "Open your eyes when ready." }
      ]
    },
    es: {
      name: "Escaneo Corporal",
      intro: "Escaneo corporal. Cierra los ojos y relájate.",
      steps: [
        { time: 0, text: "Toma tres respiraciones profundas. Inhala... exhala..." },
        { time: 15, text: "Relaja tu cara. Frente, ojos, mandíbula." },
        { time: 30, text: "Suelta cuello y hombros. Deja ir la tensión." },
        { time: 45, text: "Relaja brazos, manos, hasta las puntas de los dedos." },
        { time: 60, text: "Observa tu pecho. El movimiento de tu respiración." },
        { time: 80, text: "Relaja tu vientre. Con cada exhala, suelta más." },
        { time: 100, text: "Suelta la parte baja de la espalda." },
        { time: 120, text: "Relaja caderas y pelvis." },
        { time: 140, text: "Suelta muslos, rodillas, pantorrillas." },
        { time: 160, text: "Relaja tus pies. Tobillos, plantas, dedos." },
        { time: 180, text: "Siente todo tu cuerpo. Unificado. Relajado." },
        { time: 200, text: "Estás presente. Aquí. Ahora." },
        { time: 220, text: "Cada célula está en paz." },
        { time: 240, text: "Disfruta esta calma profunda." },
        { time: 260, text: "Comienza a mover suavemente los dedos." },
        { time: 280, text: "Toma una respiración profunda." },
        { time: 295, text: "Abre los ojos cuando estés listo." }
      ]
    },
    de: {
      name: "Körper-Scan",
      intro: "Körper-Scan. Schließe die Augen und entspanne dich.",
      steps: [
        { time: 0, text: "Nimm drei tiefe Atemzüge. Einatmen... ausatmen..." },
        { time: 15, text: "Entspanne dein Gesicht. Stirn, Augen, Kiefer." },
        { time: 30, text: "Löse Nacken und Schultern. Lass die Spannung los." },
        { time: 45, text: "Entspanne Arme, Hände, bis zu den Fingerspitzen." },
        { time: 60, text: "Beobachte deine Brust. Die Bewegung deines Atems." },
        { time: 80, text: "Entspanne deinen Bauch. Mit jedem Ausatmen mehr loslassen." },
        { time: 100, text: "Löse den unteren Rücken. Schenke ihm Sanftheit." },
        { time: 120, text: "Entspanne Hüften und Becken." },
        { time: 140, text: "Löse Oberschenkel, Knie, Waden." },
        { time: 160, text: "Entspanne deine Füße. Knöchel, Sohlen, Zehen." },
        { time: 180, text: "Spüre deinen ganzen Körper. Vereint. Entspannt." },
        { time: 200, text: "Du bist präsent. Hier. Jetzt." },
        { time: 220, text: "Jede Zelle ist in Frieden." },
        { time: 240, text: "Genieße diese tiefe Ruhe." },
        { time: 260, text: "Bewege sanft deine Finger." },
        { time: 280, text: "Atme tief ein." },
        { time: 295, text: "Öffne die Augen, wenn du bereit bist." }
      ]
    },
    it: {
      name: "Scansione Corporea",
      intro: "Scansione corporea. Chiudi gli occhi e rilassati.",
      steps: [
        { time: 0, text: "Fai tre respiri profondi. Inspira... espira..." },
        { time: 15, text: "Rilassa il viso. Fronte, occhi, mascella." },
        { time: 30, text: "Lascia andare collo e spalle. Rilascia la tensione." },
        { time: 45, text: "Rilassa braccia, mani, fino alle punte delle dita." },
        { time: 60, text: "Osserva il petto. Il movimento del respiro." },
        { time: 80, text: "Rilassa la pancia. Ad ogni espiro, lascia andare di più." },
        { time: 100, text: "Rilascia la parte bassa della schiena." },
        { time: 120, text: "Rilassa fianchi e bacino." },
        { time: 140, text: "Lascia andare cosce, ginocchia, polpacci." },
        { time: 160, text: "Rilassa i piedi. Caviglie, piante, dita." },
        { time: 180, text: "Senti tutto il corpo. Unificato. Rilassato." },
        { time: 200, text: "Sei presente. Qui. Ora." },
        { time: 220, text: "Ogni cellula è in pace." },
        { time: 240, text: "Goditi questa calma profonda." },
        { time: 260, text: "Inizia a muovere dolcemente le dita." },
        { time: 280, text: "Fai un respiro profondo." },
        { time: 295, text: "Apri gli occhi quando sei pronto." }
      ]
    },
    pt: {
      name: "Escaneamento Corporal",
      intro: "Escaneamento corporal. Feche os olhos e relaxe.",
      steps: [
        { time: 0, text: "Faça três respirações profundas. Inspire... expire..." },
        { time: 15, text: "Relaxe seu rosto. Testa, olhos, mandíbula." },
        { time: 30, text: "Solte pescoço e ombros. Deixe a tensão ir." },
        { time: 45, text: "Relaxe braços, mãos, até as pontas dos dedos." },
        { time: 60, text: "Observe seu peito. O movimento da respiração." },
        { time: 80, text: "Relaxe a barriga. A cada expiração, solte mais." },
        { time: 100, text: "Solte a parte baixa das costas." },
        { time: 120, text: "Relaxe quadris e pélvis." },
        { time: 140, text: "Solte coxas, joelhos, panturrilhas." },
        { time: 160, text: "Relaxe os pés. Tornozelos, plantas, dedos." },
        { time: 180, text: "Sinta todo o corpo. Unificado. Relaxado." },
        { time: 200, text: "Você está presente. Aqui. Agora." },
        { time: 220, text: "Cada célula está em paz." },
        { time: 240, text: "Aproveite esta calma profunda." },
        { time: 260, text: "Comece a mover suavemente os dedos." },
        { time: 280, text: "Respire fundo." },
        { time: 295, text: "Abra os olhos quando estiver pronto." }
      ]
    }
  },

  // ===== BREATH AWARENESS =====
  breathaware: {
    duration: 4 * 60, // 4 minutes
    fr: {
      name: "Conscience Respiratoire",
      intro: "Conscience respiratoire. Observe ton souffle.",
      steps: [
        { time: 0, text: "Ferme les yeux. Observe ta respiration naturelle." },
        { time: 15, text: "L'air entre par tes narines. Frais. Léger." },
        { time: 30, text: "Il remplit tes poumons. Ton ventre se soulève." },
        { time: 45, text: "Pause naturelle. Ce moment suspendu." },
        { time: 60, text: "L'air ressort. Plus chaud. Tu te détends." },
        { time: 75, text: "Ta respiration est une vague. Elle monte, elle descend." },
        { time: 90, text: "Inspire la vie. Expire le stress." },
        { time: 105, text: "Les pensées passent comme des nuages. Laisse-les filer." },
        { time: 120, text: "Reviens toujours au souffle. Ton ancre." },
        { time: 135, text: "Chaque respiration est un nouveau départ." },
        { time: 150, text: "Tu n'as rien à faire. Juste respirer." },
        { time: 165, text: "Ce calme est toujours accessible." },
        { time: 180, text: "Ton souffle t'accompagne depuis toujours." },
        { time: 195, text: "Apprécie ce moment de paix." },
        { time: 210, text: "Reprends doucement conscience de l'espace." },
        { time: 225, text: "Une dernière grande inspiration." },
        { time: 238, text: "Ouvre les yeux. Merci." }
      ]
    },
    en: {
      name: "Breath Awareness",
      intro: "Breath awareness. Observe your breath.",
      steps: [
        { time: 0, text: "Close your eyes. Notice your natural breath." },
        { time: 15, text: "Air enters through your nostrils. Cool. Light." },
        { time: 30, text: "It fills your lungs. Your belly rises." },
        { time: 45, text: "Natural pause. That suspended moment." },
        { time: 60, text: "Air exits. Warmer. You relax." },
        { time: 75, text: "Your breath is a wave. Rising, falling." },
        { time: 90, text: "Inhale life. Exhale stress." },
        { time: 105, text: "Thoughts pass like clouds. Let them go." },
        { time: 120, text: "Always return to breath. Your anchor." },
        { time: 135, text: "Each breath is a fresh start." },
        { time: 150, text: "Nothing to do. Just breathe." },
        { time: 165, text: "This calm is always available." },
        { time: 180, text: "Your breath has always been with you." },
        { time: 195, text: "Appreciate this peaceful moment." },
        { time: 210, text: "Gently become aware of the space." },
        { time: 225, text: "One last deep breath." },
        { time: 238, text: "Open your eyes. Thank you." }
      ]
    },
    es: {
      name: "Conciencia Respiratoria",
      intro: "Conciencia respiratoria. Observa tu aliento.",
      steps: [
        { time: 0, text: "Cierra los ojos. Nota tu respiración natural." },
        { time: 15, text: "El aire entra por tus fosas nasales. Fresco. Ligero." },
        { time: 30, text: "Llena tus pulmones. Tu vientre sube." },
        { time: 45, text: "Pausa natural. Ese momento suspendido." },
        { time: 60, text: "El aire sale. Más cálido. Te relajas." },
        { time: 75, text: "Tu respiración es una ola. Sube, baja." },
        { time: 90, text: "Inhala vida. Exhala estrés." },
        { time: 105, text: "Los pensamientos pasan como nubes. Déjalos ir." },
        { time: 120, text: "Siempre vuelve a la respiración. Tu ancla." },
        { time: 135, text: "Cada respiración es un nuevo comienzo." },
        { time: 150, text: "Nada que hacer. Solo respirar." },
        { time: 165, text: "Esta calma siempre está disponible." },
        { time: 180, text: "Tu aliento siempre te ha acompañado." },
        { time: 195, text: "Aprecia este momento de paz." },
        { time: 210, text: "Suavemente toma conciencia del espacio." },
        { time: 225, text: "Una última respiración profunda." },
        { time: 238, text: "Abre los ojos. Gracias." }
      ]
    },
    de: {
      name: "Atem-Bewusstsein",
      intro: "Atem-Bewusstsein. Beobachte deinen Atem.",
      steps: [
        { time: 0, text: "Schließe die Augen. Beobachte deinen natürlichen Atem." },
        { time: 15, text: "Luft tritt durch die Nase ein. Kühl. Leicht." },
        { time: 30, text: "Sie füllt deine Lungen. Dein Bauch hebt sich." },
        { time: 45, text: "Natürliche Pause. Dieser schwebende Moment." },
        { time: 60, text: "Luft tritt aus. Wärmer. Du entspannst dich." },
        { time: 75, text: "Dein Atem ist eine Welle. Steigt, fällt." },
        { time: 90, text: "Atme Leben ein. Atme Stress aus." },
        { time: 105, text: "Gedanken ziehen wie Wolken vorbei. Lass sie gehen." },
        { time: 120, text: "Kehre immer zum Atem zurück. Dein Anker." },
        { time: 135, text: "Jeder Atemzug ist ein Neuanfang." },
        { time: 150, text: "Nichts zu tun. Einfach atmen." },
        { time: 165, text: "Diese Ruhe ist immer verfügbar." },
        { time: 180, text: "Dein Atem war immer bei dir." },
        { time: 195, text: "Schätze diesen friedlichen Moment." },
        { time: 210, text: "Werde dir sanft des Raumes bewusst." },
        { time: 225, text: "Ein letzter tiefer Atemzug." },
        { time: 238, text: "Öffne die Augen. Danke." }
      ]
    },
    it: {
      name: "Consapevolezza del Respiro",
      intro: "Consapevolezza del respiro. Osserva il tuo respiro.",
      steps: [
        { time: 0, text: "Chiudi gli occhi. Nota il tuo respiro naturale." },
        { time: 15, text: "L'aria entra dalle narici. Fresca. Leggera." },
        { time: 30, text: "Riempie i polmoni. La pancia si solleva." },
        { time: 45, text: "Pausa naturale. Quel momento sospeso." },
        { time: 60, text: "L'aria esce. Più calda. Ti rilassi." },
        { time: 75, text: "Il respiro è un'onda. Sale, scende." },
        { time: 90, text: "Inspira vita. Espira stress." },
        { time: 105, text: "I pensieri passano come nuvole. Lasciali andare." },
        { time: 120, text: "Torna sempre al respiro. La tua ancora." },
        { time: 135, text: "Ogni respiro è un nuovo inizio." },
        { time: 150, text: "Niente da fare. Solo respirare." },
        { time: 165, text: "Questa calma è sempre disponibile." },
        { time: 180, text: "Il tuo respiro è sempre stato con te." },
        { time: 195, text: "Apprezza questo momento di pace." },
        { time: 210, text: "Dolcemente prendi coscienza dello spazio." },
        { time: 225, text: "Un ultimo respiro profondo." },
        { time: 238, text: "Apri gli occhi. Grazie." }
      ]
    },
    pt: {
      name: "Consciência Respiratória",
      intro: "Consciência respiratória. Observe sua respiração.",
      steps: [
        { time: 0, text: "Feche os olhos. Note sua respiração natural." },
        { time: 15, text: "O ar entra pelas narinas. Fresco. Leve." },
        { time: 30, text: "Enche os pulmões. A barriga sobe." },
        { time: 45, text: "Pausa natural. Esse momento suspenso." },
        { time: 60, text: "O ar sai. Mais quente. Você relaxa." },
        { time: 75, text: "Sua respiração é uma onda. Sobe, desce." },
        { time: 90, text: "Inspire vida. Expire estresse." },
        { time: 105, text: "Pensamentos passam como nuvens. Deixe-os ir." },
        { time: 120, text: "Sempre volte à respiração. Sua âncora." },
        { time: 135, text: "Cada respiração é um novo começo." },
        { time: 150, text: "Nada a fazer. Apenas respirar." },
        { time: 165, text: "Esta calma está sempre disponível." },
        { time: 180, text: "Sua respiração sempre esteve com você." },
        { time: 195, text: "Aprecie este momento de paz." },
        { time: 210, text: "Suavemente perceba o espaço." },
        { time: 225, text: "Uma última respiração profunda." },
        { time: 238, text: "Abra os olhos. Obrigado." }
      ]
    }
  },

  // ===== THOUGHT OBSERVATION =====
  thoughts: {
    duration: 6 * 60, // 6 minutes
    fr: {
      name: "Observation des Pensées",
      intro: "Observe tes pensées sans les juger. Purification mentale.",
      steps: [
        { time: 0, text: "Ferme les yeux. Trois respirations profondes." },
        { time: 15, text: "Ton esprit est un vaste ciel bleu. Infini. Paisible." },
        { time: 30, text: "Les pensées sont des nuages qui passent. Normal." },
        { time: 45, text: "Observe sans contrôler. Comme un spectateur." },
        { time: 60, text: "Une pensée arrive ? D'où vient-elle ? Quelle forme ?" },
        { time: 75, text: "Ne juge pas. Laisse passer." },
        { time: 90, text: "Tu n'es pas tes pensées. Tu es l'observateur." },
        { time: 105, text: "Si une pensée t'emporte, reviens doucement." },
        { time: 120, text: "Comme des feuilles sur une rivière. Elles passent." },
        { time: 140, text: "Certaines pensées reviennent. Observe avec curiosité." },
        { time: 160, text: "Chaque pensée qui passe purifie ton esprit." },
        { time: 180, text: "Tu crées de l'espace. C'est la liberté." },
        { time: 200, text: "Les pensées ralentissent quand tu ne les nourris pas." },
        { time: 220, text: "Tu es le ciel. Vaste. Serein." },
        { time: 240, text: "Cette observation est un trésor pour ta vie." },
        { time: 260, text: "Ton esprit se clarifie. Ressens cette clarté." },
        { time: 280, text: "La paix s'installe naturellement." },
        { time: 300, text: "Tu es purifié. Calme. Présent." },
        { time: 320, text: "Grande inspiration. Remercie-toi." },
        { time: 340, text: "Ouvre les yeux. Emporte cette clarté." }
      ]
    },
    en: {
      name: "Thought Observation",
      intro: "Observe your thoughts without judging. Mental purification.",
      steps: [
        { time: 0, text: "Close your eyes. Three deep breaths." },
        { time: 15, text: "Your mind is a vast blue sky. Infinite. Peaceful." },
        { time: 30, text: "Thoughts are clouds passing by. Normal." },
        { time: 45, text: "Observe without controlling. Like a spectator." },
        { time: 60, text: "A thought arrives? Where from? What shape?" },
        { time: 75, text: "Don't judge. Let it pass." },
        { time: 90, text: "You are not your thoughts. You are the observer." },
        { time: 105, text: "If a thought carries you, gently return." },
        { time: 120, text: "Like leaves on a river. They pass." },
        { time: 140, text: "Some thoughts return. Observe with curiosity." },
        { time: 160, text: "Each passing thought purifies your mind." },
        { time: 180, text: "You create space. That's freedom." },
        { time: 200, text: "Thoughts slow when you don't feed them." },
        { time: 220, text: "You are the sky. Vast. Serene." },
        { time: 240, text: "This observation is a treasure for life." },
        { time: 260, text: "Your mind clarifies. Feel this clarity." },
        { time: 280, text: "Peace settles naturally." },
        { time: 300, text: "You are purified. Calm. Present." },
        { time: 320, text: "Deep breath. Thank yourself." },
        { time: 340, text: "Open your eyes. Carry this clarity." }
      ]
    },
    es: {
      name: "Observación de Pensamientos",
      intro: "Observa tus pensamientos sin juzgar. Purificación mental.",
      steps: [
        { time: 0, text: "Cierra los ojos. Tres respiraciones profundas." },
        { time: 15, text: "Tu mente es un vasto cielo azul. Infinito. Pacífico." },
        { time: 30, text: "Los pensamientos son nubes que pasan. Normal." },
        { time: 45, text: "Observa sin controlar. Como un espectador." },
        { time: 60, text: "¿Llega un pensamiento? ¿De dónde? ¿Qué forma?" },
        { time: 75, text: "No juzgues. Déjalo pasar." },
        { time: 90, text: "No eres tus pensamientos. Eres el observador." },
        { time: 105, text: "Si un pensamiento te arrastra, vuelve suavemente." },
        { time: 120, text: "Como hojas en un río. Pasan." },
        { time: 140, text: "Algunos pensamientos vuelven. Observa con curiosidad." },
        { time: 160, text: "Cada pensamiento que pasa purifica tu mente." },
        { time: 180, text: "Creas espacio. Eso es libertad." },
        { time: 200, text: "Los pensamientos se calman cuando no los alimentas." },
        { time: 220, text: "Eres el cielo. Vasto. Sereno." },
        { time: 240, text: "Esta observación es un tesoro para la vida." },
        { time: 260, text: "Tu mente se clarifica. Siente esta claridad." },
        { time: 280, text: "La paz se instala naturalmente." },
        { time: 300, text: "Estás purificado. Calmo. Presente." },
        { time: 320, text: "Respiración profunda. Agradécete." },
        { time: 340, text: "Abre los ojos. Lleva esta claridad." }
      ]
    },
    de: {
      name: "Gedankenbeobachtung",
      intro: "Beobachte deine Gedanken ohne zu urteilen. Mentale Reinigung.",
      steps: [
        { time: 0, text: "Schließe die Augen. Drei tiefe Atemzüge." },
        { time: 15, text: "Dein Geist ist ein weiter blauer Himmel. Unendlich. Friedlich." },
        { time: 30, text: "Gedanken sind Wolken, die vorbeiziehen. Normal." },
        { time: 45, text: "Beobachte ohne zu kontrollieren. Wie ein Zuschauer." },
        { time: 60, text: "Ein Gedanke kommt? Woher? Welche Form?" },
        { time: 75, text: "Urteile nicht. Lass ihn vorbeiziehen." },
        { time: 90, text: "Du bist nicht deine Gedanken. Du bist der Beobachter." },
        { time: 105, text: "Wenn ein Gedanke dich mitreißt, kehre sanft zurück." },
        { time: 120, text: "Wie Blätter auf einem Fluss. Sie ziehen vorbei." },
        { time: 140, text: "Manche Gedanken kehren zurück. Beobachte mit Neugier." },
        { time: 160, text: "Jeder vorbeiziehende Gedanke reinigt deinen Geist." },
        { time: 180, text: "Du schaffst Raum. Das ist Freiheit." },
        { time: 200, text: "Gedanken verlangsamen sich, wenn du sie nicht nährst." },
        { time: 220, text: "Du bist der Himmel. Weit. Gelassen." },
        { time: 240, text: "Diese Beobachtung ist ein Schatz fürs Leben." },
        { time: 260, text: "Dein Geist klärt sich. Spüre diese Klarheit." },
        { time: 280, text: "Frieden stellt sich natürlich ein." },
        { time: 300, text: "Du bist gereinigt. Ruhig. Präsent." },
        { time: 320, text: "Tiefer Atemzug. Danke dir." },
        { time: 340, text: "Öffne die Augen. Trage diese Klarheit mit dir." }
      ]
    },
    it: {
      name: "Osservazione dei Pensieri",
      intro: "Osserva i pensieri senza giudicare. Purificazione mentale.",
      steps: [
        { time: 0, text: "Chiudi gli occhi. Tre respiri profondi." },
        { time: 15, text: "La tua mente è un vasto cielo blu. Infinito. Pacifico." },
        { time: 30, text: "I pensieri sono nuvole che passano. Normale." },
        { time: 45, text: "Osserva senza controllare. Come uno spettatore." },
        { time: 60, text: "Arriva un pensiero? Da dove? Che forma?" },
        { time: 75, text: "Non giudicare. Lascialo passare." },
        { time: 90, text: "Non sei i tuoi pensieri. Sei l'osservatore." },
        { time: 105, text: "Se un pensiero ti trascina, torna dolcemente." },
        { time: 120, text: "Come foglie su un fiume. Passano." },
        { time: 140, text: "Alcuni pensieri tornano. Osserva con curiosità." },
        { time: 160, text: "Ogni pensiero che passa purifica la mente." },
        { time: 180, text: "Crei spazio. Questa è libertà." },
        { time: 200, text: "I pensieri rallentano quando non li nutri." },
        { time: 220, text: "Sei il cielo. Vasto. Sereno." },
        { time: 240, text: "Questa osservazione è un tesoro per la vita." },
        { time: 260, text: "La tua mente si chiarisce. Senti questa chiarezza." },
        { time: 280, text: "La pace si installa naturalmente." },
        { time: 300, text: "Sei purificato. Calmo. Presente." },
        { time: 320, text: "Respiro profondo. Ringraziati." },
        { time: 340, text: "Apri gli occhi. Porta questa chiarezza con te." }
      ]
    },
    pt: {
      name: "Observação dos Pensamentos",
      intro: "Observe seus pensamentos sem julgar. Purificação mental.",
      steps: [
        { time: 0, text: "Feche os olhos. Três respirações profundas." },
        { time: 15, text: "Sua mente é um vasto céu azul. Infinito. Pacífico." },
        { time: 30, text: "Pensamentos são nuvens passando. Normal." },
        { time: 45, text: "Observe sem controlar. Como um espectador." },
        { time: 60, text: "Um pensamento chega? De onde? Que forma?" },
        { time: 75, text: "Não julgue. Deixe passar." },
        { time: 90, text: "Você não é seus pensamentos. Você é o observador." },
        { time: 105, text: "Se um pensamento te levar, volte suavemente." },
        { time: 120, text: "Como folhas em um rio. Passam." },
        { time: 140, text: "Alguns pensamentos voltam. Observe com curiosidade." },
        { time: 160, text: "Cada pensamento que passa purifica sua mente." },
        { time: 180, text: "Você cria espaço. Isso é liberdade." },
        { time: 200, text: "Pensamentos diminuem quando não os alimenta." },
        { time: 220, text: "Você é o céu. Vasto. Sereno." },
        { time: 240, text: "Esta observação é um tesouro para a vida." },
        { time: 260, text: "Sua mente clarifica. Sinta esta clareza." },
        { time: 280, text: "A paz se instala naturalmente." },
        { time: 300, text: "Você está purificado. Calmo. Presente." },
        { time: 320, text: "Respiração profunda. Agradeça-se." },
        { time: 340, text: "Abra os olhos. Leve esta clareza." }
      ]
    }
  },

  // ===== POSITIVE VISUALIZATION =====
  visualization: {
    duration: 7 * 60, // 7 minutes
    fr: {
      name: "Visualisation Positive",
      intro: "Visualise ta vie idéale. Santé, mission, amour, succès.",
      steps: [
        { time: 0, text: "Ferme les yeux. Respirations profondes." },
        { time: 15, text: "Tu vas créer ta vie la plus belle." },
        { time: 30, text: "Visualise ton corps. Santé de fer. Énergie débordante." },
        { time: 45, text: "Tu te réveilles plein de vitalité. Fort. En pleine forme." },
        { time: 60, text: "Chaque cellule vibre de santé. Tu es invincible." },
        { time: 80, text: "Maintenant ta mission. La démocratie avance." },
        { time: 100, text: "Tes idées touchent des milliers de personnes." },
        { time: 120, text: "Tu as un impact réel. Tu fais la différence." },
        { time: 140, text: "Ressens la fierté. Ta mission est en marche." },
        { time: 160, text: "Ta femme te regarde avec amour. Elle t'admire." },
        { time: 180, text: "Ensemble vous êtes invincibles. L'amour partout." },
        { time: 200, text: "Tes enfants te regardent. Tu es leur héros." },
        { time: 220, text: "Ils sont fiers de toi. Ta famille est unie." },
        { time: 240, text: "Rires. Tendresse. Moments précieux." },
        { time: 260, text: "Ton succès professionnel. Les portes s'ouvrent." },
        { time: 280, text: "L'argent coule. L'abondance est naturelle." },
        { time: 300, text: "Respecté. Admiré. Tu mérites ce succès." },
        { time: 320, text: "Ressens tout ensemble. Santé. Mission. Amour. Succès." },
        { time: 340, text: "C'est ta vie. Ta réalité qui se construit." },
        { time: 360, text: "Ancre ces images dans ton cœur." },
        { time: 380, text: "Elles te guident. Elles deviennent réalité." },
        { time: 400, text: "Grande inspiration. Ouvre les yeux." },
        { time: 415, text: "Tu es prêt à créer cette vie." }
      ]
    },
    en: {
      name: "Positive Visualization",
      intro: "Visualize your ideal life. Health, mission, love, success.",
      steps: [
        { time: 0, text: "Close your eyes. Deep breaths." },
        { time: 15, text: "You will create your most beautiful life." },
        { time: 30, text: "Visualize your body. Ironclad health. Overflowing energy." },
        { time: 45, text: "You wake up full of vitality. Strong. In perfect health." },
        { time: 60, text: "Every cell vibrates with health. You are invincible." },
        { time: 80, text: "Now your mission. Your ideas change the world." },
        { time: 100, text: "Your work touches thousands of people." },
        { time: 120, text: "You have real impact. You make a difference." },
        { time: 140, text: "Feel the pride. Your mission is underway." },
        { time: 160, text: "Your wife looks at you with love. She admires you." },
        { time: 180, text: "Together, you are invincible. Love everywhere." },
        { time: 200, text: "Your children look at you. You are their hero." },
        { time: 220, text: "They are proud of you. Your family is united." },
        { time: 240, text: "Laughter. Tenderness. Precious moments." },
        { time: 260, text: "Your professional success. Doors open." },
        { time: 280, text: "Money flows. Abundance is natural." },
        { time: 300, text: "Respected. Admired. You deserve this success." },
        { time: 320, text: "Feel everything together. Health. Mission. Love. Success." },
        { time: 340, text: "This is your life. Your reality being built." },
        { time: 360, text: "Anchor these images in your heart." },
        { time: 380, text: "They guide you. They become reality." },
        { time: 400, text: "Deep breath. Open your eyes." },
        { time: 415, text: "You are ready to create this life." }
      ]
    },
    es: {
      name: "Visualización Positiva",
      intro: "Visualiza tu vida ideal. Salud, misión, amor, éxito.",
      steps: [
        { time: 0, text: "Cierra los ojos. Respiraciones profundas." },
        { time: 15, text: "Vas a crear tu vida más hermosa." },
        { time: 30, text: "Visualiza tu cuerpo. Salud de hierro. Energía desbordante." },
        { time: 45, text: "Despiertas lleno de vitalidad. Fuerte. En perfecta salud." },
        { time: 60, text: "Cada célula vibra con salud. Eres invencible." },
        { time: 80, text: "Ahora tu misión. Tus ideas cambian el mundo." },
        { time: 100, text: "Tu trabajo toca a miles de personas." },
        { time: 120, text: "Tienes impacto real. Marcas la diferencia." },
        { time: 140, text: "Siente el orgullo. Tu misión está en marcha." },
        { time: 160, text: "Tu esposa te mira con amor. Te admira." },
        { time: 180, text: "Juntos son invencibles. Amor por todas partes." },
        { time: 200, text: "Tus hijos te miran. Eres su héroe." },
        { time: 220, text: "Están orgullosos de ti. Tu familia está unida." },
        { time: 240, text: "Risas. Ternura. Momentos preciosos." },
        { time: 260, text: "Tu éxito profesional. Las puertas se abren." },
        { time: 280, text: "El dinero fluye. La abundancia es natural." },
        { time: 300, text: "Respetado. Admirado. Mereces este éxito." },
        { time: 320, text: "Siente todo junto. Salud. Misión. Amor. Éxito." },
        { time: 340, text: "Esta es tu vida. Tu realidad construyéndose." },
        { time: 360, text: "Ancla estas imágenes en tu corazón." },
        { time: 380, text: "Te guían. Se convierten en realidad." },
        { time: 400, text: "Respiración profunda. Abre los ojos." },
        { time: 415, text: "Estás listo para crear esta vida." }
      ]
    },
    de: {
      name: "Positive Visualisierung",
      intro: "Visualisiere dein ideales Leben. Gesundheit, Mission, Liebe, Erfolg.",
      steps: [
        { time: 0, text: "Schließe die Augen. Tiefe Atemzüge." },
        { time: 15, text: "Du erschaffst dein schönstes Leben." },
        { time: 30, text: "Visualisiere deinen Körper. Eiserne Gesundheit. Überfließende Energie." },
        { time: 45, text: "Du wachst voller Vitalität auf. Stark. In perfekter Gesundheit." },
        { time: 60, text: "Jede Zelle vibriert vor Gesundheit. Du bist unbesiegbar." },
        { time: 80, text: "Jetzt deine Mission. Deine Ideen verändern die Welt." },
        { time: 100, text: "Deine Arbeit berührt Tausende von Menschen." },
        { time: 120, text: "Du hast echten Einfluss. Du machst einen Unterschied." },
        { time: 140, text: "Spüre den Stolz. Deine Mission ist im Gange." },
        { time: 160, text: "Deine Frau schaut dich liebevoll an. Sie bewundert dich." },
        { time: 180, text: "Zusammen seid ihr unschlagbar. Liebe überall." },
        { time: 200, text: "Deine Kinder schauen dich an. Du bist ihr Held." },
        { time: 220, text: "Sie sind stolz auf dich. Deine Familie ist vereint." },
        { time: 240, text: "Lachen. Zärtlichkeit. Kostbare Momente." },
        { time: 260, text: "Dein beruflicher Erfolg. Türen öffnen sich." },
        { time: 280, text: "Geld fließt. Fülle ist natürlich." },
        { time: 300, text: "Respektiert. Bewundert. Du verdienst diesen Erfolg." },
        { time: 320, text: "Spüre alles zusammen. Gesundheit. Mission. Liebe. Erfolg." },
        { time: 340, text: "Das ist dein Leben. Deine Realität wird aufgebaut." },
        { time: 360, text: "Verankere diese Bilder in deinem Herzen." },
        { time: 380, text: "Sie leiten dich. Sie werden Wirklichkeit." },
        { time: 400, text: "Tiefer Atemzug. Öffne die Augen." },
        { time: 415, text: "Du bist bereit, dieses Leben zu erschaffen." }
      ]
    },
    it: {
      name: "Visualizzazione Positiva",
      intro: "Visualizza la tua vita ideale. Salute, missione, amore, successo.",
      steps: [
        { time: 0, text: "Chiudi gli occhi. Respiri profondi." },
        { time: 15, text: "Creerai la tua vita più bella." },
        { time: 30, text: "Visualizza il tuo corpo. Salute di ferro. Energia traboccante." },
        { time: 45, text: "Ti svegli pieno di vitalità. Forte. In perfetta salute." },
        { time: 60, text: "Ogni cellula vibra di salute. Sei invincibile." },
        { time: 80, text: "Ora la tua missione. Le tue idee cambiano il mondo." },
        { time: 100, text: "Il tuo lavoro tocca migliaia di persone." },
        { time: 120, text: "Hai un impatto reale. Fai la differenza." },
        { time: 140, text: "Senti l'orgoglio. La tua missione è in corso." },
        { time: 160, text: "Tua moglie ti guarda con amore. Ti ammira." },
        { time: 180, text: "Insieme siete invincibili. Amore ovunque." },
        { time: 200, text: "I tuoi figli ti guardano. Sei il loro eroe." },
        { time: 220, text: "Sono orgogliosi di te. La tua famiglia è unita." },
        { time: 240, text: "Risate. Tenerezza. Momenti preziosi." },
        { time: 260, text: "Il tuo successo professionale. Le porte si aprono." },
        { time: 280, text: "Il denaro scorre. L'abbondanza è naturale." },
        { time: 300, text: "Rispettato. Ammirato. Meriti questo successo." },
        { time: 320, text: "Senti tutto insieme. Salute. Missione. Amore. Successo." },
        { time: 340, text: "Questa è la tua vita. La tua realtà si costruisce." },
        { time: 360, text: "Ancora queste immagini nel tuo cuore." },
        { time: 380, text: "Ti guidano. Diventano realtà." },
        { time: 400, text: "Respiro profondo. Apri gli occhi." },
        { time: 415, text: "Sei pronto a creare questa vita." }
      ]
    },
    pt: {
      name: "Visualização Positiva",
      intro: "Visualize sua vida ideal. Saúde, missão, amor, sucesso.",
      steps: [
        { time: 0, text: "Feche os olhos. Respirações profundas." },
        { time: 15, text: "Você vai criar sua vida mais bonita." },
        { time: 30, text: "Visualize seu corpo. Saúde de ferro. Energia transbordante." },
        { time: 45, text: "Você acorda cheio de vitalidade. Forte. Em perfeita saúde." },
        { time: 60, text: "Cada célula vibra com saúde. Você é invencível." },
        { time: 80, text: "Agora sua missão. Suas ideias mudam o mundo." },
        { time: 100, text: "Seu trabalho toca milhares de pessoas." },
        { time: 120, text: "Você tem impacto real. Você faz a diferença." },
        { time: 140, text: "Sinta o orgulho. Sua missão está em andamento." },
        { time: 160, text: "Sua esposa te olha com amor. Ela te admira." },
        { time: 180, text: "Juntos, vocês são invencíveis. Amor por toda parte." },
        { time: 200, text: "Seus filhos te olham. Você é o herói deles." },
        { time: 220, text: "Eles têm orgulho de você. Sua família é unida." },
        { time: 240, text: "Risadas. Ternura. Momentos preciosos." },
        { time: 260, text: "Seu sucesso profissional. Portas se abrem." },
        { time: 280, text: "O dinheiro flui. A abundância é natural." },
        { time: 300, text: "Respeitado. Admirado. Você merece este sucesso." },
        { time: 320, text: "Sinta tudo junto. Saúde. Missão. Amor. Sucesso." },
        { time: 340, text: "Esta é sua vida. Sua realidade sendo construída." },
        { time: 360, text: "Ancore essas imagens em seu coração." },
        { time: 380, text: "Elas te guiam. Elas se tornam realidade." },
        { time: 400, text: "Respiração profunda. Abra os olhos." },
        { time: 415, text: "Você está pronto para criar esta vida." }
      ]
    }
  },

  // ===== GRATITUDE =====
  gratitude: {
    duration: 5 * 60, // 5 minutes
    fr: {
      name: "Gratitude",
      intro: "Cultive la gratitude. L'émotion qui transforme tout.",
      steps: [
        { time: 0, text: "Ferme les yeux. Respirations profondes." },
        { time: 15, text: "La gratitude transforme ce que tu as en suffisance." },
        { time: 30, text: "Pense à ton corps. Il te porte chaque jour. Merci, corps." },
        { time: 45, text: "Ton cœur bat depuis ta naissance. Sans relâche." },
        { time: 60, text: "Pense à quelqu'un qui t'aime. Visualise son visage." },
        { time: 75, text: "Merci pour cette personne. Pour son amour." },
        { time: 95, text: "Un moment de bonheur récent. Un rire. Une victoire." },
        { time: 115, text: "La vie t'offre ces cadeaux chaque jour. Merci." },
        { time: 135, text: "Ton refuge. Ta sécurité. Beaucoup n'ont pas cette chance." },
        { time: 155, text: "Gratitude pour le toit. La nourriture. L'eau." },
        { time: 175, text: "Une difficulté passée t'a rendu plus fort. Remercie-la." },
        { time: 195, text: "Chaque épreuve est un enseignement." },
        { time: 215, text: "Gratitude globale. Pour ta vie. Pour tout." },
        { time: 235, text: "Tu es vivant. Tu respires. C'est extraordinaire." },
        { time: 255, text: "Tu as le pouvoir de changer ta vie." },
        { time: 275, text: "Grande inspiration. Ouvre les yeux." },
        { time: 290, text: "Emporte cette gratitude avec toi." }
      ]
    },
    en: {
      name: "Gratitude",
      intro: "Cultivate gratitude. The emotion that transforms everything.",
      steps: [
        { time: 0, text: "Close your eyes. Deep breaths." },
        { time: 15, text: "Gratitude transforms what you have into enough." },
        { time: 30, text: "Think about your body. It carries you every day. Thank you, body." },
        { time: 45, text: "Your heart has been beating since birth. Without rest." },
        { time: 60, text: "Think of someone who loves you. Visualize their face." },
        { time: 75, text: "Thank you for this person. For their love." },
        { time: 95, text: "A recent happy moment. A laugh. A victory." },
        { time: 115, text: "Life offers you these gifts every day. Thank you." },
        { time: 135, text: "Your refuge. Your safety. Many don't have this luck." },
        { time: 155, text: "Gratitude for shelter. Food. Water." },
        { time: 175, text: "A past difficulty made you stronger. Thank it." },
        { time: 195, text: "Every trial is a teaching." },
        { time: 215, text: "Global gratitude. For your life. For everything." },
        { time: 235, text: "You are alive. You are breathing. That's extraordinary." },
        { time: 255, text: "You have the power to change your life." },
        { time: 275, text: "Deep breath. Open your eyes." },
        { time: 290, text: "Carry this gratitude with you." }
      ]
    },
    es: {
      name: "Gratitud",
      intro: "Cultiva la gratitud. La emoción que transforma todo.",
      steps: [
        { time: 0, text: "Cierra los ojos. Respiraciones profundas." },
        { time: 15, text: "La gratitud transforma lo que tienes en suficiente." },
        { time: 30, text: "Piensa en tu cuerpo. Te lleva cada día. Gracias, cuerpo." },
        { time: 45, text: "Tu corazón late desde tu nacimiento. Sin descanso." },
        { time: 60, text: "Piensa en alguien que te ama. Visualiza su rostro." },
        { time: 75, text: "Gracias por esta persona. Por su amor." },
        { time: 95, text: "Un momento feliz reciente. Una risa. Una victoria." },
        { time: 115, text: "La vida te ofrece estos regalos cada día. Gracias." },
        { time: 135, text: "Tu refugio. Tu seguridad. Muchos no tienen esta suerte." },
        { time: 155, text: "Gratitud por el techo. La comida. El agua." },
        { time: 175, text: "Una dificultad pasada te hizo más fuerte. Agradécele." },
        { time: 195, text: "Cada prueba es una enseñanza." },
        { time: 215, text: "Gratitud global. Por tu vida. Por todo." },
        { time: 235, text: "Estás vivo. Respiras. Es extraordinario." },
        { time: 255, text: "Tienes el poder de cambiar tu vida." },
        { time: 275, text: "Respiración profunda. Abre los ojos." },
        { time: 290, text: "Lleva esta gratitud contigo." }
      ]
    },
    de: {
      name: "Dankbarkeit",
      intro: "Kultiviere Dankbarkeit. Die Emotion, die alles transformiert.",
      steps: [
        { time: 0, text: "Schließe die Augen. Tiefe Atemzüge." },
        { time: 15, text: "Dankbarkeit verwandelt, was du hast, in Genug." },
        { time: 30, text: "Denke an deinen Körper. Er trägt dich jeden Tag. Danke, Körper." },
        { time: 45, text: "Dein Herz schlägt seit deiner Geburt. Ohne Pause." },
        { time: 60, text: "Denke an jemanden, der dich liebt. Visualisiere sein Gesicht." },
        { time: 75, text: "Danke für diese Person. Für ihre Liebe." },
        { time: 95, text: "Ein kürzlicher glücklicher Moment. Ein Lachen. Ein Sieg." },
        { time: 115, text: "Das Leben bietet dir diese Geschenke jeden Tag. Danke." },
        { time: 135, text: "Deine Zuflucht. Deine Sicherheit. Viele haben dieses Glück nicht." },
        { time: 155, text: "Dankbarkeit für Obdach. Essen. Wasser." },
        { time: 175, text: "Eine vergangene Schwierigkeit machte dich stärker. Danke ihr." },
        { time: 195, text: "Jede Prüfung ist eine Lehre." },
        { time: 215, text: "Globale Dankbarkeit. Für dein Leben. Für alles." },
        { time: 235, text: "Du lebst. Du atmest. Das ist außergewöhnlich." },
        { time: 255, text: "Du hast die Kraft, dein Leben zu ändern." },
        { time: 275, text: "Tiefer Atemzug. Öffne die Augen." },
        { time: 290, text: "Trage diese Dankbarkeit mit dir." }
      ]
    },
    it: {
      name: "Gratitudine",
      intro: "Coltiva la gratitudine. L'emozione che trasforma tutto.",
      steps: [
        { time: 0, text: "Chiudi gli occhi. Respiri profondi." },
        { time: 15, text: "La gratitudine trasforma ciò che hai in abbastanza." },
        { time: 30, text: "Pensa al tuo corpo. Ti porta ogni giorno. Grazie, corpo." },
        { time: 45, text: "Il tuo cuore batte dalla nascita. Senza sosta." },
        { time: 60, text: "Pensa a qualcuno che ti ama. Visualizza il suo volto." },
        { time: 75, text: "Grazie per questa persona. Per il suo amore." },
        { time: 95, text: "Un momento felice recente. Una risata. Una vittoria." },
        { time: 115, text: "La vita ti offre questi doni ogni giorno. Grazie." },
        { time: 135, text: "Il tuo rifugio. La tua sicurezza. Molti non hanno questa fortuna." },
        { time: 155, text: "Gratitudine per il tetto. Il cibo. L'acqua." },
        { time: 175, text: "Una difficoltà passata ti ha reso più forte. Ringraziala." },
        { time: 195, text: "Ogni prova è un insegnamento." },
        { time: 215, text: "Gratitudine globale. Per la tua vita. Per tutto." },
        { time: 235, text: "Sei vivo. Respiri. È straordinario." },
        { time: 255, text: "Hai il potere di cambiare la tua vita." },
        { time: 275, text: "Respiro profondo. Apri gli occhi." },
        { time: 290, text: "Porta questa gratitudine con te." }
      ]
    },
    pt: {
      name: "Gratidão",
      intro: "Cultive a gratidão. A emoção que transforma tudo.",
      steps: [
        { time: 0, text: "Feche os olhos. Respirações profundas." },
        { time: 15, text: "A gratidão transforma o que você tem em suficiente." },
        { time: 30, text: "Pense no seu corpo. Ele te carrega todos os dias. Obrigado, corpo." },
        { time: 45, text: "Seu coração bate desde seu nascimento. Sem parar." },
        { time: 60, text: "Pense em alguém que te ama. Visualize seu rosto." },
        { time: 75, text: "Obrigado por essa pessoa. Por seu amor." },
        { time: 95, text: "Um momento feliz recente. Uma risada. Uma vitória." },
        { time: 115, text: "A vida te oferece esses presentes todos os dias. Obrigado." },
        { time: 135, text: "Seu refúgio. Sua segurança. Muitos não têm essa sorte." },
        { time: 155, text: "Gratidão pelo teto. A comida. A água." },
        { time: 175, text: "Uma dificuldade passada te fez mais forte. Agradeça." },
        { time: 195, text: "Cada provação é um ensinamento." },
        { time: 215, text: "Gratidão global. Por sua vida. Por tudo." },
        { time: 235, text: "Você está vivo. Você respira. Isso é extraordinário." },
        { time: 255, text: "Você tem o poder de mudar sua vida." },
        { time: 275, text: "Respiração profunda. Abra os olhos." },
        { time: 290, text: "Leve essa gratidão com você." }
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

  // Arrêter les autres modules
  stopAllModules('meditation');

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

  // Démarrer sons d'ambiance méditation (Web Audio API)
  meditationSounds.startAmbience();

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

  // Arrêter sons d'ambiance méditation
  meditationSounds.stop();

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
