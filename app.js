(() => {
  "use strict";

  const WORDS = (window.HANZI_WORDS || []).map((word) => ({
    ...word,
    source: word.source || "reference",
  }));
  const COURSE_WORDS = WORDS.filter((word) => word.source === "course");
  const STORAGE_KEY = "hanzi-learning-progress";
  const IS_NATIVE_APP = window.Capacitor?.isNativePlatform?.() === true || location.protocol === "capacitor:";
  const UNIT_NAMES = [
    "Hello, new friend!", "Meet my people", "Let's have a bite", "Count on it",
    "Everyday moments", "Let's get moving", "Find your way", "Describe your world",
    "A little conversation", "Your first stories",
  ];
  const LESSONS = [
    ["Say hello", "Polite words", "Meet and greet", "Names and introductions", "A warm goodbye"],
    ["I and you", "Family time", "Meet a friend", "People around us", "A little review"],
    ["A glass of water", "Tea or coffee?", "At the table", "Fruit and flavors", "Order something tasty"],
    ["Count from one to five", "Count to ten", "How many?", "Numbers in real life", "Number review"],
    ["Today and tomorrow", "What time is it?", "Morning to night", "Days and plans", "Time for a review"],
    ["Things we do", "What do you like?", "Study and work", "Come and go", "My daily routine"],
    ["At school", "Out and about", "Where is it?", "Things in a room", "Find your way"],
    ["Big and small", "Hot or cold?", "Feeling good", "A little more, a little less", "Describe it"],
    ["Ask a question", "What and who?", "Say it again", "Yes, no, and also", "Chat together"],
    ["Books and things", "Pets at home", "Weather talk", "Put it all together", "Your first story"],
  ];
  const ACTIVITIES = ["match", "choice", "listen", "pinyin", "order", "translate", "speak"];
  const ACTIVITY_LABELS = {
    match: "Match the pairs", choice: "Choose the meaning", listen: "Listen and choose",
    pinyin: "Type the pinyin", order: "Build the English sentence", translate: "Translate the word",
    speak: "Say it out loud",
  };
  const state = {
    view: "home", category: "All words", search: "", wordPage: 0, flashIndex: 0, dueOnly: true,
    lesson: null, round: 0, selected: null, checked: false, retryNeeded: false,
    matchLeft: null, matchDone: [], orderAnswer: [], toastTimer: null,
  };

  const todayKey = () => dateKey(new Date());
  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function loadProgress() {
    const empty = { learned: [], bestScore: null, activeDates: [], completedLessons: [], xp: 0, hearts: 5, heartDate: todayKey(), correct: 0, answered: 0, recent: [], srs: {} };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (saved.heartDate !== todayKey()) {
        saved.hearts = 5;
        saved.heartDate = todayKey();
      }
      return {
        ...empty,
        ...saved,
        learned: Array.isArray(saved.learned) ? saved.learned.filter((id) => WORDS.some((word) => word.hanzi === id)) : [],
        activeDates: Array.isArray(saved.activeDates) ? saved.activeDates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).slice(-120) : [],
        completedLessons: Array.isArray(saved.completedLessons) ? saved.completedLessons.filter((id) => /^u\d+l\d+$/.test(id)) : [],
        xp: Number.isFinite(saved.xp) && saved.xp >= 0 ? saved.xp : 0,
        hearts: Number.isInteger(saved.hearts) && saved.hearts >= 0 && saved.hearts <= 5 ? saved.hearts : 5,
        heartDate: typeof saved.heartDate === "string" ? saved.heartDate : todayKey(),
        correct: Number.isInteger(saved.correct) && saved.correct >= 0 ? saved.correct : 0,
        answered: Number.isInteger(saved.answered) && saved.answered >= 0 ? saved.answered : 0,
        recent: Array.isArray(saved.recent) ? saved.recent.filter((entry) => typeof entry === "boolean").slice(-7) : [],
        srs: saved.srs && typeof saved.srs === "object" && !Array.isArray(saved.srs) ? saved.srs : {},
      };
    } catch (error) {
      console.warn("Could not load Hanzi progress.", error);
      return empty;
    }
  }
  let progress = loadProgress();

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.warn("Could not save Hanzi progress.", error);
      showToast("Your browser could not save progress.");
    }
  }
  function showToast(message) {
    const element = document.getElementById("toast");
    element.textContent = message;
    element.classList.add("show");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => element.classList.remove("show"), 2600);
  }
  function getLessonId(unit, lesson) { return `u${unit}l${lesson}`; }
  function unitCompleted(unit) {
    return Array.from({ length: 5 }, (_, lesson) => progress.completedLessons.includes(getLessonId(unit, lesson))).every(Boolean);
  }
  function completedCount() { return progress.completedLessons.length; }
  function learnedCourseWordCount() {
    return COURSE_WORDS.filter((word) => progress.learned.includes(word.id)).length;
  }
  function nextIncompleteLesson() {
    for (let unit = 0; unit < LESSONS.length; unit += 1) {
      for (let lesson = 0; lesson < LESSONS[unit].length; lesson += 1) {
        if (!progress.completedLessons.includes(getLessonId(unit, lesson))) return { unit, lesson };
      }
    }
    return null;
  }
  function activeStreak() {
    const dates = new Set(progress.activeDates);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let cursor = dates.has(todayKey()) ? today : dates.has(dateKey(yesterday)) ? yesterday : null;
    let count = 0;
    while (cursor && dates.has(dateKey(cursor))) {
      count += 1;
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }
  function recordPractice() {
    progress.activeDates = [...new Set([...progress.activeDates, todayKey()])].sort().slice(-120);
    refresh();
  }
  function speak(text) {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      showToast("Speech audio is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.82;
    utterance.onerror = () => showToast("No Mandarin voice is available on this device.");
    window.speechSynthesis.speak(utterance);
  }
  function renderWeek() {
    const container = document.getElementById("streak-week");
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const dates = new Set(progress.activeDates);
    container.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const key = dateKey(date);
      const classes = ["week-day"];
      if (dates.has(key)) classes.push("done");
      if (key === todayKey()) classes.push("today");
      return `<span class="${classes.join(" ")}" aria-label="${date.toLocaleDateString("en-US", { weekday: "long" })}${dates.has(key) ? ", practiced" : ""}">${date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}</span>`;
    }).join("");
  }
  function renderHomePath() {
    const host = document.getElementById("home-path");
    host.innerHTML = UNIT_NAMES.slice(0, 5).map((name, unit) => {
      const completed = unitCompleted(unit);
      return `<button class="preview-unit" data-unit="${unit}" aria-label="Unit ${unit + 1}: ${name}">
        <span class="unit-dot">${completed ? "✓" : String(unit + 1)}</span><span><strong>${name}</strong><small>${completed ? "Finished!" : "5 little lessons"}</small></span></button>`;
    }).join("");
    host.querySelectorAll("[data-unit]").forEach((button) => button.addEventListener("click", () => setView("path")));
  }
  function renderDashboard() {
    const learnedCourseWords = learnedCourseWordCount();
    const percent = COURSE_WORDS.length ? Math.round(learnedCourseWords / COURSE_WORDS.length * 100) : 0;
    const accuracy = progress.answered ? Math.round(progress.correct / progress.answered * 100) : null;
    document.getElementById("today-date").textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
    document.getElementById("top-xp").textContent = progress.xp;
    document.getElementById("dash-xp").textContent = progress.xp;
    document.getElementById("top-hearts").textContent = progress.hearts;
    document.getElementById("lesson-hearts").textContent = progress.hearts;
    document.getElementById("top-streak").textContent = activeStreak();
    document.getElementById("dash-streak").textContent = activeStreak();
    document.getElementById("streak-label").textContent = activeStreak() === 1 ? "day" : "days";
    document.getElementById("dash-words").textContent = learnedCourseWords;
    document.getElementById("dash-word-total").textContent = ` / ${COURSE_WORDS.length} course words`;
    document.getElementById("library-word-total").textContent = WORDS.length;
    document.getElementById("library-course-total").textContent = COURSE_WORDS.length;
    document.getElementById("words-bar").style.width = `${percent}%`;
    document.getElementById("words-percent").textContent = percent ? "Your vocabulary is growing" : "Start your first lesson";
    document.getElementById("words-percent-value").textContent = `${percent}%`;
    document.getElementById("dash-accuracy").textContent = accuracy === null ? "—" : `${accuracy}%`;
    document.getElementById("accuracy-sub").textContent = accuracy === null ? "No exercises yet" : `${progress.answered} answers`;
    document.getElementById("correct-total").textContent = `${progress.correct} / ${progress.answered}`;
    document.getElementById("accuracy-dots").innerHTML = Array.from({ length: 7 }, (_, index) => {
      const entry = progress.recent[index];
      return `<span class="${entry === undefined ? "" : entry ? "hit" : "miss"}"></span>`;
    }).join("");
    document.getElementById("xp-next-note").textContent = progress.xp ? `${completedCount()} lessons completed · keep your trail going!` : "Complete a lesson to earn your first XP.";
    document.getElementById("topbar-hearts");
    const done = completedCount();
    const nextLesson = nextIncompleteLesson();
    document.getElementById("continue-title").innerHTML = !nextLesson ? "Your learning<br />doesn't stop here!" : done ? `Ready for lesson ${nextLesson.lesson + 1}?<br />` : "Your first lesson<br />is waiting!";
    document.getElementById("continue-description").textContent = !nextLesson ? "Start an endless mix of speaking, listening, and vocabulary practice." : done ? `${UNIT_NAMES[nextLesson.unit]} · ${LESSONS[nextLesson.unit][nextLesson.lesson]}` : "Say hello, meet Bao, and start your Mandarin adventure.";
    document.getElementById("continue-button").innerHTML = `${!nextLesson ? "Keep learning" : done ? "Continue learning" : "Start learning"} <span>→</span>`;
    document.getElementById("continue-button").onclick = () => {
      if (!nextLesson) startPracticeSession();
      else startLesson(nextLesson.unit, nextLesson.lesson);
    };
    renderWeek();
    renderHomePath();
    renderBadges();
  }
  function renderPath() {
    const done = completedCount();
    document.getElementById("path-progress-count").textContent = `${done} / 50`;
    document.getElementById("path-overview-bar").style.width = `${done * 2}%`;
    document.getElementById("path-overview-label").textContent = `${done * 2}% complete`;
    const host = document.getElementById("units-list");
    host.innerHTML = UNIT_NAMES.map((name, unit) => {
      const completeLessons = LESSONS[unit].filter((_, lesson) => progress.completedLessons.includes(getLessonId(unit, lesson))).length;
      const lessons = LESSONS[unit].map((title, lesson) => {
        const id = getLessonId(unit, lesson);
        const complete = progress.completedLessons.includes(id);
        const icon = complete ? "★" : "▶";
        return `<button class="lesson-node${complete ? " completed" : " active"}" data-unit="${unit}" data-lesson="${lesson}" aria-label="${complete ? "Completed: " : "Start: "}Unit ${unit + 1}, ${title}">
          <span class="node-icon" aria-hidden="true">${icon}</span><strong>${title}</strong><small>${complete ? "1 star · replay" : "Start lesson"}</small></button>`;
      }).join("");
      return `<article class="unit-panel"><div class="unit-header"><span class="unit-number">${unitCompleted(unit) ? "✓" : unit + 1}</span><span class="unit-header-copy"><strong>${name}</strong><span>Unit ${unit + 1} · ${COURSE_WORDS.filter((word) => word.unit === unit).length} guided words</span></span><span class="unit-progress"><span class="mini-progress"><span style="width:${completeLessons * 20}%"></span></span><small>${completeLessons} / 5 lessons</small></span></div><div class="lesson-list">${lessons}</div></article>`;
    }).join("");
    host.querySelectorAll(".lesson-node").forEach((button) => button.addEventListener("click", () => startLesson(Number(button.dataset.unit), Number(button.dataset.lesson))));
  }
  function renderBadges() {
    const badges = [
      ["✦", "First little win", "Complete your first lesson.", completedCount() >= 1],
      ["★", "Unit explorer", "Finish a whole unit.", UNIT_NAMES.some((_, unit) => unitCompleted(unit))],
      ["✿", "Three-unit trailblazer", "Complete three units.", UNIT_NAMES.filter((_, unit) => unitCompleted(unit)).length >= 3],
      ["🏅", "Halfway there", "Complete five units.", UNIT_NAMES.filter((_, unit) => unitCompleted(unit)).length >= 5],
      ["学", "Mandarin adventurer", "Complete all ten units.", completedCount() >= 50],
      ["文", "Word collector", "Learn 25 guided words.", learnedCourseWordCount() >= 25],
      ["🌱", "Growing vocabulary", `Learn all ${COURSE_WORDS.length} guided words.`, learnedCourseWordCount() >= COURSE_WORDS.length],
      ["⚡", "Bright spark", "Earn 100 XP.", progress.xp >= 100],
      ["♨", "Three-day rhythm", "Practice three days in a row.", activeStreak() >= 3],
    ];
    const earned = badges.filter((badge) => badge[3]).length;
    document.getElementById("badge-count").textContent = `${earned} badge${earned === 1 ? "" : "s"} earned`;
    document.getElementById("badge-grid").innerHTML = badges.map(([icon, title, description, unlocked]) => `<article class="badge-card${unlocked ? "" : " locked"}"><div class="badge-symbol">${icon}</div><div><strong>${title}</strong><span>${description}</span></div></article>`).join("");
  }
  function setView(view) {
    state.view = view;
    document.querySelectorAll(".view").forEach((panel) => panel.classList.toggle("active", panel.id === `view-${view}`));
    document.querySelectorAll(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
    const titles = { home: "Home", path: "Learning path", words: "Word library", flashcards: "Flashcards", achievements: "Achievements", lesson: "Your lesson" };
    document.getElementById("current-section").textContent = titles[view] || "Home";
    if (view === "path") renderPath();
    if (view === "words") renderWords();
    if (view === "flashcards") renderFlashcard();
    if (view === "achievements") renderBadges();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function getLessonWords() {
    if (state.lesson.practice) return state.lesson.words;
    const all = COURSE_WORDS.filter((word) => word.unit === state.lesson.unit);
    return Array.from({ length: 5 }, (_, round) => all[(state.lesson.lesson * 2 + round) % all.length]);
  }
  function getRoundWord() { return getLessonWords()[state.round]; }
  function distractors(word, count) {
    const candidates = COURSE_WORDS.filter((item) => item.id !== word.id).sort(() => Math.random() - 0.5);
    return candidates.slice(0, count);
  }
  function startLesson(unit, lesson) {
    state.lesson = { unit, lesson, errors: 0, matches: [] };
    state.round = 0;
    state.selected = null;
    state.checked = false;
    state.retryNeeded = false;
    state.matchLeft = null;
    state.matchDone = [];
    state.orderAnswer = [];
    setView("lesson");
    renderExercise();
  }
  function shuffled(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }
  function startPracticeSession() {
    state.lesson = {
      practice: true,
      words: shuffled(COURSE_WORDS).slice(0, 5),
      activities: shuffled(ACTIVITIES).slice(0, 5),
      errors: 0,
    };
    state.round = 0;
    state.selected = null;
    state.checked = false;
    state.retryNeeded = false;
    state.matchLeft = null;
    state.matchDone = [];
    state.orderAnswer = [];
    setView("lesson");
    renderExercise();
  }
  function currentActivity() {
    if (state.lesson.practice) return state.lesson.activities[state.round];
    return ACTIVITIES[(state.lesson.unit * 5 + state.lesson.lesson + state.round) % ACTIVITIES.length];
  }
  function renderExercise() {
    if (!state.lesson) return;
    state.selected = null;
    state.checked = false;
    state.retryNeeded = false;
    state.matchLeft = null;
    state.matchDone = [];
    state.orderAnswer = [];
    const { unit, lesson } = state.lesson;
    const type = currentActivity();
    const word = getRoundWord();
    document.getElementById("lesson-label").textContent = state.lesson.practice
      ? `KEEP LEARNING · MIXED PRACTICE · ${state.round + 1} OF 5`
      : `UNIT ${unit + 1} · LESSON ${lesson + 1} · ${state.round + 1} OF 5`;
    document.getElementById("lesson-title").textContent = state.lesson.practice ? "A little more Mandarin" : LESSONS[unit][lesson];
    document.getElementById("lesson-instruction").textContent = ACTIVITY_LABELS[type];
    document.getElementById("lesson-hearts").textContent = progress.hearts;
    document.getElementById("lesson-progress-fill").style.width = `${state.round / 5 * 100}%`;
    document.getElementById("lesson-feedback").className = "lesson-feedback";
    document.getElementById("lesson-feedback").textContent = type === "listen" ? "Listen carefully, then choose." : type === "match" ? "Tap a Chinese word, then its meaning." : "Take your time.";
    const check = document.getElementById("lesson-check");
    check.disabled = true;
    check.textContent = type === "match" ? "Continue →" : "Check →";
    const area = document.getElementById("exercise-area");
    if (type === "match") renderMatch(area);
    else if (type === "choice") renderChoice(area, word, false);
    else if (type === "listen") renderListen(area, word);
    else if (type === "pinyin") renderPinyin(area, word);
    else if (type === "order") renderOrder(area, word);
    else if (type === "translate") renderChoice(area, word, true);
    else renderSpeak(area, word);
  }
  function renderChoice(area, word, englishPrompt) {
    const options = [word, ...distractors(word, 3)].sort(() => Math.random() - 0.5);
    area.innerHTML = `<span class="exercise-prompt">${englishPrompt ? "CHOOSE THE CHINESE TRANSLATION" : "WHAT DOES THIS MEAN IN ENGLISH?"}</span>
      <div class="${englishPrompt ? "exercise-sentence" : "exercise-word"}" ${englishPrompt ? "" : 'lang="zh"'}>${englishPrompt ? word.english : word.hanzi}</div>
      ${englishPrompt ? "" : `<div class="exercise-pinyin">${word.pinyin}</div>`}
      <div class="choice-list">${options.map((option, index) => `<button class="choice-option" data-answer="${option.id}"><span class="choice-letter">${String.fromCharCode(65 + index)}</span><span ${englishPrompt ? 'lang="zh"' : ""}>${englishPrompt ? option.hanzi : option.english}</span></button>`).join("")}</div>`;
    area.querySelectorAll(".choice-option").forEach((button) => button.addEventListener("click", () => selectChoice(button, area)));
  }
  function selectChoice(button, area) {
    if (state.checked || state.retryNeeded) return;
    state.selected = button.dataset.answer;
    area.querySelectorAll(".choice-option").forEach((item) => item.classList.toggle("selected", item === button));
    document.getElementById("lesson-check").disabled = false;
  }
  function renderListen(area, word) {
    const options = [word, ...distractors(word, 3)].sort(() => Math.random() - 0.5);
    area.innerHTML = `<span class="exercise-prompt">LISTEN TO THE WORD</span><div class="exercise-audio"><button class="audio-button" id="exercise-audio" aria-label="Play Mandarin pronunciation">♫</button><span class="exercise-hint">Tap to hear it again, then choose the meaning.</span></div><div class="choice-list">${options.map((option, index) => `<button class="choice-option" data-answer="${option.id}"><span class="choice-letter">${String.fromCharCode(65 + index)}</span><span>${option.english}</span></button>`).join("")}</div>`;
    document.getElementById("exercise-audio").addEventListener("click", () => speak(word.hanzi));
    area.querySelectorAll(".choice-option").forEach((button) => button.addEventListener("click", () => selectChoice(button, area)));
    window.setTimeout(() => speak(word.hanzi), 120);
  }
  function renderPinyin(area, word) {
    area.innerHTML = `<span class="exercise-prompt">TYPE THE PINYIN WITH TONES</span><div class="exercise-word" lang="zh">${word.hanzi}</div><div class="exercise-pinyin">How does it sound?</div><input class="answer-input" id="typed-answer" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type pinyin, e.g. nǐ hǎo" aria-label="Type the pinyin"><p class="typing-hint">Tone marks are welcome; tone numbers are not required.</p>`;
    document.getElementById("typed-answer").addEventListener("input", (event) => { state.selected = event.target.value.trim(); document.getElementById("lesson-check").disabled = !state.selected; });
    document.getElementById("typed-answer").addEventListener("keydown", (event) => { if (event.key === "Enter" && !document.getElementById("lesson-check").disabled) handleCheck(); });
  }
  function renderOrder(area, word) {
    const tokens = word.exampleEn.match(/[\w’'-]+[.,!?;:]?/g) || [];
    const shuffled = [...tokens].sort(() => Math.random() - 0.5);
    state.orderAnswer = [];
    area.innerHTML = `<span class="exercise-prompt">TRANSLATE THIS SENTENCE TO ENGLISH</span><div class="exercise-sentence" lang="zh">${word.example}</div><p class="typing-hint">Tap the English word tiles in the correct order.</p><div class="order-answer" id="order-answer" aria-label="Your English translation"></div><div class="order-choices" id="order-choices">${shuffled.map((token, index) => `<button class="order-chip" data-token="${index}">${token}</button>`).join("")}</div>`;
    area.querySelectorAll(".order-chip").forEach((button) => button.addEventListener("click", () => {
      if (state.checked || state.retryNeeded) return;
      const index = Number(button.dataset.token);
      if (state.orderAnswer.includes(index)) state.orderAnswer = state.orderAnswer.filter((item) => item !== index);
      else state.orderAnswer.push(index);
      button.classList.toggle("hidden", state.orderAnswer.includes(index));
      const answerBox = document.getElementById("order-answer");
      const orderButtons = [...area.querySelectorAll(".order-choices .order-chip")];
      answerBox.innerHTML = state.orderAnswer.map((tokenIndex) => `<button class="order-chip" data-remove="${tokenIndex}">${orderButtons[tokenIndex].textContent}</button>`).join("");
      answerBox.querySelectorAll("[data-remove]").forEach((removeButton) => removeButton.addEventListener("click", () => {
        const remove = Number(removeButton.dataset.remove);
        state.orderAnswer = state.orderAnswer.filter((item) => item !== remove);
        area.querySelector(`.order-choices [data-token="${remove}"]`).classList.remove("hidden");
        renderOrderAnswer(area);
      }));
      document.getElementById("lesson-check").disabled = state.orderAnswer.length !== tokens.length;
    }));
  }
  function renderOrderAnswer(area) {
    const answerBox = document.getElementById("order-answer");
    const buttons = [...area.querySelectorAll(".order-choices .order-chip")];
    answerBox.innerHTML = state.orderAnswer.map((tokenIndex) => `<button class="order-chip" data-remove="${tokenIndex}">${buttons[tokenIndex].textContent}</button>`).join("");
    answerBox.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", () => {
      const remove = Number(button.dataset.remove);
      state.orderAnswer = state.orderAnswer.filter((item) => item !== remove);
      area.querySelector(`.order-choices [data-token="${remove}"]`).classList.remove("hidden");
      renderOrderAnswer(area);
      document.getElementById("lesson-check").disabled = true;
    }));
  }
  function renderSpeak(area, word) {
    const hasRecognition = !IS_NATIVE_APP && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    area.innerHTML = `<span class="exercise-prompt">SAY THE WORD IN MANDARIN</span><div class="exercise-audio"><div class="exercise-word" lang="zh">${word.hanzi}</div><button class="audio-button" id="speak-audio" aria-label="Hear the Mandarin pronunciation">♫</button><span class="exercise-hint">${hasRecognition ? "Listen, then try saying it into your microphone." : "Microphone speech recognition isn't available here. Type the pinyin instead."}</span></div>
      <button class="button button-soft speak-toggle" id="microphone-button">${hasRecognition ? "🎙 Try speaking" : "Use pinyin instead"}</button>
      <input class="answer-input ${hasRecognition ? "hidden" : ""}" id="speak-fallback" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type pinyin, e.g. nǐ hǎo" aria-label="Type pinyin as a fallback">
      <p class="typing-hint" id="speak-status" aria-live="polite">${hasRecognition ? "Or use the pinyin fallback if you prefer." : word.english}</p>`;
    document.getElementById("speak-audio").addEventListener("click", () => speak(word.hanzi));
    const fallback = document.getElementById("speak-fallback");
    if (hasRecognition) {
      document.getElementById("microphone-button").addEventListener("click", () => {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new Recognition();
        recognition.lang = "zh-CN";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        const status = document.getElementById("speak-status");
        status.textContent = "Listening... say the word now.";
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript.trim();
          status.textContent = `I heard: ${transcript}`;
          const heardHanzi = transcript.replace(/[\s，。！？,.!?]/g, "");
          state.selected = heardHanzi === word.hanzi || normalizePinyin(transcript) === normalizePinyin(word.pinyin) ? "correct" : "incorrect";
          document.getElementById("lesson-check").disabled = false;
        };
        recognition.onerror = (event) => { status.textContent = event.error === "not-allowed" ? "Microphone permission was denied. Type the pinyin below instead." : "I couldn't hear that. Try again or use the pinyin fallback."; fallback.classList.remove("hidden"); };
        recognition.onend = () => { if (status.textContent === "Listening... say the word now.") status.textContent = "I didn't catch that. Try again or type pinyin."; };
        try { recognition.start(); } catch (error) { console.warn("Could not start speech recognition.", error); status.textContent = "Microphone unavailable. Type the pinyin below."; fallback.classList.remove("hidden"); }
      });
      const microphoneButton = document.getElementById("microphone-button");
      microphoneButton.addEventListener("contextmenu", (event) => event.preventDefault());
      const fallbackToggle = document.createElement("button");
      fallbackToggle.className = "text-link speak-fallback-toggle";
      fallbackToggle.textContent = "Type pinyin instead";
      fallbackToggle.type = "button";
      microphoneButton.insertAdjacentElement("afterend", fallbackToggle);
      fallbackToggle.addEventListener("click", () => { fallback.classList.toggle("hidden"); fallback.focus(); });
    } else {
      document.getElementById("microphone-button").addEventListener("click", () => fallback.focus());
    }
    fallback.addEventListener("input", (event) => { state.selected = event.target.value.trim(); document.getElementById("lesson-check").disabled = !state.selected; });
  }
  function renderMatch(area) {
    const selected = getLessonWords();
    const left = [...selected].sort(() => Math.random() - 0.5);
    const right = [...selected].sort(() => Math.random() - 0.5);
    area.innerHTML = `<span class="exercise-prompt">MATCH EACH CHINESE WORD TO ITS MEANING</span><div class="match-grid"><div class="match-column" id="match-left">${left.map((word) => `<button class="match-option match-chinese" data-side="left" data-id="${word.id}" lang="zh">${word.hanzi}</button>`).join("")}</div><div class="match-column" id="match-right">${right.map((word) => `<button class="match-option" data-side="right" data-id="${word.id}">${word.english}</button>`).join("")}</div></div>`;
    area.querySelectorAll(".match-option").forEach((button) => button.addEventListener("click", () => handleMatch(button)));
  }
  function handleMatch(button) {
    if (button.classList.contains("matched")) return;
    const side = button.dataset.side;
    if (side === "left") {
      state.matchLeft = button.dataset.id;
      document.querySelectorAll('#match-left .match-option').forEach((item) => item.classList.toggle("selected", item === button));
      return;
    }
    if (!state.matchLeft) {
      showToast("Choose a Chinese word first.");
      return;
    }
    if (state.matchLeft === button.dataset.id) {
      document.querySelectorAll(`[data-id="${CSS.escape(state.matchLeft)}"]`).forEach((item) => item.classList.add("matched"));
      state.matchDone.push(state.matchLeft);
      recordAnswer(true);
      state.matchLeft = null;
      document.querySelectorAll("#match-left .match-option").forEach((item) => item.classList.remove("selected"));
      document.getElementById("lesson-feedback").textContent = state.matchDone.length === 5 ? "All matched — lovely work!" : "Nice match! Keep going.";
      document.getElementById("lesson-feedback").classList.add("good");
      document.getElementById("lesson-check").disabled = state.matchDone.length !== 5;
    } else {
      wrongAnswer();
      button.classList.add("wrong");
      document.getElementById("lesson-feedback").textContent = progress.hearts ? "Not that pair — try another meaning." : "No hearts left today, but you can keep practicing.";
      document.getElementById("lesson-feedback").classList.add("bad");
      window.setTimeout(() => button.classList.remove("wrong"), 400);
    }
  }
  function normalizePinyin(value) {
    return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
  }
  function normalizeEnglish(value) {
    return value.toLocaleLowerCase().trim().replace(/[.,!?;:'"’]/g, "").replace(/\s+/g, " ");
  }
  function recordAnswer(correct) {
    progress.answered += 1;
    if (correct) progress.correct += 1;
    progress.recent.push(correct);
    progress.recent = progress.recent.slice(-7);
  }
  function wrongAnswer() {
    recordAnswer(false);
    state.lesson.errors += 1;
    progress.hearts = Math.max(0, progress.hearts - 1);
    saveProgress();
    document.getElementById("top-hearts").textContent = progress.hearts;
    document.getElementById("lesson-hearts").textContent = progress.hearts;
    document.getElementById("accuracy-dots").innerHTML = Array.from({ length: 7 }, (_, index) => `<span class="${progress.recent[index] === undefined ? "" : progress.recent[index] ? "hit" : "miss"}"></span>`).join("");
    document.getElementById("correct-total").textContent = `${progress.correct} / ${progress.answered}`;
    document.getElementById("dash-accuracy").textContent = `${Math.round(progress.correct / progress.answered * 100)}%`;
  }
  function handleCheck() {
    if (!state.lesson) return;
    const type = currentActivity();
    if (type === "match") {
      if (state.matchDone.length === 5) advanceRound();
      return;
    }
    if (state.retryNeeded) {
      renderExercise();
      return;
    }
    const word = getRoundWord();
    let correct = false;
    if (type === "pinyin") correct = normalizePinyin(state.selected || "") === normalizePinyin(word.pinyin);
    else if (type === "order") {
      const tokens = word.exampleEn.match(/[\w’'-]+[.,!?;:]?/g) || [];
      const answer = state.orderAnswer.map((index) => {
        const node = document.querySelector(`#order-choices [data-token="${index}"]`);
        const selectedNode = document.querySelector(`#order-answer [data-remove="${index}"]`);
        return selectedNode ? selectedNode.textContent : node?.textContent || "";
      }).join(" ");
      correct = normalizeEnglish(answer) === normalizeEnglish(tokens.join(" "));
    } else if (type === "speak") {
      const isTranscript = state.selected === "correct";
      correct = isTranscript || normalizePinyin(state.selected || "") === normalizePinyin(word.pinyin);
    } else if (type === "translate") {
      correct = state.selected === word.id;
    } else correct = state.selected === word.id;
    if (correct) {
      recordAnswer(true);
      state.checked = true;
      const feedback = document.getElementById("lesson-feedback");
      feedback.textContent = "That's right — 加油! Keep it up!";
      feedback.classList.add("good");
      document.getElementById("lesson-check").textContent = state.round === 4 ? "Finish lesson ★" : "Continue →";
      updateChoiceColors(word);
      if (type === "pinyin") document.getElementById("typed-answer").disabled = true;
      if (type === "speak") document.getElementById("speak-fallback").disabled = true;
    } else {
      wrongAnswer();
      const feedback = document.getElementById("lesson-feedback");
      feedback.textContent = progress.hearts ? "Not quite — take another try." : "No hearts left today, but you can keep practicing.";
      feedback.classList.add("bad");
      state.retryNeeded = true;
      document.getElementById("lesson-check").textContent = "Try again";
      if (type === "pinyin") document.getElementById("typed-answer").focus();
    }
    saveProgress();
  }
  function updateChoiceColors(word) {
    document.querySelectorAll(".choice-option").forEach((button) => {
      button.disabled = true;
      if (button.dataset.answer === word.id) button.classList.add("correct");
      else if (button.dataset.answer === state.selected) button.classList.add("incorrect");
    });
  }
  function advanceRound() {
    const { unit, lesson } = state.lesson;
    const activity = currentActivity();
    const word = getRoundWord();
    if (activity === "match") {
      state.matchDone.forEach((id) => { if (!progress.learned.includes(id)) progress.learned.push(id); });
      state.matchDone.forEach((id) => scheduleWord(id, true));
    } else if (word && !progress.learned.includes(word.id)) {
      progress.learned.push(word.id);
      scheduleWord(word.id, true);
    }
    if (state.round < 4) {
      state.round += 1;
      renderExercise();
      return;
    }
    if (state.lesson.practice) {
      const xp = Math.max(10, 20 - state.lesson.errors * 2);
      progress.xp += xp;
      recordPractice();
      saveProgress();
      showCelebration(state.lesson.errors);
      return;
    }
    const lessonId = getLessonId(unit, lesson);
    const wasComplete = progress.completedLessons.includes(lessonId);
    if (!wasComplete) {
      progress.completedLessons.push(lessonId);
      progress.xp += Math.max(10, 20 - state.lesson.errors * 2);
      recordPractice();
      saveProgress();
      document.getElementById("lesson-progress-fill").style.width = "100%";
      showCelebration(state.lesson.errors);
    } else {
      recordPractice();
      showToast("Lesson reviewed — great practice!");
      state.lesson = null;
      setView("path");
    }
  }
  function handleCheckButton() {
    if (!state.lesson) return;
    if (state.retryNeeded) {
      renderExercise();
      return;
    }
    if (state.checked || (currentActivity() === "match" && state.matchDone.length === 5)) {
      advanceRound();
      return;
    }
    handleCheck();
  }
  function showCelebration(errors) {
    const isPractice = Boolean(state.lesson?.practice);
    document.getElementById("celebration-title").textContent = isPractice
      ? errors === 0 ? "A perfect practice round!" : "Your Mandarin is growing!"
      : errors === 0 ? "A perfect little win!" : "Look at you go!";
    document.getElementById("celebration-copy").textContent = isPractice
      ? "Five mixed questions done. Keep your skills fresh with another round!"
      : errors === 0 ? "You completed the lesson without a mistake. Bao is so proud!" : "You made another little step forward. Keep your Mandarin trail going!";
    document.getElementById("celebration-xp").textContent = `+${Math.max(10, 20 - errors * 2)} XP`;
    document.getElementById("celebration").classList.remove("hidden");
    refresh();
  }
  function scheduleWord(id, gotIt) {
    const previous = progress.srs[id] || { interval: 0, reps: 0 };
    const interval = gotIt ? (previous.reps === 0 ? 1 : previous.reps === 1 ? 3 : 7) : 0;
    const due = new Date(Date.now() + (gotIt ? interval * 86400000 : 10 * 60000));
    progress.srs[id] = { interval, reps: gotIt ? previous.reps + 1 : 0, due: due.toISOString() };
  }
  function dueWords() {
    const now = Date.now();
    return WORDS.filter((word) => {
      const review = progress.srs[word.id];
      if (!review) return word.source === "course";
      return !review.due || Date.parse(review.due) <= now;
    });
  }
  function renderFlashcard() {
    const list = state.dueOnly ? dueWords() : WORDS;
    if (!list.length) {
      document.getElementById("flash-position").textContent = "ALL CAUGHT UP";
      document.getElementById("flash-due-count").textContent = "No words due right now";
      ["flash-hanzi", "flash-pinyin", "flash-translation", "flash-example"].forEach((id) => document.getElementById(id).textContent = "");
      document.getElementById("flash-hint").textContent = "NICE WORK!";
      document.getElementById("flash-tap").classList.add("hidden");
      document.getElementById("flashcard").disabled = true;
      return;
    }
    document.getElementById("flashcard").disabled = false;
    state.flashIndex = ((state.flashIndex % list.length) + list.length) % list.length;
    const word = list[state.flashIndex];
    document.getElementById("flash-position").textContent = `CARD ${state.flashIndex + 1} OF ${list.length}`;
    document.getElementById("flash-due-count").textContent = `${list.length} ${state.dueOnly ? "ready to review" : "words in library"}`;
    document.getElementById("flash-hanzi").textContent = word.hanzi;
    document.getElementById("flash-pinyin").textContent = word.pinyin;
    document.getElementById("flash-translation").textContent = word.english;
    document.getElementById("flash-example").textContent = word.source === "course"
      ? `${word.example} · ${word.exampleEn}`
      : "Dictionary reference · no curated example";
    document.getElementById("flash-hint").textContent = state.flashRevealed ? "THE MEANING" : "TAP TO REVEAL";
    ["flash-pinyin", "flash-translation", "flash-example"].forEach((id) => document.getElementById(id).classList.toggle("hidden", !state.flashRevealed));
    document.getElementById("flash-tap").classList.toggle("hidden", state.flashRevealed);
  }
  state.flashRevealed = false;
  function renderFilters() {
    const categories = ["All words", ...new Set(WORDS.map((word) => word.category))];
    const host = document.getElementById("category-filters");
    host.innerHTML = categories.map((category) => `<button class="filter-button${state.category === category ? " active" : ""}" data-category="${category}">${category}</button>`).join("");
    host.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => {
      state.category = button.dataset.category;
      state.wordPage = 0;
      renderFilters();
      renderWords();
    }));
  }
  function renderWords() {
    const query = state.search.trim().toLocaleLowerCase();
    const filtered = WORDS.filter((word) => (state.category === "All words" || word.category === state.category)
      && (!query || [word.hanzi, word.pinyin, word.english, word.category].some((value) => value.toLocaleLowerCase().includes(query))));
    const pageSize = 60;
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    state.wordPage = Math.min(state.wordPage, pageCount - 1);
    const start = state.wordPage * pageSize;
    const visibleWords = filtered.slice(start, start + pageSize);
    document.getElementById("empty-words").classList.toggle("hidden", filtered.length > 0);
    document.getElementById("vocab-results").textContent = filtered.length
      ? `Showing ${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length.toLocaleString()} words`
      : "No words found";
    document.getElementById("vocab-page-label").textContent = `Page ${state.wordPage + 1} of ${pageCount}`;
    document.getElementById("vocab-prev").disabled = state.wordPage === 0;
    document.getElementById("vocab-next").disabled = state.wordPage >= pageCount - 1;
    document.getElementById("word-grid").innerHTML = visibleWords.map((word) => `<article class="word-card">
      <div class="word-card-top"><span class="word-character" lang="zh">${word.hanzi}</span><button class="word-speak" data-speak="${word.hanzi}" aria-label="Hear ${word.english}">♫</button></div>
      <div class="word-pinyin">${word.pinyin}</div><div class="word-english">${word.english}</div>
      ${word.source === "course" ? `<p class="word-example"><span lang="zh">${word.example}</span> · ${word.exampleEn}</p>` : '<p class="word-example">Reference entry · example not curated</p>'}
      <div class="word-card-bottom"><span>${word.category}</span>${progress.learned.includes(word.id) ? '<b>✓ Learned</b>' : ""}</div></article>`).join("");
    document.querySelectorAll("#word-grid [data-speak]").forEach((button) => button.addEventListener("click", () => speak(button.dataset.speak)));
  }
  function refresh() {
    renderDashboard();
    if (state.view === "path") renderPath();
    if (state.view === "words") renderWords();
    if (state.view === "achievements") renderBadges();
    saveProgress();
  }

  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  document.getElementById("lesson-close").addEventListener("click", () => { state.lesson = null; setView("path"); });
  document.getElementById("lesson-check").addEventListener("click", handleCheckButton);
  document.getElementById("celebration-continue").addEventListener("click", () => {
    document.getElementById("celebration").classList.add("hidden");
    if (state.lesson?.practice) {
      startPracticeSession();
      return;
    }
    state.lesson = null;
    const nextLesson = nextIncompleteLesson();
    if (nextLesson) startLesson(nextLesson.unit, nextLesson.lesson);
    else setView("path");
  });
  document.getElementById("word-search").addEventListener("input", (event) => { state.search = event.target.value; state.wordPage = 0; renderWords(); });
  document.getElementById("vocab-prev").addEventListener("click", () => { state.wordPage = Math.max(0, state.wordPage - 1); renderWords(); });
  document.getElementById("vocab-next").addEventListener("click", () => { state.wordPage += 1; renderWords(); });
  document.getElementById("flashcard").addEventListener("click", () => { state.flashRevealed = !state.flashRevealed; renderFlashcard(); });
  document.getElementById("flash-prev").addEventListener("click", () => { state.flashIndex -= 1; state.flashRevealed = false; renderFlashcard(); });
  document.getElementById("flash-next").addEventListener("click", () => { state.flashIndex += 1; state.flashRevealed = false; renderFlashcard(); });
  document.getElementById("flash-speak").addEventListener("click", () => { const list = state.dueOnly ? dueWords() : WORDS; if (list.length) speak(list[state.flashIndex].hanzi); });
  document.getElementById("flash-again").addEventListener("click", () => {
    const list = state.dueOnly ? dueWords() : WORDS;
    if (!list.length) return;
    scheduleWord(list[state.flashIndex].id, false);
    state.flashRevealed = false;
    state.flashIndex = 0;
    recordPractice();
    renderFlashcard();
    showToast("We'll bring this word back soon.");
  });
  document.getElementById("flash-remember").addEventListener("click", () => {
    const list = state.dueOnly ? dueWords() : WORDS;
    if (!list.length) return;
    const word = list[state.flashIndex];
    scheduleWord(word.id, true);
    if (!progress.learned.includes(word.id)) progress.learned.push(word.id);
    progress.xp += 2;
    state.flashRevealed = false;
    state.flashIndex = 0;
    recordPractice();
    renderFlashcard();
    showToast("Nice recall! +2 XP");
  });
  document.getElementById("due-toggle").addEventListener("click", (event) => {
    state.dueOnly = !state.dueOnly;
    state.flashIndex = 0;
    state.flashRevealed = false;
    event.currentTarget.textContent = state.dueOnly ? "Review all words" : "Show due words";
    renderFlashcard();
  });
  document.getElementById("reset-progress").addEventListener("click", () => document.getElementById("confirm-modal").classList.remove("hidden"));
  document.getElementById("cancel-reset").addEventListener("click", () => document.getElementById("confirm-modal").classList.add("hidden"));
  document.getElementById("confirm-reset").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    progress = loadProgress();
    state.lesson = null;
    document.getElementById("confirm-modal").classList.add("hidden");
    setView("home");
    refresh();
    showToast("Progress reset. Your Mandarin trail is ready!");
  });
  document.getElementById("confirm-modal").addEventListener("click", (event) => { if (event.target.id === "confirm-modal") event.currentTarget.classList.add("hidden"); });
  document.getElementById("celebration").addEventListener("click", (event) => { if (event.target.id === "celebration") document.getElementById("celebration-continue").click(); });

  renderFilters();
  renderDashboard();
  renderPath();
  renderFlashcard();
  saveProgress();
  if (!IS_NATIVE_APP && "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.warn("Could not register the Hanzi offline service worker.", error);
    });
  }
})();
