// =========================================================================
// ⏱️ HANA CORE QUIZ COMMAND ENGINE (MODULAR ENGINE PROD-GRADE)
// =========================================================================

Object.assign(app, {
  // === HANA MASCOT ENCOURAGEMENT PHRASES ===
  _mascotPhrases: [
    'Semangat! Kamu pasti bisa! 💪',
    'Ayo, baca soalnya baik-baik! 📖',
    'Fokus! Hana yakin kamu hebat! ⭐',
    'Jangan terburu-buru, pikir dulu! 🧠',
    'Kamu sudah sejauh ini, teruskan! 🚀',
    'Hana bangga sama kamu! 🌟',
    'Satu soal lagi, kamu pasti bisa! 🔥',
    'Tenang, kerjakan dengan santai! 😊',
    'Setiap soal bikin kamu makin pintar! 📚',
    'Ayo buktikan kemampuanmu! 🏆',
    'Kamu lebih hebat dari yang kamu kira! ✨',
    'Fokus dan percaya diri! 🎯',
  ],
  _getRandomPhrase() {
    return this._mascotPhrases[Math.floor(Math.random() * this._mascotPhrases.length)];
  },
  _updateMascotBubble(text) {
    const el = document.getElementById('hana-quiz-bubble');
    if (el) el.innerText = text;
  },

  // === SESSION RECOVERY MECHANISMS ===
  recoverSession() {
    const saved = sessionStorage.getItem('eps_quiz_session');
    if (saved) {
      if (confirm('Sesi kuis sebelumnya terhenti. Apakah Anda ingin melanjutkannya?')) {
        this.state = JSON.parse(saved);
        app.switchScreen('quiz-screen');
        
        if (this.state.isSimulasi) this.setQuizTheme('theme-winter');
        else if (this.state.currentStageLevel === 'beginner') this.setQuizTheme('theme-forest');
        else if (this.state.currentStageLevel === 'normal') this.setQuizTheme('theme-water');
        else if (this.state.currentStageLevel === 'pro') this.setQuizTheme('theme-autumn');
        else this.setQuizTheme('');
        
        this.startTimer();
        this.renderQuestion();
      } else {
        this.clearSession();
      }
    }
  },

  saveSession() {
    sessionStorage.setItem('eps_quiz_session', JSON.stringify(this.state));
  },
  
  clearSession() {
    sessionStorage.removeItem('eps_quiz_session');
  },

  // === ALPHABET REMOVAL & STRICT SANITIZATION ENGINE ===
  stripLatin(text) {
    if (typeof text !== 'string') return text;
    let res = text.replace(/MSDS/g, '{@M@}').replace(/CO2/g, '{@C@}').replace(/TV/g, '{@T@}');
    res = res.replace(/\s*\([^)]*[a-zA-Z][^)]*\)/g, '');
    res = res.replace(/[a-zA-Z]/g, '');
    res = res.replace(/\{@M@\}/g, 'MSDS').replace(/\{@C@\}/g, 'CO2').replace(/\{@T@\}/g, 'TV');
    res = res.replace(/\s{2,}/g, ' ').trim();
    if (res.length === 0 || !/[가-힣0-9MCT]/.test(res)) {
      return "❓";
    }
    return res;
  },

  // === QUIZ ENTRY DOORS (LAUNCH ENGINE ROUTERS) ===
  startImageQuiz() {
    this.toggleImmersiveMode(true);
    let imageQuestions = [];
    for (let level in Bank) {
      for (let type of ['reading', 'listening']) {
        const questions = Bank[level][type];
        for (let q of questions) {
          if (q.image && q.image.trim() !== '') {
            imageQuestions.push({ ...q, type, level });
          }
        }
      }
    }
    if (imageQuestions.length === 0) {
      showInfoModal('🖼️ Tidak Ada Soal Bergambar', 'Belum ada soal bergambar. Silakan tambahkan dulu ke bank soal dengan properti "image".');
      return;
    }
    const shuffled = this.shuffle(imageQuestions);
    const selected = shuffled.slice(0, 15);
    this.state.isImageQuiz = true;
    this.state.isDaily = false;
    this.state.isSimulasi = false;
    this.state.isStage = false;
    this.state.questions = selected;
    this.state.level = 'Soal Bergambar';
    this.state.currentIdx = 0;
    this.state.correctCount = 0;
    this.state.readingCorrect = 0;
    this.state.listeningCorrect = 0;
    this.state.answers = [];
    this.state.timeLeft = 300;
    this.state.totalQ = selected.length;
    app.switchScreen('quiz-screen');
    document.getElementById('q-counter').innerText = `1/${this.state.totalQ}`;
    this.startTimer();
    this.renderQuestion();
  },

  startStage(level, stage) {
    const progress = this.data.stageProgress[level];
    if (stage > progress.unlocked) {
      showInfoModal('🔒 Terkunci', `Selesaikan Stage ${stage - 1} dengan nilai minimal 80% untuk membuka stage ini.`);
      return;
    }
    this.toggleImmersiveMode(true);
    this.state.isStage = true;
    this.state.currentStageLevel = level;
    this.state.currentStageNum = stage;
    this.state.isDaily = false;
    this.state.isSimulasi = false;
    const bank = Bank[level];
    let allQuestions = [...bank.reading.map(q => ({ ...q, type: 'reading' })), ...bank.listening.map(q => ({ ...q, type: 'listening' }))];
    allQuestions = this.shuffle(allQuestions);
    const selected = [];
    const usedIds = new Set();
    for (let q of allQuestions) {
      if (selected.length >= 15) break;
      if (!usedIds.has(q.id)) {
        usedIds.add(q.id);
        selected.push(q);
      }
    }
    this.state.questions = selected;
    this.state.level = `${level.toUpperCase()} Stage ${stage}`;
    this.state.currentIdx = 0;
    this.state.correctCount = 0;
    this.state.readingCorrect = 0;
    this.state.listeningCorrect = 0;
    this.state.answers = [];
    const duration = { beginner: 180, normal: 420, pro: 600 }[level];
    this.state.timeLeft = duration;
    this.state.totalQ = 15;
    app.switchScreen('quiz-screen');
    if (level === 'beginner') this.setQuizTheme('theme-forest');
    else if (level === 'normal') this.setQuizTheme('theme-water');
    else if (level === 'pro') this.setQuizTheme('theme-autumn');

    document.getElementById('q-counter').innerText = `1/15`;
    this.startTimer();
    this.renderQuestion();
  },

  startDailyChallenge() {
    this.state.isStage = false;
    this.state.isDaily = true; this.state.isSimulasi = false;
    const allR = [...Bank.beginner.reading, ...Bank.normal.reading, ...Bank.pro.reading];
    const allL = [...Bank.beginner.listening, ...Bank.normal.listening, ...Bank.pro.listening];
    this.setupQuizEngine(this.shuffle(allR).slice(0, 8), this.shuffle(allL).slice(0, 7), 'Daily Challenge', 420, 15);
  },

  startQuiz(level) {
    this.state.isStage = false;
    this.state.isDaily = false; this.state.isSimulasi = false;
    const bank = Bank[level];
    this.setupQuizEngine(this.shuffle(bank.reading).slice(0, 8), this.shuffle(bank.listening).slice(0, 7), level, { beginner: 180, normal: 420, pro: 600 }[level], 15);
  },

  startSmartReview(selectedData) {
    if (!this.data.badges) this.data.badges = {};
    this.data.badges.smartReviewer = true; Storage.set(this.data);
    const source = selectedData || this.data.wrongAnswers || [];
    if (source.length < 3) {
      const msg = `Belum cukup soal salah untuk Smart Review.\nMinimal 3 soal salah dibutuhkan.\nSekarang ada ${source.length} soal salah.`;
      showInfoModal('🔁 Smart Review', msg);
      return;
    }
    const questions = (selectedData ? source : this.shuffle(source)).map(w => {
      for (let lvl in Bank) {
        for (let type of ['reading', 'listening']) {
          const found = Bank[lvl][type].find(q => q.q === w.q);
          if (found) return { ...found, type };
        }
      }
      return { q: w.q, a: [w.correct, w.user, '—', '—'].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4), c: w.correct, ex: w.ex || '', type: w.type || 'reading' };
    }).filter(Boolean);
    this.state.isStage = false;
    this.state.isDaily = false; this.state.isSimulasi = false; this.state.isImageQuiz = false;
    this.state.questions = this.shuffle(questions);
    this.state.level = 'Smart Review';
    this.state.currentIdx = 0; this.state.correctCount = 0;
    this.state.readingCorrect = 0; this.state.listeningCorrect = 0;
    this.state.answers = [];
    this.state.totalQ = questions.length;
    hideAllScreens();
    document.getElementById('quiz-screen').classList.remove('hidden');
    document.getElementById('quiz-screen').classList.add('flex');
    const timerEl = document.getElementById('quiz-timer-container');
    if (timerEl) timerEl.classList.add('hidden');

    document.getElementById('q-counter').innerText = `1/${this.state.totalQ}`;
    this.renderQuestion();
  },

  startSimulasi() {
    this.state.isStage = false;
    this.state.isSimulasi = true; this.state.isDaily = false;

    const strictFilter = (q) => {
      if(!q || !q.q) return false;
      const textToCheck = q.q + " " + (q.a ? q.a.join(" ") : "");
      const sanitized = textToCheck.replace(/MSDS|CO2|TV/g, '');
      return !/[a-zA-Z]/.test(sanitized);
    };

    const allR = [...Bank.normal.reading, ...Bank.pro.reading].filter(strictFilter);
    const allL = [...Bank.normal.listening, ...Bank.pro.listening].filter(strictFilter);
    
    this.setupQuizEngine(this.shuffle(allR).slice(0, 10), this.shuffle(allL).slice(0, 10), 'Simulasi Ujian', 1800, 20);
  },

  // === OPERATIONS RUNTIME ENGINE CORE ===
  setupQuizEngine(r, l, label, sec, totalQ) {
    this.state.isStudyMode = (localStorage.getItem('hana_quiz_play_mode') || 'ujian') === 'belajar';
    this.toggleImmersiveMode(true);
    const mixed = this.shuffle([...r.map(q => ({ ...q, type: 'reading' })), ...l.map(q => ({ ...q, type: 'listening' }))]);
    this.state.questions = mixed;
    this.state.level = label;
    this.state.currentIdx = 0; this.state.correctCount = 0;
    this.state.readingCorrect = 0; this.state.listeningCorrect = 0;
    this.state.answers = []; this.state.timeLeft = sec;
    this.state.totalQ = totalQ;
    app.switchScreen('quiz-screen');
    if(label === 'Simulasi Ujian') this.setQuizTheme('theme-winter');
    else this.setQuizTheme('');

    document.getElementById('q-counter').innerText = `1/${totalQ}`;
    this.saveSession();
    this.startTimer();
    this.renderQuestion();
  },

  startTimer() {
    if (this.state.isUnlimitedTimer) {
      document.getElementById('q-timer').innerText = '∞';
      document.getElementById('timer-box').classList.add('timer-unlimited');
      return;
    }
    clearInterval(this.state.timer);
    this.state.timer = setInterval(() => {
      if (this.state.pageHidden) return;
      if (this.state.timeLeft <= 0) { this.finishQuiz(); return; }
      this.state.timeLeft--;
      let m = Math.floor(this.state.timeLeft / 60), s = this.state.timeLeft % 60;
      document.getElementById('q-timer').innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      if (this.state.timeLeft < 60) document.getElementById('timer-box').classList.add('timer-warning');
      else document.getElementById('timer-box').classList.remove('timer-warning');
    }, 1000);
  },

  renderQuestion() {
    this.state.isAnswerChecked = false;
    this.state.tempSelectedAnswer = null;
    this.state.tempSelectedButton = null;

    const q = this.state.questions[this.state.currentIdx];
    const totalQ = this.state.totalQ;

    const isStrictMode = this.state.isSimulasi || (q.id && (q.id.startsWith('n_') || q.id.startsWith('p_')));

    document.getElementById('q-counter').innerText = `${this.state.currentIdx + 1}/${totalQ}`;
    document.getElementById('q-progress').style.width = `${((this.state.currentIdx) / totalQ) * 100}%`;

    document.getElementById('q-text').innerText = q.q;

    const imgCont = document.getElementById('q-image-container');
    const img = document.getElementById('q-image');
    if (imgCont && img) {
      if (q.image && q.image.trim() !== "") {
        img.src = q.image;
        imgCont.classList.remove('hidden');
        imgCont.classList.add('flex'); 
      } else {
        img.removeAttribute('src');
        imgCont.classList.remove('flex');
        imgCont.classList.add('hidden');
      }
    }

    const audioBox = document.getElementById('q-audio-box');
    if (q.type === 'listening') {
      audioBox.classList.remove('hidden'); audioBox.classList.add('flex');
      this.state.audioPlaysLeft = 2; this.updateAudioUI();
    } else { audioBox.classList.add('hidden'); audioBox.classList.remove('flex'); }

    const opts = document.getElementById('q-options');
    opts.innerHTML = '';
    opts.className = 'flex flex-col gap-3';
    opts.style.border = 'none';
    opts.style.outline = 'none';

    this.shuffle(q.a).forEach((opt, idx) => {
      const b = document.createElement('button');
      const textJawaban = opt;
      const letter = String.fromCharCode(65 + idx);

      b.className = 'q-option';
      b.innerHTML = `<div class="q-circle">${letter}</div><span class="q-opt-text">${textJawaban}</span>`;

      b.dataset.originalOpt = opt;
      b.onclick = (e) => this.handleAnswer(e, opt, q);
      opts.appendChild(b);
    });
    
    if (this.state.currentIdx + 1 < totalQ) {
      const nextQ = this.state.questions[this.state.currentIdx + 1];
      if (nextQ && nextQ.type === 'listening' && nextQ.audio && nextQ.audio.endsWith('.mp3') && nextQ.audio.startsWith('http')) {
        // empty
      } else if (nextQ && nextQ.type === 'listening' && nextQ.audio && nextQ.audio.endsWith('.mp3')) {
        try {
           const audioPreload = new Audio(nextQ.audio);
           audioPreload.preload = 'auto';
        } catch(e){ console.warn(e) }
      }
    }

    if (!this.data.bookmarks) this.data.bookmarks = [];
    const btnBm = document.getElementById('btn-bookmark');
    if (btnBm) {
      const isBm = this.data.bookmarks.some(b => b.q === q.q);
      if (isBm) {
        btnBm.classList.add('bg-yellow-400', 'text-white');
        btnBm.classList.remove('bg-[var(--hana-card)]');
      } else {
        btnBm.classList.remove('bg-yellow-400', 'text-white');
        btnBm.classList.add('bg-[var(--hana-card)]');
      }
    }

    document.getElementById('q-feedback').classList.add('hidden');
    document.getElementById('btn-next').classList.add('hidden');
    document.getElementById('timer-box').classList.remove('timer-warning');

    this._updateMascotBubble(this._getRandomPhrase());
  },

  playAudio() {
    if (this.state.audioPlaysLeft <= 0) {
      if (typeof showToast === 'function') showToast('Batas putar audio tercapai!', 'error');
      return;
    }
    const q = this.state.questions[this.state.currentIdx];
    const u = new SpeechSynthesisUtterance(q.audio); 
    u.lang = 'ko-KR';
    const speed = [0.75, 1.0, 1.25][this.state.audioSpeedIndex || 1];
    u.rate = speed;
    
    // UI Animation Logic
    const bar = document.getElementById('audio-progress-bar');
    const statusTxt = document.getElementById('audio-status-text');
    const playBtn = document.getElementById('btn-play-audio');
    
    if (bar && statusTxt && playBtn) {
      playBtn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-pulse">volume_up</span>';
      statusTxt.innerText = 'MEMUTAR...';
      bar.style.transition = `width ${(3.5 / speed).toFixed(1)}s linear`;
      setTimeout(() => { bar.style.width = '100%'; }, 50);
    }
    
    u.onend = () => {
      if (bar && statusTxt && playBtn) {
        playBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">play_arrow</span>';
        statusTxt.innerText = 'SELESAI';
        bar.style.transition = 'none';
        bar.style.width = '0%';
      }
    };
    
    window.speechSynthesis.speak(u);
    this.state.audioPlaysLeft--;
    this.updateAudioUI();
  },

  updateAudioUI() {
    const playLeftEl = document.getElementById('audio-plays-left');
    if (playLeftEl) playLeftEl.innerText = `Sisa Putar: ${this.state.audioPlaysLeft}`;
    const btnPlay = document.getElementById('btn-play-audio');
    if (btnPlay && this.state.audioPlaysLeft <= 0) {
      btnPlay.classList.add('opacity-50', 'cursor-not-allowed', 'grayscale');
    } else if (btnPlay) {
      btnPlay.classList.remove('opacity-50', 'cursor-not-allowed', 'grayscale');
    }
  },

  toggleAudioSpeed() {
    let speeds = [0.75, 1.0, 1.25];
    this.state.audioSpeedIndex = ((this.state.audioSpeedIndex || 1) + 1) % speeds.length;
    const speed = speeds[this.state.audioSpeedIndex];
    const btnSpeed = document.getElementById('btn-audio-speed');
    if (btnSpeed) btnSpeed.innerText = speed.toFixed(2) + 'x';
  },

  handleAnswer(event, userAns, qObj) {
    if (this.state.isAnswerChecked) return;
    const btn = event.currentTarget;
    
    // 1. Reset all buttons to default state
    const buttons = document.querySelectorAll('.q-option');
    buttons.forEach(b => {
      b.classList.remove('selected');
    });
    
    // 2. Mark selected
    btn.classList.add('selected');
    
    this.state.tempSelectedAnswer = userAns;
    this.state.tempSelectedButton = btn;
    
    // 3. Show Next Button Dynamically
    const btnNext = document.getElementById('btn-next');
    if (btnNext) {
      btnNext.classList.remove('hidden');
      const isBelajar = localStorage.getItem('hana_quiz_play_mode') === 'belajar';
      if (isBelajar && !this.state.isSimulasi && !this.state.isImageQuiz && this.state.level !== 'Soal Bergambar') {
        btnNext.innerHTML = 'Periksa Jawaban ➔';
      } else {
        btnNext.innerHTML = 'Lanjut ➔';
      }
    }
  },

  handleNextButton() {
    const q = this.state.questions[this.state.currentIdx];
    const btnNext = document.getElementById('btn-next');
    const buttons = document.querySelectorAll('.q-option');

    const isBelajar = localStorage.getItem('hana_quiz_play_mode') === 'belajar';
    if (isBelajar && !this.state.isSimulasi && !this.state.isImageQuiz && this.state.level !== 'Soal Bergambar') {
      if (!this.state.isAnswerChecked) {
        this.state.isAnswerChecked = true;
        buttons.forEach(b => b.classList.add('disabled'));

        const correct = this.state.tempSelectedAnswer === q.c;
        this.state.answers.push({ q: q.q, user: this.state.tempSelectedAnswer, correct: q.c, isCorrect: correct, ex: q.ex, type: q.type });

        if (!correct) {
          this.data.wrongAnswers.push({ q: q.q, user: this.state.tempSelectedAnswer, correct: q.c, ex: q.ex, type: q.type });
          Storage.set(this.data);
        }

        if (correct) {
          this.state.tempSelectedButton.classList.add('correct-punch', 'correct');
          this.state.correctCount++;
          q.type === 'reading' ? this.state.readingCorrect++ : this.state.listeningCorrect++;
          Sound.play('correct');
          this._updateMascotBubble('Tepat sekali! Hebat! 🎉');
        } else {
          this.state.tempSelectedButton.classList.remove('selected');
          this.state.tempSelectedButton.classList.add('wrong');
          buttons.forEach(b => { if (b.dataset.originalOpt === q.c) b.classList.add('correct'); });
          Sound.play('wrong');
          if (navigator.vibrate && (!this.data.settings || this.data.settings.vibration !== false)) {
            navigator.vibrate(100);
          }
          this._updateMascotBubble('Yah, kurang tepat. Coba lagi ya! 💪');
        }

        const fb = document.getElementById('q-feedback');
        if (fb) {
          fb.className = 'rounded-[20px] p-4 text-sm font-bold shadow-sm border select-none';
          if (correct) {
            fb.style.cssText = 'background: #e7f5ed; color: #006949; border-color: rgba(0,105,73,0.3);';
          } else {
            fb.style.cssText = 'background: #fef2f2; color: #dc2626; border-color: rgba(220,38,38,0.3);';
          }
          const icon = correct ? 'check_circle' : 'cancel';
          fb.innerHTML = `<div class="flex items-center gap-2"><span class="material-symbols-outlined">${icon}</span><span>${correct ? 'Tepat Sekali!' : 'Kurang Tepat'}</span></div><div class="mt-2 font-normal text-sm">${q.ex}</div>`;
          fb.classList.remove('hidden');
        }

        if (btnNext) btnNext.innerHTML = this.state.currentIdx === this.state.totalQ - 1 ? 'Selesai ➔' : 'Lanjut ➔';
        return;
      }
    } else {
      const correct = this.state.tempSelectedAnswer === q.c;
      this.state.answers.push({ q: q.q, user: this.state.tempSelectedAnswer, correct: q.c, isCorrect: correct, ex: q.ex, type: q.type });
      
      if (!correct) {
        this.data.wrongAnswers.push({ q: q.q, user: this.state.tempSelectedAnswer, correct: q.c, ex: q.ex, type: q.type });
        Storage.set(this.data);
        if (navigator.vibrate && (!this.data.settings || this.data.settings.vibration !== false)) {
          navigator.vibrate(100);
        }
      }
      
      if (correct) {
        this.state.correctCount++;
        q.type === 'reading' ? this.state.readingCorrect++ : this.state.listeningCorrect++;
      }
    }

    this.nextQuestion();
  },

  nextQuestion() {
    this.state.currentIdx++;
    this.saveSession();
    if (this.state.currentIdx < this.state.totalQ) this.renderQuestion();
    else this.finishQuiz();
  },

  finishQuiz() {
    clearInterval(this.state.timer);
    this.clearSession();
    app.switchScreen('result-screen');

    const btnNextStage = document.getElementById('btn-next-stage');
    if (btnNextStage) btnNextStage.classList.add('hidden');

    const totalQ = this.state.totalQ;
    const score = Math.round((this.state.correctCount / totalQ) * 100);
    const wrong = totalQ - this.state.correctCount;
    const readTotal = this.state.questions.filter(q => q.type === 'reading').length;
    const listTotal = this.state.questions.filter(q => q.type === 'listening').length;
    const readAcc = readTotal ? Math.round((this.state.readingCorrect / readTotal) * 100) : 0;
    const listAcc = listTotal ? Math.round((this.state.listeningCorrect / listTotal) * 100) : 0;
    let xp = this.state.correctCount * 10;
    if (this.state.isDaily && score >= 50) xp += 50;
    this.data.xp += xp; 
    
    if (!this.data.dailyStats) this.data.dailyStats = { date: new Date().toDateString(), words: 0, quizzes: 0, minutes: 0 };
    this.data.dailyStats.quizzes = (this.data.dailyStats.quizzes || 0) + 1;
    this.data.dailyStats.minutes = (this.data.dailyStats.minutes || 0) + 5;
    
    if (!this.data.lifetimeStats) this.data.lifetimeStats = { readTotal: 0, listTotal: 0, readCorrect: 0, listCorrect: 0 };
    this.data.lifetimeStats.readTotal += readTotal;
    this.data.lifetimeStats.listTotal += listTotal;
    this.data.lifetimeStats.readCorrect += this.state.readingCorrect;
    this.data.lifetimeStats.listCorrect += this.state.listeningCorrect;

    if (!this.data.quizHistory) this.data.quizHistory = [];
    this.data.quizHistory.push({
      date: new Date().toLocaleDateString('id-ID', {day:'2-digit', month:'2-digit'}),
      score: score
    });
    if (this.data.quizHistory.length > 7) {
      this.data.quizHistory = this.data.quizHistory.slice(-7);
    }

    document.getElementById('res-score').innerText = score;
    document.getElementById('res-correct').innerText = this.state.correctCount;
    document.getElementById('res-wrong').innerText = wrong;
    document.getElementById('res-acc-read').innerText = readAcc + '%';
    document.getElementById('res-acc-list').innerText = listAcc + '%';
    document.getElementById('res-xp-earned').innerText = `+${xp} XP`;

    if (score >= 80) {
      document.getElementById('res-icon').innerText = '🥇';
      if (!this.data.settings || this.data.settings.batterySaver !== true) {
        if (typeof window.fireConfetti === 'function') window.fireConfetti();
      }
    }
    else if (score >= 60) document.getElementById('res-icon').innerText = '🥈';
    else document.getElementById('res-icon').innerText = '🥉';

    let analysis = '';
    if (score === 100) { analysis = 'Sempurna! Luar biasa! 🎉'; this.data.badges.perfect = true; }
    else if (this.state.isSimulasi) {
      if (score >= 60) analysis = `✅ Lulus! Skor ${score}% memenuhi passing grade EPS-TOPIK.`;
      else analysis = `❌ Belum lulus. Passing grade 60%. Skor Anda ${score}%. Terus berlatih!`;
    }
    else if (this.state.isStage) {
      const level = this.state.currentStageLevel;
      const stage = this.state.currentStageNum;
      const key = `stage${stage}Score`;
      const oldScore = this.data.stageProgress[level]?.[key] || 0;
      if (score >= 80 && score > oldScore) {
        this.data.stageProgress[level][key] = score;
        if (stage === this.data.stageProgress[level].unlocked && stage < 3) {
          this.data.stageProgress[level].unlocked = stage + 1;
          showInfoModal('🎉 Stage Terbuka!', `Stage ${stage + 1} untuk ${level.toUpperCase()} telah terbuka. Lanjutkan belajar!`);
        }
        Storage.set(this.data);
        analysis = `✅ Stage ${stage} Lulus! Nilai ${score}%. ${stage < 3 ? 'Stage selanjutnya terbuka!' : 'Semua stage selesai!'}`;
      } else if (score < 80) {
        analysis = `❌ Stage ${stage} belum lulus. Nilai ${score}%. Minimal 80% untuk melanjutkan. Coba lagi!`;
      } else {
        analysis = `Stage ${stage} sudah pernah lulus. Nilai sekarang ${score}%.`;
      }

      if (score >= 80 && btnNextStage) {
        if (stage < 3) {
          btnNextStage.innerText = `Lanjut ke Stage ${stage + 1} ➔`;
        } else {
          const nextLevelMap = { 'beginner': 'normal', 'normal': 'pro' };
          if (nextLevelMap[level]) {
            btnNextStage.innerText = `Lanjut ke Misi ${nextLevelMap[level].toUpperCase()} Stage 1 ➔`;
          } else {
            btnNextStage.innerText = `Semua Stage Kompetensi Selesai! 🎉`;
          }
        }
        btnNextStage.classList.remove('hidden');
      }
    }
    else if (readAcc < 50 && listAcc < 50) analysis = 'Fokus menyeluruh pada kosakata dasar.';
    else if (readAcc < listAcc) analysis = `Listening (${listAcc}%) lebih baik. Tingkatkan reading.`;
    else if (listAcc < readAcc) analysis = `Reading (${readAcc}%) lebih baik. Latih listening.`;
    else analysis = 'Seimbang, tinggal sedikit lagi!';
    document.getElementById('res-analysis').innerText = analysis;

    if (this.state.mode === 'chapter' && btnNextStage) {
      const ch = this.state.currentChapter;
      const misi = this.state.currentMisi || 1;
      if (misi < 3) {
        const misiNames = ["", "Pemanasan (Beginner)", "Pemahaman (Normal)", "Tantangan (Pro)"];
        btnNextStage.innerText = `Lanjut ke Misi ${misi + 1}: ${misiNames[misi + 1]} ➔`;
      } else {
        btnNextStage.innerText = `Lanjut ke Bab ${ch + 1}: Misi 1 ➔`;
      }
      btnNextStage.classList.remove('hidden');
    }

    const review = document.getElementById('review-container');
    review.innerHTML = '<h3 class="font-bold uppercase text-xs mb-2 text-[var(--text-secondary)]">Review Seluruh Soal (Klik untuk Bedah via AI 🤖)</h3>';
    
    const allAns = this.state.answers;
    
    if (allAns.length === 0) {
      review.innerHTML += '<div class="text-center text-[var(--text-secondary)] py-4">Belum ada data kuis.</div>';
    } else {
      allAns.forEach(a => {
        if (a.isCorrect) {
          review.innerHTML += `
            <div onclick="aiChat.tanyaSoalSalah('${btoa(encodeURIComponent(a.q))}', '${btoa(encodeURIComponent(a.correct))}', '${btoa(encodeURIComponent(a.user))}', this)" 
                 class="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/60 dark:border-emerald-800/40 mb-2 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 transition-all group">
              <p class="text-[var(--text-primary)] font-bold text-sm mb-1 group-hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">${a.q}</p>
              <p class="text-sm">
                <span class="text-emerald-600 dark:text-emerald-400 font-bold">✓ Jawaban Anda Tepat: ${a.user}</span>
              </p>
              <p class="text-xs text-[var(--text-secondary)] mt-1">${a.ex}</p>
              <div class="text-[10px] text-indigo-500 font-bold mt-1.5 text-right opacity-60 group-hover:opacity-100 transition-opacity">🤖 Tebakan Beruntung? Bedah Detail via AI ➔</div>
            </div>`;
        } else {
          review.innerHTML += `
            <div onclick="aiChat.tanyaSoalSalah('${btoa(encodeURIComponent(a.q))}', '${btoa(encodeURIComponent(a.correct))}', '${btoa(encodeURIComponent(a.user))}', this)" 
                 class="p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-2 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 transition-all group">
              <p class="text-[var(--text-primary)] font-bold text-sm mb-1 group-hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">${a.q}</p>
              <p class="text-sm">
                <span class="line-through text-red-500">${a.user}</span> ➔ 
                <span class="text-green-600 dark:text-green-400 font-bold">${a.correct}</span>
              </p>
              <p class="text-xs text-[var(--text-secondary)] mt-1">${a.ex}</p>
              <div class="text-[10px] text-indigo-500 font-bold mt-1.5 text-right opacity-60 group-hover:opacity-100 transition-opacity">🤖 Klik untuk Bedah Soal via AI ➔</div>
            </div>`;
        }
      });
    }
    if (this.state.mode === 'chapter') this.evaluateChapterQuiz(true);
    this.checkAchievements(); app.loadAndRefreshUI(); Storage.set(this.data); if (app.syncToServer) app.syncToServer();
  },

  retryQuiz() {
    if (this.state.isSimulasi) this.startSimulasi();
    else if (this.state.isDaily) this.startDailyChallenge();
    else if (this.state.isStage) this.startStage(this.state.currentStageLevel, this.state.currentStageNum);
    else if (this.state.isImageQuiz) this.startImageQuiz();
    else if (this.state.mode === 'chapter') this.startChapterQuiz(this.state.currentMisi);
    else if (this.state.level === 'Koleksi Soal Sulit') this.startBookmarkQuiz();
    else if (this.state.level === 'Smart Review') this.startSmartReview();
    else this.startQuiz(this.state.level);
  },

  nextStageOrMisi() {
    if (this.state.isStage) {
      const level = this.state.currentStageLevel;
      const stage = this.state.currentStageNum;
      if (stage < 3) {
        this.startStage(level, stage + 1);
      } else {
        const nextLevelMap = { 'beginner': 'normal', 'normal': 'pro' };
        if (nextLevelMap[level]) this.startStage(nextLevelMap[level], 1);
        else this.showDashboard();
      }
    } else if (this.state.mode === 'chapter') {
      const ch = this.state.currentChapter;
      const misi = this.state.currentMisi;
      if (misi < 3) {
        this.startChapterQuiz(misi + 1);
      } else {
        const nextKey = `bab${ch + 1}`;
        const nextData = this.data.chapterProgress && this.data.chapterProgress[nextKey];
        if (!nextData || !nextData.unlocked) {
          showInfoModal('🔒 Bab Terkunci', 'Selesaikan Level 1 (Beginner) dengan skor minimal 80% (2 Bintang) untuk membuka bab berikutnya.');
          return;
        }
        this.state.currentChapter = ch + 1;
        this.startChapterQuiz(1);
      }
    }
  },

  // === COLLECTION & OVERRIDES MANAGEMENT ===
  toggleBookmark() {
    const q = this.state.questions[this.state.currentIdx];
    if (!this.data.bookmarks) this.data.bookmarks = [];
    const idx = this.data.bookmarks.findIndex(b => b.q === q.q); 
    
    if (idx > -1) {
      this.data.bookmarks.splice(idx, 1);
      showInfoModal('Dihapus dari Koleksi', 'Soal ini dikeluarkan dari daftar pelajari ulang.');
    } else {
      this.data.bookmarks.push(q);
      showInfoModal('Tersimpan ⭐', 'Soal ini masuk ke Koleksi Pribadi untuk dipelajari lagi nanti!');
    }
    Storage.set(this.data);
    this.renderQuestion();
  },

  startBookmarkQuiz() {
    if (!this.data.bookmarks || this.data.bookmarks.length === 0) {
      if (typeof showInfoModal === 'function') {
        showInfoModal('📚 Koleksi Kosong', 'Belum ada soal yang tersimpan. Yuk, simpan soal-soal sulit saat latihan agar bisa kita bahas nanti bersama Hana! 📚');
      } else {
        alert('Belum ada soal yang tersimpan. Yuk, simpan soal-soal sulit saat latihan.');
      }
      return;
    }

    if (typeof this.toggleImmersiveMode === 'function') {
      this.toggleImmersiveMode(true); 
    } else {
      const bNav = document.getElementById('bottom-navigation');
      const aiB = document.getElementById('aiButton');
      if (bNav) bNav.classList.add('hidden');
      if (aiB) aiB.classList.add('hidden');
    }

    this.state.isStage = false;
    this.state.isSimulasi = false;
    this.state.isDaily = false;
    this.state.mode = 'belajar';

    const validBookmarks = this.data.bookmarks.map(q => ({
      ...q,
      type: q.type || 'reading'
    }));

    this.setupQuizEngine(validBookmarks, [], 'Review Soal Sulit', 9999, validBookmarks.length);
  },

  toggleUBTMode() {
    const quizScreen = document.getElementById('quiz-screen');
    quizScreen.classList.toggle('ubt-mode');
    const isUBT = quizScreen.classList.contains('ubt-mode');
    
    const btnUBT = document.getElementById('btn-ubt-toggle');
    if (btnUBT) {
      btnUBT.innerText = isUBT ? "🎨" : "💻";
      btnUBT.className = isUBT 
        ? "w-8 h-8 flex items-center justify-center rounded-lg text-white text-[11px] font-bold bg-indigo-500" 
        : "w-8 h-8 flex items-center justify-center rounded-lg text-[var(--hana-text-2)] text-[11px] font-bold bg-[var(--hana-card)]";
    }

    const linkId = 'ubt-external-stylesheet';
    let linkEl = document.getElementById(linkId);
    
    if (isUBT) {
      if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.id = linkId;
        linkEl.rel = 'stylesheet';
        linkEl.href = 'ubt-theme.css?v=1.0'; 
        document.head.appendChild(linkEl);
      }
    } else {
      if (linkEl) {
        linkEl.remove();
      }
    }
  },
});

