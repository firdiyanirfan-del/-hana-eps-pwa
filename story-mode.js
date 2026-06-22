// =========================================================================
// 📖 HANA REAL-WORLD WORKFORCE STORY ENGINE (MODULAR MODULE)
// =========================================================================

Object.assign(app, {
  // === STORY MODE DATASET STORAGE ===
  storyChapters: [
    {
      ch: 1,
      title: "Hari Pertama di Pabrik Gasi",
      narration: "Kamu baru saja tiba di Pabrik Manufaktur Logam Gasi, Daegu. Mandor (Sajangnim) menyambutmu dengan wajah tegas namun ramah. Di depan meja kerja, terdapat mesin press hidrolik raksasa yang mendengung keras. Sajangnim memberikan instruksi keselamatan pertama dalam bahasa Korea yang cepat.",
      q: "Apa kalimat sambutan atau respon sopan yang paling tepat kamu ucapkan kepada Sajangnim sebagai pekerja baru?",
      a: [
        "처음 뵙겠습니다. 잘 부탁드립니다. (Pertama kali bertemu. Mohon bimbingannya.)",
        "안녕! Berikan saya sarung tangan kerja sekarang.",
        "수고하셨습니다. (Terima kasih atas kerja kerasnya - Diucapkan saat pulang)",
        "빨리 빨리! Saya mau langsung menyalakan mesin press ini."
      ],
      c: "처음 뵙겠습니다. 잘 부탁드립니다. (Pertama kali bertemu. Mohon bimbingannya.)",
      ex: "Sebagai pekerja asing baru, mengucapkan salam perkenalan yang formal dan sopan (잘 부탁드립니다) adalah etika mutlak untuk membangun impresi awal yang baik di lingkungan industri Korea."
    },
    {
      ch: 2,
      title: "Menghadapi Mesin Overheat",
      narration: "Dua jam bekerja, alarm lampu merah di atas mesin press hidrolik tiba-tiba menyala berkedip. Asap tipis mulai mengepul dari sela-sela katup oli. Rekan kerja Koreamu berteriak, '위험해! 기계를 멈춰!' (Bahaya! Hentikan mesin!)",
      q: "Tindakan taktis keselamatan kerja apa yang harus segera kamu ambil berdasarkan teks cerita di atas?",
      a: [
        "Mencari tombol '비상 정지' (Emergency Stop) untuk mematikan daya mesin secara instan.",
        "Mengabaikan asap dan tetap mengejar target cetak logam agar tidak dimarahi Sajangnim.",
        "Berlari keluar pabrik tanpa memberi tahu pekerja lain di dalam ruangan.",
        "Menyiram panel listrik mesin dengan air agar asapnya cepat hilang."
      ],
      c: "Mencari tombol '비상 정지' (Emergency Stop) untuk mematikan daya mesin secara instan.",
      ex: "Dalam regulasi keselamatan kerja Korea (Saneop Anjeon), saat terjadi malfungsi mesin yang berpotensi kebakaran atau overheat, menekan tombol Emergency Stop (비상 정지) adalah prosedur baku utama."
    }
  ],

  // === RUNTIME ENGINE OPERATIONS ===
  startStoryMode() {
    this.toggleImmersiveMode(true);
    if (!this.data.storyProgress) {
      this.data.storyProgress = { currentChapter: 1 };
    }
    
    this.state.mode = 'story';
    this.state.storyIdx = 0;
    this.state.storyCorrect = 0;
    
    app.switchScreen('story-screen');
    
    this.loadStoryQuestion();
  },

  loadStoryQuestion() {
    this.state.isStoryAnswerChecked = false;
    const currentCh = this.data.storyProgress.currentChapter || 1;
    
    // Fallback boundary safety
    let chData = this.storyChapters.find(c => c.ch === currentCh);
    if (!chData) {
      // Jika tamat, balik ke bab 1
      this.data.storyProgress.currentChapter = 1;
      chData = this.storyChapters[0];
    }

    document.getElementById('story-chapter-indicator').innerText = `Babak ${chData.ch} : ${chData.title}`;
    document.getElementById('story-narration').innerText = chData.narration;
    document.getElementById('story-question-text').innerText = chData.q;

    const optsCont = document.getElementById('story-options');
    optsCont.innerHTML = '';

    chData.a.forEach(opt => {
      const b = document.createElement('button');
      b.className = 'btn-option w-full text-left p-4 rounded-2xl font-bold bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 transition-all active:scale-[0.98]';
      b.innerText = opt;
      b.onclick = () => this.evaluateStoryAnswer(b, opt, chData);
      optsCont.appendChild(b);
    });

    document.getElementById('story-feedback').classList.add('hidden');
    document.getElementById('story-next-btn').classList.add('hidden');
  },

  evaluateStoryAnswer(clickedBtn, selectedOpt, chData) {
    if (this.state.isStoryAnswerChecked) return;
    this.state.isStoryAnswerChecked = true;

    const buttons = document.querySelectorAll('#story-options .btn-option');
    buttons.forEach(b => b.disabled = true);

    const isCorrect = selectedOpt === chData.c;
    const fb = document.getElementById('story-feedback');

    if (isCorrect) {
      clickedBtn.className = 'btn-option w-full text-left p-4 rounded-2xl font-black bg-emerald-500 text-white border-2 border-emerald-450 shadow-md';
      fb.className = 'p-4 rounded-2xl text-xs font-bold mb-4 bg-green-100 text-green-700 dark:bg-green-900/40 border border-green-200/50 block animate-pulse';
      fb.innerHTML = `<div>🎯 Keputusan Tepat!</div><div class="mt-1 font-normal text-slate-600 dark:text-slate-300">${chData.ex}</div>`;
      
      // Tambah XP Penyelesaian Cerita Kerja
      this.data.xp += 25;
      Storage.set(this.data);
      this.renderDashboard();
      
      // Maju ke babak berikutnya
      this.data.storyProgress.currentChapter = chData.ch + 1;
      Storage.set(this.data);
    } else {
      clickedBtn.className = 'btn-option w-full text-left p-4 rounded-2xl font-black bg-rose-500 text-white border-2 border-rose-450 shadow-md';
      fb.className = 'p-4 rounded-2xl text-xs font-bold mb-4 bg-red-100 text-red-700 dark:bg-red-900/40 border border-red-200/50 block';
      fb.innerHTML = `<div>❌ Keputusan Kurang Tepat</div><div class="mt-1 font-normal text-slate-600 dark:text-slate-300">${chData.ex}</div>`;
      
      if (navigator.vibrate) navigator.vibrate(100);
    }

    document.getElementById('story-next-btn').classList.remove('hidden');
  },

  nextStoryQuestion() {
    // Reload screen dengan babak terbaru yang sudah di-update di storage
    this.loadStoryQuestion();
  },

  restartStory() {
    if (confirm('Apakah Anda ingin mengulang petualangan dunia kerja ini dari Babak 1?')) {
      if (!this.data.storyProgress) this.data.storyProgress = {};
      this.data.storyProgress.currentChapter = 1;
      Storage.set(this.data);
      this.loadStoryQuestion();
    }
  }
});

console.log("HANA Story Mode Engine successfully modularized.");
