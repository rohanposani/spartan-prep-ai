// ── State ──
let currentDate = new Date();
let currentView = "day"; // "day" or "month"
let monthDate = new Date(); // tracks which month is displayed
let monthSummary = {};
let selectedMonthDay = null;
let tasks = [];
let journalData = {};
let reminderTimers = [];

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ── Date Helpers ──
function fmtDate(d) {
  return d.toISOString().split("T")[0];
}

function fmtDateFromParts(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function fmtDisplay(d) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fmtMonthYear(d) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function fmtTime12(t24) {
  const [h, m] = t24.split(":");
  const hr = parseInt(h);
  const ampm = hr >= 12 ? "PM" : "AM";
  const hr12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  return `${hr12}:${m} ${ampm}`;
}

function getHour(t24) {
  return parseInt(t24.split(":")[0]);
}

// ── Time Picker ──
function populateTimeSelect() {
  const sel = document.getElementById("task-time");
  if (!sel) return;
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = fmtTime12(val);
      sel.appendChild(opt);
    }
  }
}

// ── API ──
async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  return res.json();
}

// ══════════════════════════════════════
// ── VIEW SWITCHING ──
// ══════════════════════════════════════

function switchView(view) {
  currentView = view;

  // Update toggle buttons
  $$(".view-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  // Show/hide views
  $("#day-view").style.display = view === "day" ? "" : "none";
  $("#month-view").style.display = view === "month" ? "" : "none";

  if (view === "day") {
    updateDateDisplay();
    loadTasks();
    loadJournal();
  } else {
    monthDate = new Date(currentDate);
    updateDateDisplay();
    loadMonthView();
  }
}

// ── Navigation (works for both views) ──
function navPrev() {
  if (currentView === "day") {
    currentDate.setDate(currentDate.getDate() - 1);
    updateDateDisplay();
    loadTasks();
    loadJournal();
  } else {
    monthDate.setMonth(monthDate.getMonth() - 1);
    updateDateDisplay();
    loadMonthView();
  }
}

function navNext() {
  if (currentView === "day") {
    currentDate.setDate(currentDate.getDate() + 1);
    updateDateDisplay();
    loadTasks();
    loadJournal();
  } else {
    monthDate.setMonth(monthDate.getMonth() + 1);
    updateDateDisplay();
    loadMonthView();
  }
}

function goToday() {
  currentDate = new Date();
  monthDate = new Date();
  updateDateDisplay();
  if (currentView === "day") {
    loadTasks();
    loadJournal();
  } else {
    loadMonthView();
  }
}

function updateDateDisplay() {
  const el = $(".current-date");
  if (!el) return;
  if (currentView === "day") {
    el.textContent = fmtDisplay(currentDate);
  } else {
    el.textContent = fmtMonthYear(monthDate);
  }
}

// ══════════════════════════════════════
// ── DAY VIEW ──
// ══════════════════════════════════════

async function loadTasks() {
  const dateStr = fmtDate(currentDate);
  tasks = await api(`/tasks?date=${dateStr}`);
  renderTaskList();
  renderCalendar();
  renderStats();
  setupReminders();
}

async function loadJournal() {
  const dateStr = fmtDate(currentDate);
  journalData = await api(`/journal?date=${dateStr}`);
  renderJournal();
}

function renderCalendar() {
  const container = $(".time-slots");
  if (!container) return;

  let minHour = 6;
  let maxHour = 22;
  if (tasks.length > 0) {
    const hours = tasks.map((t) => getHour(t.due_time));
    minHour = Math.min(minHour, Math.min(...hours));
    maxHour = Math.max(maxHour, Math.max(...hours) + 1);
  }

  let html = "";
  for (let h = minHour; h <= maxHour; h++) {
    const hourStr = h.toString().padStart(2, "0") + ":00";
    const hourTasks = tasks.filter((t) => getHour(t.due_time) === h);

    html += `<div class="time-slot" data-hour="${h}">
      <div class="time-label">${fmtTime12(hourStr)}</div>
      <div class="time-slot-tasks">`;

    for (const task of hourTasks) {
      html += renderTaskItem(task);
    }

    html += `</div></div>`;
  }

  container.innerHTML = html;

  // Place current time marker
  const now = new Date();
  if (fmtDate(now) === fmtDate(currentDate)) {
    const nowH = now.getHours();
    const nowM = now.getMinutes();
    if (nowH >= minHour && nowH <= maxHour) {
      const slot = container.querySelector(`[data-hour="${nowH}"]`);
      if (slot) {
        const marker = document.createElement("div");
        marker.className = "now-marker";
        const pct = nowM / 60;
        marker.style.top = `${slot.offsetTop + slot.offsetHeight * pct}px`;
        container.appendChild(marker);
      }
    }
  }

  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <p>No tasks for today. Add one above to get started.</p>
      </div>`;
  }
}

function renderTaskItem(task) {
  const cClass = task.completed ? "completed" : "";
  const chClass = task.completed ? "checked" : "";
  return `
    <div class="task-item ${cClass}" style="border-left-color: ${task.color}; background: ${task.color}10;">
      <div class="task-check ${chClass}" onclick="toggleTask(${task.id}, ${task.completed})"></div>
      <span class="task-title">${escHtml(task.title)}</span>
      <span class="task-time">${fmtTime12(task.due_time)}</span>
      <button class="task-delete" onclick="deleteTask(${task.id})" title="Delete">&times;</button>
    </div>`;
}

function renderStats() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const statsEl = $(".stats-bar");
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat"><span class="stat-num">${total}</span> tasks</div>
      <div class="stat"><span class="stat-num">${done}</span> completed</div>
      <div class="stat"><span class="stat-num">${total - done}</span> remaining</div>`;
  }
}

