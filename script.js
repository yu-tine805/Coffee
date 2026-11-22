const KEY = "studyLedger";
const get = () =>
  JSON.parse(
    localStorage.getItem(KEY) ||
      '{"ratings":{},"study":{},"questions":[],"subjects":["統計學","作業研究","系統分析與設計","工作研究","網頁設計"]}',
  );
const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));
const pad = (n) => String(n).padStart(2, "0");
const key = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

function count() {
  let d = get();

  let pendingCount = d.questions.filter((q) => {
    return !q.done;
  }).length;

  document.getElementById("questionCount").textContent = pendingCount;
}
let cm = new Date(),
  selected;
function isEditableDate(k) {
  let today = new Date();
  today.setHours(0, 0, 0, 0);

  let date = new Date(k + "T00:00:00");

  return date < today;
}
function calInit() {
  let c = document.getElementById("cal");
  if (!c) return;
  let y = new Date(),
    yes = new Date(y);
  yes.setDate(y.getDate() - 1);
  selected = key(yes);
  draw();
  document.getElementById("pm").onclick = () => {
    cm.setMonth(cm.getMonth() - 1);
    draw();
  };
  document.getElementById("nm").onclick = () => {
    cm.setMonth(cm.getMonth() + 1);
    draw();
  };
  document.querySelectorAll("#lights button").forEach((b) => {
    b.onclick = () => {
      let n = +b.dataset.n;

      document
        .querySelectorAll("#lights button")
        .forEach((x) => x.classList.toggle("on", +x.dataset.n <= n));

      document.getElementById("confirm").dataset.score = n;
    };

    b.onmouseenter = () => {
      let n = +b.dataset.n;

      document
        .querySelectorAll("#lights button")
        .forEach((x) => x.classList.toggle("hover-on", +x.dataset.n <= n));
    };

    b.onmouseleave = () => {
      document
        .querySelectorAll("#lights button")
        .forEach((x) => x.classList.remove("hover-on"));
    };
  });
  document.getElementById("confirm").onclick = () => {
    if (!isEditableDate(selected)) return;

    let n = +document.getElementById("confirm").dataset.score;
    if (!n) return;

    let d = get();
    d.ratings[selected] = n;
    save(d);

    draw();

    document
      .querySelectorAll("#lights button")
      .forEach((b) => b.classList.remove("on"));

    document.getElementById("confirm").textContent = "確認修改";
  };
  document.getElementById("cancelRating").onclick = () => {
    document
      .querySelectorAll("#lights button")
      .forEach((b) => b.classList.remove("on"));

    document.getElementById("confirm").dataset.score = "";
  };
  loadRating();
}
function updateWeeklyEffort() {
  let d = get();
  let now = new Date();

  let monday = new Date(now);
  let day = monday.getDay();

  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);

  let sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  let formatDate = (date) => `${date.getMonth() + 1}/${date.getDate()}`;

  document.getElementById("weeklyRange").textContent =
    `${formatDate(monday)} – ${formatDate(sunday)}`;

  let total = 0;
  let days = 0;
  let best = 0;
  let solvedQuestions = 0;

  for (let i = 0; i < 7; i++) {
    let dt = new Date(monday);
    dt.setDate(monday.getDate() + i);

    if (dt > now) continue;

    let k = key(dt);
    let score = d.ratings[k] || 0;

    if (score > 0) {
      total += score;
      days++;
      best = Math.max(best, score);
    }

    solvedQuestions += getSolvedQuestionCount(k);
  }

  document.getElementById("weeklyEffort").textContent = total;

  let percent = Math.min(total / 35, 1) * 100;
  document.getElementById("weeklyEffortBar").style.width = `${percent}%`;

  document.getElementById("weeklyDays").textContent = days;

  let average = days ? (total / days).toFixed(1) : "0";
  document.getElementById("weeklyAverage").textContent = average;

  document.getElementById("weeklyBest").textContent = best;

  document.getElementById("weeklySolvedQuestions").textContent =
    solvedQuestions;

  let message = "這週才剛開始。";

  if (total >= 35) {
    message = "本週達標。做得很好。";
  } else if (total >= 28) {
    message = "快達標了。";
  } else if (total >= 21) {
    message = "這週做得不錯。";
  } else if (total >= 14) {
    message = "已經走了一半。";
  } else if (total >= 7) {
    message = "讀不在三更五鼓，功隻怕一曝十寒。";
  }

  document.getElementById("weeklyMessage").textContent = message;
}
function getSolvedQuestionCount(dateKey) {
  let d = get();

  return d.questions.filter((q) => {
    return q.done && q.resolvedDate === dateKey;
  }).length;
}
function getSubjectBalanceScore(subject) {
  let d = get();
  let today = new Date();

  let monday = startOfWeek(today);
  let sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  let mondayKey = key(monday);
  let sundayKey = key(sunday);

  let records = Object.values(d.studyRecords || {}).filter((record) => {
    return record.date >= mondayKey && record.date <= sundayKey;
  });

  let score = 0;

  // 課中有跟上：每次 +3
  score +=
    records.filter((record) => {
      return record.study?.[`follow|${subject}`];
    }).length * 3;

  // 晚上有補齊：每次 +3
  score +=
    records.filter((record) => {
      return record.study?.[`catch|${subject}`];
    }).length * 3;

  // 這週有複習：每天 5 / 7 分
  let reviewDays = records.filter((record) => {
    return record.study?.[`review|${subject}`];
  }).length;

  score += reviewDays * (5 / 7);

  // 這週有測驗：有測一次就 +2
  let hasQuiz = records.some((record) => {
    return record.study?.[`quiz|${subject}`];
  });

    score +=
      records.filter((record) => {
        return record.study?.[`quiz|${subject}`];
      }).length * 2;

  // 本週新增問題：每個 +1
  score += d.questions.filter((q) => {
    return q.subject === subject && q.date >= mondayKey && q.date <= sundayKey;
  }).length;

  // 本週解決問題：每個 +1
  score += d.questions.filter((q) => {
    return (
      q.subject === subject &&
      q.done &&
      q.resolvedDate &&
      q.resolvedDate >= mondayKey &&
      q.resolvedDate <= sundayKey
    );
  }).length;

  return score;
}
function subjectBalanceInit() {
  let list = document.getElementById("subjectBalanceList");
  if (!list) return;

  let d = get();

  if (!d.subjectBalanceVisible) {
    d.subjectBalanceVisible = {};

    d.subjects.forEach((subject) => {
      d.subjectBalanceVisible[subject] = true;
    });
  }

  d.subjects.forEach((subject) => {
    if (!(subject in d.subjectBalanceVisible)) {
      d.subjectBalanceVisible[subject] = true;
    }
  });

  Object.keys(d.subjectBalanceVisible).forEach((subject) => {
    if (!d.subjects.includes(subject)) {
      delete d.subjectBalanceVisible[subject];
    }
  });

  save(d);

  renderSubjectBalance();

  let settingsButton = document.getElementById("subjectBalanceSettings");

  let menu = document.getElementById("subjectBalanceMenu");

  settingsButton.onclick = (e) => {
    e.stopPropagation();

    let isOpening = !menu.classList.contains("open");

    menu.classList.toggle("open");

    settingsButton.classList.remove("gear-spin-cw", "gear-spin-ccw");

    void settingsButton.offsetWidth;

    settingsButton.classList.add(isOpening ? "gear-spin-cw" : "gear-spin-ccw");
  };

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && e.target !== settingsButton) {
      if (menu.classList.contains("open")) {
        menu.classList.remove("open");

        settingsButton.classList.remove("gear-spin-cw", "gear-spin-ccw");

        void settingsButton.offsetWidth;

        settingsButton.classList.add("gear-spin-ccw");
      }
    }
  });
}

