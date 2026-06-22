// ============================================================
// AI CHAT CORE (MENGGUNAKAN GROQ API - SUPER CEPAT & GRATIS)
// ============================================================
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// 👇 API KEY GROQ — GANTI DENGAN .env ATAU BACKEND UNTUK PRODUKSI 👇
const GROQ_KEY = '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';

const aiChat = {
  _history: [],
  _contextTarget: null,

  init() {
    try {
      const saved = localStorage.getItem('hana_quiz_history');
      if (saved) this._history = JSON.parse(saved);
    } catch (e) {}

    if (!document.getElementById('chat-context-menu')) {
      const menu = document.createElement('div');
      menu.id = 'chat-context-menu';
      menu.className = 'hidden fixed z-[999999] bg-white dark:bg-[#1C1B1A] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 min-w-[170px] backdrop-blur-md select-none';
      menu.innerHTML =
        '<button data-action="copy" class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-xl transition-colors text-left"><span class="text-base">📋</span> Salin</button>' +
        '<button data-action="edit" class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-xl transition-colors text-left"><span class="text-base">✏️</span> Edit</button>' +
        '<button data-action="delete" class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors text-left"><span class="text-base">🗑️</span> Hapus</button>';
      document.body.appendChild(menu);

      menu.querySelectorAll('[data-action]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          this._handleContextAction(btn.dataset.action);
          menu.classList.add('hidden');
        });
      });

      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) menu.classList.add('hidden');
      });
    }

    document.getElementById('sendAI').onclick = () => this.send();
    document.getElementById('aiInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.send();
    });

    document.addEventListener('pointerdown', (e) => {
      const menu = document.getElementById('chat-context-menu');
      if (menu && !menu.contains(e.target)) {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
      }
    });

    this.updateHeaderStats();
    this._renderWelcome();
  },

  updateHeaderStats() {
    const xpEl = document.getElementById('chat-xp-text');
    if (!xpEl) return;
    const appData = window.app && window.app.data;
    const xp = (appData && appData.xp) || 0;
    let label = xp + ' XP';
    if (appData && appData.examDate) {
      const diff = new Date(appData.examDate) - new Date();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (days > 0) label += ' • D-' + days;
      else if (days === 0) label += ' • Hari Ini!';
      else label += ' • Ujian Lewat';
    }
    xpEl.textContent = label;
  },

  _renderWelcome() {
    const container = document.getElementById('aiContent');
    if (!container || container.children.length > 0) return;
    const html =
      `<div class="flex flex-col items-start mb-4 max-w-[85%]">
        <div class="flex items-center gap-2 mb-1">
          <div class="w-6 h-6 rounded-full bg-indigo-500 dark:bg-[#8781ff] flex items-center justify-center text-white"><span class="material-symbols-outlined text-[14px]">smart_toy</span></div>
          <span class="text-[10px] font-bold text-indigo-500 dark:text-[#c4c0ff] uppercase tracking-widest">Hana AI</span>
        </div>
        <div class="bg-indigo-50 dark:bg-[#1c2b3c] text-slate-700 dark:text-white border border-indigo-100 dark:border-[#918fa1]/20 px-4 py-3 rounded-2xl rounded-tl-none text-sm leading-relaxed shadow-sm">
          Anyoung! 👋 Aku Hana, asisten belajarmu. Tanyakan soal EPS-TOPIK, bedah jawaban, atau latihan kapan saja!
        </div>
      </div>`;
    container.insertAdjacentHTML('beforeend', html);
    container.scrollTop = container.scrollHeight;
  },

  // ============================================================
  // LONG-PRESS CONTEXT ENGINE
  // ============================================================
  _attachBubbleMenu(el) {
    let timer = null;
    let pressed = false;

    const onStart = (x, y) => {
      pressed = true;
      timer = setTimeout(() => {
        if (pressed) {
          this._contextTarget = el;
          const menu = document.getElementById('chat-context-menu');
          const mw = 170, mh = 180;
          menu.style.left = Math.min(x, window.innerWidth - mw) + 'px';
          menu.style.top = Math.min(y, window.innerHeight - mh) + 'px';
          menu.classList.remove('hidden');
        }
      }, 500);
    };

    const onEnd = () => {
      pressed = false;
      if (timer) { clearTimeout(timer); timer = null; }
    };

    el.addEventListener('pointerdown', (e) => { onStart(e.clientX, e.clientY); });
    el.addEventListener('pointerup', onEnd);
    el.addEventListener('pointerleave', onEnd);
    el.addEventListener('touchstart', (e) => { const t = e.touches[0]; onStart(t.clientX, t.clientY); }, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
  },

  _handleContextAction(action) {
    const target = this._contextTarget;
    if (!target) return;

    const msgDiv = target.querySelector('[class*="rounded-2xl"]') || target;
    const msgText = msgDiv ? msgDiv.textContent.trim() : target.textContent.trim();

    if (action === 'copy') {
      navigator.clipboard.writeText(msgText).catch(() => {});
    } else if (action === 'delete') {
      const container = document.getElementById('aiContent');
      const all = Array.from(container.children);
      const idx = all.indexOf(target);
      if (idx === -1) { target.remove(); this._contextTarget = null; return; }
      all.slice(idx).forEach((el) => el.remove());
    } else if (action === 'edit') {
      const container = document.getElementById('aiContent');
      const all = Array.from(container.children);
      const idx = all.indexOf(target);
      if (idx === -1) { this._contextTarget = null; return; }
      const input = document.getElementById('aiInput');
      input.value = msgText;
      input.focus();
      all.slice(idx).forEach((el) => el.remove());
    }

    this._contextTarget = null;
  },

  // ============================================================
  // BUBBLE RENDERER
  // ============================================================
  _renderBubble(text, side, extraClass) {
    const container = document.getElementById('aiContent');
    const isUser = side === 'right';
    const align = isUser ? 'items-end' : 'items-start';
    const bg = isUser
      ? 'bg-indigo-600 dark:bg-[#4f44e2] text-white border border-white/20 shadow-lg shadow-indigo-500/30 dark:shadow-[#4f44e2]/30'
      : 'bg-indigo-50 dark:bg-[#1c2b3c] text-slate-700 dark:text-white border border-indigo-100 dark:border-[#918fa1]/20';
    const radius = isUser ? 'rounded-2xl rounded-tr-none' : 'rounded-2xl rounded-tl-none';
    const time = new Date();
    const timeStr = time.getHours() + ':' + String(time.getMinutes()).padStart(2, '0');
    const header = isUser ? '' : `<div class="flex items-center gap-2 mb-1"><div class="w-6 h-6 rounded-full bg-indigo-500 dark:bg-[#8781ff] flex items-center justify-center text-white"><span class="material-symbols-outlined text-[14px]">smart_toy</span></div><span class="text-[10px] font-bold text-indigo-500 dark:text-[#c4c0ff] uppercase tracking-widest">Hana AI</span></div>`;
    const html =
      `<div class="flex flex-col ${align} mb-4 max-w-[85%]">${header}<div class="${bg} ${radius} px-4 py-3 text-sm leading-relaxed shadow-sm">${text}</div><span class="text-[10px] text-slate-400 dark:text-[#918fa1] mt-1 ${isUser ? 'text-right mr-1' : 'ml-1'}">${timeStr}</span></div>`;
    container.insertAdjacentHTML('beforeend', html);
    const wrapper = container.lastElementChild;
    if (wrapper) this._attachBubbleMenu(wrapper);
    container.scrollTop = container.scrollHeight;
  },

  _renderTyping(id) {
    const container = document.getElementById('aiContent');
    const html =
      `<div id="${id}" class="flex items-start mb-4"><div class="bg-slate-100 dark:bg-[#1c2b3c] border border-slate-200 dark:border-[#918fa1]/20 rounded-full px-4 py-2 flex gap-1 items-center"><div class="w-1 h-1 bg-indigo-400 dark:bg-[#c4c0ff] rounded-full" style="animation: typing 1.4s infinite 0s"></div><div class="w-1 h-1 bg-indigo-400 dark:bg-[#c4c0ff] rounded-full" style="animation: typing 1.4s infinite 0.2s"></div><div class="w-1 h-1 bg-indigo-400 dark:bg-[#c4c0ff] rounded-full" style="animation: typing 1.4s infinite 0.4s"></div></div></div>`;
    container.insertAdjacentHTML('beforeend', html);
    container.scrollTop = container.scrollHeight;
  },

  // ============================================================
  // USER CHAT SEND
  // ============================================================
  async send() {
    const input = document.getElementById('aiInput');
    const q = input.value.trim();
    if (!q) return;

    this._renderBubble(q, 'right');
    const typingId = 'ai-typing-' + Date.now();
    this._renderTyping(typingId);
    input.value = '';

    try {
      const data = await app.groqFetch([
        { role: 'system', content: 'Kamu AI Tutor Korea untuk pelajar EPS-TOPIK Indonesia. Jawab dalam Bahasa Indonesia santai dan jelas, maksimal 4 kalimat. Fokus pada bahasa Korea, kosakata, tata bahasa, dan tips ujian EPS-TOPIK.' },
        { role: 'user', content: q }
      ]);
      document.getElementById(typingId)?.remove();

      const reply = data?.choices?.[0]?.message?.content;
      if (reply) {
        const formatted = reply.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-indigo-600 dark:text-indigo-400">$1</strong>').replace(/\n/g, '<br>');
        this._renderBubble(formatted, 'left');
      } else {
        this._renderBubble('Respon kosong diterima dari server AI.', 'left');
      }
    } catch (e) {
      document.getElementById(typingId)?.remove();
      this._renderBubble('⚠️ ' + e.message, 'left');
    }
  },

  // ============================================================
  // BEDAH SOAL — INLINE ACCORDION ON RESULT SCREEN
  // ============================================================
  tanyaSoalSalah(soalBase64, kunciBase64, userBase64, el) {
    const soalAsli = decodeURIComponent(atob(soalBase64));
    const kunciAsli = decodeURIComponent(atob(kunciBase64));
    const userAsli = decodeURIComponent(atob(userBase64));

    // Gunakan referensi elemen langsung dari parameter ke-4 (dikirim dari app.js)
    const questionCard = (el && typeof el === 'object' && el.nodeType === 1) ? el : null;
    const review = document.getElementById('review-container');

    // Inject loading spinner di bawah kartu soal
    const spinnerId = 'ai-inline-spinner-' + Date.now();
    const loader =
      `<div id="${spinnerId}" class="mx-2 my-2 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center gap-3 text-sm text-indigo-600 dark:text-indigo-400 animate-pulse">
        <div class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        Menganalisis soal oleh AI Tutor...
      </div>`;

    if (questionCard) {
      questionCard.insertAdjacentHTML('afterend', loader);
    } else if (review) {
      review.insertAdjacentHTML('beforeend', loader);
    }

    // Fetch dari Groq
    const promptSistem =
      'Saya sedang belajar persiapan ujian EPS-TOPIK dan salah menjawab soal. \n' +
      'TOLONG BEDAH DATA BERIKUT:\n' +
      '- KALIMAT SOAL: "' + soalAsli + '"\n' +
      '- JAWABAN SAYA (SALAH): "' + userAsli + '"\n' +
      '- KUNCI JAWABAN (BENAR): "' + kunciAsli + '"\n' +
      'Berikan jawaban dengan format susunan STRIK (gunakan tebal Markdown **) seperti ini:\n' +
      '📝 **Terjemahan Soal**:\n' +
      '(Berikan terjemahan seluruh kalimat soal secara utuh, natural, dan mudah dipahami)\n' +
      '🔢 **Pilihan Opsi & Arti**:\n' +
      '(Jika kamu mengenali soal EPS-TOPIK standar ini dari databasemu, sebutkan pilihan opsi A, B, C, D lengkap beserta artinya. Jika tidak, terjemahkan arti dari kata "' + userAsli + '" dan "' + kunciAsli + '" saja)\n' +
      '🔍 **Analisis Jawaban**:\n' +
      '- ❌ Jawaban Anda ("' + userAsli + '") salah karena: ...\n' +
      '- ✅ Kunci jawaban ("' + kunciAsli + '") benar karena: ...\n' +
      '💡 **Tips EPS-TOPIK**:\n' +
      '(Berikan 1-2 kalimat strategi taktis atau rumus cepat jika menghadapi tipe soal serupa di ujian asli)';

    this._fetchInlineExplanation(promptSistem, soalAsli, kunciAsli, userAsli, spinnerId, questionCard);
  },

  async _fetchInlineExplanation(prompt, soalAsli, kunciAsli, userAsli, spinnerId, anchorEl) {
    try {
      const data = await app.groqFetch([
        { role: 'system', content: 'Kamu adalah profesor bahasa Korea sekaligus penguji kelulusan EPS-TOPIK yang sangat andal. Patuhi instruksi format pembedahan soal yang diminta user dengan sangat disiplin, rapi, gunakan Bahasa Indonesia yang memotivasi, dan gunakan baris baru agar nyaman dibaca di perangkat mobile.' },
        { role: 'user', content: prompt }
      ], 30000, 'llama-3.3-70b-versatile');
      document.getElementById(spinnerId)?.remove();

      let explanationHtml = '';
      const reply = data?.choices?.[0]?.message?.content;
      if (reply) {
        explanationHtml = reply
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-indigo-600 dark:text-indigo-400 block mt-2 first:mt-0">$1</strong>')
          .replace(/\n/g, '<br>');
      } else {
        explanationHtml = '<div class="text-amber-600 text-sm">Respon kosong diterima dari server AI.</div>';
      }

      // Render accordion di bawah kartu soal
      const accordionId = 'ai-accordion-' + Date.now();
      const accordion =
        `<div id="${accordionId}" class="mx-2 my-2 rounded-xl border border-indigo-200 dark:border-indigo-800/40 overflow-hidden shadow-sm">
          <div onclick="document.getElementById('${accordionId}-body').classList.toggle('hidden')" class="flex items-center justify-between px-4 py-3 bg-indigo-50 dark:bg-indigo-950/30 cursor-pointer select-none active:scale-[0.99] transition-transform">
            <span class="text-sm font-semibold text-indigo-700 dark:text-indigo-300">🤖 AI Bedah Soal</span>
            <span class="text-indigo-400 text-lg transition-transform" id="${accordionId}-chevron">▼</span>
          </div>
          <div id="${accordionId}-body" class="px-4 py-3 bg-white dark:bg-[#1C1B1A] text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-t border-indigo-100 dark:border-indigo-900/30">
            ${explanationHtml}
          </div>
        </div>`;

      if (anchorEl) {
        anchorEl.insertAdjacentHTML('afterend', accordion);
      } else {
        const review = document.getElementById('review-container');
        if (review) review.insertAdjacentHTML('beforeend', accordion);
      }

      // Simpan ke riwayat kuis
      this._history.push({
        q: soalAsli,
        correct: kunciAsli,
        user: userAsli,
        explanation: explanationHtml.replace(/<[^>]*>/g, '').substring(0, 200),
        timestamp: Date.now()
      });
      if (this._history.length > 50) this._history = this._history.slice(-50);
      localStorage.setItem('hana_quiz_history', JSON.stringify(this._history));

    } catch (e) {
      document.getElementById(spinnerId)?.remove();
      const errHtml =
        `<div class="mx-2 my-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-xl text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40">⚠️ Gagal terhubung ke jaringan Groq AI.</div>`;
      if (anchorEl) {
        anchorEl.insertAdjacentHTML('afterend', errHtml);
      } else {
        const review = document.getElementById('review-container');
        if (review) review.insertAdjacentHTML('beforeend', errHtml);
      }
    }
  },

  // ============================================================
  // HISTORY DRAWER RENDERER
  // ============================================================
  renderHistoryDrawer() {
    const list = document.getElementById('ai-history-list-stream');
    if (!list) return;
    if (this._history.length === 0) {
      list.innerHTML = '<div class="text-[#918fa1] text-center py-8 text-xs flex flex-col items-center gap-2"><span class="material-symbols-outlined text-[32px] text-[#918fa1]/50">history</span>Belum ada riwayat bedah soal.</div>';
      return;
    }
    list.innerHTML = this._history.slice().reverse().map((h, i) => {
      const realIdx = this._history.length - 1 - i;
      return `<div class="p-3 rounded-xl bg-[#1c2b3c] border border-[#918fa1]/10 hover:border-[#4f44e2]/40 hover:shadow-lg hover:shadow-[#4f44e2]/10 transition-all cursor-pointer group" data-idx="${realIdx}" onclick="window.aiChat._openHistoryFromDrawer(this.dataset.idx)">
        <p class="font-bold text-white text-xs leading-relaxed line-clamp-2">${this._escapeHtml(h.q.substring(0, 80))}${h.q.length > 80 ? '...' : ''}</p>
        <p class="text-[10px] text-[#918fa1] mt-1">${new Date(h.timestamp).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
      </div>`;
    }).join('');
  },

  _openHistoryFromDrawer(idx) {
    const h = this._history[parseInt(idx)];
    if (!h) return;
    document.getElementById('view-ai-chat').classList.remove('hidden');
    document.getElementById('view-ai-chat').classList.add('flex');
    document.getElementById('ai-history-drawer').classList.add('translate-x-full');
    const prompt = 'Saya ingin mereview soal berikut:\n\nSoal: ' + h.q + '\nJawaban saya: ' + h.user + '\nKunci jawaban: ' + h.correct + '\n\n' + h.explanation;
    this.sendOtomatis(prompt, 'Bedah Ulang: "' + h.q.substring(0, 40) + '..."');
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // ============================================================
  // SEND OTOMATIS (UNTUK PROMPT TERPROGRAM)
  // ============================================================
  async sendOtomatis(promptLengkap, teksTampilanUser) {
    this._renderBubble('🤖 Bedah Soal: "' + teksTampilanUser.substring(0, 40) + '..."', 'right');
    const typingId = 'ai-typing-' + Date.now();
    this._renderTyping(typingId);

    try {
      const data = await app.groqFetch([
        { role: 'system', content: 'Kamu adalah profesor bahasa Korea sekaligus penguji kelulusan EPS-TOPIK yang sangat andal. Patuhi instruksi format pembedahan soal yang diminta user dengan sangat disiplin, rapi, gunakan Bahasa Indonesia yang memotivasi, dan gunakan baris baru agar nyaman dibaca di perangkat mobile.' },
        { role: 'user', content: promptLengkap }
      ], 30000, 'llama-3.3-70b-versatile');
      document.getElementById(typingId)?.remove();

      const reply = data?.choices?.[0]?.message?.content;
      if (reply) {
        const formatted = reply
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-indigo-600 dark:text-indigo-400 block mt-2 first:mt-0">$1</strong>')
          .replace(/\n/g, '<br>');
        this._renderBubble(formatted, 'left');
      } else {
        this._renderBubble('Respon kosong diterima dari server AI.', 'left');
      }
    } catch (e) {
      document.getElementById(typingId)?.remove();
      this._renderBubble('⚠️ ' + e.message, 'left');
    }
  }
};

window.aiChat = aiChat;
