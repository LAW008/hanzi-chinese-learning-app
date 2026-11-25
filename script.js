const soundToggle = document.querySelector("#soundToggle");
const soundIcon = document.querySelector("#soundIcon");
const lessonSpeaker = document.querySelector("#lessonSpeaker");
const phraseSpeakers = document.querySelectorAll(".phrase-speaker");
const speed = document.querySelector("#speed");
const speedValue = document.querySelector("#speedValue");

let soundEnabled = true;

function getChineseVoice() {
  if (!("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.lang.toLowerCase().startsWith("zh")) || null;
}

function speak(text, button) {
  if (!soundEnabled) {
    return;
  }

  if (!("speechSynthesis" in window)) {
    window.alert("This browser does not support text-to-speech.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const chineseVoice = getChineseVoice();
  if (chineseVoice) {
    utterance.voice = chineseVoice;
  }
  utterance.lang = "zh-CN";
  utterance.rate = Number(speed.value);

  if (button) {
    button.classList.add("is-speaking");
    utterance.onend = () => button.classList.remove("is-speaking");
    utterance.onerror = () => button.classList.remove("is-speaking");
  }

  window.speechSynthesis.speak(utterance);
}

soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundIcon.textContent = soundEnabled ? "🔊" : "🔇";
  soundToggle.setAttribute("aria-label", soundEnabled ? "关闭声音" : "开启声音");

  if (!soundEnabled) {
    window.speechSynthesis?.cancel();
  }
});

phraseSpeakers.forEach((button) => {
  button.addEventListener("click", () => {
    speak(button.dataset.speech, button);
  });
});

lessonSpeaker.addEventListener("click", () => {
  speak("你好！你叫什么名字？很高兴认识你。", lessonSpeaker);
});

speed.addEventListener("input", () => {
  const selectedSpeed = Number(speed.value);
  if (selectedSpeed < 0.8) {
    speedValue.textContent = "慢速";
  } else if (selectedSpeed > 1) {
    speedValue.textContent = "快速";
  } else {
    speedValue.textContent = "正常";
  }
});

if ("speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = getChineseVoice;
}

const cards = [
  { chinese: "你好！", pinyin: "Nǐ hǎo!", translation: "Hello!" },
  { chinese: "你叫什么名字？", pinyin: "Nǐ jiào shénme míngzi?", translation: "What's your name?" },
  { chinese: "很高兴认识你。", pinyin: "Hěn gāoxìng rènshi nǐ.", translation: "Nice to meet you." }
];

const quizQuestions = [
  { question: "“你好！”是什么意思？", options: ["Hello!", "Goodbye!", "Thank you!"], answer: "Hello!" },
  { question: "Which phrase asks someone's name?", options: ["你好！", "你叫什么名字？", "很高兴认识你。"], answer: "你叫什么名字？" },
  { question: "“很高兴认识你。”表示什么？", options: ["Nice to meet you.", "How are you?", "Where are you?"], answer: "Nice to meet you." }
];

let cardIndex = 0;
let cardFlipped = false;
let quizIndex = 0;
let answeredCorrectly = 0;

const flashcard = document.querySelector("#flashcard");
const cardCount = document.querySelector("#cardCount");
const cardChinese = document.querySelector("#cardChinese");
const cardPinyin = document.querySelector("#cardPinyin");
const flipCard = document.querySelector("#flipCard");
const knownButton = document.querySelector("#knownButton");
const rememberButton = document.querySelector("#rememberButton");
const quizCount = document.querySelector("#quizCount");
const quizQuestion = document.querySelector("#quizQuestion");
const quizOptions = document.querySelector("#quizOptions");
const quizFeedback = document.querySelector("#quizFeedback");
const progressFill = document.querySelector("#progressFill");
const progressPercent = document.querySelector("#progressPercent");

function updateProgress() {
  const saved = Number(localStorage.getItem("chineseAppProgress") || 0);
  progressFill.style.width = `${saved}%`;
  progressPercent.textContent = `${saved}%`;
}

function addProgress(amount) {
  const saved = Number(localStorage.getItem("chineseAppProgress") || 0);
  const next = Math.min(100, saved + amount);
  localStorage.setItem("chineseAppProgress", String(next));
  updateProgress();
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.view}View`).classList.add("active");
  });
});

function renderCard() {
  const card = cards[cardIndex];
  cardFlipped = false;
  cardCount.textContent = `单词 ${cardIndex + 1} / ${cards.length}`;
  cardChinese.textContent = card.chinese;
  cardPinyin.textContent = card.pinyin;
  flipCard.textContent = "查看翻译";
  flashcard.querySelector(".flashcard-translation")?.remove();
}

flipCard.addEventListener("click", () => {
  cardFlipped = !cardFlipped;
  if (cardFlipped) {
    const translation = document.createElement("p");
    translation.className = "flashcard-translation";
    translation.textContent = cards[cardIndex].translation;
    flashcard.querySelector(".flashcard-side").appendChild(translation);
    flipCard.textContent = "隐藏翻译";
  } else {
    flashcard.querySelector(".flashcard-translation")?.remove();
    flipCard.textContent = "查看翻译";
  }
});

function nextCard() {
  cardIndex = (cardIndex + 1) % cards.length;
  renderCard();
}

knownButton.addEventListener("click", () => {
  addProgress(10);
  nextCard();
});

rememberButton.addEventListener("click", nextCard);

function renderQuiz() {
  const question = quizQuestions[quizIndex];
  quizCount.textContent = `问题 ${quizIndex + 1} / ${quizQuestions.length}`;
  quizQuestion.textContent = question.question;
  quizFeedback.textContent = "";
  quizOptions.replaceChildren();

  question.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-option";
    button.textContent = option;
    button.addEventListener("click", () => selectAnswer(button, option));
    quizOptions.appendChild(button);
  });
}

function selectAnswer(button, option) {
  if (quizOptions.querySelector(".correct, .incorrect")) {
    return;
  }

  const question = quizQuestions[quizIndex];
  if (option === question.answer) {
    button.classList.add("correct");
    quizFeedback.textContent = "答对了！";
    answeredCorrectly += 1;
    addProgress(10);
  } else {
    button.classList.add("incorrect");
    const correctButton = [...quizOptions.children].find((item) => item.textContent === question.answer);
    correctButton?.classList.add("correct");
    quizFeedback.textContent = `正确答案：${question.answer}`;
  }

  window.setTimeout(() => {
    quizIndex += 1;
    if (quizIndex < quizQuestions.length) {
      renderQuiz();
    } else {
      quizCount.textContent = "测验完成";
      quizQuestion.textContent = `完成！答对 ${answeredCorrectly} / ${quizQuestions.length} 题`;
      quizOptions.replaceChildren();
      quizFeedback.textContent = answeredCorrectly === quizQuestions.length ? "太棒了！" : "继续复习，你会越来越熟练。";

      const restartButton = document.createElement("button");
      restartButton.type = "button";
      restartButton.className = "quiz-option";
      restartButton.textContent = "再做一次";
      restartButton.addEventListener("click", renderQuiz);
      quizOptions.appendChild(restartButton);

      quizIndex = 0;
      answeredCorrectly = 0;
    }
  }, 1100);
}

renderCard();
renderQuiz();
updateProgress();
