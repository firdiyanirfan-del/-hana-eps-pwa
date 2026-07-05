/* ==========================================================================
   🎆 HANA GLOBAL JUICY ANIMATION ENGINE (CORE JAVASCRIPT MECHANICS)
   ========================================================================== */
const HanaJuicyEngine = {
  comboCount: 0, maxCombo: 0, isFeverMode: false, idleTimer: null,

  initContainer: function() {
    if (!document.getElementById('vig')) { const v = document.createElement('div'); v.id = 'vig'; document.body.appendChild(v); }
    if (!document.getElementById('supernova-flash')) { const n = document.createElement('div'); n.id = 'supernova-flash'; document.body.appendChild(n); }
  },

  triggerCorrect: function(anchorElement) {
    this.initContainer();
    if (!anchorElement) return;
    const viewContainer = anchorElement.closest('[id^="view-"]') || anchorElement.parentElement;
    if (!viewContainer) return;

    this.comboCount++;
    if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;

    let xpText = "+10 XP";
    let isMutated = false;

    // 🔥 FEVER / INFERNO LOGIC (Screen Shake & Mutated XP)
    if (this.comboCount >= 5) {
      xpText = `+${this.isFeverMode ? 40 : 20} XP 🔥`;
      isMutated = true;
      document.body.classList.add('hana-quake');
      setTimeout(() => document.body.classList.remove('hana-quake'), 350);
      
      const nova = document.getElementById('supernova-flash');
      if (nova) { nova.classList.remove('hana-nova-active'); void nova.offsetWidth; nova.classList.add('hana-nova-active'); }
    }

    // 🗡️ MILESTONE SLASH BANNERS
    if (this.comboCount === 5) this.spawnMilestoneBanner("UNSTOPPABLE! 🌋");
    if (this.comboCount === 10) this.spawnMilestoneBanner("HANA PRODIGY! 👑");

    this.spawnScoreFloat(anchorElement, viewContainer, xpText, isMutated);
    this.spawnStarBurst(anchorElement, viewContainer, this.comboCount >= 5 ? 25 : 12);
    this.spawnRingBurst(anchorElement, viewContainer);

    if (this.comboCount >= 2) this.spawnComboPop(anchorElement, viewContainer);
    
    this.resetLifeline();
  },

  triggerWrong: function() {
    this.initContainer();
    this.comboCount = 0;
    this.isFeverMode = false;
    document.getElementById('view-match-madness')?.classList.remove('neon-fever-bg');
    
    const vig = document.getElementById('vig');
    if (vig) { vig.classList.remove('hana-vig-flash'); void vig.offsetWidth; vig.classList.add('hana-vig-flash'); setTimeout(() => vig.classList.remove('hana-vig-flash'), 500); }
    this.resetLifeline();
  },

  spawnScoreFloat: function(anchor, stage, text, isMutated) {
    const el = document.createElement('div');
    el.className = 'sfloat' + (isMutated ? ' xp-mutated' : '');
    el.textContent = text;
    const r = anchor.getBoundingClientRect(); const s = stage.getBoundingClientRect();
    el.style.left = (r.left - s.left + r.width / 2 - (isMutated ? 55 : 35)) + 'px';
    el.style.top = (r.top - s.top + r.height / 2 - 20) + 'px';
    stage.appendChild(el);
    setTimeout(() => el.remove(), 850);
  },

  spawnStarBurst: function(anchor, stage, count) {
    const r = anchor.getBoundingClientRect(); const s = stage.getBoundingClientRect();
    const cx = r.left - s.left + r.width / 2; const cy = r.top - s.top + r.height / 2;
    const starPool = ['⭐', '✨', '💫', '🌟', '⚡'];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div'); el.className = 'spark'; el.textContent = starPool[i % starPool.length];
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4; const distance = 25 + Math.random() * 50;
      el.style.left = (cx + Math.cos(angle) * distance - 8) + 'px'; el.style.top = (cy + Math.sin(angle) * distance - 8) + 'px';
      el.style.animationDelay = (i * 0.02) + 's';
      stage.appendChild(el); setTimeout(() => el.remove(), 700);
    }
  },

  spawnRingBurst: function(anchor, stage) {
    const el = document.createElement('div'); el.className = 'ring';
    const r = anchor.getBoundingClientRect(); const s = stage.getBoundingClientRect();
    el.style.left = (r.left - s.left + r.width / 2 - 28) + 'px'; el.style.top = (r.top - s.top + r.height / 2 - 28) + 'px';
    stage.appendChild(el); setTimeout(() => el.remove(), 580);
  },

  spawnMilestoneBanner: function(text) {
    const banner = document.createElement('div'); banner.className = 'hana-milestone-banner'; banner.textContent = text;
    document.body.appendChild(banner); setTimeout(() => banner.remove(), 1800);
  },

  spawnComboPop: function(anchor, stage) {
    const el = document.createElement('div');
    let tierClass = 'lv1'; let label = 'COMBO ×' + this.comboCount + ' ✨';
    if (this.comboCount >= 6) { tierClass = 'lv4'; label = 'INFERNO ×' + this.comboCount + ' 🌋'; }
    else if (this.comboCount >= 4) { tierClass = 'lv3'; label = 'POWER COMBO ×' + this.comboCount + ' 🟣'; }
    else if (this.comboCount >= 3) { tierClass = 'lv2'; label = 'SURGE MODE ×' + this.comboCount + ' ⚡'; }

    el.className = `combo-wrap ${tierClass} combo-enter absolute pointer-events-none z-[110]`;
    el.innerHTML = `<div class="combo-inner"><div class="combo-ring-el"></div><div class="combo-tier">${label}</div></div>`;
    const r = anchor.getBoundingClientRect(); const s = stage.getBoundingClientRect();
    el.style.left = (r.left - s.left + r.width / 2 - 60) + 'px'; el.style.top = (r.top - s.top - 45) + 'px';
    stage.appendChild(el);

    if (this.comboCount >= 4) {
      const fireColors = ['#FF4500', '#FF8C00', '#FF0000', '#6C63FF'];
      for (let i = 0; i < 6; i++) {
        const ember = document.createElement('div'); ember.className = 'ember'; ember.style.background = fireColors[Math.floor(Math.random() * fireColors.length)];
        ember.style.left = (r.left - s.left + r.width / 2 + (Math.random() * 40 - 20)) + 'px'; ember.style.top = (r.top - s.top - 10) + 'px';
        ember.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px'); const dur = 0.5 + Math.random() * 0.6; ember.style.setProperty('--dur', dur + 's');
        ember.style.width = ember.style.height = (4 + Math.random() * 4) + 'px';
        stage.appendChild(ember); setTimeout(() => ember.remove(), (dur + 0.2) * 1000);
      }
    }
    setTimeout(() => el.remove(), 1000);
  },

  startLifeline: function(mascotId, hintCallback) {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      const mascot = document.getElementById(mascotId);
      if (mascot && !mascot.parentElement.querySelector('.lifeline-btn')) {
        mascot.src = 'assets/hana_thinking.png';
        const btn = document.createElement('div'); btn.className = 'lifeline-btn'; btn.innerHTML = '💡';
        btn.onclick = () => {
          btn.remove();
          if (typeof showToast === 'function') showToast('Membuka 1 Petunjuk Instan (-5 XP)', 'warning');
          if (typeof app !== 'undefined' && app.data) { app.data.xp -= 5; Storage.set(app.data); app.renderDashboard(); }
          hintCallback();
        };
        mascot.parentElement.style.position = 'relative';
        mascot.parentElement.appendChild(btn);
      }
    }, 7000);
  },
  
  resetLifeline: function() {
    clearTimeout(this.idleTimer);
    document.querySelectorAll('.lifeline-btn').forEach(b => b.remove());
  },

  showGameOver: function(score, maxScore, maxCombo, gameName, onPlayAgain, onExit) {
    let overlay = document.getElementById('hana-go-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'hana-go-overlay';
      document.body.appendChild(overlay);
    }
    
    const percentage = score / maxScore;
    let state = { title: '', sub: '', mascot: '', trophy: '', cols: [] };
    
    if (percentage === 1) {
      state = { title: 'Sempurna! 🌟', sub: 'Skor maksimal! Tak tertandingi!', mascot: 'assets/hana_sukses.png', trophy: '⭐', cols: ['#F59E0B','#FDE68A','#10B981','#fff'] };
    } else if (percentage >= 0.6) {
      state = { title: 'Luar Biasa! 🎉', sub: 'Kerja bagus, Anda berhasil lulus!', mascot: 'assets/hana_sukses.png', trophy: '🏆', cols: ['#6C63FF','#4F46E5','#10B981','#EC4899','#06B6D4'] };
    } else {
      state = { title: 'Tetap Semangat!', sub: 'Ayo coba lagi, setiap repetisi berharga!', mascot: 'assets/hana_encourage.png', trophy: '💪', cols: ['#8B5CF6','#C4B5FD','#7C3AED','#F43F5E'] };
    }

    const xpEarned = score * 10;
    
    overlay.innerHTML = `
      <div class="go-card" id="hana-go-card">
        <div class="go-shine"></div>
        <div class="go-mascot-wrap">
          <img src="${state.mascot}" alt="Hana Mascot">
          <div class="trophy">${state.trophy}</div>
        </div>
        <div class="go-title">${state.title}</div>
        <div class="go-sub">${state.sub}</div>
        <div class="go-stats">
          <div class="go-stat"><div class="go-stat-v">${score}/${maxScore}</div><div class="go-stat-l">Skor</div></div>
          <div class="go-stat"><div class="go-stat-v">+${xpEarned}</div><div class="go-stat-l">XP</div></div>
          <div class="go-stat"><div class="go-stat-v">🔥${maxCombo}</div><div class="go-stat-l">Max Combo</div></div>
        </div>
        <button class="go-btn1" id="go-btn-play">🚀 Main Lagi</button>
        <button class="go-btn2" id="go-btn-exit">Tutup & Simpan</button>
      </div>
    `;

    document.getElementById('go-btn-play').onclick = () => { overlay.classList.remove('on'); setTimeout(onPlayAgain, 400); };
    document.getElementById('go-btn-exit').onclick = () => { overlay.classList.remove('on'); setTimeout(onExit, 400); };

    const card = document.getElementById('hana-go-card');
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('div');
      el.className = 'go-confetti';
      el.style.left = Math.random() * 100 + '%';
      el.style.top = '-15px';
      el.style.background = state.cols[Math.floor(Math.random() * state.cols.length)];
      el.style.setProperty('--spin', (Math.random() * 720 - 360) + 'deg');
      el.style.setProperty('--dur', (1.8 + Math.random() * 1.5) + 's');
      el.style.animationDelay = (Math.random() * 1.1) + 's';
      const sz = 6 + Math.random() * 8;
      el.style.width = el.style.height = sz + 'px';
      card.appendChild(el);
    }
    
    overlay.classList.add('on');
  }
};

