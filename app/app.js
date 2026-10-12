// 나의 성격유형 테스트 — 40문항 7단계 응답으로 4개 지표 성향 강도를 계산한다.

const AXES = [
  { key: "EI", first: "E", second: "I", firstName: "외향", secondName: "내향" },
  { key: "SN", first: "S", second: "N", firstName: "감각", secondName: "직관" },
  { key: "TF", first: "T", second: "F", firstName: "사고", secondName: "감정" },
  { key: "JP", first: "J", second: "P", firstName: "판단", secondName: "인식" },
];
const PER_PAGE = 5;
const SCALE = [-3, -2, -1, 0, 1, 2, 3]; // 음수 = 왼쪽 문장, 양수 = 오른쪽 문장
const STORE_KEY = "mbti-test:answers";
const MEME_BG = [
  "linear-gradient(160deg, #6c5cff, #ff5c8a)",
  "linear-gradient(160deg, #ff9a3c, #ff5c8a)",
  "linear-gradient(160deg, #20c997, #4c6ef5)",
];

const $ = (id) => document.getElementById(id);
let questions = [];
let types = {};
let answers = {};
let page = 0;
let memeIndex = 0;
let lastResult = null;

const pageCount = () => Math.ceil(questions.length / PER_PAGE);

function show(id) {
  for (const s of document.querySelectorAll(".screen")) s.hidden = s.id !== id;
  window.scrollTo({ top: 0 });
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(answers)); } catch {}
}

// 지표가 번갈아 나오도록 EI, SN, TF, JP 순서로 섞는다
function interleave(list) {
  const byAxis = AXES.map((a) => list.filter((q) => q.axis === a.key));
  const out = [];
  for (let i = 0; out.length < list.length; i++) {
    for (const group of byAxis) if (group[i]) out.push(group[i]);
  }
  return out.map((q, i) => ({ ...q, id: i }));
}

/* ---------- 테스트 ---------- */

function renderPage() {
  const start = page * PER_PAGE;
  const items = questions.slice(start, start + PER_PAGE);
  const box = $("questions");
  box.replaceChildren(...items.map((q) => {
    const card = document.createElement("article");
    card.className = "panel q";
    card.dataset.id = q.id;

    const sides = document.createElement("div");
    sides.className = "sides";
    sides.innerHTML = `<p class="l"></p><p class="r"></p>`;
    sides.querySelector(".l").textContent = q.left;
    sides.querySelector(".r").textContent = q.right;

    const scale = document.createElement("div");
    scale.className = "scale";
    for (const v of SCALE) {
      const b = document.createElement("button");
      b.dataset.v = v;
      b.setAttribute("aria-label", v === 0 ? "반반" : `${v < 0 ? "왼쪽" : "오른쪽"} ${Math.abs(v)}단계`);
      if (answers[q.id] === v) b.classList.add("on");
      b.addEventListener("click", () => answer(q.id, v, card));
      scale.append(b);
    }
    card.append(sides, scale);
    return card;
  }));

  const done = Object.keys(answers).length;
  $("bar").style.width = `${(done / questions.length) * 100}%`;
  $("step").textContent = `${page + 1} / ${pageCount()} 페이지 · ${done}/${questions.length} 문항`;
  $("prev").disabled = page === 0;
  $("next").textContent = page === pageCount() - 1 ? "결과 보기 🎉" : "다음";
}

function answer(id, v, card) {
  answers[id] = v;
  save();
  for (const b of card.querySelectorAll("button")) b.classList.toggle("on", Number(b.dataset.v) === v);
  card.classList.remove("missing");
  const done = Object.keys(answers).length;
  $("bar").style.width = `${(done / questions.length) * 100}%`;
  $("step").textContent = `${page + 1} / ${pageCount()} 페이지 · ${done}/${questions.length} 문항`;

  // 다음 문항으로 자동 스크롤
  const next = card.nextElementSibling;
  if (next) next.scrollIntoView({ behavior: "smooth", block: "center" });
}

