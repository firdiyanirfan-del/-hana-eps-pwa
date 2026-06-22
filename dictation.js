// ============================================================
// DICTATION ENGINE
// ============================================================
const DictationEngine = {
  questions: [], current: 0, playsLeft: 2,
  init() {
    const all = [...Bank.beginner.listening, ...Bank.normal.listening, ...Bank.pro.listening];
    this.questions = app.shuffle(all).slice(0, 10);
    this.current = 0; this.playsLeft = 2;
    document.getElementById('dic-input').value = '';
    document.getElementById('dic-feedback').classList.add('hidden');
    document.getElementById('dic-submit-btn').classList.remove('hidden');
    document.getElementById('dic-next-btn').classList.add('hidden');
    buildHangulKeyboard();
  },
  getCurrent() { return this.questions[this.current]; },
  updateUI() {
    document.getElementById('dic-progress').innerText = `Soal ${this.current + 1}/10`;
    document.getElementById('dic-plays-left').innerText = this.playsLeft;
    document.getElementById('dic-input').value = '';
    document.getElementById('dic-feedback').classList.add('hidden');
    document.getElementById('dic-submit-btn').classList.remove('hidden');
    document.getElementById('dic-next-btn').classList.add('hidden');
  },
  playAudio() {
    if (this.playsLeft <= 0) return;
    const q = this.getCurrent();
    if (!q) return;
    const u = new SpeechSynthesisUtterance(q.audio);
    u.lang = 'ko-KR';
    window.speechSynthesis.speak(u);
    this.playsLeft--;
    document.getElementById('dic-plays-left').innerText = this.playsLeft;
    if (this.playsLeft <= 0) document.getElementById('dic-play-btn').disabled = true;
  },
  check() {
    const q = this.getCurrent();
    const userAns = document.getElementById('dic-input').value.trim();
    const correct = userAns === q.c || userAns === (q.audio || '');
    const fb = document.getElementById('dic-feedback');
    fb.classList.remove('hidden');
    if (correct) {
      fb.className = 'p-4 rounded-xl text-center font-bold bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 mb-2';
      fb.innerText = '✅ Benar!';
      Sound.play('correct');
    } else {
      fb.className = 'p-4 rounded-xl text-center font-bold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 mb-2';
      const expected = q.audio || q.c;
      fb.innerHTML = `❌ Kurang tepat.<br>Jawaban benar: <b>${expected}</b>`;
      Sound.play('wrong');
    }
    document.getElementById('dic-submit-btn').classList.add('hidden');
    document.getElementById('dic-next-btn').classList.remove('hidden');
    if (!app.state.dicAnswers) app.state.dicAnswers = [];
    app.state.dicAnswers.push({ q: q.audio, user: userAns, correct: q.c, isCorrect: correct });
  },
  next() {
    this.current++;
    if (this.current >= this.questions.length) {
      const total = app.state.dicAnswers?.length || 0;
      const correctCount = app.state.dicAnswers?.filter(a => a.isCorrect).length || 0;
      const xp = correctCount * 5;
      app.data.xp += xp; Storage.set(app.data);
      showDictationResult(correctCount, total, xp);
      app.state.dicAnswers = [];
    } else {
      this.playsLeft = 2;
      document.getElementById('dic-play-btn').disabled = false;
      this.updateUI();
    }
  }
};

function showDictationResult(correct, total, xp) {
  const fb = document.getElementById('dic-feedback');
  fb.classList.remove('hidden');
  fb.className = 'p-4 rounded-xl text-center font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 mb-2';
  fb.innerHTML = `🎉 Selesai! Benar ${correct}/${total}. <br>+${xp} XP`;
  document.getElementById('dic-submit-btn').classList.add('hidden');
  document.getElementById('dic-next-btn').classList.add('hidden');
  setTimeout(() => app.showDashboard(), 2500);
}

// ============================================================
// VIRTUAL HANGUL KEYBOARD SCRIPT
// ============================================================
const HANGUL_ROWS = [
  ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'],
  ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'],
  ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ']
];
let _jamo = '';

function hkbPress(char) {
  const input = document.getElementById('dic-input');

  if (typeof Hangul !== 'undefined') {
    let jamoArray = Hangul.disassemble(input.value);
    jamoArray.push(char);
    input.value = Hangul.assemble(jamoArray);
  } else {
    input.value += char;
  }

  input.focus();
}

function hkbBackspace() {
  const input = document.getElementById('dic-input');

  if (typeof Hangul !== 'undefined') {
    let jamoArray = Hangul.disassemble(input.value);
    jamoArray.pop();
    input.value = Hangul.assemble(jamoArray);
  } else {
    input.value = input.value.slice(0, -1);
  }

  input.focus();
}

function hkbClear() {
  document.getElementById('dic-input').value = '';
}

function buildHangulKeyboard() {
  const container = document.getElementById('hkb-rows');
  if (!container) return;
  container.innerHTML = '';
  HANGUL_ROWS.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'flex gap-1 justify-center';
    row.forEach(char => {
      const btn = document.createElement('button');
      btn.className = 'hangul-key flex-1 min-w-0';
      btn.textContent = char;
      btn.type = 'button';
      btn.onclick = () => hkbPress(char);
      rowDiv.appendChild(btn);
    });
    container.appendChild(rowDiv);
  });
  const vowelRow = document.createElement('div');
  vowelRow.className = 'flex gap-1 justify-center mt-1';
  ['가', '나', '다', '라', '마', '바', '사', '아', '자', '하'].forEach(char => {
    const btn = document.createElement('button');
    btn.className = 'hangul-key flex-1 min-w-0 text-xs';
    btn.textContent = char;
    btn.type = 'button';
    btn.onclick = () => hkbPress(char);
    vowelRow.appendChild(btn);
  });
  container.appendChild(vowelRow);
}