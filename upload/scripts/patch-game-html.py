#!/usr/bin/env python3
"""
Patch /public/game.html to add postMessage hooks for Next.js integration.

Inbound (parent → iframe):
  - { type: 'config', questions?: [...], mode?: 'slow'|'heart', name?: string, autoStart?: boolean }

Outbound (iframe → parent):
  - { type: 'ready' }
  - { type: 'answer', correct: bool, question: string, picked: string, answer: string }
  - { type: 'score', score, correct, wrong, bestStreak, coins, hearts, dist }
  - { type: 'gameover', score, correct, wrong, bestStreak, coins, mistakes: [...] }
  - { type: 'started' }
"""
import re
from pathlib import Path

src = Path('/home/z/my-project/public/game.html').read_text()

# 1. Add bootstrap hook right after 'use strict';
bootstrap = """
/* ===== Next.js integration hooks (auto-injected) ===== */
(function(){
  function post(msg){ try{ window.parent.postMessage(Object.assign({source:'turbo-rush'}, msg), '*'); }catch(e){} }
  window.__trPost = post;
  window.__trConfig = { questions: null, mode: null, name: null, autoStart: false };

  window.addEventListener('message', function(ev){
    const d = ev.data || {};
    if (d.target !== 'turbo-rush') return;
    if (d.type === 'config') {
      if (d.questions && Array.isArray(d.questions) && d.questions.length) {
        window.__trConfig.questions = d.questions;
        // defer applying — script may not have defined customBank yet
        function applyQ(retries){
          if (typeof customBank !== 'undefined') {
            customBank = d.questions;
            usedCustom.length = 0;
            try { localStorage.setItem('tr_questions', JSON.stringify(d.questions)); } catch(e){}
            if (typeof updateSetChip === 'function') updateSetChip();
          } else if (retries > 0) {
            setTimeout(function(){ applyQ(retries-1); }, 30);
          }
        }
        applyQ(50);
      }
      if (d.mode === 'heart' || d.mode === 'slow') {
        function applyMode(retries){
          if (typeof hardMode !== 'undefined') {
            hardMode = (d.mode === 'heart');
            try { localStorage.setItem('tr_mode', d.mode); } catch(e){}
            if (typeof syncMode === 'function') syncMode();
          } else if (retries > 0) {
            setTimeout(function(){ applyMode(retries-1); }, 30);
          }
        }
        applyMode(50);
      }
      if (typeof d.name === 'string' && d.name.length) {
        window.__trConfig.name = d.name;
        function applyName(retries){
          const inp = document.getElementById('nameInput');
          if (inp) {
            inp.value = d.name.slice(0,14);
            try { localStorage.setItem('tr_name', inp.value); } catch(e){}
          } else if (retries > 0) {
            setTimeout(function(){ applyName(retries-1); }, 30);
          }
        }
        applyName(50);
      }
      if (d.autoStart) {
        window.__trConfig.autoStart = true;
        function tryAutoStart(retries){
          if (typeof tryStart === 'function' && document.getElementById('menu')) {
            // only auto-start if currently in menu
            if (typeof state !== 'undefined' && state === 'MENU') {
              tryStart();
              post({ type: 'started' });
            }
          } else if (retries > 0) {
            setTimeout(function(){ tryAutoStart(retries-1); }, 60);
          }
        }
        // give a beat for name/mode to apply first
        setTimeout(function(){ tryAutoStart(80); }, 400);
      }
    }
  });

  // Signal readiness as soon as the script tag finishes
  setTimeout(function(){ post({ type: 'ready' }); }, 0);
})();
/* ===== end integration hooks ===== */
"""

src = src.replace("'use strict';", "'use strict';\n" + bootstrap, 1)

# 2. Wrap answer() to emit 'answer' event
# Original signature: function answer(i){
answer_hook = """function answer(i){
  window.__trAnswerHook = window.__trAnswerHook || function(i){
    const _orig = window.__trOrigAnswer;
    const wasAnswered = quiz && quiz.answered;
    if (_orig) _orig(i);
    try {
      if (!wasAnswered && quiz && quiz.answered) {
        const q = quiz.q;
        const pickedIdx = (i >= 0 && i < q.a.length) ? i : -1;
        const picked = pickedIdx >= 0 ? q.a[pickedIdx] : '(no answer)';
        const correctIdx = q.c;
        const correctAns = q.a[correctIdx];
        const isCorrect = pickedIdx === correctIdx;
        window.__trPost({
          type: 'answer',
          correct: isCorrect,
          question: q.q,
          picked: picked,
          answer: correctAns
        });
        // also emit score snapshot
        window.__trPost({
          type: 'score',
          score: Math.floor(score),
          correct: qStats.right,
          wrong: qStats.asked - qStats.right,
          bestStreak: qStats.bestStreak,
          coins: coinsGot,
          hearts: hearts,
          dist: Math.floor(dist)
        });
      }
    } catch(e) {}
  };
  return window.__trAnswerHook(i);
}
function __trOrigAnswer(i){"""
# That approach is too complex. Simpler: rename original, add wrapper.
# Revert — use a different approach below.
# (the above won't be applied because we already inserted it; undo)

# Actually we didn't insert it because replace fails silently. Let me use a cleaner approach.
# Strategy: rename `function answer(i){` to `function __orig_answer(i){`
# then add a new wrapper `function answer(i){ ... call __orig_answer ... emit ... }`

src = src.replace("function answer(i){", "function __orig_answer(i){", 1)
src = src.replace("function endGame(){", "function __orig_endGame(){", 1)

# Insert wrappers right after the renamed functions' closing braces.
# Find end of __orig_answer (its closing }) and end of __orig_endGame.
# Simpler: insert wrappers right BEFORE closeQuiz() which appears after answer() definition.

wrapper_block = """
function answer(i){
  const wasAnswered = quiz && quiz.answered;
  __orig_answer(i);
  try {
    if (!wasAnswered && quiz && quiz.answered) {
      const q = quiz.q;
      const pickedIdx = (i >= 0 && i < q.a.length) ? i : -1;
      const picked = pickedIdx >= 0 ? q.a[pickedIdx] : '(no answer)';
      const correctAns = q.a[q.c];
      const isCorrect = pickedIdx === q.c;
      window.__trPost({
        type: 'answer',
        correct: isCorrect,
        question: q.q,
        picked: picked,
        answer: correctAns
      });
      window.__trPost({
        type: 'score',
        score: Math.floor(score),
        correct: qStats.right,
        wrong: qStats.asked - qStats.right,
        bestStreak: qStats.bestStreak,
        coins: coinsGot,
        hearts: hearts,
        dist: Math.floor(dist)
      });
    }
  } catch(e) {}
}
function endGame(){
  __orig_endGame();
  try {
    window.__trPost({
      type: 'gameover',
      score: Math.floor(score),
      correct: qStats.right,
      wrong: qStats.asked - qStats.right,
      bestStreak: qStats.bestStreak,
      coins: coinsGot,
      dist: Math.floor(dist),
      mistakes: (qStats.mistakes||[]).map(function(m){ return { q: m.q, picked: m.pick, answer: m.ans }; })
    });
  } catch(e) {}
}
"""

# Insert the wrapper block before the line: function closeQuiz(){
src = src.replace("function closeQuiz(){", wrapper_block + "\nfunction closeQuiz(){", 1)

Path('/home/z/my-project/public/game.html').write_text(src)
print("Patched game.html successfully")
print("  - bootstrap postMessage hooks added at top")
print("  - answer() wrapped to emit 'answer' + 'score' events")
print("  - endGame() wrapped to emit 'gameover' event")
