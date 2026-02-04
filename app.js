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
    breathSoundType: 'synth',  // 'synth' ou 'natural'
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

// ===== URLs des sons naturels (archive.org) =====
const naturalSounds = {
  wind: {
    url: 'https://archive.org/download/GOLD_TAPE_55_56_Weather-Wind/G56-29-Light%20Wind.mp3',
    buffer: null
  },
  waves: {
    url: 'https://archive.org/download/WaveSoundEffects/oceanwave.mp3',
    buffer: null
  },
  breath: {
    url: 'https://archive.org/download/va-deep-meditation-50-tracks-healing-sounds-of-nature-2016/26.%20Rebirth%20Yoga%20Music%20Academy%20-%20Breathe%20In%20%26%20Breathe%20Out.mp3',
    buffer: null
  }
};

// ===== Systeme Audio Guide =====
class AudioGuide {
  constructor() {
    this.audioCtx = null;
    this.isEnabled = true;
    this.voiceEnabled = false;
    this.soundType = 'synth'; // 'synth', 'wind', 'waves', 'breath'
    this.currentOscillator = null;
    this.currentGain = null;
    this.currentAudioSource = null;
    this.soundsLoaded = false;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    // Charger les sons naturels si pas déjà fait
    if (!this.soundsLoaded) {
      this.loadNaturalSounds();
    }
  }

  // Charger les sons naturels depuis archive.org
  async loadNaturalSounds() {
    if (this.soundsLoaded) return;

    for (const [key, sound] of Object.entries(naturalSounds)) {
      try {
        const response = await fetch(sound.url);
        const arrayBuffer = await response.arrayBuffer();
        sound.buffer = await this.audioCtx.decodeAudioData(arrayBuffer);
        console.log(`Son "${key}" chargé avec succès`);
      } catch (e) {
        console.warn(`Impossible de charger le son "${key}":`, e);
      }
    }
    this.soundsLoaded = true;
  }

  // Jouer un son naturel avec adaptation à la durée et intensité
  playNaturalSound(type, duration, intensity = 'normal', isInhale = true) {
    const sound = naturalSounds[type];
    if (!sound || !sound.buffer) {
      console.warn(`Son "${type}" non disponible, fallback synthétique`);
      return false;
    }

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Créer la source
    const source = ctx.createBufferSource();
    source.buffer = sound.buffer;
    source.loop = true; // Boucle pour adapter à la durée

    // Créer les nodes
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Configurer selon intensité
    const maxGain = intensity === 'strong' ? 0.7 : (intensity === 'gentle' ? 0.25 : 0.45);

    // Configurer le filtre selon inhale/exhale
    filter.type = 'lowpass';
    if (isInhale) {
      // Inspiration : fréquence qui monte, volume qui monte
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.linearRampToValueAtTime(2000, now + duration);
      gainNode.gain.setValueAtTime(0.01, now);
      gainNode.gain.linearRampToValueAtTime(maxGain, now + duration * 0.4);
      gainNode.gain.setValueAtTime(maxGain, now + duration * 0.7);
      gainNode.gain.linearRampToValueAtTime(0.01, now + duration);
    } else {
      // Expiration : fréquence qui descend, volume qui descend
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.linearRampToValueAtTime(400, now + duration);
      gainNode.gain.setValueAtTime(maxGain, now);
      gainNode.gain.setValueAtTime(maxGain * 0.8, now + duration * 0.3);
      gainNode.gain.linearRampToValueAtTime(0.01, now + duration);
    }

    // Connecter
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Jouer
    source.start(now);
    source.stop(now + duration);

    this.currentAudioSource = source;
    this.currentGain = gainNode;

    return true;
  }

  // Son d'inspiration - tonalite montante douce
  playInhale(duration, throughNose = true, intensity = 'normal') {
    if (!this.isEnabled || !state.settings.audioGuide) return;
    this.init();
    this.stopCurrent();

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Sons naturels (vent, vagues, souffle)
    if (['wind', 'waves', 'breath'].includes(this.soundType)) {
      const played = this.playNaturalSound(this.soundType, duration, intensity, true);
      if (!played) {
        // Fallback vers synthétique si le son n'est pas chargé
        this.playSynthInhale(duration, throughNose, intensity);
      }
    } else {
      // Sons synthétiques (actuels)
      this.playSynthInhale(duration, throughNose, intensity);
    }

    // Voix optionnelle
    this.playVoiceInstruction(throughNose ? 'inhaleNose' : 'inhaleMouth');
  }

  // Son synthétique d'inspiration
  playSynthInhale(duration, throughNose, intensity) {
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    if (throughNose) {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(280, now);
      oscillator.frequency.linearRampToValueAtTime(420, now + duration);
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 2;
    } else {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(180, now);
      oscillator.frequency.linearRampToValueAtTime(320, now + duration);
      filter.type = 'lowpass';
      filter.frequency.value = 600;
    }

    const maxGain = intensity === 'strong' ? 0.25 : 0.12;

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
  }

  // Son d'expiration - tonalite descendante
  playExhale(duration, throughNose = true, intensity = 'normal') {
    if (!this.isEnabled || !state.settings.audioGuide) return;
    this.init();
    this.stopCurrent();

    // Sons naturels (vent, vagues, souffle)
    if (['wind', 'waves', 'breath'].includes(this.soundType)) {
      const played = this.playNaturalSound(this.soundType, duration, intensity, false);
      if (!played) {
        // Fallback vers synthétique si le son n'est pas chargé
        this.playSynthExhale(duration, throughNose, intensity);
      }
    } else {
      // Sons synthétiques (actuels)
      this.playSynthExhale(duration, throughNose, intensity);
    }

    // Voix optionnelle
    this.playVoiceInstruction(throughNose ? 'exhaleNose' : 'exhaleMouth');
  }

  // Son synthétique d'expiration
  playSynthExhale(duration, throughNose, intensity) {
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    if (throughNose) {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(380, now);
      oscillator.frequency.linearRampToValueAtTime(220, now + duration);
      filter.type = 'bandpass';
      filter.frequency.value = 600;
      filter.Q.value = 1.5;
    } else {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(300, now);
      oscillator.frequency.exponentialRampToValueAtTime(80, now + duration);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + duration);
    }

    const maxGain = intensity === 'strong' ? 0.2 : 0.1;

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

    // Si son naturel sélectionné, jouer en boucle avec pulsations
    if (this.soundType !== 'synth') {
      const sound = naturalSounds[this.soundType];
      if (sound && sound.buffer) {
        const source = ctx.createBufferSource();
        source.buffer = sound.buffer;
        source.loop = true;

        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1500;

        // Créer des pulsations de volume pour chaque respiration
        gainNode.gain.setValueAtTime(0.3, now);
        for (let i = 0; i < breaths; i++) {
          const time = now + i * interval;
          const isInhale = i % 2 === 0;
          const peakGain = isInhale ? 0.6 : 0.35;
          gainNode.gain.linearRampToValueAtTime(peakGain, time + interval * 0.3);
          gainNode.gain.linearRampToValueAtTime(0.15, time + interval * 0.9);
        }
        gainNode.gain.linearRampToValueAtTime(0, now + duration);

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        source.start(now);
        source.stop(now + duration);
        this.currentAudioSource = source;
        this.currentGain = gainNode;
      } else {
        // Fallback vers synthétique si son non chargé
        this.playSynthRapidBreathing(duration, breaths);
      }
    } else {
      this.playSynthRapidBreathing(duration, breaths);
    }

    // Voix optionnelle
    this.playVoiceInstruction('rapid');
  }

  // Version synthétique des respirations rapides
  playSynthRapidBreathing(duration, breaths) {
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
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
      } catch (e) {}
      this.currentAudioSource = null;
    }
    if (this.currentGain) {
      try {
        this.currentGain.disconnect();
      } catch (e) {}
      this.currentGain = null;
    }
  }

  stop() {
    this.stopCurrent();
    // Suspendre le contexte audio pour arrêter tous les sons programmés
    if (this.audioCtx && this.audioCtx.state === 'running') {
      this.audioCtx.suspend();
    }
    voicePlayer.stop();
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  resume() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
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
  // === EPIC - Pour douches froides, défis, motivation ===
  // Musiques ÉPIQUES
  epicVictory: {
    name: 'VICTORY - Two Steps From Hell',
    url: 'https://archive.org/download/VictoryTwoStepsFromHell320kbpsMP3/Victory%20-%20Two%20Steps%20From%20Hell%20%5B320kbps_MP3%5D.mp3',
    category: 'epic'
  },
  epicTime: {
    name: 'TIME - Hans Zimmer (Inception)',
    url: 'https://archive.org/download/InceptionSoundtrackHD12TimeHansZimmer/Inception%20Soundtrack%20HD%20-%20%2312%20Time%20%28Hans%20Zimmer%29.mp3',
    category: 'epic'
  },
  epicBattle42: {
    name: 'BATTLE EPIC 42min',
    url: 'https://archive.org/download/epic-music-soundtracks-battle-music-42min/Epic%20Music%20Soundtracks%20%28Battle%20Music%2C%2042min%29.mp3',
    category: 'epic'
  },
  epicDramatic: {
    name: 'Dramatic Epic Cinematic',
    url: 'https://archive.org/download/ActionCinematicMusic/Dramatic%20Epic%20Cinematic.mp3',
    category: 'epic'
  },
  // Sons de BATAILLE
  battleMedieval: {
    name: 'Bataille Médiévale',
    url: 'https://archive.org/download/WarBattleSounds/Medieval%20battle%20sound%20effect%20-%20infantry.mp3',
    category: 'epic'
  },
  battleWar: {
    name: 'Cris de Guerre',
    url: 'https://archive.org/download/WarBattleSounds/War%20-%20Battle%20Sounds.mp3',
    category: 'epic'
  },
  // VIKING BATTLE
  vikingBattle: {
    name: 'Viking Battle Mix',
    url: 'https://archive.org/download/filip_lackovic_celtic-viking-battle-music/CelticViking%20Battle%20Music%20Mix.mp3',
    category: 'epic'
  },
  // === MEDITATION - Bols tibétains et chants ===
  tibetanBowl: {
    name: 'Bol Tibétain',
    url: 'https://archive.org/download/singingbowl/singingbowl.mp3',
    category: 'meditation'
  },
  meditationBowl: {
    name: 'Singing Bowl Long',
    url: 'https://archive.org/download/singingbowlmeditation/Singing%20Bowl%20Meditation.mp3',
    category: 'meditation'
  },
  omChanting: {
    name: 'Chant Om',
    url: 'https://archive.org/download/OmChanting/om2.wav.mp3',
    category: 'meditation'
  },
  omMeditation: {
    name: 'Om Meditation 15min',
    url: 'https://archive.org/download/15-minutes-om-meditation/15%20Minutes%20OM%20Meditation.mp3',
    category: 'meditation'
  },
  handpan: {
    name: 'Handpan Focus',
    url: 'https://archive.org/download/hang-drum-music-for-focus-handpan-study-music/Hang%20Drum%20Music%20for%20Focus%20-%20Handpan%20Study%20Music.mp3',
    category: 'meditation'
  },
  cosmicAmbient: {
    name: 'Cosmic Ambient',
    url: 'https://archive.org/download/a-cosmic-meditation-1988/A%20Cosmic%20Meditation%20%281988%29.mp3',
    category: 'meditation'
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
  initBiofeedback();
  initPoetry();
  initDreams();
  initSleepTracker();
  initJournal();
  initBusiness();
  initDashboard();
  initFocus();
  initRoutines();
  initLecture();
  updateStats();
  renderHistory();
  updateHistoryStats();
  showStartupQuote();
  updateHolisticScore();
  updateStreaksHeatmap();

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
    audioGuide.soundType = state.settings.breathSoundType || 'synth';
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

  // Clic sur le titre pour retourner à l'accueil
  const pageTitle = document.getElementById('page-title');
  pageTitle.addEventListener('click', () => {
    navigateTo('home');
    closeSidebar();
  });

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

  // Mini dashboard sur l'accueil
  const miniDashboard = document.querySelector('.home-dashboard-mini');
  if (miniDashboard) {
    miniDashboard.addEventListener('click', () => {
      navigateTo('dashboard');
    });
  }
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
      home: "Respir'Action",
      dashboard: 'Dashboard',
      breathing: 'Respiration',
      coldshower: 'Douche Froide',
      meditation: 'Méditation',
      biofeedback: 'Biofeedback',
      pomodoro: 'Pomodoro',
      history: 'Historique',
      poetry: 'Poésie',
      dreams: 'Mes Rêves',
      journal: 'Journal Mental',
      business: 'Business',
      focus: 'Mode Focus',
      routines: 'Mes Routines',
      lecture: 'Mes Lectures',
      calisthenics: 'Calisthénie',
      settings: 'Réglages'
    };
    document.getElementById('page-title').textContent = titles[pageName] || "Respir'Action";

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
  const breathCircle = document.getElementById('breath-circle');

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

  // Clic sur cercle = start/pause, long press = stop
  let pressTimer = null;
  let isLongPress = false;

  const startPress = () => {
    isLongPress = false;
    pressTimer = setTimeout(() => {
      isLongPress = true;
      if (state.breathingSession && state.breathingSession.isRunning) {
        // Vibration feedback
        if (navigator.vibrate) navigator.vibrate(100);
        stopSession();
        updateBreathingHint('start');
      }
    }, 800);
  };

  const endPress = () => {
    clearTimeout(pressTimer);
    if (!isLongPress) {
      // Clic simple
      if (!state.breathingSession) return;
      if (!state.breathingSession.isRunning) {
        startSession();
      } else {
        togglePause();
      }
    }
  };

  const cancelPress = () => {
    clearTimeout(pressTimer);
  };

  breathCircle.style.cursor = 'pointer';
  breathCircle.addEventListener('mousedown', startPress);
  breathCircle.addEventListener('mouseup', endPress);
  breathCircle.addEventListener('mouseleave', cancelPress);
  breathCircle.addEventListener('touchstart', (e) => { e.preventDefault(); startPress(); });
  breathCircle.addEventListener('touchend', (e) => { e.preventDefault(); endPress(); });
  breathCircle.addEventListener('touchcancel', cancelPress);
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

  // Reset texte d'aide
  updateBreathingHint('start');
}

function updateBreathingHint(mode) {
  const hint = document.getElementById('breath-circle-hint');
  if (!hint) return;

  hint.classList.remove('pause-hint', 'stop-hint');

  switch(mode) {
    case 'start':
      hint.textContent = 'Appuie sur le cercle pour commencer';
      break;
    case 'running':
      hint.textContent = 'Appuie pour pause · Maintiens pour arrêter';
      hint.classList.add('pause-hint');
      break;
    case 'paused':
      hint.textContent = 'Appuie pour reprendre · Maintiens pour arrêter';
      hint.classList.add('stop-hint');
      break;
  }
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

  // Mise à jour texte d'aide
  updateBreathingHint('running');

  // Timer global
  session.timer = setInterval(updateSessionTime, 1000);

  // Démarrer les phases
  runPhase();
}

function togglePause() {
  if (!state.breathingSession) return;

  const session = state.breathingSession;
  session.isPaused = !session.isPaused;

  // Arreter/reprendre les sons
  const audioPlayer = document.getElementById('audio-player');
  if (session.isPaused) {
    audioGuide.stop();
    if (audioPlayer && !audioPlayer.paused) {
      audioPlayer.pause();
      session.musicWasPlaying = true;
    }
  } else {
    // Reprendre l'audio guide
    audioGuide.resume();
    // Reprendre la musique si elle jouait avant la pause
    if (audioPlayer && session.musicWasPlaying) {
      audioPlayer.play().catch(() => {});
    }
  }

  const pauseBtn = document.getElementById('pause-btn');
  pauseBtn.innerHTML = session.isPaused
    ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Reprendre'
    : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pause';

  // Mise à jour texte d'aide
  updateBreathingHint(session.isPaused ? 'paused' : 'running');
}

function stopSession() {
  if (!state.breathingSession) return;

  const session = state.breathingSession;

  if (session.timer) clearInterval(session.timer);
  if (session.phaseTimer) clearTimeout(session.phaseTimer);
  if (session.countdownInterval) clearInterval(session.countdownInterval);

  // Arreter les sons
  audioGuide.stop();

  // Arreter la musique d'ambiance
  const audioPlayer = document.getElementById('audio-player');
  if (audioPlayer && !audioPlayer.paused) {
    audioPlayer.pause();
  }

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

  // Sélecteur type de sons respiratoires
  const breathSoundTypeSelect = document.getElementById('breath-sound-type');
  if (breathSoundTypeSelect) {
    breathSoundTypeSelect.value = state.settings.breathSoundType || 'synth';
    breathSoundTypeSelect.addEventListener('change', () => {
      state.settings.breathSoundType = breathSoundTypeSelect.value;
      audioGuide.soundType = breathSoundTypeSelect.value;
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
  isPaused: false,
  duration: 30,
  timeLeft: 30,
  timer: null,
  encouragementTimer: null,
  lastEncouragement: -1,
  musicPlaying: false,
  audioPlayers: {}, // Pour mixer plusieurs sons épiques
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

  // Clic sur cercle = start, long press = stop
  const coldCircle = document.querySelector('.coldshower-timer-container');

  if (coldCircle) {
    let pressTimer = null;
    let isLongPress = false;

    const startPress = () => {
      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        if (coldShowerState.isRunning) {
          if (navigator.vibrate) navigator.vibrate(100);
          stopColdShower();
          updateColdShowerHint('start');
        }
      }, 800);
    };

    const endPress = () => {
      clearTimeout(pressTimer);
      if (!isLongPress) {
        if (!coldShowerState.isRunning) {
          startColdShower();
        } else {
          toggleColdShowerPause();
        }
      }
    };

    const cancelPress = () => {
      clearTimeout(pressTimer);
    };

    coldCircle.style.cursor = 'pointer';
    coldCircle.addEventListener('mousedown', startPress);
    coldCircle.addEventListener('mouseup', endPress);
    coldCircle.addEventListener('mouseleave', cancelPress);
    coldCircle.addEventListener('touchstart', (e) => { e.preventDefault(); startPress(); });
    coldCircle.addEventListener('touchend', (e) => { e.preventDefault(); endPress(); });
    coldCircle.addEventListener('touchcancel', cancelPress);
  }

  updateColdTimerDisplay();
  updateColdLevel();
  updateColdShowerHint('start');

  // Event listeners pour les checkboxes de sons épiques (réactifs en temps réel)
  const coldSoundCheckboxes = document.querySelectorAll('input[name="cold-sound"]');
  coldSoundCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      if (!coldShowerState.isRunning) return;

      const trackKey = checkbox.value;

      if (checkbox.checked) {
        // Démarrer ce son
        if (trackKey && musicTracks[trackKey] && !coldShowerState.audioPlayers[trackKey]) {
          const audio = new Audio(musicTracks[trackKey].url);
          audio.loop = true;
          audio.play().catch(e => console.log('Audio play blocked:', trackKey));
          coldShowerState.audioPlayers[trackKey] = audio;
          adjustColdShowerVolumes();
        }
      } else {
        // Arrêter ce son
        if (coldShowerState.audioPlayers[trackKey]) {
          coldShowerState.audioPlayers[trackKey].pause();
          coldShowerState.audioPlayers[trackKey].currentTime = 0;
          delete coldShowerState.audioPlayers[trackKey];
          adjustColdShowerVolumes();
        }
      }
    });
  });
}