function renderTaskList() {
  const container = $(".task-list");
  if (!container) return;

  if (tasks.length === 0) {
    container.innerHTML = "";
    return;
  }

  const sorted = [...tasks].sort((a, b) => a.due_time.localeCompare(b.due_time));
  let html = '<div class="task-list-title">Tasks</div><div class="task-list-items">';
  for (const task of sorted) {
    const checkedClass = task.completed ? "checked" : "";
    const completedClass = task.completed ? "completed" : "";
    html += `
      <div class="task-list-item ${completedClass}" style="border-left-color: ${task.color};">
        <div class="task-list-check ${checkedClass}" onclick="toggleTask(${task.id}, ${task.completed})"></div>
        <span class="task-list-item-title">${escHtml(task.title)}</span>
        <span class="task-list-item-time">${fmtTime12(task.due_time)}</span>
      </div>`;
  }
  html += "</div>";
  container.innerHTML = html;
}

function renderJournal() {
  const qEl = $(".journal-question");
  const tEl = $(".journal-textarea");
  if (qEl && journalData.question) {
    qEl.textContent = `"${journalData.question}"`;
  }
  if (tEl) {
    tEl.value = journalData.entry || "";
  }
}

// ── Day View Actions ──
async function addTask() {
  const titleEl = $("#task-title");
  const timeEl = $("#task-time");
  const colorEl = $("#task-color");

  const title = titleEl.value.trim();
  const time = timeEl.value;
  if (!title || !time) return;

  await api("/tasks", {
    method: "POST",
    body: JSON.stringify({
      title,
      due_time: time,
      date: fmtDate(currentDate),
      color: colorEl.value,
    }),
  });

  titleEl.value = "";
  timeEl.selectedIndex = 0;
  loadTasks();
}

async function toggleTask(id, currentState) {
  await api(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ completed: currentState ? 0 : 1 }),
  });
  loadTasks();
}

async function deleteTask(id) {
  await api(`/tasks/${id}`, { method: "DELETE" });
  loadTasks();
}

let journalSaveTimeout;
function onJournalInput(e) {
  clearTimeout(journalSaveTimeout);
  const status = $(".journal-save-status");
  if (status) status.textContent = "Typing...";
  journalSaveTimeout = setTimeout(async () => {
    await api("/journal", {
      method: "POST",
      body: JSON.stringify({
        date: fmtDate(currentDate),
        entry: e.target.value,
      }),
    });
    if (status) status.textContent = "Saved";
    setTimeout(() => {
      if (status) status.textContent = "";
    }, 2000);
  }, 800);
}

// ══════════════════════════════════════
// ── MONTH VIEW ──
// ══════════════════════════════════════

async function loadMonthView() {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth() + 1;
  monthSummary = await api(`/month?year=${year}&month=${month}`);
  selectedMonthDay = null;
  renderMonthGrid();
  $("#month-detail").style.display = "none";
}

function renderMonthGrid() {
  const grid = $(".month-grid");
  if (!grid) return;

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth(); // 0-indexed
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const todayStr = fmtDate(new Date());
  let html = "";

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    html += `<div class="month-cell other-month">
      <div class="month-cell-day">${d}</div>
    </div>`;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = fmtDateFromParts(year, month + 1, d);
    const info = monthSummary[dateStr];
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedMonthDay;

    let classes = "month-cell";
    if (isToday) classes += " today";
    if (isSelected) classes += " selected";

    let indicators = "";
    if (info) {
      const total = info.tasks || 0;
      const done = info.done || 0;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;

      if (total > 0) {
        indicators += `<div class="month-cell-tasks">
          <span class="month-cell-dot tasks"></span>
          ${done}/${total} tasks
        </div>`;
        indicators += `<div class="month-cell-bar">
          <div class="month-cell-bar-fill" style="width:${pct}%"></div>
        </div>`;
      }
      if (info.journal) {
        indicators += `<div class="month-cell-journal-indicator">journal</div>`;
      }
    }

    html += `<div class="${classes}" onclick="selectMonthDay('${dateStr}')" data-date="${dateStr}">
      <div class="month-cell-day">${d}</div>
      <div class="month-cell-indicators">${indicators}</div>
    </div>`;
  }

  // Next month leading days to fill the grid
  const totalCells = firstDay + daysInMonth;
  const remainder = totalCells % 7;
  if (remainder > 0) {
    for (let d = 1; d <= 7 - remainder; d++) {
      html += `<div class="month-cell other-month">
        <div class="month-cell-day">${d}</div>
      </div>`;
    }
  }

  grid.innerHTML = html;
}

