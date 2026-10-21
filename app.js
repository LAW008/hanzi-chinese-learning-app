const WORDS = [
  { hanzi: "你好", pinyin: "nǐ hǎo", english: "hello", category: "Greetings", example: "你好！很高兴认识你。", exampleEn: "Hello! Nice to meet you." },
  { hanzi: "谢谢", pinyin: "xiè xie", english: "thank you", category: "Greetings", example: "谢谢你的帮助。", exampleEn: "Thank you for your help." },
  { hanzi: "再见", pinyin: "zài jiàn", english: "goodbye", category: "Greetings", example: "明天见，再见！", exampleEn: "See you tomorrow, goodbye!" },
  { hanzi: "请", pinyin: "qǐng", english: "please", category: "Greetings", example: "请给我一杯水。", exampleEn: "Please give me a glass of water." },
  { hanzi: "水", pinyin: "shuǐ", english: "water", category: "Food & drink", example: "我想喝水。", exampleEn: "I would like some water." },
  { hanzi: "茶", pinyin: "chá", english: "tea", category: "Food & drink", example: "你喜欢喝茶吗？", exampleEn: "Do you like drinking tea?" },
  { hanzi: "咖啡", pinyin: "kā fēi", english: "coffee", category: "Food & drink", example: "一杯咖啡，谢谢。", exampleEn: "A cup of coffee, please." },
  { hanzi: "好吃", pinyin: "hǎo chī", english: "delicious", category: "Food & drink", example: "这个苹果很好吃。", exampleEn: "This apple is delicious." },
  { hanzi: "朋友", pinyin: "péng you", english: "friend", category: "People", example: "她是我的朋友。", exampleEn: "She is my friend." },
  { hanzi: "家", pinyin: "jiā", english: "home; family", category: "People", example: "我今天在家。", exampleEn: "I am at home today." },
  { hanzi: "喜欢", pinyin: "xǐ huan", english: "to like", category: "Everyday", example: "我喜欢学中文。", exampleEn: "I like learning Chinese." },
  { hanzi: "学习", pinyin: "xué xí", english: "to study; learn", category: "Everyday", example: "我们一起学习吧。", exampleEn: "Let's study together." },
];

const STORAGE_KEY = "hanzi-learning-progress";
const categories = ["All words", ...new Set(WORDS.map((word) => word.category))];
const state = {
  view: "home",
  category: "All words",
  search: "",
  flashIndex: 0,
  flashRevealed: false,
  quizQuestions: [],
  quizIndex: 0,
  quizSelected: null,
  quizScore: 0,
  quizAnswered: false,
  quizComplete: false,
  toastTimer: null,
};

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      learned: Array.isArray(saved.learned) ? saved.learned.filter((word) => WORDS.some((item) => item.hanzi === word)) : [],
      bestScore: Number.isInteger(saved.bestScore) && saved.bestScore >= 0 && saved.bestScore <= 5 ? saved.bestScore : null,
      activeDates: Array.isArray(saved.activeDates) ? saved.activeDates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).slice(-60) : [],
    };
  } catch (error) {
    console.warn("Could not load saved learning progress.", error);
    return { learned: [], bestScore: null, activeDates: [] };
  }
}

let progress = loadProgress();

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.warn("Could not save learning progress.", error);
    showToast("Progress could not be saved in this browser.");
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2300);
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".view").forEach((panel) => panel.classList.toggle("active", panel.id === `view-${view}`));
  document.querySelectorAll(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  const titles = { home: "Overview", words: "Word library", flashcards: "Flashcards", quiz: "Quick quiz" };
  document.getElementById("current-section").textContent = titles[view] || "Overview";
  if (view === "words") renderWords();
  if (view === "flashcards") renderFlashcard();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateProgress() {
  const learnedCount = progress.learned.length;
  const percent = Math.round((learnedCount / WORDS.length) * 100);
  document.getElementById("learned-count").textContent = learnedCount;
  document.getElementById("learned-percent").textContent = `${percent}%`;
  document.getElementById("learned-bar").style.width = `${percent}%`;
  document.getElementById("best-score").textContent = progress.bestScore === null ? "—" : `${progress.bestScore}/5`;
  document.getElementById("best-score-label").textContent = progress.bestScore === null ? "Take your first quiz" : "out of 5 questions";
  document.getElementById("flash-known-count").textContent = `${learnedCount} learned`;
  renderStreak();
  saveProgress();
  if (state.view === "words") renderWords();
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function recordPractice() {
  const today = localDateKey(new Date());
  progress.activeDates = [...new Set([...progress.activeDates, today])].sort().slice(-60);
  updateProgress();
}

function renderStreak() {
  const today = new Date();
  const todayKey = localDateKey(today);
  const activeDates = new Set(progress.activeDates);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  let cursor = activeDates.has(todayKey) ? today : activeDates.has(localDateKey(yesterday)) ? yesterday : null;
  let streak = 0;
  while (cursor && activeDates.has(localDateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }
  document.getElementById("streak-count").innerHTML = `${streak} <small>${streak === 1 ? "day" : "days"}</small>`;
  document.getElementById("today-date").textContent = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase();

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  document.getElementById("streak-days").innerHTML = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const dateKey = localDateKey(date);
    const classes = ["day"];
    if (activeDates.has(dateKey)) classes.push("done");
    if (dateKey === todayKey) classes.push("today");
    return `<span class="${classes.join(" ")}" aria-label="${date.toLocaleDateString("en-US", { weekday: "long" })}${activeDates.has(dateKey) ? ", practiced" : ""}">${date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}</span>`;
  }).join("");
}

function speak(hanzi) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    showToast("Audio pronunciation is not supported by this browser.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(hanzi);
  utterance.lang = "zh-CN";
  utterance.rate = 0.82;
  utterance.onerror = () => showToast("No Chinese voice is available on this device.");
  window.speechSynthesis.speak(utterance);
}

function renderFilters() {
  const container = document.getElementById("category-filters");
  container.innerHTML = categories.map((category) => `<button class="filter-button${state.category === category ? " active" : ""}" data-category="${category}">${category}</button>`).join("");
  container.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      renderFilters();
      renderWords();
    });
  });
}

