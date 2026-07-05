// =========================================================================
// 📊 HANA ANALYTICS & PROGRESS ENGINE (Phase 5 — Modularized)
// =========================================================================
Object.assign(app, {
  renderStreakCalendar() {
    const container = document.getElementById('streak-calendar');
    if (!container) return;
    const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const today = new Date();
    const weekData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('id-ID', {day:'2-digit', month:'2-digit'});
      const quizCount = (this.data.quizHistory || []).filter(q => q.date === dateStr).length;
      const hasStreak = (this.data.streakDates || []).includes(d.toDateString());
      const count = quizCount > 0 ? quizCount : (hasStreak ? 1 : 0);
      weekData.push({ label: dayLabels[d.getDay()], count, active: count > 0 });
    }
    const maxCount = Math.max(...weekData.map(d => d.count), 1);
    container.innerHTML = weekData.map((d, i) => `
      <div class="flex flex-col items-center gap-1.5 flex-1">
        <div class="flex-1 w-full flex items-end justify-center" style="height:64px">
          <div class="streak-bar w-full max-w-[32px] rounded-[6px] transition-all duration-500"
               style="height:${Math.max(4, (d.count / maxCount) * 56)}px;
                      background:${d.active ? 'var(--hana-primary)' : 'var(--hana-border)'};
                      animation:barGrow 0.4s ease-out ${i * 0.08}s both">
          </div>
        </div>
        <span class="text-[9px] font-bold ${d.active ? 'text-[var(--hana-primary)]' : 'text-[var(--text-secondary)]'}">${d.label}</span>
      </div>
    `).join('');
  },

  renderBadges() {
    const container = document.getElementById('badge-container');
    if (!container) return;
    container.innerHTML = '';
    const earned = this.data.badges || {};
    for (let key in Achievements) {
      const badge = Achievements[key], unlocked = earned[key];
      const div = document.createElement('div');
      div.className = `relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 text-center min-h-[90px] ${
        unlocked
          ? 'bg-gradient-to-b from-yellow-50/80 dark:from-yellow-900/20 to-transparent border-yellow-300 dark:border-yellow-600/50 shadow-sm'
          : 'bg-[var(--card-bg)] border-[var(--card-border)] opacity-50'
      }`;
      div.innerHTML = `
        <span class="text-2xl mb-1.5">${unlocked ? badge.icon : '🔒'}</span>
        <span class="text-[10px] font-extrabold leading-tight ${unlocked ? 'text-yellow-800 dark:text-yellow-200' : 'text-[var(--text-secondary)]'}">
          ${unlocked ? badge.name : '???'}
        </span>
        ${unlocked ? '<div class="absolute inset-0 rounded-2xl ring-1 ring-yellow-400/20 dark:ring-yellow-500/10 pointer-events-none"></div>' : ''}
      `;
      container.appendChild(div);
    }
  },

  calculateGlobalAnalytics() {
    let finishedStages = 0;
    const levels = ['beginner', 'normal', 'pro'];
    
    if (this.data && this.data.stageProgress) {
      levels.forEach(lvl => {
        for (let s = 1; s <= 3; s++) {
          if ((this.data.stageProgress[lvl]?.[`stage${s}Score`] || 0) >= 80) { finishedStages++; }
        }
      });
    }
    const stageScore = finishedStages / 9;
    const history = this.data.quizHistory || [];
    const quizScore = Math.min(history.length / 5, 1);
    const activeBadges = this.data.badges ? Object.values(this.data.badges).filter(b => b === true).length : 0;
    const badgeScore = activeBadges / 7;

    const globalPercentage = Math.round(((stageScore * 0.5) + (quizScore * 0.3) + (badgeScore * 0.2)) * 100);
    const finalGlobalProgress = Math.min(Math.max(globalPercentage, 0), 100);

    const globalTxt = document.getElementById('global-progress-text');
    const globalBar = document.getElementById('global-progress-bar');
    if (globalTxt) globalTxt.innerText = `${finalGlobalProgress}%`;
    if (globalBar) globalBar.style.width = `${finalGlobalProgress}%`;

    let totalReadingQuestions = 0; let totalReadingCorrect = 0;
    let totalListeningQuestions = 0; let totalListeningCorrect = 0;

    history.forEach(entry => {
      if (entry.readingCorrect !== undefined && entry.listeningCorrect !== undefined) {
        totalReadingCorrect += entry.readingCorrect;
        totalReadingQuestions += entry.totalReadingQ || 10;
        totalListeningCorrect += entry.listeningCorrect;
        totalListeningQuestions += entry.totalListeningQ || 10;
      } else {
        const totalCorrect = Math.round((entry.score / 100) * 20);
        totalReadingCorrect += Math.ceil(totalCorrect / 2); totalReadingQuestions += 10;
        totalListeningCorrect += Math.floor(totalCorrect / 2); totalListeningQuestions += 10;
      }
    });

    const readingPercentage = totalReadingQuestions > 0 ? Math.round((totalReadingCorrect / totalReadingQuestions) * 100) : 0;
    const listeningPercentage = totalListeningQuestions > 0 ? Math.round((totalListeningCorrect / totalListeningQuestions) * 100) : 0;

    if (document.getElementById('live-reading-text')) document.getElementById('live-reading-text').innerText = `${readingPercentage}%`;
    if (document.getElementById('live-reading-bar')) document.getElementById('live-reading-bar').style.width = `${readingPercentage}%`;
    
    if (document.getElementById('live-listening-text')) document.getElementById('live-listening-text').innerText = `${listeningPercentage}%`;
    if (document.getElementById('live-listening-bar')) document.getElementById('live-listening-bar').style.width = `${listeningPercentage}%`;
  },

  toggleAnalyticsView() {
    const viewProgress = document.getElementById('analytics-view-progress');
    const viewSkills = document.getElementById('analytics-view-skills');
    const toggleTxt = document.getElementById('analytics-toggle-text');

    if (!viewProgress || !viewSkills) return;

    if (viewProgress.classList.contains('hidden')) {
      viewSkills.classList.add('opacity-0');
      setTimeout(() => {
        viewSkills.classList.add('hidden');
        viewProgress.classList.remove('hidden');
        setTimeout(() => viewProgress.classList.remove('opacity-0'), 20);
      }, 150);
      if (toggleTxt) toggleTxt.innerText = "Lihat Statistik";
    } else {
      viewProgress.classList.add('opacity-0');
      setTimeout(() => {
        viewProgress.classList.add('hidden');
        viewSkills.classList.remove('hidden');
        setTimeout(() => viewSkills.classList.remove('opacity-0'), 20);
      }, 150);
      if (toggleTxt) toggleTxt.innerText = "Lihat Progres";
    }
  },

  renderProfileChart() {
    const svg = document.getElementById('profile-chart-svg');
    if (!svg) return;
    
    svg.innerHTML = '';
    const history = this.data.quizHistory || [];
    
    if (history.length < 5) {
      const remaining = 5 - history.length;
      
      svg.innerHTML = `
        <rect width="100%" height="100%" rx="16" fill="rgba(108, 99, 255, 0.02)" stroke="rgba(108, 99, 255, 0.08)" stroke-width="1" stroke-dasharray="4 4" />
        
        <text x="50%" y="38%" text-anchor="middle" font-size="28" class="select-none">🎯</text>
        
        <text x="50%" y="60%" text-anchor="middle" font-family="Pretendard, sans-serif" font-weight="900" font-size="13" class="fill-slate-700 dark:fill-slate-200 tracking-wide">
          Mari Bentuk Tren Belajarmu!
        </text>
        
        <text x="50%" y="78%" text-anchor="middle" font-family="Pretendard, sans-serif" font-weight="600" font-size="10" class="fill-slate-400 dark:fill-slate-500 tracking-normal">
          Selesaikan ${remaining} kuis lagi untuk membuka analisis perkembangan Hana.
        </text>
      `;
      return;
    }

    const width = 500;
    const height = 200;
    const padding = 30; 
    const drawableWidth = width - padding * 2;
    const drawableHeight = height - padding * 2;
    
    const stepX = drawableWidth / (history.length - 1);
    
    let points = [];
    history.forEach((entry, i) => {
      const x = padding + (i * stepX);
      const y = padding + drawableHeight - ((entry.score / 100) * drawableHeight);
      points.push({x, y, score: entry.score, date: entry.date});
    });

    const pathString = points.map((p, i) => `${i===0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathString);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "4");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.classList.add("text-indigo-500", "dark:text-indigo-400");
    svg.appendChild(path);

    points.forEach(p => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", p.x);
      circle.setAttribute("cy", p.y);
      circle.setAttribute("r", "6");
      circle.setAttribute("fill", "var(--card-bg, #fff)");
      circle.setAttribute("stroke", "currentColor");
      circle.setAttribute("stroke-width", "3");
      circle.classList.add("text-indigo-600", "dark:text-indigo-400");
      svg.appendChild(circle);
      
      const textScore = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textScore.setAttribute("x", p.x);
      textScore.setAttribute("y", p.y - 12);
      textScore.setAttribute("text-anchor", "middle");
      textScore.classList.add("fill-slate-700", "dark:fill-slate-200", "text-[14px]", "font-black");
      textScore.textContent = p.score;
      svg.appendChild(textScore);
      
      const textDate = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textDate.setAttribute("x", p.x);
      textDate.setAttribute("y", height - 5);
      textDate.setAttribute("text-anchor", "middle");
      textDate.classList.add("fill-slate-400", "dark:fill-slate-500", "text-[10px]", "font-bold");
      textDate.textContent = p.date;
      svg.appendChild(textDate);
    });
  }
});



// =========================================================================
// 🌟 SVG RING ENGINE & O-DAP NOTE UI REVAMP (MONKEY PATCH)
// =========================================================================

// 1. Monkey Patch renderDashboard to trigger the SVG rings automatically
if (typeof app !== 'undefined' && app.renderDashboard) {
  const originalRender = app.renderDashboard;
  app.renderDashboard = function() {
    originalRender.call(this); // Execute native logic
    
    // SVG Math Injection
    let readAcc = 0, listAcc = 0;
    if (this.data && this.data.lifetimeStats) {
      const st = this.data.lifetimeStats;
      if (st.readTotal > 0) readAcc = Math.round((st.readCorrect / st.readTotal) * 100);
      if (st.listTotal > 0) listAcc = Math.round((st.listCorrect / st.listTotal) * 100);
    }
    
    const rRing = document.getElementById('svg-ring-reading');
    const lRing = document.getElementById('svg-ring-listening');
    
    if (rRing) {
      rRing.style.strokeDashoffset = 263.9 - (263.9 * readAcc / 100);
    }
    if (lRing) {
      lRing.style.strokeDashoffset = 163.4 - (163.4 * listAcc / 100);
    }
    
    const tTxt = document.getElementById('global-progress-text');
    if (tTxt) tTxt.innerText = Math.round((readAcc + listAcc) / 2) + '%';
    const rTxt = document.getElementById('live-reading-text');
    if (rTxt) rTxt.innerText = readAcc + '%';
    const lTxt = document.getElementById('live-listening-text');
    if (lTxt) lTxt.innerText = listAcc + '%';
  };
}

// 2. Override toggleAnalyticsView for the new SVG layout
app.toggleAnalyticsView = function() {
  const skillsBox = document.getElementById('analytics-view-skills');
  const btnText = document.getElementById('analytics-toggle-text');
  if (!skillsBox || !btnText) return;
  
  if (skillsBox.classList.contains('hidden')) {
    skillsBox.classList.remove('hidden');
    setTimeout(() => skillsBox.classList.remove('opacity-0'), 10);
    btnText.innerText = 'Sembunyikan';
  } else {
    skillsBox.classList.add('opacity-0');
    setTimeout(() => skillsBox.classList.add('hidden'), 300);
    btnText.innerText = 'Statistik Detail';
  }
};

// 3a. O-Dap Filter State
let odapFilter = 'all';
window.cycleOdapFilter = function() {
  const modes = ['all', 'reading', 'listening'];
  const idx = modes.indexOf(odapFilter);
  odapFilter = modes[(idx + 1) % modes.length];
  const icons = { all: 'filter_list', reading: 'menu_book', listening: 'headphones' };
  const labels = { all: '', reading: 'Reading', listening: 'Listening' };
  document.getElementById('odap-filter-icon').textContent = icons[odapFilter];
  const lbl = document.getElementById('odap-filter-label');
  if (odapFilter === 'all') {
    lbl.classList.add('hidden');
  } else {
    lbl.textContent = labels[odapFilter];
    lbl.classList.remove('hidden');
  }
  refreshOdapNote();
};

// 3b. Smart Review Selection Starter
window.startOdapReview = function() {
  const checked = document.querySelectorAll('.odap-select:checked');
  if (checked.length === 0) {
    app.startSmartReview();
  } else {
    const selected = [];
    checked.forEach(cb => {
      selected.push({
        q: decodeURIComponent(atob(cb.dataset.q)),
        correct: decodeURIComponent(atob(cb.dataset.correct)),
        user: decodeURIComponent(atob(cb.dataset.user)),
        type: cb.dataset.type,
        ex: decodeURIComponent(atob(cb.dataset.ex || ''))
      });
    });
    app.startSmartReview(selected);
  }
};
window.updateOdapButtonLabel = function() {
  const btn = document.getElementById('odap-start-btn');
  const label = document.getElementById('odap-btn-label');
  if (!btn || !label) return;
  const total = parseInt(document.getElementById('odap-stat-wrong')?.innerText || '0');
  const checked = document.querySelectorAll('.odap-select:checked').length;
  if (checked === 0) {
    label.innerText = `Tebus Semua (${total} Soal)`;
  } else {
    label.innerText = `Tebus ${checked} Soal Dipilih`;
  }
};

// 3. Premium O-Dap Note Render Engine
window.refreshOdapNote = function() {
  const container = document.getElementById('odap-list-container');
  const statWrong = document.getElementById('odap-stat-wrong');
  if (!container || !app.data) return;
  
  const mistakes = app.data.wrongAnswers || [];
  if(statWrong) statWrong.innerText = mistakes.length;
  const statMastered = document.getElementById('odap-stat-mastered');
  if(statMastered) statMastered.innerText = app.data.quizHistory?.length || 0;
  
  container.innerHTML = '';
  if (mistakes.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400 font-bold bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border-2 border-dashed border-slate-200 dark:border-slate-700 shadow-inner">🎉 Luar biasa! Tidak ada catatan kesalahan.</div>`;
    return;
  }
  
  let filtered = [...mistakes].reverse();
  if (odapFilter !== 'all') {
    filtered = filtered.filter(m => m.type === odapFilter);
  }
  if (filtered.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400 font-bold bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border-2 border-dashed border-slate-200 dark:border-slate-700 shadow-inner">🔍 Tidak ada soal ${odapFilter === 'reading' ? 'Reading' : 'Listening'}.</div>`;
    return;
  }
  const reversed = [...mistakes].reverse();
  const displayList = odapFilter !== 'all' ? filtered : reversed;
  const animTs = Date.now();
  displayList.forEach((m, idx) => {
    const origIdx = reversed.indexOf(m);
    const cardId = 'odap-card-' + animTs + '-' + idx;
    container.innerHTML += `
      <div id="${cardId}" class="glass-card p-[1.75rem] shadow-sm space-y-4 border-l-4 border-rose-400/40 relative transition-all duration-500" style="opacity:0;transform:translateY(20px);border-radius:2rem">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <input type="checkbox" class="odap-select w-5 h-5 rounded cursor-pointer accent-[#6C63FF]" data-q="${btoa(encodeURIComponent(m.q))}" data-correct="${btoa(encodeURIComponent(m.correct))}" data-user="${btoa(encodeURIComponent(m.user))}" data-type="${m.type}" data-ex="${btoa(encodeURIComponent(m.ex || ''))}" onchange="updateOdapButtonLabel()">
            <span class="text-[11px] font-black uppercase tracking-widest text-rose-600 bg-rose-100/50 dark:bg-rose-950/40 px-3 py-1 rounded-full">Kesalahan #${mistakes.length - origIdx}</span>
          </div>
          <div class="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <span class="material-symbols-outlined text-[18px]">${m.type === 'reading' ? 'menu_book' : 'headphones'}</span>
            <span class="text-[12px] font-bold">${m.type === 'reading' ? 'Reading' : 'Listening'}</span>
          </div>
        </div>
        <p class="text-[15px] font-bold text-slate-800 dark:text-slate-100 leading-relaxed">${m.q}</p>
        <div class="bg-slate-50 dark:bg-[#151C2C] p-4 space-y-3" style="border-radius:1rem">
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-rose-500 mt-0.5 text-[18px]">close</span>
            <p class="text-[14px] text-slate-500 dark:text-slate-400 line-through decoration-rose-500/30">${m.user}</p>
          </div>
          <div class="flex items-start gap-3 p-3" style="background-color:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:1rem">
            <span class="material-symbols-outlined text-emerald-500 mt-0.5 text-[18px]">check_circle</span>
            <p class="text-[14px] font-bold text-emerald-700 dark:text-emerald-300">${m.correct}</p>
          </div>
        </div>
        <button onclick="uiSwitcher.switch('minimalist'); document.getElementById('view-ai-chat').classList.remove('hidden'); document.getElementById('view-ai-chat').classList.add('flex'); setTimeout(() => { document.getElementById('aiInput').value = 'Tolong bedah soal EPS-TOPIK ini: ' + decodeURIComponent(atob('${btoa(encodeURIComponent(m.q))}')); }, 500);" class="w-full py-4 odap-bedah-btn flex items-center justify-center gap-2 font-bold text-[13px] uppercase tracking-widest transition-colors active:scale-[0.98]" style="background-color:rgba(108,99,255,0.15);color:#6C63FF;border-radius:2rem">
          <span class="material-symbols-outlined text-[20px]">smart_toy</span> BEDAH DGN AI TUTOR
        </button>
      </div>
    `;
  });
  // Staggered entry animation
  displayList.forEach((_, idx) => {
    const el = document.getElementById('odap-card-' + animTs + '-' + idx);
    if (el) {
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, idx * 100);
    }
  });
  // Sync avatar
  const avatarImg = document.getElementById('odap-avatar-img');
  if (avatarImg) {
    avatarImg.src = (app.data && app.data.userAvatar) ? app.data.userAvatar : 'assets/hana_thinking.png';
  }
  updateOdapButtonLabel();
};

