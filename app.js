let allCases = [], allTasks = [];
let allInitiatives = [], allNotes = [], allFinance = [];
let currentCaseFilter = 'all', currentTaskFilter = 'all';
let ganttMode = 'chart'; // 'chart' | 'table'

async function loadData() {
  try {
    const res = await fetch('data/data.json');
    const data = await res.json();
    renderAll(data);
  } catch (e) {
    console.error(e);
    document.getElementById('updatedAt').textContent = 'データなし';
  }
}

function renderAll(data) {
  const { summary, cases, tasks, initiatives = [], notes = [], finance = [] } = data;
  allCases = cases; allTasks = tasks;
  allInitiatives = initiatives; allNotes = notes; allFinance = finance;

  document.getElementById('updatedAt').textContent = `更新: ${data.updated_at}`;

  renderHeroKpi(summary);
  renderDashTasks(tasks.filter(t => t.status !== '完了').slice(0, 8));
  renderGantt(initiatives, ganttMode);
  renderNotesBoard('dash-notes', notes);
  renderFinance('dash-finance', finance);

  renderCasesTable(cases);
  renderTasksTable(tasks.filter(t => t.status !== '完了'));
  renderInitiativesFull(initiatives);
  renderNotesBoard('notes-full', notes);
  renderFinanceFull(finance);
}

// ── ヒーロー KPI ─────────────────────────────────────────────
function renderHeroKpi(summary) {
  document.getElementById('hero-kpi').innerHTML = `
    <div class="hero-stat"><div class="hero-stat-value">${summary.active_cases}</div><div class="hero-stat-label">進行中の案件</div></div>
    <div class="hero-stat"><div class="hero-stat-value">${summary.negotiating_cases}</div><div class="hero-stat-label">商談中</div></div>
    <div class="hero-stat"><div class="hero-stat-value">${summary.pending_tasks}</div><div class="hero-stat-label">未完了タスク</div></div>
    <div class="hero-stat"><div class="hero-stat-value">${summary.total_cases}</div><div class="hero-stat-label">総案件数</div></div>
  `;
}

// ── ダッシュボード：タスクリスト ─────────────────────────────
function renderDashTasks(tasks) {
  const el = document.getElementById('dash-tasks');
  if (!tasks.length) {
    el.innerHTML = '<div class="task-empty">タスクなし</div>';
    return;
  }
  el.innerHTML = tasks.map(t => `
    <div class="task-row">
      <div class="task-checkbox"></div>
      <span class="task-name">${t.name || '（無題）'}</span>
      <span class="badge ${statusBadge(t.status)}">${t.status || '—'}</span>
      ${t.deadline ? `<span class="task-meta">${t.deadline}</span>` : ''}
    </div>
  `).join('');
}

// ── ガントチャート ───────────────────────────────────────────
function renderGantt(initiatives, mode) {
  const el = document.getElementById('dash-gantt');
  if (mode === 'table') {
    renderGanttTable(el, initiatives);
  } else {
    renderGanttChart(el, initiatives);
  }
}