function renderWords() {
  const grid = document.getElementById("word-grid");
  if (!grid) return;
  const query = state.search.trim().toLocaleLowerCase();
  const filtered = WORDS.filter((word) => {
    const matchesCategory = state.category === "All words" || word.category === state.category;
    const matchesQuery = !query || [word.hanzi, word.pinyin, word.english, word.category].some((value) => value.toLocaleLowerCase().includes(query));
    return matchesCategory && matchesQuery;
  });
  document.getElementById("empty-words").classList.toggle("hidden", filtered.length > 0);
  grid.innerHTML = filtered.map((word) => {
    const learned = progress.learned.includes(word.hanzi);
    return `<article class="word-card">
      <div class="word-card-top"><span class="word-character" lang="zh">${word.hanzi}</span><button class="word-speak" data-speak="${word.hanzi}" aria-label="Hear ${word.english}">♫</button></div>
      <div class="word-pinyin">${word.pinyin}</div>
      <div class="word-english">${word.english}</div>
      <p class="word-example"><span lang="zh">${word.example}</span> · ${word.exampleEn}</p>
      <div class="word-card-bottom"><span class="word-category">${word.category}</span>${learned ? '<span class="learned-label">✓ Learned</span>' : ""}</div>
    </article>`;
  }).join("");
  grid.querySelectorAll("[data-speak]").forEach((button) => button.addEventListener("click", () => speak(button.dataset.speak)));
}

function renderFlashcard() {
  const word = WORDS[state.flashIndex];
  document.getElementById("flash-position").textContent = `CARD ${state.flashIndex + 1} OF ${WORDS.length}`;
  document.getElementById("flash-hanzi").textContent = word.hanzi;
  document.getElementById("flash-pinyin").textContent = word.pinyin;
  document.getElementById("flash-translation").textContent = word.english;
  document.getElementById("flash-example").textContent = `${word.example}  ·  ${word.exampleEn}`;
  document.getElementById("flashcard").setAttribute("aria-label", `Flashcard: ${state.flashRevealed ? `${word.pinyin}, ${word.english}` : "tap to reveal answer"}`);
  ["flash-pinyin", "flash-translation", "flash-example"].forEach((id) => document.getElementById(id).classList.toggle("hidden", !state.flashRevealed));
  document.getElementById("flash-hint").textContent = state.flashRevealed ? "THE MEANING" : "TAP TO REVEAL";
  document.getElementById("flash-tap").classList.toggle("hidden", state.flashRevealed);
  const learned = progress.learned.includes(word.hanzi);
  document.getElementById("flash-learned").innerHTML = learned ? "Learned <span>✓</span>" : "I know this <span>✓</span>";
  document.getElementById("flash-learned").classList.toggle("is-learned", learned);
}

