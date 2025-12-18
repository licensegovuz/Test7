// ===== АНТИ-НАЗАД =====
history.pushState(null, '', location.href);
window.onpopstate = () => history.pushState(null, '', location.href);

// ===== АНТИ-СВОРАЧИВАНИЕ =====
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    alert('Нельзя сворачивать вкладку во время теста');
  }
});

// ===== USER =====
const user = JSON.parse(localStorage.getItem('tgUser'));
if (!user) location.href = 'index.html';

const timeLimit = parseInt(localStorage.getItem('timer')) || 30;

let tests = [];
let selected = null;
let timer;
let timeLeft;

// ===== SESSION =====
let session = {
  id: `TEST-${Date.now()}-${Math.floor(Math.random()*1000)}`,
  start: Date.now(),
  index: 0,
  score: 0
};

// ===== LOAD TESTS =====
fetch('tests.json')
  .then(r => r.json())
  .then(data => {
    tests = data;
    showQuestion();
  });

// ===== SHOW QUESTION =====
function showQuestion(){
  clearInterval(timer);
  selected = null;

  const q = tests[session.index];
  if (!q) return finish();

  document.getElementById('question').innerHTML = `
    <div class="progress">
      Вопрос ${session.index + 1} из ${tests.length}
    </div>
    ${q.question}
  `;

  const options = document.getElementById('options');
  options.innerHTML = '';

  // 🔀 RANDOM ANSWERS
  const shuffled = q.options
    .map((text, i) => ({ text, i }))
    .sort(() => Math.random() - 0.5);

  shuffled.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.textContent = opt.text;

    btn.onclick = () => {
      selected = opt.i;
      document.querySelectorAll('.option')
        .forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      confirmBtn.disabled = false;
    };

    options.appendChild(btn);
  });

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = 'Ответить';
  confirmBtn.className = 'main';
  confirmBtn.disabled = true;
  confirmBtn.onclick = () => confirm(false);
  confirmBtn.id = 'confirm-btn'; // Добавляем ID для поиска
  options.appendChild(confirmBtn);

  startTimer(q.answer);
}

// ===== TIMER =====
function startTimer(correct){
  timeLeft = timeLimit;
  const timerEl = document.getElementById('timer');
  timerEl.className = 'timer';
  timerEl.textContent = `⏱ ${timeLeft}`;

  timer = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `⏱ ${timeLeft}`;

    if (timeLeft <= 5) timerEl.classList.add('warning');

    if (timeLeft <= 0) {
      clearInterval(timer);
      confirm(true);
    }
  }, 1000);
}

// ===== CONFIRM =====
function confirm(fromTimer){
  clearInterval(timer);

  const q = tests[session.index];
  const buttons = document.querySelectorAll('.option');

  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    const realIndex = q.options.indexOf(btn.textContent);

    if (realIndex === q.answer) btn.classList.add('correct');
    if (realIndex === selected && selected !== q.answer)
      btn.classList.add('wrong');
  });

  // Удаляем кнопку "Ответить"
  const confirmBtn = document.getElementById('confirm-btn');
  if (confirmBtn) confirmBtn.remove();

  if (!fromTimer && selected === q.answer) session.score++;

  const next = document.createElement('button');
  next.textContent =
    session.index + 1 < tests.length ? 'Далее' : 'Завершить';
  next.className = 'main';
  next.onclick = () => {
    session.index++;
    showQuestion();
  };

  document.getElementById('options').appendChild(next);
}

// ===== FINISH =====
function finish(){
  const totalTime = Math.floor((Date.now() - session.start) / 1000);

  document.body.innerHTML = `
    <div class="card">
      <h2>Тест завершён</h2>
      <p>👤 ${user.first_name}</p>
      <p>🆔 ${session.id}</p>
      <p>✅ ${session.score}/${tests.length}</p>
      <p>⏱ ${totalTime} сек</p>
      <button class="main" onclick="location.href='index.html'">
        Пройти ещё раз
      </button>
    </div>
  `;

  sendStats(totalTime);
}

// ===== TELEGRAM =====
function sendStats(time){
  const BOT_TOKEN = '8587306844:AAEdhhm4l9Gcl3gRwmQDL8B4OS0z0art4yw';

  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: user.id,
      text:
`📊 ТЕСТ ЗАВЕРШЁН
🆔 ${session.id}
👤 ${user.first_name} (@${user.username})
✅ ${session.score}/${tests.length}
⏱ ${time} сек`
    })
  });
}