// =========================================================================
// 🎮 GAME 1: SEMANTIC MATCH GAME (CELESTIAL SCALES • ELASTIC PHYSICS)
// =========================================================================
const semanticGame = {
  rawDataset: [
    { word: "인도네시아", img: "asset game/indonesia.png" },
    { word: "한국", img: "asset game/south-korea.png" },
    { word: "동티모르", img: "asset game/east-timor.png" },
    { word: "싱가포르", img: "asset game/singapore.png" },
    { word: "이슬람 사원", img: "asset game/mosque.png" },
    { word: "교회", img: "asset game/church.png" },
    { word: "호텔", img: "asset game/hotel.png" },
    { word: "집", img: "asset game/house.png" },
    { word: "바다", img: "asset game/sea.png" },
    { word: "달", img: "asset game/full-moon.png" },
    { word: "해", img: "asset game/sun.png" },
    { word: "풍경", img: "asset game/landscape.png" },
    { word: "나무", img: "asset game/tree.png" },
    { word: "풀", img: "asset game/grass.png" },
    { word: "트럭", img: "asset game/delivery-truck.png" },
    { word: "승용차", img: "asset game/smart-car.png" },
    { word: "자동차", img: "asset game/car.png" },
    { word: "버스", img: "asset game/bus.png" },
    { word: "택시", img: "asset game/taxi.png" },
    { word: "배", img: "asset game/ship.png" },
    { word: "비행기", img: "asset game/airplane.png" },
    { word: "대중교통", img: "asset game/public-transport.png" },
    { word: "컴퓨터", img: "asset game/computer.png" },
    { word: "노트북", img: "asset game/laptop.png" },
    { word: "스마트폰", img: "asset game/smartphone.png" },
    { word: "캥거루", img: "asset game/kangaroo.png" },
    { word: "나비", img: "asset game/butterfly.png" },
    { word: "코알라", img: "asset game/koala.png" },
    { word: "물고기", img: "asset game/clown-fish.png" },
    { word: "공룡", img: "asset game/dinosaur.png" },
    { word: "코끼리", img: "asset game/elephant.png" },
    { word: "뱀", img: "asset game/snake.png" },
    { word: "쥐", img: "asset game/mouse.png" },
    { word: "닭", img: "asset game/hen.png" },
    { word: "벌", img: "asset game/bee.png" },
    { word: "게", img: "asset game/crab.png" },
    { word: "돼지", img: "asset game/pig.png" },
    { word: "개", img: "asset game/dog.png" },
    { word: "펭귄", img: "asset game/penguin.png" },
    { word: "수영", img: "asset game/swimming.png" },
    { word: "달리기", img: "asset game/running.png" },
    { word: "기도", img: "asset game/praying.png" },
    { word: "태권도", img: "asset game/martial-arts.png" },
    { word: "축구", img: "asset game/football.png" },
    { word: "여자", img: "asset game/girl.png" },
    { word: "남자", img: "asset game/boy.png" },
    { word: "포도", img: "asset game/grape.png" }
  ],
  score: 0, round: 1, maxRounds: 10, currentItem: null, topItem: null, bottomItem: null,
  
  init: function() {
    this.score = 0; this.round = 1;
    HanaJuicyEngine.comboCount = 0;
    document.getElementById('view-semantic-game').classList.remove('hidden');
    document.getElementById('bottom-navigation')?.classList.add('hidden');
    document.getElementById('aiButton')?.classList.add('hidden');
    this.loadRound();
  },

  loadRound: function() {
    document.getElementById('semantic-progress-text').innerText = `Round: ${this.round}/${this.maxRounds}`;
    const shuffled = [...this.rawDataset].sort(() => 0.5 - Math.random());
    this.currentItem = shuffled[0]; const wrongItem = shuffled[1];
    const items = [this.currentItem, wrongItem].sort(() => 0.5 - Math.random());
    this.topItem = items[0]; this.bottomItem = items[1];
    document.getElementById('img-top').src = this.topItem.img;
    document.getElementById('img-bottom').src = this.bottomItem.img;
    document.getElementById('semantic-word-text').innerText = this.currentItem.word;
    
    const card = document.getElementById('word-card');
    const hana = document.getElementById('match-hana-mascot');
    if(card) {
      card.style.transform = 'translate(0px, 0px) rotate(0deg) scaleY(1)';
      card.classList.remove('hana-fusion-active', 'hana-snap-rebound');
    }
    if(hana) {
      hana.src = 'assets/hana_thinking.png';
      hana.style.transform = 'translateY(0)';
    }
    this.setupDragAndDrop();
  },

  setupDragAndDrop: function() {
    const card = document.getElementById('word-card');
    const hana = document.getElementById('match-hana-mascot');
    const zoneTop = document.getElementById('zone-top');
    const zoneBottom = document.getElementById('zone-bottom');
    const glowTop = document.getElementById('glow-top');
    const glowBottom = document.getElementById('glow-bottom');
    
    if(!card) return;
    let isDragging = false; let startY = 0; let currentY = 0;
    
    card.onmousedown = card.ontouchstart = (e) => {
      isDragging = true;
      startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
      card.style.transition = 'none';
      if(hana) hana.style.transition = 'none';
    };
    
    window.onmousemove = window.ontouchmove = (e) => {
      if(!isDragging) return;
      const y = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
      currentY = y - startY;
      
      const tension = 1 + Math.abs(currentY) * 0.0015;
      const tilt = currentY * 0.06;
      card.style.transform = `translateY(${currentY}px) rotate(${tilt}deg) scaleY(${tension})`;
      
      if(hana) hana.style.transform = `translateY(${currentY * 0.18}px)`;

      if(currentY < -60) {
        if(zoneTop) zoneTop.classList.add('hana-zone-magnet'); 
        if(glowTop) glowTop.style.opacity = '1';
      } else {
        if(zoneTop) zoneTop.classList.remove('hana-zone-magnet'); 
        if(glowTop) glowTop.style.opacity = '0';
      }

      if(currentY > 60) {
        if(zoneBottom) zoneBottom.classList.add('hana-zone-magnet'); 
        if(glowBottom) glowBottom.style.opacity = '1';
      } else {
        if(zoneBottom) zoneBottom.classList.remove('hana-zone-magnet'); 
        if(glowBottom) glowBottom.style.opacity = '0';
      }
    };
    
    window.onmouseup = window.ontouchend = (e) => {
      if(!isDragging) return;
      isDragging = false;
      
      if(currentY < -60) { this.checkAnswer(this.topItem, currentY); }
      else if(currentY > 60) { this.checkAnswer(this.bottomItem, currentY); }
      else {
        card.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        card.style.transform = 'translate(0px, 0px) rotate(0deg) scaleY(1)';
        if(hana) {
          hana.style.transition = 'transform 0.4s ease-out';
          hana.style.transform = 'translateY(0)';
        }
      }
    };
  },

  checkAnswer: function(selectedItem, finalY) {
    const isCorrect = selectedItem.word === this.currentItem.word;
    const isTopSelected = (this.topItem && selectedItem.word === this.topItem.word);
    const targetZone = isTopSelected ? document.getElementById('zone-top') : document.getElementById('zone-bottom');
    const card = document.getElementById('word-card');
    const hana = document.getElementById('match-hana-mascot');
    const audioCtx = (typeof Sound !== 'undefined' && Sound._ctx) ? Sound._ctx : null;

    if(isCorrect) {
      this.score++;
      if(hana) hana.src = 'assets/hana_sukses.png';
      
      HanaJuicyEngine.triggerCorrect(card);

      card.style.transition = 'none';
      card.classList.add('hana-fusion-active');
      if (targetZone) targetZone.style.borderColor = '#10B981';

      if (typeof confetti !== 'undefined') confetti({ particleCount: 30, spread: 45, origin: { y: isTopSelected ? 0.3 : 0.7 }, zIndex: 99999 });
      
      const snd = new Audio('asset game/audio/benar.wav'); snd.volume = 0.4;
      if (audioCtx && audioCtx.createMediaElementSource) { try { const src = audioCtx.createMediaElementSource(snd); src.connect(audioCtx.destination); } catch(e){ console.warn(e) } }
      snd.play().catch(()=>{});
      if(navigator.vibrate) navigator.vibrate(50);
      if(typeof app !== 'undefined' && app.data) { app.data.xp += 10; Storage.set(app.data); app.renderDashboard(); }
    } else {
      if(hana) hana.src = 'assets/hana_encourage.png';
      
      HanaJuicyEngine.triggerWrong();

      card.style.transition = 'none';
      card.style.setProperty('--snap-y', `${finalY}px`);
      card.style.setProperty('--snap-rot', `${finalY * 0.06}deg`);
      card.classList.add('hana-snap-rebound');

      if (targetZone) targetZone.classList.add('hana-zone-error');
      
      const snd = new Audio('asset game/audio/salah.wav'); snd.volume = 0.3;
      if (audioCtx && audioCtx.createMediaElementSource) { try { const src = audioCtx.createMediaElementSource(snd); src.connect(audioCtx.destination); } catch(e){ console.warn(e) } }
      snd.play().catch(()=>{});
      if(navigator.vibrate) navigator.vibrate([80,40,80]);
    }

    this.round++;
    setTimeout(() => {
      if (targetZone) { targetZone.classList.remove('hana-zone-error', 'hana-zone-magnet'); targetZone.style.borderColor = ''; }
      document.getElementById('glow-top').style.opacity = '0'; document.getElementById('glow-bottom').style.opacity = '0';
      if(this.round > this.maxRounds) { 
        HanaJuicyEngine.showGameOver(this.score, this.maxRounds, HanaJuicyEngine.maxCombo, 'Semantic Game', 
          () => { this.init(); }, 
          () => { this.exitGame(); }
        );
      } else { this.loadRound(); }
    }, 700);
  },

  exitGame: function() {
    document.getElementById('view-semantic-game').classList.add('hidden');
    document.getElementById('bottom-navigation')?.classList.remove('hidden');
    document.getElementById('aiButton')?.classList.remove('hidden');
    if(typeof uiSwitcher !== 'undefined') uiSwitcher.switch(localStorage.getItem('eps_ui_mode') || 'minimalist');
  }
};

