const SESSION_SIZE = 7;

let questions = [];
let sessionQueue = [];
let currentQuestion = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getProgress() {
  return JSON.parse(localStorage.getItem("neuralforge_progress") || "{}");
}

function setProgress(progress) {
  localStorage.setItem("neuralforge_progress", JSON.stringify(progress));
}

function getSessions() {
  return JSON.parse(localStorage.getItem("neuralforge_sessions") || "{}");
}

function setSessions(sessions) {
  localStorage.setItem("neuralforge_sessions", JSON.stringify(sessions));
}

async function loadQuestions() {
  const response = await fetch("questions.json");
  questions = await response.json();
  renderQuestionList();
  renderErrors();
  renderStats();
  updateStreak();
}

function priorityScore(question) {
  const progress = getProgress();
  const item = progress[question.id];

  if (!item) return question.difficulty * 8;

  const daysSince = Math.max(
    1,
    (Date.now() - new Date(item.lastSeen).getTime()) / (1000 * 60 * 60 * 24)
  );

  return question.difficulty * daysSince * (6 - Number(item.score));
}

function startSession() {
  sessionQueue = [...questions]
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, SESSION_SIZE);

  showNextQuestion();
}

function showNextQuestion() {
  if (sessionQueue.length === 0) {
    $("#questionPanel").classList.add("hidden");
    alert("Sesión completada. Buen trabajo.");
    renderStats();
    renderErrors();
    updateStreak();
    return;
  }

  currentQuestion = sessionQueue.shift();

  $("#questionPanel").classList.remove("hidden");
  $("#questionTopic").textContent = currentQuestion.topic;
  $("#questionDifficulty").textContent = `Dificultad ${currentQuestion.difficulty}/10`;
  $("#questionType").textContent = currentQuestion.type;
  $("#questionText").textContent = currentQuestion.question;
  $("#userAnswer").value = "";

  $("#correctionPanel").classList.add("hidden");
  $("#expectedAnswer").innerHTML = "";
  $("#checklist").innerHTML = "";
  $("#rubric").innerHTML = "";
  $("#suggestedScore").textContent = "—";
  $("#scoreComment").textContent = "Marca los puntos cubiertos para calcular una nota.";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showCorrection() {
  if (!currentQuestion) return;

  $("#correctionPanel").classList.remove("hidden");

  $("#expectedAnswer").innerHTML = currentQuestion.expected_answer
    .map(item => `<li>${escapeHtml(item)}</li>`)
    .join("");

  $("#checklist").innerHTML = currentQuestion.checklist
    .map((item, index) => `
      <label class="check-item">
        <input type="checkbox" class="check-input" data-index="${index}">
        <span>
          <strong>${escapeHtml(item.label)}</strong>
          <small>Peso: ${item.weight}</small>
        </span>
      </label>
    `)
    .join("");

  $("#rubric").innerHTML = Object.entries(currentQuestion.rubric)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([score, text]) => `
      <p><strong>${score}/5:</strong> ${escapeHtml(text)}</p>
    `)
    .join("");

  $$(".check-input").forEach(input => {
    input.addEventListener("change", updateSuggestedScore);
  });

  updateSuggestedScore();
}

function updateSuggestedScore() {
  if (!currentQuestion) return;

  let earned = 0;
  let total = 0;

  $$(".check-input").forEach(input => {
    const index = Number(input.dataset.index);
    const weight = Number(currentQuestion.checklist[index].weight);
    total += weight;
    if (input.checked) earned += weight;
  });

  const score = total === 0 ? 0 : Math.round((earned / total) * 5);
  $("#suggestedScore").textContent = `${score}/5`;

  const comments = [
    "Respuesta muy floja o ausente.",
    "Hay reconocimiento, pero falta estructura.",
    "Respuesta parcial: conviene reparar este concepto.",
    "Base sólida, pero falta rigor o detalle.",
    "Muy buena respuesta con pequeños huecos.",
    "Dominio alto: puedes explicar, derivar y criticar."
  ];

  $("#scoreComment").textContent = comments[score];
}

function saveResult(score) {
  if (!currentQuestion) return;

  const progress = getProgress();

  const checkedItems = $$(".check-input")
    .filter(input => input.checked)
    .map(input => currentQuestion.checklist[Number(input.dataset.index)].label);

  progress[currentQuestion.id] = {
    questionId: currentQuestion.id,
    topic: currentQuestion.topic,
    difficulty: currentQuestion.difficulty,
    type: currentQuestion.type,
    lastSeen: new Date().toISOString(),
    score: Number(score),
    answer: $("#userAnswer").value.trim(),
    checkedItems
  };

  setProgress(progress);

  const sessions = getSessions();
  sessions[todayKey()] = true;
  setSessions(sessions);

  showNextQuestion();
}

