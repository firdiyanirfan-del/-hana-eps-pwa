// ============================================================
// APP MAIN CONFIG & RUNTIME ENGINES
// ============================================================
const app = {
  data: null,
  // 🟢 KODE BARU DIMASUKKAN DI SINI (SANGAT AMAN)

  // === Backend sync & auth ===
  _backendUrl: window.location.origin,
  _token: localStorage.getItem('eps_token'),

  async syncFromServer() {
    if (!this._token) return;
    try {
      const res = await fetch(`${this._backendUrl}/api/sync`, {
        headers: { 'Authorization': `Bearer ${this._token}` }
      });
      if (res.status === 401) {
        this._token = null;
        this._sessionExpired = true;
        localStorage.removeItem('eps_token');
        this.data.userEmail = '';
        this.data.userAvatar = '';
        this.data.userGoogleName = '';
        this.data.userName = '';
        Storage.set(this.data);
        this.renderDashboard();
        this._updateAllUserInfoDisplays();
        setTimeout(() => {
          if (typeof window.aiChat !== 'undefined' && typeof window.aiChat._showLoginModal === 'function') {
            window.aiChat._showLoginModal();
          } else if (typeof showToast === 'function') {
            showToast('Sesi habis. Silakan login ulang', 'error');
          }
        }, 500);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      if (data.progress) {
        this.data.xp = data.progress.xp || 0;
        this.data.streak = data.progress.streak || 0;
        this.data.badges = data.progress.badges || {};
        this.data.quizHistory = data.progress.quizHistory || [];
        this.data.lifetimeStats = data.progress.lifetimeStats || {};
        this.data.dailyStats = data.progress.dailyStats || {};
        this.data.wrongAnswers = (data.wrongAnswers || []).map(w => ({
          id: w.questionId, level: w.level, type: w.type
        }));
        if (data.settings) {
          if (data.settings.fontFamily) this.data.fontFamily = data.settings.fontFamily;
          if (data.settings.fontSize) this.data.fontSize = data.settings.fontSize;
          if (data.settings.examDate) this.data.examDate = data.settings.examDate;
          this.data.bookmarks = data.settings.bookmarks || [];
          this.data.streakDates = data.settings.streakDates || [];
        }
        this.data.isPremium = data.isPremium || false;
        if (data.user) {
          this.data.userEmail = data.user.email || '';
          this.data.userAvatar = data.user.avatar || this.data.userAvatar;
          this.data.userGoogleName = data.user.name || this.data.userGoogleName;
          if (data.user.name) this.data.userName = data.user.name;
        }
        Storage.set(this.data);
      }
    } catch (e) {
      console.warn('Sync from server failed:', e);
    }
  },

  async syncToServer() {
    if (!this._token) return;
    try {
      await fetch(`${this._backendUrl}/api/sync`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this._token}` },
        body: JSON.stringify({
          progress: {
            xp: this.data.xp || 0,
            streak: this.data.streak || 0,
            lastLogin: this.data.lastLogin || '',
            badges: this.data.badges || {},
            quizHistory: this.data.quizHistory || [],
            dailyStats: this.data.dailyStats || {},
            lifetimeStats: this.data.lifetimeStats || {}
          },
          wrongAnswers: (this.data.wrongAnswers || []).map(w => ({
            questionId: w.id, level: w.level, type: w.type, count: 1
          })),
          settings: {
            fontFamily: this.data.fontFamily || '',
            fontSize: this.data.fontSize || 16,
            examDate: this.data.examDate || '',
            bookmarks: this.data.bookmarks || [],
            streakDates: this.data.streakDates || []
          },
          profile: {
            name: this.data.userName || this.data.userGoogleName || '',
            avatar: this.data.userAvatar || ''
          }
        })
      });
    } catch (e) {
      console.warn('Sync to server failed:', e);
    }
  },

  loginWithGoogle() {
    window.location.href = `${this._backendUrl}/api/auth/google`;
  },

  logout() {
    this._token = null;
    localStorage.removeItem('eps_token');
    this.data.userEmail = '';
    this.data.userAvatar = '';
    this.data.userGoogleName = '';
    this.data.userName = '';
    Storage.set(this.data);
    this.renderDashboard();
    this._updateAllUserInfoDisplays();
    setTimeout(() => { if (typeof showToast === 'function') showToast('Berhasil keluar', 'success'); }, 300);
  },

  async confirmAndLogout() {
    const overlay = document.createElement('div');
    overlay.id = 'logout-confirm-overlay';
    overlay.className = 'fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6';
    overlay.innerHTML =
      `<div class="bg-white dark:bg-[#1C1B1A] rounded-3xl p-7 max-w-sm w-full shadow-2xl border border-[#E4E2DE] dark:border-[#2E2C2A] animate-float-in">
        <div class="flex flex-col items-center text-center gap-4">
          <div class="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-[28px] text-rose-500">logout</span>
          </div>
          <p class="text-base font-semibold text-[#19181A] dark:text-[#F0EFEC]">Yakin ingin keluar?</p>
          <p class="text-sm text-[#65635E] dark:text-[#918fa1]">Kemajuan belajar tetap tersimpan di perangkat ini.</p>
          <div class="flex gap-3 w-full mt-1">
            <button id="logout-cancel" class="flex-1 py-2.5 px-4 bg-[#E4E2DE] dark:bg-[#2E2C2A] text-[#19181A] dark:text-[#F0EFEC] rounded-xl font-semibold text-sm hover:brightness-90 active:scale-[0.97] transition-all">Batal</button>
            <button id="logout-confirm" class="flex-1 py-2.5 px-4 bg-rose-500 text-white rounded-xl font-semibold text-sm hover:brightness-110 active:scale-[0.97] transition-all">Ya, Keluar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    return new Promise((resolve) => {
      document.getElementById('logout-confirm').onclick = () => { overlay.remove(); resolve(true); };
      document.getElementById('logout-cancel').onclick = () => { overlay.remove(); resolve(false); };
      overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
    });
  },

  updateHeroSection() {
    const badge = document.getElementById('hero-chapter-badge');
    const title = document.getElementById('hero-chapter-title');
    const subtitle = document.getElementById('hero-subtitle');
    const ctaText = document.getElementById('hero-cta-text');
    const ctaIcon = document.getElementById('hero-cta-icon');
    if (!badge || !title || !subtitle || !ctaText || !ctaIcon) return;

    const cp = this.data.chapterProgress || {};
    const total = 55;
    let completed = 0;
    let highestUnlocked = 6;
    for (let i = 6; i <= 60; i++) {
      const d = cp[`bab${i}`];
      if (d && d.level1Stars >= 2) completed++;
      if (d && d.unlocked && i > highestUnlocked) highestUnlocked = i;
    }
    const pct = Math.round((completed / total) * 100);
    const next = completed > 0 ? Math.min(highestUnlocked + 1, 60) : 6;
    const xp = this.data.xp || 0;
    const streak = this.data.streak || 0;
    const examDate = this.data.examDate;
    const dailyStats = this.data.dailyStats || {};
    const today = new Date().toISOString().split('T')[0];
    const daysLeft = examDate ? Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24)) : Infinity;

    let badgeText, titleText, subText, cta, icon;

    if (xp === 0) {
      badgeText = 'SELAMAT DATANG';
      titleText = 'Mulai Perjalanan Belajar';
      subText = 'Siap taklukkan EPS-TOPIK?';
      cta = 'MULAI BELAJAR';
      icon = 'rocket_launch';
    } else if (completed >= 10) {
      badgeText = `\u{1F3C6} MASTER`;
      titleText = `${completed} Bab Ditaklukkan!`;
      subText = `Kamu sudah menguasai ${pct}% dari seluruh materi`;
      cta = 'LANJUTKAN';
      icon = 'emoji_events';
    } else if (daysLeft <= 30) {
      badgeText = `\u{1F3AF} D-${daysLeft} UJIAN`;
      titleText = 'Fokus Latihan Soal Intensif!';
      subText = `${pct}% progress — Kejar target!`;
      cta = 'LANJUTKAN';
      icon = 'target';
    } else if (streak >= 3) {
      badgeText = `\u{1F525} STREAK ${streak} HARI`;
      titleText = 'Hebat! Jangan Putus Streak-mu!';
      subText = `Hari ke-${streak} — Pertahankan!`;
      cta = 'LANJUTKAN';
      icon = 'local_fire_department';
    } else if (dailyStats.date === today && (dailyStats.quizzes || 0) > 0) {
      badgeText = '\u{2705} HARI INI';
      titleText = `Bab ${next} Selesai!`;
      subText = `Progress ${pct}% — Besok lagi!`;
      cta = 'LANJUTKAN';
      icon = 'check_circle';
    } else {
      badgeText = '\u{1F3AF} AYO MULAI';
      titleText = 'Siap Latihan Hari Ini?';
      subText = `${pct}% progress — Ayo kejar!`;
      cta = 'LANJUTKAN';
      icon = 'bolt';
    }

    badge.textContent = badgeText;
    title.textContent = titleText;
    subtitle.textContent = subText;
    ctaText.textContent = cta;
    ctaIcon.textContent = icon;
  },
  openTextbook() {
    const ch = this.state.currentChapter || 6;
    const folderKey = "ch" + String(ch).padStart(2, '0');
    if (window.HANA_CHAPTERS_DATABASE && window.HANA_CHAPTERS_DATABASE[folderKey]) {
      this.state.currentChapterTotalPages = window.HANA_CHAPTERS_DATABASE[folderKey].totalPages;
    } else { this.state.currentChapterTotalPages = 10; }
    const titleEl = document.getElementById('textbook-dynamic-title');
    if (titleEl) titleEl.innerText = `Buku Panduan Bab ${ch}`;
    const scrollContainer = document.getElementById('textbook-scroll-container');
    if (scrollContainer) {
      scrollContainer.innerHTML = '';
      scrollContainer.scrollTop = 0;
      for (let i = 1; i <= this.state.currentChapterTotalPages; i++) {
        const img = document.createElement('img');
        img.src = `assets/textbook/${folderKey}/page_${i}.webp`;
        img.alt = `Halaman ${i}`;
        img.className = "w-full h-auto object-contain bg-white dark:bg-[#151c2c] border border-slate-200/40 dark:border-slate-800/60 rounded-2xl shadow-sm p-1 select-none pointer-events-none mb-1";
        img.onerror = function() { this.style.display = 'none'; };
        scrollContainer.appendChild(img);
      }
      const finishCard = document.createElement('div');
      finishCard.className = "w-full py-8 px-2 text-center flex flex-col items-center justify-center border-t border-slate-200/30 dark:border-slate-800/40 mt-6 select-none";
      finishCard.innerHTML = `
        <div class="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-500 rounded-full flex items-center justify-center mb-3 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
        <h4 class="text-sm font-black text-slate-800 dark:text-white">Luar Biasa! Bab Ini Selesai Dibaca</h4>
        <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-[240px] leading-normal font-medium">Ketuk tombol di bawah untuk kembali dan membuka gerbang ujian latihan kuis.</p>
        <button onclick="app.finishTextbookReading()" class="w-full max-w-xs mt-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2">
          Selesai Membaca & Keluar
        </button>
      `;
      scrollContainer.appendChild(finishCard);
      if (!this.state.isScrollEngineBound) {
        this.state.isScrollEngineBound = true;
        let lastScrollTop = 0;
        const headerBar = document.getElementById('textbook-floating-header');
        scrollContainer.addEventListener('scroll', () => {
          let scrollTop = scrollContainer.scrollTop;
          if (headerBar) {
            if (scrollTop > lastScrollTop && scrollTop > 120) { headerBar.style.transform = 'translateY(-100%)'; }
            else { headerBar.style.transform = 'translateY(0)'; }
          }
          lastScrollTop = scrollTop;
        });
      }
    }
    const screen = document.getElementById('screen-textbook');
    if (screen) { screen.classList.remove('hidden'); screen.classList.add('flex'); }
    this.toggleImmersiveMode(true);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },
  closeTextbook() {
    const screen = document.getElementById('screen-textbook');
    if (screen) { screen.classList.add('hidden'); screen.classList.remove('flex'); }
    this.toggleImmersiveMode(false);
  },
  finishTextbookReading() {
    this.closeTextbook();
    if (!this.data.stageProgress.chapters) this.data.stageProgress.chapters = [];
    if (!this.data.stageProgress.chapters.includes(this.state.currentChapter)) {
      this.data.stageProgress.chapters.push(this.state.currentChapter);
      Storage.set(this.data);
      this.updateHeroSection();
    }
    this.openMissionModal(this.state.currentChapter);
  },
  getFilteredChapterQuizPool(chapterNum, levelNum) {
    let pool = [];
    if (!window.Bank) return pool;
    if (levelNum === 1) {
      if (Bank.beginner) {
        if (Bank.beginner.reading) pool = pool.concat(Bank.beginner.reading.filter(q => q.ch === chapterNum));
        if (Bank.beginner.listening) pool = pool.concat(Bank.beginner.listening.filter(q => q.ch === chapterNum));
      }
    } else if (levelNum === 2) {
      if (Bank.normal) {
        if (Bank.normal.reading) pool = pool.concat(Bank.normal.reading.filter(q => q.ch === chapterNum));
        if (Bank.normal.listening) pool = pool.concat(Bank.normal.listening.filter(q => q.ch === chapterNum));
      }
    } else if (levelNum === 3) {
      if (Bank.pro) {
        if (Bank.pro.reading) pool = pool.concat(Bank.pro.reading.filter(q => q.ch === chapterNum));
        if (Bank.pro.listening) pool = pool.concat(Bank.pro.listening.filter(q => q.ch === chapterNum));
      }
    } else if (levelNum === 4) {
      ['beginner', 'normal', 'pro'].forEach(lvl => {
        if (Bank[lvl]) {
          if (Bank[lvl].reading) pool = pool.concat(Bank[lvl].reading.filter(q => q.ch === chapterNum));
          if (Bank[lvl].listening) pool = pool.concat(Bank[lvl].listening.filter(q => q.ch === chapterNum));
        }
      });
    }
    return pool;
  },
  startChapterQuiz(levelNum) {
    const ch = this.state.currentChapter || 6;
    let finalQuestions = this.getFilteredChapterQuizPool(ch, levelNum);
    if (finalQuestions.length === 0) {
      alert(`Maaf, bank data soal untuk Bab ${ch} tingkat level ini sedang dipersiapkan.`);
      return;
    }
    finalQuestions = this.shuffle(finalQuestions);
    let qCount = (levelNum === 4) ? Math.min(finalQuestions.length, 15) : Math.min(finalQuestions.length, 5);
    finalQuestions = finalQuestions.slice(0, qCount);
    this.state.currentMisi = levelNum;
    closeModal('modal-mission');
    closeModal('modal-chapter-selector');
    this.state.isSimulasi = false;
    this.state.isStage = true;
    this.state.isDaily = false;
    this.state.mode = 'chapter';
    const totalSeconds = 15 * 60;
    this.toggleImmersiveMode(true);
    this.setupQuizEngine(finalQuestions, [], `Kuis Bab ${ch}`, totalSeconds, finalQuestions.length);
  },
  setQuizTheme(themeName) {
    const quizScreen = document.getElementById('quiz-screen');
    if (!quizScreen) return;
    
    // Bersihkan tema lama
    quizScreen.classList.remove('theme-sakura', 'theme-forest', 'theme-water', 'theme-autumn', 'theme-winter');
    
    // Pasang tema baru
    if (themeName) {
      quizScreen.classList.add(themeName);
    }
  },

  toggleImmersiveMode(isActive) {
    const bottomNav = document.getElementById('bottom-navigation');
    const aiFloatingBtn = document.getElementById('aiButton');
    if (isActive) {
      if (bottomNav) bottomNav.classList.add('hidden');
      if (aiFloatingBtn) aiFloatingBtn.classList.add('hidden');
    } else {
      if (bottomNav) bottomNav.classList.remove('hidden');
      if (aiFloatingBtn) aiFloatingBtn.classList.remove('hidden');
    }
  },
  state: {
    mode: 'ujian', level: '', isDaily: false, isSimulasi: false, isStage: false, isImageQuiz: false,
    currentStageLevel: '', currentStageNum: 1,
    questions: [], currentIdx: 0, correctCount: 0, readingCorrect: 0, listeningCorrect: 0,
    timer: null, timeLeft: 0, audioPlaysLeft: 2, answers: [],
    silentModeCount: 0, dicAnswers: [], storyLevel: 0, storyQuestionIndex: 0, totalQ: 15,
    pageHidden: false,
    tempSelectedAnswer: null,
    tempSelectedButton: null,
    isAnswerChecked: false,
    microFlashIdx: 0,
    microFlashData: [],
    microQuizAnswered: false,
    rouletteIdx: 0,
    rouletteScore: 0,
    rouletteAnswered: false,
    currentChapterPage: 1,
    currentChapterTotalPages: 0
  },

  init() {
    this.data = Storage.get();
    if (!this.data.wrongAnswers) this.data.wrongAnswers = [];
    if (!this.data.streakDates) this.data.streakDates = [];
    if (!this.data.stageProgress) {
      this.data.stageProgress = {
        beginner: { stage1Score: 0, stage2Score: 0, stage3Score: 0, unlocked: 1 },
        normal: { stage1Score: 0, stage2Score: 0, stage3Score: 0, unlocked: 1 },
        pro: { stage1Score: 0, stage2Score: 0, stage3Score: 0, unlocked: 1 }
      };
    }
    if (!this.data.chapterProgress) this.data.chapterProgress = {};
    let cpDirty = false;
    for (let i = 6; i <= 60; i++) {
      const key = `bab${i}`;
      if (!this.data.chapterProgress[key]) {
        this.data.chapterProgress[key] = { level1Stars: 0, level2Stars: 0, level3Stars: 0, unlocked: i === 6 };
        cpDirty = true;
      }
    }
    if (cpDirty) Storage.set(this.data);
    this.state.storyLevel = this.data.storyLevel || 0;
    this.state.storyQuestionIndex = this.data.storyQuestionIndex || 0;
    
    // --- RESTORE UI SETTINGS ---
    if (this.data.fontFamily && !this.data.fontFamily.includes(' ')) {
      document.documentElement.classList.remove('font-pretendard', 'font-notosans', 'font-gmarket');
      document.documentElement.classList.add(this.data.fontFamily);
    }
    if (this.data.fontSize) {
      document.documentElement.style.setProperty('--q-font-size', this.data.fontSize + 'px');
    }
    
    this.updateStreak();
    this.checkAchievements();
    this.renderDashboard();
    
    // --- SESSION RECOVERY ENGINE ---
    this.recoverSession();

    // --- AUTH CALLBACK ---
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      this._token = token;
      localStorage.setItem('eps_token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
      this.syncFromServer().then(() => {
        Storage.set(this.data);
        this.renderDashboard();
        this._updateAllUserInfoDisplays();
        const email = this.data.userEmail || 'Akun Google';
        setTimeout(() => { if (typeof showToast === 'function') showToast('Berhasil masuk sebagai ' + email, 'success'); }, 500);
      });
    } else if (this._token) {
      this.syncFromServer().then(() => this._updateAllUserInfoDisplays());
    }

    if (!localStorage.getItem('epsWelcomeToastShown')) {
      setTimeout(() => {
        const toast = document.getElementById('welcome-toast');
        if (toast) {
          toast.classList.remove('hidden');
          toast.classList.add('flex');
          setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
              toast.classList.add('hidden');
              toast.classList.remove('flex');
              toast.classList.remove('fade-out');
            }, 400);
          }, 5000);
        }
        localStorage.setItem('epsWelcomeToastShown', 'true');
      }, 1000);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.state.pageHidden = true; }
      else { this.state.pageHidden = false; }
    });

    this.setupInternalFeedback();
    this.renderQuizModeBadge();
    this.updateHeroSection();
    this.initSettings();
    this.toggleBGM();
  },

  updateStreak() {
    const today = new Date().toDateString();
    if (this.data.dailyStats?.date !== today) {
      this.data.dailyStats = { date: today, words: 0, quizzes: 0, minutes: 0 };
    }
    if (this.data.lastLogin !== today) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      this.data.streak = (this.data.lastLogin === y.toDateString()) ? this.data.streak + 1 : 1;
      this.data.lastLogin = today;
      if (!this.data.streakDates) this.data.streakDates = [];
      this.data.streakDates.push(today);
      if (this.data.streakDates.length > 7) this.data.streakDates = this.data.streakDates.slice(-7);
    }
    Storage.set(this.data);
  },

  checkAchievements() {
    if (!this.data.badges) this.data.badges = {};
    if (this.data.xp > 0) this.data.badges.firstQuiz = true;
    if (this.data.streak >= 7) this.data.badges.streak7 = true;
    if (new Date().getHours() >= 22) this.data.badges.nightOwl = true;
    let allUnlocked = true;
    for (let lvl of ['beginner', 'normal', 'pro']) {
      for (let s = 1; s <= 3; s++) {
        if ((this.data.stageProgress[lvl][`stage${s}Score`] || 0) < 80) allUnlocked = false;
      }
    }
    if (allUnlocked) this.data.badges.stageMaster = true;
  },



  loadAndRefreshUI() {
    this.checkAchievements();
    this.renderDashboard();
    this.updateHeroSection();
  },

  renderDashboard() {
    let curLvl = Levels[0], nxt = Levels[1];
    for (let i = 0; i < Levels.length; i++) if (this.data.xp >= Levels[i].threshold) { curLvl = Levels[i]; nxt = Levels[i + 1] || Levels[i]; }
    const xp = this.data.xp || 0;
    const xpInLevel = xp - curLvl.threshold;
    const xpToNext = nxt.threshold - curLvl.threshold;
    const progressPct = xpToNext > 0 ? Math.min(100, Math.round((xpInLevel / xpToNext) * 100)) : 100;

    // Tembak nama user
    const displayName = this.data.userGoogleName || this.data.userName || 'Pelajar';
    const userNameEl = document.getElementById('ui-user-name');
    if (userNameEl) userNameEl.innerText = displayName;
    const profileNameEl = document.getElementById('profile-user-name');
    if (profileNameEl) profileNameEl.innerText = displayName;
    this._renderAvatar();
    
    // Nav: level, XP, streak, progress bar
    const levelEl = document.getElementById('nav-user-level');
    if (levelEl) levelEl.innerText = curLvl.name;
    const xpBar = document.getElementById('nav-xp-bar');
    if (xpBar) xpBar.style.width = `${progressPct}%`;
    const navXp = document.getElementById('nav-xp-text');
    if (navXp) navXp.innerText = `${xp.toLocaleString()} XP`;
    const streakEl = document.getElementById('nav-streak-text');
    if (streakEl) streakEl.innerText = `🔥 Streak ${this.data.streak || 0}`;

    const profileXpEl = document.getElementById('profile-user-xp');
    if(profileXpEl) profileXpEl.innerText = `${xp} XP`;

    // ENGINE KALENDER UJIAN ATAS BARU: RAMPING & AESTETIC (D-DAY FORMAT)
    const examCountdown = document.getElementById('exam-countdown-text');
    if (examCountdown) {
      if (this.data.examDate) {
        const diff = new Date(this.data.examDate) - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days > 0) {
          examCountdown.innerText = `⏱️ D-${days}`;
        } else if (days === 0) {
          examCountdown.innerText = `🎯 Hari Ini!`;
        } else {
          examCountdown.innerText = `📅 Ujian Lewat`;
        }
      } else {
        examCountdown.innerText = '📅 Atur Ujian';
      }
    }
   
    this.updateStageButtons();

    const stats = this.data.lifetimeStats || { readTotal: 0, listTotal: 0, readCorrect: 0, listCorrect: 0 };
    const readAcc = stats.readTotal > 0 ? Math.round((stats.readCorrect / stats.readTotal) * 100) : 0;
    const listAcc = stats.listTotal > 0 ? Math.round((stats.listCorrect / stats.listTotal) * 100) : 0;
    
    const readPct = (readAcc / 100) * 360;
    const listPct = (listAcc / 100) * 360;
    if (document.getElementById('profile-bar-read')) document.getElementById('profile-bar-read').style.setProperty('--progress', readPct + 'deg');
    if (document.getElementById('profile-text-read')) document.getElementById('profile-text-read').innerText = readAcc + '%';
    if (document.getElementById('profile-bar-list')) document.getElementById('profile-bar-list').style.setProperty('--progress', listPct + 'deg');
    if (document.getElementById('profile-text-list')) document.getElementById('profile-text-list').innerText = listAcc + '%';
    
    this.renderDailyMissions();
    this.renderQuizModeBadge();
  },

  renderDailyMissions() {
    const stats = this.data.dailyStats || { words: 0, quizzes: 0, minutes: 0 };
    
    const wordsCount = Math.min(stats.words, 10);
    const mission1Percent = (wordsCount / 10) * 100;
    const txt1 = document.getElementById('mission-1-text');
    const bar1 = document.getElementById('mission-1-bar');
    if (txt1) txt1.innerText = `${wordsCount}/10`;
    if (bar1) bar1.style.width = `${mission1Percent}%`;
    if (wordsCount >= 10 && document.getElementById('mission-1-icon')) document.getElementById('mission-1-icon').innerText = '🎉';

    const quizCount = Math.min(stats.quizzes, 1);
    const mission2Percent = (quizCount / 1) * 100;
    const txt2 = document.getElementById('mission-2-text');
    const bar2 = document.getElementById('mission-2-bar');
    if (txt2) txt2.innerText = `${quizCount}/1`;
    if (bar2) bar2.style.width = `${mission2Percent}%`;
    if (quizCount >= 1 && document.getElementById('mission-2-icon')) document.getElementById('mission-2-icon').innerHTML = '🎉';

    const currentGameProgress = stats.minutes >= 15 ? 5 : 0;
    const mission3Percent = (currentGameProgress / 5) * 100;
    const txt3 = document.getElementById('mission-3-text');
    const bar3 = document.getElementById('mission-3-bar');
    if (txt3) txt3.innerText = `${currentGameProgress}/5`;
    if (bar3) bar3.style.width = `${mission3Percent}%`;
    if (currentGameProgress >= 5 && document.getElementById('mission-3-icon')) document.getElementById('mission-3-icon').innerHTML = '🎉';

    // --- SINKRONISASI MODAL VERTIKAL LIHAT SEMUA ---
    if(document.getElementById('v-mission-1-text')) document.getElementById('v-mission-1-text').innerText = `${wordsCount}/10`;
    if(document.getElementById('v-mission-1-bar')) document.getElementById('v-mission-1-bar').style.width = `${(wordsCount/10)*100}%`;
    if(document.getElementById('v-mission-2-text')) document.getElementById('v-mission-2-text').innerText = `${quizCount}/1`;
    if(document.getElementById('v-mission-2-bar')) document.getElementById('v-mission-2-bar').style.width = `${(quizCount/1)*100}%`;
    if(document.getElementById('v-mission-3-text')) document.getElementById('v-mission-3-text').innerText = `${currentGameProgress}/5`;
    if(document.getElementById('v-mission-3-bar')) document.getElementById('v-mission-3-bar').style.width = `${mission3Percent}%`;

    this._updateAllUserInfoDisplays();
  },

  toggleQuizMode() {
    const currentMode = localStorage.getItem('hana_quiz_play_mode') || 'ujian';
    const newMode = (currentMode === 'belajar') ? 'ujian' : 'belajar';
    localStorage.setItem('hana_quiz_play_mode', newMode);
    this.renderQuizModeBadge();
  },

  renderQuizModeBadge() {
    const badge = document.getElementById('quizModeBadge');
    if (!badge) return;
    const currentMode = localStorage.getItem('hana_quiz_play_mode') || 'ujian';
    if (currentMode === 'belajar') {
      badge.className = "px-3 py-1.5 bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/40 rounded-xl text-[10px] font-black tracking-wide uppercase shadow-sm transition-all duration-200 active:scale-95 flex items-center gap-1 cursor-pointer select-none";
      badge.innerHTML = "<span>📖 Mode Belajar: Panduan ON</span>";
    } else {
      badge.className = "px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 rounded-xl text-[10px] font-black tracking-wide uppercase shadow-sm transition-all duration-200 active:scale-95 flex items-center gap-1 cursor-pointer select-none";
      badge.innerHTML = "<span>⏱️ Mode Ujian: Tanpa Kunci</span>";
    }
  },

  handleDailyMissionClick(type) {
    if (type === 'words') {
      this.openFlashcard();
      this.data.dailyStats.words = (this.data.dailyStats.words || 0) + 2;
      Storage.set(this.data);
    } else if (type === 'quiz') {
      app.startDailyChallenge();
    } else if (type === 'time') {
      showInfoModal('⏱️ Waktu Belajar', `Anda telah fokus belajar selama ${this.data.dailyStats?.minutes || 0} menit hari ini! Terus kerjakan kuis atau flashcard untuk menambah durasi secara otomatis.`);
    }
  },

  // === DATASET KATA KUNCI MANDIRI (EPS-TOPIK ESSENTIALS) ===
  getMicroVocabPool() {
    return [
      { kr: '사과', ro: 'sa-gwa', id: 'Apel' },
      { kr: '의사', ro: 'ui-sa', id: 'Dokter' },
      { kr: '한국어', ro: 'han-gug-eo', id: 'Bahasa Korea' },
      { kr: '공장', ro: 'gong-jang', id: 'Pabrik' },
      { kr: '비행기', ro: 'bi-haeng-gi', id: 'Pesawat Terbang' },
      { kr: '선생님', ro: 'seon-saeng-nim', id: 'Guru' },
      { kr: '경찰관', ro: 'gyeong-chal-gwan', id: 'Polisi' },
      { kr: '자동차', ro: 'ja-dong-cha', id: 'Mobil' },
      { kr: '은행원', ro: 'eun-haeng-won', id: 'Pegawai Bank' },
      { kr: '식당', ro: 'sik-dang', id: 'Restoran' },
      { kr: '안경', ro: 'an-gyeong', id: 'Kacamata' },
      { kr: '가방', ro: 'ga-bang', id: 'Tas' }
    ];
  },

  // === MISI 1: MICRO FLASHCARD ENGINES ===
  startDailyWordMission() {
    if ((this.data.dailyStats?.words || 0) >= 10) {
      if (typeof showInfoModal === 'function') {
        showInfoModal('🌟 Misi Selesai!', 'Misi hari ini sudah selesai! Kamu luar biasa. Istirahatlah sejenak atau coba mode Simulasi untuk menantang diri sendiri. 🌟');
      } else { alert('Misi hari ini sudah selesai! Kamu luar biasa! 🌟'); }
      return;
    }
    
    // Ambil data kosakata dari Bank (reading & listening)
    let vocabBank = [];
    if (window.Bank) {
      for (let level in window.Bank) {
        for (let type of ['reading', 'listening']) {
          (window.Bank[level][type] || []).forEach(q => {
            const kr = q.audio || q.c || '';
            if (/[가-힣]/.test(kr)) {
              let id = '';
              if (q.a && Array.isArray(q.a)) {
                const clean = q.a.filter(opt => typeof opt === 'string' && !/[가-힣]/.test(opt));
                if (clean.length > 0) id = clean.reduce((a, b) => a.length < b.length ? a : b, clean[0]);
              }
              if (!id && q.c && typeof q.c === 'string' && !/[가-힣]/.test(q.c)) id = q.c;
              if (!id) id = q.ex ? q.ex.replace(/<[^>]*>/g, '').split(/[.,;]/)[0].trim() : '';
              if (!id) id = '?';
              vocabBank.push({ kr, id, ro: q.romaji || '' });
            }
          });
        }
      }
    }
    if (vocabBank.length === 0) {
      vocabBank = [
        { kr: '가다', id: 'Pergi' }, { kr: '오다', id: 'Datang' },
        { kr: '먹다', id: 'Makan' }, { kr: '마시다', id: 'Minum' },
        { kr: '사다', id: 'Membeli' }
      ];
    }

    // Acak kata dan ambil 10 soal
    this.state.microFlashData = this.shuffle([...vocabBank]).slice(0, 10);
    this.state.microFlashIdx = 0; // Reset selalu ke 0
    
    // Tampilkan Modal dan Render Kartu Pertama
    document.getElementById('modal-mission-word').classList.remove('hidden');
    window.flashcardEngine.renderCard();
  },

  // === MISI 2: MICRO QUIZ ENGINE (1 QUESTION EXCLUSIVE) ===
  startDailyQuizMission() {
    if ((this.data.dailyStats?.quizzes || 0) >= 1) {
      showInfoModal('🎉 Misi Selesai!', 'Anda telah mengerjakan latihan kilat hari ini. Sampai jumpa besok!');
      return;
    }
    this.state.microQuizAnswered = false;
    const pool = this.getMicroVocabPool();
    const sorted = pool.sort(() => 0.5 - Math.random());
    const target = sorted[0];
    const wrongChoices = sorted.slice(1, 4).map(item => item.id);
    const allChoices = [target.id, ...wrongChoices].sort(() => 0.5 - Math.random());

    document.getElementById('micro-quiz-q-text').innerText = target.kr;
    const feedback = document.getElementById('micro-quiz-feedback');
    feedback.classList.add('hidden');

    const choicesArea = document.getElementById('micro-quiz-choices');
    choicesArea.innerHTML = '';
    
    allChoices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = "w-full p-3.5 bg-[var(--card-bg)] border-2 border-[var(--card-border)] border-b-4 rounded-xl text-left font-bold text-xs transition-all active:translate-y-0.5 active:border-b-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[var(--text-primary)]";
      btn.innerText = choice;
      btn.onclick = () => this.checkMicroQuizAnswer(btn, choice, target.id);
      choicesArea.appendChild(btn);
    });

    document.getElementById('modal-mission-quiz').classList.remove('hidden');
  },

  checkMicroQuizAnswer(clickedBtn, selected, correct) {
    if (this.state.microQuizAnswered) return;
    this.state.microQuizAnswered = true;

    const feedback = document.getElementById('micro-quiz-feedback');
    feedback.classList.remove('hidden');

    if (selected === correct) {
      clickedBtn.className = "w-full p-3.5 bg-emerald-500 border-2 border-emerald-600 text-white rounded-xl text-left font-black text-xs";
      feedback.className = "text-center font-black text-xs p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500";
      feedback.innerText = "🎉 BENAR! +15 XP Ditambahkan.";
      
      this.data.xp = (this.data.xp || 0) + 15;
      if(!this.data.dailyStats) this.data.dailyStats = { date: new Date().toDateString(), words: 0, quizzes: 0, minutes: 0 };
      this.data.dailyStats.quizzes = 1;
      this.data.dailyStats.minutes = (this.data.dailyStats.minutes || 0) + 5;
      Storage.set(this.data);
      this.renderDashboard();
      if(window.fireConfetti) window.fireConfetti();
    } else {
      clickedBtn.className = "w-full p-3.5 bg-rose-500 border-2 border-rose-600 text-white rounded-xl text-left font-black text-xs";
      feedback.className = "text-center font-black text-xs p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-500";
      feedback.innerText = `❌ SALAH! Jawaban benar: ${correct}`;
    }

    setTimeout(() => {
      document.getElementById('modal-mission-quiz').classList.add('hidden');
    }, 2000);
  },

  // === INITIATE ROULETTE 5 SOAL ===
  startDailyGameMission() {
    if ((this.data.dailyStats?.minutes || 0) >= 15) {
      showInfoModal('🎉 Misi Selesai!', 'Anda telah menyelesaikan tantangan Adrenaline Roulette hari ini. Kembali lagi besok!');
      return;
    }
    
    this.state.rouletteIdx = 0;
    this.state.rouletteScore = 0;
    this.state.rouletteAnswered = false;

    this.loadRouletteQuestion();
  },

  // === GENERATOR RAMPAGE 5 MODE ACAK ===
  loadRouletteRound() {
    this.state.rouletteAnswered = false;
    document.getElementById('micro-roulette-progress').innerText = `Soal: ${this.state.rouletteIdx + 1}/5`;
    
    const qZone = document.getElementById('roulette-question-zone');
    const cZone = document.getElementById('roulette-choices-zone');
    const feedback = document.getElementById('roulette-feedback-banner');
    
    feedback.classList.add('hidden');
    cZone.innerHTML = '';
    
    // Casino Slot Spinning Visual Effect
    if (qZone) {
      qZone.innerHTML = `<div class="text-4xl animate-bounce">🎰</div><div class="text-xs font-black uppercase tracking-widest text-amber-500 animate-pulse">MEMUTAR SLOT SOAL...</div>`;
      
      let spinCount = 0;
      const dummyWords = ["사과", "한국어", "회사", "공장", "비상정지", "작업", "반장님"];
      
      const casinoInterval = setInterval(() => {
        const randomWord = dummyWords[Math.floor(Math.random() * dummyWords.length)];
        qZone.innerHTML = `<div class="text-3xl font-black text-slate-400 dark:text-slate-600 opacity-60 blur-[0.5px]">${randomWord}</div>`;
        spinCount++;
        
        if (spinCount > 8) {
          clearInterval(casinoInterval);
          if (navigator.vibrate) navigator.vibrate([50, 50]);
          this.renderActualRouletteContent();
        }
      }, 100);
    }
  },

  renderActualRouletteContent() {
    const qZone = document.getElementById('roulette-question-zone');
    const cZone = document.getElementById('roulette-choices-zone');
    const badge = document.getElementById('roulette-mode-badge');

    const dataset = [
      { kr: '축구', id: 'Sepak Bola', img: 'asset game/football.png' },
      { kr: '자동차', id: 'Mobil', img: 'asset game/car.png' },
      { kr: '스마트폰', id: 'Smartphone', img: 'asset game/smartphone.png' },
      { kr: '버스', id: 'Bus', img: 'asset game/bus.png' },
      { kr: '물고기', id: 'Ikan', img: 'asset game/clown-fish.png' },
      { kr: '교회', id: 'Gereja', img: 'asset game/church.png' },
      { kr: '집', id: 'Rumah', img: 'asset game/house.png' }
    ];

    let currentQ = {};
    if (this.state.rouletteIdx === 0) {
      badge.innerText = "Mode 1: Listen & Strike 🔊";
      badge.className = "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400";
      
      currentQ = dataset[0];
      qZone.innerHTML = `<button onclick="app.speakRouletteWord('${currentQ.kr}')" class="w-16 h-16 rounded-full bg-amber-500 text-white font-bold text-xl shadow-md animate-bounce flex items-center justify-center">🔊</button>
                         <p class="text-xs font-bold text-[var(--text-muted)]">Dengarkan audio lalu tebak arti katanya!</p>`;
      
      this.renderRouletteChoices(['Sepak Bola', 'Mobil', 'Rumah', 'Gereja'], 'Sepak Bola');
      setTimeout(() => { this.speakRouletteWord(currentQ.kr); }, 400);

    } else if (this.state.rouletteIdx === 1) {
      badge.innerText = "Mode 2: Match Madness 🖼️";
      badge.className = "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400";
      
      currentQ = dataset[1];
      qZone.innerHTML = `<img src="${currentQ.img}" class="h-24 w-24 object-contain rounded-xl p-2 bg-white border border-slate-200 shadow-sm animate-scaleUp">
                         <p class="text-xs font-bold text-[var(--text-muted)]">Apa nama kosakata Hangul untuk gambar di atas?</p>`;
      
      this.renderRouletteChoices(['자동차', '버스', '물고기', '집'], '자동차');

    } else if (this.state.rouletteIdx === 2) {
      badge.innerText = "Mode 3: Semantic Text 📝";
      badge.className = "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400";
      
      currentQ = dataset[2];
      qZone.innerHTML = `<h2 class="text-3xl font-black text-[#6C63FF] tracking-wide animate-scaleUp">${currentQ.kr}</h2>
                         <p class="text-xs font-bold text-[var(--text-muted)]">Pilihlah terjemahan bahasa Indonesia yang tepat!</p>`;
      
      this.renderRouletteChoices(['Smartphone', 'Bus', 'Ikan', 'Gereja'], 'Smartphone');

    } else if (this.state.rouletteIdx === 3) {
      badge.innerText = "Mode 4: Word Spelling 🧩";
      badge.className = "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400";
      
      currentQ = dataset[4];
      qZone.innerHTML = `<h2 class="text-2xl font-black text-emerald-500 animate-scaleUp">"IKAN"</h2>
                         <p class="text-xs font-bold text-[var(--text-muted)]">Pilih penulisan Hangul dengan ejaan yang benar!</p>`;
      
      this.renderRouletteChoices(['물고기', '물고기짚', '물구기', '몰고기'], '물고기');

    } else {
      badge.innerText = "Mode 5: Category Strike 🏆";
      badge.className = "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400";
      
      qZone.innerHTML = `<h2 class="text-xl font-black text-rose-500 animate-scaleUp">대중교통 (Transportasi Umum)</h2>
                         <p class="text-xs font-bold text-[var(--text-muted)]">Mana kata di bawah yang termasuk dalam kategori di atas?</p>`;
      
      this.renderRouletteChoices(['버스', '물고기', '교회', '축구'], '버스');
    }
  },

  renderRouletteChoices(options, correct) {
    const cZone = document.getElementById('roulette-choices-zone');
    options.sort(() => 0.5 - Math.random()).forEach(opt => {
      const btn = document.createElement('button');
      btn.className = "w-full p-3.5 bg-[var(--card-bg)] border-2 border-[var(--card-border)] border-b-4 rounded-xl text-left font-bold text-xs transition-all active:translate-y-0.5 active:border-b-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[var(--text-primary)]";
      btn.innerText = opt;
      btn.onclick = () => this.checkRouletteAnswer(btn, opt, correct);
      cZone.appendChild(btn);
    });
  },

  speakRouletteWord(word) {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = 'ko-KR'; u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  },

  checkRouletteAnswer(clickedBtn, selected, correct) {
    if (this.state.rouletteAnswered) return;
    this.state.rouletteAnswered = true;

    const feedback = document.getElementById('roulette-feedback-banner');
    feedback.classList.remove('hidden');

    if (selected === correct) {
      this.state.rouletteScore++;
      clickedBtn.className = "w-full p-3.5 bg-emerald-500 border-2 border-emerald-600 text-white rounded-xl text-left font-black text-xs";
      feedback.className = "text-center font-black text-xs p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 w-full";
      feedback.innerText = "🎉 MANTAP! Jawaban Anda Benar.";
      if (typeof confetti !== 'undefined') confetti({ particleCount: 25, spread: 35, origin: { y: 0.7 } });
    } else {
      clickedBtn.className = "w-full p-3.5 bg-rose-500 border-2 border-rose-600 text-white rounded-xl text-left font-black text-xs";
      feedback.className = "text-center font-black text-xs p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 w-full";
      feedback.innerText = `❌ KURANG TEPAT! Solusi: ${correct}`;
    }

    setTimeout(() => {
      if (this.state.rouletteIdx < 4) {
        this.state.rouletteIdx++;
        this.loadRouletteRound();
      } else {
        document.getElementById('screen-roulette').classList.add('hidden');
        
        this.data.xp = (this.data.xp || 0) + 10;
        if(!this.data.dailyStats) this.data.dailyStats = { date: new Date().toDateString(), words: 0, quizzes: 0, minutes: 0 };
        this.data.dailyStats.minutes = 15;
        Storage.set(this.data);
        this.renderDashboard();
        
        if (window.fireConfetti) window.fireConfetti();
        showInfoModal('🏆 Tantangan Selesai!', `Selamat! Anda menyelesaikan 5 soal Adrenaline Roulette dengan skor ${this.state.rouletteScore}/5. Bonus +10 XP berhasil diklaim.`);
      }
    }, 1500);
  },

  openAllMissionsSheet() {
    const overlay = document.getElementById('modal-all-missions');
    const panel = document.getElementById('all-missions-content');
    if (!overlay || !panel) return;
    overlay.classList.remove('hidden');
    overlay.style.opacity = '0';
    panel.classList.remove('translate-y-full');
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      panel.classList.add('translate-y-0');
      panel.classList.remove('translate-y-full');
    });
    this.renderDailyMissions();
  },
  closeAllMissionsSheet() {
    const overlay = document.getElementById('modal-all-missions');
    const panel = document.getElementById('all-missions-content');
    if (!overlay || !panel) return;
    panel.classList.remove('translate-y-0');
    panel.classList.add('translate-y-full');
    overlay.style.opacity = '0';
    setTimeout(() => overlay.classList.add('hidden'), 300);
  },

  updateStageButtons() {
    const levels = ['beginner', 'normal', 'pro'];
    levels.forEach(level => {
      const progress = this.data.stageProgress[level];
      for (let s = 1; s <= 3; s++) {
        const btn = document.getElementById(`${level}-stage-${s}`);
        if (btn) {
          const unlocked = s <= progress.unlocked;
          btn.disabled = !unlocked;
          if (unlocked) {
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
            btn.classList.add('bg-[var(--color-primary)]', 'text-white', 'border-[var(--color-primary)]');
            btn.classList.remove('bg-slate-50', 'text-slate-600', 'border-slate-200');
          } else {
            btn.classList.add('opacity-50', 'cursor-not-allowed');
            btn.classList.remove('bg-[var(--color-primary)]', 'text-white', 'border-[var(--color-primary)]');
            btn.classList.add('bg-slate-50', 'text-slate-400', 'border-slate-200');
          }
          const score = progress[`stage${s}Score`];
          btn.textContent = score > 0 ? `Stage ${s} ${score}%` : `Stage ${s}`;
        }
      }
    });
  },

  shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; },

  promptUsername() {
    const name = prompt('Masukkan nama pengguna Anda:', this.data.userName || '');
    if (name !== null && name.trim() !== '') {
      this.data.userName = name.trim();
      Storage.set(this.data);
      this.renderDashboard();
    }
  },
  promptAuth() {
    this.loginWithGoogle();
  },
  promptExamDate() {
    // Open the modern date picker modal instead of browser prompt
    const modal = document.getElementById('modal-date-picker');
    const input = document.getElementById('exam-date-input');
    if (modal && input) {
      // Set current saved date if exists
      if (this.data.examDate) {
        input.value = this.data.examDate;
        this.updateDatePickerPreview(this.data.examDate);
      } else {
        input.value = '';
        document.getElementById('date-picker-preview').classList.add('hidden');
        showInfoModal('📅 Atur Jadwal', 'Kalender ujian belum diatur. Yuk, atur tanggal ujian pertamamu agar Hana bisa membantu menghitung persiapan belajarmu! 📅');
      }
      modal.classList.remove('hidden');
    }
  },
  setQuickDate(days) {
    const input = document.getElementById('exam-date-input');
    if (input) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const formatted = targetDate.toISOString().split('T')[0];
      input.value = formatted;
      this.updateDatePickerPreview(formatted);
    }
  },
  updateDatePickerPreview(dateStr) {
    const preview = document.getElementById('date-picker-preview');
    const daysDisplay = document.getElementById('countdown-days-display');
    const dateDisplay = document.getElementById('countdown-date-display');

    if (!dateStr || !preview) return;

    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0) {
      daysDisplay.textContent = diffDays;
      preview.classList.remove('hidden');

      // Format the date nicely
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      dateDisplay.textContent = targetDate.toLocaleDateString('id-ID', options);
    } else {
      daysDisplay.textContent = '✕';
      dateDisplay.textContent = 'Tanggal sudah lewat';
    }
  },
  clearExamDate() {
    this.data.examDate = null;
    Storage.set(this.data);
    document.getElementById('exam-date-input').value = '';
    document.getElementById('date-picker-preview').classList.add('hidden');
    this.renderDashboard();
    document.getElementById('modal-date-picker').classList.add('hidden');
  },
  saveExamDate() {
    const input = document.getElementById('exam-date-input');
    const dateStr = input.value;
    if (dateStr) {
      this.data.examDate = dateStr;
      Storage.set(this.data);
      this.renderDashboard();
      document.getElementById('modal-date-picker').classList.add('hidden');
      showInfoModal('✅ Tanggal Tersimpan', `Countdown ujian Anda: ${document.getElementById('countdown-days-display').textContent} hari lagi!`);
    }
  },
  saveUsername() {
    const input = document.getElementById('username-input');
    const name = input.value.trim();
    if (name) {
      this.data.userName = name;
      Storage.set(this.data);

      // Update all profile nodes dynamically without page reload
      const userNameEl = document.getElementById('ui-user-name');
      if (userNameEl) userNameEl.textContent = name;
      const profileNameEl = document.getElementById('profile-user-name');
      if (profileNameEl) profileNameEl.textContent = name;

      const mapMiniEl = document.getElementById('map-mini-profile');
      if (mapMiniEl) {
        let curLvl = Levels[0];
        for (let i = 0; i < Levels.length; i++) {
          if (this.data.xp >= Levels[i].threshold) curLvl = Levels[i];
        }
        mapMiniEl.textContent = `${curLvl.name} (${this.data.xp} XP)`;
      }

      document.getElementById('modal-edit-username').classList.add('hidden');
      showInfoModal('✅ Nama Tersimpan', `Hai ${name}! Nama Anda telah diperbarui.`);
      this.syncToServer();
    }
  },
  onUsernameInput(input) {
    // Update character count
    const countEl = document.getElementById('username-char-count');
    if (countEl) {
      countEl.textContent = `${input.value.length}/24`;
    }
    // Handle floating label animation
    const label = document.getElementById('username-floating-label');
    if (label) {
      if (input.value.length > 0) {
        label.style.top = '-10px';
        label.style.fontSize = '10px';
        label.classList.add('text-indigo-500');
        label.classList.remove('text-slate-400');
      } else {
        label.style.top = '14px';
        label.style.fontSize = '12px';
        label.classList.remove('text-indigo-500');
        label.classList.add('text-slate-400');
      }
    }
  },
  previewFont(fontName, btnElement) {
    const previewBox = document.getElementById('settings-preview-box');
    if (!previewBox) return;

    previewBox.classList.remove('font-pretendard', 'font-notosans', 'font-gmarket');
    previewBox.classList.add(`font-${fontName}`);

    const picker = document.getElementById('font-family-picker');
    if (picker) {
      picker.querySelectorAll('button').forEach(btn => {
        btn.classList.remove('font-btn-selected');
        btn.classList.add('font-btn-default');
      });
      if (btnElement) {
        btnElement.classList.remove('font-btn-default');
        btnElement.classList.add('font-btn-selected');
      }
    }
  },
  previewFontSize(size) {
    const previewBox = document.getElementById('settings-preview-box');
    const label = document.getElementById('font-size-label');
    if (!previewBox) return;

    // Apply size to preview only
    previewBox.style.fontSize = size + 'px';
    if (label) label.textContent = size + 'px';
  },
  applyFontSettings() {
    // Get current selections
    const slider = document.getElementById('font-size-slider');
    const previewBox = document.getElementById('settings-preview-box');

    // Get font size
    const fontSize = slider ? parseInt(slider.value) : (this.data.fontSize || 16);

    // Get selected font from preview's class
    let fontFamily = this.data.fontFamily || 'font-pretendard';
    if (previewBox) {
      if (previewBox.classList.contains('font-pretendard')) fontFamily = 'font-pretendard';
      else if (previewBox.classList.contains('font-notosans')) fontFamily = 'font-notosans';
      else if (previewBox.classList.contains('font-gmarket')) fontFamily = 'font-gmarket';
    }

    // Apply globally via CSS variables
    document.documentElement.style.setProperty('--app-global-font', fontFamily);
    document.documentElement.style.setProperty('--app-global-size', fontSize + 'px');
    document.documentElement.style.setProperty('--q-font-size', fontSize + 'px');

    // Set font family on root
    document.documentElement.classList.remove('font-pretendard', 'font-notosans', 'font-gmarket');
    document.documentElement.classList.add(fontFamily);

    // Save to storage
    this.data.fontFamily = fontFamily;
    this.data.fontSize = fontSize;
    Storage.set(this.data);

    // Show success feedback
    if (typeof showToast === 'function') {
      showToast('Pengaturan font berhasil disimpan! ✨', 'success');
    }
  },
  setupInternalFeedback() {
    this.feedbackCategory = 'saran';

    const categories = {
      saran: { title: 'Saran & Masukan', placeholder: 'Tulis saran atau masukan Anda untuk pengembangan aplikasi...', subject: '[SARAN] - Aplikasi EPS-TOPIK' },
      dukungan: { title: 'Dukungan & Pertanyaan', placeholder: 'Ajukan pertanyaan atau minta dukungan teknis di sini...', subject: '[TANYA] - Aplikasi EPS-TOPIK' },
      bug: { title: 'Laporkan Bug / Error', placeholder: 'Jelaskan langkah-langkah munculnya bug, perilaku yang diharapkan, dan yang terjadi...', subject: '[BUG REPORT] - Aplikasi EPS-TOPIK' }
    };

    const openFeedback = (type) => {
      this.feedbackCategory = type;
      const cat = categories[type];
      document.getElementById('feedback-title').textContent = cat.title;
      document.getElementById('feedback-message').placeholder = cat.placeholder;
      document.getElementById('feedback-message').value = '';
      document.getElementById('screen-feedback').classList.remove('hidden');
    };

    document.getElementById('btn-saran').addEventListener('click', () => openFeedback('saran'));
    const btnDukungan = document.getElementById('btn-dukungan');
    if (btnDukungan) btnDukungan.addEventListener('click', () => openFeedback('dukungan'));
    document.getElementById('btn-bug').addEventListener('click', () => openFeedback('bug'));

    document.getElementById('btn-back-feedback').addEventListener('click', () => {
      document.getElementById('screen-feedback').classList.add('hidden');
    });

    document.getElementById('btn-submit-feedback').addEventListener('click', async () => {
      const msg = document.getElementById('feedback-message').value.trim();
      if (!msg) {
        alert('Pesan tidak boleh kosong. Silakan tulis sesuatu sebelum mengirim.');
        return;
      }

      const btn = document.getElementById('btn-submit-feedback');
      const btnText = document.getElementById('submit-feedback-text');
      btn.disabled = true;
      btnText.textContent = 'Sedang Mengirim...';

      const cat = categories[this.feedbackCategory];
      const payload = {
        Kategori: cat.title,
        Pesan: msg,
        NamaPengguna: this.data.userName || 'Pelajar',
        TotalXP: this.data.xp || 0,
        StreakHari: this.data.streak || 0,
        EmailDummy: this.data.userEmail || ''
      };

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (this._token) headers['Authorization'] = `Bearer ${this._token}`;
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers,
          body: JSON.stringify({ type: this.feedbackCategory, message: msg })
        });
        if (res.ok) {
          alert('Sukses! Laporan Anda telah terkirim.');
          document.getElementById('feedback-message').value = '';
          document.getElementById('screen-feedback').classList.add('hidden');
        } else {
          alert('Gagal mengirim. Periksa koneksi internet Anda dan coba lagi.');
        }
      } catch {
        alert('Gagal mengirim. Periksa koneksi internet Anda dan coba lagi.');
      } finally {
        btn.disabled = false;
        btnText.textContent = 'Kirim Sekarang';
      }
    });
  },
  setFontFamily(font) {
    document.documentElement.classList.remove('font-pretendard', 'font-notosans', 'font-gmarket');
    document.documentElement.classList.add(`font-${font}`);
    this.data.fontFamily = `font-${font}`;
    Storage.set(this.data);
  },
  changeFontSize(delta) {
    let current = this.data.fontSize || 16;
    current += delta;
    if (current < 14) current = 14;
    if (current > 26) current = 26;
    this.data.fontSize = current;
    Storage.set(this.data);
    document.documentElement.style.setProperty('--q-font-size', current + 'px');
  },
  openFlashcard() {
    this.switchScreen('flashcard-screen');
    window.flashcardEngine._ensureVocab();
    window.flashcardEngine._updateChapterLabel();
    window.flashcardEngine._renderFlashcardScreen(window.flashcardEngine.vocabIndex || 0);
  },
  flipFlashcard() { window.flashcardEngine.flip(); },
  nextFlashcard() {
    // Cek apakah flashcard-screen sedang aktif
    const screen = document.getElementById('flashcard-screen');
    if (screen && !screen.classList.contains('hidden')) {
      const filtered = window.flashcardEngine._applyFilterToVocab();
      if (window.flashcardEngine.vocabIndex < filtered.length - 1) {
        window.flashcardEngine.vocabIndex++;
        window.flashcardEngine._renderFlashcardScreen(window.flashcardEngine.vocabIndex);
      }
    } else {
      window.flashcardEngine.next();
    }
  },
  prevFlashcard() {
    const screen = document.getElementById('flashcard-screen');
    if (screen && !screen.classList.contains('hidden')) {
      if (window.flashcardEngine.vocabIndex > 0) {
        window.flashcardEngine.vocabIndex--;
        window.flashcardEngine._renderFlashcardScreen(window.flashcardEngine.vocabIndex);
      }
    } else {
      window.flashcardEngine.prev();
    }
  },

  startDictation() {
    DictationEngine.init();
    this.switchScreen('dictation-screen');
    DictationEngine.updateUI();
  },
  playDictationAudio() { DictationEngine.playAudio(); },
  checkDictation() { DictationEngine.check(); },
  nextDictation() { DictationEngine.next(); },
  skipDictation() { DictationEngine.next(); },


  switchScreen(screenId, options = {}) {
    hideAllScreens();
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.remove('hidden');
      if (options.flex !== false) target.classList.add('flex');
    }
    if (options.immersive) this.toggleImmersiveMode(true);
    else if (options.showNav) this.toggleImmersiveMode(false);
    if (options.callback) options.callback();
  },

  showDashboard() {
    clearInterval(this.state.timer);
    this.init();
    this.switchScreen('dashboard-screen', { showNav: true, callback: () => this.setQuizTheme('') });
  },

  openSettings() {
    const overlay = document.getElementById('settings-overlay');
    const screen = document.getElementById('settings-screen');
    if (!overlay || !screen) return;
    
    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      screen.classList.add('is-open');
      document.body.style.overflow = "hidden";
    });
    
    history.pushState({ settingsOpen: true }, "");

    // Populate profile card data
    const nameEl = document.getElementById('settings-profile-name');
    if (nameEl) nameEl.textContent = this.data.userName || 'Pelajar';
    const xpEl = document.getElementById('settings-profile-xp');
    if (xpEl) xpEl.textContent = (this.data.xp || 0) + ' XP';

    // Premium badge visibility
    const premiumBadge = document.getElementById('settings-premium-badge');
    if (premiumBadge) {
      if (this.data.isPremium) {
        premiumBadge.classList.remove('hidden');
      } else {
        premiumBadge.classList.add('hidden');
      }
    }

    // Sync font button state
    const savedFont = this.data.fontFamily || 'font-pretendard';
    const fontMap = { 'font-pretendard': 'font-btn-pretendard', 'font-notosans': 'font-btn-notosans', 'font-gmarket': 'font-btn-gmarket' };
    const activeBtn = document.getElementById(fontMap[savedFont]);
    if (activeBtn) this.previewFont(savedFont.replace('font-', ''), activeBtn);

    // Restore font size slider
    const sizeSlider = document.getElementById('font-size-slider');
    const sizeLabel = document.getElementById('font-size-label');
    const savedSize = this.data.fontSize || 16;
    if (sizeSlider) sizeSlider.value = savedSize;
    if (sizeLabel) sizeLabel.textContent = savedSize + 'px';

    const examEl = document.getElementById('settings-exam-text');
    if (examEl) {
      if (this.data.examDate) {
        const diff = new Date(this.data.examDate) - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days > 0) examEl.innerHTML = '<span class="material-symbols-outlined text-[14px] text-[var(--hana-text-2)]">calendar_today</span> D-' + days;
        else if (days === 0) examEl.innerHTML = '<span class="material-symbols-outlined text-[14px] text-amber-400">celebration</span> Hari Ini!';
        else examEl.innerHTML = '<span class="material-symbols-outlined text-[14px] text-rose-400">event_busy</span> Sudah Lewat';
      } else {
        examEl.innerHTML = '<span class="material-symbols-outlined text-[14px] text-[var(--hana-text-2)]">calendar_today</span> Atur Tanggal';
      }
    }

    // Tampilkan status Akun berdasarkan login
    const accEmail = document.getElementById('settings-account-email');
    const loggedInActions = document.getElementById('settings-logged-in-actions');
    const loggedOutActions = document.getElementById('settings-logged-out-actions');
    if (accEmail) {
      if (this.data.userEmail) {
        accEmail.textContent = this.data.userEmail;
        if (loggedInActions) loggedInActions.classList.remove('hidden');
        if (loggedOutActions) loggedOutActions.classList.add('hidden');
      } else {
        accEmail.textContent = 'Belum masuk';
        if (loggedInActions) loggedInActions.classList.add('hidden');
        if (loggedOutActions) loggedOutActions.classList.remove('hidden');
      }
    }
  },

  closeSettings(callback) {
    const overlay = document.getElementById('settings-overlay');
    const screen = document.getElementById('settings-screen');
    if (!overlay || !screen) return;
    
    overlay.classList.remove('is-open');
    screen.classList.remove('is-open');
    
    setTimeout(() => {
      const ps = document.getElementById('profile-screen');
      if (!ps || ps.classList.contains('hidden')) document.body.style.overflow = "";
      if (typeof callback === 'function') callback();
    }, 350);
  },

  async deleteAccount() {
    const overlay = document.createElement('div');
    overlay.id = 'delete-account-overlay';
    overlay.className = 'fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6';
    overlay.innerHTML =
      `<div class="bg-white dark:bg-[#1C1B1A] rounded-3xl p-7 max-w-sm w-full shadow-2xl border border-[#E4E2DE] dark:border-[#2E2C2A] animate-float-in">
        <div class="flex flex-col items-center text-center gap-4">
          <div class="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-[28px] text-red-500">delete_forever</span>
          </div>
          <p class="text-base font-semibold text-[#19181A] dark:text-[#F0EFEC]">Hapus Akun Permanen?</p>
          <p class="text-sm text-[#65635E] dark:text-[#918fa1]">Semua data termasuk progress, XP, dan riwayat akan dihapus dari server. Tindakan ini tidak bisa dibatalkan.</p>
          <div class="flex gap-3 w-full mt-1">
            <button id="delete-account-cancel" class="flex-1 py-2.5 px-4 bg-[#E4E2DE] dark:bg-[#2E2C2A] text-[#19181A] dark:text-[#F0EFEC] rounded-xl font-semibold text-sm hover:brightness-90 active:scale-[0.97] transition-all">Batal</button>
            <button id="delete-account-confirm" class="flex-1 py-2.5 px-4 bg-red-500 text-white rounded-xl font-semibold text-sm hover:brightness-110 active:scale-[0.97] transition-all">Hapus Akun</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const ok = await new Promise((resolve) => {
      document.getElementById('delete-account-confirm').onclick = () => { overlay.remove(); resolve(true); };
      document.getElementById('delete-account-cancel').onclick = () => { overlay.remove(); resolve(false); };
      overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
    });
    if (!ok) return;
    try {
      const res = await fetch(`${this._backendUrl}/api/account`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this._token}` }
      });
      if (!res.ok) { showToast('Gagal menghapus akun', 'error'); return; }
      this._token = null;
      localStorage.removeItem('eps_token');
      Storage.clear();
      showToast('Akun berhasil dihapus', 'success');
      setTimeout(() => location.reload(), 1500);
    } catch (e) {
      showToast('Gagal terhubung ke server', 'error');
    }
  },

  async handleSettingsLogout() {
    const ok = await this.confirmAndLogout();
    if (!ok) return;
    this.closeSettings();
    this.logout();
  },

  _updateAllUserInfoDisplays() {
    const navName = document.getElementById('ui-user-name');
    if (navName) navName.innerText = this.data.userGoogleName || this.data.userName || 'Pelajar';
    const profileName = document.getElementById('profile-user-name');
    if (profileName) profileName.innerText = this.data.userGoogleName || this.data.userName || 'Pelajar';
    const settingsName = document.getElementById('settings-account-email');
    if (settingsName) {
      if (this.data.userEmail) settingsName.textContent = 'Masuk sebagai ' + this.data.userEmail;
      else settingsName.textContent = 'Belum masuk';
    }
  },

  // ============================================================
  // PROFILE SCREEN (Full-Screen Stitch)
  // ============================================================
  openProfile() {
    const screen = document.getElementById('profile-screen');
    if (!screen) return;
    screen.classList.remove('hidden');
    screen.classList.add('flex');
    document.body.style.overflow = 'hidden';
    screen.scrollTop = 0;

    const nameEl = document.getElementById('profile-user-name');
    if (nameEl) nameEl.textContent = this.data?.userGoogleName || this.data?.userName || 'Pelajar';
    const emailEl = document.getElementById('profile-user-email');
    if (emailEl) emailEl.textContent = this.data?.userEmail ? 'Masuk sebagai ' + this.data.userEmail : '';
    const xpEl = document.getElementById('profile-user-xp');
    if (xpEl) xpEl.textContent = (this.data.xp || 0) + ' XP';
    this._renderAvatar();

    // Premium badge visibility
    const premiumBadge = document.getElementById('profile-premium-badge');
    if (premiumBadge) {
      premiumBadge.classList.toggle('hidden', !this.data.isPremium);
    }

    const sesiEl = document.getElementById('profile-sessions-count');
    if (sesiEl) {
      const count = this.data.quizHistory?.length || 0;
      sesiEl.textContent = count + ' Sesi Selesai';
    }

    const examEl = document.getElementById('profile-exam-text');
    if (examEl) {
      if (this.data.examDate) {
        const diff = new Date(this.data.examDate) - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days > 0) examEl.textContent = days + ' Hari Lagi';
        else if (days === 0) examEl.textContent = 'Hari Ini!';
        else examEl.textContent = 'Sudah Lewat';
      } else {
        examEl.textContent = 'Atur Tanggal';
      }
    }

    const logoutBtn = document.getElementById('profile-logout-btn');
    if (logoutBtn) {
      if (this._token) {
        logoutBtn.innerHTML = '<span class="material-symbols-outlined">logout</span> Logout';
        logoutBtn.onclick = async () => {
          const ok = await this.confirmAndLogout();
          if (!ok) return;
          this.logout();
          this.renderDashboard();
          this.openProfile();
        };
      } else {
        logoutBtn.innerHTML = '<span class="material-symbols-outlined">login</span> Login';
        logoutBtn.onclick = () => {
          this.promptAuth();
          setTimeout(() => this.openProfile(), 100);
        };
      }
    }

    if (typeof this.renderBadges === 'function') this.renderBadges();
    if (typeof this.renderStreakCalendar === 'function') this.renderStreakCalendar();
    this.renderDashboard();
  },

  closeProfile() {
    const screen = document.getElementById('profile-screen');
    if (!screen) return;
    screen.classList.add('hidden');
    screen.classList.remove('flex');
    document.body.style.overflow = '';
  },

  toggleHistoryDetail() {
    const el = document.getElementById('profile-history-detail');
    if (!el) return;
    const isHidden = el.classList.contains('hidden');
    el.classList.toggle('hidden');
    if (isHidden) this.renderHistoryDetail();
  },

  renderHistoryDetail() {
    const container = document.getElementById('profile-history-detail');
    if (!container) return;
    const history = this.data.quizHistory || [];
    container.innerHTML = history.length
      ? history.map((q, i) => `
          <div class="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg bg-[var(--hana-primary)]/10 text-[var(--hana-primary)] flex items-center justify-center text-[11px] font-extrabold">${i + 1}</span>
              <span class="text-xs font-bold text-[var(--text-primary)]">${q.date || '—'}</span>
            </div>
            <span class="text-xs font-extrabold ${q.score >= 80 ? 'text-emerald-500' : q.score >= 50 ? 'text-amber-500' : 'text-red-400'}">${q.score || 0}%</span>
          </div>`).join('')
      : '<p class="text-xs text-[var(--text-secondary)] text-center py-4 font-medium">Belum ada riwayat quiz</p>';
  },

  // ============================================================
  // SETTINGS TOGGLES: BGM, VIBRATION, BATTERY SAVER
  // ============================================================
  initSettings() {
    if (!this.data.settings) {
      this.data.settings = { bgm: true, vibration: true, batterySaver: false };
    }
    this.restoreSettingToggles();

    const bgmToggle = document.getElementById('bgmToggle');
    if (bgmToggle) {
      bgmToggle.addEventListener('change', (e) => {
        this.data.settings.bgm = e.target.checked;
        Storage.set(this.data);
        this.toggleBGM();
      });
    }

    const vibToggle = document.getElementById('vibrationToggle');
    if (vibToggle) {
      vibToggle.addEventListener('change', (e) => {
        this.data.settings.vibration = e.target.checked;
        Storage.set(this.data);
      });
    }

    const batToggle = document.getElementById('batterySaverToggle');
    if (batToggle) {
      batToggle.addEventListener('change', (e) => {
        this.data.settings.batterySaver = e.target.checked;
        Storage.set(this.data);
      });
    }
  },

  restoreSettingToggles() {
    const sync = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = val;
    };
    sync('bgmToggle', this.data.settings.bgm !== false);
    sync('vibrationToggle', this.data.settings.vibration !== false);
    sync('batterySaverToggle', this.data.settings.batterySaver === true);
  },

  toggleBGM() {
    const bgm = document.getElementById('bgm-audio');
    if (!bgm) return;
    
    const isBgmActive = this.data.settings ? this.data.settings.bgm !== false : true;
    
    if (isBgmActive) {
      bgm.volume = 0.2;
      bgm.play().catch(error => {

      });
    } else {
      bgm.pause();
    }
  },

  showWelcomeMessage() {
    if (this.data.xp === 0 && !localStorage.getItem('epsHanaWelcomeShown')) {
      showInfoModal('Halo dari Hana! 👋', 'Senang bertemu denganmu! Aku Hana, teman belajarmu. Mari kita mulai perjalanan menuju Korea Selatan dengan langkah kecil hari ini.');
      localStorage.setItem('epsHanaWelcomeShown', 'true');
    }
  },

  showFriendlyError() {
    showInfoModal('✨ Ada Kendala', 'Ups, sepertinya ada kendala kecil. Jangan khawatir, Hana sedang memperbaikinya. Coba buka kembali aplikasinya ya! ✨');
  },

  handleAvatarUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.data.userAvatar = e.target.result;
      Storage.set(this.data);
      this._renderAvatar();
    };
    reader.readAsDataURL(file);
  },

  _renderAvatar() {
    const src = this.data.userAvatar || 'assets/hana_thinking.png';
    const navImg = document.getElementById('nav-avatar-img');
    if (navImg) navImg.src = src;
    const profileImg = document.getElementById('profile-avatar-img');
    if (profileImg) profileImg.src = src;
  },

  // ============================================================
  // ENGINE TAMBAHAN: MODE LATIHAN PER BAB (BAB 6 - 60)
  // ============================================================
  showChapterScreen() {
    const modal = document.getElementById('modal-chapter-selector');
    const grid = document.getElementById('chapter-grid-container');
    const progressText = document.getElementById('chapter-progress-text');
    const progressBar = document.getElementById('chapter-global-bar');
    const countBadge = document.getElementById('chapter-count-badge');

    const cp = this.data.chapterProgress || {};
    const total = 55;
    let completed = 0;
    for (let i = 6; i <= 60; i++) {
      const key = `bab${i}`;
      if (cp[key] && cp[key].level1Stars >= 2) completed++;
    }
    const pct = Math.round((completed / total) * 100);
    if (progressText) progressText.textContent = `${completed}/${total} Bab Selesai`;
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (countBadge) countBadge.textContent = `${completed}/${total}`;

    const starColors = ['text-amber-400', 'text-emerald-400', 'text-indigo-400'];
    const starEmpty = 'text-slate-300 dark:text-slate-600';
    function starsHtml(d) {
      const l1 = d.level1Stars || 0; const l2 = d.level2Stars || 0; const l3 = d.level3Stars || 0;
      const arr = [l1 >= 1, l2 >= 1, l3 >= 1];
      return arr.map((filled, idx) =>
        `<span class="${filled ? starColors[idx] : starEmpty} text-[8px] leading-none">${filled ? '★' : '☆'}</span>`
      ).join('');
    }

    let html = '<div class="grid grid-cols-4 gap-4 md:gap-6">';
    for (let i = 6; i <= 60; i++) {
      const key = `bab${i}`;
      const data = cp[key] || { level1Stars: 0, level2Stars: 0, level3Stars: 0, unlocked: i === 6 };
      const isUnlocked = data.unlocked === true;
      const isCompleted = data.level1Stars >= 2;
      const isActive = isUnlocked && !isCompleted;
      const stars = starsHtml(data);

      if (isCompleted) {
        html += `<button onclick="app.openMissionModal(${i})"
          class="chapter-node aspect-square rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 bg-[#6C63FF] dark:bg-[#6C63FF] text-white shadow-lg shadow-[#6C63FF]/30 active:scale-90 hover:shadow-xl hover:shadow-[#6C63FF]/40"
          data-chapter="${i}">
          <span class="material-symbols-outlined text-[14px] font-bold">check</span>
          <span class="text-sm font-black leading-none mt-0.5">${i}</span>
          <span class="flex items-center gap-[1px]">${stars}</span>
          <span class="text-[7px] font-black bg-white/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider leading-none mt-0.5">LULUS</span>
        </button>`;
      } else if (isActive) {
        html += `<button onclick="app.openMissionModal(${i})"
          class="chapter-node aspect-square rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 bg-white dark:bg-[#151C2C] text-[#6C63FF] dark:text-[#c4c0ff] ring-2 ring-[#6C63FF]/40 dark:ring-[#c4c0ff]/40 shadow-lg shadow-[#6C63FF]/10 active:scale-90 hover:shadow-xl hover:shadow-[#6C63FF]/20"
          data-chapter="${i}">
          <span class="text-sm font-black leading-none">${i}</span>
          <span class="flex items-center gap-[1px]">${stars}</span>
          <span class="text-[7px] font-black bg-[#6C63FF]/10 dark:bg-[#c4c0ff]/10 text-[#6C63FF] dark:text-[#c4c0ff] px-1.5 py-0.5 rounded-full uppercase tracking-wider border border-[#6C63FF]/20 dark:border-[#c4c0ff]/20 leading-none mt-0.5">MULAI</span>
        </button>`;
      } else {
        html += `<button
          class="chapter-node aspect-square rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 bg-slate-100 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 cursor-pointer active:scale-90 hover:bg-slate-200 dark:hover:bg-slate-700/50"
          data-chapter="${i}"
          onclick="app.openMissionModal(${i})">
          <span class="material-symbols-outlined text-[12px]">lock</span>
          <span class="text-sm font-black leading-none mt-0.5">${i}</span>
          <span class="flex items-center gap-[1px]">${stars}</span>
        </button>`;
      }
    }
    html += '</div>';
    grid.innerHTML = html;
    modal.classList.remove('hidden');
  },

  filterChapterGrid() {
    const input = document.getElementById('chapter-search-input');
    const query = (input ? input.value : '').toLowerCase().trim();
    const buttons = document.querySelectorAll('#chapter-grid-container .chapter-node');
    buttons.forEach(btn => {
      const ch = btn.getAttribute('data-chapter');
      if (!query) { btn.style.display = ''; return; }
      btn.style.display = ch && ch.includes(query) ? '' : 'none';
    });
  },

  evaluateChapterQuiz(noSave) {
    const ch = this.state.currentChapter;
    const misi = this.state.currentMisi;
    if (!ch || !misi) return;
    const key = `bab${ch}`;
    if (!this.data.chapterProgress) this.data.chapterProgress = {};
    if (!this.data.chapterProgress[key]) {
      this.data.chapterProgress[key] = { level1Stars: 0, level2Stars: 0, level3Stars: 0, unlocked: true };
    }
    const totalQ = this.state.totalQ;
    if (!totalQ) return;
    const score = Math.round((this.state.correctCount / totalQ) * 100);
    let stars = 0;
    if (score >= 96) stars = 3;
    else if (score >= 80) stars = 2;
    else if (score >= 60) stars = 1;
    const starKey = misi <= 3 ? `level${misi}Stars` : `level4Stars`;
    if (stars > (this.data.chapterProgress[key][starKey] || 0)) {
      this.data.chapterProgress[key][starKey] = stars;
    }
    if (misi === 1 && stars >= 2) {
      const nextKey = `bab${ch + 1}`;
      if (this.data.chapterProgress[nextKey] && !this.data.chapterProgress[nextKey].unlocked) {
        this.data.chapterProgress[nextKey].unlocked = true;
        this.updateHeroSection();
      }
    }
    if (!noSave) Storage.set(this.data);
  },

  openMissionModal(ch) {
    this.state.currentChapter = ch;
    const titleEl = document.getElementById('mission-chapter-title');
    if (titleEl) titleEl.innerText = `Misi Latihan Bab ${ch}`;
    const key = `bab${ch}`;
    const data = this.data.chapterProgress && this.data.chapterProgress[key];
    const isLocked = !data || data.unlocked !== true;
    const levelBtns = document.querySelectorAll('#modal-mission button[onclick^="app.startChapterQuiz"]');
    const textbookBtn = document.querySelector('#modal-mission button[onclick*="openTextbook"]');
    levelBtns.forEach(btn => {
      if (isLocked) {
        btn.disabled = true;
        btn.classList.add('opacity-40', 'cursor-not-allowed', 'grayscale');
        btn.classList.remove('active:scale-[0.98]', 'hover:shadow-md');
      } else {
        btn.disabled = false;
        btn.classList.remove('opacity-40', 'cursor-not-allowed', 'grayscale');
        btn.classList.add('active:scale-[0.98]');
      }
    });
    if (textbookBtn) {
      textbookBtn.disabled = false;
      textbookBtn.classList.remove('opacity-40', 'cursor-not-allowed');
    }
    document.getElementById('modal-mission').classList.remove('hidden');
  },

  // ==========================================================
  // BOTTOM-SHEET AI TUTOR (HANA AI SETENGAH LAYAR)
  // ==========================================================
  _aiSheetWordData: null,

  bukaAiSheet() {
    const overlay = document.getElementById('ai-bottom-sheet');
    const panel = document.getElementById('sheet-content');
    if (!overlay || !panel) return;

    const wordEl = document.getElementById('flashcard-word');
    const currentWord = wordEl ? wordEl.innerText : '';
    const badge = document.getElementById('ai-sheet-badge-word');
    if (badge) badge.innerText = currentWord;
    this._aiSheetWordData = { word: currentWord };

    // Reset chat kosong
    const chatBox = document.getElementById('ai-sheet-chat-container');
    if (chatBox) chatBox.innerHTML = '';

    // Tampilkan panel dengan animasi
    overlay.classList.remove('hidden');
    overlay.style.opacity = '0';
    panel.classList.remove('translate-y-full');
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      panel.classList.add('translate-y-0');
      panel.classList.remove('translate-y-full');
    });

    // Auto-explain kata setelah panel terbuka
    setTimeout(() => {
      if (currentWord) this._autoExplainWord(currentWord);
      const input = document.getElementById('ai-sheet-input');
      if (input) input.focus();
    }, 400);
  },

  tutupAiSheet() {
    const overlay = document.getElementById('ai-bottom-sheet');
    const panel = document.getElementById('sheet-content');
    if (!overlay || !panel) return;
    panel.classList.remove('translate-y-0');
    panel.classList.add('translate-y-full');
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 300);
  },

  async groqFetch(messages, timeout = 25000, model = 'gpt-oss-120b') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this._token) headers['Authorization'] = `Bearer ${this._token}`;
      const resp = await fetch(GROQ_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, messages }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (resp.status === 401) {
        throw new Error('LOGIN_REQUIRED');
      }
      if (resp.status === 429) {
        const body = await resp.json().catch(() => ({}));
        const err = new Error('LIMIT_REACHED');
        err.limit = body.limit || 10000;
        err.used = body.used || 10000;
        throw err;
      }
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      return data;
    } catch (e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') throw new Error('Koneksi timeout. Periksa koneksi internet Anda.');
      throw e;
    }
  },

  async sendAiSheetMessage() {
    const input = document.getElementById('ai-sheet-input');
    const q = input ? input.value.trim() : '';
    if (!q) return;

    const chatBox = document.getElementById('ai-sheet-chat-container');
    if (!chatBox) return;

    input.value = '';

    // Bubble user
    const userBubble = document.createElement('div');
    userBubble.className = 'flex justify-end';
    userBubble.innerHTML = `<div class="bg-indigo-600/80 rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[85%] text-xs text-white leading-relaxed">${this._escapeHtml(q)}</div>`;
    chatBox.appendChild(userBubble);

    // Typing indicator
    const typingId = 'sheet-typing-' + Date.now();
    const typingBubble = document.createElement('div');
    typingBubble.id = typingId;
    typingBubble.className = 'flex items-start gap-2.5';
    typingBubble.innerHTML = `
      <div class="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <span class="material-symbols-outlined text-primary text-[14px]">smart_toy</span>
      </div>
      <div class="bg-slate-800/70 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-slate-400">
        <span class="inline-flex gap-1">
          <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:0s"></span>
          <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:0.15s"></span>
          <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:0.3s"></span>
        </span>
      </div>`;
    chatBox.appendChild(typingBubble);
    chatBox.scrollTop = chatBox.scrollHeight;

    const word = this._aiSheetWordData?.word || '';
    const systemPrompt = `Kamu adalah asisten Hana untuk pembelajaran kosakata Korea EPS-TOPIK. 
Jawab dalam Bahasa Indonesia yang santai dan mudah dipahami, maksimal 4 kalimat.
Jika diminta contoh, tulis dalam HANGUL (+ romaji) lalu terjemahkan ke Bahasa Indonesia.
Saat ditanya tentang kata "${word}", berikan penjelasan arti dan contoh kalimat Korea (Hangul + romaji) beserta terjemahannya.`;

    try {
      const data = await this.groqFetch([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: q }
      ]);
      document.getElementById(typingId)?.remove();

      let reply = data?.choices?.[0]?.message?.content;
      if (reply) {
        reply = reply.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-indigo-300">$1</strong>').replace(/\n/g, '<br>');
      } else {
        reply = 'Maaf, aku tidak bisa menjawab sekarang. Coba tanya dengan cara lain!';
      }

      const aiBubble = document.createElement('div');
      aiBubble.className = 'flex items-start gap-2.5';
      aiBubble.innerHTML = `
        <div class="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <span class="material-symbols-outlined text-primary text-[14px]">smart_toy</span>
        </div>
        <div class="bg-slate-800/70 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%] text-xs text-slate-300 leading-relaxed">${reply}
          <div class="flex gap-3 mt-2 pt-2 border-t border-slate-700/40">
            <button onclick="app.speakText('${this._escapeHtml(word)}')" class="flex items-center gap-1 text-[10px] font-medium text-indigo-300 hover:text-indigo-200 transition-colors active:scale-90">
              <span class="material-symbols-outlined text-[14px]">volume_up</span> Dengarkan
            </button>
          </div>
        </div>`;
      chatBox.appendChild(aiBubble);
    } catch (e) {
      document.getElementById(typingId)?.remove();
      const errBubble = document.createElement('div');
      errBubble.className = 'flex items-start gap-2.5';
      errBubble.innerHTML = `
        <div class="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <span class="material-symbols-outlined text-primary text-[14px]">smart_toy</span>
        </div>
        <div class="bg-rose-900/40 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%] text-xs text-rose-300 leading-relaxed">⚠️ ${this._escapeHtml(e.message)}</div>`;
      chatBox.appendChild(errBubble);
    }
    chatBox.scrollTop = chatBox.scrollHeight;
  },

  async _autoExplainWord(word) {
    const chatBox = document.getElementById('ai-sheet-chat-container');
    if (!chatBox) return;

    // Typing indicator
    const typingId = 'sheet-typing-' + Date.now();
    const typingBubble = document.createElement('div');
    typingBubble.id = typingId;
    typingBubble.className = 'flex items-start gap-2.5';
    typingBubble.innerHTML = `
      <div class="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <span class="material-symbols-outlined text-primary text-[14px]">smart_toy</span>
      </div>
      <div class="bg-slate-800/70 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-slate-400">
        <span class="inline-flex gap-1">
          <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:0s"></span>
          <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:0.15s"></span>
          <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:0.3s"></span>
        </span>
      </div>`;
    chatBox.appendChild(typingBubble);
    chatBox.scrollTop = chatBox.scrollHeight;

    const systemPrompt = `Kamu adalah asisten Hana untuk pembelajaran kosakata Korea EPS-TOPIK. 
Jelaskan kata "${word}" secara LENGKAP dan LANGSUNG tanpa menunggu pertanyaan lanjutan:
1. Arti kata "${word}" dalam Bahasa Indonesia
2. 2-3 contoh kalimat Bahasa Korea (Hangul + romaji) lengkap dengan terjemahan Bahasa Indonesia
3. Tips menghafal atau catatan penggunaan kata ini

Gunakan format **bold** untuk setiap kata Korea yang muncul. Pisahkan tiap bagian dengan baris baru. Jawab dalam Bahasa Indonesia yang santai dan mudah dipahami.`;

    try {
      const data = await this.groqFetch([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Jelaskan kata "${word}" secara lengkap dengan contoh kalimat.` }
      ]);
      document.getElementById(typingId)?.remove();

      let reply = data?.choices?.[0]?.message?.content;
      if (reply) {
        reply = reply.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-indigo-300">$1</strong>').replace(/\n/g, '<br>');
      } else {
        reply = 'Maaf, aku tidak bisa menjawab sekarang. Coba tanya dengan cara lain!';
      }

      const aiBubble = document.createElement('div');
      aiBubble.className = 'flex items-start gap-2.5';
      aiBubble.innerHTML = `
        <div class="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <span class="material-symbols-outlined text-primary text-[14px]">smart_toy</span>
        </div>
        <div class="bg-slate-800/70 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%] text-xs text-slate-300 leading-relaxed">${reply}
          <div class="flex gap-3 mt-2 pt-2 border-t border-slate-700/40">
            <button onclick="app.speakText('${this._escapeHtml(word)}')" class="flex items-center gap-1 text-[10px] font-medium text-indigo-300 hover:text-indigo-200 transition-colors active:scale-90">
              <span class="material-symbols-outlined text-[14px]">volume_up</span> Dengarkan "${word}"
            </button>
          </div>
        </div>`;
      chatBox.appendChild(aiBubble);
      chatBox.scrollTop = chatBox.scrollHeight;

      // Auto-play TTS kata setelah response muncul
      setTimeout(() => this.speakText(word), 600);
    } catch (e) {
      document.getElementById(typingId)?.remove();
      const errEl = document.createElement('div');
      errEl.className = 'flex items-start gap-2.5';
      errEl.innerHTML = `
        <div class="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <span class="material-symbols-outlined text-primary text-[14px]">smart_toy</span>
        </div>
        <div class="bg-rose-900/40 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%] text-xs text-rose-300 leading-relaxed">⚠️ ${this._escapeHtml(e.message)}</div>`;
      chatBox.appendChild(errEl);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  },

  speakText(text) {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  },

  startAiSheetVoice() {
    const micIcon = document.getElementById('ai-sheet-mic-icon');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Browser Anda tidak mendukung voice input. Gunakan Chrome/Edge terbaru.');
      return;
    }

    if (this._isRecording) {
      if (this._recognition) this._recognition.stop();
      this._isRecording = false;
      if (micIcon) micIcon.innerText = 'mic';
      return;
    }

    const recognition = new SpeechRecognition();
    this._recognition = recognition;
    recognition.lang = 'id-ID';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      this._isRecording = true;
      if (micIcon) {
        micIcon.innerText = 'mic_off';
        micIcon.closest('button')?.classList.add('bg-red-600', 'text-white');
        micIcon.closest('button')?.classList.remove('bg-slate-800', 'text-slate-300');
      }
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const input = document.getElementById('ai-sheet-input');
      if (input) {
        input.value = transcript;
        // Auto-send after voice input
        this.sendAiSheetMessage();
      }
    };

    recognition.onerror = () => {
      // Fallback: tetap biarkan user mengetik manual
    };

    recognition.onend = () => {
      this._isRecording = false;
      if (micIcon) {
        micIcon.innerText = 'mic';
        micIcon.closest('button')?.classList.remove('bg-red-600', 'text-white');
        micIcon.closest('button')?.classList.add('bg-slate-800', 'text-slate-300');
      }
    };

    recognition.start();
  },

  speakFlashcardWord() {
    const wordEl = document.getElementById('flashcard-word');
    this.speakText(wordEl ? wordEl.innerText : '');
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

};

window.onload = () => {
  app.init();
  initDarkMode();
  aiChat.init();



  window.flashcardEngine.init();
  
  // 🟢 PENYELAMAT IKON: Dipindah ke sini agar kebal dari error Game
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
};
// ============================================================
// ============================================================
// DUAL-VIEW LAYOUT SWITCHER CORE LOGIC (DENGAN MANIPULASI TEMA)
const uiSwitcher = {
  switch(mode) {
    const dashboard = document.getElementById('dashboard-screen');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    const isDark = document.documentElement.classList.contains('dark');

    const extraViews = ['view-review', 'view-semantic-game', 'view-ai-chat', 'view-game-hub'];
    extraViews.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    document.body.classList.remove('mode-jalur');

    // 3. ROUTING KHUSUS: PENGATURAN
    if (mode === 'settings') {
      if (typeof app.openSettings === 'function') {
        app.openSettings();
      }
      return; 
    } 
    
    // 4. ROUTING KHUSUS: LAYAR PENUH IMMERSIVE
    if (mode === 'review' || mode === 'ai-chat' || mode === 'game-hub') {
      const targetEl = document.getElementById(`view-${mode}`);
      if (targetEl) targetEl.classList.remove('hidden');
      return;
    }

    // 5. ROUTING UTAMA: MODE GRID (MINIMALIST)
    if (mode === 'minimalist') {
      document.body.classList.remove('is-jalur');
      if (dashboard) dashboard.classList.remove('jalur-aktif');
      
      if (metaTheme) metaTheme.setAttribute('content', isDark ? '#0c1424' : '#f2f5f9'); 
      
      localStorage.setItem('eps_ui_mode', 'minimalist');
    }
  },
  
  init() {
    // Membaca memori halaman terakhir, atau default ke grid
    const savedMode = localStorage.getItem('eps_ui_mode') || 'minimalist';
    this.switch(savedMode);
  }
};


// Daftarkan fungsi init agar berjalan otomatis saat halaman selesai dimuat
document.addEventListener("DOMContentLoaded", () => uiSwitcher.init());

// ============================================================
// DRAGGABLE AI BUTTON LOGIC (FLOATING WIDGET)
// ============================================================
function initDraggableAI() {
  const aiBtn = document.getElementById('aiButton');
  if (!aiBtn) return;

  let isDragging = false;
  let currentX = 0, currentY = 0;
  let initialX = 0, initialY = 0;
  let xOffset = 0, yOffset = 0;
  let hasMoved = false;

  function dragStart(e) {
    if (e.type === "touchstart") {
      initialX = e.touches[0].clientX - xOffset;
      initialY = e.touches[0].clientY - yOffset;
    } else {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
    }

    if (e.target === aiBtn || aiBtn.contains(e.target)) {
      isDragging = true;
      hasMoved = false;
      // Hilangkan efek denyut dan transisi lambat saat jari menempel
      aiBtn.classList.remove('animate-pulse');
      aiBtn.style.transition = 'none';
    }
  }

  function dragEnd(e) {
    if (!isDragging) return;
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
    
    // Kembalikan kehalusan animasi saat dilepas
    aiBtn.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
    
    // Sistem Keamanan: Jika ditarik sampai hilang ke luar layar, reset posisinya!
    const rect = aiBtn.getBoundingClientRect();
    if (rect.left < -20 || rect.top < -20 || rect.right > window.innerWidth + 20 || rect.bottom > window.innerHeight + 20) {
      xOffset = 0; yOffset = 0;
      setTranslate(0, 0, aiBtn);
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault(); // Mencegah layar scroll tanpa sengaja saat menarik robot
      hasMoved = true;

      if (e.type === "touchmove") {
        currentX = e.touches[0].clientX - initialX;
        currentY = e.touches[0].clientY - initialY;
      } else {
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
      }

      xOffset = currentX;
      yOffset = currentY;
      setTranslate(currentX, currentY, aiBtn);
    }
  }

  function setTranslate(xPos, yPos, el) {
    // Sedikit dibesarkan (scale 1.1) saat melayang ditarik jari
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0) scale(1.1)`;
  }

  // Pasang Sensor Sentuh untuk HP
  aiBtn.addEventListener("touchstart", dragStart, { passive: false });
  aiBtn.addEventListener("touchend", dragEnd, { passive: false });
  aiBtn.addEventListener("touchmove", drag, { passive: false });

  // Pasang Sensor Mouse untuk PC
  aiBtn.addEventListener("mousedown", dragStart, false);
  aiBtn.addEventListener("mouseup", dragEnd, false);
  aiBtn.addEventListener("mousemove", drag, false);

  // KUNCI PENTING: Cegah panel chat AI terbuka jika niat user HANYA menggeser robot
  aiBtn.addEventListener("click", function(e) {
    if (hasMoved) {
      // Jika digeser, blokir kliknya!
      e.preventDefault();
      e.stopImmediatePropagation();
      hasMoved = false;
    } else {
      // Jika cuma diklik (tidak digeser), kembalikan animasi denyutnya
      aiBtn.classList.add('animate-pulse');
    }
  }, true); // parameter `true` memastikan fungsi ini memblokir event klik lain
}

// Aktifkan mesin physics saat aplikasi dimuat
// document.addEventListener("DOMContentLoaded", initDraggableAI); // deprecated — floating AI button removed
function unlockAudio() {
    if (window.speechSynthesis) {
        const silentUtterance = new SpeechSynthesisUtterance('');
        silentUtterance.volume = 0;
        window.speechSynthesis.speak(silentUtterance);
    }
    
    if (Sound._ctx && Sound._ctx.state === 'suspended') {
        Sound._ctx.resume();
    }
    
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('click', unlockAudio);
}
document.addEventListener('touchstart', unlockAudio, { once: true });
document.addEventListener('click', unlockAudio, { once: true });

// ============================================================
// 🎯 KONVERSASI DATASET & ENGINE (Latihan Percakapan EPS-TOPIK)
// ============================================================
window.HANA_CONVERSATION_DATA = {
  "mesin-rusak": {
    "title": "Melaporkan Mesin Produksi yang Rusak (Bab 42 & 50)",
    "character": "Sajangnim (사장님)",
    "prologue": "Anda sedang bekerja di lini produksi ketika tiba-tiba mesin utama berhenti. Sajangnim mendekati Anda dan bertanya tentang situasi ini. Susun kalimat Korea yang tepat untuk melaporkan masalah ini!",
    "steps": [
      { "step": 1, "ai_speak": "바루 씨, 오늘 포장 작업은 어떻게 되고 있어요?", "ai_translation": "Baru, bagaimana pekerjaan pengemasan hari ini?", "user_target": "사장님, 기계가 갑자기 멈췄어요.", "user_translation": "Sajangnim, mesinnya tiba-tiba berhenti.", "word_pool": ["사장님,", "기계가", "갑자기", "멈췄어요.", "농약", "엽서"] },
      { "step": 2, "ai_speak": "그래요? 기계가 아예 작동하지 않아요?", "ai_translation": "Begitukah? Mesinnya sama sekali tidak beroperasi?", "user_target": "네, 전원 스위치를 올렸는데 작동하지 않아요.", "user_translation": "Ya, saya sudah menaikkan saklar daya tapi tidak beroperasi.", "word_pool": ["네,", "전원", "스위치를", "올렸는데", "작동하지", "않아요.", "출산", "괭이"] },
      { "step": 3, "ai_speak": "손잡이에 있는 안전 스위치는 확인해 봤어요?", "ai_translation": "Apakah kamu sudah mengecek saklar pengaman yang ada di pegangan?", "user_target": "확인했는데 아무 문제가 없는 것 같아요.", "user_translation": "Saya sudah mengeceknya tapi sepertinya tidak ada masalah.", "word_pool": ["확인했는데", "아무", "문제가", "없는", "것", "같아요.", "삼계탕", "낚시"] },
      { "step": 4, "ai_speak": "이상하네요. 어제 점검했을 때는 괜찮았는데 고장 난 것 같아요.", "ai_translation": "Aneh ya. Saat diperiksa kemarin tidak apa-apa, tapi sepertinya sekarang rusak.", "user_target": "수리 센터에 먼저 연락해 보는 게 좋겠어요.", "user_translation": "Sebaiknya kita mencoba menghubungi pusat perbaikan terlebih dahulu.", "word_pool": ["수리", "센터에", "먼저", "연락해", "보는", "게", "좋겠어요.", "체불", "비빔밥"] },
      { "step": 5, "ai_speak": "네, 맞아요. 수리 기사님을 빨리 부르세요.", "ai_translation": "Ya, benar. Tolong panggil teknisi perbaikan dengan cepat.", "user_target": "알겠습니다. 지금 바로 전화할게요.", "user_translation": "Baik. Saya akan menelepon sekarang juga.", "word_pool": ["알겠습니다.", "지금", "바로", "전화할게요.", "눈치", "신부"] },
      { "step": 6, "ai_speak": "수리 기사님이 올 때까지 우리는 뭘 할까요?", "ai_translation": "Sambil menunggu teknisi datang, apa yang sebaiknya kita lakukan?", "user_target": "작업장 정리를 먼저 하는 게 어때요?", "user_translation": "Bagaimana kalau kita merapikan tempat kerja terlebih dahulu?", "word_pool": ["작업장", "정리를", "먼저", "하는", "게", "어때요?", "여권", "골프"] },
      { "step": 7, "ai_speak": "좋아요. 바닥에 있는 상자 좀 치워 주세요.", "ai_translation": "Bagus. Tolong bereskan kotak-kotak yang ada di lantai.", "user_target": "네, 상자를 저쪽에 쌓아 놓을게요.", "user_translation": "Ya, saya akan menumpuk kotak-kotaknya di sebelah sana.", "word_pool": ["네,", "상자를", "저쪽에", "쌓아", "놓을게요.", "깁스", "주사"] },
      { "step": 8, "ai_speak": "바루 씨, 수리 기사님이 기계를 다 고쳤어요.", "ai_translation": "Baru, teknisi sudah memperbaiki mesinnya semua.", "user_target": "다행이네요. 다시 작업을 시작할까요?", "user_translation": "Syukurlah. Apakah kita mulai bekerja lagi?", "word_pool": ["다행이네요.", "다시", "작업을", "시작할까요?", "거름", "환불"] },
      { "step": 9, "ai_speak": "네, 하지만 기계가 잘 돌아가는지 먼저 점검해야 해요.", "ai_translation": "Ya, tapi kita harus memeriksa dulu apakah mesin berputar dengan baik.", "user_target": "제가 한 번 기계를 작동해 볼게요.", "user_translation": "Saya akan mencoba mengoperasikan mesinnya sekali.", "word_pool": ["제가", "한", "번", "기계를", "작동해", "볼게요.", "휴지", "사료"] },
      { "step": 10, "ai_speak": "이제 기계가 잘 작동하지요? 수고했어요!", "ai_translation": "Sekarang mesinnya beroperasi dengan baik, kan? Kerja bagus!", "user_target": "네, 문제없습니다. 열심히 하겠습니다!", "user_translation": "Ya, tidak ada masalah. Saya akan bekerja dengan keras!", "word_pool": ["네,", "문제없습니다.", "열심히", "하겠습니다!", "송편", "예절"] }
    ]
  },
  "gudang": {
    "title": "Mengambil Peralatan & Manajemen Gudang (Bab 41, 43, 47)",
    "character": "Mandor Kim (반장님)",
    "prologue": "Hari ini Anda bertugas membantu Mandor Kim mempersiapkan barang pengiriman. Mulai dari mengambil alat, mengecek stok, hingga memuat barang ke truk. Susun kalimat yang tepat sesuai instruksi Mandor Kim!",
    "steps": [
      {
        "step": 1,
        "ai_speak": "오늘 출고할 상품을 준비해야 해요. 먼저 공구함에서 줄자를 가져오세요.",
        "ai_translation": "Kita harus menyiapkan barang yang akan dikirim hari ini. Pertama, ambil meteran dari kotak perkakas.",
        "user_target": "네, 반장님. 공구함에서 줄자를 찾았습니다.",
        "user_translation": "Ya, Mandor. Saya sudah menemukan meteran dari kotak perkakas.",
        "word_pool": ["네,", "반장님.", "공구함에서", "줄자를", "찾았습니다.", "엽서를", "농약"]
      },
      {
        "step": 2,
        "ai_speak": "좋아요. 이제 창고에 가서 재고를 파악해 봅시다.",
        "ai_translation": "Bagus. Sekarang mari pergi ke gudang dan mengecek stok.",
        "user_target": "알겠습니다. 창고 정리가 잘 되어 있어서 파악하기 쉬울 것 같아요.",
        "user_translation": "Baik. Gudangnya tertata rapi sehingga sepertinya akan mudah untuk mengeceknya.",
        "word_pool": ["알겠습니다.", "창고", "정리가", "잘", "되어", "있어서", "파악하기", "쉬울", "것", "같아요.", "괭이가", "편찮으셔서"]
      },
      {
        "step": 3,
        "ai_speak": "오늘 나갈 상품은 이쪽에 있는 물건들입니다.",
        "ai_translation": "Barang yang akan keluar hari ini adalah barang-barang yang ada di sebelah sini.",
        "user_target": "네, 크기별로 분류해서 재고를 확인하겠습니다.",
        "user_translation": "Ya, saya akan menyortirnya berdasarkan ukuran dan mengecek stoknya.",
        "word_pool": ["네,", "크기별로", "분류해서", "재고를", "확인하겠습니다.", "찰과상을", "수술"]
      },
      {
        "step": 4,
        "ai_speak": "수량을 확인한 후에 어디에 기록할 건가요?",
        "ai_translation": "Setelah memastikan jumlahnya, Anda akan mencatatnya di mana?",
        "user_target": "수량을 확인하고 여기에 기록해 두겠습니다.",
        "user_translation": "Saya akan memastikan jumlahnya dan mencatatnya di sini.",
        "word_pool": ["수량을", "확인하고", "여기에", "기록해", "두겠습니다.", "세뱃돈을", "환불해"]
      },
      {
        "step": 5,
        "ai_speak": "수고했어요. 이제 상품을 상자에 담아야 합니다.",
        "ai_translation": "Kerja bagus. Sekarang kita harus memasukkan produk ke dalam kotak.",
        "user_target": "제품을 열 개씩 모아서 상자에 넣으면 됩니까?",
        "user_translation": "Apakah saya cukup mengumpulkan tiap 10 buah produk dan memasukkannya ke dalam kotak?",
        "word_pool": ["제품을", "열", "개씩", "모아서", "상자에", "넣으면", "됩니까?", "썰면", "낚시"]
      },
      {
        "step": 6,
        "ai_speak": "네, 맞아요. 열 개씩 포장해 주세요.",
        "ai_translation": "Ya, benar. Tolong kemas tiap sepuluh buah.",
        "user_target": "알겠습니다. 상품 포장을 얼른 끝내겠습니다.",
        "user_translation": "Saya akan segera menyelesaikan pengemasan produk.",
        "word_pool": ["알겠습니다.", "상품", "포장을", "얼른", "끝내겠습니다.", "조퇴를", "입원"]
      },
      {
        "step": 7,
        "ai_speak": "포장이 끝나면 끈으로 단단히 묶어 주세요.",
        "ai_translation": "Jika pengemasan sudah selesai, tolong ikat dengan kuat menggunakan tali.",
        "user_target": "네, 상자를 안전하게 묶어 놓을게요.",
        "user_translation": "Ya, saya akan mengikat kotak dengan aman.",
        "word_pool": ["네,", "상자를", "안전하게", "묶어", "놓을게요.", "토해", "화상을"]
      },
      {
        "step": 8,
        "ai_speak": "이제 포장한 상자를 밖으로 날라야 해요.",
        "ai_translation": "Sekarang kita harus memindahkan kotak yang sudah dikemas ke luar.",
        "user_target": "상자를 밖으로 옮겨서 한쪽에 쌓아 놓을까요?",
        "user_translation": "Apakah saya pindahkan kotaknya ke luar lalu menumpuknya di satu sisi?",
        "word_pool": ["상자를", "밖으로", "옮겨서", "한쪽에", "쌓아", "놓을까요?", "오려", "거름을"]
      },
      {
        "step": 9,
        "ai_speak": "네, 그리고 바로 트럭에 실어 주세요.",
        "ai_translation": "Ya, dan tolong langsung muat ke dalam truk.",
        "user_target": "네, 조심해서 트럭에 싣겠습니다.",
        "user_translation": "Ya, saya akan memuatnya ke truk dengan hati-hati.",
        "word_pool": ["네,", "조심해서", "트럭에", "싣겠습니다.", "폭언을", "깁스"]
      },
      {
        "step": 10,
        "ai_speak": "오늘 출고 작업이 모두 끝났네요. 수고 많았어요!",
        "ai_translation": "Pekerjaan pengiriman hari ini sudah selesai semua. Anda sudah bekerja keras!",
        "user_target": "감사합니다, 반장님! 내일도 열심히 일하겠습니다.",
        "user_translation": "Terima kasih, Mandor! Besok juga saya akan bekerja keras.",
        "word_pool": ["감사합니다,", "반장님!", "내일도", "열심히", "일하겠습니다.", "체불", "폐백"]
      }
    ]
  },
  "wawancara": {
    "title": "Simulasi Ujian Wawancara Kerja Resmi EPS-TOPIK (Bab 6, 38, 51, 52)",
    "character": "Pewawancara HRD (면접관)",
    "prologue": "Anda akan mengikuti simulasi ujian wawancara kerja resmi EPS-TOPIK. Pewawancara HRD akan mengajukan berbagai pertanyaan seputar identitas, pengalaman kerja, hingga tujuan Anda di Korea. Susun kalimat Korea yang tepat untuk menjawab setiap pertanyaan!",
    "steps": [
      {
        "step": 1,
        "ai_speak": "안녕하십니까? 자리에 앉으십시오. 먼저 이름과 국적을 소개해 보십시오.",
        "ai_translation": "Halo. Silakan duduk. Pertama-tama, tolong perkenalkan nama dan kewarganegaraan Anda.",
        "user_target": "안녕하십니까? 제 이름은 이반이고 인도네시아 사람입니다.",
        "user_translation": "Halo. Nama saya Ivan dan saya adalah orang Indonesia.",
        "word_pool": ["안녕하십니까?", "제", "이름은", "이반이고", "인도네시아", "사람입니다.", "괭이", "농약"]
      },
      {
        "step": 2,
        "ai_speak": "이반 씨, 한국어능력시험 성적이 아주 좋습니다. 한국말을 잘하십니까?",
        "ai_translation": "Saudara Ivan, nilai ujian TOPIK Anda sangat bagus. Apakah Anda pandai berbahasa Korea?",
        "user_target": "아직 부족하지만 한국어를 매일 열심히 공부하고 있습니다.",
        "user_translation": "Masih kurang, tetapi saya sedang belajar bahasa Korea dengan giat setiap hari.",
        "word_pool": ["아직", "부족하지만", "한국어를", "매일", "열심히", "공부하고", "있습니다.", "폐수", "사료"]
      },
      {
        "step": 3,
        "ai_speak": "한국에 가면 어떤 산업에서 일을 해 보고 싶습니까?",
        "ai_translation": "Jika pergi ke Korea, Anda ingin mencoba bekerja di industri apa?",
        "user_target": "저는 기술을 배울 수 있는 제조업 쪽 일을 해 보고 싶습니다.",
        "user_translation": "Saya ingin mencoba pekerjaan di bidang industri manufaktur yang bisa mempelajari teknologi.",
        "word_pool": ["저는", "기술을", "배울", "수", "있는", "제조업", "쪽", "일을", "해", "보고", "싶습니다.", "불량품", "삼계탕"]
      },
      {
        "step": 4,
        "ai_speak": "이전에 고향에서 공장이나 제조업에서 일한 경험이 있습니까?",
        "ai_translation": "Apakah sebelumnya Anda memiliki pengalaman bekerja di pabrik atau industri manufaktur di kampung halaman?",
        "user_target": "네, 고향의 가구 공장에서 삼 년 동안 일한 적이 있습니다.",
        "user_translation": "Ya, saya pernah bekerja selama tiga tahun di pabrik mebel di kampung halaman.",
        "word_pool": ["네,", "고향의", "가구", "공장에서", "삼", "년", "동안", "일한", "적이", "있습니다.", "엽서", "체불"]
      },
      {
        "step": 5,
        "ai_speak": "공장에 일이 많을 때에는 연장 근무나 휴일 근무를 할 수 있습니까?",
        "ai_translation": "Saat pekerjaan pabrik banyak, apakah Anda bisa melakukan kerja lembur atau kerja hari libur?",
        "user_target": "네, 일이 많으면 연장 근무나 휴일 근무도 성실하게 하겠습니다.",
        "user_translation": "Ya, jika pekerjaan banyak, saya juga akan melakukan kerja lembur dan kerja hari libur dengan sungguh-sungguh.",
        "word_pool": ["네,", "일이", "많으면", "연장", "근무나", "휴일", "근무도", "성실하게", "하겠습니다.", "찰과상", "샌딩"]
      },
      {
        "step": 6,
        "ai_speak": "직장 상사나 동료와 문제가 생기면 어떻게 해결하겠습니까?",
        "ai_translation": "Jika muncul masalah dengan atasan atau rekan kerja, bagaimana Anda akan menyelesaikannya?",
        "user_target": "서로 예의를 지키고 오해가 없도록 먼저 대화로 풀겠습니다.",
        "user_translation": "Saya akan menjaga etika satu sama lain dan pertama-tama menyelesaikannya dengan dialog agar tidak ada kesalahpahaman.",
        "word_pool": ["서로", "예의를", "지키고", "오해가", "없도록", "먼저", "대화로", "풀겠습니다.", "환풍기", "송편"]
      },
      {
        "step": 7,
        "ai_speak": "작업장에서 기계가 고장 나서 멈추면 제일 먼저 어떻게 하겠습니까?",
        "ai_translation": "Jika mesin di tempat kerja rusak dan berhenti, apa yang paling pertama akan Anda lakukan?",
        "user_target": "전원 스위치를 내리고 반장님께 바로 보고하겠습니다.",
        "user_translation": "Saya akan menurunkan saklar daya dan langsung melapor kepada Mandor.",
        "word_pool": ["전원", "스위치를", "내리고", "반장님께", "바로", "보고하겠습니다.", "모종", "세일"]
      },
      {
        "step": 8,
        "ai_speak": "고용허가제의 기본 취업 기간이 몇 년인지 알고 있습니까?",
        "ai_translation": "Apakah Anda tahu berapa tahun masa kerja dasar dari Sistem Izin Kerja (EPS)?",
        "user_target": "네, 취업 기간은 삼 년이고 연장 허가를 받으면 더 일할 수 있습니다.",
        "user_translation": "Ya, masa kerjanya adalah tiga tahun dan jika mendapat izin perpanjangan bisa bekerja lebih lama.",
        "word_pool": ["네,", "취업", "기간은", "삼", "년이고", "연장", "허가를", "받으면", "더", "일할", "수", "있습니다.", "배편", "도르래"]
      },
      {
        "step": 9,
        "ai_speak": "한국에 와서 이루고 싶은 가장 큰 목표는 무엇입니까?",
        "ai_translation": "Apa tujuan terbesar yang ingin Anda capai setelah datang ke Korea?",
        "user_target": "열심히 일해서 돈도 벌고 가족들과 행복하게 사는 것입니다.",
        "user_translation": "Tujuan saya adalah bekerja keras untuk menghasilkan uang dan hidup bahagia bersama keluarga.",
        "word_pool": ["열심히", "일해서", "돈도", "벌고", "가족들과", "행복하게", "사는", "것입니다.", "고구마", "폐백"]
      },
      {
        "step": 10,
        "ai_speak": "네, 잘 들었습니다. 면접이 모두 끝났습니다. 수고하셨습니다.",
        "ai_translation": "Ya, saya sudah mendengarnya dengan baik. Wawancara sudah selesai semua. Kerja yang bagus.",
        "user_target": "감사합니다. 한국에서 꼭 필요한 근로자가 되겠습니다.",
        "user_translation": "Terima kasih. Saya akan menjadi pekerja yang sangat dibutuhkan di Korea.",
        "word_pool": ["감사합니다.", "한국에서", "꼭", "필요한", "근로자가", "되겠습니다.", "횡단보도", "사다리"]
      }
    ]
  }
};

app.conversationEngine = {
  currentScenarioId: 'mesin-rusak',
  currentStepIndex: 0,
  userHearts: 3,
  selectedWords: [],

  startConversation(scenarioId) {
    this.currentScenarioId = scenarioId || 'mesin-rusak';
    this.currentStepIndex = 0;
    this.userHearts = 3;
    this.selectedWords = [];

    const data = window.HANA_CONVERSATION_DATA[this.currentScenarioId];
    if (!data) { showInfoModal('Skenario Tidak Ditemukan', 'Maaf, skenario percakapan yang diminta tidak tersedia.'); return; }

    document.getElementById('conv-subtitle').innerText = data.title;
    document.getElementById('conversation-chat-log').innerHTML = '';
    document.getElementById('conversation-answer-preview').innerHTML = '';

    this.updateHeartsUI();
    this.updateProgressBar();
    app.switchScreen('screen-conversation', { immersive: true });
    this.renderPrologue();
  },

  renderPrologue() {
    const data = window.HANA_CONVERSATION_DATA[this.currentScenarioId];
    const chatLog = document.getElementById('conversation-chat-log');
    if (!data || !chatLog) return;

    const container = document.createElement('div');
    container.className = 'flex flex-col items-center text-center gap-6 py-6 px-6 mx-auto w-full max-w-sm animate-fade-in';
    container.innerHTML = `
      <div class="p-6 bg-[var(--hana-primary)]/10 rounded-full animate-pulse vibrant-glow">
        <span class="material-symbols-outlined text-[44px] text-[var(--hana-primary)]">info</span>
      </div>
      <div>
        <p class="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2">PROLOG SKENARIO</p>
        <h3 class="text-base font-extrabold text-[var(--text-primary)] mb-3 leading-snug">${data.title}</h3>
        <p class="text-xs text-[var(--text-muted)] leading-relaxed">${data.prologue}</p>
      </div>
      <button onclick="app.conversationEngine.startLesson()" class="px-8 py-3 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl active:scale-[0.97] transition-all flex items-center gap-2 shadow-lg" style="background:linear-gradient(135deg,var(--hana-primary),#8B84FF);box-shadow:0 4px 16px rgba(108,99,255,0.35)">
        <span class="material-symbols-outlined text-[16px]" style="font-variation-settings:'FILL' 1">play_arrow</span> Mulai Latihan
      </button>
    `;
    chatLog.appendChild(container);
  },

  startLesson() {
    document.getElementById('conversation-chat-log').innerHTML = '';
    this.updateProgressBar();
    this.renderCurrentStep();
  },

  updateProgressBar() {
    const data = window.HANA_CONVERSATION_DATA[this.currentScenarioId];
    if (!data) return;
    const total = data.steps.length;
    const progress = (this.currentStepIndex / total) * 100;
    const bar = document.getElementById('conv-progress-bar');
    if (bar) bar.style.width = Math.min(progress, 100) + '%';
  },

  updateHeartsUI() {
    const container = document.getElementById('conv-hearts-container');
    let html = '';
    for (let i = 0; i < 3; i++) {
      const filled = i < this.userHearts;
      html += filled
        ? '<svg class="w-[18px] h-[18px] text-[var(--hana-danger)]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'
        : '<svg class="w-[18px] h-[18px] text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
    }
    container.innerHTML = html;
  },

  renderCurrentStep() {
    const data = window.HANA_CONVERSATION_DATA[this.currentScenarioId];
    const step = data.steps[this.currentStepIndex];
    const chatLog = document.getElementById('conversation-chat-log');

    const aiBubble = document.createElement('div');
    aiBubble.className = 'flex flex-col items-start space-y-1.5 max-w-[88%] self-start animate-fade-in stagger-1';
    aiBubble.innerHTML = `
      <span class="text-[10px] font-bold text-[var(--hana-primary)] uppercase tracking-[0.2em] bg-[var(--hana-primary)]/10 px-2.5 py-1 rounded">${data.character}</span>
      <div class="speech-bubble bg-white dark:bg-[#252423] border-2 border-[var(--hana-primary)]/20 rounded-2xl p-5 shadow-xl shadow-[var(--hana-primary)]/10 relative group">
        <p class="text-sm font-bold text-gray-800 dark:text-[var(--text-primary)] tracking-wide leading-relaxed">${step.ai_speak}</p>
        <div class="h-px bg-gray-100 dark:bg-white/10 my-3"></div>
        <p class="text-xs italic text-gray-500 dark:text-[var(--text-muted)] leading-relaxed">${step.ai_translation}</p>
        <button onclick="app.speakText('${step.ai_speak.replace(/'/g, "\\'")}')" class="absolute -right-11 top-3 w-8 h-8 rounded-full bg-white dark:bg-[var(--card-bg)] border border-gray-200 dark:border-[var(--card-border)] text-[var(--hana-primary)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-105 shadow-sm">
          <span class="material-symbols-outlined text-[14px]">volume_up</span>
        </button>
      </div>`;
    chatLog.appendChild(aiBubble);
    chatLog.scrollTop = chatLog.scrollHeight;

    if (typeof app.speakText === 'function') app.speakText(step.ai_speak);

    this.selectedWords = [];
    document.getElementById('conversation-answer-preview').innerHTML = '';
    this.renderWordPool(step.word_pool);
  },

  renderWordPool(poolArray) {
    const poolContainer = document.getElementById('conversation-word-pool');
    poolContainer.innerHTML = '';

    const shuffled = [...poolArray];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    shuffled.forEach((word, index) => {
      const btn = document.createElement('button');
      const staggerIdx = (index % 8) + 1;
      btn.className = `word-chip px-4 py-2.5 bg-[var(--hana-primary)]/5 dark:bg-[var(--hana-primary)]/10 border border-[var(--hana-primary)]/20 text-sm font-bold text-gray-800 dark:text-[var(--text-primary)] rounded-xl shadow-sm hover:bg-white dark:hover:bg-[var(--card-bg)] hover:border-[var(--hana-primary)]/40 transition-all animate-float stagger-${staggerIdx}`;
      btn.innerText = word;
      btn.id = `conv-word-btn-${index}`;
      btn.onclick = () => this.handleWordClick(word, btn.id);
      poolContainer.appendChild(btn);
    });
  },

  handleWordClick(word, buttonId) {
    this.selectedWords.push(word);
    const previewContainer = document.getElementById('conversation-answer-preview');
    const chip = document.createElement('span');
    chip.className = 'px-3 py-1.5 bg-[var(--hana-primary)]/15 text-[var(--hana-primary)] border border-[var(--hana-primary)]/25 rounded-[10px] font-bold text-sm animate-scale-in';
    chip.innerText = word;
    previewContainer.appendChild(chip);

    const originBtn = document.getElementById(buttonId);
    if (originBtn) { originBtn.classList.add('opacity-30', 'pointer-events-none'); }
  },

  resetSelection() {
    this.selectedWords = [];
    document.getElementById('conversation-answer-preview').innerHTML = '';
    const data = window.HANA_CONVERSATION_DATA[this.currentScenarioId];
    const step = data.steps[this.currentStepIndex];
    this.renderWordPool(step.word_pool);
  },

  checkAnswer() {
    const data = window.HANA_CONVERSATION_DATA[this.currentScenarioId];
    const step = data.steps[this.currentStepIndex];
    const userString = this.selectedWords.join(' ').trim();
    const targetString = step.user_target.trim();

    if (userString === targetString) {
      const chatLog = document.getElementById('conversation-chat-log');
      const userBubble = document.createElement('div');
      userBubble.className = 'flex flex-col items-end space-y-1.5 max-w-[88%] self-end animate-fade-in stagger-2';
      userBubble.innerHTML = `
        <span class="text-[10px] font-bold text-white/80 uppercase tracking-[0.2em] bg-[var(--hana-primary)]/30 px-2.5 py-1 rounded">Pelajar (User)</span>
        <div class="speech-bubble-user bg-[var(--hana-primary)] rounded-2xl p-5 shadow-xl shadow-[var(--hana-primary)]/20">
          <p class="text-sm font-bold text-white tracking-wide leading-relaxed">${step.user_target}</p>
          <div class="h-px bg-white/15 my-3"></div>
          <p class="text-xs italic text-white/70 leading-relaxed">${step.user_translation}</p>
        </div>`;
      chatLog.appendChild(userBubble);
      chatLog.scrollTop = chatLog.scrollHeight;

      this.currentStepIndex++;
      this.updateProgressBar();

      if (this.currentStepIndex >= data.steps.length) {
        setTimeout(() => {
          app.data.xp = (app.data.xp || 0) + 20;
          Storage.set(app.data);
          showInfoModal('Percakapan Selesai!', 'Selamat! Anda berhasil menyelesaikan simulasi percakapan panjang. +20 XP ditambahkan.');
          app.loadAndRefreshUI();
          app.switchScreen('dashboard-screen', { showNav: true });
        }, 800);
      } else {
        setTimeout(() => this.renderCurrentStep(), 1000);
      }
    } else {
      this.userHearts--;
      this.updateHeartsUI();
      showInfoModal('Kurang Tepat', 'Susunan kalimat salah atau kurang tepat! Nyawa berkurang 1. Silakan susun ulang.');
      this.resetSelection();

      if (this.userHearts <= 0) {
        showInfoModal('Game Over', 'Nyawa Anda habis. Jangan menyerah, coba lagi dari awal!');
        app.switchScreen('dashboard-screen', { showNav: true });
      }
    }
  },
  openScenarioPicker() {
      const overlay = document.getElementById('scenario-picker-sheet');
      const panel = document.getElementById('scenario-picker-content');
      const list = document.getElementById('scenario-picker-list');
      if (!overlay || !panel || !list) return;

      const SCENARIO_COLORS = {
        'mesin-rusak': { bg: '#DBEAFE', text: '#2563EB', icon: 'construction' },
        'gudang': { bg: '#EDE9FE', text: 'var(--hana-primary)', icon: 'inventory_2' },
        'wawancara': { bg: '#FCE7F3', text: '#DB2777', icon: 'badge' }
      };

      list.innerHTML = '';
      Object.keys(window.HANA_CONVERSATION_DATA).forEach(key => {
        const data = window.HANA_CONVERSATION_DATA[key];
        const colors = SCENARIO_COLORS[key] || { bg: '#DBEAFE', text: 'var(--hana-primary)', icon: 'forum' };
        const card = document.createElement('div');
        card.className = 'item-card w-full flex items-center gap-4 p-4 bg-white/70 dark:bg-[var(--card-bg)]/70 hover:bg-white dark:hover:bg-[var(--card-bg)] rounded-2xl shadow-sm cursor-pointer';
        card.onclick = () => { this.closeScenarioPicker(); this.startConversation(key); };
        card.innerHTML = `
          <div class="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center" style="background:${colors.bg};color:${colors.text}">
            <span class="material-symbols-outlined text-[28px]">${colors.icon}</span>
          </div>
          <div class="flex-1 text-left min-w-0">
            <div class="flex items-center justify-between gap-2">
              <h3 class="font-bold text-[13px] text-[var(--text-primary)] leading-tight truncate">${data.title}</h3>
              <span class="xp-badge-gradient px-2.5 py-0.5 rounded-full text-[9px] font-bold text-white whitespace-nowrap shrink-0">+20 XP</span>
            </div>
            <p class="text-[11px] text-[var(--text-muted)] mt-1">Karakter: ${data.character}</p>
          </div>
          <span class="material-symbols-outlined text-[var(--text-muted)] text-lg shrink-0">chevron_right</span>`;
        list.appendChild(card);
      });

      overlay.classList.remove('hidden');
      overlay.style.opacity = '0';
      panel.classList.remove('translate-y-full');
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        panel.classList.add('translate-y-0');
        panel.classList.remove('translate-y-full');
      });
    },
    closeScenarioPicker() {
      const overlay = document.getElementById('scenario-picker-sheet');
      const panel = document.getElementById('scenario-picker-content');
      if (!overlay || !panel) return;
      panel.classList.remove('translate-y-0');
      panel.classList.add('translate-y-full');
      overlay.style.opacity = '0';
      setTimeout(() => overlay.classList.add('hidden'), 300);
    }
  }