function nextPage() {
  const start = page * PER_PAGE;
  const missing = questions.slice(start, start + PER_PAGE).filter((q) => answers[q.id] === undefined);
  if (missing.length) {
    const cards = [...document.querySelectorAll(".q")];
    for (const c of cards) c.classList.toggle("missing", missing.some((q) => q.id === Number(c.dataset.id)));
    document.querySelector(".q.missing").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (page < pageCount() - 1) {
    page++;
    renderPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    showResult(score());
  }
}

/* ---------- 채점 ---------- */

// 각 지표: 첫 글자(E/S/T/J) 쪽 점수를 합산해 0~100%로 환산
function score() {
  const result = AXES.map((axis) => {
    const items = questions.filter((q) => q.axis === axis.key);
    const points = items.map((q) => {
      const v = answers[q.id] ?? 0;
      return q.leftPole === axis.first ? -v : v;
    });
    const sum = points.reduce((a, b) => a + b, 0);
    const max = items.length * 3;
    const pct = Math.round(((sum + max) / (max * 2)) * 100);

    let letter;
    if (pct !== 50) letter = pct > 50 ? axis.first : axis.second;
    else {
      // 동점이면 가장 강하게 답한 문항 쪽으로 결정
      const strongest = points.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
      letter = strongest > 0 ? axis.first : axis.second;
    }
    return { key: axis.key, firstPct: pct, letter };
  });
  return { type: result.map((r) => r.letter).join(""), axes: result.map((r) => r.firstPct) };
}

/* ---------- 결과 ---------- */

function showResult({ type, axes }) {
  lastResult = { type, axes };
  const t = types[type];
  $("r-emoji").textContent = t.emoji;
  $("r-type").textContent = type;
  $("r-nick").textContent = t.nickname;
  $("r-summary").textContent = t.summary;

  $("axes").replaceChildren(...AXES.map((axis, i) => {
    const first = axes[i];
    const second = 100 - first;
    const firstWins = type[i] === axis.first;
    const el = document.createElement("div");
    el.className = "axis";
    el.innerHTML = `
      <div class="labels">
        <span class="${firstWins ? "win" : ""}"><b>${axis.first}</b> ${axis.firstName} ${first}%</span>
        <span class="${firstWins ? "" : "win"}">${second}% ${axis.secondName} <b>${axis.second}</b></span>
      </div>
      <div class="track"><div class="fill"></div></div>`;
    const fill = el.querySelector(".fill");
    // 이긴 쪽에서부터 막대를 채운다
    fill.style.width = `${Math.max(first, second)}%`;
    fill.style[firstWins ? "left" : "right"] = "0";
    if (Math.abs(first - 50) <= 5) {
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = `${axis.first}와 ${axis.second}의 경계에 있어요. 상황에 따라 둘 다 나올 수 있어요!`;
      el.append(note);
    }
    return el;
  }));

  memeIndex = 0;
  renderMeme();

  const li = (text) => Object.assign(document.createElement("li"), { textContent: text });
  $("r-traits").replaceChildren(...t.traits.map(li));
  $("r-strengths").replaceChildren(...t.strengths.map(li));
  $("r-cautions").replaceChildren(...t.cautions.map(li));

  $("r-matches").replaceChildren(...t.matches.map((m) => {
    const el = document.createElement("div");
    el.className = "match";
    el.innerHTML = `<span class="m-t"></span><p><small></small><br><span></span></p>`;
    el.querySelector(".m-t").textContent = m.type;
    el.querySelector("small").textContent = `${types[m.type].emoji} ${types[m.type].nickname}`;
    el.querySelector("p > span").textContent = m.why;
    return el;
  }));

  history.replaceState(null, "", `#r=${type}.${axes.join(".")}`);
  show("result");
}

function renderMeme() {
  const { type } = lastResult;
  const memes = types[type].memes;
  const m = memes[memeIndex];
  const box = $("meme");
  box.style.background = MEME_BG[memeIndex % MEME_BG.length];
  box.innerHTML = `<div class="m-top"></div><div class="m-emoji"></div><div class="m-bottom"></div><span class="m-tag"></span>`;
  box.querySelector(".m-top").textContent = m.top;
  box.querySelector(".m-emoji").textContent = m.emoji;
  box.querySelector(".m-bottom").textContent = m.bottom;
  box.querySelector(".m-tag").textContent = `#${type}`;
  $("meme-count").textContent = `${memeIndex + 1} / ${memes.length}`;
}

function moveMeme(n) {
  const len = types[lastResult.type].memes.length;
  memeIndex = (memeIndex + n + len) % len;
  renderMeme();
}

async function share() {
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    $("toast").textContent = "결과 링크를 복사했어요! 친구에게 보내보세요 💌";
  } catch {
    $("toast").textContent = url;
  }
  setTimeout(() => ($("toast").textContent = ""), 3000);
}

function restart() {
  answers = {};
  save();
  page = 0;
  history.replaceState(null, "", location.pathname);
  $("resume").hidden = true;
  renderPage();
  show("test");
}

// 공유 링크(#r=ENFP.72.61.68.54)로 들어오면 결과를 바로 보여준다
function parseShared() {
  const m = location.hash.match(/^#r=([EI][SN][TF][JP])\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const axes = m.slice(2).map(Number);
  if (axes.some((n) => n > 100)) return null;
  return { type: m[1], axes };
}

async function init() {
  const [q, t] = await Promise.all([
    fetch("data/questions.json").then((r) => r.json()),
    fetch("data/types.json").then((r) => r.json()),
  ]);
  questions = interleave(q);
  types = t;

  try { answers = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { answers = {}; }
  const done = Object.keys(answers).length;
  if (done > 0 && done < questions.length) {
    $("resume").hidden = false;
    $("resume").textContent = `이어서 하기 (${done}/${questions.length})`;
  }

  $("start").addEventListener("click", restart);
  $("resume").addEventListener("click", () => {
    const firstMissing = questions.findIndex((q) => answers[q.id] === undefined);
    page = Math.floor(Math.max(firstMissing, 0) / PER_PAGE);
    renderPage();
    show("test");
  });
  $("prev").addEventListener("click", () => { page--; renderPage(); window.scrollTo({ top: 0 }); });
  $("next").addEventListener("click", nextPage);
  $("meme-prev").addEventListener("click", () => moveMeme(-1));
  $("meme-next").addEventListener("click", () => moveMeme(1));
  $("retry").addEventListener("click", restart);
  $("share").addEventListener("click", share);

  const shared = parseShared();
  if (shared) showResult(shared);
}

init();