// =========================================================================
// 🎰 THE ULTIMATE CASINO SLOT ADRENALINE ROULETTE GAME ENGINE 
// =========================================================================
Object.assign(app, {
  loadRouletteQuestion() {
    const screen = document.getElementById('screen-roulette');
    if (!screen) return;
    screen.classList.remove('hidden');
    
    if (this.state.rouletteIdx === undefined) this.state.rouletteIdx = 0;
    const progressEl = document.getElementById('micro-roulette-progress');
    if (progressEl) progressEl.innerText = `Round: ${this.state.rouletteIdx + 1}/5`;
    
    const qZone = document.getElementById('roulette-question-zone');
    const cZone = document.getElementById('roulette-choices-zone');
    const fbBanner = document.getElementById('roulette-feedback-banner');
    
    if (!qZone || !cZone || !fbBanner) return;
    
    cZone.innerHTML = '';
    fbBanner.classList.add('hidden');
    
    const casinoDummyWords = ["사과", "한국어", "회사", "공장", "비상 정지", "작업", "반장님", "기계", "위험해"];
    
    let spinCount = 0;
    const slotInterval = setInterval(() => {
      const randomItem = casinoDummyWords[Math.floor(Math.random() * casinoDummyWords.length)];
      qZone.innerHTML = `
      <img src="assets/hana_thinking.png" class="w-20 h-20 object-contain mx-auto mb-2 animate-bounce" />
      <div class="text-3xl font-black text-purple-400/40 select-none blur-[1px] transform scale-95 transition-all duration-75">${randomItem}</div>
    `;
      spinCount++;
      
      if (spinCount > 15) { 
        clearInterval(slotInterval);
        
        if (navigator.vibrate) navigator.vibrate([40, 40]);
        
        const roulettePool = [
          { q: "화재 (Hwaje)", choices: ["Kebakaran", "Banjir", "Gempa", "Kecelakaan Kerja"], c: "Kebakaran", ex: "화재 berarti bencana kebakaran di area industri." },
          { q: "안전모 (Anjeonmo)", choices: ["Kacamata Las", "Helm Keselamatan", "Masker Gas", "Sepatu Safety"], c: "Helm Keselamatan", ex: "안전모 adalah pelindung kepala wajib pekerja." },
          { q: "소화기 (Sohwagi)", choices: ["Tangki Air", "Alat Pemadam Api", "Lampu Darurat", "Palu Besi"], c: "Alat Pemadam Api", ex: "소화기 merujuk pada APAR (Alat Pemadam Api Ringan)." },
          { q: "보호구 (Bohojanggu)", choices: ["Mesin Bubut", "Alat Pelindung Diri", "Baju Seragam", "Alat Ukur"], c: "Alat Pelindung Diri", ex: "보호구 berarti Alat Pelindung Diri (APD) standar pabrik." },
          { q: "경고 (Gyeonggo)", choices: ["Peringatan", "Larangan", "Perintah Kerja", "Papan Informasi"], c: "Peringatan", ex: "경고 bermakna rambu peringatan atau waspada bahaya." }
        ];
        
        const realQuestion = roulettePool[this.state.rouletteIdx % roulettePool.length];
        
        qZone.innerHTML = `
          <div class="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 mb-2 select-none">🎰 TARGET SOAL LOCK</div>
          <h2 class="text-3xl font-black text-white tracking-wide jackpot-lock">${realQuestion.q}</h2>
        `;
        
        realQuestion.choices.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = "w-full text-left p-4 rounded-xl font-bold bg-[#12122a] border border-purple-500/20 text-slate-200 transition-all active:scale-[0.98] hover:bg-purple-500/10 hover:border-purple-500/40 text-sm shadow-sm";
          btn.innerText = opt;
          btn.onclick = () => this.evaluateRouletteAnswer(btn, opt, realQuestion);
          cZone.appendChild(btn);
        });
      }
    }, 80);
  },
  
  evaluateRouletteAnswer(clickedBtn, selectedOpt, realQuestion) {
    const buttons = document.querySelectorAll('#roulette-choices-zone button');
    buttons.forEach(b => b.disabled = true);
    
    const isCorrect = selectedOpt === realQuestion.c;
    const fb = document.getElementById('roulette-feedback-banner');
    
    if (isCorrect) {
      clickedBtn.classList.add('roulette-correct');
      if (fb) {
        fb.className = 'p-4 rounded-2xl text-xs font-bold mt-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 block animate-pulse';
        fb.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="assets/hana_encourage.png" class="w-14 h-14 object-contain shrink-0" />
        <div class="text-left">
          <div class="font-black text-emerald-400">🎯 Keputusan Tepat! +10 XP</div>
          <div class="mt-0.5 font-normal text-slate-300 text-[11px]">${realQuestion.ex}</div>
        </div>
      </div>
    `;
      }
      this.data.xp += 10;
      if (this.data.dailyStats) this.data.dailyStats.quizzes += 1;
      Storage.set(this.data);
      this.renderDashboard();
    } else {
      clickedBtn.classList.add('roulette-wrong');
      if (fb) {
        fb.className = 'p-4 rounded-2xl text-xs font-bold mt-4 bg-rose-500/20 border border-rose-500/30 text-rose-400 block';
        fb.innerHTML = `<div>❌ Keputusan Kurang Tepat!</div><div class="mt-1 font-normal text-slate-300">${realQuestion.ex}</div>`;
      }
      if (navigator.vibrate) navigator.vibrate(100);
    }
    
    const cZone = document.getElementById('roulette-choices-zone');
    const nextBtn = document.createElement('button');
    nextBtn.className = "w-full text-center py-3.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-widest mt-3 active:scale-95 transition-all shadow-md shadow-purple-500/20";
    nextBtn.innerText = "Lanjut Ronde Berikutnya ➔";
    
    nextBtn.onclick = () => {
      this.state.rouletteIdx += 1;
      if (this.state.rouletteIdx >= 5) {
        document.getElementById('screen-roulette').classList.add('hidden');
        if (typeof showToast === 'function') showToast("Misi Roulette Selesai! 🎉", "success");
        this.state.rouletteIdx = 0;
        if(this.showDashboard) this.showDashboard();
      } else {
        this.loadRouletteQuestion();
      }
    };
    cZone.appendChild(nextBtn);
  }
});



// =========================================================================
// 📦 INTERACTIVE BOOKMARK VAULT ENGINE LOGIC
// =========================================================================
Object.assign(app, {
  showBookmarkHub() {
    const modal = document.getElementById('modal-bookmark-hub');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    this.refreshBookmarkHub();
  },
  
  refreshBookmarkHub() {
    const container = document.getElementById('bookmark-list-container');
    const countEl = document.getElementById('bookmark-vault-count');
    if (!container || !this.data) return;
    
    const list = this.data.bookmarks || [];
    if (countEl) countEl.innerText = `${list.length} Soal`;
    
    container.innerHTML = '';
    if (list.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center bg-slate-50/50 dark:bg-slate-900/20 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800/80 my-auto flex flex-col items-center justify-center gap-3">
          <img src="assets/hana_welcome.png" class="w-24 h-24 object-contain animate-pulse opacity-85 select-none pointer-events-none" />
          <div>
            <p class="text-xs font-black text-[var(--text-main)]">Gudang Vault Kosong</p>
            <p class="text-[11px] text-[var(--text-muted)] mt-1 max-w-[200px] mx-auto font-medium leading-relaxed">Belum ada soal kuis yang kamu simpan. Yuk, tabung soal sulitmu di sini bersama Hana!</p>
          </div>
        </div>`;
      return;
    }
    
    list.forEach((m, idx) => {
      const qText = m.q || m.question || m.text || `Soal Latihan #${idx + 1}`;
      const qType = m.type === 'listening' ? '🎧 Listening' : '📖 Reading';
      
      container.innerHTML += `
        <div class="p-4 bg-white dark:bg-[#1C1B1A] border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm flex flex-col gap-3 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
          <div class="flex justify-between items-center">
            <span class="text-[9px] font-black uppercase tracking-wider text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded">Koleksi #${idx + 1}</span>
            <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded">${qType}</span>
          </div>
          <p class="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed line-clamp-2">${qText}</p>
          
          <div class="grid grid-cols-2 gap-2.5 mt-1 flex-none">
            <button onclick="closeModal('modal-bookmark-hub'); app.startSingleBookmarkQuiz(${idx});" class="py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-black text-[10px] rounded-xl transition-all uppercase tracking-widest text-center flex items-center justify-center gap-1 border border-indigo-150 dark:border-indigo-900/30 active:scale-95">
              🎯 Uji Soal
            </button>
            <button onclick="app.removeSingleBookmark(${idx});" class="py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-black text-[10px] rounded-xl transition-all uppercase tracking-widest text-center flex items-center justify-center gap-1 border border-rose-150 dark:border-rose-900/30 active:scale-95">
              🗑️ Hapus
            </button>
          </div>
        </div>
      `;
    });
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },
  
  removeSingleBookmark(idx) {
    if (!this.data || !this.data.bookmarks) return;
    this.data.bookmarks.splice(idx, 1);
    Storage.set(this.data);
    this.refreshBookmarkHub();
    if (typeof showToast === 'function') {
      showToast('Bookmark berhasil dicabut!', 'success');
    }
  },
  
  startSingleBookmarkQuiz(idx) {
    if (!this.data || !this.data.bookmarks) return;
    const targetQ = this.data.bookmarks[idx];
    if (!targetQ) return;
    
    this.state.questions = [targetQ];
    this.state.currentIdx = 0;
    this.state.score = 0;
    this.state.answers = [];
    this.state.mode = 'bookmark_single';
    this.state.audioPlaysLeft = 2;
    
    app.switchScreen('quiz-screen');
    
    if (typeof app.loadQuestion === 'function') app.loadQuestion();
    else if (typeof this.loadQuestion === 'function') this.loadQuestion();
  }
});


