// ===== BreathFlow App =====

// État global
const state = {
  currentPage: 'home',
  breathingSession: null,
  isPlaying: false,
  settings: {
    darkMode: false,
    vibration: true,
    sounds: true,
    audioGuide: true,
    voiceGuide: false
  },
  stats: {
    breathingSessions: 0,
    workouts: 0,
    lastActiveDate: null,
    streak: 0
  },
  workouts: []
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
      this.speak(throughNose ? 'Inspire par le nez' : 'Inspire par la bouche');
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
      this.speak(throughNose ? 'Expire par le nez' : 'Expire par la bouche');
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
      this.speak(isEmpty ? 'Retiens poumons vides' : 'Retiens');
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
      this.speak('Respirations rapides');
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
      setTimeout(() => this.speak('Bravo, session terminee'), 1000);
    }
  }

  // Synthese vocale - voix douce et feminine
  speak(text) {
    if (!('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.85;  // Plus lent = plus doux
    utterance.pitch = 1.1;  // Legèrement plus aigu = plus feminin
    utterance.volume = 0.75;

    // Chercher la meilleure voix feminine francaise
    const voices = speechSynthesis.getVoices();

    // Priorite aux voix de haute qualite (Google, Microsoft, Apple)
    const preferredVoiceNames = [
      'Google français',      // Google - très naturelle
      'Microsoft Denise',     // Microsoft - feminine douce
      'Microsoft Julie',      // Microsoft - feminine
      'Amelie',               // Apple macOS - feminine
      'Audrey',               // Apple - feminine premium
      'Thomas',               // Si pas de feminine, voix douce
      'Google',               // Fallback Google
      'Microsoft',            // Fallback Microsoft
    ];

    let selectedVoice = null;

    // Chercher d'abord une voix feminine francaise de qualite
    for (const prefName of preferredVoiceNames) {
      selectedVoice = voices.find(v =>
        v.lang.startsWith('fr') &&
        v.name.toLowerCase().includes(prefName.toLowerCase())
      );
      if (selectedVoice) break;
    }

    // Si pas trouve, chercher n'importe quelle voix feminine francaise
    if (!selectedVoice) {
      const feminineKeywords = ['female', 'femme', 'amelie', 'julie', 'denise', 'audrey', 'marie', 'chloe', 'lea'];
      selectedVoice = voices.find(v =>
        v.lang.startsWith('fr') &&
        feminineKeywords.some(kw => v.name.toLowerCase().includes(kw))
      );
    }

    // Fallback: premiere voix francaise disponible
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith('fr'));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      // Ajuster selon le type de voix
      if (selectedVoice.name.toLowerCase().includes('google')) {
        utterance.rate = 0.8;  // Google est un peu rapide
      }
    }

    speechSynthesis.speak(utterance);
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

// URLs de musiques categorisees (libres de droits)
const musicTracks = {
  // === CALME - Pour relaxation, sommeil, coherence cardiaque ===
  calmAmbient: {
    name: 'Ambient Nature - Calme',
    url: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3',
    category: 'calme'
  },
  calmPiano: {
    name: 'Piano Doux - Calme',
    url: 'https://cdn.pixabay.com/audio/2022/12/13/audio_3ffb7e4b9a.mp3',
    category: 'calme'
  },
  calmMeditation: {
    name: 'Meditation Zen - Calme',
    url: 'https://cdn.pixabay.com/audio/2023/09/04/audio_4b3e86a256.mp3',
    category: 'calme'
  },
  calmSleep: {
    name: 'Deep Sleep - Calme',
    url: 'https://cdn.pixabay.com/audio/2023/07/19/audio_e9e846e0b3.mp3',
    category: 'calme'
  },
  calmLofi: {
    name: 'Lofi Chill - Calme',
    url: 'https://cdn.pixabay.com/audio/2024/01/10/audio_fb77e09de8.mp3',
    category: 'calme'
  },
  // === NEUTRE - Pour box breathing, exercices equilibres ===
  neutralBowls: {
    name: 'Tibetan Bowls - Neutre',
    url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_811c4f7c86.mp3',
    category: 'neutre'
  },
  neutralSpa: {
    name: 'Spa Relaxation - Neutre',
    url: 'https://cdn.pixabay.com/audio/2023/05/16/audio_168a3a1558.mp3',
    category: 'neutre'
  },
  neutralNature: {
    name: 'Forest Stream - Neutre',
    url: 'https://cdn.pixabay.com/audio/2022/06/07/audio_b9bd4170e4.mp3',
    category: 'neutre'
  },
  // === ACTIVE - Pour Wim Hof, Bhastrika, Tummo ===
  activeEpic: {
    name: 'Epic Rise - Active',
    url: 'https://cdn.pixabay.com/audio/2023/10/03/audio_11e7e33e47.mp3',
    category: 'active'
  },
  activeDrums: {
    name: 'Tribal Drums - Active',
    url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0c29e8398.mp3',
    category: 'active'
  },
  activeEnergy: {
    name: 'Energy Flow - Active',
    url: 'https://cdn.pixabay.com/audio/2023/08/10/audio_dc39bde808.mp3',
    category: 'active'
  }
};

// ===== Initialisation =====
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initNavigation();
  initBreathing();
  initCalisthenics();
  initSettings();
  initMusic();
  updateStats();

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

    // Appliquer le thème
    if (state.settings.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.getElementById('dark-mode-toggle').checked = true;
    }

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
    } else if (phase.type === 'exhale') {
      circle.classList.add('exhale');
      circle.style.transitionDuration = `${phase.duration}s`;
      // Jouer le son d'expiration
      audioGuide.playExhale(phase.duration, throughNose, intensity);
    } else if (phase.type === 'hold') {
      circle.classList.add('hold');
      // Jouer le son de retention
      audioGuide.playHold(phase.duration, false);
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

  state.stats.breathingSessions++;
  updateStreak();
  saveData();
  updateStats();

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
    document.documentElement.setAttribute('data-theme', state.settings.darkMode ? 'dark' : '');
    saveData();
  });

  themeBtn.addEventListener('click', () => {
    state.settings.darkMode = !state.settings.darkMode;
    darkModeToggle.checked = state.settings.darkMode;
    document.documentElement.setAttribute('data-theme', state.settings.darkMode ? 'dark' : '');
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
      audioGuide.speak('Inspire doucement par le nez... Expire lentement...');
    });
  }

  exportBtn.addEventListener('click', exportData);
  importInput.addEventListener('change', importData);
  resetBtn.addEventListener('click', resetData);
}

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