// Ajuster les volumes selon le nombre de sons actifs (douche froide)
function adjustColdShowerVolumes() {
  const count = Object.keys(coldShowerState.audioPlayers).length;
  const volume = count > 0 ? 0.6 / Math.max(1, count * 0.4) : 0.6;
  Object.values(coldShowerState.audioPlayers).forEach(audio => {
    audio.volume = volume;
  });
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

  // Mise à jour texte d'aide
  updateColdShowerHint('running');

  // Démarrer les sons épiques cochés (mix de plusieurs sons)
  const coldSoundCheckboxes = document.querySelectorAll('input[name="cold-sound"]:checked');
  coldShowerState.audioPlayers = {}; // Reset

  coldSoundCheckboxes.forEach(checkbox => {
    const trackKey = checkbox.value;
    if (trackKey && musicTracks[trackKey]) {
      const audio = new Audio(musicTracks[trackKey].url);
      audio.loop = true;
      audio.play().catch(e => console.log('Audio autoplay blocked:', trackKey));
      coldShowerState.audioPlayers[trackKey] = audio;
    }
  });
  adjustColdShowerVolumes();
  coldShowerState.musicPlaying = Object.keys(coldShowerState.audioPlayers).length > 0;

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
    if (coldShowerState.isPaused) return;

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
    if (!coldShowerState.isPaused) {
      showEncouragement();
    }
  }, 5000 + Math.random() * 3000);
}

function toggleColdShowerPause() {
  if (!coldShowerState.isRunning) return;

  coldShowerState.isPaused = !coldShowerState.isPaused;

  // Pause/reprendre tous les sons
  if (coldShowerState.audioPlayers && Object.keys(coldShowerState.audioPlayers).length > 0) {
    Object.values(coldShowerState.audioPlayers).forEach(audio => {
      if (coldShowerState.isPaused) {
        audio.pause();
      } else {
        audio.play().catch(() => {});
      }
    });
  }

  if (coldShowerState.isPaused) {
    voicePlayer.stop();
  }

  // Mise à jour texte d'aide
  updateColdShowerHint(coldShowerState.isPaused ? 'paused' : 'running');
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
  coldShowerState.isPaused = false;

  // Arrêter la musique
  stopColdShowerMusic();

  // Reset UI
  document.getElementById('cold-start-btn').classList.remove('hidden');
  document.getElementById('cold-stop-btn').classList.add('hidden');
  document.getElementById('cold-encouragement').textContent = '';

  // Reset timer
  coldShowerState.timeLeft = coldShowerState.duration;
  updateColdTimerDisplay();

  // Mise à jour texte d'aide
  updateColdShowerHint('start');

  voicePlayer.stop();
}

function updateColdShowerHint(mode) {
  const hint = document.getElementById('cold-circle-hint');
  if (!hint) return;

  hint.classList.remove('pause-hint', 'stop-hint');

  switch(mode) {
    case 'start':
      hint.textContent = 'Appuie sur le cercle pour commencer';
      break;
    case 'running':
      hint.textContent = 'Appuie pour pause · Maintiens pour arrêter';
      hint.classList.add('pause-hint');
      break;
    case 'paused':
      hint.textContent = 'Appuie pour reprendre · Maintiens pour arrêter';
      hint.classList.add('stop-hint');
      break;
  }
}

function stopColdShowerMusic() {
  // Arrêter tous les sons épiques du mix
  if (coldShowerState.audioPlayers && Object.keys(coldShowerState.audioPlayers).length > 0) {
    Object.values(coldShowerState.audioPlayers).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    coldShowerState.audioPlayers = {};
  }

  // Arrêter aussi l'audio player global si utilisé
  const audioPlayer = document.getElementById('audio-player');
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
  }
  coldShowerState.musicPlaying = false;
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
  isPaused: false,
  audioPlayers: {} // Objet pour associer chaque son à sa clé (trackKey: Audio)
};

// Initialisation du module méditation
function initMeditation() {
  const meditationCards = document.querySelectorAll('.meditation-card');
  const backBtn = document.getElementById('back-to-meditations');
  const meditationCircle = document.querySelector('.meditation-timer-container');

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

  // Clic sur cercle = start/pause, long press = stop
  if (meditationCircle) {
    let pressTimer = null;
    let isLongPress = false;

    const startPress = () => {
      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        if (meditationState.isRunning) {
          if (navigator.vibrate) navigator.vibrate(100);
          stopMeditation();
          updateMeditationHint('start');
        }
      }, 800);
    };

    const endPress = () => {
      clearTimeout(pressTimer);
      if (!isLongPress) {
        if (!meditationState.isRunning) {
          if (meditationState.selectedType) {
            startMeditation(meditationState.selectedType);
          }
        } else {
          toggleMeditationPause();
        }
      }
    };

    const cancelPress = () => {
      clearTimeout(pressTimer);
    };

    meditationCircle.style.cursor = 'pointer';
    meditationCircle.addEventListener('mousedown', startPress);
    meditationCircle.addEventListener('mouseup', endPress);
    meditationCircle.addEventListener('mouseleave', cancelPress);
    meditationCircle.addEventListener('touchstart', (e) => { e.preventDefault(); startPress(); });
    meditationCircle.addEventListener('touchend', (e) => { e.preventDefault(); endPress(); });
    meditationCircle.addEventListener('touchcancel', cancelPress);
  }

  // Event listeners pour les checkboxes de sons (réactifs en temps réel)
  const soundCheckboxes = document.querySelectorAll('input[name="meditation-sound"]');
  soundCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      if (!meditationState.isRunning || meditationState.isPaused) return;

      const trackKey = checkbox.value;

      if (checkbox.checked) {
        // Démarrer ce son
        if (trackKey && musicTracks[trackKey] && !meditationState.audioPlayers[trackKey]) {
          const audio = new Audio(musicTracks[trackKey].url);
          audio.loop = true;
          audio.volume = 0.35;
          audio.play().catch(e => console.log('Audio play blocked:', trackKey));
          meditationState.audioPlayers[trackKey] = audio;
          adjustMeditationVolumes();
        }
      } else {
        // Arrêter ce son
        if (meditationState.audioPlayers[trackKey]) {
          meditationState.audioPlayers[trackKey].pause();
          meditationState.audioPlayers[trackKey].currentTime = 0;
          delete meditationState.audioPlayers[trackKey];
          adjustMeditationVolumes();
        }
      }
    });
  });
}

// Ajuster les volumes selon le nombre de sons actifs
function adjustMeditationVolumes() {
  const count = Object.keys(meditationState.audioPlayers).length;
  const volume = count > 0 ? 0.35 / Math.max(1, count * 0.5) : 0.35;
  Object.values(meditationState.audioPlayers).forEach(audio => {
    audio.volume = volume;
  });
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

  // Reset texte d'aide
  updateMeditationHint('start');
}

function updateMeditationHint(mode) {
  const hint = document.getElementById('meditation-circle-hint');
  if (!hint) return;

  hint.classList.remove('pause-hint', 'stop-hint');

  switch(mode) {
    case 'start':
      hint.textContent = 'Appuie sur le cercle pour commencer';
      break;
    case 'running':
      hint.textContent = 'Appuie pour pause · Maintiens pour arrêter';
      hint.classList.add('pause-hint');
      break;
    case 'paused':
      hint.textContent = 'Appuie pour reprendre · Maintiens pour arrêter';
      hint.classList.add('stop-hint');
      break;
  }
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

  // Mise à jour texte d'aide
  updateMeditationHint('running');

  // Update UI
  document.getElementById('meditation-instruction').textContent = langScript.intro;

  // Démarrer les sons de méditation (mix de plusieurs sons cochés)
  const soundCheckboxes = document.querySelectorAll('input[name="meditation-sound"]:checked');
  meditationState.audioPlayers = {}; // Reset objet

  soundCheckboxes.forEach(checkbox => {
    const trackKey = checkbox.value;
    if (trackKey && musicTracks[trackKey]) {
      const audio = new Audio(musicTracks[trackKey].url);
      audio.loop = true;
      audio.play().catch(e => console.log('Audio autoplay blocked:', trackKey));
      meditationState.audioPlayers[trackKey] = audio;
    }
  });
  adjustMeditationVolumes();

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

  // Pause/reprendre tous les sons de méditation
  if (meditationState.audioPlayers && Object.keys(meditationState.audioPlayers).length > 0) {
    Object.values(meditationState.audioPlayers).forEach(audio => {
      if (meditationState.isPaused) {
        audio.pause();
      } else {
        audio.play().catch(() => {});
      }
    });
  }

  if (meditationState.isPaused) {
    voicePlayer.stop();
  }

  // Mise à jour texte d'aide
  updateMeditationHint(meditationState.isPaused ? 'paused' : 'running');
}

function stopMeditation() {
  meditationState.isRunning = false;
  meditationState.isPaused = false;

  if (meditationState.timer) {
    clearInterval(meditationState.timer);
    meditationState.timer = null;
  }

  // Arrêter tous les sons de méditation (mix)
  if (meditationState.audioPlayers && Object.keys(meditationState.audioPlayers).length > 0) {
    Object.values(meditationState.audioPlayers).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    meditationState.audioPlayers = {};
  }

  // Arrêter aussi l'audio player global si utilisé
  const audioPlayer = document.getElementById('audio-player');
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
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

// ===== Module Dashboard / Habit Tracker =====
const habitsList = [
  { id: 'nophone', name: 'Pas tel matin/soir', icon: '📵' },
  { id: 'coldshower', name: 'Douche froide', icon: '🚿' },
  { id: 'breathing', name: 'Respiration', icon: '🌬️' },
  { id: 'fasting', name: 'Jeûne 16h', icon: '🍽️' },
  { id: 'calisthenics', name: 'Calisthénie', icon: '💪' },
  { id: 'gratitude', name: 'Gratitude', icon: '🙏' },
  { id: 'reading', name: 'Lecture', icon: '📖' },
  { id: 'meditation', name: 'Méditation', icon: '🧘' },
  { id: 'sleep', name: 'Couché avant minuit', icon: '😴' }
];

const badges = [
  { id: 'iceman', name: 'Iceman', desc: '30 jours douche froide', icon: '🧊', habit: 'coldshower', target: 30, type: 'streak' },
  { id: 'monk', name: 'Moine', desc: '7 méditations d\'affilée', icon: '🧘', habit: 'meditation', target: 7, type: 'streak' },
  { id: 'warrior', name: 'Guerrier', desc: '3 calisthénie/semaine', icon: '⚔️', habit: 'calisthenics', target: 3, type: 'week' },
  { id: 'breath', name: 'Souffle de Vie', desc: '50 sessions respiration', icon: '🌬️', habit: 'breathing', target: 50, type: 'total' },
  { id: 'reader', name: 'Lecteur', desc: '14 jours lecture', icon: '📚', habit: 'reading', target: 14, type: 'streak' },
  { id: 'discipline', name: 'Discipline Ultime', desc: '7 jours 100% complet', icon: '👑', habit: 'all', target: 7, type: 'perfect' }
];

const dashboardState = {
  habits: {}, // { 'YYYY-MM-DD': { coldshower: true, breathing: false, ... } }
  streaks: {}, // { coldshower: 5, breathing: 12, ... }
  totals: {}, // { coldshower: 45, breathing: 120, ... }
  unlockedBadges: [], // ['iceman', 'monk', ...]
  globalStreak: 0
};

function initDashboard() {
  // Charger les données sauvegardées
  const savedDashboard = localStorage.getItem('breathflow_dashboard');
  if (savedDashboard) {
    const data = JSON.parse(savedDashboard);
    dashboardState.habits = data.habits || {};
    dashboardState.streaks = data.streaks || {};
    dashboardState.totals = data.totals || {};
    dashboardState.unlockedBadges = data.unlockedBadges || [];
    dashboardState.globalStreak = data.globalStreak || 0;
  }

  // Mettre à jour la date
  updateDashboardDate();

  // Charger les habitudes du jour
  loadTodayHabits();

  // Event listeners sur les checkboxes
  habitsList.forEach(habit => {
    const checkbox = document.getElementById(`habit-${habit.id}`);
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        toggleHabit(habit.id, checkbox.checked);
      });
    }
  });

  // Initialiser le calendrier mensuel
  initCalendar();

  // Mettre à jour les badges
  updateBadgesDisplay();

  // Mettre à jour la progression
  updateTodayProgress();

  // Mettre à jour le mini résumé accueil
  updateHomeMiniSummary();
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function updateDashboardDate() {
  const dateEl = document.getElementById('dashboard-date');
  if (dateEl) {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    dateEl.textContent = new Date().toLocaleDateString('fr-FR', options);
  }
}

function loadTodayHabits() {
  const today = getTodayKey();
  const todayHabits = dashboardState.habits[today] || {};

  habitsList.forEach(habit => {
    const checkbox = document.getElementById(`habit-${habit.id}`);
    if (checkbox) {
      checkbox.checked = !!todayHabits[habit.id];
    }
  });
}

function toggleHabit(habitId, checked) {
  const today = getTodayKey();

  // Initialiser le jour si nécessaire
  if (!dashboardState.habits[today]) {
    dashboardState.habits[today] = {};
  }

  dashboardState.habits[today][habitId] = checked;

  // Mettre à jour les totaux
  if (!dashboardState.totals[habitId]) {
    dashboardState.totals[habitId] = 0;
  }
  if (checked) {
    dashboardState.totals[habitId]++;
  } else {
    dashboardState.totals[habitId] = Math.max(0, dashboardState.totals[habitId] - 1);
  }

  // Recalculer les streaks
  calculateStreaks();

  // Sauvegarder
  saveDashboardData();

  // Mettre à jour l'affichage
  updateTodayProgress();
  updateBadgesDisplay();
  generateMonthCalendar();
  updateHomeMiniSummary();
  updateStreaksHeatmap();
}

function calculateStreaks() {
  const today = new Date();

  habitsList.forEach(habit => {
    let streak = 0;
    let date = new Date(today);

    // Compter les jours consécutifs
    while (true) {
      const dateKey = date.toISOString().split('T')[0];
      const dayHabits = dashboardState.habits[dateKey];

      if (dayHabits && dayHabits[habit.id]) {
        streak++;
        date.setDate(date.getDate() - 1);
      } else {
        break;
      }
    }

    dashboardState.streaks[habit.id] = streak;
  });

  // Calculer le streak global (jours avec 100% complété)
  let globalStreak = 0;
  let date = new Date(today);

  while (true) {
    const dateKey = date.toISOString().split('T')[0];
    const dayHabits = dashboardState.habits[dateKey];

    if (dayHabits) {
      const completed = habitsList.filter(h => dayHabits[h.id]).length;
      if (completed === habitsList.length) {
        globalStreak++;
        date.setDate(date.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  dashboardState.globalStreak = globalStreak;

  // Mettre à jour l'affichage du streak
  const streakEl = document.getElementById('global-streak');
  if (streakEl) {
    streakEl.textContent = dashboardState.globalStreak;
  }
}

function updateTodayProgress() {
  const today = getTodayKey();
  const todayHabits = dashboardState.habits[today] || {};
  const completed = habitsList.filter(h => todayHabits[h.id]).length;
  const total = habitsList.length;
  const percent = Math.round((completed / total) * 100);

  const progressBar = document.getElementById('today-progress-bar');
  const progressText = document.getElementById('today-progress-text');

  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }
  if (progressText) {
    progressText.textContent = `${completed}/${total}`;
  }
}

// Calendrier mensuel
let calendarCurrentDate = new Date();

function initCalendar() {
  const prevBtn = document.getElementById('cal-prev');
  const nextBtn = document.getElementById('cal-next');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
      generateMonthCalendar();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
      generateMonthCalendar();
    });
  }

  // Modal d'édition
  const closeModal = document.getElementById('close-day-modal');
  const saveBtn = document.getElementById('save-day-btn');

  if (closeModal) {
    closeModal.addEventListener('click', closeDayEditModal);
  }
  if (saveBtn) {
    saveBtn.addEventListener('click', saveDayEdit);
  }

  generateMonthCalendar();
}

function generateMonthCalendar() {
  const container = document.getElementById('calendar-days');
  const titleEl = document.getElementById('cal-month-title');
  if (!container) return;

  container.innerHTML = '';

  const year = calendarCurrentDate.getFullYear();
  const month = calendarCurrentDate.getMonth();

  // Titre du mois
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  if (titleEl) {
    titleEl.textContent = `${monthNames[month]} ${year}`;
  }

  // Premier jour du mois (0 = dimanche, on veut lundi = 0)
  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6; // Dimanche devient 6

  // Nombre de jours dans le mois
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];

  // Cases vides avant le premier jour
  for (let i = 0; i < startDay; i++) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'cal-day empty-day';
    container.appendChild(emptyEl);
  }

  // Jours du mois
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = date.toISOString().split('T')[0];
    const dayHabits = dashboardState.habits[dateKey] || {};
    const completed = habitsList.filter(h => dayHabits[h.id]).length;

    const dayEl = document.createElement('div');
    dayEl.className = 'cal-day';
    dayEl.dataset.date = dateKey;

    // Aujourd'hui
    if (dateKey === todayKey) {
      dayEl.classList.add('today');
    }

    // Futur (non cliquable)
    if (date > today) {
      dayEl.classList.add('future');
    }

    // Status
    if (completed === habitsList.length) {
      dayEl.classList.add('perfect');
    } else if (completed > 0) {
      dayEl.classList.add('partial');
    }

    dayEl.innerHTML = `
      <span class="cal-day-num">${day}</span>
      <span class="cal-day-dots">${getHabitDots(completed)}</span>
    `;

    // Click pour éditer (seulement passé et aujourd'hui)
    if (date <= today) {
      dayEl.addEventListener('click', () => openDayEditModal(dateKey));
    }

    container.appendChild(dayEl);
  }
}

