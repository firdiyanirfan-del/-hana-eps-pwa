/* ══════════════════════════════════════════════════════════════════════════
   🚀 ULTRA-PERFORMANCE MASCOT PRELOADER ENGINE (ANTI-FLICKER GUARD)
   ========================================================================== */
(function() {
  const hanaAssets = [
    'assets/hana_welcome.png',
    'assets/hana_studying.png',
    'assets/hana_thinking.png',
    'assets/hana_encourage.png',
    'assets/hana_streak.png',
    'assets/hana_sukses.png',
    'assets/hana_trophy.png'
  ];
  
  hanaAssets.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
  console.log('🔮 [HANA Engine] All 3D Mascot assets preloaded successfully.');
})();

// ============================================================
// UTIL MODAL & POPUP SCREENS
// ============================================================
function confirmReset() { document.getElementById('modal-reset').classList.remove('hidden'); }
function confirmExitQuiz() { document.getElementById('modal-exit-quiz').classList.remove('hidden'); }
function doReset() {
  // Membersihkan laci modular baru
  localStorage.removeItem('eps_user_profile');
  localStorage.removeItem('eps_stage_progress');
  localStorage.removeItem('eps_wrong_answers');
  localStorage.removeItem('eps_settings');
  
  // Membersihkan legacy & setelan dasar
  localStorage.removeItem('epsData');
  localStorage.removeItem('epsDarkMode');
  localStorage.removeItem('storyProgress');
  localStorage.removeItem('epsWelcomeToastShown'); 
  
  closeModal('modal-reset');
  location.reload();
}
function doExitQuiz() {
  closeModal('modal-exit-quiz');
  clearInterval(app.state.timer);
  app.showDashboard();
}

window.showInfoModal = function(title, desc) {
  const oldToast = document.getElementById('hana-injected-toast');
  if (oldToast) oldToast.remove();

  const toastContainer = document.createElement('div');
  toastContainer.id = 'hana-injected-toast';
  
  toastContainer.className = "fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200";
  toastContainer.style.zIndex = "99999999"; 

  toastContainer.innerHTML = `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 w-full max-w-sm shadow-2xl transform scale-100 transition-transform flex flex-col items-center text-center">
      <div class="flex justify-center mb-2 relative overflow-hidden p-4">
        <div class="absolute w-3 h-3 bg-indigo-400 rounded-sm left-4 top-2 confetti-piece-1"></div>
        <div class="absolute w-2 h-4 bg-rose-400 rounded-sm left-1/4 top-0 confetti-piece-2"></div>
        <div class="absolute w-3 h-3 bg-amber-400 rounded-sm right-1/4 top-1 confetti-piece-1"></div>
        <div class="absolute w-4 h-2 bg-emerald-400 rounded-sm right-6 top-3 confetti-piece-2"></div>
        
        <div class="relative">
          <div class="absolute -inset-4 rounded-full border border-purple-500/20 animate-ping opacity-25"></div>
          <img src="assets/hana_welcome.png" alt="Hana Welcome" class="w-40 h-40 object-contain select-none pointer-events-none drop-shadow-md hana-blast-entrance" />
        </div>
      </div>
      <h3 class="text-base font-black text-slate-900 dark:text-white mb-1.5">${title}</h3>
      <p class="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-5 px-2">${desc}</p>
      <button id="btn-close-injected-toast" class="w-full py-3.5 bg-[#6C63FF] hover:bg-[#5A52E6] text-white font-black rounded-xl text-xs uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-indigo-500/20">
        Mengerti
      </button>
    </div>
  `;

  document.body.appendChild(toastContainer);

  document.getElementById('btn-close-injected-toast').onclick = function() {
    toastContainer.classList.add('animate-out', 'fade-out', 'duration-150');
    setTimeout(() => {
      toastContainer.remove();
    }, 140);
  };
};

function hideAllScreens() {
  ['dashboard-screen', 'quiz-screen', 'result-screen', 'flashcard-screen', 'dictation-screen', 'story-screen', 'view-review', 'view-semantic-game', 'view-ai-chat', 'view-game-hub', 'screen-roulette', 'screen-textbook', 'screen-feedback', 'profile-screen', 'screen-conversation'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
  });
}