;

window.addEventListener("popstate", (e) => {
  const screen = document.getElementById('settings-screen');
  if (screen && screen.classList.contains('is-open')) {
    app.closeSettings();
  }
});

window.fireConfetti = function() {
  const duration = 3 * 1000;
  const end = Date.now() + duration;
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, zIndex: 9999 });
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, zIndex: 9999 });
    if (Date.now() < end) { requestAnimationFrame(frame); }
  }());
};

// ============================================================
// GLOBAL FLASHCARD ENGINE (DI LUAR OBJEK app)
// ============================================================
window.flashcardEngine = {
  init() {
    ['flashcard','flashcard-modal'].forEach(id => {
      const card = document.getElementById(id);
      if (card) card.classList.remove('flipped');
    });
  },
  
  flip() {
    const flashcardInner = document.getElementById('flashcard-inner');
    if (flashcardInner) {
      flashcardInner.classList.toggle('is-flipped');
      return;
    }
    const modalCard = document.getElementById('flashcard-modal');
    const missionModal = document.getElementById('modal-mission-word');
    if (modalCard && missionModal && !missionModal.classList.contains('hidden')) {
      modalCard.classList.toggle('flipped');
    }
  },
  
  renderCard() {
    if (!app.state.microFlashData || app.state.microFlashData.length === 0) return;
    
    const data = app.state.microFlashData[app.state.microFlashIdx];
    // Modal mission-word elements
    const krEl = document.getElementById('fc-kr');
    const idEl = document.getElementById('fc-id');
    const countEl = document.getElementById('fc-counter');
    if (krEl) krEl.innerText = data.kr || data.word || 'Kosakata';
    if (idEl) idEl.innerText = data.id || data.meaning || 'Arti';
    if (countEl) countEl.innerText = `${app.state.microFlashIdx + 1} / ${app.state.microFlashData.length}`;
    
    // Flashcard-screen elements (old view)
    const frontEl = document.getElementById('flashcard-front');
    const backEl = document.getElementById('flashcard-back');
    const romajiEl = document.getElementById('flashcard-romaji');
    const counterEl = document.getElementById('flashcard-counter');
    if (frontEl) frontEl.innerText = data.kr || data.word || 'Kosakata';
    if (backEl) backEl.innerText = data.id || data.meaning || 'Arti';
    if (romajiEl) romajiEl.innerText = data.ro || '';
    if (counterEl) counterEl.innerText = `${app.state.microFlashIdx + 1} / ${app.state.microFlashData.length}`;
    
    const boxExModal = document.getElementById('box-ex-modal');
    const btnExModal = document.getElementById('btn-ex-modal');
    if (boxExModal && btnExModal) {
      boxExModal.classList.add('hidden');
      btnExModal.innerHTML = '💡 Lihat Konteks Kalimat';
      boxExModal.innerText = data.example || '';
    }
    
    this.init();
  },
  
  remember() { this.next(); },
  forget() { this.next(); },

  next() {
    if (!app.state.microFlashData || app.state.microFlashData.length === 0) return;
    if (app.state.microFlashIdx < app.state.microFlashData.length - 1) {
      app.state.microFlashIdx++;
      this.renderCard();
    } else {
      app.data.xp = (app.data.xp || 0) + 20;
      if (!app.data.dailyStats) app.data.dailyStats = { date: new Date().toDateString(), words: 0, quizzes: 0, minutes: 0 };
      app.data.dailyStats.words = (app.data.dailyStats.words || 0) + 10;
      Storage.set(app.data);
      
      app.renderDashboard();
      closeModal('modal-mission-word');
      
      if (typeof showInfoModal === 'function') {
        showInfoModal('Misi Selesai! 🎉', 'Luar biasa! Anda telah menyelesaikan hafalan kosakata hari ini dan mendapatkan +20 XP.');
      } else {
        alert('Misi Selesai! 🎉 Anda mendapatkan +20 XP.');
      }
    }
  },
  
  prev() {
    if (!app.state.microFlashData || app.state.microFlashData.length === 0) return;
    if (app.state.microFlashIdx > 0) {
      app.state.microFlashIdx--;
      this.renderCard();
    }
  },

  // --- Flashcard-screen (old view) helpers ---
  _ensureVocab() {
    if (!this.vocabData) {
      this.vocabData = window.HANA_FLASHCARD_DATA || [];
      this.vocabIndex = 0;
      this.currentCategory = 'all';
      this.currentChapter = 'all';
      this._filterText = '';
    }
  },

  _applyFilterToVocab() {
    this._ensureVocab();
    let list = this.vocabData;
    
    if (this.currentCategory && this.currentCategory !== 'all') {
      list = list.filter(v => v.category === this.currentCategory);
    }
    
    if (this.currentChapter && this.currentChapter !== 'all') {
      list = list.filter(v => v.chapter === this.currentChapter);
    }
    return list;
  },

  _renderFlashcardScreen(idx) {
    const filtered = this._applyFilterToVocab();
    const total = filtered.length;
    if (total === 0) {
      const wordEl = document.getElementById('flashcard-word') || document.getElementById('flashcard-front');
      const romanEl = document.getElementById('flashcard-romanization') || document.getElementById('flashcard-romaji');
      const meanEl = document.getElementById('flashcard-meaning') || document.getElementById('flashcard-back');
      if (wordEl) wordEl.innerText = '—';
      if (romanEl) romanEl.innerText = '';
      if (meanEl) meanEl.innerText = 'Tidak ada hasil';
      const progEl = document.getElementById('flashcard-progress-text') || document.getElementById('flashcard-counter');
      if (progEl) progEl.innerText = '0 / 0';
      return;
    }
    const safeIdx = Math.min(idx, total - 1);
    const data = filtered[safeIdx];

    const wordEl = document.getElementById('flashcard-word') || document.getElementById('flashcard-front');
    const romanEl = document.getElementById('flashcard-romanization') || document.getElementById('flashcard-romaji');
    const meanEl = document.getElementById('flashcard-meaning') || document.getElementById('flashcard-back');
    const progEl = document.getElementById('flashcard-progress-text') || document.getElementById('flashcard-counter');
    if (wordEl) wordEl.innerText = data.kr;
    if (meanEl) meanEl.innerText = data.id;
    if (romanEl) romanEl.innerText = data.ro || '';
    if (progEl) progEl.innerText = `${safeIdx + 1} / ${total}`;

    // Progress bar & percentage
    const barEl = document.getElementById('flashcard-progress-bar');
    const pctEl = document.getElementById('flashcard-percent-text');
    const pct = total > 0 ? Math.round(((safeIdx + 1) / total) * 100) : 0;
    if (barEl) barEl.style.width = pct + '%';
    if (pctEl) pctEl.innerText = pct + '% SELESAI';

    // Example sentences (split on "—" or "-")
    const exKr = document.getElementById('flashcard-example-kr');
    const exId = document.getElementById('flashcard-example-id');
    if (data.example) {
      const parts = data.example.split(/—|–|-/).map(s => s.trim().replace(/^["']|["']$/g, ''));
      if (exKr) exKr.innerText = parts[0] || data.example;
      if (exId) exId.innerText = parts[1] ? `"${parts[1]}"` : '';
    } else {
      if (exKr) exKr.innerText = '';
      if (exId) exId.innerText = '';
    }

    // Mascot guidance: reset flip + dynamic tip
    const inner = document.getElementById('flashcard-inner');
    if (inner) inner.classList.remove('is-flipped');
    const mascotEl = document.getElementById('flashcard-mascot-text');
    if (mascotEl) mascotEl.innerText = this._getMascotTip(data);

    // Same-Chapter Word Chips
    this._renderSameChapterChips(data, safeIdx);
  },

  _renderSameChapterChips(currentData, currentFilteredIdx) {
    const grid = document.getElementById('flashcard-related-grid');
    if (!grid) return;

    const chapter = currentData.chapter;
    if (!chapter) {
      grid.innerHTML = '';
      grid.classList.add('hidden');
      return;
    }

    const allData = this.vocabData || [];
    const sameChapter = allData.filter(v => v.chapter === chapter && v.uid !== currentData.uid);
    const chips = sameChapter.slice(0, 2);

    const filtered = this._applyFilterToVocab();

    if (chips.length === 0) {
      grid.innerHTML = '';
      grid.classList.add('hidden');
      return;
    }

    grid.classList.remove('hidden');
    let html = '';
    chips.forEach(chip => {
      const chipIdx = filtered.findIndex(v => v.uid === chip.uid);
      const clickable = chipIdx !== -1;
      const label = 'Bab ' + (chip.chapter || '?');
      html += `<div class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 ${clickable ? 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors' : 'opacity-50'}" ${clickable ? `onclick="window.flashcardEngine.goToIndex(${chipIdx})"` : ''}>
        <span class="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">${label}</span>
        <span class="font-medium text-sm text-slate-800 dark:text-white">${chip.kr}</span>
      </div>`;
    });
    grid.innerHTML = html;
  },

  goToIndex(filteredIdx) {
    const filtered = this._applyFilterToVocab();
    if (filteredIdx >= 0 && filteredIdx < filtered.length) {
      this.vocabIndex = filteredIdx;
      this._renderFlashcardScreen(filteredIdx);
    }
  },

  _getUniqueChapters() {
    this._ensureVocab();
    const chapters = new Set();
    this.vocabData.forEach(v => {
      if (v.chapter !== undefined && v.chapter !== null) chapters.add(v.chapter);
    });
    return Array.from(chapters).sort((a, b) => a - b);
  },

  _getMascotTip(data) {
    const pool = [];

    if (data.category === 'grammar') {
      pool.push('Ini tata bahasa Korea. Perhatikan pola penggunaannya dalam kalimat!');
      pool.push('Grammar penting untuk membentuk kalimat. Pelajari pola ini baik-baik!');
    } else {
      pool.push('Kosakata baru nih! Coba lihat contoh kalimatnya di balik kartu.');
      pool.push('Tambahkan kata ini ke daftar hafalan harian kamu!');
    }

    if (data.example && data.example.length > 5) {
      pool.push('Baca contoh kalimat di balik kartu — pahami konteks kata ini dalam percakapan!');
      pool.push('Contoh kalimat tersedia! Lihat di belakang kartu untuk penggunaan nyata.');
    }

    if (data.chapter) {
      pool.push(`Kata ini dari Bab ${data.chapter}. Pelajari bareng kata lain di bab yang sama!`);
    }

    pool.push('Tekan kartu untuk melihat arti dan contoh kalimat!');
    pool.push('Gunakan fitur AI Hana untuk tanya lebih detail tentang kata ini!');
    pool.push('Coba ucapkan kata ini dengan suara keras — latih pengucapanmu!');
    pool.push('Perhatikan romanisasi untuk membantu membaca hangul!');
    pool.push('Semakin sering kamu lihat, semakin mudah diingat. Keep going!');

    return pool[Math.floor(Math.random() * pool.length)];
  },

  _updateChapterLabel() {
    const label = document.getElementById('flashcard-chapter-label');
    if (!label) return;
    label.innerText = this.currentChapter === 'all' ? 'Semua Bab' : 'Bab ' + this.currentChapter;
  },

  openChapterPicker() {
    const overlay = document.getElementById('chapter-picker-sheet');
    const panel = document.getElementById('chapter-picker-content');
    const grid = document.getElementById('chapter-picker-grid');
    if (!overlay || !panel || !grid) return;

    this._ensureVocab();
    const chapters = this._getUniqueChapters();
    const counts = {};
    this.vocabData.forEach(v => {
      if (v.chapter !== undefined && v.chapter !== null) {
        counts[v.chapter] = (counts[v.chapter] || 0) + 1;
      }
    });

    const selected = this.currentChapter;
    let html = `<div onclick="window.flashcardEngine.setChapter('all')" class="flex flex-col items-center justify-center p-3 rounded-2xl border-2 cursor-pointer active:scale-95 transition-all ${selected === 'all' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-700'}">
      <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Semua</span>
      <span class="text-base font-black text-slate-800 dark:text-white mt-0.5">All</span>
      <span class="text-[9px] text-slate-400 mt-0.5">${this.vocabData.length} kata</span>
    </div>`;

    chapters.forEach(ch => {
      const isActive = selected === ch;
      const count = counts[ch] || 0;
      html += `<div onclick="window.flashcardEngine.setChapter(${ch})" class="flex flex-col items-center justify-center p-3 rounded-2xl border-2 cursor-pointer active:scale-95 transition-all ${isActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-700'}">
        <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Bab</span>
        <span class="text-lg font-black text-indigo-600 dark:text-indigo-400">${ch}</span>
        <span class="text-[9px] text-slate-400 mt-0.5">${count} kata</span>
      </div>`;
    });

    grid.innerHTML = html;

    overlay.classList.remove('hidden');
    overlay.style.opacity = '0';
    panel.classList.remove('translate-y-0');
    panel.classList.add('translate-y-full');
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      panel.classList.remove('translate-y-full');
      panel.classList.add('translate-y-0');
    });
  },

  closeChapterPicker() {
    const overlay = document.getElementById('chapter-picker-sheet');
    const panel = document.getElementById('chapter-picker-content');
    if (!overlay || !panel) return;
    panel.classList.remove('translate-y-0');
    panel.classList.add('translate-y-full');
    overlay.style.opacity = '0';
    setTimeout(() => overlay.classList.add('hidden'), 300);
  },

  setChapter(chapter) {
    this.currentChapter = chapter;
    this.vocabIndex = 0;
    this._updateChapterLabel();
    this.closeChapterPicker();
    this._renderFlashcardScreen(0);
  },

  toggleExample(type, event) {
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    const box = document.getElementById(`box-ex-${type}`);
    const btn = document.getElementById(`btn-ex-${type}`);
    if (!box || !btn) return;
    
    const isHidden = box.classList.contains('hidden');
    if (isHidden) {
      box.classList.remove('hidden');
      btn.innerHTML = '✕ Sembunyikan Kalimat';
    } else {
      box.classList.add('hidden');
      btn.innerHTML = '💡 Lihat Konteks Kalimat';
    }
  }
};

// ============================================================
// REFRESH ODAP NOTE (dipanggil dari navigator)
// ============================================================
function refreshOdapNote() {
  // Render ulang tampilan Review (오답노트) saat navigasi diklik
  if (typeof app !== 'undefined' && app.renderDashboard) {
    app.renderDashboard();
  }
}

// ============================================================
// GLOBAL CONFIRM EXIT MODAL TRIGGER
// ============================================================
window.showConfirmExit = function(exitCallback, type = 'game') {
  const modal = document.getElementById('modal-confirm-exit');
  const btnConfirm = document.getElementById('btn-confirm-exit');
  const titleEl = document.getElementById('confirm-exit-title');
  const descEl = document.getElementById('confirm-exit-desc');

  if (modal && btnConfirm) {
    if (type === 'kuis') {
      if (titleEl) titleEl.innerText = 'Akhiri Sesi Belajar?';
      if (descEl) descEl.innerText = 'Jika kamu keluar sekarang, jawaban pada sesi ini tidak akan tersimpan.';
    } else {
      if (titleEl) titleEl.innerText = 'Tinggalkan Game?';
      if (descEl) descEl.innerText = 'Jika Anda keluar sekarang, progres game ini akan hilang dan XP batal ditambahkan.';
    }

    btnConfirm.onclick = function() {
      modal.classList.add('hidden');
      
      if (type === 'kuis' && typeof app.clearSession === 'function') {
        app.clearSession();
      }
      
      if (typeof exitCallback === 'function') exitCallback();
    };
    
    modal.classList.remove('hidden');
  }
};
// ============================================================
// 🔬 ULTRA-SAFE HANA CUSTOM SIMULATOR ENGINE (ANTI-INFINITE LOOP)
// ============================================================
window.showSandboxBuilder = function() {
  // Cegah duplikasi modal di layar
  const oldModal = document.getElementById('hana-sandbox-modal');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'hana-sandbox-modal';
  modal.className = "fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200";
  modal.style.zIndex = "9999999";

  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] p-6 w-full max-w-sm shadow-2xl flex flex-col text-slate-800 dark:text-white max-h-[90dvh] overflow-y-auto custom-scrollbar">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-base font-black tracking-tight">🔬 HANA Custom Lab</h3>
        <button id="btn-close-sandbox" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-500 transition-colors">✕</button>
      </div>
      
      <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-4 leading-relaxed">Rakit simulasi kustom UBT Anda. Bebas tentukan batas kemampuan kompetensi Anda hari ini.</p>
      
      <div class="flex flex-col gap-3.5 mb-5">
        <div>
          <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Jumlah Soal</label>
          <input type="number" id="sb-count" value="10" min="1" max="50" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm focus:border-[#6C63FF] focus:outline-none transition-colors">
        </div>
        
        <div>
          <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Durasi Waktu (Menit)</label>
          <input type="number" id="sb-time" value="15" min="1" max="120" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm focus:border-[#6C63FF] focus:outline-none transition-colors">
        </div>
        
        <div>
          <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Cakupan Klaster Bab</label>
          <select id="sb-scope" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs focus:border-[#6C63FF] focus:outline-none transition-colors">
            <option value="all">Semua Bab (Acak Total Bank)</option>
            <option value="dasar">Teori Dasar (Bab 6 - 12)</option>
            <option value="industri">Lingkungan Kerja (Bab 13 - 20)</option>
            <option value="budaya">Budaya & Keselamatan (Bab 21 - 28)</option>
            <option value="layanan">Layanan & Etika (Bab 29 - 36)</option>
            <option value="fasilitas">Fasilitas & Operasional (Bab 37 - 44)</option>
            <option value="sektor">Sektor & Regulasi (Bab 45 - 52)</option>
            <option value="dokumen">Dokumen & Kepatuhan (Bab 53 - 60)</option>
            <option value="manual">Pilih Manual (Bab 6 - 60)</option>
          </select>
        </div>

        <div id="sb-manual-range" class="hidden flex gap-2">
          <div class="flex-1">
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Dari Bab</label>
            <input type="number" id="sb-range-start" value="6" min="6" max="60" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm focus:border-[#6C63FF] focus:outline-none transition-colors">
          </div>
          <div class="flex-1">
            <label class="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Sampai Bab</label>
            <input type="number" id="sb-range-end" value="10" min="6" max="60" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm focus:border-[#6C63FF] focus:outline-none transition-colors">
          </div>
        </div>
      </div>
      
      <button id="btn-start-sandbox" class="w-full py-3.5 bg-gradient-to-r from-[#6C63FF] to-[#5145E5] text-white font-black rounded-xl text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-indigo-500/20 flex justify-center items-center gap-2">
        🚀 Mulai Simulasi Kustom
      </button>
    </div>
  `;

  document.body.appendChild(modal);
  document.getElementById('btn-close-sandbox').onclick = () => modal.remove();

  // Toggle manual range inputs
  document.getElementById('sb-scope').onchange = function() {
    const manual = document.getElementById('sb-manual-range');
    manual.classList.toggle('hidden', this.value !== 'manual');
  };

  document.getElementById('btn-start-sandbox').onclick = function() {
    let qCount = parseInt(document.getElementById('sb-count').value) || 10;
    let durationMinutes = parseInt(document.getElementById('sb-time').value) || 15;
    let scope = document.getElementById('sb-scope').value;

    if (qCount < 1) qCount = 1;

    // 1. Ekstraksi bank data soal secara aman
    let allPool = [];
    if (window.Bank) {
      ['beginner', 'normal', 'pro'].forEach(lvl => {
        if (window.Bank[lvl]) {
          if (window.Bank[lvl].questions) allPool = allPool.concat(window.Bank[lvl].questions);
          if (window.Bank[lvl].reading) allPool = allPool.concat(window.Bank[lvl].reading);
          if (window.Bank[lvl].listening) allPool = allPool.concat(window.Bank[lvl].listening);
        }
      });
    }

    // Fallback data jika objek Bank eksternal gagal di-load
    if (allPool.length === 0 && app.state && app.state.questions) {
      allPool = [...app.state.questions];
    }

    // 1.5 Filter Ketat: Eliminasi semua soal yang mengandung abjad Latin
    allPool = allPool.filter(q => {
      if(!q || !q.q) return false;
      const textToCheck = q.q + " " + (q.a ? q.a.join(" ") : "");
      const sanitized = textToCheck.replace(/MSDS|CO2|TV/g, '');
      return !/[a-zA-Z]/.test(sanitized);
    });

    // Helper: filter soal berdasarkan range bab (q.ch)
    function filterByChapterRange(pool, start, end) {
      return pool.filter(q => q.ch && q.ch >= start && q.ch <= end);
    }

    // Filter berdasarkan klaster bab jika dipilih kustom
    if (scope !== 'all') {
      const rangeMap = {
        dasar:    [6, 12],
        industri: [13, 20],
        budaya:   [21, 28],
        layanan:  [29, 36],
        fasilitas:[37, 44],
        sektor:   [45, 52],
        dokumen:  [53, 60],
      };

      if (scope === 'manual') {
        let start = parseInt(document.getElementById('sb-range-start').value) || 6;
        let end = parseInt(document.getElementById('sb-range-end').value) || 60;
        start = Math.max(6, Math.min(60, start));
        end = Math.max(6, Math.min(60, end));
        if (start > end) [start, end] = [end, start];

        const filtered = filterByChapterRange(allPool, start, end);
        // Jika tidak ada soal dengan ch, fallback ke semua soal (cluster 6-28 tidak punya ch)
        allPool = filtered.length > 0 ? filtered : allPool;
      } else {
        const range = rangeMap[scope];
        if (range) {
          // Cluster 6-28: data beginner tidak punya ch, jadi fallback ke allPool
          if (range[0] >= 29) {
            allPool = filterByChapterRange(allPool, range[0], range[1]);
          } else {
            const filtered = filterByChapterRange(allPool, range[0], range[1]);
            if (filtered.length > 0) allPool = filtered;
          }
        }
      }
    }

    // Pengaman darurat jika data klaster benar-benar kosong
    if (allPool.length === 0) {
      if (typeof showToast === 'function') {
        showToast('Stok soal untuk bab ini belum tersedia!', 'error');
      }
      modal.remove();
      return;
    }

    // Split kategori soal untuk formula berimbang 50:50
    let readingPool = app.shuffle(allPool.filter(q => q.type !== 'listening'));
    let listeningPool = app.shuffle(allPool.filter(q => q.type === 'listening'));

    if (readingPool.length === 0) readingPool = [...allPool];
    if (listeningPool.length === 0) listeningPool = [...allPool];

    // 2. FORMULA PERAKITAN AMAN (DIBATASI PANJANG ARRAY NATIF - ANTI STUCK)
    let finalQuestions = [];
    const half = Math.ceil(qCount / 2);

    // Isi slot reading seadanya stok
    for (let i = 0; i < half; i++) {
      if (readingPool[i]) finalQuestions.push(readingPool[i]);
    }
    
    // Penuhi slot sisa dari listening pool
    for (let i = 0; i < listeningPool.length; i++) {
      if (finalQuestions.length >= qCount) break;
      if (listeningPool[i] && !finalQuestions.some(fq => fq.id === listeningPool[i].id)) {
        finalQuestions.push(listeningPool[i]);
      }
    }

    // Jika total kuota masih kurang karena stok bank sedikit, penuhi dari sisa allPool secara linier
    if (finalQuestions.length < qCount) {
      let remain = app.shuffle([...allPool]);
      for (let i = 0; i < remain.length; i++) {
        if (finalQuestions.length >= qCount) break;
        if (!finalQuestions.some(fq => fq.id === remain[i].id)) {
          finalQuestions.push(remain[i]);
        }
      }
    }

    // Pengocokan urutan soal final agar variatif
    finalQuestions = app.shuffle(finalQuestions);

    // Hapus modal dari layar
    modal.remove();

    // 3. Konfigurasi State Engine Utama HANA Kuis
    app.state.isSimulasi = true; 
    app.state.isStage = false;
    app.state.isDaily = false;
    app.state.mode = 'ujian'; 

    const totalSeconds = durationMinutes * 60;

    if (typeof app.toggleImmersiveMode === 'function') {
      app.toggleImmersiveMode(true);
    }

    // Luncurkan kuis kustom
    app.setupQuizEngine(finalQuestions, [], 'Custom Simulator Lab', totalSeconds, finalQuestions.length);
  };
};