function getHabitDots(completed) {
  if (completed === 0) return '';
  if (completed === habitsList.length) return '●';
  if (completed >= 7) return '◉';
  if (completed >= 4) return '◐';
  return '○';
}

let editingDateKey = null;

function openDayEditModal(dateKey) {
  editingDateKey = dateKey;

  const modal = document.getElementById('day-edit-modal');
  const titleEl = document.getElementById('day-edit-title');
  const habitsContainer = document.getElementById('day-edit-habits');

  if (!modal || !habitsContainer) return;

  // Titre avec date formatée
  const date = new Date(dateKey + 'T12:00:00');
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  if (titleEl) {
    titleEl.textContent = date.toLocaleDateString('fr-FR', options);
  }

  // Générer les checkboxes
  const dayHabits = dashboardState.habits[dateKey] || {};
  habitsContainer.innerHTML = '';

  habitsList.forEach(habit => {
    const isChecked = !!dayHabits[habit.id];
    const itemEl = document.createElement('div');
    itemEl.className = 'day-edit-item';
    itemEl.innerHTML = `
      <label class="day-edit-checkbox">
        <input type="checkbox" data-habit="${habit.id}" ${isChecked ? 'checked' : ''}>
        <span class="day-edit-check"></span>
      </label>
      <span class="day-edit-icon">${habit.icon}</span>
      <span class="day-edit-name">${habit.name}</span>
    `;
    habitsContainer.appendChild(itemEl);
  });

  modal.classList.remove('hidden');
}

function closeDayEditModal() {
  const modal = document.getElementById('day-edit-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  editingDateKey = null;
}

function saveDayEdit() {
  if (!editingDateKey) return;

  const habitsContainer = document.getElementById('day-edit-habits');
  const checkboxes = habitsContainer.querySelectorAll('input[type="checkbox"]');

  // Initialiser le jour si nécessaire
  if (!dashboardState.habits[editingDateKey]) {
    dashboardState.habits[editingDateKey] = {};
  }

  // Sauvegarder les changements
  checkboxes.forEach(checkbox => {
    const habitId = checkbox.dataset.habit;
    const wasChecked = !!dashboardState.habits[editingDateKey][habitId];
    const isNowChecked = checkbox.checked;

    dashboardState.habits[editingDateKey][habitId] = isNowChecked;

    // Mettre à jour les totaux
    if (!dashboardState.totals[habitId]) {
      dashboardState.totals[habitId] = 0;
    }
    if (isNowChecked && !wasChecked) {
      dashboardState.totals[habitId]++;
    } else if (!isNowChecked && wasChecked) {
      dashboardState.totals[habitId] = Math.max(0, dashboardState.totals[habitId] - 1);
    }
  });

  // Recalculer tout
  calculateStreaks();
  saveDashboardData();
  generateMonthCalendar();
  updateBadgesDisplay();
  updateTodayProgress();
  updateHomeMiniSummary();
  loadTodayHabits(); // Si on édite aujourd'hui, mettre à jour les checkboxes

  closeDayEditModal();
}

function updateBadgesDisplay() {
  badges.forEach(badge => {
    const card = document.querySelector(`.badge-card[data-badge="${badge.id}"]`);
    if (!card) return;

    let progress = 0;
    let current = 0;

    if (badge.type === 'streak') {
      current = dashboardState.streaks[badge.habit] || 0;
      progress = Math.min(100, (current / badge.target) * 100);
    } else if (badge.type === 'total') {
      current = dashboardState.totals[badge.habit] || 0;
      progress = Math.min(100, (current / badge.target) * 100);
    } else if (badge.type === 'week') {
      // Compter cette semaine
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      current = 0;

      for (let i = 0; i <= today.getDay(); i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        const dayHabits = dashboardState.habits[dateKey];
        if (dayHabits && dayHabits[badge.habit]) {
          current++;
        }
      }
      progress = Math.min(100, (current / badge.target) * 100);
    } else if (badge.type === 'perfect') {
      current = dashboardState.globalStreak;
      progress = Math.min(100, (current / badge.target) * 100);
    }

    // Mettre à jour la barre de progression
    const progressBar = document.getElementById(`badge-${badge.id}-progress`);
    const progressText = document.getElementById(`badge-${badge.id}-text`);

    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
    if (progressText) {
      progressText.textContent = `${current}/${badge.target}`;
    }

    // Badge débloqué ?
    if (current >= badge.target) {
      card.classList.remove('locked');
      card.classList.add('unlocked');
      if (!dashboardState.unlockedBadges.includes(badge.id)) {
        dashboardState.unlockedBadges.push(badge.id);
        // Animation de déblocage
        card.classList.add('just-unlocked');
        setTimeout(() => card.classList.remove('just-unlocked'), 2000);
      }
    } else {
      card.classList.add('locked');
      card.classList.remove('unlocked');
    }
  });
}

function updateHomeMiniSummary() {
  const today = getTodayKey();
  const todayHabits = dashboardState.habits[today] || {};
  const completed = habitsList.filter(h => todayHabits[h.id]).length;
  const total = habitsList.length;
  const percent = Math.round((completed / total) * 100);

  // Mettre à jour le mini résumé sur l'accueil
  const miniStreak = document.getElementById('home-mini-streak');
  const miniProgress = document.getElementById('home-mini-progress');
  const miniBar = document.getElementById('home-mini-bar');

  if (miniStreak) {
    miniStreak.textContent = dashboardState.globalStreak;
  }
  if (miniProgress) {
    miniProgress.textContent = `${completed}/${total}`;
  }
  if (miniBar) {
    miniBar.style.width = `${percent}%`;
  }

  // Mettre à jour le streak sur l'accueil (existant)
  const currentStreak = document.getElementById('current-streak');
  if (currentStreak) {
    currentStreak.textContent = dashboardState.globalStreak;
  }
}

function saveDashboardData() {
  localStorage.setItem('breathflow_dashboard', JSON.stringify({
    habits: dashboardState.habits,
    streaks: dashboardState.streaks,
    totals: dashboardState.totals,
    unlockedBadges: dashboardState.unlockedBadges,
    globalStreak: dashboardState.globalStreak
  }));
}

// ===== Citations & Poésie =====
const inspirationalQuotes = [
  { text: "La respiration est le pont qui relie la vie à la conscience, qui unit le corps à vos pensées.", author: "Thich Nhat Hanh" },
  { text: "Inspirer le futur, expirer le passé.", author: "Proverbe Zen" },
  { text: "Le calme est la clé de toute réponse créatrice.", author: "Deepak Chopra" },
  { text: "Le souffle est le roi de l'esprit.", author: "B.K.S. Iyengar" },
  { text: "Dans le moment présent, il n'y a pas de problème.", author: "Eckhart Tolle" },
  { text: "Le silence est l'élément dans lequel se forment les grandes choses.", author: "Thomas Carlyle" },
  { text: "La paix vient de l'intérieur. Ne la cherchez pas à l'extérieur.", author: "Bouddha" },
  { text: "Chaque matin nous naissons de nouveau. Ce que nous faisons aujourd'hui est ce qui compte le plus.", author: "Bouddha" },
  { text: "Le plus grand voyageur n'est pas celui qui a fait dix fois le tour du monde, mais celui qui a fait une seule fois le tour de lui-même.", author: "Gandhi" },
  { text: "Là où tu te trouves, creuse profondément ! En-dessous, c'est la source !", author: "Nietzsche" },
  { text: "Ce n'est pas la montagne que nous conquérons mais nous-mêmes.", author: "Edmund Hillary" },
  { text: "Le bonheur n'est pas quelque chose de tout fait. Il vient de vos propres actions.", author: "Dalaï Lama" },
  { text: "L'âme se teint de la couleur de ses pensées.", author: "Marc Aurèle" },
  { text: "La plus grande gloire n'est pas de ne jamais tomber, mais de se relever à chaque chute.", author: "Confucius" },
  { text: "On ne peut pas arrêter les vagues, mais on peut apprendre à surfer.", author: "Jon Kabat-Zinn" }
];

const poems = [
  {
    title: "Invictus",
    author: "William Ernest Henley",
    icon: "⚔️",
    text: `Dans les ténèbres qui m'enserrent,
Noires comme un puits où l'on se noie,
Je rends grâce aux dieux quels qu'ils soient
Pour mon âme inconquérable.

Dans de cruelles circonstances,
Je n'ai ni gémi ni pleuré.
Meurtri par cette existence,
Je suis debout bien que blessé.

En ce lieu de colère et de pleurs,
Se profile l'ombre de la mort.
Je ne sais ce que me réserve le sort,
Mais je suis et je reste sans peur.

Aussi étroit soit le chemin,
Nombreux les châtiments infâmes,
Je suis le maître de mon destin,
Je suis le capitaine de mon âme.`
  },
  {
    title: "Si...",
    author: "Rudyard Kipling",
    icon: "🌟",
    text: `Si tu peux voir détruit l'ouvrage de ta vie
Et sans dire un seul mot te mettre à rebâtir,
Ou perdre en un seul coup le gain de cent parties
Sans un geste et sans un soupir ;

Si tu peux être amant sans être fou d'amour,
Si tu peux être fort sans cesser d'être tendre,
Et, te sentant haï, sans haïr à ton tour,
Pourtant lutter et te défendre ;

Si tu peux rencontrer Triomphe après Défaite
Et recevoir ces deux menteurs d'un même front,
Si tu peux conserver ton courage et ta tête
Quand tous les autres les perdront,

Alors les Rois, les Dieux, la Chance et la Victoire
Seront à tout jamais tes esclaves soumis,
Et, ce qui vaut mieux que les Rois et la Gloire,
Tu seras un homme, mon fils.`
  },
  {
    title: "L'homme qui voulait",
    author: "Edgar A. Guest",
    icon: "🔥",
    text: `Il y avait une fois un homme qui disait :
"Je ne peux pas" et ne faisait jamais.
Il y avait aussi un homme qui disait :
"Je peux" et toujours il essayait.

L'un s'arrêtait devant chaque colline,
L'autre en faisait un tremplin.
L'un voyait en tout une ruine,
L'autre un nouveau chemin.

L'un trouvait mille raisons de faillir,
L'autre en trouvait une pour réussir.
L'un craignait de faire erreur,
L'autre apprenait de chaque douleur.

Et quand la vie leur sourit enfin,
Ce fut le courage qui traça leur destin.
Car la seule différence entre les deux
Fut celui qui croyait en ses vœux.`
  },
  {
    title: "Le Lac",
    author: "Alphonse de Lamartine",
    icon: "🌊",
    text: `Ô temps ! suspends ton vol, et vous, heures propices !
Suspendez votre cours :
Laissez-nous savourer les rapides délices
Des plus beaux de nos jours !

Assez de malheureux ici-bas vous implorent,
Coulez, coulez pour eux ;
Prenez avec leurs jours les soins qui les dévorent ;
Oubliez les heureux.

Mais je demande en vain quelques moments encore,
Le temps m'échappe et fuit ;
Je dis à cette nuit : Sois plus lente ; et l'aurore
Va dissiper la nuit.

Aimons donc, aimons donc ! de l'heure fugitive,
Hâtons-nous, jouissons !
L'homme n'a point de port, le temps n'a point de rive ;
Il coule, et nous passons !`
  },
  {
    title: "Desiderata",
    author: "Max Ehrmann",
    icon: "🕊️",
    text: `Va paisiblement ton chemin à travers le bruit
et la hâte, et souviens-toi de la paix
qui peut exister dans le silence.

Sans te renier, sois en bons termes avec tous.
Exprime ta vérité calmement et clairement.
Écoute les autres, même les plus ennuyeux :
eux aussi ont quelque chose à dire.

Si tu te compares aux autres,
tu risques de devenir orgueilleux ou amer,
car il y aura toujours quelqu'un
de plus grand ou de moins grand que toi.

Sois toi-même. Surtout, ne feins pas l'amitié.
N'aborde pas non plus l'amour avec cynisme,
car malgré les vicissitudes,
il est aussi vivace que le brin d'herbe.

Et quoi que tu en penses,
le monde progresse comme il doit.
Sois en paix avec Dieu, quelle que soit l'idée
que tu te fais de Lui.

Tu es un enfant de l'univers,
tu as le droit d'être ici.
Et que cela te soit clair ou non,
l'univers se déploie comme il le doit.`
  }
];

// État pour le sommeil et le score holistic
const sleepState = {
  bedtime: null,
  wakeup: null,
  quality: null,
  date: null
};

function showStartupQuote() {
  const modal = document.getElementById('startup-quote-modal');
  const quoteText = document.getElementById('startup-quote-text');
  const quoteAuthor = document.getElementById('startup-quote-author');
  const closeBtn = document.getElementById('close-startup-quote');

  if (!modal || !quoteText || !quoteAuthor) return;

  // Vérifier si déjà affiché aujourd'hui
  const today = new Date().toDateString();
  const lastShown = localStorage.getItem('lastQuoteDate');

  if (lastShown === today) {
    modal.classList.add('hidden');
    return;
  }

  // Sélectionner une citation aléatoire
  const quote = inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)];
  quoteText.textContent = quote.text;
  quoteAuthor.textContent = '— ' + quote.author;

  modal.classList.remove('hidden');

  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    localStorage.setItem('lastQuoteDate', today);
  });
}

function initPoetry() {
  renderPoetryPage();

  const refreshBtn = document.getElementById('refresh-quote-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      const quote = inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)];
      document.getElementById('poetry-quote-text').textContent = quote.text;
      document.getElementById('poetry-quote-author').textContent = '— ' + quote.author;
    });
  }

  const closeReader = document.getElementById('close-poem-reader');
  if (closeReader) {
    closeReader.addEventListener('click', () => {
      document.getElementById('poem-reader').classList.add('hidden');
    });
  }
}

function renderPoetryPage() {
  // Citation du jour
  const quote = inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)];
  const quoteText = document.getElementById('poetry-quote-text');
  const quoteAuthor = document.getElementById('poetry-quote-author');
  if (quoteText) quoteText.textContent = quote.text;
  if (quoteAuthor) quoteAuthor.textContent = '— ' + quote.author;

  // Liste des poèmes
  const poemsList = document.getElementById('poems-list');
  if (!poemsList) return;

  poemsList.innerHTML = poems.map((poem, index) => `
    <div class="poem-card" data-poem-index="${index}">
      <span class="poem-card-icon">${poem.icon}</span>
      <div class="poem-card-info">
        <span class="poem-card-title">${poem.title}</span>
        <span class="poem-card-author">${poem.author}</span>
      </div>
      <span class="poem-card-arrow">→</span>
    </div>
  `).join('');

  // Event listeners
  poemsList.querySelectorAll('.poem-card').forEach(card => {
    card.addEventListener('click', () => {
      const index = parseInt(card.dataset.poemIndex);
      openPoemReader(poems[index]);
    });
  });
}

function openPoemReader(poem) {
  const reader = document.getElementById('poem-reader');
  const title = document.getElementById('poem-reader-title');
  const author = document.getElementById('poem-reader-author');
  const text = document.getElementById('poem-reader-text');

  if (!reader) return;

  title.textContent = poem.title;
  author.textContent = poem.author;
  text.textContent = poem.text;

  reader.classList.remove('hidden');
}

// ===== Sleep Tracker =====
function initSleepTracker() {
  loadSleepData();
  updateSleepDisplay();

  const editBtn = document.getElementById('edit-sleep-btn');
  const modal = document.getElementById('sleep-modal');
  const closeBtn = document.getElementById('close-sleep-modal');
  const saveBtn = document.getElementById('save-sleep-btn');
  const qualityBtns = document.querySelectorAll('.quality-btn');

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
      // Pré-remplir avec les valeurs actuelles
      if (sleepState.bedtime) {
        document.getElementById('sleep-bedtime').value = sleepState.bedtime;
      }
      if (sleepState.wakeup) {
        document.getElementById('sleep-wakeup').value = sleepState.wakeup;
      }
      if (sleepState.quality) {
        qualityBtns.forEach(btn => {
          btn.classList.toggle('active', parseInt(btn.dataset.quality) === sleepState.quality);
        });
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  qualityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      qualityBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', saveSleepData);
  }
}

function loadSleepData() {
  const today = new Date().toDateString();
  const saved = localStorage.getItem('breathflow_sleep');

  if (saved) {
    const data = JSON.parse(saved);
    if (data.date === today) {
      sleepState.bedtime = data.bedtime;
      sleepState.wakeup = data.wakeup;
      sleepState.quality = data.quality;
      sleepState.date = data.date;
    }
  }
}

function saveSleepData() {
  const bedtime = document.getElementById('sleep-bedtime').value;
  const wakeup = document.getElementById('sleep-wakeup').value;
  const qualityBtn = document.querySelector('.quality-btn.active');
  const quality = qualityBtn ? parseInt(qualityBtn.dataset.quality) : 3;

  sleepState.bedtime = bedtime;
  sleepState.wakeup = wakeup;
  sleepState.quality = quality;
  sleepState.date = new Date().toDateString();

  localStorage.setItem('breathflow_sleep', JSON.stringify(sleepState));

  document.getElementById('sleep-modal').classList.add('hidden');
  updateSleepDisplay();
  updateHolisticScore();
}