function renderSubjectBalance() {
  let d = get();

  let list = document.getElementById("subjectBalanceList");
  let options = document.getElementById("subjectBalanceOptions");
  let warning = document.getElementById("subjectBalanceWarning");

  if (!list || !options || !warning) return;

  options.innerHTML = d.subjects
    .map(
      (subject) => `
        <label class="subject-option">
          <input
            type="checkbox"
            data-subject="${esc(subject)}"
            ${d.subjectBalanceVisible?.[subject] !== false ? "checked" : ""}
          />
          <span>${esc(subject)}</span>
        </label>
      `,
    )
    .join("");

  options.querySelectorAll("input").forEach((input) => {
    input.onchange = () => {
      let subject = input.dataset.subject;
      let x = get();

      if (!x.subjectBalanceVisible) {
        x.subjectBalanceVisible = {};
      }

      x.subjectBalanceVisible[subject] = input.checked;

      save(x);

      renderSubjectBalance();
    };
  });

  let visibleSubjects = d.subjects.filter((subject) => {
    return d.subjectBalanceVisible?.[subject] !== false;
  });

  if (!visibleSubjects.length) {
    list.innerHTML = `
      <div class="subject-balance-empty">
        尚未選擇顯示科目。
      </div>
    `;

    warning.textContent = "";
    return;
  }

  let scores = visibleSubjects.map((subject) => {
    return {
      subject,
      score: getSubjectBalanceScore(subject),
    };
  });

  list.innerHTML = scores
    .map(
      ({ subject, score }) => `
        <div class="subject-balance-item">
          <div class="subject-balance-label">
            <span>${esc(subject)}</span>
            <strong>${score.toFixed(2)}</strong>
          </div>

          <div class="subject-balance-bar">
            <div
              class="subject-balance-fill"
              style="width:${Math.min(score, 100)}%"
            ></div>
          </div>
        </div>
      `,
    )
    .join("");

  let lowest = scores.reduce((a, b) => {
    return a.score <= b.score ? a : b;
  });

  warning.innerHTML = `
    <span>⚠</span>
    最少投入：${esc(lowest.subject)}
  `;
}
function draw() {
  updateWeeklyEffort();

  let d = get(),
    y = cm.getFullYear(),
    m = cm.getMonth(),
    first = new Date(y, m, 1),
    last = new Date(y, m + 1, 0),
    start = (first.getDay() + 6) % 7,
    total = Math.ceil((start + last.getDate()) / 7) * 7;

  document.getElementById("month").textContent = `${y} 年 ${m + 1} 月`;

  let h = "";

  for (let i = 0; i < total; i++) {
    let n = i - start + 1;

    if (n < 1 || n > last.getDate()) {
      h += '<div class="day emptyday"></div>';
      continue;
    }

    let dt = new Date(y, m, n);
    let k = key(dt);
    let s = d.ratings[k] || 0;
    let isToday = k === key(new Date());
    let solvedCount = getSolvedQuestionCount(k);

    h += `
      <button
        class="day ${k === selected ? "selected " : ""}${isToday ? "today" : ""}"
        data-k="${k}"
      >
        <span>${n}</span>

${solvedCount ? `<span class="solved-count">✓ ${solvedCount}</span>` : ""}

        ${
          isToday
            ? `
            <span class="today-bird" aria-hidden="true">🐦‍⬛</span>
          <svg
  class="fallen-petal"
  viewBox="0 0 100 100"
  aria-hidden="true"
>
  <path
    d="M50 50
       C44 43 39 34 39 25
       C39 17 43 10 50 5
       C57 10 61 17 61 25
       C61 34 56 43 50 50Z"
  ></path>
</svg>
        `
            : ""
        }

        ${
          s
            ? `
          <small class="score">
            ${Array.from(
              { length: s },
              () => `
                <svg class="bolt" viewBox="0 0 20 30" aria-hidden="true">
                  <polygon points="12,0 2,16 9,16 6,30 18,11 11,11"></polygon>
                </svg>
              `,
            ).join("")}
          </small>
        `
            : ""
        }
      </button>
    `;
  }

  document.getElementById("cal").innerHTML = h;

  document.querySelectorAll(".day[data-k]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!isEditableDate(b.dataset.k)) return;

        selected = b.dataset.k;
        draw();
        loadRating();
      }),
  );
}
function loadRating() {
  let d = get(),
    s = d.ratings[selected] || 0,
    x = selected.split("-").map(Number),
    now = new Date(),
    yes = new Date(now);
  yes.setDate(now.getDate() - 1);
  document.getElementById("rdate").textContent =
    selected === key(yes) ? "昨日" : `${x[1]} / ${x[2]}`;

  document.getElementById("confirm").dataset.score = s || "";
  document.getElementById("confirm").textContent = s ? "確認修改" : "確認";
  document.getElementById("hint").textContent = s
    ? `已留下 ${s} / 5 的紀錄。`
    : "選一個最接近當天狀態的程度。";
}
function startOfWeek(date) {
  let d = new Date(date);
  let day = d.getDay();

  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);

  return d;
}