// ============================================================
// STORAGE MANAGER
// ============================================================
// ============================================================
// STORAGE MANAGER (SCALABLE & MODULAR)
// ============================================================
const Storage = {
  // Key Definitions untuk Database Server masa depan
  KEYS: {
    PROFILE: 'eps_user_profile',
    PROGRESS: 'eps_stage_progress',
    MISTAKES: 'eps_wrong_answers',
    SETTINGS: 'eps_settings',
    LEGACY: 'epsData' // Kunci lama untuk deteksi migrasi
  },

  get: () => {
    try {
      // ✨ ENGINE BARU: Auto-Migration Data Lama ✨
      // Memastikan user (atau Anda) tidak kehilangan XP saat update struktur ini
      const legacyData = localStorage.getItem(Storage.KEYS.LEGACY);
      if (legacyData) {
        const parsedLegacy = JSON.parse(legacyData);
        Storage.set(parsedLegacy); // Distribusikan data lama ke format laci baru
        localStorage.removeItem(Storage.KEYS.LEGACY); // Bakar laci lama agar bersih
        console.log("🛠️ Storage Migration Successful!");
      }

      // Ambil data dari masing-masing laci (Pecah Modul)
      const profile = JSON.parse(localStorage.getItem(Storage.KEYS.PROFILE)) || { xp: 0, streak: 0, lastLogin: '', badges: {}, quizHistory: [], lifetimeStats: { readCorrect: 0, readTotal: 0, listCorrect: 0, listTotal: 0 }, dailyStats: { date: '', words: 0, quizzes: 0, minutes: 0 } };
      const progress = JSON.parse(localStorage.getItem(Storage.KEYS.PROGRESS)) || {
        storyLevel: 0, storyQuestionIndex: 0, chapters: [],
        beginner: { stage1Score: 0, stage2Score: 0, stage3Score: 0, unlocked: 1 },
        normal: { stage1Score: 0, stage2Score: 0, stage3Score: 0, unlocked: 1 },
        pro: { stage1Score: 0, stage2Score: 0, stage3Score: 0, unlocked: 1 }
      };
      const wrongAnswers = JSON.parse(localStorage.getItem(Storage.KEYS.MISTAKES)) || [];
      const settings = JSON.parse(localStorage.getItem(Storage.KEYS.SETTINGS)) || { streakDates: [], bookmarks: [] };

      // Gabungkan (Merge) kembali secara virtual di RAM agar logika app.js Anda tidak perlu diubah sama sekali
      return {
        xp: profile.xp || 0,
        streak: profile.streak || 0,
        lastLogin: profile.lastLogin || '',
        badges: profile.badges || {},
        quizHistory: profile.quizHistory || [],
        dailyStats: profile.dailyStats || { date: '', words: 0, quizzes: 0, minutes: 0 },
        lifetimeStats: profile.lifetimeStats || { readCorrect: 0, readTotal: 0, listCorrect: 0, listTotal: 0 },
        storyLevel: progress.storyLevel || 0,
        storyQuestionIndex: progress.storyQuestionIndex || 0,
        stageProgress: {
          chapters: progress.chapters || [],
          beginner: progress.beginner || { stage1Score: 0, stage2Score: 0, stage3Score: 0, unlocked: 1 },
          normal: progress.normal || { stage1Score: 0, stage2Score: 0, stage3Score: 0, unlocked: 1 },
          pro: progress.pro || { stage1Score: 0, stage2Score: 0, stage3Score: 0, unlocked: 1 }
        },
        chapterProgress: progress.chapterProgress || (() => {
          const cp = {};
          for (let i = 6; i <= 60; i++) cp[`bab${i}`] = { level1Stars: 0, level2Stars: 0, level3Stars: 0, unlocked: i === 6 };
          return cp;
        })(),
        wrongAnswers: wrongAnswers,
        streakDates: settings.streakDates || [],
        bookmarks: settings.bookmarks || [],
        userName: settings.userName || '', fontFamily: settings.fontFamily || '',
        fontSize: settings.fontSize || '', examDate: settings.examDate || '', userEmail: settings.userEmail || '', userAvatar: settings.userAvatar || ''
      };
    } catch (e) {
      console.error("Storage Read Error", e);
      return {
        xp: 0, streak: 0, lastLogin: '', badges: {}, storyLevel: 0, storyQuestionIndex: 0,
        quizHistory: [], dailyStats: { date: '', words: 0, quizzes: 0, minutes: 0 }, lifetimeStats: { readCorrect: 0, readTotal: 0, listCorrect: 0, listTotal: 0 },
        wrongAnswers: [], streakDates: [], bookmarks: [],
        userName: '', fontFamily: '', fontSize: '', examDate: '', userEmail: '', userAvatar: '',
        stageProgress: {
          chapters: [],
          beginner: { stage1Score: 0, stage2Score: 0, stage3Score: 0, unlocked: 1 },
          normal: { stage1Score: 0, stage2Score: 0, stage3Score: 0, unlocked: 1 },
          pro: { stage1Score: 0, stage2Score: 0, stage3Score: 0, unlocked: 1 }
        },
        chapterProgress: (() => { const c={}; for(let i=6;i<=60;i++) c[`bab${i}`]={level1Stars:0,level2Stars:0,level3Stars:0,unlocked:i===6}; return c; })()
      };
    }
  },

  // Menyimpan data dengan mendistribusikannya ke entitas/tabel yang spesifik
  set: (d) => {
    try {
      localStorage.setItem(Storage.KEYS.PROFILE, JSON.stringify({ 
        xp: d.xp, streak: d.streak, lastLogin: d.lastLogin, badges: d.badges, quizHistory: d.quizHistory, lifetimeStats: d.lifetimeStats,
        dailyStats: d.dailyStats
      }));
      
      localStorage.setItem(Storage.KEYS.PROGRESS, JSON.stringify({ 
        storyLevel: d.storyLevel, storyQuestionIndex: d.storyQuestionIndex, 
        chapters: d.stageProgress?.chapters || [],
        chapterProgress: d.chapterProgress || {},
        beginner: d.stageProgress?.beginner, normal: d.stageProgress?.normal, pro: d.stageProgress?.pro 
      }));
      
      localStorage.setItem(Storage.KEYS.MISTAKES, JSON.stringify(d.wrongAnswers || []));
      
      localStorage.setItem(Storage.KEYS.SETTINGS, JSON.stringify({ 
        streakDates: d.streakDates || [], bookmarks: d.bookmarks || [],
        userName: d.userName || '', fontFamily: d.fontFamily || '', 
        fontSize: d.fontSize || '', examDate: d.examDate || '', userEmail: d.userEmail || '', userAvatar: d.userAvatar || ''
      }));
    } catch (e) {
      console.error("Storage Write Error", e);
    }
  }
};

