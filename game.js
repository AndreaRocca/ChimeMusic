/**
 * ============================================================================
 * CHIMELETA HERO - MOTOR DE VIDEOJUEGO MUSICAL
 * Inspirado en Guitar Hero con soporte de hardware externo (Control Chimeleta)
 * ============================================================================
 */

(function () {
  'use strict';

  // --- CONFIGURACIÓN DE CARRILES Y MAPEO DE HARDWARE CHIMELETA ---
  const LANES_CONFIG = [
    { id: 0, name: 'Izquierda', key: 'ArrowLeft', code: 'ArrowLeft', color: '#00ff73', label: '←' },
    { id: 1, name: 'Abajo',     key: 'ArrowDown', code: 'ArrowDown', color: '#ff2a55', label: '↓' },
    { id: 2, name: 'Arriba',    key: 'ArrowUp',   code: 'ArrowUp',   color: '#ffea00', label: '↑' },
    { id: 3, name: 'Derecha',   key: 'ArrowRight',code: 'ArrowRight',color: '#00e1ff', label: '→' },
    { id: 4, name: 'Espacio',   key: ' ',         code: 'Space',     color: '#ff8400', label: '␣' }
  ];

  // Índices para búsqueda rápida por tecla
  const KEY_TO_LANE = {
    'ArrowLeft': 0,
    'ArrowDown': 1,
    'ArrowUp': 2,
    'ArrowRight': 3,
    ' ': 4,
    'Space': 4
  };

  // --- VENTANAS DE PRECISIÓN (en milisegundos) ---
  const HIT_WINDOWS = {
    PERFECT: 50,  // ±50ms
    GREAT: 95,    // ±95ms
    GOOD: 145     // ±145ms
  };

  // --- SECUENCIA BASE DE NOTAS (CHART DE PRUEBA RÍTMICO) ---
  // Estructura: array de objetos { time: segundos, lanes: [0..4] }
  // Incluye notas individuales, patrones alternados y acordes simultáneos
  function generateDefaultChart() {
    const chart = [];
    let t = 2.0; // Comenzar a los 2 segundos para dar tiempo de reacción

    // Intro rítmica simple (uno por uno)
    for (let i = 0; i < 8; i++) {
      chart.push({ time: t, lanes: [i % 4] });
      t += 0.8;
    }

    // Incorporación de la barra espaciadora
    for (let i = 0; i < 4; i++) {
      chart.push({ time: t, lanes: [4] }); // Espacio
      t += 0.5;
      chart.push({ time: t, lanes: [i % 4] });
      t += 0.5;
    }

    // Acordes dobles (Pulsaciones simultáneas)
    const chords = [
      [0, 2], // Izquierda + Arriba
      [1, 3], // Abajo + Derecha
      [0, 4], // Izquierda + Espacio
      [2, 4], // Arriba + Espacio
      [1, 2], // Abajo + Arriba
      [0, 3], // Izquierda + Derecha
    ];

    for (let i = 0; i < chords.length; i++) {
      chart.push({ time: t, lanes: chords[i] });
      t += 0.9;
    }

    // Ráfaga melódica rápida (escalas)
    const scale = [0, 1, 2, 3, 4, 3, 2, 1, 0, 4];
    for (let i = 0; i < scale.length; i++) {
      chart.push({ time: t, lanes: [scale[i]] });
      t += 0.45;
    }

    // Rock Clímax con acordes triples y dobles
    chart.push({ time: t, lanes: [0, 2, 4] }); t += 0.8;
    chart.push({ time: t, lanes: [1, 3] });    t += 0.8;
    chart.push({ time: t, lanes: [0, 1, 4] }); t += 0.8;
    chart.push({ time: t, lanes: [2, 3, 4] }); t += 1.0;

    // Gran acorde final
    chart.push({ time: t, lanes: [0, 1, 2, 3, 4] });

    return chart;
  }

  // ==========================================================================
  // SINTETIZADOR DE AUDIO RETRO (WEB AUDIO API)
  // Genera notas analógicas para cada carril y efectos de impacto/error
  // ==========================================================================
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      // Frecuencias pentatónicas de guitarra/rock: E3, G3, B3, D4, E4
      this.laneFrequencies = [164.81, 196.00, 246.94, 293.66, 329.63];
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playLaneNote(laneIndex, quality = 'perfect') {
      if (!this.enabled || !this.ctx) return;
      try {
        const freq = this.laneFrequencies[laneIndex] || 220;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Mezcla armónica para simular un timbre estilo sintetizador de rock
        osc.type = quality === 'perfect' ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        // Envolvente rápida ADSR
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      } catch (err) {
        // Fallback silencioso si audio es bloqueado
      }
    }

    playMissSound() {
      if (!this.enabled || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        // Sonido apagado / zumbido de traste apagado
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(85, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
      } catch (e) {}
    }
  }

  // ==========================================================================
  // SISTEMA DE PARTÍCULAS (CHISPAS Y FUEGO ESTILO GUITAR HERO)
  // ==========================================================================
  class ParticleEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      if (!this.canvas) return;
      this.canvas.width = this.canvas.clientWidth;
      this.canvas.height = this.canvas.clientHeight;
    }

    burst(x, y, color, count = 22) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.5, // Impulso ascendente
          color: color,
          alpha: 1,
          size: Math.random() * 4 + 2,
          decay: Math.random() * 0.04 + 0.03
        });
      }
    }

    updateAndRender() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // Gravedad suave
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.globalAlpha = Math.max(0, p.alpha);
        this.ctx.fillStyle = p.color;
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur = 8;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }
    }
  }

  // ==========================================================================
  // CLASE PRINCIPAL DEL JUEGO: CHIMELETA HERO
  // ==========================================================================
  class ChimeletaHero {
    constructor() {
      // Estado de ejecución
      this.isPlaying = false;
      this.isPaused = false;
      this.isPracticeMode = false;
      this.speedMultiplier = 1.0;
      this.audioEngine = new SoundEngine();

      // Métricas y puntuación
      this.score = 0;
      this.streak = 0;
      this.maxStreak = 0;
      this.multiplier = 1;
      this.rockMeter = 50; // 0 a 100

      // Estadísticas de fin de partida
      this.stats = {
        perfect: 0,
        great: 0,
        good: 0,
        miss: 0,
        totalNotes: 0
      };

      // Tiempos y notas
      this.songTime = 0;
      this.lastFrameTime = performance.now();
      this.notesList = []; // notas pendientes
      this.activeNotesDOM = new Map(); // id -> elemento DOM

      // Configuración de Highway
      this.travelTime = 1.6; // Segundos que tarda una nota de arriba hacia la línea
      this.hitLineYPercent = 88; // 88% desde la parte superior del highway

      // Seguimiento de entradas de hardware
      this.keysHeld = new Set();
      this.sensorTapCounts = [0, 0, 0, 0, 0];

      // Cache de elementos DOM
      this.dom = {
        highway: document.getElementById('highway'),
        notesContainer: document.getElementById('notes-container'),
        feedbackDisplay: document.getElementById('feedback-display'),
        scoreDisplay: document.getElementById('score-display'),
        streakDisplay: document.getElementById('streak-display'),
        maxStreakDisplay: document.getElementById('max-streak-display'),
        multiplierDisplay: document.getElementById('multiplier-display'),
        multiplierProgress: document.getElementById('multiplier-progress'),
        multiplierContainer: document.getElementById('multiplier-container'),
        rockMeterFill: document.getElementById('rock-meter-fill'),
        rockMeterStatus: document.getElementById('rock-meter-status'),
        btnPlayPause: document.getElementById('btn-play-pause'),
        btnPlayText: document.getElementById('btn-play-text'),
        btnRestart: document.getElementById('btn-restart'),
        btnSoundToggle: document.getElementById('btn-sound-toggle'),
        btnOpenTest: document.getElementById('btn-open-test'),
        btnCloseTest: document.getElementById('btn-close-test'),
        btnReturnGame: document.getElementById('btn-return-game'),
        btnResetTestCounts: document.getElementById('btn-reset-test-counts'),
        testModal: document.getElementById('test-modal'),
        resultsModal: document.getElementById('results-modal'),
        btnPlayAgain: document.getElementById('btn-play-again'),
        practiceToggle: document.getElementById('practice-mode-toggle'),
        speedButtons: document.querySelectorAll('.speed-btn'),
        startScreen: document.getElementById('start-screen'),
        btnStartGame: document.getElementById('btn-start-game'),
        splashPracticeToggle: document.getElementById('splash-practice-toggle'),
        btnSplashOpenTest: document.getElementById('btn-splash-open-test'),
        chimeletaSvg: document.getElementById('chimeleta-butterfly-svg'),
        chimeletaCelebrationBadge: document.getElementById('chimeleta-celebration-badge'),
        chimeletaStateBadge: document.getElementById('chimeleta-state-badge'),
        chimeletaGndNode: document.getElementById('chimeleta-gnd-node'),
        mascotCopiBox: document.getElementById('mascot-copi-box'),
        mascotDiliBox: document.getElementById('mascot-dili-box'),
        copiSpeech: document.getElementById('copi-speech'),
        diliSpeech: document.getElementById('dili-speech'),
        chimeletaContacts: [
          document.getElementById('chimeleta-contact-0'),
          document.getElementById('chimeleta-contact-1'),
          document.getElementById('chimeleta-contact-2'),
          document.getElementById('chimeleta-contact-3'),
          document.getElementById('chimeleta-contact-4')
        ],
        fretTargets: [
          document.getElementById('fret-0'),
          document.getElementById('fret-1'),
          document.getElementById('fret-2'),
          document.getElementById('fret-3'),
          document.getElementById('fret-4')
        ],
        lanes: [
          document.getElementById('lane-0'),
          document.getElementById('lane-1'),
          document.getElementById('lane-2'),
          document.getElementById('lane-3'),
          document.getElementById('lane-4')
        ]
      };

      // Motor de partículas
      const canvas = document.getElementById('particles-canvas');
      this.particles = new ParticleEngine(canvas);

      // Inicialización
      this.bindHardwareEvents();
      this.bindUIEvents();
      this.updateHUD();
    }

    // ========================================================================
    // GESTIÓN DE ENTRADAS Y HARDWARE CHIMELETA (←, ↓, ↑, →, Espacio)
    // ========================================================================
    bindHardwareEvents() {
      // Interceptar teclas a nivel global
      window.addEventListener('keydown', (e) => {
        const laneIndex = KEY_TO_LANE[e.key] !== undefined ? KEY_TO_LANE[e.key] : KEY_TO_LANE[e.code];

        // 1. Prevenir scroll del navegador en flechas y barra espaciadora
        if (laneIndex !== undefined) {
          e.preventDefault();
        }

        // 2. FILTRAR AUTORREPETICIÓN DEL SISTEMA OPERATIVO
        // Muy importante para firmware externo y pulsaciones sostenidas
        if (e.repeat) {
          return;
        }

        if (laneIndex !== undefined) {
          this.handleLanePress(laneIndex);
        }
      }, { passive: false });

      window.addEventListener('keyup', (e) => {
        const laneIndex = KEY_TO_LANE[e.key] !== undefined ? KEY_TO_LANE[e.key] : KEY_TO_LANE[e.code];

        if (laneIndex !== undefined) {
          e.preventDefault();
          this.handleLaneRelease(laneIndex);
        }
      }, { passive: false });

      // Desactivar foco en botones para evitar que el espacio active botones UI
      document.addEventListener('focusin', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') {
          e.target.blur();
        }
      });
    }

    handleLanePress(laneIndex) {
      this.audioEngine.init();
      this.keysHeld.add(laneIndex);

      // Incrementar contador de toques para la pantalla de prueba
      this.sensorTapCounts[laneIndex]++;

      // 1. Iluminación visual del receptor (fret target) y superficie de carril
      const fret = this.dom.fretTargets[laneIndex];
      const lane = this.dom.lanes[laneIndex];
      if (fret) fret.classList.add('pressed');
      if (lane) lane.classList.add(`active-${laneIndex}`);

      // Iluminación del nodo en la ilustración de Chimeleta
      if (this.dom.chimeletaContacts && this.dom.chimeletaContacts[laneIndex]) {
        this.dom.chimeletaContacts[laneIndex].classList.add('node-active');
      }

      // Cierre del circuito a través de la toma de tierra (GND)
      if (this.dom.chimeletaGndNode) {
        this.dom.chimeletaGndNode.classList.add('gnd-active');
      }

      // 2. Actualizar banco de prueba en tiempo real
      this.updateTestSensorUI(laneIndex, true);

      // 3. Evaluar impacto si el juego está en curso
      if (this.isPlaying && !this.isPaused) {
        this.evaluateHit(laneIndex);
      } else {
        // En reposo o prueba, emitir sonido al tocar el contacto
        this.audioEngine.playLaneNote(laneIndex);
      }
    }

    handleLaneRelease(laneIndex) {
      this.keysHeld.delete(laneIndex);

      const fret = this.dom.fretTargets[laneIndex];
      const lane = this.dom.lanes[laneIndex];
      if (fret) fret.classList.remove('pressed');
      if (lane) lane.classList.remove(`active-${laneIndex}`);

      // Desactivar iluminación del nodo en Chimeleta
      if (this.dom.chimeletaContacts && this.dom.chimeletaContacts[laneIndex]) {
        this.dom.chimeletaContacts[laneIndex].classList.remove('node-active');
      }

      // Si ya no quedan teclas presionadas, liberar el circuito GND
      if (this.keysHeld.size === 0 && this.dom.chimeletaGndNode) {
        this.dom.chimeletaGndNode.classList.remove('gnd-active');
      }

      this.updateTestSensorUI(laneIndex, false);
    }

    updateTestSensorUI(laneIndex, isPressed) {
      const box = document.getElementById(`sensor-${laneIndex}`);
      const stateEl = document.getElementById(`sensor-state-${laneIndex}`);
      const countEl = document.getElementById(`sensor-count-${laneIndex}`);

      if (box && stateEl && countEl) {
        if (isPressed) {
          box.classList.add('active');
          stateEl.textContent = 'ACTIVO';
        } else {
          box.classList.remove('active');
          stateEl.textContent = 'INACTIVO';
        }
        countEl.textContent = this.sensorTapCounts[laneIndex];
      }

      // Diagnóstico de pulsaciones simultáneas
      const simCountEl = document.getElementById('simultaneous-count');
      const chordEl = document.getElementById('last-chord-detected');
      if (simCountEl) {
        simCountEl.textContent = this.keysHeld.size;
      }
      if (chordEl && this.keysHeld.size > 0) {
        const heldNames = Array.from(this.keysHeld)
          .map(idx => LANES_CONFIG[idx].label)
          .join(' + ');
        chordEl.textContent = heldNames;
      }
    }

    // ========================================================================
    // EVALUACIÓN DE NOTAS (HIT / MISS / TIMING WINDOWS)
    // ========================================================================
    evaluateHit(laneIndex) {
      const effectiveTravelTime = this.travelTime / this.speedMultiplier;
      // Buscar notas activas en este carril
      let closestNote = null;
      let minDiff = Infinity;

      for (const note of this.notesList) {
        if (note.hit || note.lane !== laneIndex) continue;

        // La nota debe ser ejecutada exactamente en note.time
        const diffMs = (this.songTime - note.time) * 1000;
        const absDiff = Math.abs(diffMs);

        if (absDiff < minDiff && absDiff <= HIT_WINDOWS.GOOD) {
          minDiff = absDiff;
          closestNote = { note, diffMs, absDiff };
        }
      }

      if (closestNote) {
        const { note, absDiff } = closestNote;
        note.hit = true;

        let rating = 'good';
        let points = 25;
        let rockDelta = 1.5;

        if (absDiff <= HIT_WINDOWS.PERFECT) {
          rating = 'perfect';
          points = 100;
          rockDelta = 5;
          this.stats.perfect++;
        } else if (absDiff <= HIT_WINDOWS.GREAT) {
          rating = 'great';
          points = 50;
          rockDelta = 3;
          this.stats.great++;
        } else {
          this.stats.good++;
        }

        // Sonido y partículas
        this.audioEngine.playLaneNote(laneIndex, rating);
        this.triggerHitFeedback(laneIndex, rating);

        // Puntuación y Racha
        this.streak++;
        if (this.streak > this.maxStreak) this.maxStreak = this.streak;
        this.updateMultiplier();
        this.score += points * this.multiplier;

        // Rock Meter
        this.rockMeter = Math.min(100, this.rockMeter + rockDelta);

        // Remover DOM de la nota impactada con efecto de desvanecimiento
        this.removeNoteDOM(note.id);
        this.updateHUD();
      } else {
        // Toque en falso (Strumming sin nota en ventana de acierto)
        if (!this.isPracticeMode) {
          this.audioEngine.playMissSound();
          this.streak = 0;
          this.multiplier = 1;
          this.rockMeter = Math.max(0, this.rockMeter - 3);
          this.showPopup('MISS', 'miss');
          this.updateHUD();
        }
      }
    }

    triggerHitFeedback(laneIndex, rating) {
      // 1. Llamarada en el Fret
      const fret = this.dom.fretTargets[laneIndex];
      if (fret) {
        fret.classList.add('hit-flare');
        setTimeout(() => fret.classList.remove('hit-flare'), 140);
      }

      // Iluminación reactiva en la Chimeleta al costado
      if (this.dom.chimeletaContacts && this.dom.chimeletaContacts[laneIndex]) {
        const contactNode = this.dom.chimeletaContacts[laneIndex];
        contactNode.classList.add('node-active');
        setTimeout(() => {
          if (!this.keysHeld.has(laneIndex)) {
            contactNode.classList.remove('node-active');
          }
        }, 220);
      }

      // Reacción de las mascotas pinzas cocodrilo (Copi y Dili)
      this.triggerMascotReaction(rating);

      // 2. Emisión de partículas en el canvas
      const fretRect = fret.getBoundingClientRect();
      const canvasRect = this.particles.canvas.getBoundingClientRect();
      const originX = fretRect.left + fretRect.width / 2 - canvasRect.left;
      const originY = fretRect.top + fretRect.height / 2 - canvasRect.top;

      this.particles.burst(originX, originY, LANES_CONFIG[laneIndex].color, 24);

      // 3. Cartel emergente flotante con textos inspirados en conexión
      let popupText = rating.toUpperCase() + '!';
      if (rating === 'perfect') popupText = '¡PERFECTO!';
      else if (rating === 'great') popupText = '¡EXCELENTE!';
      else if (rating === 'good') popupText = '¡CONECTADO!';
      this.showPopup(popupText, rating);
    }

    triggerMascotReaction(rating) {
      if (this.dom.mascotCopiBox && this.dom.mascotDiliBox) {
        this.dom.mascotCopiBox.classList.add('jaw-snap');
        this.dom.mascotDiliBox.classList.add('jaw-snap');
        setTimeout(() => {
          if (this.dom.mascotCopiBox) this.dom.mascotCopiBox.classList.remove('jaw-snap');
          if (this.dom.mascotDiliBox) this.dom.mascotDiliBox.classList.remove('jaw-snap');
        }, 200);
      }

      if (rating === 'perfect' && this.dom.copiSpeech) {
        const phrases = ['¡Hiciste conexión! ⚡', '¡Chimeleta vibra! ✨', '¡Excelente pulso!', '¡Circuito cerrado!'];
        this.dom.copiSpeech.textContent = phrases[Math.floor(Math.random() * phrases.length)];
      }
    }

    triggerChimeletaCelebration() {
      if (this.dom.chimeletaSvg) {
        this.dom.chimeletaSvg.classList.add('flutter');
      }
      if (this.dom.chimeletaCelebrationBadge) {
        this.dom.chimeletaCelebrationBadge.classList.remove('hidden');
      }
      if (this.dom.diliSpeech) {
        this.dom.diliSpeech.textContent = `¡Racha de ${this.streak}! 🔥`;
      }

      if (this.celebrationTimer) clearTimeout(this.celebrationTimer);
      this.celebrationTimer = setTimeout(() => {
        if (this.dom.chimeletaSvg) this.dom.chimeletaSvg.classList.remove('flutter');
        if (this.dom.chimeletaCelebrationBadge) this.dom.chimeletaCelebrationBadge.classList.add('hidden');
      }, 1600);
    }

    showPopup(text, className) {
      const popup = document.createElement('div');
      popup.className = `judgment-popup ${className}`;
      popup.textContent = text;
      this.dom.feedbackDisplay.appendChild(popup);

      setTimeout(() => {
        if (popup.parentNode) {
          popup.parentNode.removeChild(popup);
        }
      }, 500);
    }

    updateMultiplier() {
      if (this.streak >= 30) {
        this.multiplier = 4;
        this.dom.multiplierContainer.classList.add('on-fire');
      } else if (this.streak >= 20) {
        this.multiplier = 3;
        this.dom.multiplierContainer.classList.remove('on-fire');
      } else if (this.streak >= 10) {
        this.multiplier = 2;
        this.dom.multiplierContainer.classList.remove('on-fire');
      } else {
        this.multiplier = 1;
        this.dom.multiplierContainer.classList.remove('on-fire');
      }

      // Celebración al alcanzar múltiplos de 10 en la racha
      if (this.streak > 0 && this.streak % 10 === 0) {
        this.triggerChimeletaCelebration();
      }
    }

    updateHUD() {
      // Puntaje formateado con ceros a la izquierda estilo arcade
      this.dom.scoreDisplay.textContent = this.score.toString().padStart(6, '0');
      this.dom.streakDisplay.textContent = this.streak;
      this.dom.maxStreakDisplay.textContent = `MÁX: ${this.maxStreak}`;
      this.dom.multiplierDisplay.textContent = `${this.multiplier}X`;

      // Progreso del multiplicador hacia el siguiente nivel
      let progressPercent = 0;
      if (this.multiplier === 1) progressPercent = (this.streak / 10) * 100;
      else if (this.multiplier === 2) progressPercent = ((this.streak - 10) / 10) * 100;
      else if (this.multiplier === 3) progressPercent = ((this.streak - 20) / 10) * 100;
      else progressPercent = 100;

      this.dom.multiplierProgress.setAttribute('stroke-dasharray', `${Math.min(100, Math.max(0, progressPercent))}, 100`);

      // Barra de Energía Chimeleta
      this.dom.rockMeterFill.style.width = `${this.rockMeter}%`;

      if (this.rockMeter > 70) {
        this.dom.rockMeterStatus.textContent = '¡CHIMELETA ESTÁ ENCENDIDA!';
        this.dom.rockMeterStatus.style.color = '#00ff88';
        if (this.dom.chimeletaStateBadge) this.dom.chimeletaStateBadge.textContent = '¡ENCENDIDA!';
      } else if (this.rockMeter > 40) {
        this.dom.rockMeterStatus.textContent = '¡SEGUÍ CONECTANDO!';
        this.dom.rockMeterStatus.style.color = '#ffea00';
        if (this.dom.chimeletaStateBadge) this.dom.chimeletaStateBadge.textContent = 'CONECTADA';
      } else {
        this.dom.rockMeterStatus.textContent = '¡HICISTE CONEXIÓN BAJA!';
        this.dom.rockMeterStatus.style.color = '#ff2a55';
        if (this.dom.chimeletaStateBadge) this.dom.chimeletaStateBadge.textContent = 'REVISAR';
      }
    }

    // ========================================================================
    // BUCLE PRINCIPAL DE RENDER Y FÍSICA (TICK LOOP)
    // ========================================================================
    start() {
      this.audioEngine.init();
      this.resetGameData();
      this.isPlaying = true;
      this.isPaused = false;
      this.dom.btnPlayText.textContent = 'PAUSAR';
      this.dom.btnPlayPause.classList.add('btn-secondary');
      this.dom.btnPlayPause.classList.remove('btn-primary');
      this.lastFrameTime = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }

    pause() {
      this.isPaused = true;
      this.dom.btnPlayText.textContent = 'CONTINUAR';
      this.dom.btnPlayPause.classList.add('btn-primary');
      this.dom.btnPlayPause.classList.remove('btn-secondary');
    }

    resume() {
      this.isPaused = false;
      this.lastFrameTime = performance.now();
      this.dom.btnPlayText.textContent = 'PAUSAR';
      this.dom.btnPlayPause.classList.add('btn-secondary');
      this.dom.btnPlayPause.classList.remove('btn-primary');
      requestAnimationFrame((t) => this.loop(t));
    }

    togglePlayPause() {
      if (!this.isPlaying) {
        this.start();
      } else if (this.isPaused) {
        this.resume();
      } else {
        this.pause();
      }
    }

    resetGameData() {
      // Limpiar notas activas del DOM
      this.activeNotesDOM.forEach(el => el.remove());
      this.activeNotesDOM.clear();

      // Cargar chart y generar lista plana de notas
      const rawChart = generateDefaultChart();
      this.notesList = [];
      let noteIdCounter = 0;

      rawChart.forEach(entry => {
        entry.lanes.forEach(laneIdx => {
          this.notesList.push({
            id: ++noteIdCounter,
            time: entry.time,
            lane: laneIdx,
            hit: false,
            missed: false,
            domSpawned: false
          });
        });
      });

      this.stats = { perfect: 0, great: 0, good: 0, miss: 0, totalNotes: this.notesList.length };
      this.score = 0;
      this.streak = 0;
      this.maxStreak = 0;
      this.multiplier = 1;
      this.rockMeter = 50;
      this.songTime = 0;
      this.dom.resultsModal.classList.add('hidden');
      this.updateHUD();
    }

    loop(currentTimestamp) {
      if (!this.isPlaying || this.isPaused) return;

      const deltaSeconds = (currentTimestamp - this.lastFrameTime) / 1000;
      this.lastFrameTime = currentTimestamp;

      // El avance del tiempo depende de la velocidad elegida
      this.songTime += deltaSeconds * this.speedMultiplier;

      // Actualizar física de notas
      this.updateNotes();

      // Actualizar partículas
      this.particles.updateAndRender();

      // Chequeo de fin de canción
      const allNotesFinished = this.notesList.every(n => n.hit || n.missed);
      const lastNote = this.notesList[this.notesList.length - 1];
      const songEnded = lastNote && this.songTime > lastNote.time + 2.0;

      if (allNotesFinished || songEnded) {
        this.finishSong();
        return;
      }

      requestAnimationFrame((t) => this.loop(t));
    }

    updateNotes() {
      const effectiveTravelTime = this.travelTime;
      const highwayHeight = this.dom.highway.clientHeight;
      const targetY = (this.hitLineYPercent / 100) * highwayHeight;

      // 1. Spawning y posicionamiento de notas
      for (const note of this.notesList) {
        if (note.hit || note.missed) continue;

        const timeUntilHit = note.time - this.songTime;

        // Generar DOM cuando la nota entra en el rango visible
        if (timeUntilHit <= effectiveTravelTime && !note.domSpawned) {
          this.spawnNoteDOM(note);
          note.domSpawned = true;
        }

        // Si ya está en pantalla, calcular su posición Y
        if (note.domSpawned) {
          const el = this.activeNotesDOM.get(note.id);
          if (el) {
            // Progreso: 0 = inicio de pista (arriba), 1 = línea de ejecución
            const progress = 1 - (timeUntilHit / effectiveTravelTime);
            const currentY = progress * targetY;

            if (currentY >= -40 && currentY <= highwayHeight) {
              el.style.top = `${currentY}px`;
            }

            // Chequeo de fallo (nota cruzó la línea de ejecución sin ser tocada)
            const passedMs = (this.songTime - note.time) * 1000;
            if (passedMs > HIT_WINDOWS.GOOD) {
              note.missed = true;
              this.stats.miss++;
              this.removeNoteDOM(note.id);

              if (!this.isPracticeMode) {
                this.streak = 0;
                this.multiplier = 1;
                this.rockMeter = Math.max(0, this.rockMeter - 7);
                this.audioEngine.playMissSound();
                this.showPopup('MISS', 'miss');
                this.updateHUD();

                // Falla crítica de canción en modo normal si el Rock Meter llega a 0
                if (this.rockMeter <= 0) {
                  this.failSong();
                  return;
                }
              }
            }
          }
        }
      }
    }

    spawnNoteDOM(note) {
      const el = document.createElement('div');
      el.className = `note lane-${note.lane}`;

      // Posicionar horizontalmente centrado en el carril correspondiente
      // 5 carriles: 0%, 20%, 40%, 60%, 80% con centro en +10%
      const lanePercent = (note.lane * 20) + 10;
      el.style.left = `${lanePercent}%`;
      el.style.top = `-40px`;

      this.dom.notesContainer.appendChild(el);
      this.activeNotesDOM.set(note.id, el);
    }

    removeNoteDOM(noteId) {
      const el = this.activeNotesDOM.get(noteId);
      if (el) {
        el.remove();
        this.activeNotesDOM.delete(noteId);
      }
    }

    failSong() {
      this.isPlaying = false;
      this.audioEngine.playMissSound();
      alert('¡CIRCUITO DESCONECTADO! (Energía Chimeleta en 0)\nProbá en Modo Práctica para familiarizarte con los contactos de Chimeleta.');
      this.dom.btnPlayText.textContent = 'REINTENTAR';
      this.dom.btnPlayPause.classList.add('btn-primary');
    }

    finishSong() {
      this.isPlaying = false;
      this.dom.btnPlayText.textContent = 'JUGAR';

      // Calcular precisión y rango
      const totalHits = this.stats.perfect + this.stats.great + this.stats.good;
      const accuracy = this.stats.totalNotes > 0
        ? Math.round((totalHits / this.stats.totalNotes) * 100)
        : 100;

      let rank = 'S';
      if (accuracy < 70) rank = 'C';
      else if (accuracy < 85) rank = 'B';
      else if (accuracy < 95) rank = 'A';

      // Mostrar pantalla de resultados
      const titleEl = document.getElementById('results-title-text');
      const subEl = document.getElementById('results-subtitle-text');
      if (titleEl) titleEl.textContent = '¡CIRCUITO TOTALMENTE CONECTADO!';
      if (subEl) {
        subEl.textContent = accuracy >= 85
          ? '¡Chimeleta encendió todo su ritmo con tu energía!'
          : '¡Buen circuito! Seguí conectando para mejorar tu precisión.';
      }

      document.getElementById('final-rank').textContent = rank;
      document.getElementById('final-score').textContent = this.score;
      document.getElementById('final-streak').textContent = this.maxStreak;
      document.getElementById('final-perfect').textContent = this.stats.perfect;
      document.getElementById('final-good').textContent = this.stats.good + this.stats.great;
      document.getElementById('final-misses').textContent = this.stats.miss;
      document.getElementById('final-accuracy').textContent = `${accuracy}%`;

      this.dom.resultsModal.classList.remove('hidden');
    }

    // ========================================================================
    // VINCULACIÓN DE CONTROLES DE LA INTERFAZ (BOTONES, VELOCIDAD, TEST)
    // ========================================================================
    bindUIEvents() {
      // Iniciar desde la pantalla de bienvenida (Start Screen)
      if (this.dom.btnStartGame) {
        this.dom.btnStartGame.addEventListener('click', (e) => {
          e.target.blur();
          if (this.dom.startScreen) this.dom.startScreen.classList.add('hidden');
          this.start();
        });
      }

      // Sincronizar toggle de práctica en pantalla de inicio
      if (this.dom.splashPracticeToggle) {
        this.dom.splashPracticeToggle.addEventListener('change', (e) => {
          this.dom.practiceToggle.checked = e.target.checked;
          this.isPracticeMode = e.target.checked;
          if (this.isPracticeMode) this.setSpeed(0.8);
        });
        this.dom.practiceToggle.addEventListener('change', (e) => {
          this.dom.splashPracticeToggle.checked = e.target.checked;
        });
      }

      // Abrir test de Chimeleta desde pantalla de bienvenida
      if (this.dom.btnSplashOpenTest) {
        this.dom.btnSplashOpenTest.addEventListener('click', (e) => {
          e.target.blur();
          this.dom.testModal.classList.remove('hidden');
        });
      }

      // Iniciar / Pausar
      this.dom.btnPlayPause.addEventListener('click', (e) => {
        e.target.blur();
        this.togglePlayPause();
      });

      // Reiniciar
      this.dom.btnRestart.addEventListener('click', (e) => {
        e.target.blur();
        this.start();
      });

      // Modo Práctica
      this.dom.practiceToggle.addEventListener('change', (e) => {
        this.isPracticeMode = e.target.checked;
        if (this.isPracticeMode) {
          this.setSpeed(0.8);
        }
      });

      // Selector de velocidad
      this.dom.speedButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.target.blur();
          const speedVal = parseFloat(btn.dataset.speed);
          this.setSpeed(speedVal);
        });
      });

      // Toggle Audio
      this.dom.btnSoundToggle.addEventListener('click', (e) => {
        e.target.blur();
        this.audioEngine.enabled = !this.audioEngine.enabled;
        this.dom.btnSoundToggle.classList.toggle('active', this.audioEngine.enabled);
        this.dom.btnSoundToggle.textContent = this.audioEngine.enabled ? '🔊 AUDIO: SÍ' : '🔇 AUDIO: NO';
      });

      // Abrir / Cerrar Pantalla de Prueba Chimeleta
      this.dom.btnOpenTest.addEventListener('click', (e) => {
        e.target.blur();
        if (this.isPlaying && !this.isPaused) this.pause();
        this.dom.testModal.classList.remove('hidden');
      });

      const closeTest = () => {
        this.dom.testModal.classList.add('hidden');
      };

      this.dom.btnCloseTest.addEventListener('click', closeTest);
      this.dom.btnReturnGame.addEventListener('click', closeTest);

      // Reiniciar contadores del modo de prueba
      this.dom.btnResetTestCounts.addEventListener('click', (e) => {
        e.target.blur();
        this.sensorTapCounts = [0, 0, 0, 0, 0];
        for (let i = 0; i < 5; i++) {
          const countEl = document.getElementById(`sensor-count-${i}`);
          if (countEl) countEl.textContent = '0';
        }
        document.getElementById('simultaneous-count').textContent = '0';
        document.getElementById('last-chord-detected').textContent = 'Ninguno';
      });

      // Botón Jugar de nuevo en Resultados
      this.dom.btnPlayAgain.addEventListener('click', (e) => {
        e.target.blur();
        this.dom.resultsModal.classList.add('hidden');
        this.start();
      });
    }

    setSpeed(speed) {
      this.speedMultiplier = speed;
      this.dom.speedButtons.forEach(b => {
        b.classList.toggle('active', parseFloat(b.dataset.speed) === speed);
      });
    }
  }

  // Lanzar el juego cuando el DOM esté listo
  window.addEventListener('DOMContentLoaded', () => {
    window.chimeletaGame = new ChimeletaHero();
  });

})();