function renderGanttChart(el, initiatives) {
  const withDates = initiatives.filter(i => i.start);
  if (!withDates.length) {
    el.innerHTML = '<div class="gantt-empty">イニシアティブを追加すると<br>タイムラインが表示されます</div>';
    return;
  }

  const today = new Date();
  const allDates = withDates.flatMap(i => [new Date(i.start), new Date(i.end || i.start)]);
  let rangeStart = new Date(Math.min(...allDates));
  let rangeEnd   = new Date(Math.max(...allDates));

  // 前後1週間のバッファ
  rangeStart.setDate(rangeStart.getDate() - 7);
  rangeEnd.setDate(rangeEnd.getDate() + 7);
  const totalDays = (rangeEnd - rangeStart) / 86400000;

  const pct = (d) => Math.max(0, Math.min(100, (d - rangeStart) / (rangeEnd - rangeStart) * 100));

  // 月ラベル（最大6個）
  const months = [];
  const cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (cur <= rangeEnd) {
    months.push({ label: `${cur.getMonth()+1}月`, pct: pct(cur) });
    cur.setMonth(cur.getMonth() + 1);
  }

  const barColors = {
    'ビジネス開拓': '#ec4899',
    'マーケティング': '#f97316',
    'プロジェクト': '#6366f1',
  };

  const statusColors = {
    'in progress': '#6366f1',
    'not started': '#9b9a97',
    'done': '#22c55e',
  };

  const todayPct = pct(today);

  el.innerHTML = `
    <div class="gantt-wrap">
      <div class="gantt-header">
        ${months.map(m => `<div class="gantt-month" style="position:absolute;left:calc(140px + ${m.pct}% * (100% - 140px) / 100)">${m.label}</div>`).join('')}
        <div style="flex:1;height:16px;position:relative;margin-left:140px">
          ${months.map(m => `<div style="position:absolute;left:${m.pct}%;top:0;bottom:0;width:1px;background:#f0f0ef"></div>`).join('')}
        </div>
      </div>
      ${withDates.map(i => {
        const s = pct(new Date(i.start));
        const e = pct(new Date(i.end || i.start));
        const color = barColors[i.category] || statusColors[i.status] || '#6366f1';
        return `
          <div class="gantt-row">
            <div class="gantt-label" title="${i.name}">${i.name}</div>
            <div class="gantt-track">
              <div class="gantt-today" style="left:${todayPct}%"></div>
              <div class="gantt-bar" style="left:${s}%;width:${Math.max(e-s,2)}%;background:${color}">
                ${e - s > 10 ? `<span class="badge ${categoryBadge(i.category)}" style="font-size:9px;padding:0 4px">${i.status}</span>` : ''}
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>
  `;
}

function renderGanttTable(el, initiatives) {
  if (!initiatives.length) {
    el.innerHTML = '<div class="gantt-empty">イニシアティブなし</div>';
    return;
  }
  el.innerHTML = `<div class="gantt-table">${initiatives.map(i => `
    <div class="gantt-table-row">
      <span class="gantt-table-name">${i.name || '（無題）'}</span>
      <span class="badge ${categoryBadge(i.category)}">${i.category || '—'}</span>
      <span class="badge ${initiativeStatusBadge(i.status)}">${i.status || '—'}</span>
      <span class="task-meta">${i.start || '—'} ${i.end && i.end !== i.start ? '→ ' + i.end : ''}</span>
    </div>`).join('')}
  </div>`;
}

function toggleGanttTable(tab) {
  document.querySelectorAll('.db-view-tabs .db-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  ganttMode = ganttMode === 'chart' ? 'table' : 'chart';
  renderGantt(allInitiatives, ganttMode);
  // sibling tab
  const tabs = tab.parentElement.querySelectorAll('.db-tab');
  tabs[0].textContent = ganttMode === 'chart' ? 'タイムライン' : 'タイムライン';
}

// ── ノートボード ─────────────────────────────────────────────
function renderNotesBoard(elId, notes) {
  const el = document.getElementById(elId);
  if (!notes.length) {
    el.innerHTML = '<div class="notes-empty">ノートなし</div>';
    return;
  }
  const groups = {};
  notes.forEach(n => {
    const cat = n.category || 'その他';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(n);
  });
  el.innerHTML = Object.entries(groups).map(([cat, items]) => `
    <div class="notes-col">
      <div class="notes-col-header">${cat}</div>
      ${items.map(n => `
        <div class="note-card">
          <div class="note-card-title">${n.title || '（無題）'}</div>
          ${n.memo ? `<div style="font-size:11px;color:#9b9a97;margin-top:4px;line-height:1.4">${n.memo.slice(0,50)}${n.memo.length>50?'…':''}</div>` : ''}
          ${n.tags.length ? `<div class="note-card-tags">${n.tags.map(t=>`<span class="note-tag">${t}</span>`).join('')}</div>` : ''}
        </div>`).join('')}
    </div>
  `).join('');
}

// ── 売上・稼働（ダッシュボード） ─────────────────────────────
function renderFinance(elId, finance) {
  const el = document.getElementById(elId);
  if (!finance.length) {
    el.innerHTML = '<div class="finance-empty">収支データなし<br><small>収支DBにデータを追加してください</small></div>';
    return;
  }
  const recent = finance.slice(-6);
  const maxIncome = Math.max(...recent.map(f => Math.max(f.income, f.target)), 1);
  const totalIncome = recent.reduce((s,f) => s + f.income, 0);
  const totalExpense = recent.reduce((s,f) => s + f.expense, 0);

  el.innerHTML = `
    <div class="finance-wrap">
      <div class="finance-summary">
        <div class="finance-stat">
          <div class="finance-stat-value">¥${fmt(totalIncome)}</div>
          <div class="finance-stat-label">収入合計</div>
        </div>
        <div class="finance-stat">
          <div class="finance-stat-value">¥${fmt(totalExpense)}</div>
          <div class="finance-stat-label">支出合計</div>
        </div>
        <div class="finance-stat">
          <div class="finance-stat-value" style="color:${totalIncome-totalExpense>=0?'#15803d':'#b91c1c'}">¥${fmt(totalIncome-totalExpense)}</div>
          <div class="finance-stat-label">利益</div>
        </div>
      </div>
      <div class="finance-chart">
        ${recent.map(f => `
          <div class="finance-bar-row">
            <div class="finance-bar-label">${f.month}</div>
            <div class="finance-bar-track">
              ${f.target ? `<div class="finance-bar-fill target" style="width:${f.target/maxIncome*100}%"></div>` : ''}
              <div class="finance-bar-fill" style="width:${f.income/maxIncome*100}%"></div>
            </div>
            <div class="finance-bar-val">¥${fmt(f.income)}</div>
          </div>`).join('')}
      </div>
    </div>
  `;
}

// ── 売上・稼働（フルパネル） ─────────────────────────────────
function renderFinanceFull(finance) {
  renderFinance('finance-full', finance);
}

// ── イニシアティブ（フルパネル） ─────────────────────────────
function renderInitiativesFull(initiatives) {
  const el = document.getElementById('initiatives-full');
  if (!initiatives.length) {
    el.innerHTML = '<div class="task-empty">イニシアティブなし</div>';
    return;
  }
  el.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>イニシアティブ名</th><th>カテゴリ</th><th>ステータス</th><th>担当</th><th>開始</th><th>終了</th></tr></thead>
    <tbody>${initiatives.map(i => `
      <tr>
        <td><strong>${i.name || '（無題）'}</strong></td>
        <td><span class="badge ${categoryBadge(i.category)}">${i.category || '—'}</span></td>
        <td><span class="badge ${initiativeStatusBadge(i.status)}">${i.status || '—'}</span></td>
        <td>${i.assignee || '—'}</td>
        <td>${i.start || '—'}</td>
        <td>${i.end || '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

// ── 案件テーブル ─────────────────────────────────────────────
function renderCasesTable(cases) {
  document.getElementById('cases-tbody').innerHTML = cases.length
    ? cases.map(c => `
        <tr>
          <td><strong>${c.name || '（未入力）'}</strong></td>
          <td><span class="badge ${typeBadge(c.type)}">${c.type || '—'}</span></td>
          <td><span class="badge ${statusBadge(c.status)}">${c.status || '—'}</span></td>
          <td>${c.members.map(m => `<span class="badge badge-gray">${m}</span>`).join(' ') || '—'}</td>
          <td>${c.deadline || '—'}</td>
          <td>${c.amount ? '¥' + fmt(c.amount) : '—'}</td>
        </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;color:#9b9a97;padding:32px">案件なし</td></tr>';
}

function filterCases(status, btn) {
  document.querySelectorAll('#panel-cases .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentCaseFilter = status;
  const filtered = status === 'all' ? allCases : allCases.filter(c => c.status === status);
  renderCasesTable(filtered);
}

// ── タスクテーブル ───────────────────────────────────────────
function renderTasksTable(tasks) {
  document.getElementById('tasks-tbody').innerHTML = tasks.length
    ? tasks.map(t => `
        <tr>
          <td><strong>${t.name || '（未入力）'}</strong></td>
          <td style="color:#9b9a97;font-size:12px">${t.case_name || '—'}</td>
          <td>${t.member ? `<span class="badge badge-purple">${t.member}</span>` : '—'}</td>
          <td><span class="badge ${priorityBadge(t.priority)}">${t.priority || '—'}</span></td>
          <td><span class="badge ${statusBadge(t.status)}">${t.status || '—'}</span></td>
          <td>${t.deadline || '—'}</td>
        </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;color:#9b9a97;padding:32px">タスクなし</td></tr>';
}

function filterTasks(status, btn) {
  document.querySelectorAll('#panel-tasks .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTaskFilter = status;
  const filtered = status === 'all' ? allTasks : allTasks.filter(t => t.status === status);
  renderTasksTable(filtered);
}

// ── パネル切り替え ───────────────────────────────────────────
function showPanel(name) {
  document.querySelectorAll('.panel-wrapper').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`panel-${name}`).classList.add('active');
  event.currentTarget.classList.add('active');
}

// ── バッジ補助 ───────────────────────────────────────────────
function typeBadge(t) {
  return { '代行':'badge-blue','クリエイティブ':'badge-pink','スクール':'badge-green','コンサル':'badge-orange' }[t] || 'badge-gray';
}
function statusBadge(s) {
  return { '進行中':'badge-blue','商談中':'badge-yellow','完了':'badge-green','保留':'badge-gray','未着手':'badge-gray','in progress':'badge-blue','not started':'badge-gray','done':'badge-green' }[s] || 'badge-gray';
}
function priorityBadge(p) {
  if (!p) return 'badge-gray';
  if (p.includes('最優先')) return 'badge-red';
  if (p.includes('高')) return 'badge-orange';
  if (p.includes('中')) return 'badge-yellow';
  return 'badge-gray';
}
function categoryBadge(c) {
  return { 'ビジネス開拓':'badge-pink','マーケティング':'badge-orange','プロジェクト':'badge-blue' }[c] || 'badge-gray';
}
function initiativeStatusBadge(s) {
  return { 'in progress':'badge-blue','not started':'badge-gray','done':'badge-green' }[s] || 'badge-gray';
}
function fmt(n) {
  return Number(n).toLocaleString('ja-JP');
}

loadData();