async function selectMonthDay(dateStr) {
  selectedMonthDay = dateStr;

  // Highlight selected cell
  $$(".month-cell.selected").forEach((el) => el.classList.remove("selected"));
  const cell = $(`.month-cell[data-date="${dateStr}"]`);
  if (cell) cell.classList.add("selected");

  // Load day's data
  const [dayTasks, dayJournal] = await Promise.all([
    api(`/tasks?date=${dateStr}`),
    api(`/journal?date=${dateStr}`),
  ]);

  renderMonthDetail(dateStr, dayTasks, dayJournal);
}

function renderMonthDetail(dateStr, dayTasks, dayJournal) {
  const panel = $("#month-detail");
  panel.style.display = "";

  // Date title
  const dateObj = new Date(dateStr + "T12:00:00");
  $(".month-detail-date").textContent = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Tasks
  const tasksContainer = $(".month-detail-tasks");
  if (dayTasks.length === 0) {
    tasksContainer.innerHTML = `<div class="month-detail-empty">No tasks for this day</div>`;
  } else {
    tasksContainer.innerHTML = dayTasks
      .map((t) => {
        const doneClass = t.completed ? "completed" : "";
        const statusClass = t.completed ? "done" : "";
        return `<div class="month-detail-task ${doneClass}" style="border-left-color: ${t.color};">
          <div class="month-detail-task-status ${statusClass}"></div>
          <span>${escHtml(t.title)}</span>
          <span class="month-detail-task-time">${fmtTime12(t.due_time)}</span>
        </div>`;
      })
      .join("");
  }

  // Journal
  const journalQ = $(".month-detail-journal-q");
  const journalE = $(".month-detail-journal-entry");

  if (dayJournal.question) {
    journalQ.textContent = `"${dayJournal.question}"`;
  } else {
    journalQ.textContent = "";
  }

  if (dayJournal.entry) {
    journalE.textContent = dayJournal.entry;
    journalE.classList.remove("empty");
  } else {
    journalE.textContent = "No journal entry for this day.";
    journalE.classList.add("empty");
  }
}

// Open day in day view for editing
function openDayForEditing(dateStr) {
  currentDate = new Date(dateStr + "T12:00:00");
  switchView("day");
}

// ══════════════════════════════════════
// ── REMINDERS ──
// ══════════════════════════════════════

function setupReminders() {
  reminderTimers.forEach((t) => clearTimeout(t));
  reminderTimers = [];

  const now = new Date();
  if (fmtDate(now) !== fmtDate(currentDate)) return;

  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  for (const task of tasks) {
    if (task.completed) continue;

    const [h, m] = task.due_time.split(":").map(Number);
    const taskTime = new Date();
    taskTime.setHours(h, m, 0, 0);

    const reminderTime = new Date(taskTime.getTime() - 10 * 60 * 1000);
    const msUntilReminder = reminderTime.getTime() - now.getTime();

    if (msUntilReminder > 0) {
      const timer = setTimeout(() => {
        showReminder(task);
      }, msUntilReminder);
      reminderTimers.push(timer);
    }

    const msUntilDue = taskTime.getTime() - now.getTime();
    if (msUntilDue > 0) {
      const timer = setTimeout(() => {
        showReminder(task, true);
      }, msUntilDue);
      reminderTimers.push(timer);
    }
  }
}

function showReminder(task, isDue = false) {
  const prefix = isDue ? "Due now" : "Coming up in 10 min";

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(`${prefix}: ${task.title}`, {
      body: `Scheduled for ${fmtTime12(task.due_time)}`,
      icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📋</text></svg>",
    });
  }

  const container = $(".toast-container");
  if (container) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
      <div class="toast-title">${prefix}</div>
      <div class="toast-body">${escHtml(task.title)} — ${fmtTime12(task.due_time)}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 8000);
  }
}

// ── Utilities ──
function escHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// ── Keyboard shortcut ──
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "task-title") {
    addTask();
  }
});

// ── Init ──
document.addEventListener("DOMContentLoaded", () => {
  populateTimeSelect();
  updateDateDisplay();
  loadTasks();
  loadJournal();

  setInterval(() => {
    if (currentView === "day" && fmtDate(new Date()) === fmtDate(currentDate)) {
      renderCalendar();
    }
  }, 60000);
});
