/* 四页共用：目录/滚动高亮/进度条、通关打卡、代码复制、终极测验引擎 */
window.KB = window.KB || {};
KB.initPage = function ({ key, names }) {
  const chapters = [...document.querySelectorAll('section.chapter')], toc = document.getElementById('toc');
  chapters.forEach((sec, i) => {
    const a = document.createElement('a');
    a.href = '#' + sec.id;
    a.innerHTML = `<span class="no">${String(i + 1).padStart(2, '0')}</span>${names[i]}`;
    toc.appendChild(a);
  });
  const links = [...toc.querySelectorAll('a')], fill = document.getElementById('progFill'), label = document.getElementById('progLabel');
  const spy = () => {
    const y = scrollY + 140; let cur = 0;
    chapters.forEach((s, i) => { if (s.offsetTop <= y) cur = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === cur));
    fill.style.width = ((cur + 1) / chapters.length * 100) + '%';
    label.textContent = `${cur + 1} / ${chapters.length} 章`;
  };
  addEventListener('scroll', spy, { passive: true }); addEventListener('resize', spy); spy();

  const CK = 'rag-vdb-' + key + '-ckpt'; let ck = {};
  try { ck = JSON.parse(localStorage.getItem(CK) || '{}'); } catch (e) {}
  KB.markDone = k => { ck[k] = true; try { localStorage.setItem(CK, JSON.stringify(ck)); } catch (e) {} const el = document.querySelector(`.ckpt-item[data-key="${k}"]`); if (el) el.classList.add('done'); };
  document.querySelectorAll('.ckpt-item').forEach(el => {
    if (ck[el.dataset.key]) el.classList.add('done');
    el.onclick = () => { el.classList.toggle('done'); ck[el.dataset.key] = el.classList.contains('done'); try { localStorage.setItem(CK, JSON.stringify(ck)); } catch (e) {} };
  });

  document.querySelectorAll('.codewrap').forEach(w => {
    const b = document.createElement('button'); b.className = 'copybtn'; b.textContent = '复制';
    b.onclick = () => { navigator.clipboard.writeText(w.querySelector('pre').innerText).then(() => { b.textContent = '已复制'; b.classList.add('done'); setTimeout(() => { b.textContent = '复制'; b.classList.remove('done'); }, 1400); }); };
    w.appendChild(b);
  });
};

/* questions: [{q, opts:[...], a:index, exp}]；通过 ≥ pass 题时自动勾选 doneKey */
KB.initQuiz = function ({ questions, pass, doneKey, title }) {
  const $ = id => document.getElementById(id);
  const box = $('quizMount');
  box.innerHTML = `<div class="quiz-head"><span>FINAL EXAM · ${title}</span><strong id="quizScore">0 / ${questions.length}</strong></div>
    <div class="quiz-body"><div class="q-no" id="qNo"></div><div class="q-text" id="qText"></div><div id="qOpts"></div><div class="q-exp" id="qExp"></div></div>
    <div class="quiz-foot"><button class="sim-btn" id="qSubmit" disabled>确认答案</button><button class="sim-btn ghost" id="qNext" style="display:none">下一题 →</button><button class="sim-btn ghost" id="qRestart" style="display:none">重新作答</button><span class="q-verdict" id="qVerdict"></span></div>`;
  box.classList.add('quizbox');
  let qi = 0, qs = 0, picked = -1, locked = false;
  const load = () => {
    picked = -1; locked = false; const Q = questions[qi];
    $('qNo').textContent = `QUESTION ${qi + 1} / ${questions.length}`; $('qText').textContent = Q.q;
    $('qOpts').innerHTML = ''; $('qExp').classList.remove('show'); $('qVerdict').textContent = '';
    Q.opts.forEach((t, i) => { const d = document.createElement('div'); d.className = 'q-opt'; d.textContent = t; d.onclick = () => { if (locked) return; picked = i; [...$('qOpts').children].forEach((c, j) => c.classList.toggle('picked', j === i)); $('qSubmit').disabled = false; }; $('qOpts').appendChild(d); });
    $('qSubmit').style.display = ''; $('qSubmit').disabled = true; $('qNext').style.display = 'none'; $('qRestart').style.display = 'none';
  };
  $('qSubmit').onclick = () => {
    if (picked < 0) return; locked = true; const Q = questions[qi], ok = picked === Q.a; if (ok) qs++;
    [...$('qOpts').children].forEach((c, i) => { c.classList.add('locked'); if (i === Q.a) c.classList.add('right'); else if (i === picked) c.classList.add('wrong'); });
    $('qExp').innerHTML = Q.exp; $('qExp').classList.add('show');
    $('qVerdict').textContent = ok ? '✓ 答对了' : '✗ 再想想'; $('qVerdict').className = 'q-verdict ' + (ok ? 'ok' : 'bad');
    $('quizScore').textContent = `${qs} / ${questions.length}`; $('qSubmit').style.display = 'none';
    if (qi < questions.length - 1) $('qNext').style.display = '';
    else { $('qRestart').style.display = ''; $('qVerdict').textContent += qs >= pass ? ` · 通关（${qs}/${questions.length}）` : ` · 还差一点（需 ≥ ${pass}）`; if (qs >= pass) KB.markDone(doneKey); }
  };
  $('qNext').onclick = () => { qi++; load(); };
  $('qRestart').onclick = () => { qi = 0; qs = 0; $('quizScore').textContent = `0 / ${questions.length}`; load(); };
  load();
};