function updateSleepDisplay() {
  const durationEl = document.getElementById('sleep-duration');
  const qualityEl = document.getElementById('sleep-quality-display');
  const rangeEl = document.getElementById('sleep-time-range');

  if (!sleepState.bedtime || !sleepState.wakeup) {
    if (durationEl) durationEl.textContent = '--';
    if (qualityEl) qualityEl.textContent = '--';
    if (rangeEl) rangeEl.textContent = '--';
    return;
  }

  // Calculer la durée
  const [bedH, bedM] = sleepState.bedtime.split(':').map(Number);
  const [wakeH, wakeM] = sleepState.wakeup.split(':').map(Number);

  let bedMinutes = bedH * 60 + bedM;
  let wakeMinutes = wakeH * 60 + wakeM;

  if (wakeMinutes < bedMinutes) {
    wakeMinutes += 24 * 60; // Nuit passée
  }

  const durationMinutes = wakeMinutes - bedMinutes;
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;

  if (durationEl) durationEl.textContent = hours + 'h' + (mins > 0 ? mins.toString().padStart(2, '0') : '');

  // Qualité
  const qualityEmojis = ['', '😫', '😕', '😐', '🙂', '😴'];
  if (qualityEl) qualityEl.textContent = qualityEmojis[sleepState.quality] || '--';

  // Plage horaire
  if (rangeEl) rangeEl.textContent = sleepState.bedtime + '-' + sleepState.wakeup;
}

// ===== Score Holistic =====
function updateHolisticScore() {
  const today = new Date().toDateString();

  // Score Sommeil (0-100)
  let sleepScore = 0;
  if (sleepState.bedtime && sleepState.wakeup && sleepState.date === today) {
    const [bedH, bedM] = sleepState.bedtime.split(':').map(Number);
    const [wakeH, wakeM] = sleepState.wakeup.split(':').map(Number);
    let bedMinutes = bedH * 60 + bedM;
    let wakeMinutes = wakeH * 60 + wakeM;
    if (wakeMinutes < bedMinutes) wakeMinutes += 24 * 60;
    const durationHours = (wakeMinutes - bedMinutes) / 60;

    // Score basé sur durée (7-9h optimal)
    if (durationHours >= 7 && durationHours <= 9) {
      sleepScore = 80;
    } else if (durationHours >= 6 && durationHours <= 10) {
      sleepScore = 60;
    } else {
      sleepScore = 30;
    }

    // Bonus qualité
    sleepScore += (sleepState.quality - 3) * 10;

    // Bonus coucher tôt (avant 23h)
    if (bedH < 23 || (bedH === 23 && bedM === 0)) {
      sleepScore += 10;
    }

    sleepScore = Math.max(0, Math.min(100, sleepScore));
  }

  // Score Habitudes (basé sur les checkboxes du dashboard)
  let habitsCompleted = 0;
  const totalHabits = 9;
  document.querySelectorAll('.habit-item input[type="checkbox"]').forEach(cb => {
    if (cb.checked) habitsCompleted++;
  });
  const habitsScore = Math.round((habitsCompleted / totalHabits) * 100);

  // Score Corps (douche froide + calisthenics + respiration)
  let bodyScore = 0;
  if (document.getElementById('habit-coldshower')?.checked) bodyScore += 35;
  if (document.getElementById('habit-calisthenics')?.checked) bodyScore += 35;
  if (document.getElementById('habit-breathing')?.checked) bodyScore += 30;

  // Score Mental (méditation + lecture + gratitude)
  let mindScore = 0;
  if (document.getElementById('habit-meditation')?.checked) mindScore += 35;
  if (document.getElementById('habit-reading')?.checked) mindScore += 35;
  if (document.getElementById('habit-gratitude')?.checked) mindScore += 30;

  // Score global (moyenne pondérée)
  const weights = { sleep: 0.3, habits: 0.25, body: 0.25, mind: 0.2 };
  const globalScore = Math.round(
    sleepScore * weights.sleep +
    habitsScore * weights.habits +
    bodyScore * weights.body +
    mindScore * weights.mind
  );

  // Mettre à jour l'UI
  const scoreEl = document.getElementById('holistic-score');
  const sleepEl = document.getElementById('holistic-sleep');
  const habitsEl = document.getElementById('holistic-habits');
  const bodyEl = document.getElementById('holistic-body');
  const mindEl = document.getElementById('holistic-mind');
  const ringEl = document.getElementById('holistic-progress-ring');
  const insightEl = document.getElementById('holistic-insight');

  if (scoreEl) scoreEl.textContent = globalScore || '--';
  if (sleepEl) sleepEl.textContent = sleepScore || '--';
  if (habitsEl) habitsEl.textContent = habitsScore;
  if (bodyEl) bodyEl.textContent = bodyScore;
  if (mindEl) mindEl.textContent = mindScore;

  // Animer le cercle
  if (ringEl) {
    const circumference = 283; // 2 * PI * 45
    const offset = circumference - (globalScore / 100) * circumference;
    ringEl.style.strokeDashoffset = offset;
  }

  // Message insight
  if (insightEl) {
    if (globalScore >= 80) {
      insightEl.textContent = "🔥 Excellente journée ! Tu es au top de ta forme.";
    } else if (globalScore >= 60) {
      insightEl.textContent = "👍 Bonne progression ! Continue comme ça.";
    } else if (globalScore >= 40) {
      insightEl.textContent = "💪 Pas mal ! Quelques habitudes de plus et tu y es.";
    } else if (globalScore > 0) {
      insightEl.textContent = "🌱 C'est un début. Chaque petit pas compte !";
    } else {
      insightEl.textContent = "Complète tes activités pour voir ton score !";
    }
  }

  // Sauvegarder le score
  localStorage.setItem('breathflow_holistic_' + today, JSON.stringify({
    global: globalScore,
    sleep: sleepScore,
    habits: habitsScore,
    body: bodyScore,
    mind: mindScore
  }));
}

// Mettre à jour le score holistic quand une habitude change
document.addEventListener('change', (e) => {
  if (e.target.closest('.habit-item')) {
    setTimeout(updateHolisticScore, 100);
  }
});

// ===== Mes Rêves =====
const dreamCategories = {
  love: {
    emoji: '❤️', title: 'Amour & Relations',
    questions: [
      "À quoi ressemble ta relation idéale ? Décris une journée type avec cette personne.",
      "Quelle qualité est non-négociable chez ton/ta partenaire idéal(e) ?",
      "Quel schéma amoureux du passé tu refuses de reproduire ?",
      "Comment veux-tu te sentir dans ta relation ? (pas ce que l'autre fait, ce que TU ressens)",
      "Qu'est-ce que tu as besoin de guérir en toi avant d'attirer cette relation ?",
      "Imagine : tu as 80 ans, tu regardes en arrière. C'était quoi une vie amoureuse réussie pour toi ?",
      "Quel type de père/mère veux-tu être ? Comment ta relation de couple nourrit ça ?",
      "Qu'est-ce que tu donnes dans une relation ? Et qu'est-ce que tu attends en retour ?"
    ]
  },
  career: {
    emoji: '💰', title: 'Carrière & Argent',
    questions: [
      "Si tu avais 10 millions en banque demain, que ferais-tu de tes journées ?",
      "Quel problème dans le monde tu voudrais résoudre et qu'on te paye pour ?",
      "Quel revenu mensuel rendrait ta vie confortable, sans stress ?",
      "Qu'est-ce qui te bloque pour atteindre ce revenu ? Sois honnête.",
      "Dans 3 ans, c'est quoi ton titre, ton activité, ta journée type ?",
      "Quelle compétence, si tu la maîtrisais, changerait tout ?",
      "Quel est ton rapport à l'argent ? D'où vient-il (famille, éducation) ?",
      "Qu'est-ce que tu ferais si tu savais que tu ne pouvais pas échouer ?"
    ]
  },
  health: {
    emoji: '💪', title: 'Santé & Corps',
    questions: [
      "Comment tu veux te sentir physiquement au quotidien ?",
      "Quel est ton physique idéal ? Pas pour les autres - pour toi.",
      "Quelle habitude de santé tu procrastines depuis trop longtemps ?",
      "Qu'est-ce que tu mets dans ton corps qui ne te sert pas ?",
      "À 70 ans, tu veux être capable de faire quoi physiquement ?",
      "Quel sport ou pratique te fait vibrer quand tu le fais ?",
      "Quelle est ta plus grande peur liée à ta santé ?",
      "Comment ta santé physique impacte le reste de ta vie (mental, relations, travail) ?"
    ]
  },
  family: {
    emoji: '👨‍👩‍👧‍👦', title: 'Famille',
    questions: [
      "Quel genre de famille veux-tu construire ? Décris l'ambiance.",
      "Qu'est-ce que tu veux transmettre à tes enfants que tes parents ne t'ont pas donné ?",
      "Quelle relation veux-tu avec tes parents/fratrie maintenant ?",
      "Comment tu veux que tes enfants se souviennent de toi ?",
      "Quel blessure familiale as-tu besoin de guérir pour ne pas la transmettre ?",
      "Combien d'enfants ? Où ? Quel style de vie familiale ?",
      "Qu'est-ce qui manquait dans ta famille d'origine que tu veux créer ?",
      "Comment tu équilibres ambition personnelle et présence familiale ?"
    ]
  },
  growth: {
    emoji: '🧠', title: 'Développement personnel',
    questions: [
      "Qui est la meilleure version de toi ? Décris cette personne en détail.",
      "Quelle peur, si tu la dépassais, changerait ta vie du jour au lendemain ?",
      "Quel défaut tu connais chez toi mais que tu n'as pas encore travaillé ?",
      "Quel livre, mentor ou expérience t'a le plus transformé ?",
      "Qu'est-ce que les gens qui te connaissent bien diraient que tu dois travailler ?",
      "Si tu pouvais maîtriser une seule qualité (discipline, confiance, patience...), laquelle ?",
      "Qu'est-ce que tu fuis ? Pourquoi ?",
      "Dans quel domaine de ta vie tu te mens à toi-même ?"
    ]
  },
  adventure: {
    emoji: '🌍', title: 'Aventure & Expériences',
    questions: [
      "Cite 5 expériences que tu veux vivre avant de mourir.",
      "Quel pays ou lieu t'appelle ? Pourquoi ?",
      "Quelle aventure te fait peur ET te fait rêver en même temps ?",
      "Qu'est-ce que tu regretterais de ne PAS avoir fait ?",
      "Quel mode de vie tu envies chez quelqu'un d'autre ?",
      "Si tu avais 1 an sabbatique demain, tu fais quoi ?",
      "Quelle expérience te ferait grandir le plus ?",
      "Comment tu veux te sentir quand tu voyages ou vis des aventures ?"
    ]
  },
  impact: {
    emoji: '🌟', title: 'Impact & Contribution',
    questions: [
      "Qu'est-ce que tu veux laisser derrière toi ? Ton héritage, c'est quoi ?",
      "Quelle cause te touche au point de te mettre en colère ?",
      "Comment tu veux contribuer au monde avec tes talents ?",
      "Si tu avais une fondation, elle ferait quoi ?",
      "Quelles personnes tu veux inspirer ? Comment ?",
      "Qu'est-ce que le monde a besoin que TU spécifiquement apportes ?",
      "Si on écrivait un article sur toi dans 10 ans, il dirait quoi ?",
      "Quelle communauté ou mouvement tu veux créer ou rejoindre ?"
    ]
  }
};

const dreamMotivations = [
  "Tu te rappelles pourquoi tu te lèves chaque matin ? Ton rêve t'attend. Fonce !",
  "Rappelle-toi : chaque action aujourd'hui te rapproche de ta vision. Go !",
  "Hey ! Tu mérites la vie dont tu rêves. N'oublie pas. Jamais.",
  "Les autres rêvent. Toi, tu construis. Continue.",
  "C'est dans les jours où t'as pas envie que ça se joue. Pousse !",
  "Ton futur toi te remercie déjà pour ce que tu fais aujourd'hui.",
  "Lâche rien. T'es plus proche que tu le crois.",
  "La discipline bat le talent quand le talent n'est pas discipliné. Tu sais ça."
];

const WORKER_URL = 'https://black-cell-5b71ted.moysan-teddy.workers.dev';

const dreamsState = {
  vision: '',
  dreams: {},
  notifsEnabled: false,
  currentCategory: null,
  chatHistory: [],
  chatLoading: false
};

function initDreams() {
  loadDreamsData();
  setupDreamsUI();
  updateDreamCounts();
  scheduleDreamNotifications();
}

function loadDreamsData() {
  const saved = localStorage.getItem('breathflow_dreams');
  if (saved) {
    const data = JSON.parse(saved);
    dreamsState.vision = data.vision || '';
    dreamsState.dreams = data.dreams || {};
    dreamsState.notifsEnabled = data.notifsEnabled || false;
  }

  // Restaurer la vision
  const visionEl = document.getElementById('dreams-global-vision');
  if (visionEl && dreamsState.vision) visionEl.value = dreamsState.vision;

  // Restaurer le toggle
  const toggle = document.getElementById('dreams-notif-toggle');
  if (toggle) toggle.checked = dreamsState.notifsEnabled;
}

function saveDreamsData() {
  dreamsState.vision = document.getElementById('dreams-global-vision')?.value || '';
  localStorage.setItem('breathflow_dreams', JSON.stringify(dreamsState));
}

function setupDreamsUI() {
  // Save vision on blur
  const visionEl = document.getElementById('dreams-global-vision');
  if (visionEl) {
    visionEl.addEventListener('blur', saveDreamsData);
  }

  // Category cards
  document.querySelectorAll('.dream-category-card').forEach(card => {
    card.addEventListener('click', () => {
      openDreamCategory(card.dataset.category);
    });
  });

  // Close detail
  const closeBtn = document.getElementById('close-dream-detail');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('dream-detail-modal').classList.add('hidden');
      updateDreamCounts();
    });
  }

  // Next question
  const nextQ = document.getElementById('next-coaching-question');
  if (nextQ) {
    nextQ.addEventListener('click', () => {
      if (dreamsState.currentCategory) {
        displayCoachingQuestion(dreamsState.currentCategory);
      }
    });
  }

  // Save dream
  const saveBtn = document.getElementById('save-dream-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveDreamEntry);
  }

  // Notif toggle
  const notifToggle = document.getElementById('dreams-notif-toggle');
  if (notifToggle) {
    notifToggle.addEventListener('change', (e) => {
      dreamsState.notifsEnabled = e.target.checked;
      saveDreamsData();
      if (e.target.checked) {
        requestNotificationPermission();
        scheduleDreamNotifications();
      }
    });
  }

  // AI Coach chat
  const coachSend = document.getElementById('ai-coach-send');
  const coachInput = document.getElementById('ai-coach-input');
  if (coachSend && coachInput) {
    coachSend.addEventListener('click', () => sendToCoach());
    coachInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendToCoach();
      }
    });
  }

  // AI Coach micro (Speech Recognition)
  const micBtn = document.getElementById('ai-coach-mic');
  if (micBtn) {
    micBtn.addEventListener('click', toggleVoiceRecognition);
  }
}

function openDreamCategory(category) {
  const cat = dreamCategories[category];
  if (!cat) return;

  dreamsState.currentCategory = category;

  document.getElementById('dream-detail-emoji').textContent = cat.emoji;
  document.getElementById('dream-detail-title').textContent = cat.title;

  displayCoachingQuestion(category);
  renderDreamEntries(category);

  document.getElementById('dream-detail-modal').classList.remove('hidden');
  document.getElementById('dream-new-text').value = '';

  // Reset AI coach chat pour cette catégorie
  resetCoachChat(category);
}

function displayCoachingQuestion(category) {
  const cat = dreamCategories[category];
  if (!cat) return;
  const q = cat.questions[Math.floor(Math.random() * cat.questions.length)];
  const el = document.getElementById('dream-coaching-question');
  if (el) el.textContent = q;
}

function saveDreamEntry() {
  const category = dreamsState.currentCategory;
  const text = document.getElementById('dream-new-text')?.value.trim();
  if (!text || !category) return;

  if (!dreamsState.dreams[category]) {
    dreamsState.dreams[category] = [];
  }

  dreamsState.dreams[category].push({
    id: Date.now(),
    text: text,
    date: new Date().toISOString(),
    category: category
  });

  saveDreamsData();
  renderDreamEntries(category);
  document.getElementById('dream-new-text').value = '';

  // Feedback
  displayCoachingQuestion(category);
}

function renderDreamEntries(category) {
  const container = document.getElementById('dream-entries-list');
  if (!container) return;

  const entries = dreamsState.dreams[category] || [];

  if (entries.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1rem;">Aucun rêve noté. Réponds à la question coaching et écris ton premier rêve !</p>';
    return;
  }

  container.innerHTML = entries.map(entry => {
    const date = new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `
      <div class="dream-entry">
        <div class="dream-entry-text">${entry.text}</div>
        <div class="dream-entry-date">${date}</div>
        <button class="dream-entry-delete" onclick="deleteDream('${category}', ${entry.id})">×</button>
      </div>
    `;
  }).reverse().join('');
}

function deleteDream(category, id) {
  if (dreamsState.dreams[category]) {
    dreamsState.dreams[category] = dreamsState.dreams[category].filter(d => d.id !== id);
    saveDreamsData();
    renderDreamEntries(category);
    updateDreamCounts();
  }
}

function updateDreamCounts() {
  Object.keys(dreamCategories).forEach(cat => {
    const count = (dreamsState.dreams[cat] || []).length;
    const el = document.getElementById(`dream-count-${cat}`);
    if (el) el.textContent = count + ' rêve' + (count > 1 ? 's' : '');
  });
}

// ===== Dream Notifications =====
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function scheduleDreamNotifications() {
  if (!dreamsState.notifsEnabled) return;

  // Toast motivant au bout de 30 minutes dans l'app
  setTimeout(() => {
    showDreamToast();
  }, 30 * 60 * 1000);

  // Et toutes les 2 heures
  setInterval(() => {
    if (dreamsState.notifsEnabled) {
      showDreamToast();
      sendDreamNotification();
    }
  }, 2 * 60 * 60 * 1000);

  // Premier toast après 2 min pour montrer que ça marche
  setTimeout(() => {
    if (dreamsState.notifsEnabled) showDreamToast();
  }, 2 * 60 * 1000);
}