function loadTodayStudy() {
  let d = get();
  let today = key(new Date());

  if (!d.studyDaily) {
    d.studyDaily = {};
  }

  if (!d.studyDaily[today]) {
    d.studyDaily[today] = {};
  }

  d.study = d.studyDaily[today];

  save(d);
}

function prepareStudyData(d) {
  if (!d.studyDaily) {
    d.studyDaily = {};
  }

  if (!d.studyRecords) {
    d.studyRecords = {};
  }

  if (!d.weeklyArchives) {
    d.weeklyArchives = {};
  }

  if (!d.studyTrash) {
    d.studyTrash = {};
  }
}
function tableInit() {
  let table = document.getElementById("study");
  if (!table) return;

  let d = get();

  if (!d.subjects) {
    d.subjects = [
      "統計學",
      "作業研究",
      "系統分析與設計",
      "工作研究",
      "網頁設計",
    ];
  }

  prepareStudyData(d);
  save(d);

  loadTodayStudy();

  renderSubjects();
  archivePreviousWeeks();
  renderWeeklyStudyDetails();

  document.querySelector(".add-text").onclick = addSubject;

  document
    .querySelector(".add-subject input")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") addSubject();
    });

  document.getElementById("saveDailyStudy").onclick = saveDailyStudy;
}
function renderSubjects() {
  let table = document.getElementById("study");
  if (!table) return;

  let d = get();
  let today = key(new Date());

  prepareStudyData(d);

  let todayStudy = d.studyDaily[today] || {};

  table.innerHTML = `
  <div class="cell head">科目</div>
  <div class="cell head">課中有跟上</div>
  <div class="cell head">晚上有補齊</div>
  <div class="cell head">這週有複習</div>
  <div class="cell head">這週測驗有測</div>
  <div class="cell head">備註</div>
  <div class="cell head">對內容有問題</div>
  <div class="cell head">刪除科目</div>
`;

  d.subjects.forEach((subject) => {
    table.insertAdjacentHTML(
      "beforeend",
      `
      <div class="cell label">${esc(subject)}</div>

<div class="check" data-k="follow|${esc(subject)}"></div>
<div class="check" data-k="catch|${esc(subject)}"></div>
<div class="check" data-k="review|${esc(subject)}"></div>
<div class="check" data-k="quiz|${esc(subject)}"></div>

<div
  class="note-cell"
  contenteditable="true"
  data-k="note|${esc(subject)}"
>${esc(todayStudy[`note|${subject}`] || "")}</div>

<div class="problem" data-s="${esc(subject)}">
  <button class="add-icon">＋</button>
</div>

<div class="subject-delete">
  <button class="delete-subject" data-s="${esc(subject)}">刪除</button>
</div>
      `,
    );
  });

  bindStudyEvents();
}
function bindStudyEvents() {
  document.querySelectorAll(".note-cell").forEach((cell) => {
    cell.addEventListener("focus", () => {
      if (cell.innerText.trim() === "") {
        cell.innerHTML = "\u200B";

        let range = document.createRange();
        let selection = window.getSelection();

        range.selectNodeContents(cell);
        range.collapse(false);

        selection.removeAllRanges();
        selection.addRange(range);
      }
    });

    cell.addEventListener("input", () => {
      let d = get();
      let today = key(new Date());

      prepareStudyData(d);

      if (!d.studyDaily[today]) {
        d.studyDaily[today] = {};
      }

      d.studyDaily[today][cell.dataset.k] = cell.innerText
        .replace(/\u200B/g, "")
        .trim();

      d.study = d.studyDaily[today];

      save(d);
    });
  });
  document.querySelectorAll(".check").forEach((e) => {
    let d = get();
    let today = key(new Date());

    prepareStudyData(d);

    if (d.studyDaily[today]?.[e.dataset.k]) {
      e.classList.add("done");
    }

    e.onclick = () => {
      let x = get();
      let today = key(new Date());

      prepareStudyData(x);

      if (!x.studyDaily[today]) {
        x.studyDaily[today] = {};
      }

      x.studyDaily[today][e.dataset.k] = !x.studyDaily[today][e.dataset.k];

      x.study = x.studyDaily[today];

      save(x);

      e.classList.toggle("done", x.studyDaily[today][e.dataset.k]);
    };
  });

  document.querySelectorAll(".problem button").forEach((b) => {
    b.onclick = () => modal(b.parentElement.dataset.s);
  });

  document.querySelectorAll(".delete-subject").forEach((b) => {
    b.onclick = () => {
      let subject = b.dataset.s;

      if (!confirm(`確定要刪除「${subject}」嗎？`)) return;

      let d = get();

      d.subjects = d.subjects.filter((s) => s !== subject);

      if (d.studyDaily) {
        Object.keys(d.studyDaily).forEach((date) => {
          Object.keys(d.studyDaily[date]).forEach((k) => {
            if (k.endsWith(`|${subject}`)) {
              delete d.studyDaily[date][k];
            }
          });
        });
      }

      d.study = d.studyDaily?.[key(new Date())] || {};

      save(d);

      renderSubjects();
    };
  });
}
function addSubject() {
  let input = document.querySelector(".add-subject input");
  let subject = input.value.trim();

  if (!subject) return;

  let d = get();

  if (!d.subjects) {
    d.subjects = [];
  }

  if (d.subjects.includes(subject)) {
    alert("這個科目已經存在！");
    return;
  }

  d.subjects.push(subject);

  save(d);

  input.value = "";

  renderSubjects();
}
function modal(subject) {
  let bg = document.createElement("div");
  bg.className = "modal-bg";
  bg.innerHTML = `<div class="modal"><p class="kicker">NEW QUESTION / ${esc(subject)}</p><h3>把現在卡住的地方寫下來。</h3><textarea id="qt" placeholder="例如：為什麼這個公式要這樣推？"></textarea><div class="actions"><button id="cancel">取消</button><button class="save" id="saveq">加入問題盒子</button></div></div>`;
  document.body.appendChild(bg);
  bg.querySelector("#qt").focus();
  bg.querySelector("#cancel").onclick = () => bg.remove();
  bg.querySelector("#saveq").onclick = () => {
    let t = bg.querySelector("#qt").value.trim();
    if (!t) return;
    let d = get();
    d.questions.push({
      id: Date.now(),
      subject,
      text: t,
      done: false,
      date: key(new Date()),
    });
    save(d);
    bg.remove();
    count();
  };
}
function saveDailyStudy() {
  let d = get();
  let today = key(new Date());

  prepareStudyData(d);

  let todayStudy = {
    ...(d.studyDaily[today] || {}),
  };

  let todayQuestions = d.questions
    .filter((q) => q.date === today)
    .map((q) => ({ ...q }));

  d.studyRecords[today] = {
    date: today,
    subjects: [...d.subjects],
    study: todayStudy,
    questions: todayQuestions,
  };

  // 儲存完成後，把今天目前的勾選清空
  d.studyDaily[today] = {};
  d.study = {};

  save(d);

  // 讓表格立即重新顯示成未選取狀態
  renderSubjects();
  renderWeeklyStudyDetails();

  let button = document.getElementById("saveDailyStudy");

  button.textContent = "已儲存今日紀錄";

  setTimeout(() => {
    button.textContent = "儲存今日學習紀錄";
  }, 1500);
}
function renderStudyTrash() {
  let button = document.getElementById("studyTrashButton");
  let panel = document.getElementById("studyTrashPanel");
  let countBox = document.getElementById("studyTrashCount");

  if (!button || !panel || !countBox) return;

  let d = get();
  prepareStudyData(d);

  let trashItems = Object.values(d.studyTrash).sort((a, b) =>
    (b.deletedAt || "").localeCompare(a.deletedAt || ""),
  );

  countBox.textContent = trashItems.length;
  countBox.hidden = trashItems.length === 0;

  if (!trashItems.length) {
    panel.innerHTML = `
      <div class="study-trash-empty">
        垃圾桶目前是空的。
      </div>
    `;
  } else {
    panel.innerHTML = `
      <div class="study-trash-title">
        <span>DELETED RECORDS</span>
        <strong>${trashItems.length}</strong>
      </div>

      <div class="study-trash-list">
        ${trashItems
          .map((record) => {
            let parts = record.date.split("-").map(Number);
            let dateText = `${parts[1]} / ${parts[2]}`;

            let subjects = record.subjects
              .filter((subject) => {
                let hasStatus = Object.keys(record.study || {}).some(
                  (k) => k.endsWith(`|${subject}`) && record.study[k],
                );

                let hasNote = record.study?.[`note|${subject}`];

                let hasQuestion = record.questions?.some(
                  (q) => q.subject === subject,
                );

                return hasStatus || hasNote || hasQuestion;
              })
              .map((subject) => esc(subject));

            return `
              <div class="study-trash-item">
                <div class="study-trash-item-top">
                  <strong>${dateText}</strong>
                  <span>DAILY RECORD</span>
                </div>

                <div class="study-trash-subjects">
                  ${subjects.length ? subjects.join(" · ") : "沒有學習內容"}
                </div>

                <div class="study-trash-actions">
                  <button
                    class="restore-study"
                    data-date="${record.date}"
                  >
                    收回
                  </button>

                  <button
                    class="permanent-delete-study"
                    data-date="${record.date}"
                  >
                    永久刪除
                  </button>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  button.onclick = (e) => {
    e.stopPropagation();
    panel.classList.toggle("open");
  };

  panel.onclick = (e) => {
    e.stopPropagation();
  };

  panel.querySelectorAll(".restore-study").forEach((button) => {
    button.onclick = () => {
      let date = button.dataset.date;
      let d = get();

      if (!d.studyTrash?.[date]) return;

      d.studyRecords[date] = d.studyTrash[date];
      delete d.studyTrash[date];

      save(d);

      renderWeeklyStudyDetails();
    };
  });

  panel.querySelectorAll(".permanent-delete-study").forEach((button) => {
    button.onclick = () => {
      let date = button.dataset.date;
      let d = get();

      if (!d.studyTrash?.[date]) return;

      if (!confirm(`${date} 的學習明細將永久刪除，之後無法收回。確定嗎？`)) {
        return;
      }

      delete d.studyTrash[date];

      save(d);

      renderWeeklyStudyDetails();
    };
  });
}
function renderWeeklyStudyDetails() {
  let box = document.getElementById("weeklyStudyDetails");
  if (!box) return;

  let d = get();
  prepareStudyData(d);
  renderStudyTrash();

  let today = new Date();
  today.setHours(23, 59, 59, 999);

  let monday = startOfWeek(today);

  let records = Object.values(d.studyRecords)
    .filter((record) => {
      let date = new Date(record.date + "T00:00:00");

      return date >= monday && date <= today;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!records.length) {
    box.innerHTML = `
      <div class="weekly-detail-empty">
        本週還沒有儲存任何學習紀錄。
      </div>
    `;
    return;
  }

  const labels = {
    follow: "課中有跟上",
    catch: "晚上有補齊",
    review: "這週有複習",
    quiz: "這週測驗有測",
  };

  box.innerHTML = records
    .map((record) => {
      let parts = record.date.split("-").map(Number);
      let dateText = `${parts[1]} / ${parts[2]}`;

      let subjectDetails = record.subjects
        .map((subject) => {
          let statuses = Object.entries(labels)
            .filter(([type]) => record.study[`${type}|${subject}`])
            .map(([, label]) => label);
          let note = record.study[`note|${subject}`] || "";
          let questions = record.questions
            .filter((q) => q.subject === subject)
            .map((q) => esc(q.text));

          if (!statuses.length && !note && !questions.length) {
            return "";
          }

          return `
            <div class="receipt-subject">
              <strong>${esc(subject)}</strong>

              ${
                statuses.length
                  ? `<div class="receipt-status">
                      ${statuses.map((s) => `<span>✓ ${s}</span>`).join("")}
                    </div>`
                  : ""
              }

              ${
                questions.length
                  ? `<div class="receipt-question">
                      <span>問題</span>
                      ${questions.map((q) => `<p>${q}</p>`).join("")}
                    </div>`
                  : ""
              }

              ${
                note
                  ? `<div class="receipt-note">
        <span>備註</span>
        <p>${esc(note)}</p>
      </div>`
                  : ""
              }
            </div>
          `;
        })
        .join("");

      return `
  <article class="study-receipt" data-date="${record.date}">
    <div class="receipt-content">
      <div class="receipt-top">
        <span>STUDY LEDGER</span>
        <span>DAILY RECORD</span>
      </div>

      <div class="receipt-date">
        ${dateText}
      </div>

      <div class="receipt-line"></div>

      ${subjectDetails || `<p class="receipt-empty">今天沒有勾選學習項目。</p>`}

      <div class="receipt-line"></div>

      <div class="receipt-bottom">
        <span>DAILY STUDY RECORD</span>
        <span>${dateText}</span>
      </div>
    </div>

<button
  class="receipt-delete"
  data-date="${record.date}"
  aria-label="刪除這筆學習明細"
>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 7h14"></path>
    <path d="M9 7V4h6v3"></path>
    <path d="M7 7l1 13h8l1-13"></path>
    <path d="M10 11v5"></path>
    <path d="M14 11v5"></path>
  </svg>
</button>
  </article>
`;
    })
    .join("");

  document.querySelectorAll(".receipt-delete").forEach((button) => {
    button.onclick = () => {
      let date = button.dataset.date;

      let d = get();
      prepareStudyData(d);

      let record = d.studyRecords[date];

      if (!record) return;

      d.studyTrash[date] = {
        ...record,
        deletedAt: new Date().toISOString(),
      };

      delete d.studyRecords[date];

      save(d);

      renderWeeklyStudyDetails();
    };
  });
}
function archivePreviousWeeks() {
  let d = get();

  prepareStudyData(d);

  let today = new Date();
  let currentMonday = startOfWeek(today);

  let changed = false;

  Object.keys(d.studyRecords).forEach((dateKey) => {
    let date = new Date(dateKey + "T00:00:00");
    let monday = startOfWeek(date);

    if (monday >= currentMonday) return;

    let sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    let weekKey = `${key(monday)}_${key(sunday)}`;

    if (!d.weeklyArchives[weekKey]) {
      d.weeklyArchives[weekKey] = {
        start: key(monday),
        end: key(sunday),
        records: [],
        effort: 0,
      };
    }

    let archive = d.weeklyArchives[weekKey];

    if (!archive.records.some((r) => r.date === dateKey)) {
      archive.records.push(d.studyRecords[dateKey]);
      changed = true;
    }
  });

  Object.values(d.weeklyArchives).forEach((archive) => {
    let monday = new Date(archive.start + "T00:00:00");

    let effort = 0;

    for (let i = 0; i < 7; i++) {
      let dt = new Date(monday);
      dt.setDate(monday.getDate() + i);

      effort += d.ratings[key(dt)] || 0;
    }

    archive.effort = effort;
    archive.days = archive.records.length;
  });

  if (changed) {
    save(d);
  }
}
function questions() {
  let box = document.getElementById("questions");
  if (!box) return;

  // 進入問題盒子時，先確認上一週是否需要歸檔
  archivePreviousWeeks();

  let d = get();

  count();

  /* =========================
   ① 收集的問題
========================= */

  let today = key(new Date());

  let pendingQuestions = d.questions.filter((q) => {
    // 尚未解決 → 一直留在待處理區
    if (!q.done) return true;

    // 已解決 → 暫時保留兩天
    if (!q.resolvedDate) return false;

    let resolved = new Date(q.resolvedDate + "T00:00:00");
    let current = new Date(today + "T00:00:00");

    let daysPassed = Math.floor((current - resolved) / (1000 * 60 * 60 * 24));

    return daysPassed <= 2;
  });

  let solvedQuestions = d.questions.filter((q) => {
    return q.done && q.resolvedDate;
  });

  function renderQuestionGroups(questions, solved = false) {
    if (!questions.length) {
      return `
      <div class="question-empty">
        ${solved ? "目前還沒有已解決的問題。" : "目前沒有待處理的問題。"}
      </div>
    `;
    }

    let subs = [...new Set(questions.map((q) => q.subject))];

    return subs
      .map(
        (s) => `
        <section class="qgroup">
          <span class="subject">${esc(s)}</span>

          <ol>
            ${questions
              .filter((q) => q.subject === s)
              .map((q) => {
                let dateStamp = "";

                if (solved && q.resolvedDate) {
                  let [y, m, d] = q.resolvedDate.split("-").map(Number);

                  dateStamp = `
                    <span class="resolved-stamp">
                      ${y - 1911}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")}
                      解決
                    </span>
                  `;
                }

                return `
                  <li
                    class="qitem ${q.done && !solved ? "today-done" : ""}"
                    data-id="${q.id}"
                  >
                    <span class="question-text">
                      ${esc(q.text)}
                    </span>

                    ${dateStamp}

                    ${
                      !solved
                        ? `
                          <button class="resolve">
                            ${q.done ? "撤回" : "解決"}
                          </button>
                        `
                        : ""
                    }

                    <button class="del">刪除</button>
                  </li>
                `;
              })
              .join("")}
          </ol>
        </section>
      `,
      )
      .join("");
  }

  document.getElementById("empty").style.display = d.questions.length
    ? "none"
    : "block";

  box.innerHTML = `
  <div class="question-columns">

   <section class="question-panel solved-panel">
  <div class="question-panel-header">
    <div class="question-panel-title-row">
      <div>
        <p class="kicker">SOLVED</p>
        <h2>已解決</h2>
      </div>

<span class="question-count-label">
  ${solvedQuestions.length} QUESTIONS
</span>
    </div>

      <div class="question-scroll">
        ${renderQuestionGroups(solvedQuestions, true)}
      </div>
    </section>


    <div class="question-gap"></div>


<section class="question-panel pending-panel">
  <div class="question-panel-header">
    <div class="question-panel-title-row">
      <div>
        <p class="kicker">PENDING</p>
        <h2>待處理</h2>
      </div>

<span class="question-count-label">
  ${pendingQuestions.filter((q) => !q.done).length} QUESTIONS
</span>
    </div>

      <div class="question-scroll">
        ${renderQuestionGroups(pendingQuestions, false)}
      </div>
    </section>

  </div>
`;

  /* =========================
     ② 每週努力值紀錄
  ========================= */

  let history = document.getElementById("weeklyHistory");

  let archives = Object.values(d.weeklyArchives || {}).sort((a, b) =>
    b.start.localeCompare(a.start),
  );

  if (!archives.length) {
    history.innerHTML = `
      <div class="archive-empty">
        目前還沒有完成的週紀錄。
      </div>
    `;
  } else {
    history.innerHTML = archives
      .map((archive) => {
        let start = archive.start.split("-").map(Number);
        let end = archive.end.split("-").map(Number);

        let range =
          `${start[0]} / ${start[1]} / ${start[2]} – ` +
          `${end[0]} / ${end[1]} / ${end[2]}`;

        let percent = Math.min((archive.effort || 0) / 35, 1) * 100;

        return `
          <article class="effort-history-card">
            <div class="effort-history-top">
              <span>${range}</span>
              <strong>${archive.effort || 0} / 35</strong>
            </div>

            <div class="effort-history-bar">
              <div style="width:${percent}%"></div>
            </div>

            <div class="effort-history-bottom">
              <span>${archive.days || 0} 天有學習紀錄</span>
              ${
                archive.effort >= 35
                  ? `<span class="effort-achieved">本週達標</span>`
                  : ""
              }
            </div>
          </article>
        `;
      })
      .join("");
  }

  /* =========================
     ③ 每週學習追蹤明細
  ========================= */

  let archiveBox = document.getElementById("weeklyArchives");

  if (!archives.length) {
    archiveBox.innerHTML = `
      <div class="archive-empty">
        目前還沒有完成的週明細。
      </div>
    `;
  } else {
    archiveBox.innerHTML = archives
      .map((archive) => {
        let start = archive.start.split("-").map(Number);
        let end = archive.end.split("-").map(Number);

        let range =
          `${start[0]} / ${start[1]} / ${start[2]} – ` +
          `${end[0]} / ${end[1]} / ${end[2]}`;

        let records = [...archive.records].sort((a, b) =>
          a.date.localeCompare(b.date),
        );

        let dailyRecords = records
          .map((record) => {
            let parts = record.date.split("-").map(Number);
            let dateText = `${parts[1]} / ${parts[2]}`;

            const labels = {
              miss: "當天沒跟上",
              catch: "當晚有補齊",
              review: "當週有複習",
              quiz: "當週測驗有測",
            };

            let subjectDetails = record.subjects
              .map((subject) => {
                let statuses = Object.entries(labels)
                  .filter(([type]) => record.study?.[`${type}|${subject}`])
                  .map(([, label]) => label);
                let note = record.study?.[`note|${subject}`] || "";
                let qs = record.questions
                  .filter((q) => q.subject === subject)
                  .map((q) => esc(q.text));

                if (!statuses.length && !note && !qs.length) {
                  return "";
                }

                return `
                  <div class="receipt-subject">
                    <strong>${esc(subject)}</strong>

                    ${
                      statuses.length
                        ? `<div class="receipt-status">
                            ${statuses
                              .map((s) => `<span>✓ ${s}</span>`)
                              .join("")}
                          </div>`
                        : ""
                    }

                    ${
                      qs.length
                        ? `<div class="receipt-question">
                            <span>問題</span>
                            ${qs.map((q) => `<p>${q}</p>`).join("")}
                          </div>`
                        : ""
                    }

                    ${
                      note
                        ? `<div class="receipt-note">
        <span>細項備註</span>
        <p>${esc(note)}</p>
      </div>`
                        : ""
                    }
                  </div>
                `;
              })
              .join("");

            return `
              <article class="study-receipt">
                <div class="receipt-top">
                  <span>STUDY LEDGER</span>
                  <span>DAILY RECORD</span>
                </div>

                <div class="receipt-date">
                  ${dateText}
                </div>

                <div class="receipt-line"></div>

                ${
                  subjectDetails ||
                  `<p class="receipt-empty">
                    今天沒有勾選學習項目。
                  </p>`
                }

                <div class="receipt-line"></div>

                <div class="receipt-bottom">
                  <span>DAILY STUDY RECORD</span>
                  <span>${dateText}</span>
                </div>
              </article>
            `;
          })
          .join("");

        return `
          <article class="weekly-archive-card">
            <div class="weekly-archive-heading">
              <div>
                <p class="kicker">ARCHIVED WEEK</p>
                <h3>${range}</h3>
              </div>

              <strong>${archive.effort || 0} / 35</strong>
            </div>

            <div class="weekly-archive-records">
              ${dailyRecords}
            </div>
          </article>
        `;
      })
      .join("");
  }

  /* =========================
     問題按鈕
  ========================= */

  box.querySelectorAll(".resolve").forEach((b) => {
    b.onclick = () => {
      let d = get();

      let q = d.questions.find((x) => x.id == b.parentElement.dataset.id);

      if (!q.done) {
        q.done = true;
        q.resolvedDate = key(new Date());
      } else {
        q.done = false;
        q.resolvedDate = null;
      }

      save(d);
      questions();
    };
  });

  box.querySelectorAll(".del").forEach((b) => {
    b.onclick = () => {
      let d = get();

      d.questions = d.questions.filter(
        (q) => q.id != b.parentElement.dataset.id,
      );

      save(d);
      questions();
    };
  });
}
document.addEventListener("DOMContentLoaded", () => {
  count();
  calInit();
  tableInit();
  questions();
  subjectBalanceInit();
});