// =========================================================================
// 🔤 GAME 2: WORD CONNECT (SNAP MAGNET SUKU KATA)
// =========================================================================
const wordConnectGame = {
  score: 0, round: 1, maxRounds: 10, currentWord: '', userSelections: [],
  
  init: function() {
    this.score = 0; this.round = 1;
    HanaJuicyEngine.comboCount = 0;
    document.getElementById('view-word-connect').classList.remove('hidden');
    document.getElementById('bottom-navigation')?.classList.add('hidden');
    document.getElementById('aiButton')?.classList.add('hidden');
    this.loadQuestion();
  },
  
  loadQuestion: function() {
    document.getElementById('connect-progress-text').innerText = `Round: ${this.round}/${this.maxRounds}`;
    this.userSelections = [];
    document.getElementById('connect-answer-slots').innerHTML = '';
    document.getElementById('connect-letters-grid').innerHTML = '';
    
    const msc = document.getElementById('connect-hana-mascot');
    if(msc) msc.src = 'assets/hana_thinking.png';

    const target = [...semanticGame.rawDataset].sort(() => 0.5 - Math.random())[0];
    this.currentWord = target.word;
    document.getElementById('connect-target-img').src = target.img;
    
    const chars = this.currentWord.split('');
    chars.forEach(() => {
      const slot = document.createElement('div');
      slot.className = "w-11 h-11 bg-[#1A2333] border border-slate-800 rounded-xl shadow-inner flex items-center justify-center font-black text-slate-500 text-lg transition-all";
      document.getElementById('connect-answer-slots').appendChild(slot);
    });
    
    let pool = [...chars];
    while(pool.length < 8) pool.push(String.fromCharCode(0xAC00 + Math.floor(Math.random() * 11172)));
    pool.sort(() => 0.5 - Math.random());
    
    pool.forEach(c => {
      const btn = document.createElement('button');
      btn.className = "w-11 h-11 hana-squircle-tile font-black text-lg transition-all duration-200 active:scale-90 flex items-center justify-center";
      btn.innerText = c;
      btn.onclick = () => this.selectLetter(btn, c);
      document.getElementById('connect-letters-grid').appendChild(btn);
    });
    
    HanaJuicyEngine.startLifeline('connect-hana-mascot', () => {
      const unselectedBtns = Array.from(document.getElementById('connect-letters-grid').children).filter(b => !b.classList.contains('scale-0'));
      const nextCharNeeded = this.currentWord[this.userSelections.length];
      const correctBtn = unselectedBtns.find(b => b.innerText === nextCharNeeded);
      if(correctBtn) this.selectLetter(correctBtn, nextCharNeeded);
    });
  },
  
  selectLetter: function(btn, char) {
    if(this.userSelections.length >= this.currentWord.length) return;
    
    btn.classList.add('scale-0', 'opacity-0', 'pointer-events-none');
    
    const msc = document.getElementById('connect-hana-mascot');
    if(msc) msc.src = 'assets/hana_studying.png';

    this.userSelections.push({ char, btn });
    this.renderSlots();
    
    if(this.userSelections.length === this.currentWord.length) {
      setTimeout(() => this.evaluateAnswer(), 260);
    }
  },
  
  renderSlots: function() {
    const slots = document.getElementById('connect-answer-slots').querySelectorAll('div');
    slots.forEach(s => { s.innerText = ''; s.classList.remove('text-white', 'border-indigo-500'); });
    
    this.userSelections.forEach((sel, idx) => { 
      if(slots[idx]) {
        slots[idx].innerText = sel.char;
        slots[idx].classList.add('text-white', 'border-indigo-500');
        if (!slots[idx].classList.contains('hana-tile-magnet-pop')) {
          slots[idx].classList.add('hana-tile-magnet-pop');
        }
      } 
    });
  },
  
  clearSelection: function() {
    this.userSelections.forEach(sel => {
      sel.btn.classList.remove('scale-0', 'opacity-0', 'pointer-events-none');
    });
    this.userSelections = []; 
    this.renderSlots();
    
    const msc = document.getElementById('connect-hana-mascot');
    if(msc) msc.src = 'assets/hana_thinking.png';
  },
  
  evaluateAnswer: function() {
    const answer = this.userSelections.map(s => s.char).join('');
    const slots = document.getElementById('connect-answer-slots').querySelectorAll('div');
    const slotsWrapper = document.getElementById('connect-answer-slots');
    const msc = document.getElementById('connect-hana-mascot');
    const audioCtx = (typeof Sound !== 'undefined' && Sound._ctx) ? Sound._ctx : null;
    
    if(answer === this.currentWord) {
      this.score++;
      if(msc) msc.src = 'assets/hana_sukses.png';
      
      HanaJuicyEngine.triggerCorrect(slotsWrapper);

      slots.forEach(s => {
        s.className = "w-11 h-11 rounded-xl font-black text-lg flex items-center justify-center shadow-md hana-slot-success";
      });
      
      if(typeof confetti !== 'undefined') confetti({ particleCount: 30, spread: 45, origin: { y: 0.75 }, zIndex: 99999 });
      
      const snd = new Audio('asset game/audio/benar.wav'); snd.volume = 0.4;
      if (audioCtx && audioCtx.createMediaElementSource) { try { const src = audioCtx.createMediaElementSource(snd); src.connect(audioCtx.destination); } catch(e){ console.warn(e) } }
      snd.play().catch(()=>{});
      if(navigator.vibrate) navigator.vibrate(50);
      if(typeof app !== 'undefined' && app.data) { app.data.xp += 10; Storage.set(app.data); app.renderDashboard(); }
    } else {
      if(msc) msc.src = 'assets/hana_encourage.png';
      
      HanaJuicyEngine.triggerWrong();

      slots.forEach(s => {
        s.className = "w-11 h-11 rounded-xl font-black text-lg flex items-center justify-center shadow-md hana-slot-error";
      });
      
      const snd = new Audio('asset game/audio/salah.wav'); snd.volume = 0.3;
      if (audioCtx && audioCtx.createMediaElementSource) { try { const src = audioCtx.createMediaElementSource(snd); src.connect(audioCtx.destination); } catch(e){ console.warn(e) } }
      snd.play().catch(()=>{});
      if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
    
    this.round++;
    setTimeout(() => {
      if(this.round > this.maxRounds) { 
        HanaJuicyEngine.showGameOver(this.score, this.maxRounds, HanaJuicyEngine.maxCombo, 'Word Connect', 
          () => { this.init(); }, 
          () => { this.exitGame(); }
        );
      } else { this.loadQuestion(); }
    }, 1200);
  },
  
  exitGame: function() {
    document.getElementById('view-word-connect').classList.add('hidden');
    document.getElementById('bottom-navigation')?.classList.remove('hidden');
    document.getElementById('aiButton')?.classList.remove('hidden');
    if(typeof uiSwitcher !== 'undefined') uiSwitcher.switch(localStorage.getItem('eps_ui_mode') || 'minimalist');
  }
};

// =========================================================================
// ⚡ GAME 3: MATCH MADNESS (TIME ATTACK COMPONENT)
// =========================================================================
const matchMadnessGame = {
  activeWords: [], activeImages: [], selectedWord: null, selectedImage: null, score: 0, timerInterval: null, timeLeft: 30,
  
  init: function() {
    this.score = 0; this.timeLeft = 30; this.selectedWord = null; this.selectedImage = null;
    HanaJuicyEngine.comboCount = 0;
    document.getElementById('view-match-madness').classList.remove('hidden');
    document.getElementById('bottom-navigation')?.classList.add('hidden');
    document.getElementById('aiButton')?.classList.add('hidden');
    document.getElementById('madness-score-text').innerText = `XP: +0`;
    this.startTimer(); this.generateMatchSet();
  },

  startTimer: function() {
    clearInterval(this.timerInterval);
    const timerEl = document.getElementById('madness-timer-text');
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      if(timerEl) timerEl.innerText = `⏱ ${this.timeLeft}s`;
      if(this.timeLeft <= 5 && timerEl) timerEl.classList.add('text-red-500', 'animate-pulse');
      if (this.timeLeft <= 0) {
        clearInterval(this.timerInterval);
        if(typeof showToast === 'function') showToast(`Waktu Habis! 🎉 +${this.score * 10} XP!`, 'success');
        this.exitGame();
      }
    }, 1000);
  },

  generateMatchSet: function() {
    const set = [...semanticGame.rawDataset].sort(() => Math.random() - 0.5).slice(0, 4);
    this.activeWords = [...set].sort(() => Math.random() - 0.5);
    this.activeImages = [...set].sort(() => Math.random() - 0.5);
    this.renderGrid();
  },

  renderGrid: function() {
    const wordsCol = document.getElementById('madness-words-col');
    const imagesCol = document.getElementById('madness-images-col');
    wordsCol.innerHTML = ''; imagesCol.innerHTML = '';
    
    this.activeWords.forEach(item => {
      const btn = document.createElement('button');
      btn.className = "w-full h-16 bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-2xl font-black text-lg shadow transition-all active:scale-95 flex items-center justify-center px-2";
      btn.innerText = item.word;
      btn.onclick = () => this.selectWord(btn, item);
      wordsCol.appendChild(btn);
    });

    this.activeImages.forEach(item => {
      const div = document.createElement('button');
      div.className = "w-full h-16 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-2 shadow transition-all active:scale-95 flex items-center justify-center overflow-hidden";
      div.innerHTML = `<img src="${item.img}" class="max-h-full max-w-full object-contain pointer-events-none">`;
      div.onclick = () => this.selectImage(div, item);
      imagesCol.appendChild(div);
    });
  },

  selectWord: function(el, item) {
    document.querySelectorAll('#madness-words-col button').forEach(b => b.className = b.className.replace(' border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400', ' border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-primary)]'));
    this.selectedWord = { el: el, item: item };
    el.className = "w-full h-16 bg-cyan-50 dark:bg-cyan-950/30 border-2 border-cyan-500 rounded-2xl font-black text-lg text-cyan-600 dark:text-cyan-400 shadow transition-all flex items-center justify-center px-2";
    
    if (item.img) {
      const audioPath = item.img.replace('.png', '.wav').replace('asset game/', 'asset game/audio/');
      const snd = new Audio(audioPath); snd.volume = 0.5;
      const audioCtx = (typeof Sound !== 'undefined' && Sound._ctx) ? Sound._ctx : null;
      if (audioCtx && audioCtx.createMediaElementSource) { try { const src = audioCtx.createMediaElementSource(snd); src.connect(audioCtx.destination); } catch(e){ console.warn(e) } }
      snd.play().catch(()=>{});
    }
    this.checkMatch();
  },

  selectImage: function(el, item) {
    document.querySelectorAll('#madness-images-col button').forEach(b => b.className = b.className.replace(' border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30', ' border-[var(--card-border)] bg-[var(--card-bg)]'));
    this.selectedImage = { el: el, item: item };
    el.className = "w-full h-16 bg-cyan-50 dark:bg-cyan-950/30 border-2 border-cyan-500 rounded-2xl p-2 shadow transition-all flex items-center justify-center overflow-hidden";
    this.checkMatch();
  },

  checkMatch: function() {
    if(!this.selectedWord || !this.selectedImage) return;
    const w = this.selectedWord; const i = this.selectedImage;
    const audioCtx = (typeof Sound !== 'undefined' && Sound._ctx) ? Sound._ctx : null;
    
    if(w.item.word === i.item.word) {
      this.score++;

      if (HanaJuicyEngine.comboCount >= 4) { 
        HanaJuicyEngine.isFeverMode = true;
        document.getElementById('view-match-madness').classList.add('neon-fever-bg');
      }
      
      if (HanaJuicyEngine.isFeverMode && typeof app !== 'undefined' && app.data) {
         app.data.xp += 10;
      }

      HanaJuicyEngine.triggerCorrect(w.el);

      if (typeof app !== 'undefined' && app.data) { app.data.xp += 10; Storage.set(app.data); app.renderDashboard(); }
      document.getElementById('madness-score-text').innerText = `XP: +${this.score * 10}`;
      
      const snd = new Audio('asset game/audio/benar.wav'); snd.volume = 0.4;
      if (audioCtx && audioCtx.createMediaElementSource) { try { const src = audioCtx.createMediaElementSource(snd); src.connect(audioCtx.destination); } catch(e){ console.warn(e) } }
      snd.play().catch(()=>{});

      if (navigator.vibrate) navigator.vibrate(40);
      w.el.className = "w-full h-16 bg-emerald-500 border-2 border-emerald-400 text-white rounded-2xl font-black text-lg flex items-center justify-center scale-95 pointer-events-none transition-all";
      i.el.className = "w-full h-16 bg-emerald-500 border-2 border-emerald-400 rounded-2xl p-2 scale-95 pointer-events-none transition-all";
      setTimeout(() => {
        w.el.style.visibility = 'hidden'; i.el.style.visibility = 'hidden';
        this.activeWords = this.activeWords.filter(item => item.word !== w.item.word);
        this.activeImages = this.activeImages.filter(item => item.word !== i.item.word);
        this.selectedWord = null; this.selectedImage = null;
        if(this.activeWords.length === 0) this.generateMatchSet();
      }, 250);
    } else {
      HanaJuicyEngine.triggerWrong();

      const snd = new Audio('asset game/audio/salah.wav'); snd.volume = 0.3;
      if (audioCtx && audioCtx.createMediaElementSource) { try { const src = audioCtx.createMediaElementSource(snd); src.connect(audioCtx.destination); } catch(e){ console.warn(e) } }
      snd.play().catch(()=>{});

      if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
      w.el.className = "w-full h-16 bg-rose-950/40 border-2 border-rose-600 text-rose-400 rounded-2xl font-black text-lg flex items-center justify-center animate-bounce px-2";
      i.el.className = "w-full h-16 bg-rose-950/40 border-2 border-rose-600 rounded-2xl p-2 animate-bounce";
      setTimeout(() => {
        w.el.className = "w-full h-16 bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-2xl font-black text-lg shadow flex items-center justify-center px-2";
        i.el.className = "w-full h-16 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-2 shadow flex items-center justify-center overflow-hidden";
        this.selectedWord = null; this.selectedImage = null;
      }, 400);
    }
  },

  exitGame: function() {
    clearInterval(this.timerInterval);
    document.getElementById('view-match-madness').classList.add('hidden');
    document.getElementById('bottom-navigation')?.classList.remove('hidden');
    document.getElementById('aiButton')?.classList.remove('hidden');
    if (typeof uiSwitcher !== 'undefined') uiSwitcher.switch(localStorage.getItem('eps_ui_mode') || 'minimalist');
  }
};