function showDreamToast() {
  // Récupérer un rêve aléatoire de l'utilisateur
  const allDreams = [];
  Object.entries(dreamsState.dreams).forEach(([cat, entries]) => {
    entries.forEach(e => allDreams.push({ ...e, catEmoji: dreamCategories[cat]?.emoji }));
  });

  let toastHTML = '';

  if (allDreams.length > 0) {
    const dream = allDreams[Math.floor(Math.random() * allDreams.length)];
    const motivation = dreamMotivations[Math.floor(Math.random() * dreamMotivations.length)];
    toastHTML = `
      <div class="dream-toast-title">${dream.catEmoji} Rappel de ton rêve</div>
      <div class="dream-toast-text">"${dream.text.slice(0, 80)}${dream.text.length > 80 ? '...' : ''}"</div>
      <div style="margin-top:0.5rem;font-weight:600;font-size:0.8rem;">${motivation}</div>
    `;
  } else {
    toastHTML = `
      <div class="dream-toast-title">✦ Hey !</div>
      <div class="dream-toast-text">${dreamMotivations[Math.floor(Math.random() * dreamMotivations.length)]}</div>
    `;
  }

  // Créer le toast
  let toast = document.querySelector('.dream-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'dream-toast';
    document.body.appendChild(toast);
  }

  toast.innerHTML = toastHTML;

  // Animer
  requestAnimationFrame(() => {
    toast.classList.add('visible');
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 6000);
  });
}

function sendDreamNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const allDreams = [];
  Object.entries(dreamsState.dreams).forEach(([cat, entries]) => {
    entries.forEach(e => allDreams.push({ ...e, catTitle: dreamCategories[cat]?.title }));
  });

  if (allDreams.length === 0) return;

  const dream = allDreams[Math.floor(Math.random() * allDreams.length)];
  const motivation = dreamMotivations[Math.floor(Math.random() * dreamMotivations.length)];

  new Notification("Respir'Action - " + dream.catTitle, {
    body: `"${dream.text.slice(0, 100)}" — ${motivation}`,
    icon: 'icon-192.png',
    tag: 'dream-reminder'
  });
}

// ===== AI Coach =====
let speechRecognition = null;
let isRecording = false;
let silenceTimer = null;

function toggleVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    addChatMessage("Ton navigateur ne supporte pas la reconnaissance vocale. Essaie Chrome ou Edge !", 'ai');
    return;
  }

  const micBtn = document.getElementById('ai-coach-mic');

  if (isRecording && speechRecognition) {
    clearTimeout(silenceTimer);
    speechRecognition.stop();
    return;
  }

  speechRecognition = new SpeechRecognition();
  speechRecognition.lang = 'fr-FR';
  speechRecognition.continuous = true;
  speechRecognition.interimResults = true;

  const input = document.getElementById('ai-coach-input');

  speechRecognition.onstart = () => {
    isRecording = true;
    if (micBtn) micBtn.classList.add('recording');
    if (input) {
      input.placeholder = 'Je t\'écoute... (3s de silence = envoi)';
      input.value = '';
    }
  };

  speechRecognition.onresult = (event) => {
    // Reset le timer de silence à chaque nouveau résultat
    clearTimeout(silenceTimer);

    let transcript = '';
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    if (input) input.value = transcript;

    // Lancer un timer de 3s : si pas de nouvelle parole, on envoie
    silenceTimer = setTimeout(() => {
      if (input && input.value.trim()) {
        speechRecognition.stop();
        sendToCoach();
      }
    }, 3000);
  };

  speechRecognition.onerror = (event) => {
    console.error('Speech error:', event.error);
    clearTimeout(silenceTimer);
    isRecording = false;
    if (micBtn) micBtn.classList.remove('recording');
    if (input) input.placeholder = 'Parle à ton coach...';
    if (event.error === 'not-allowed') {
      addChatMessage("Autorise le micro dans ton navigateur pour utiliser la voix !", 'ai');
    }
  };

  speechRecognition.onend = () => {
    clearTimeout(silenceTimer);
    isRecording = false;
    if (micBtn) micBtn.classList.remove('recording');
    if (input) input.placeholder = 'Parle à ton coach...';
  };

  speechRecognition.start();
}

function buildSystemPrompt(category) {
  const cat = dreamCategories[category];
  if (!cat) return '';

  const userDreams = dreamsState.dreams[category] || [];
  const dreamTexts = userDreams.map(d => `- "${d.text}"`).join('\n');
  const vision = dreamsState.vision || '';

  // Collecter tous les rêves de toutes les catégories pour le contexte global
  const allDreamsSummary = Object.entries(dreamsState.dreams)
    .filter(([, entries]) => entries.length > 0)
    .map(([catKey, entries]) => {
      const catInfo = dreamCategories[catKey];
      return `${catInfo?.emoji} ${catInfo?.title}: ${entries.map(e => e.text).join(', ')}`;
    }).join('\n');

  return `Tu es un coach de vie bienveillant mais direct, qui parle en français familier (tutoiement). Tu es comme un grand frère qui veut sincèrement que la personne réussisse. Tu poses des questions percutantes, tu challenges gentiment, et tu encourages.

CONTEXTE DE L'UTILISATEUR :
- Vision de vie : ${vision || 'Non renseignée encore'}
- Catégorie actuelle : ${cat.emoji} ${cat.title}
${dreamTexts ? `- Ses rêves dans cette catégorie :\n${dreamTexts}` : '- Pas encore de rêves notés dans cette catégorie.'}
${allDreamsSummary ? `\nTous ses rêves :\n${allDreamsSummary}` : ''}

RÈGLES :
- Réponds en 2-4 phrases max, sois concis et percutant
- Pose UNE question de suivi pour creuser plus profond
- Fais référence aux rêves de l'utilisateur quand c'est pertinent
- Sois encourageant mais pas dans le bullshit : challenge ses croyances limitantes
- Utilise le "tu", sois direct comme un vrai coach
- Si l'utilisateur partage un rêve vague, aide-le à le rendre concret et mesurable
- N'utilise pas de bullet points, parle naturellement`;
}

function resetCoachChat(category) {
  dreamsState.chatHistory = [];
  const chatContainer = document.getElementById('ai-coach-chat');
  if (!chatContainer) return;

  const cat = dreamCategories[category];
  const userDreams = dreamsState.dreams[category] || [];

  let welcomeMsg = '';
  if (userDreams.length > 0) {
    const lastDream = userDreams[userDreams.length - 1];
    welcomeMsg = `Salut ! Je vois que tu bosses sur "${cat?.title}" ${cat?.emoji}. Tu m'as parlé de "${lastDream.text.slice(0, 60)}${lastDream.text.length > 60 ? '...' : ''}". On creuse ça ensemble ? Dis-moi où t'en es !`;
  } else {
    welcomeMsg = `Hey ! On va bosser sur "${cat?.title}" ${cat?.emoji} ensemble. Alors dis-moi, c'est quoi ton plus grand rêve dans ce domaine ? Sois précis, pas de "je veux être heureux" hein !`;
  }

  chatContainer.innerHTML = '';
  addChatMessage(welcomeMsg, 'ai');
  updateCoachStatus('Prêt');
}

function addChatMessage(text, sender) {
  const chatContainer = document.getElementById('ai-coach-chat');
  if (!chatContainer) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = sender === 'ai' ? 'ai-message' : 'user-message';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'ai-message-content';
  contentDiv.textContent = text;

  msgDiv.appendChild(contentDiv);
  chatContainer.appendChild(msgDiv);

  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function updateCoachStatus(status) {
  const statusEl = document.getElementById('ai-coach-status');
  if (statusEl) statusEl.textContent = status;
}

async function sendToCoach() {
  const input = document.getElementById('ai-coach-input');
  if (!input) return;

  const message = input.value.trim();
  if (!message || dreamsState.chatLoading) return;

  const category = dreamsState.currentCategory;
  if (!category) return;

  // Afficher le message de l'utilisateur
  addChatMessage(message, 'user');
  input.value = '';

  // Ajouter à l'historique
  dreamsState.chatHistory.push({ role: 'user', content: message });

  // Loading state
  dreamsState.chatLoading = true;
  updateCoachStatus('Réfléchit...');
  const sendBtn = document.getElementById('ai-coach-send');
  if (sendBtn) sendBtn.disabled = true;

  // Indicateur de typing
  const typingDiv = document.createElement('div');
  typingDiv.className = 'ai-message typing-indicator';
  typingDiv.innerHTML = '<div class="ai-message-content"><span class="typing-dots">●●●</span></div>';
  const chatContainer = document.getElementById('ai-coach-chat');
  if (chatContainer) {
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  try {
    // Construire les messages pour l'API
    const systemPrompt = buildSystemPrompt(category);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...dreamsState.chatHistory.slice(-10) // Garder les 10 derniers messages pour le contexte
    ];

    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });

    // Retirer le typing indicator
    if (typingDiv.parentNode) typingDiv.remove();

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}`);
    }

    const data = await response.json();
    const reply = data.reply || "Hmm, j'ai pas pu répondre. Réessaie !";

    // Ajouter la réponse à l'historique et l'afficher
    dreamsState.chatHistory.push({ role: 'assistant', content: reply });
    addChatMessage(reply, 'ai');
    updateCoachStatus('Prêt');

  } catch (err) {
    // Retirer le typing indicator
    if (typingDiv.parentNode) typingDiv.remove();

    console.error('Coach AI error:', err);
    addChatMessage("Oups, problème de connexion. Vérifie ta connexion internet et réessaie !", 'ai');
    updateCoachStatus('Erreur - Réessaie');
  } finally {
    dreamsState.chatLoading = false;
    if (sendBtn) sendBtn.disabled = false;
    const inputEl = document.getElementById('ai-coach-input');
    if (inputEl) inputEl.focus();
  }
}

// ===== Journal Mental =====
const journalPrompts = [
  "Qu'est-ce qui t'a rendu fier aujourd'hui ?",
  "De quoi as-tu peur en ce moment ? Pourquoi ?",
  "Quelle croyance limitante aimerais-tu lâcher ?",
  "Si tu pouvais parler à toi-même d'il y a 5 ans, que dirais-tu ?",
  "Qu'est-ce qui te met en colère et que ça dit de tes valeurs ?",
  "Quel pattern répètes-tu sans t'en rendre compte ?",
  "Décris ta journée idéale dans 1 an.",
  "Qu'est-ce que tu tolères que tu ne devrais plus accepter ?",
  "Quel conseil donnerais-tu à quelqu'un dans ta situation ?",
  "Quelle émotion essaies-tu d'éviter ces derniers temps ?",
  "Qu'est-ce qui te donne de l'énergie ? Qu'est-ce qui t'en prend ?",
  "Si l'argent n'existait pas, que ferais-tu de ta vie ?",
  "Quelle relation dans ta vie a besoin d'attention ?",
  "Qu'est-ce que tu n'oses pas demander ?",
  "Quel serait le plus gros risque que tu pourrais prendre maintenant ?"
];

const relationshipPrompts = [
  "Est-ce que tu retrouves un schéma similaire dans plusieurs de tes relations ? Lequel ?",
  "Quand tu te sens blessé(e) dans une relation, quelle est ta réaction automatique ?",
  "Qu'est-ce que tu attends des autres que tu ne te donnes pas à toi-même ?",
  "Quel type de personne attires-tu ? Qu'est-ce que ça dit de toi ?",
  "Quelle blessure d'enfance se rejoue dans tes relations actuelles ?",
  "Quand est-ce que tu te perds dans l'autre ? Qu'est-ce que tu abandonnes de toi ?",
  "De quoi as-tu peur dans l'intimité ?",
  "Comment réagis-tu quand quelqu'un s'éloigne ? Et quand il se rapproche trop ?"
];

const journalState = {
  entries: [],
  currentEntry: null
};

function initJournal() {
  loadJournalData();
  setupJournalUI();
  displayJournalPrompt();
  displayRelationshipPrompt();
  drawMoodTrends();
  loadTodayEntry();
}

function loadJournalData() {
  const saved = localStorage.getItem('breathflow_journal');
  if (saved) {
    journalState.entries = JSON.parse(saved);
  }
}

function saveJournalData() {
  localStorage.setItem('breathflow_journal', JSON.stringify(journalState.entries));
}

function setupJournalUI() {
  // Mood buttons
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const label = document.getElementById('mood-label');
      if (label) label.textContent = btn.dataset.label;
    });
  });

  // Sliders
  const energySlider = document.getElementById('energy-slider');
  const stressSlider = document.getElementById('stress-slider');
  if (energySlider) {
    energySlider.addEventListener('input', () => {
      document.getElementById('energy-value').textContent = energySlider.value;
    });
  }
  if (stressSlider) {
    stressSlider.addEventListener('input', () => {
      document.getElementById('stress-value').textContent = stressSlider.value;
    });
  }

  // Prompt refresh
  const refreshPrompt = document.getElementById('refresh-prompt');
  if (refreshPrompt) {
    refreshPrompt.addEventListener('click', displayJournalPrompt);
  }

  // Pattern tabs
  document.querySelectorAll('.pattern-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.pattern-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.pattern-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById('tab-' + tab.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // Tag buttons
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
    });
  });

  // Save journal
  const saveBtn = document.getElementById('save-journal');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveJournalEntry);
  }
}

function displayJournalPrompt() {
  const el = document.getElementById('journal-prompt');
  if (el) {
    el.textContent = journalPrompts[Math.floor(Math.random() * journalPrompts.length)];
  }
}

function displayRelationshipPrompt() {
  const el = document.getElementById('rel-prompt-text');
  if (el) {
    el.textContent = relationshipPrompts[Math.floor(Math.random() * relationshipPrompts.length)];
  }
}

function loadTodayEntry() {
  const today = new Date().toDateString();
  const entry = journalState.entries.find(e => e.date === today);
  if (!entry) return;

  // Restaurer les valeurs
  const moodBtn = document.querySelector(`.mood-btn[data-mood="${entry.mood}"]`);
  if (moodBtn) {
    moodBtn.click();
  }

  const energySlider = document.getElementById('energy-slider');
  if (energySlider && entry.energy) {
    energySlider.value = entry.energy;
    document.getElementById('energy-value').textContent = entry.energy;
  }

  const stressSlider = document.getElementById('stress-slider');
  if (stressSlider && entry.stress) {
    stressSlider.value = entry.stress;
    document.getElementById('stress-value').textContent = entry.stress;
  }

  const intention = document.getElementById('journal-intention-input');
  if (intention && entry.intention) intention.value = entry.intention;

  const text = document.getElementById('journal-text');
  if (text && entry.text) text.value = entry.text;

  const triggerDetail = document.getElementById('trigger-detail');
  if (triggerDetail && entry.triggerDetail) triggerDetail.value = entry.triggerDetail;

  const relDetail = document.getElementById('relationship-detail');
  if (relDetail && entry.relationshipDetail) relDetail.value = entry.relationshipDetail;

  const beliefLimiting = document.getElementById('belief-limiting');
  if (beliefLimiting && entry.beliefLimiting) beliefLimiting.value = entry.beliefLimiting;
  const beliefEvidence = document.getElementById('belief-evidence');
  if (beliefEvidence && entry.beliefEvidence) beliefEvidence.value = entry.beliefEvidence;
  const beliefNew = document.getElementById('belief-new');
  if (beliefNew && entry.beliefNew) beliefNew.value = entry.beliefNew;

  const reviewWins = document.getElementById('review-wins');
  if (reviewWins && entry.wins) reviewWins.value = entry.wins;
  const reviewImprove = document.getElementById('review-improve');
  if (reviewImprove && entry.improve) reviewImprove.value = entry.improve;

  // Restaurer les tags actifs
  if (entry.triggerTags) {
    entry.triggerTags.forEach(tag => {
      const btn = document.querySelector(`#tab-triggers .tag-btn[data-tag="${tag}"]`);
      if (btn) btn.classList.add('active');
    });
  }
  if (entry.relTags) {
    entry.relTags.forEach(tag => {
      const btn = document.querySelector(`#tab-relationships .tag-btn[data-tag="${tag}"]`);
      if (btn) btn.classList.add('active');
    });
  }
}

function saveJournalEntry() {
  const today = new Date().toDateString();
  const moodBtn = document.querySelector('.mood-btn.active');

  const entry = {
    date: today,
    timestamp: Date.now(),
    mood: moodBtn ? parseInt(moodBtn.dataset.mood) : 3,
    energy: parseInt(document.getElementById('energy-slider')?.value || 5),
    stress: parseInt(document.getElementById('stress-slider')?.value || 5),
    intention: document.getElementById('journal-intention-input')?.value || '',
    text: document.getElementById('journal-text')?.value || '',
    triggerDetail: document.getElementById('trigger-detail')?.value || '',
    triggerTags: Array.from(document.querySelectorAll('#tab-triggers .tag-btn.active')).map(b => b.dataset.tag),
    relationshipDetail: document.getElementById('relationship-detail')?.value || '',
    relTags: Array.from(document.querySelectorAll('#tab-relationships .tag-btn.active')).map(b => b.dataset.tag),
    beliefLimiting: document.getElementById('belief-limiting')?.value || '',
    beliefEvidence: document.getElementById('belief-evidence')?.value || '',
    beliefNew: document.getElementById('belief-new')?.value || '',
    wins: document.getElementById('review-wins')?.value || '',
    improve: document.getElementById('review-improve')?.value || ''
  };

  // Remplacer ou ajouter l'entrée du jour
  const idx = journalState.entries.findIndex(e => e.date === today);
  if (idx >= 0) {
    journalState.entries[idx] = entry;
  } else {
    journalState.entries.unshift(entry);
  }

  // Limiter à 90 jours
  if (journalState.entries.length > 90) {
    journalState.entries = journalState.entries.slice(0, 90);
  }

  saveJournalData();
  drawMoodTrends();
  updateHolisticScore();

  // Feedback visuel
  const btn = document.getElementById('save-journal');
  if (btn) {
    btn.textContent = 'Sauvegardé !';
    btn.style.background = 'var(--neon-green)';
    setTimeout(() => {
      btn.textContent = 'Sauvegarder le journal';
      btn.style.background = '';
    }, 2000);
  }
}