// ============================================================
// DARK MODE LOGIC
// ============================================================
function applyDarkMode(on) {
  document.documentElement.classList.toggle('dark', on);
  document.getElementById('darkModeThumb').style.transform = on ? 'translateX(1.5rem)' : 'translateX(0)';
}
function initDarkMode() {
  const saved = localStorage.getItem('epsDarkMode') === 'true';
  applyDarkMode(saved);
  document.getElementById('darkModeToggle').onclick = () => {
    const cur = document.documentElement.classList.contains('dark');
    applyDarkMode(!cur);
    localStorage.setItem('epsDarkMode', String(!cur));
  };
}

// ============================================================
// CONSTANTS: ACHIEVEMENTS, ACCENT AUDIO, LEVEL THRESHOLDS
// ============================================================
const Achievements = {
  firstQuiz: { name: "First Step", icon: "👣" },
  perfect: { name: "Perfect Score", icon: "💯" },
  streak7: { name: "7-Day Streak", icon: "🔥" },
  nightOwl: { name: "Night Owl", icon: "🦉" },
  silentWarrior: { name: "Silent Warrior", icon: "🔇" },
  smartReviewer: { name: "Smart Reviewer", icon: "🔁" },
  stageMaster: { name: "Stage Master", icon: "🏆" }
};

const Sound = {
  _ctx: null,
  getCtx() {
    if (!this._ctx) this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this._ctx;
  },
  play(type) {
    try {
      const ctx = this.getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      if (type === 'correct') {
        o.frequency.value = 880; g.gain.value = 0.2;
        o.start(); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        o.stop(ctx.currentTime + 0.25);
      } else {
        o.frequency.value = 250; g.gain.value = 0.2;
        o.start(); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        o.stop(ctx.currentTime + 0.35);
      }
    } catch (e) { }
  }
};

const Levels = [
  { threshold: 0, name: "Hangul Rookie 🐣" },
  { threshold: 100, name: "Hangul Explorer 🔍" },
  { threshold: 300, name: "Korea Survivor ⛺" },
  { threshold: 600, name: "EPS Scholar 🎓" },
  { threshold: 1000, name: "TOPIK Master 👑" }
];

// =========================================================================
// 🛠️ HANA CORE UTILITIES & FEATURE METADATA EXTENSION
// =========================================================================