// =========================================================================
// 👂 GAME 4: LISTEN & STRIKE (DUOLINGO SPEAKERS • REBOUND BOUNCE)
// =========================================================================
const listenStrikeGame = {
  currentCorrectItem: null, score: 0, round: 1, maxRounds: 10, choices: [], isSpeaking: false,
  
  init: function() {
    this.score = 0; this.isSpeaking = false;
    HanaJuicyEngine.comboCount = 0;
    document.getElementById('view-listen-strike').classList.remove('hidden');
    document.getElementById('bottom-navigation')?.classList.add('hidden');
    document.getElementById('aiButton')?.classList.add('hidden');
    document.getElementById('listen-score-text').innerText = `XP: +0`;
    if(typeof lucide !== 'undefined') lucide.createIcons();
    this.loadNewQuestion();
  },

  loadNewQuestion: function() {
    const dataset = semanticGame.rawDataset;
    this.currentCorrectItem = dataset[Math.floor(Math.random() * dataset.length)];
    let wrongChoices = dataset.filter(item => item.word !== this.currentCorrectItem.word).sort(() => Math.random() - 0.5).slice(0, 3);
    this.choices = [this.currentCorrectItem, ...wrongChoices].sort(() => Math.random() - 0.5);
    
    setTimeout(() => { this.speakCurrentWord(); }, 400);
    this.renderChoices();
  },

  speakCurrentWord: function() {
    if (!this.currentCorrectItem || !window.speechSynthesis) return;

    const spkBtn = document.querySelector('#view-listen-strike button');
    if(spkBtn) {
      spkBtn.classList.remove('hana-speaker-bounce');
      void spkBtn.offsetWidth;
      spkBtn.classList.add('hana-speaker-bounce');
      setTimeout(() => spkBtn.classList.remove('hana-speaker-bounce'), 450);
    }
    
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    try {
      const utterance = new SpeechSynthesisUtterance(this.currentCorrectItem.word);
      utterance.lang = 'ko-KR'; 
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch(err) {
      console.error("Speech engine stuck:", err);
    }
  },

  renderChoices: function() {
    const grid = document.getElementById('listen-choices-grid');
    if (!grid) return;
    grid.innerHTML = '';
    this.choices.forEach(item => {
      const btn = document.createElement('button');
      btn.className = "w-full aspect-square bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-md hover:border-amber-500/50 transition-all active:scale-95 flex items-center justify-center overflow-hidden group";
      btn.innerHTML = `<img src="${item.img}" class="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-105 transition-transform" onerror="this.src='https://illustrations.popsy.co/white/abstract-art.png'">`;
      btn.onclick = () => this.evaluateChoice(btn, item);
      grid.appendChild(btn);
    });
  },

  evaluateChoice: function(selectedElement, clickedItem) {
    const audioCtx = (typeof Sound !== 'undefined' && Sound._ctx) ? Sound._ctx : null;
    const buttons = document.querySelectorAll('#listen-choices-grid button');
    buttons.forEach(b => b.style.pointerEvents = 'none');

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (clickedItem.word === this.currentCorrectItem.word) {
      this.score++;
      
      HanaJuicyEngine.triggerCorrect(selectedElement);

      if (typeof app !== 'undefined' && app.data) { app.data.xp += 10; Storage.set(app.data); app.renderDashboard(); }
      document.getElementById('listen-score-text').innerText = `XP: +${this.score * 10}`;

      const snd = new Audio('asset game/audio/benar.wav'); snd.volume = 0.4;
      if (audioCtx && audioCtx.createMediaElementSource) { try { const src = audioCtx.createMediaElementSource(snd); src.connect(audioCtx.destination); } catch(e){ console.warn(e) } }
      snd.play().catch(()=>{});

      if (navigator.vibrate) navigator.vibrate(50);
      if (typeof confetti !== 'undefined') confetti({ particleCount: 20, spread: 35, origin: { y: 0.8 }, zIndex: 99999 });
      selectedElement.className = "w-full aspect-square bg-emerald-500 border-4 border-emerald-400 rounded-2xl p-4 flex items-center justify-center scale-105 transition-all";
    } else {
      HanaJuicyEngine.triggerWrong();

      const snd = new Audio('asset game/audio/salah.wav'); snd.volume = 0.3;
      if (audioCtx && audioCtx.createMediaElementSource) { try { const src = audioCtx.createMediaElementSource(snd); src.connect(audioCtx.destination); } catch(e){ console.warn(e) } }
      snd.play().catch(()=>{});

      if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
      selectedElement.className = "w-full aspect-square bg-rose-600 border-4 border-rose-500 rounded-2xl p-4 flex items-center justify-center animate-bounce transition-all";
    }
    
    this.round = (this.round || 1) + 1;
    setTimeout(() => { 
      if(this.round > (this.maxRounds || 10)) {
        HanaJuicyEngine.showGameOver(this.score, (this.maxRounds || 10), HanaJuicyEngine.maxCombo, 'Listen Strike', 
          () => { this.init(); }, 
          () => { this.exitGame(); }
        );
      } else { this.loadNewQuestion(); }
    }, 1000);
  },

  exitGame: function() {
    if (window.speechSynthesis) { window.speechSynthesis.cancel(); }
    document.getElementById('view-listen-strike').classList.add('hidden');
    document.getElementById('bottom-navigation')?.classList.remove('hidden');
    document.getElementById('aiButton')?.classList.remove('hidden');
    if (typeof uiSwitcher !== 'undefined') uiSwitcher.switch(localStorage.getItem('eps_ui_mode') || 'minimalist');
  }
};

// =========================================================================

const rouletteDataset = [
  { qText: "Sepak Bola", choices: ['Sepak Bola', 'Mobil', 'Rumah', 'Gereja'], correct: 'Sepak Bola', mode: 'listen', kr: '축구' },
  { qText: "Apa nama Hangul untuk gambar Mobil?", choices: ['자동차', '버스', '물고기', '집'], correct: '자동차', mode: 'match' },
  { qText: "스마트폰", choices: ['Smartphone', 'Bus', 'Ikan', 'Gereja'], correct: 'Smartphone', mode: 'semantic' },
  { qText: "Pilih ejaan Hangul yang benar untuk 'IKAN'", choices: ['물고기', '물고기짚', '물구기', '몰고기'], correct: '물고기', mode: 'spelling' },
  { qText: "대중교통 (Transportasi Umum) — pilih kata yang sesuai", choices: ['버스', '물고기', '교회', '축구'], correct: '버스', mode: 'category' }
];

Object.assign(app, {
  loadRouletteQuestion() {
    const screen = document.getElementById('screen-roulette');
    if (!screen) return;
    screen.classList.remove('hidden');
    const progressEl = document.getElementById('micro-roulette-progress');
    if (progressEl) progressEl.innerText = `Round: ${(this.state.rouletteIdx || 0) + 1}/5`;
    
    const qZone = document.getElementById('roulette-question-zone');
    const cZone = document.getElementById('roulette-choices-zone');
    const fbBanner = document.getElementById('roulette-feedback-banner');
    if (!qZone || !cZone || !fbBanner) return;
    
    cZone.innerHTML = ''; fbBanner.classList.add('hidden');
    const casinoDummyWords = ["사과", "한국어", "회사", "공장", "비상 정지", "작업", "반장님", "기계", "위험해"];
    
    let spinCount = 0;
    const slotInterval = setInterval(() => {
      const randomItem = casinoDummyWords[Math.floor(Math.random() * casinoDummyWords.length)];
      qZone.innerHTML = `<div class="text-3xl font-black text-purple-400/40 select-none blur-[1px] transform scale-95 transition-all duration-75">${randomItem}</div>`;
      spinCount++;
      
      if (spinCount > 12) {
        clearInterval(slotInterval);
        if (navigator.vibrate) navigator.vibrate([40, 40]);
        const realQuestion = this.getRealRouletteData();
        
        qZone.innerHTML = `
          <div class="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 mb-2">🎰 TARGET SOAL</div>
          <h2 class="text-3xl font-black text-white tracking-wide jackpot-lock">${realQuestion.qText}</h2>
        `;
        
        realQuestion.choices.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = "w-full text-left p-4 rounded-xl font-bold bg-[#12122a] border border-purple-500/20 text-slate-200 transition-all active:scale-[0.98] hover:bg-purple-500/10 hover:border-purple-500/40 text-sm";
          btn.innerText = opt;
          btn.onclick = () => this.evaluateRouletteAnswer(btn, opt, realQuestion);
          cZone.appendChild(btn);
        });
      }
    }, 80);
  },
  getRealRouletteData() {
    const idx = this.state.rouletteIdx || 0;
    return (idx >= 0 && idx < rouletteDataset.length) ? rouletteDataset[idx] : rouletteDataset[0];
  },
  evaluateRouletteAnswer(clickedBtn, selected, qData) {
    if (this.state.rouletteAnswered) return;
    this.state.rouletteAnswered = true;
    document.querySelectorAll('#roulette-choices-zone button').forEach(b => b.disabled = true);
    
    const fbBanner = document.getElementById('roulette-feedback-banner');
    if (!fbBanner) return;
    fbBanner.classList.remove('hidden');
    
    if (selected === qData.correct) {
      this.state.rouletteScore = (this.state.rouletteScore || 0) + 1;
      clickedBtn.className = "w-full text-left p-4 rounded-xl font-bold bg-emerald-600/30 border border-emerald-400/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] text-sm";
      fbBanner.className = "p-4 rounded-2xl text-center font-black text-xs border transition-all duration-300 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 block";
      fbBanner.innerHTML = '🎯 TEPAT! +5 XP';
      this.data.xp = (this.data.xp || 0) + 5; Storage.set(this.data); this.renderDashboard();
      if (typeof confetti !== 'undefined') confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 }, zIndex: 99999 });
    } else {
      clickedBtn.className = "w-full text-left p-4 rounded-xl font-bold bg-rose-600/30 border border-rose-400/60 text-rose-300 text-sm";
      fbBanner.className = "p-4 rounded-2xl text-center font-black text-xs border transition-all duration-300 bg-rose-500/10 border-rose-500/30 text-rose-400 block";
      fbBanner.innerHTML = `❌ Jawaban: <strong>${qData.correct}</strong>`;
      if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    }
    setTimeout(() => {
      if (this.state.rouletteIdx < 4) {
        this.state.rouletteIdx = (this.state.rouletteIdx || 0) + 1; this.loadRouletteQuestion();
      } else {
        document.getElementById('screen-roulette').classList.add('hidden');
        if (typeof showToast === 'function') showToast(`🏆 Skor Roulette: ${this.state.rouletteScore || 0}/5!`, 'success');
      }
    }, 1200);
  }
});