function drawMoodTrends() {
  const canvas = document.getElementById('mood-trend-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const last7 = journalState.entries
    .filter(e => {
      const diff = (Date.now() - e.timestamp) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    })
    .reverse()
    .slice(-7);

  // Effacer
  ctx.fillStyle = 'rgba(10, 10, 15, 0.95)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (last7.length < 2) {
    ctx.fillStyle = 'rgba(160, 160, 176, 0.5)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Minimum 2 jours de données', canvas.width / 2, canvas.height / 2);
    return;
  }

  // Grille
  ctx.strokeStyle = 'rgba(100, 100, 150, 0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = 10 + (canvas.height - 20) / 4 * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  const drawLine = (data, color, max) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();

    const stepX = canvas.width / (last7.length - 1);
    data.forEach((val, i) => {
      const x = i * stepX;
      const y = canvas.height - 10 - ((val / max) * (canvas.height - 20));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  drawLine(last7.map(e => e.mood), '#f59e0b', 5);
  drawLine(last7.map(e => e.energy), '#10b981', 10);
  drawLine(last7.map(e => e.stress), '#ef4444', 10);
}

// ===== Business Tracker =====
const businessState = {
  goals: [],
  revenues: [],
  tasks: [],
  clients: []
};

function initBusiness() {
  loadBusinessData();
  renderBusinessGoals();
  renderBusinessRevenues();
  renderBusinessTasks();
  renderBusinessClients();
  updateBusinessKPIs();
  setupBusinessUI();
}

function loadBusinessData() {
  const saved = localStorage.getItem('breathflow_business');
  if (saved) {
    const data = JSON.parse(saved);
    businessState.goals = data.goals || [];
    businessState.revenues = data.revenues || [];
    businessState.tasks = data.tasks || [];
    businessState.clients = data.clients || [];
  }
}

function saveBusinessData() {
  localStorage.setItem('breathflow_business', JSON.stringify(businessState));
}

function setupBusinessUI() {
  // Goals
  const addGoalBtn = document.getElementById('add-goal-btn');
  const closeGoalModal = document.getElementById('close-goal-modal');
  const saveGoalBtn = document.getElementById('save-goal-btn');

  if (addGoalBtn) addGoalBtn.addEventListener('click', () => {
    document.getElementById('goal-modal').classList.remove('hidden');
  });
  if (closeGoalModal) closeGoalModal.addEventListener('click', () => {
    document.getElementById('goal-modal').classList.add('hidden');
  });
  if (saveGoalBtn) saveGoalBtn.addEventListener('click', () => {
    const title = document.getElementById('goal-title-input').value.trim();
    const target = parseFloat(document.getElementById('goal-target-input').value) || 0;
    const type = document.getElementById('goal-type-input').value;
    const period = document.getElementById('goal-period-input').value;

    if (!title) return;

    businessState.goals.push({
      id: Date.now(),
      title, target, type, period,
      current: 0,
      createdAt: new Date().toISOString()
    });

    saveBusinessData();
    renderBusinessGoals();
    document.getElementById('goal-modal').classList.add('hidden');
    document.getElementById('goal-title-input').value = '';
    document.getElementById('goal-target-input').value = '';
  });

  // Revenues
  const addRevBtn = document.getElementById('add-revenue-btn');
  const closeRevModal = document.getElementById('close-revenue-modal');
  const saveRevBtn = document.getElementById('save-revenue-btn');

  if (addRevBtn) addRevBtn.addEventListener('click', () => {
    document.getElementById('revenue-date-input').value = new Date().toISOString().split('T')[0];
    document.getElementById('revenue-modal').classList.remove('hidden');
  });
  if (closeRevModal) closeRevModal.addEventListener('click', () => {
    document.getElementById('revenue-modal').classList.add('hidden');
  });
  if (saveRevBtn) saveRevBtn.addEventListener('click', () => {
    const desc = document.getElementById('revenue-desc-input').value.trim();
    const amount = parseFloat(document.getElementById('revenue-amount-input').value) || 0;
    const date = document.getElementById('revenue-date-input').value;
    const category = document.getElementById('revenue-category-input').value;

    if (!desc || !amount) return;

    businessState.revenues.push({ id: Date.now(), desc, amount, date, category });

    // Mettre à jour les objectifs de type revenue
    businessState.goals.forEach(g => {
      if (g.type === 'revenue') g.current += amount;
    });

    saveBusinessData();
    renderBusinessRevenues();
    renderBusinessGoals();
    updateBusinessKPIs();
    document.getElementById('revenue-modal').classList.add('hidden');
    document.getElementById('revenue-desc-input').value = '';
    document.getElementById('revenue-amount-input').value = '';
  });

  // Tasks
  const addTaskBtn = document.getElementById('add-biz-task-btn');
  if (addTaskBtn) addTaskBtn.addEventListener('click', addBusinessTask);

  const taskInput = document.getElementById('biz-task-input');
  if (taskInput) taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addBusinessTask();
  });

  // Clients
  const addClientBtn = document.getElementById('add-client-btn');
  const closeClientModal = document.getElementById('close-client-modal');
  const saveClientBtn = document.getElementById('save-client-btn');

  if (addClientBtn) addClientBtn.addEventListener('click', () => {
    document.getElementById('client-modal').classList.remove('hidden');
  });
  if (closeClientModal) closeClientModal.addEventListener('click', () => {
    document.getElementById('client-modal').classList.add('hidden');
  });
  if (saveClientBtn) saveClientBtn.addEventListener('click', () => {
    const name = document.getElementById('client-name-input').value.trim();
    const contact = document.getElementById('client-contact-input').value.trim();
    const value = parseFloat(document.getElementById('client-value-input').value) || 0;
    const status = document.getElementById('client-status-input').value;
    const notes = document.getElementById('client-notes-input').value;

    if (!name) return;

    businessState.clients.push({ id: Date.now(), name, contact, value, status, notes });

    // Mettre à jour les objectifs de type clients
    if (status === 'won') {
      businessState.goals.forEach(g => {
        if (g.type === 'clients') g.current += 1;
      });
    }

    saveBusinessData();
    renderBusinessClients();
    renderBusinessGoals();
    updateBusinessKPIs();
    document.getElementById('client-modal').classList.add('hidden');
    document.getElementById('client-name-input').value = '';
    document.getElementById('client-contact-input').value = '';
    document.getElementById('client-value-input').value = '';
    document.getElementById('client-notes-input').value = '';
  });
}

function addBusinessTask() {
  const input = document.getElementById('biz-task-input');
  const priority = document.getElementById('biz-task-priority').value;
  const text = input.value.trim();

  if (!text) return;

  businessState.tasks.push({
    id: Date.now(),
    text,
    priority,
    done: false,
    createdAt: new Date().toISOString()
  });

  saveBusinessData();
  renderBusinessTasks();
  updateBusinessKPIs();
  input.value = '';
}

function renderBusinessGoals() {
  const container = document.getElementById('goals-list');
  if (!container) return;

  if (businessState.goals.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;">Aucun objectif. Ajoute ton premier !</p>';
    return;
  }

  const periodLabels = { week: 'Semaine', month: 'Mois', quarter: 'Trimestre' };

  container.innerHTML = businessState.goals.map(goal => {
    const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
    return `
      <div class="goal-card">
        <div class="goal-card-header">
          <span class="goal-title">${goal.title}</span>
          <span class="goal-period">${periodLabels[goal.period] || goal.period}</span>
        </div>
        <div class="goal-progress-bar">
          <div class="goal-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="goal-progress-text">${goal.current} / ${goal.target} (${pct}%)</div>
      </div>
    `;
  }).join('');
}

function renderBusinessRevenues() {
  const container = document.getElementById('revenue-list');
  if (!container) return;

  const recent = businessState.revenues.slice(-10).reverse();

  if (recent.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;">Aucun revenu enregistré.</p>';
  } else {
    container.innerHTML = recent.map(r => `
      <div class="revenue-item">
        <div class="revenue-item-info">
          <span class="revenue-item-desc">${r.desc}</span>
          <span class="revenue-item-date">${r.date}</span>
        </div>
        <span class="revenue-item-amount">+${r.amount.toLocaleString('fr-FR')} &euro;</span>
      </div>
    `).join('');
  }

  drawRevenueChart();
}

function drawRevenueChart() {
  const canvas = document.getElementById('revenue-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(10, 10, 15, 0.95)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Agréger par mois les 6 derniers mois
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('fr-FR', { month: 'short' });
    const total = businessState.revenues
      .filter(r => r.date && r.date.startsWith(key))
      .reduce((sum, r) => sum + r.amount, 0);
    months.push({ label, total });
  }

  const maxTotal = Math.max(...months.map(m => m.total), 1);
  const barWidth = (canvas.width - 40) / months.length;

  months.forEach((m, i) => {
    const x = 20 + i * barWidth + barWidth * 0.15;
    const w = barWidth * 0.7;
    const h = (m.total / maxTotal) * (canvas.height - 40);
    const y = canvas.height - 20 - h;

    // Barre
    const gradient = ctx.createLinearGradient(x, y, x, canvas.height - 20);
    gradient.addColorStop(0, '#10b981');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.2)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);

    // Label
    ctx.fillStyle = 'rgba(160, 160, 176, 0.7)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.label, x + w / 2, canvas.height - 5);

    // Montant
    if (m.total > 0) {
      ctx.fillStyle = '#10b981';
      ctx.fillText(m.total.toLocaleString('fr-FR') + ' \u20AC', x + w / 2, y - 5);
    }
  });
}

function renderBusinessTasks() {
  const container = document.getElementById('biz-tasks-list');
  if (!container) return;

  // Trier : non-faites d'abord, puis par priorité
  const sorted = [...businessState.tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
  });

  container.innerHTML = sorted.map(task => `
    <div class="biz-task-item ${task.done ? 'done' : ''}" data-task-id="${task.id}">
      <div class="biz-task-check" onclick="toggleBusinessTask(${task.id})"></div>
      <span class="biz-task-text">${task.text}</span>
      <span class="biz-task-priority ${task.priority}">${task.priority === 'high' ? 'Urgent' : task.priority === 'medium' ? 'Normal' : 'Plus tard'}</span>
      <button class="biz-task-delete" onclick="deleteBusinessTask(${task.id})">×</button>
    </div>
  `).join('');
}

function toggleBusinessTask(id) {
  const task = businessState.tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    saveBusinessData();
    renderBusinessTasks();
    updateBusinessKPIs();
  }
}

function deleteBusinessTask(id) {
  businessState.tasks = businessState.tasks.filter(t => t.id !== id);
  saveBusinessData();
  renderBusinessTasks();
  updateBusinessKPIs();
}

function renderBusinessClients() {
  const container = document.getElementById('clients-pipeline');
  if (!container) return;

  if (businessState.clients.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;">Aucun client. Ajoute ton premier prospect !</p>';
    return;
  }

  const statusOrder = { prospect: 0, contacted: 1, negotiation: 2, won: 3, lost: 4 };
  const sorted = [...businessState.clients].sort((a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0));

  const statusLabels = {
    prospect: 'Prospect', contacted: 'Contacté',
    negotiation: 'Négo', won: 'Gagné', lost: 'Perdu'
  };

  container.innerHTML = sorted.map(c => {
    const initials = c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    return `
      <div class="client-card">
        <div class="client-avatar">${initials}</div>
        <div class="client-info">
          <span class="client-name">${c.name}</span>
          <span class="client-contact">${c.contact || ''}</span>
        </div>
        ${c.value ? `<span class="client-value">${c.value.toLocaleString('fr-FR')} \u20AC</span>` : ''}
        <span class="client-status-badge ${c.status}">${statusLabels[c.status] || c.status}</span>
      </div>
    `;
  }).join('');
}

function updateBusinessKPIs() {
  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);

  // Revenus du mois
  const monthRevenue = businessState.revenues
    .filter(r => r.date && r.date.startsWith(monthKey))
    .reduce((sum, r) => sum + r.amount, 0);

  const revenueEl = document.getElementById('biz-revenue');
  if (revenueEl) revenueEl.innerHTML = monthRevenue.toLocaleString('fr-FR') + ' &euro;';

  // Clients gagnés ce mois
  const newClients = businessState.clients.filter(c => c.status === 'won').length;
  const clientsEl = document.getElementById('biz-clients');
  if (clientsEl) clientsEl.textContent = newClients;

  // Tâches complétées
  const tasksDone = businessState.tasks.filter(t => t.done).length;
  const tasksEl = document.getElementById('biz-tasks-done');
  if (tasksEl) tasksEl.textContent = tasksDone;
}

// ===== Biofeedback Cardiaque (PPG) =====
const biofeedbackState = {
  isRunning: false,
  stream: null,
  video: null,
  canvas: null,
  ctx: null,
  graphCanvas: null,
  graphCtx: null,
  animationId: null,

  // Données de signal
  signalBuffer: [],
  maxBufferSize: 300, // ~10 secondes à 30fps
  graphData: [],
  maxGraphPoints: 150,

  // Données cardiaques
  peaks: [],
  bpmHistory: [],
  hrvHistory: [],
  lastPeakTime: 0,
  rrIntervals: [], // Intervalles R-R pour HRV

  // Métriques calculées
  currentBpm: 0,
  currentHrv: 0,
  currentCoherence: 0,

  // Session
  sessionStart: null,
  breathingEnabled: false,
  breathingPhase: 'inhale',
  breathingTimer: null
};

function initBiofeedback() {
  const startBtn = document.getElementById('start-biofeedback');
  const stopBtn = document.getElementById('stop-biofeedback');
  const newSessionBtn = document.getElementById('bio-new-session');
  const breathingSync = document.getElementById('bio-breathing-sync');

  if (startBtn) {
    startBtn.addEventListener('click', startBiofeedback);
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', stopBiofeedback);
  }

  if (newSessionBtn) {
    newSessionBtn.addEventListener('click', () => {
      document.getElementById('bio-summary').classList.add('hidden');
      document.getElementById('bio-session').classList.remove('hidden');
      startBiofeedback();
    });
  }

  if (breathingSync) {
    breathingSync.addEventListener('change', (e) => {
      biofeedbackState.breathingEnabled = e.target.checked;
      const circle = document.getElementById('bio-breathing-circle');
      if (e.target.checked) {
        circle.classList.remove('hidden');
        startBioBreathing();
      } else {
        circle.classList.add('hidden');
        stopBioBreathing();
      }
    });
  }
}

async function startBiofeedback() {
  try {
    // Demander accès caméra (préférer arrière avec flash)
    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    };

    biofeedbackState.stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Configurer la vidéo
    biofeedbackState.video = document.getElementById('bio-video');
    biofeedbackState.video.srcObject = biofeedbackState.stream;

    // Configurer le canvas pour l'analyse
    biofeedbackState.canvas = document.getElementById('bio-canvas');
    biofeedbackState.canvas.width = 100;
    biofeedbackState.canvas.height = 100;
    biofeedbackState.ctx = biofeedbackState.canvas.getContext('2d', { willReadFrequently: true });

    // Configurer le graphique
    biofeedbackState.graphCanvas = document.getElementById('bio-graph');
    biofeedbackState.graphCtx = biofeedbackState.graphCanvas.getContext('2d');

    // Réinitialiser les données
    resetBiofeedbackData();

    // Afficher la session
    document.getElementById('bio-instructions').classList.add('hidden');
    document.getElementById('bio-session').classList.remove('hidden');
    document.getElementById('bio-summary').classList.add('hidden');

    biofeedbackState.isRunning = true;
    biofeedbackState.sessionStart = Date.now();

    // Activer le flash si possible
    try {
      const track = biofeedbackState.stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      if (capabilities.torch) {
        await track.applyConstraints({ advanced: [{ torch: true }] });
      }
    } catch (e) {
      console.log('Flash non disponible');
    }

    // Démarrer l'analyse
    analyzePPG();

  } catch (err) {
    console.error('Erreur accès caméra:', err);
    alert('Impossible d\'accéder à la caméra. Vérifie les permissions.');
  }
}

function stopBiofeedback() {
  biofeedbackState.isRunning = false;

  // Arrêter l'animation
  if (biofeedbackState.animationId) {
    cancelAnimationFrame(biofeedbackState.animationId);
  }

  // Arrêter le flux caméra
  if (biofeedbackState.stream) {
    biofeedbackState.stream.getTracks().forEach(track => track.stop());
    biofeedbackState.stream = null;
  }

  // Arrêter la respiration guidée
  stopBioBreathing();

  // Calculer et afficher le résumé
  showBiofeedbackSummary();
}

function resetBiofeedbackData() {
  biofeedbackState.signalBuffer = [];
  biofeedbackState.graphData = [];
  biofeedbackState.peaks = [];
  biofeedbackState.bpmHistory = [];
  biofeedbackState.hrvHistory = [];
  biofeedbackState.lastPeakTime = 0;
  biofeedbackState.rrIntervals = [];
  biofeedbackState.currentBpm = 0;
  biofeedbackState.currentHrv = 0;
  biofeedbackState.currentCoherence = 0;
}

function analyzePPG() {
  if (!biofeedbackState.isRunning) return;

  const video = biofeedbackState.video;
  const ctx = biofeedbackState.ctx;
  const canvas = biofeedbackState.canvas;

  // Dessiner la frame vidéo sur le canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Extraire les pixels du centre (zone du doigt)
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const sampleSize = 30;
  const imageData = ctx.getImageData(
    centerX - sampleSize / 2,
    centerY - sampleSize / 2,
    sampleSize,
    sampleSize
  );

  // Calculer la moyenne du canal rouge (signal PPG)
  let redSum = 0;
  let pixelCount = 0;
  for (let i = 0; i < imageData.data.length; i += 4) {
    redSum += imageData.data[i]; // Canal rouge
    pixelCount++;
  }
  const redAvg = redSum / pixelCount;

  // Ajouter au buffer de signal
  const now = Date.now();
  biofeedbackState.signalBuffer.push({ value: redAvg, time: now });

  // Limiter la taille du buffer
  if (biofeedbackState.signalBuffer.length > biofeedbackState.maxBufferSize) {
    biofeedbackState.signalBuffer.shift();
  }

  // Ajouter aux données du graphique
  biofeedbackState.graphData.push(redAvg);
  if (biofeedbackState.graphData.length > biofeedbackState.maxGraphPoints) {
    biofeedbackState.graphData.shift();
  }

  // Détecter les pics et calculer les métriques si assez de données
  if (biofeedbackState.signalBuffer.length > 60) {
    detectPeaks();
    calculateMetrics();
    updateBiofeedbackUI();
  }

  // Dessiner le graphique
  drawPPGGraph();

  // Continuer l'analyse
  biofeedbackState.animationId = requestAnimationFrame(analyzePPG);
}