window.featureData = {
  "pembahasan": { title: "Mode Latihan", desc: "Aktifkan fitur ini untuk menampilkan penjelasan detail setelah menjawab soal. Gunakan untuk memahami konsep dan memperbaiki kesalahan belajar secara langsung." },
  "belajar-bab": { title: "Dasar Kurikulum", desc: "Pelajari materi lengkap bab per bab sesuai standar EPS-TOPIK. Sangat cocok untuk memahami teori dasar secara terstruktur." },
  "misi-stage": { title: "Uji Kompetensi", desc: "Uji kemampuanmu melalui level berjenjang (Pemula hingga Pro). Setiap stage dirancang untuk memantau kesiapanmu sebelum ujian asli." },
  "tantangan": { title: "Konsistensi Harian", desc: "Latihan singkat setiap hari untuk menjaga otakmu tetap tajam. Pertahankan streak harianmu agar kosakata yang dihafal tidak mudah lupa!" },
  "kuis-gambar": { title: "Visual & Memori", desc: "Tingkatkan daya ingat kosakata melalui bantuan visual. Sangat efektif untuk menghafal nama benda dan Core situasi di lingkungan kerja." },
  "dikte-audio": { title: "Listening Mastery", desc: "Asah kemampuan mendengar dengan audio percakapan standar ujian. Kunci utama untuk meraih nilai maksimal di sesi Listening." },
  "story-kerja": { title: "Simulasi Dunia Nyata", desc: "Belajar merespon situasi kerja di Korea melalui cerita pendek. Simulasi ini melatih pemahamanmu dalam konteks percakapan nyata di tempat kerja." }
};

window.openModal = function(id) {
  if (window.showInfoModal && window.featureData[id]) {
    window.showInfoModal(window.featureData[id].title, window.featureData[id].desc);
  }
};

window.closeModal = function(modalId) {
  const targetModal = document.getElementById(modalId);
  if (targetModal) {
    targetModal.classList.add('hidden');
    targetModal.classList.remove('flex');
  }
};

window.toggleModalPanel = function(panel) {
  const main = document.getElementById('main-path-options');
  const stages = document.getElementById('stage-levels-options');
  const title = document.getElementById('modal-path-title');
  const desc = document.getElementById('modal-path-desc');
  if (panel === 'stages') {
    main.classList.add('hidden');
    stages.classList.remove('hidden');
    title.textContent = 'Pilih Level & Stage';
    desc.textContent = 'Tentukan tingkat kesulitan dan stage yang ingin ditempuh';
  } else {
    main.classList.remove('hidden');
    stages.classList.add('hidden');
    title.textContent = 'Pilih Mode Latihan';
    desc.textContent = 'Tentukan metode asah kemampuan EPS-TOPIK Anda';
  }
};

window.closeQuizPathModal = function() {
  document.getElementById('quiz-path-modal').classList.add('hidden');
  window.toggleModalPanel('main');
};

// === ⚙️ AUTOMATIC LUCIDE ICON HYDRATION OBSERVER FOR ALL MODAL HUBS ===
document.addEventListener("DOMContentLoaded", () => {
  ['modal-mission', 'modal-help', 'modal-bookmark-hub'].forEach(id => {
    const el = document.getElementById(id);
    if (el && typeof lucide !== 'undefined') {
      const obs = new MutationObserver(() => { 
        if (!el.classList.contains('hidden')) {
          lucide.createIcons(); 
        }
      });
      obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    }
  });

});

// ============================================================
// GLOBAL TOAST NOTIFICATION
// ============================================================
window.showToast = function(msg, type = 'success') {
  const t = document.getElementById('toastEl');
  if (!t) return;
  const icon = document.getElementById('toastIcon');
  const text = document.getElementById('toastMsg');
  
  text.innerText = msg;
  if (type === 'error') {
    t.style.background = 'rgba(244,63,94,0.95)';
    icon.innerText = '⚠️';
  } else if (type === 'warning') {
    t.style.background = 'rgba(245,158,11,0.95)';
    icon.innerText = '💡';
  } else {
    t.style.background = 'linear-gradient(135deg, #6C63FF 0%, #8B84FF 100%)';
    t.style.boxShadow = '0 12px 32px rgba(108,99,255,0.35)';
    t.style.border = '1px solid rgba(255,255,255,0.15)';
    icon.innerText = '✨';
  }
  
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  t.style.borderRadius = '20px';
  
  clearTimeout(t.hideTimeout);
  t.hideTimeout = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(-15px)';
  }, 2500);
};