function renderQuestionList() {
  const query = ($("#searchQuestions")?.value || "").toLowerCase();

  const filtered = questions.filter(q => {
    const haystack = [
      q.topic,
      q.type,
      q.question,
      ...(q.tags || [])
    ].join(" ").toLowerCase();

    return haystack.includes(query);
  });

  $("#questionList").innerHTML = filtered.map(q => `
    <article>
      <div class="card-meta">
        <span class="badge">${escapeHtml(q.topic)}</span>
        <span class="badge">Dificultad ${q.difficulty}/10</span>
        <span class="badge">${escapeHtml(q.type)}</span>
      </div>
      <h3>${escapeHtml(q.question)}</h3>
      <p class="muted">${(q.tags || []).map(escapeHtml).join(" · ")}</p>
    </article>
  `).join("");
}

function renderErrors() {
  const progress = getProgress();

  const weak = Object.values(progress)
    .filter(item => Number(item.score) <= 2)
    .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));

  if (weak.length === 0) {
    $("#errorList").innerHTML = `
      <article>
        <h3>No hay errores graves todavía.</h3>
        <p class="muted">Cuando guardes respuestas con nota 0, 1 o 2 aparecerán aquí.</p>
      </article>
    `;
    return;
  }

  $("#errorList").innerHTML = weak.map(item => {
    const q = questions.find(question => question.id === item.questionId);
    return `
      <article>
        <div class="card-meta">
          <span class="badge">${escapeHtml(item.topic)}</span>
          <span class="badge">Nota ${item.score}/5</span>
        </div>
        <h3>${escapeHtml(q?.question || item.questionId)}</h3>
        <p class="muted">Último intento: ${new Date(item.lastSeen).toLocaleDateString()}</p>
      </article>
    `;
  }).join("");
}

function renderStats() {
  const progress = Object.values(getProgress());
  $("#totalAnswered").textContent = progress.length;

  if (progress.length === 0) {
    $("#avgScore").textContent = "—";
    $("#weakTopics").textContent = "—";
    $("#topicStats").innerHTML = "<p class='muted'>Aún no hay datos. Completa una sesión para ver estadísticas.</p>";
    return;
  }

  const avg = progress.reduce((sum, item) => sum + Number(item.score), 0) / progress.length;
  $("#avgScore").textContent = avg.toFixed(2);

  const byTopic = {};
  for (const item of progress) {
    byTopic[item.topic] ||= [];
    byTopic[item.topic].push(Number(item.score));
  }

  const topicRows = Object.entries(byTopic)
    .map(([topic, scores]) => ({
      topic,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length
    }))
    .sort((a, b) => a.avg - b.avg);

  $("#weakTopics").textContent = topicRows[0].topic;

  $("#topicStats").innerHTML = topicRows.map(row => `
    <div class="topic-row">
      <div>
        <strong>${escapeHtml(row.topic)}</strong>
        <p class="muted">${row.count} respuesta(s)</p>
      </div>
      <strong>${row.avg.toFixed(2)}/5</strong>
    </div>
  `).join("");
}

function updateStreak() {
  const sessions = getSessions();
  let streak = 0;
  const date = new Date();

  while (sessions[date.toISOString().slice(0, 10)]) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }

  $("#streak").textContent = streak;
}

function exportProgress() {
  const data = {
    exportedAt: new Date().toISOString(),
    progress: getProgress(),
    sessions: getSessions()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `neuralforge-progress-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function switchView(viewId) {
  $$(".tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.view === viewId);
  });

  $$(".view").forEach(view => {
    view.classList.toggle("active", view.id === viewId);
  });

  renderStats();
  renderErrors();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

$("#startSession").addEventListener("click", startSession);
$("#showCorrection").addEventListener("click", showCorrection);
$("#skipQuestion").addEventListener("click", showNextQuestion);
$("#searchQuestions").addEventListener("input", renderQuestionList);
$("#exportProgress").addEventListener("click", exportProgress);

$$(".tab").forEach(tab => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

$("#scoreButtons").addEventListener("click", event => {
  const button = event.target.closest("button[data-score]");
  if (!button) return;
  saveResult(button.dataset.score);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

loadQuestions();