function startQuiz() {
  state.quizQuestions = [...WORDS].sort(() => Math.random() - 0.5).slice(0, 5);
  state.quizIndex = 0;
  state.quizSelected = null;
  state.quizScore = 0;
  state.quizAnswered = false;
  state.quizComplete = false;
  document.getElementById("quiz-panel").classList.remove("hidden");
  document.getElementById("quiz-result").classList.add("hidden");
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const word = state.quizQuestions[state.quizIndex];
  if (!word) return;
  const options = [word, ...WORDS.filter((item) => item.hanzi !== word.hanzi).sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
  document.getElementById("quiz-counter").textContent = `QUESTION ${state.quizIndex + 1} OF 5`;
  document.getElementById("quiz-progress-fill").style.width = `${((state.quizIndex + 1) / 5) * 100}%`;
  document.getElementById("quiz-direction").textContent = "WHAT DOES THIS MEAN?";
  document.getElementById("quiz-word").textContent = word.hanzi;
  document.getElementById("quiz-word-pinyin").textContent = word.pinyin;
  document.getElementById("quiz-feedback").textContent = "Choose the correct meaning";
  document.getElementById("quiz-next").textContent = "Check answer →";
  document.getElementById("quiz-next").disabled = true;
  const answers = document.getElementById("answer-list");
  answers.innerHTML = options.map((option, index) => `<button class="answer-option" data-answer="${option.hanzi}"><span class="answer-letter">${String.fromCharCode(65 + index)}</span><span>${option.english}</span></button>`).join("");
  answers.querySelectorAll("[data-answer]").forEach((button) => button.addEventListener("click", () => {
    if (state.quizAnswered) return;
    state.quizSelected = button.dataset.answer;
    answers.querySelectorAll(".answer-option").forEach((option) => option.classList.toggle("selected", option.dataset.answer === state.quizSelected));
    document.getElementById("quiz-next").disabled = false;
  }));
}

function checkQuizAnswer() {
  if (state.quizComplete) {
    startQuiz();
    return;
  }
  if (state.quizSelected === null) return;
  const correct = state.quizQuestions[state.quizIndex].hanzi;
  state.quizAnswered = true;
  if (state.quizSelected === correct) state.quizScore += 1;
  document.querySelectorAll(".answer-option").forEach((button) => {
    button.disabled = true;
    if (button.dataset.answer === correct) button.classList.add("correct");
    else if (button.dataset.answer === state.quizSelected) button.classList.add("incorrect");
  });
  document.getElementById("quiz-feedback").textContent = state.quizSelected === correct ? "That's right — nicely done!" : "Not quite — the correct answer is highlighted.";
  const nextButton = document.getElementById("quiz-next");
  nextButton.disabled = false;
  nextButton.textContent = state.quizIndex === 4 ? "See my score →" : "Next question →";
}

function advanceQuiz() {
  if (!state.quizAnswered) {
    checkQuizAnswer();
    return;
  }
  if (state.quizIndex < 4) {
    state.quizIndex += 1;
    state.quizSelected = null;
    state.quizAnswered = false;
    renderQuizQuestion();
    return;
  }
  state.quizComplete = true;
  progress.bestScore = progress.bestScore === null ? state.quizScore : Math.max(progress.bestScore, state.quizScore);
  recordPractice();
  document.getElementById("quiz-panel").classList.add("hidden");
  const result = document.getElementById("quiz-result");
  result.classList.remove("hidden");
  const title = state.quizScore === 5 ? "Amazing work!" : state.quizScore >= 3 ? "You're making progress!" : "Every try helps you learn!";
  result.innerHTML = `<div class="result-star">✦</div><h2>${title}</h2><p>You got ${state.quizScore} out of 5 questions right.</p><div class="result-score">${state.quizScore}<span style="font-size:18px;color:#aaa9b7"> / 5</span></div><button class="button button-dark" id="quiz-restart">Try again <span>↻</span></button>`;
  document.getElementById("quiz-restart").addEventListener("click", startQuiz);
}

document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
document.getElementById("word-search").addEventListener("input", (event) => {
  state.search = event.target.value;
  renderWords();
});
document.getElementById("flashcard").addEventListener("click", () => {
  state.flashRevealed = !state.flashRevealed;
  if (state.flashRevealed) recordPractice();
  renderFlashcard();
});
document.getElementById("flash-prev").addEventListener("click", () => {
  state.flashIndex = (state.flashIndex - 1 + WORDS.length) % WORDS.length;
  state.flashRevealed = false;
  renderFlashcard();
});
document.getElementById("flash-next").addEventListener("click", () => {
  state.flashIndex = (state.flashIndex + 1) % WORDS.length;
  state.flashRevealed = false;
  renderFlashcard();
});
document.getElementById("flash-speak").addEventListener("click", () => speak(WORDS[state.flashIndex].hanzi));
document.getElementById("flash-learned").addEventListener("click", () => {
  const hanzi = WORDS[state.flashIndex].hanzi;
  progress.learned = progress.learned.includes(hanzi) ? progress.learned.filter((word) => word !== hanzi) : [...progress.learned, hanzi];
  recordPractice();
  renderFlashcard();
});
document.getElementById("quiz-next").addEventListener("click", advanceQuiz);

renderFilters();
startQuiz();
updateProgress();