// =========================================================================
// 🔮 HANA IMMERSIVE SPOTLIGHT WALKTHROUGH ENGINE (9-STEP MASCOT CORE SYSTEM)
// =========================================================================
window.HanaTour = {
  currentStep: 0,
  steps: [
    {
      selector: '#dashboard-screen [onclick="app.promptExamDate()"]',
      image: 'assets/hana_thinking.png',
      title: 'Langkah 1: Target Ujian 📅',
      desc: 'Atur tanggal ujian resmi EPS-TOPIK kamu di sini untuk mengaktifkan kapsul hitung mundur cerdas penentu kelulusan industri.'
    },
    {
      selector: '#quizModeBadge',
      image: 'assets/hana_welcome.png',
      title: 'Langkah 2: Saklar Mode Belajar 🔄',
      desc: 'Aktifkan Panduan ON untuk memunculkan analisis pembahasan jawaban secara langsung saat berlatih, atau matikan untuk simulasi ujian mandiri.'
    },
    {
      selector: '#dashboard-screen [onclick="app.startDailyWordMission()"]',
      image: 'assets/hana_streak.png',
      title: 'Langkah 3: Misi Harian 🔥',
      desc: 'Selesaikan tantangan kuis harian (Kosakata, Kuis Cepat, Roulette Kasino) untuk mengamankan rentetan kalender Streak konsistensimu!'
    },
    {
      selector: '#dashboard-screen [onclick*="quiz-path-modal"]',
      image: 'assets/hana_studying.png',
      title: 'Langkah 4: Latihan Soal 🏫',
      desc: 'Pusat kurikulum utama Anda. Akses materi latihan soal per bab resmi standar HRD Korea atau uji batas kemampuan via Tahap Kompetensi berjenjang.'
    },
    {
      selector: '#dashboard-screen [onclick="window.showSandboxBuilder()"]',
      image: 'assets/hana_thinking.png',
      title: 'Langkah 5: Kustom Soal (Sandbox) 🛠️',
      desc: 'Fitur Sandbox eksklusif. Di sini kamu bisa merakit lembar simulasi ujian UBT mandiri dengan bebas mengatur durasi, jumlah soal, dan fokus materi.'
    },
    {
      selector: '#dashboard-screen [onclick="app.openFlashcard()"]',
      image: 'assets/hana_welcome.png',
      title: 'Langkah 6: Jalur Kosakata 🧠',
      desc: 'Asah ketajaman memori dan pendengaran Anda lewat koleksi Flashcard interaktif 3D, pemutar audio kuis Dikte, serta Story Mode dunia kerja.'
    },
    {
      selector: '#dashboard-screen [onclick="app.showBookmarkHub()"]',
      image: 'assets/hana_welcome.png',
      title: 'Langkah 7: Bookmark Vault 📦',
      desc: 'Arsip personal Anda. Kelola, tinjau kembali, dan uji ulang kumpulan koleksi soal-soal sulit pilihan Anda yang telah disimpan sebelumnya.'
    },
    {
      selector: '#dashboard-screen [onclick="app.startSimulasi()"]',
      image: 'assets/hana_encourage.png',
      title: 'Langkah 8: Arena UBT Simulator 💻',
      desc: 'Hadapi simulasi ujian campuran 20 soal resmi dengan pembatasan waktu ketat dan bobot akurasi nilai asli 100% mirip kondisi lapangan.'
    },
    {
      selector: '[onclick="uiSwitcher.switch(\'ai-chat\')"]',
      image: 'assets/hana_sukses.png',
      title: 'Langkah 9: Asisten AI Tutor 🤖',
      desc: 'Butuh bimbingan mendalam? Ketuk AI Tutor untuk berkonsultasi tata bahasa teratur atau membedah otomatis riwayat kesalahan soal Anda 24 jam penuh!'
    }
  ],

  start() {
    this.currentStep = 0;
    const overlay = document.getElementById('hanaTourOverlay');
    const tooltip = document.getElementById('hanaTourTooltip');
    if (!overlay || !tooltip) return;

    overlay.classList.add('active');
    tooltip.classList.remove('hidden');
    
    if (window.uiSwitcher) uiSwitcher.switch('minimalist');
    this.render();
  },

  render() {
    const step = this.steps[this.currentStep];
    if (!step) { this.end(); return; }

    const target = document.querySelector(step.selector);
    const overlay = document.getElementById('hanaTourOverlay');
    const tooltip = document.getElementById('hanaTourTooltip');
    const mascotImg = document.getElementById('tourMascot');
    if (!overlay || !tooltip) return;

    document.getElementById('tourTitle').innerText = step.title;
    document.getElementById('tourDesc').innerText = step.desc;
    document.getElementById('tourProgressText').innerText = `${this.currentStep + 1}/${this.steps.length}`;
    
    if (mascotImg && step.image) {
      mascotImg.classList.remove('hana-next-step', 'hana-prev-step');
      mascotImg.offsetHeight;
      mascotImg.src = step.image;
      const animClass = this.currentStep === 0 ? 'hana-next-step' : 'hana-next-step';
      mascotImg.classList.add(animClass);
    }
    
    const nextBtn = document.getElementById('tourNextBtn');
    if (nextBtn) {
      nextBtn.innerText = this.currentStep === this.steps.length - 1 ? 'Selesai 🎉' : 'Lanjut ➔';
    }

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });

      setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const padding = 6; 
        
        overlay.style.top = `${rect.top - padding}px`;
        overlay.style.left = `${rect.left - padding}px`;
        overlay.style.width = `${rect.width + (padding * 2)}px`;
        overlay.style.height = `${rect.height + (padding * 2)}px`;

        const tooltipWidth = tooltip.offsetWidth || 280;
        const tooltipHeight = tooltip.offsetHeight || 140;
        
        let tTop = rect.bottom + 16;
        let tLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);

        if (tLeft < 16) tLeft = 16;
        if (tLeft + tooltipWidth > window.innerWidth - 16) tLeft = window.innerWidth - tooltipWidth - 16;

        if (rect.bottom + tooltipHeight > window.innerHeight - 30) {
          tTop = rect.top - tooltipHeight - 16;
        }

        tooltip.style.top = `${tTop}px`;
        tooltip.style.left = `${tLeft}px`;
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translateY(0)';
      }, 350);
    } else {
      overlay.style.width = '0px';
      overlay.style.height = '0px';
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
      tooltip.style.opacity = '1';
    }
  },

  next() {
    this.currentStep++;
    if (this.currentStep >= this.steps.length) {
      this.end();
    } else {
      this.render();
    }
  },

  end() {
    const overlay = document.getElementById('hanaTourOverlay');
    const tooltip = document.getElementById('hanaTourTooltip');
    const celebModal = document.getElementById('hanaTourCelebration');
    
    // Stage 1: Soft collapse the guide bubble tooltip
    if (tooltip) {
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'scale(0.9) translateY(-12px)';
    }
    
    // Stage 2: Massively expand the spotlight mask to dissolve the dark overlay elegantly
    if (overlay) {
      overlay.classList.add('hana-mask-dissolve');
      overlay.style.top = '50%';
      overlay.style.left = '50%';
      overlay.style.width = '200vw';
      overlay.style.height = '200vh';
      overlay.style.transform = 'translate(-50%, -50%)';
      overlay.style.opacity = '0';
    }
    
    // Stage 3: Trigger the Epic Glassmorphism Selebrasi Modal after the mask dissolves
    setTimeout(() => {
      if (overlay) {
        overlay.classList.remove('active', 'hana-mask-dissolve');
        overlay.style.width = '0px';
        overlay.style.height = '0px';
        overlay.style.transform = 'none';
      }
      if (tooltip) tooltip.classList.add('hidden');
      
      // Fire the Selebrasi Card
      if (celebModal) {
        celebModal.classList.remove('hidden');
        // Force reflow
        celebModal.offsetHeight;
        celebModal.classList.add('active');
      }
    }, 450);
    
    localStorage.setItem('hana_tour_completed', 'true');
  },

  closeCelebration() {
    const celebModal = document.getElementById('hanaTourCelebration');
    if (!celebModal) return;
    
    // Fire the custom exit animation class
    celebModal.classList.add('exit');
    celebModal.classList.remove('active');
    
    setTimeout(() => {
      celebModal.classList.add('hidden');
      celebModal.classList.remove('exit');
      // Launch standard premium toast safety banner at the end
      if (typeof showToast === 'function') showToast('Selamat belajar di HANA! 🔥🚀', 'success');
    }, 400);
  }
};

// Replace old welcome toast interval at DOMContentLoaded to launch this tour for fresh profile entries
setTimeout(() => {
  if (!localStorage.getItem('hana_tour_completed')) {
    window.HanaTour.start();
  }
}, 1800);