function detectPeaks() {
  const buffer = biofeedbackState.signalBuffer;
  const len = buffer.length;

  if (len < 30) return;

  // Calculer la moyenne et l'écart-type du signal
  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += buffer[i].value;
  }
  const mean = sum / len;

  let varianceSum = 0;
  for (let i = 0; i < len; i++) {
    varianceSum += Math.pow(buffer[i].value - mean, 2);
  }
  const stdDev = Math.sqrt(varianceSum / len);

  // Seuil adaptatif pour détecter les pics
  const threshold = mean + stdDev * 0.5;

  // Chercher les pics dans les données récentes
  const recentStart = Math.max(0, len - 30);
  for (let i = recentStart + 2; i < len - 2; i++) {
    const prev2 = buffer[i - 2].value;
    const prev1 = buffer[i - 1].value;
    const curr = buffer[i].value;
    const next1 = buffer[i + 1].value;
    const next2 = buffer[i + 2].value;

    // Vérifier si c'est un pic local au-dessus du seuil
    if (curr > threshold &&
        curr > prev1 && curr > prev2 &&
        curr > next1 && curr > next2) {

      const peakTime = buffer[i].time;

      // Éviter les doublons (minimum 300ms entre pics = max 200 BPM)
      if (peakTime - biofeedbackState.lastPeakTime > 300) {
        // Calculer l'intervalle R-R
        if (biofeedbackState.lastPeakTime > 0) {
          const rrInterval = peakTime - biofeedbackState.lastPeakTime;

          // Valider l'intervalle (entre 300ms et 1500ms = 40-200 BPM)
          if (rrInterval > 300 && rrInterval < 1500) {
            biofeedbackState.rrIntervals.push(rrInterval);

            // Garder seulement les 20 derniers intervalles
            if (biofeedbackState.rrIntervals.length > 20) {
              biofeedbackState.rrIntervals.shift();
            }
          }
        }

        biofeedbackState.lastPeakTime = peakTime;
        biofeedbackState.peaks.push(peakTime);

        // Garder seulement les 30 derniers pics
        if (biofeedbackState.peaks.length > 30) {
          biofeedbackState.peaks.shift();
        }
      }
    }
  }
}

function calculateMetrics() {
  const rrIntervals = biofeedbackState.rrIntervals;

  if (rrIntervals.length < 3) return;

  // Calculer le BPM moyen
  const avgRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
  const bpm = Math.round(60000 / avgRR);

  // Valider le BPM (40-200 acceptable)
  if (bpm >= 40 && bpm <= 200) {
    biofeedbackState.currentBpm = bpm;
    biofeedbackState.bpmHistory.push(bpm);
    if (biofeedbackState.bpmHistory.length > 60) {
      biofeedbackState.bpmHistory.shift();
    }
  }

  // Calculer le HRV (RMSSD - Root Mean Square of Successive Differences)
  if (rrIntervals.length >= 5) {
    let sumSquaredDiff = 0;
    for (let i = 1; i < rrIntervals.length; i++) {
      const diff = rrIntervals[i] - rrIntervals[i - 1];
      sumSquaredDiff += diff * diff;
    }
    const rmssd = Math.sqrt(sumSquaredDiff / (rrIntervals.length - 1));
    biofeedbackState.currentHrv = Math.round(rmssd);
    biofeedbackState.hrvHistory.push(rmssd);
    if (biofeedbackState.hrvHistory.length > 30) {
      biofeedbackState.hrvHistory.shift();
    }
  }

  // Calculer la cohérence cardiaque
  // Basé sur la régularité des intervalles R-R (faible variabilité des différences)
  if (rrIntervals.length >= 8) {
    // Calculer la variation des différences successives
    const differences = [];
    for (let i = 1; i < rrIntervals.length; i++) {
      differences.push(Math.abs(rrIntervals[i] - rrIntervals[i - 1]));
    }

    const avgDiff = differences.reduce((a, b) => a + b, 0) / differences.length;

    // Score de cohérence : plus les différences sont faibles et régulières, plus la cohérence est élevée
    // Score de 0 à 100
    let coherenceScore;
    if (avgDiff < 20) {
      coherenceScore = 95 + Math.random() * 5; // Très haute cohérence
    } else if (avgDiff < 40) {
      coherenceScore = 75 + (40 - avgDiff) / 20 * 20;
    } else if (avgDiff < 80) {
      coherenceScore = 40 + (80 - avgDiff) / 40 * 35;
    } else {
      coherenceScore = Math.max(10, 40 - (avgDiff - 80) / 2);
    }

    biofeedbackState.currentCoherence = Math.round(coherenceScore);
  }
}

function updateBiofeedbackUI() {
  // Mettre à jour BPM
  const bpmEl = document.getElementById('bio-bpm');
  if (bpmEl && biofeedbackState.currentBpm > 0) {
    bpmEl.textContent = biofeedbackState.currentBpm;
  }

  // Mettre à jour HRV
  const hrvEl = document.getElementById('bio-hrv');
  if (hrvEl && biofeedbackState.currentHrv > 0) {
    hrvEl.textContent = biofeedbackState.currentHrv;
  }

  // Mettre à jour Cohérence
  const coherenceEl = document.getElementById('bio-coherence');
  if (coherenceEl && biofeedbackState.currentCoherence > 0) {
    coherenceEl.textContent = biofeedbackState.currentCoherence + '%';
  }

  // Mettre à jour l'indicateur de cohérence
  const indicator = document.getElementById('bio-coherence-indicator');
  if (indicator && biofeedbackState.currentCoherence > 0) {
    // Position de 5% (stress) à 95% (cohérence)
    const position = 5 + (biofeedbackState.currentCoherence / 100) * 90;
    indicator.style.left = position + '%';

    // Couleur selon le niveau
    if (biofeedbackState.currentCoherence > 70) {
      indicator.style.background = '#00ff88';
      indicator.style.boxShadow = '0 0 15px rgba(0, 255, 136, 0.8), 0 2px 10px rgba(0, 0, 0, 0.3)';
    } else if (biofeedbackState.currentCoherence > 40) {
      indicator.style.background = '#ffc800';
      indicator.style.boxShadow = '0 0 15px rgba(255, 200, 0, 0.8), 0 2px 10px rgba(0, 0, 0, 0.3)';
    } else {
      indicator.style.background = '#ff3366';
      indicator.style.boxShadow = '0 0 15px rgba(255, 51, 102, 0.8), 0 2px 10px rgba(0, 0, 0, 0.3)';
    }
  }

  // Mettre à jour le statut de la caméra
  const status = document.getElementById('bio-camera-status');
  if (status && biofeedbackState.currentBpm > 0) {
    status.innerHTML = '<span class="pulse-dot"></span><span>' + biofeedbackState.currentBpm + ' BPM</span>';
  }
}

function drawPPGGraph() {
  const ctx = biofeedbackState.graphCtx;
  const canvas = biofeedbackState.graphCanvas;
  const data = biofeedbackState.graphData;

  if (!ctx || data.length < 2) return;

  // Effacer le canvas
  ctx.fillStyle = 'rgba(10, 10, 15, 0.95)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Trouver min/max pour normaliser
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const range = max - min || 1;

  // Dessiner la grille
  ctx.strokeStyle = 'rgba(100, 100, 150, 0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = (canvas.height / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Dessiner le signal PPG
  ctx.strokeStyle = '#ff6b6b';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ff6b6b';
  ctx.shadowBlur = 10;
  ctx.beginPath();

  const stepX = canvas.width / (biofeedbackState.maxGraphPoints - 1);

  for (let i = 0; i < data.length; i++) {
    const x = i * stepX;
    const normalized = (data[i] - min) / range;
    const y = canvas.height - (normalized * canvas.height * 0.8 + canvas.height * 0.1);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
  ctx.shadowBlur = 0;
}

function startBioBreathing() {
  const circle = document.getElementById('bio-breathing-circle');
  const instruction = document.getElementById('bio-breath-instruction');

  if (!circle || !instruction) return;

  // Respiration cohérence cardiaque : 5s inspire, 5s expire
  let phase = 'inhale';

  const breathe = () => {
    if (!biofeedbackState.breathingEnabled) return;

    if (phase === 'inhale') {
      circle.classList.remove('exhale');
      circle.classList.add('inhale');
      instruction.textContent = 'Inspire';
      phase = 'exhale';
    } else {
      circle.classList.remove('inhale');
      circle.classList.add('exhale');
      instruction.textContent = 'Expire';
      phase = 'inhale';
    }

    biofeedbackState.breathingTimer = setTimeout(breathe, 5000);
  };

  breathe();
}

function stopBioBreathing() {
  if (biofeedbackState.breathingTimer) {
    clearTimeout(biofeedbackState.breathingTimer);
    biofeedbackState.breathingTimer = null;
  }
  biofeedbackState.breathingEnabled = false;

  const checkbox = document.getElementById('bio-breathing-sync');
  if (checkbox) checkbox.checked = false;

  const circle = document.getElementById('bio-breathing-circle');
  if (circle) circle.classList.add('hidden');
}

function showBiofeedbackSummary() {
  const duration = Math.round((Date.now() - biofeedbackState.sessionStart) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  // Calculer les moyennes
  let avgBpm = '--';
  if (biofeedbackState.bpmHistory.length > 0) {
    avgBpm = Math.round(
      biofeedbackState.bpmHistory.reduce((a, b) => a + b, 0) / biofeedbackState.bpmHistory.length
    );
  }

  let avgCoherence = '--';
  if (biofeedbackState.currentCoherence > 0) {
    avgCoherence = biofeedbackState.currentCoherence + '%';
  }

  // Afficher le résumé
  document.getElementById('summary-avg-bpm').textContent = avgBpm;
  document.getElementById('summary-avg-coherence').textContent = avgCoherence;
  document.getElementById('summary-duration').textContent =
    minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  document.getElementById('bio-session').classList.add('hidden');
  document.getElementById('bio-summary').classList.remove('hidden');

  // Sauvegarder dans l'historique si session valide
  if (biofeedbackState.bpmHistory.length > 10 && duration > 30) {
    const session = {
      type: 'biofeedback',
      date: new Date().toISOString(),
      duration: duration,
      avgBpm: avgBpm,
      avgCoherence: biofeedbackState.currentCoherence,
      avgHrv: biofeedbackState.currentHrv
    };

    if (!state.history) state.history = [];
    state.history.unshift(session);
    saveData();
  }
}

// ===== Streaks & Heatmap =====
function updateStreaksHeatmap() {
  // Calculer le streak global
  const today = new Date().toISOString().split('T')[0];
  let streak = 0;
  let bestStreak = dashboardState.globalStreak || 0;
  let checkDate = new Date();

  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const dayHabits = dashboardState.habits[dateStr];
    if (dayHabits) {
      const completed = Object.values(dayHabits).filter(v => v).length;
      if (completed >= 3) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // Aujourd'hui pas encore complet, checker hier
        checkDate.setDate(checkDate.getDate() - 1);
        streak = 0;
      } else {
        break;
      }
    } else if (i === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  if (streak > bestStreak) bestStreak = streak;

  const streakEl = document.getElementById('streak-current');
  const bestEl = document.getElementById('streak-best');
  const flameEl = document.getElementById('streak-flame-icon');
  if (streakEl) streakEl.textContent = streak;
  if (bestEl) bestEl.textContent = bestStreak;
  if (flameEl) flameEl.style.animationDuration = streak > 7 ? '0.8s' : '1.5s';

  // Générer le heatmap (13 semaines = ~3 mois)
  const grid = document.getElementById('heatmap-grid');
  const monthsEl = document.getElementById('heatmap-months');
  if (!grid) return;

  grid.innerHTML = '';
  const weeks = 13;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7 - 1) - startDate.getDay());

  const months = [];
  let lastMonth = -1;

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + w * 7 + d);
      const dateStr = cellDate.toISOString().split('T')[0];
      const dayHabits = dashboardState.habits[dateStr];
      const completed = dayHabits ? Object.values(dayHabits).filter(v => v).length : 0;
      const total = habitsList.length;
      const level = completed === 0 ? 0 : Math.min(5, Math.ceil(completed / total * 5));

      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.dataset.level = level;
      cell.title = `${cellDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}: ${completed}/${total} habitudes`;
      grid.appendChild(cell);

      // Track months
      const m = cellDate.getMonth();
      if (d === 0 && m !== lastMonth) {
        months.push({ name: cellDate.toLocaleDateString('fr-FR', { month: 'short' }), week: w });
        lastMonth = m;
      }
    }
  }

  if (monthsEl) {
    monthsEl.innerHTML = '';
    months.forEach((m, i) => {
      const span = document.createElement('span');
      span.textContent = m.name;
      span.style.marginLeft = i === 0 ? '0' : `${(m.week - (months[i-1]?.week || 0)) * 14 - 20}px`;
      monthsEl.appendChild(span);
    });
  }
}

// ===== Routines =====
const routineModules = [
  { id: 'breathing', name: 'Respiration', icon: '🌬️', page: 'breathing' },
  { id: 'meditation', name: 'Méditation', icon: '🧘', page: 'meditation' },
  { id: 'coldshower', name: 'Douche froide', icon: '🚿', page: 'coldshower' },
  { id: 'journal', name: 'Journal Mental', icon: '📝', page: 'journal' },
  { id: 'calisthenics', name: 'Calisthénie', icon: '💪', page: 'calisthenics' },
  { id: 'focus', name: 'Session Focus', icon: '🎯', page: 'focus' },
  { id: 'dreams', name: 'Mes Rêves', icon: '✦', page: 'dreams' },
  { id: 'poetry', name: 'Poésie', icon: '📖', page: 'poetry' }
];

const routinesState = {
  morning: { modules: ['breathing', 'meditation', 'journal'] },
  evening: { modules: ['journal', 'meditation'] },
  currentTab: 'morning',
  activeRoutine: null,
  currentStep: 0
};

function initRoutines() {
  const saved = localStorage.getItem('breathflow_routines');
  if (saved) {
    const data = JSON.parse(saved);
    routinesState.morning = data.morning || routinesState.morning;
    routinesState.evening = data.evening || routinesState.evening;
  }

  // Tabs
  document.querySelectorAll('.routine-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.routine-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      routinesState.currentTab = tab.dataset.routine;
      renderRoutineModules();
    });
  });

  // Launch
  const launchBtn = document.getElementById('launch-routine');
  if (launchBtn) launchBtn.addEventListener('click', launchRoutine);

  const nextBtn = document.getElementById('routine-next-step');
  if (nextBtn) nextBtn.addEventListener('click', routineNextStep);

  const stopBtn = document.getElementById('routine-stop');
  if (stopBtn) stopBtn.addEventListener('click', stopRoutine);

  renderRoutineModules();
}

function saveRoutines() {
  localStorage.setItem('breathflow_routines', JSON.stringify({
    morning: routinesState.morning,
    evening: routinesState.evening
  }));
}

function renderRoutineModules() {
  const container = document.getElementById('routine-modules');
  if (!container) return;

  const tab = routinesState.currentTab;
  const selected = routinesState[tab].modules;

  // Render: selected first in order, then unselected
  const orderedModules = [
    ...selected.map(id => routineModules.find(m => m.id === id)).filter(Boolean),
    ...routineModules.filter(m => !selected.includes(m.id))
  ];

  container.innerHTML = orderedModules.map(mod => {
    const isSelected = selected.includes(mod.id);
    return `
      <div class="routine-module-item ${isSelected ? 'selected' : ''}" data-module="${mod.id}">
        <input type="checkbox" ${isSelected ? 'checked' : ''} data-mod-check="${mod.id}">
        <span class="routine-module-icon">${mod.icon}</span>
        <span class="routine-module-name">${mod.name}</span>
        <span class="routine-module-handle">⠿</span>
      </div>
    `;
  }).join('');

  // Checkbox listeners
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const modId = cb.dataset.modCheck;
      const modules = routinesState[tab].modules;
      if (cb.checked) {
        if (!modules.includes(modId)) modules.push(modId);
      } else {
        routinesState[tab].modules = modules.filter(m => m !== modId);
      }
      saveRoutines();
      renderRoutineModules();
    });
  });
}

function launchRoutine() {
  const tab = routinesState.currentTab;
  const modules = routinesState[tab].modules;
  if (modules.length === 0) return;

  routinesState.activeRoutine = modules.map(id => routineModules.find(m => m.id === id)).filter(Boolean);
  routinesState.currentStep = 0;

  document.getElementById('routine-active')?.classList.remove('hidden');
  document.querySelector('.routine-builder')?.classList.add('hidden');
  document.querySelector('.routine-launch-btn')?.classList.add('hidden');

  showRoutineStep();
}

function showRoutineStep() {
  const steps = routinesState.activeRoutine;
  const step = routinesState.currentStep;
  if (!steps || step >= steps.length) {
    stopRoutine();
    return;
  }

  const mod = steps[step];
  const progress = ((step) / steps.length) * 100;

  document.getElementById('routine-progress-fill').style.width = progress + '%';
  document.getElementById('routine-step-number').textContent = `${step + 1}/${steps.length}`;
  document.getElementById('routine-step-name').textContent = mod.icon + ' ' + mod.name;

  // Navigate to the module page
  navigateTo(mod.page);
}

function routineNextStep() {
  routinesState.currentStep++;
  if (routinesState.currentStep >= routinesState.activeRoutine.length) {
    document.getElementById('routine-progress-fill').style.width = '100%';
    document.getElementById('routine-step-name').textContent = 'Routine terminée !';
    document.getElementById('routine-next-step')?.classList.add('hidden');
    setTimeout(stopRoutine, 2000);
  } else {
    showRoutineStep();
  }
}

function stopRoutine() {
  routinesState.activeRoutine = null;
  routinesState.currentStep = 0;
  document.getElementById('routine-active')?.classList.add('hidden');
  document.querySelector('.routine-builder')?.classList.remove('hidden');
  document.querySelector('.routine-launch-btn')?.classList.remove('hidden');
  document.getElementById('routine-next-step')?.classList.remove('hidden');
  navigateTo('routines');
}

// ===== Focus / Deep Work =====
const focusAmbiances = {
  none: null,
  rain: 'https://cdn.freesound.org/previews/531/531947_6290790-lq.mp3',
  cafe: 'https://cdn.freesound.org/previews/424/424895_359585-lq.mp3',
  fire: 'https://cdn.freesound.org/previews/499/499257_2105413-lq.mp3',
  forest: 'https://cdn.freesound.org/previews/462/462483_1048747-lq.mp3'
};

const focusState = {
  projects: ['Général'],
  currentProject: 'Général',
  isRunning: false,
  isPaused: false,
  timeLeft: 25 * 60,
  totalTime: 25 * 60,
  sessions: [],
  timer: null,
  ambianceAudio: null,
  currentAmbiance: 'rain'
};

function initFocus() {
  const saved = localStorage.getItem('breathflow_focus');
  if (saved) {
    const data = JSON.parse(saved);
    focusState.projects = data.projects || ['Général'];
    focusState.sessions = data.sessions || [];
  }

  // Populate project selector
  updateFocusProjectSelect();

  // Add project
  const addBtn = document.getElementById('focus-add-project');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const name = prompt('Nom du projet :');
      if (name && name.trim()) {
        focusState.projects.push(name.trim());
        saveFocus();
        updateFocusProjectSelect();
      }
    });
  }

  // Project select
  const select = document.getElementById('focus-project-select');
  if (select) {
    select.addEventListener('change', () => {
      focusState.currentProject = select.value;
    });
  }

  // Ambiance buttons
  document.querySelectorAll('.focus-amb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.focus-amb-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      focusState.currentAmbiance = btn.dataset.amb;
      if (focusState.isRunning) playFocusAmbiance();
    });
  });

  // Controls
  document.getElementById('focus-start')?.addEventListener('click', startFocus);
  document.getElementById('focus-pause')?.addEventListener('click', pauseFocus);
  document.getElementById('focus-reset')?.addEventListener('click', resetFocus);

  updateFocusDisplay();
  updateFocusStats();
  renderFocusHistory();
}

function saveFocus() {
  localStorage.setItem('breathflow_focus', JSON.stringify({
    projects: focusState.projects,
    sessions: focusState.sessions
  }));
}

function updateFocusProjectSelect() {
  const select = document.getElementById('focus-project-select');
  if (!select) return;
  select.innerHTML = focusState.projects.map(p =>
    `<option value="${p}" ${p === focusState.currentProject ? 'selected' : ''}>${p}</option>`
  ).join('');
}

function startFocus() {
  if (focusState.isPaused) {
    focusState.isPaused = false;
  } else {
    focusState.timeLeft = focusState.totalTime;
  }
  focusState.isRunning = true;

  document.getElementById('focus-start')?.classList.add('hidden');
  document.getElementById('focus-pause')?.classList.remove('hidden');
  document.getElementById('focus-status').textContent = 'En cours';

  playFocusAmbiance();

  focusState.timer = setInterval(() => {
    focusState.timeLeft--;
    updateFocusDisplay();

    if (focusState.timeLeft <= 0) {
      completeFocusSession();
    }
  }, 1000);
}

function pauseFocus() {
  focusState.isRunning = false;
  focusState.isPaused = true;
  clearInterval(focusState.timer);
  stopFocusAmbiance();

  document.getElementById('focus-start')?.classList.remove('hidden');
  document.getElementById('focus-pause')?.classList.add('hidden');
  document.getElementById('focus-status').textContent = 'Pause';
}

function resetFocus() {
  focusState.isRunning = false;
  focusState.isPaused = false;
  clearInterval(focusState.timer);
  focusState.timeLeft = focusState.totalTime;
  stopFocusAmbiance();

  document.getElementById('focus-start')?.classList.remove('hidden');
  document.getElementById('focus-pause')?.classList.add('hidden');
  document.getElementById('focus-status').textContent = 'Prêt';

  updateFocusDisplay();
}

function completeFocusSession() {
  clearInterval(focusState.timer);
  focusState.isRunning = false;
  stopFocusAmbiance();

  const session = {
    project: focusState.currentProject,
    duration: focusState.totalTime,
    date: new Date().toISOString()
  };
  focusState.sessions.push(session);
  saveFocus();

  document.getElementById('focus-status').textContent = 'Terminé !';
  document.getElementById('focus-start')?.classList.remove('hidden');
  document.getElementById('focus-pause')?.classList.add('hidden');

  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

  updateFocusStats();
  renderFocusHistory();

  setTimeout(() => {
    focusState.timeLeft = focusState.totalTime;
    updateFocusDisplay();
    document.getElementById('focus-status').textContent = 'Prêt';
  }, 3000);
}

function updateFocusDisplay() {
  const mins = Math.floor(focusState.timeLeft / 60);
  const secs = focusState.timeLeft % 60;
  const timeEl = document.getElementById('focus-time');
  if (timeEl) timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Update ring
  const ring = document.getElementById('focus-ring-progress');
  if (ring) {
    const circumference = 2 * Math.PI * 90;
    const progress = focusState.timeLeft / focusState.totalTime;
    ring.style.strokeDashoffset = circumference * (1 - progress);
  }
}

function updateFocusStats() {
  const today = new Date().toISOString().split('T')[0];
  const todaySessions = focusState.sessions.filter(s => s.date.startsWith(today));
  const todayMins = todaySessions.reduce((sum, s) => sum + s.duration, 0) / 60;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekSessions = focusState.sessions.filter(s => new Date(s.date) >= weekAgo);
  const weekMins = weekSessions.reduce((sum, s) => sum + s.duration, 0) / 60;

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('focus-today-time', todayMins >= 60 ? `${(todayMins/60).toFixed(1)}h` : `${Math.round(todayMins)}m`);
  el('focus-week-time', weekMins >= 60 ? `${(weekMins/60).toFixed(1)}h` : `${Math.round(weekMins)}m`);
  el('focus-total-sessions', focusState.sessions.length);

  // Best streak (consecutive days with at least 1 session)
  let bestFocusStreak = 0;
  let currentFocusStreak = 0;
  const checkDate = new Date();
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const hasSessions = focusState.sessions.some(s => s.date.startsWith(dateStr));
    if (hasSessions) {
      currentFocusStreak++;
      if (currentFocusStreak > bestFocusStreak) bestFocusStreak = currentFocusStreak;
    } else if (i > 0) {
      break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }
  el('focus-best-streak', bestFocusStreak);
}

function renderFocusHistory() {
  const container = document.getElementById('focus-history-list');
  if (!container) return;

  const recent = focusState.sessions.slice(-10).reverse();
  if (recent.length === 0) {
    container.innerHTML = '<p class="muted-text">Aucune session encore.</p>';
    return;
  }

  container.innerHTML = recent.map(s => {
    const date = new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const mins = Math.round(s.duration / 60);
    return `
      <div class="focus-history-item">
        <span class="focus-history-project">${s.project}</span>
        <span class="focus-history-duration">${mins}min</span>
        <span class="focus-history-date">${date}</span>
      </div>
    `;
  }).join('');
}

function playFocusAmbiance() {
  stopFocusAmbiance();
  const amb = focusState.currentAmbiance;
  if (amb === 'none' || !focusAmbiances[amb]) return;

  focusState.ambianceAudio = new Audio(focusAmbiances[amb]);
  focusState.ambianceAudio.loop = true;
  focusState.ambianceAudio.volume = 0.3;
  focusState.ambianceAudio.play().catch(() => {});
}

function stopFocusAmbiance() {
  if (focusState.ambianceAudio) {
    focusState.ambianceAudio.pause();
    focusState.ambianceAudio = null;
  }
}

// ===== Lecture Tracker =====
const lectureState = {
  books: []
};
let currentBookId = null;

function initLecture() {
  const saved = localStorage.getItem('breathflow_lecture');
  if (saved) {
    lectureState.books = JSON.parse(saved).books || [];
  }

  document.getElementById('add-lecture-btn')?.addEventListener('click', addBook);
  document.getElementById('close-lecture-detail')?.addEventListener('click', closeLectureDetail);
  document.getElementById('add-lecture-quote')?.addEventListener('click', addLectureQuote);
  document.getElementById('lecture-notes')?.addEventListener('blur', saveLectureNotes);

  // Stars
  document.querySelectorAll('.lecture-star').forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.dataset.star);
      if (currentBookId !== null) {
        const book = lectureState.books.find(b => b.id === currentBookId);
        if (book) {
          book.rating = rating;
          saveLecture();
          updateLectureStars(rating);
        }
      }
    });
  });

  renderLectureList();
  updateLectureStats();
}

function saveLecture() {
  localStorage.setItem('breathflow_lecture', JSON.stringify({ books: lectureState.books }));
}

function addBook() {
  const title = document.getElementById('lecture-title')?.value.trim();
  const author = document.getElementById('lecture-author')?.value.trim();
  const status = document.getElementById('lecture-status-input')?.value || 'reading';
  if (!title) return;

  lectureState.books.push({
    id: Date.now(),
    title,
    author: author || 'Inconnu',
    status,
    notes: '',
    quotes: [],
    rating: 0,
    dateAdded: new Date().toISOString()
  });

  saveLecture();
  renderLectureList();
  updateLectureStats();

  document.getElementById('lecture-title').value = '';
  document.getElementById('lecture-author').value = '';
}

function renderLectureList() {
  const container = document.getElementById('lecture-list');
  if (!container) return;

  if (lectureState.books.length === 0) {
    container.innerHTML = '<p class="muted-text" style="text-align:center;padding:2rem;">Ajoute ton premier livre !</p>';
    return;
  }

  const statusLabels = { reading: 'En cours', done: 'Terminé', toread: 'A lire' };
  const statusIcons = { reading: '📘', done: '✅', toread: '📋' };

  container.innerHTML = lectureState.books.slice().reverse().map(book => `
    <div class="lecture-book-card" data-book-id="${book.id}">
      <div class="lecture-book-cover ${book.status}">${statusIcons[book.status] || '📘'}</div>
      <div class="lecture-book-info" onclick="openLectureDetail(${book.id})">
        <div class="lecture-book-title">${book.title}</div>
        <div class="lecture-book-author">${book.author}${book.rating ? ' · ' + '★'.repeat(book.rating) : ''}</div>
      </div>
      <span class="lecture-book-badge ${book.status}">${statusLabels[book.status]}</span>
      <button class="lecture-book-delete" onclick="event.stopPropagation();deleteBook(${book.id})">×</button>
    </div>
  `).join('');
}

function deleteBook(id) {
  lectureState.books = lectureState.books.filter(b => b.id !== id);
  saveLecture();
  renderLectureList();
  updateLectureStats();
}

function openLectureDetail(id) {
  const book = lectureState.books.find(b => b.id === id);
  if (!book) return;
  currentBookId = id;

  document.getElementById('lecture-detail-title').textContent = book.title;
  document.getElementById('lecture-detail-author').textContent = book.author;
  document.getElementById('lecture-notes').value = book.notes || '';
  updateLectureStars(book.rating || 0);
  renderLectureQuotes(book);

  document.getElementById('lecture-detail-overlay')?.classList.remove('hidden');
}

function closeLectureDetail() {
  saveLectureNotes();
  document.getElementById('lecture-detail-overlay')?.classList.add('hidden');
  currentBookId = null;
  renderLectureList();
}

function saveLectureNotes() {
  if (currentBookId === null) return;
  const book = lectureState.books.find(b => b.id === currentBookId);
  if (book) {
    book.notes = document.getElementById('lecture-notes')?.value || '';
    saveLecture();
  }
}

function addLectureQuote() {
  const input = document.getElementById('lecture-quote-input');
  const quote = input?.value.trim();
  if (!quote || currentBookId === null) return;

  const book = lectureState.books.find(b => b.id === currentBookId);
  if (book) {
    book.quotes.push(quote);
    saveLecture();
    renderLectureQuotes(book);
    input.value = '';
  }
}

function renderLectureQuotes(book) {
  const container = document.getElementById('lecture-quotes-list');
  if (!container) return;

  container.innerHTML = book.quotes.map((q, i) => `
    <div class="lecture-quote-item">
      <span>"${q}"</span>
      <button class="lecture-book-delete" onclick="deleteLectureQuote(${i})">×</button>
    </div>
  `).join('');
}

function deleteLectureQuote(index) {
  if (currentBookId === null) return;
  const book = lectureState.books.find(b => b.id === currentBookId);
  if (book) {
    book.quotes.splice(index, 1);
    saveLecture();
    renderLectureQuotes(book);
  }
}

function updateLectureStars(rating) {
  document.querySelectorAll('.lecture-star').forEach(star => {
    star.classList.toggle('active', parseInt(star.dataset.star) <= rating);
  });
}

function updateLectureStats() {
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('lecture-total', lectureState.books.length);
  el('lecture-reading', lectureState.books.filter(b => b.status === 'reading').length);
  el('lecture-done', lectureState.books.filter(b => b.status === 'done').length);
}

// ===== Bilan Hebdo =====
function initBilanHebdo() {
  document.getElementById('open-bilan-hebdo')?.addEventListener('click', openBilanHebdo);
  document.getElementById('close-bilan-hebdo')?.addEventListener('click', () => {
    document.getElementById('bilan-hebdo-modal')?.classList.add('hidden');
  });
  document.getElementById('share-bilan')?.addEventListener('click', shareBilan);
}
initBilanHebdo();

function openBilanHebdo() {
  document.getElementById('bilan-hebdo-modal')?.classList.remove('hidden');
  drawBilanCanvas();
}

function drawBilanCanvas() {
  const canvas = document.getElementById('bilan-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = 400;
  const h = 600;
  canvas.width = w;
  canvas.height = h;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#0f0f23');
  bgGrad.addColorStop(1, '#1a1a3e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText("Bilan de la semaine", w/2, 40);

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  ctx.font = '12px system-ui';
  ctx.fillStyle = '#8888aa';
  ctx.fillText(
    `${weekAgo.toLocaleDateString('fr-FR', {day:'numeric',month:'short'})} - ${today.toLocaleDateString('fr-FR', {day:'numeric',month:'short',year:'numeric'})}`,
    w/2, 60
  );

  let y = 90;

  // Habits this week
  ctx.textAlign = 'left';
  ctx.font = 'bold 14px system-ui';
  ctx.fillStyle = '#00f5ff';
  ctx.fillText('Habitudes', 20, y);
  y += 25;

  let totalChecked = 0;
  let totalPossible = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayHabits = dashboardState.habits[dateStr];
    if (dayHabits) {
      totalChecked += Object.values(dayHabits).filter(v => v).length;
    }
    totalPossible += habitsList.length;
  }
  const habitPct = totalPossible > 0 ? Math.round(totalChecked / totalPossible * 100) : 0;

  // Habit bar
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(20, y, w - 40, 20);
  const grad = ctx.createLinearGradient(20, y, 20 + (w-40) * habitPct/100, y);
  grad.addColorStop(0, '#00f5ff');
  grad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = grad;
  ctx.fillRect(20, y, (w - 40) * habitPct / 100, 20);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px system-ui';
  ctx.fillText(`${habitPct}%`, w/2 - 15, y + 14);
  y += 40;

  // Focus sessions
  ctx.font = 'bold 14px system-ui';
  ctx.fillStyle = '#8b5cf6';
  ctx.fillText('Focus', 20, y);
  y += 22;
  const weekSessions = focusState.sessions.filter(s => new Date(s.date) >= weekAgo);
  const focusMins = Math.round(weekSessions.reduce((sum, s) => sum + s.duration, 0) / 60);
  ctx.font = '28px system-ui';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${focusMins}`, 20, y + 5);
  ctx.font = '12px system-ui';
  ctx.fillStyle = '#8888aa';
  ctx.fillText(`min · ${weekSessions.length} sessions`, 70, y + 5);
  y += 40;

  // Sleep
  ctx.font = 'bold 14px system-ui';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('Sommeil', 20, y);
  y += 22;
  const sleepData = JSON.parse(localStorage.getItem('breathflow_sleep') || '{}');
  const sleepHistory = sleepData.history || {};
  let sleepTotal = 0;
  let sleepDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if (sleepHistory[dateStr]?.duration) {
      sleepTotal += sleepHistory[dateStr].duration;
      sleepDays++;
    }
  }
  const avgSleep = sleepDays > 0 ? (sleepTotal / sleepDays).toFixed(1) : '--';
  ctx.font = '28px system-ui';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${avgSleep}`, 20, y + 5);
  ctx.font = '12px system-ui';
  ctx.fillStyle = '#8888aa';
  ctx.fillText(`h de moyenne · ${sleepDays}/7 jours trackés`, 80, y + 5);
  y += 40;

  // Books
  ctx.font = 'bold 14px system-ui';
  ctx.fillStyle = '#22c55e';
  ctx.fillText('Lecture', 20, y);
  y += 22;
  const booksReading = lectureState.books.filter(b => b.status === 'reading').length;
  const booksDone = lectureState.books.filter(b => b.status === 'done').length;
  ctx.font = '13px system-ui';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${booksReading} en cours · ${booksDone} terminés`, 20, y);
  y += 35;

  // Dreams
  ctx.font = 'bold 14px system-ui';
  ctx.fillStyle = '#ff6b6b';
  ctx.fillText('Rêves & Objectifs', 20, y);
  y += 22;
  let totalDreams = 0;
  Object.values(dreamsState.dreams).forEach(entries => { totalDreams += entries.length; });
  ctx.font = '13px system-ui';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${totalDreams} rêves notés`, 20, y);
  y += 40;

  // Quote at bottom
  ctx.textAlign = 'center';
  ctx.font = 'italic 11px system-ui';
  ctx.fillStyle = '#6666aa';
  const quote = inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)];
  ctx.fillText(`"${quote.text.slice(0, 60)}${quote.text.length > 60 ? '...' : ''}"`, w/2, h - 30);
  ctx.fillText(`— ${quote.author}`, w/2, h - 15);

  // App branding
  ctx.font = 'bold 10px system-ui';
  ctx.fillStyle = 'rgba(0,245,255,0.5)';
  ctx.fillText("Respir'Action", w/2, h - 2);
}

function shareBilan() {
  const canvas = document.getElementById('bilan-canvas');
  if (!canvas) return;

  canvas.toBlob(blob => {
    if (navigator.share && blob) {
      const file = new File([blob], 'bilan-semaine.png', { type: 'image/png' });
      navigator.share({
        title: "Mon bilan Respir'Action",
        files: [file]
      }).catch(() => {
        // Fallback: download
        downloadBilan(blob);
      });
    } else if (blob) {
      downloadBilan(blob);
    }
  }, 'image/png');
}

function downloadBilan(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bilan-semaine.png';
  a.click();
  URL.revokeObjectURL(url);
}

// ===== Service Worker =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('SW enregistré'))
    .catch(err => console.log('SW erreur:', err));
}
