let allCases = [];
let allTasks = [];
let currentTaskStatus = 'all';
let currentTaskMember = 'all';

async function loadData() {
  try {
    const res = await fetch('data/data.json');
    const data = await res.json();
    renderDashboard(data);
  } catch (e) {
    document.getElementById('updatedAt').textContent = 'データなし';
  }
}

function renderDashboard(data) {
  const { summary, cases, tasks, business_axes } = data;
  allCases = cases;
  allTasks = tasks;

  document.getElementById('updatedAt').textContent = `更新: ${data.updated_at}`;

  // KPI
  document.getElementById('kpi-active').textContent = summary.active_cases;
  document.getElementById('kpi-negotiating').textContent = summary.negotiating_cases;
  document.getElementById('kpi-tasks').textContent = summary.pending_tasks;
  document.getElementById('kpi-total').textContent = summary.total_cases;

  // 事業軸
  document.getElementById('axes-list').innerHTML = business_axes.map(ax => `
    <div class="axis-row">
      <div class="axis-name">${ax.name}</div>
      <span class="badge ${axisStatusBadge(ax.status)}">${ax.status}</span>
      <div class="axis-note">${ax.note}</div>
    </div>
  `).join('');

  // 進行中案件（ホーム）
  const active = cases.filter(c => c.status === '進行中');
  document.getElementById('active-cases-list').innerHTML = active.length
    ? active.map(c => `
        <div class="item-row">
          <span class="badge ${typeBadge(c.type)}">${c.type || '—'}</span>
          <span style="flex:1">${c.name}</span>
          <span style="color:#999;font-size:12px">${c.members.join('・') || '—'}</span>
        </div>`).join('')
    : '<div class="item-row" style="color:#999">案件なし</div>';

  // 未完了タスク（ホーム・直近5件）
  const pending = tasks.filter(t => t.status !== '完了').slice(0, 5);
  document.getElementById('recent-tasks-list').innerHTML = pending.length
    ? pending.map(t => `
        <div class="item-row">
          <span class="badge ${priorityBadge(t.priority)}">${t.priority.replace(/🔥|⚡|🟡|📝/g, '').trim() || '—'}</span>
          <span style="flex:1">${t.name}</span>
          <span class="badge ${memberBadge(t.member)}">${t.member || '—'}</span>
        </div>`).join('')
    : '<div class="item-row" style="color:#999">タスクなし</div>';

  // 案件テーブル
  renderCasesTable(cases);

  // タスクのメンバーフィルター生成
  const members = ['all', ...new Set(tasks.map(t => t.member).filter(Boolean))];
  document.getElementById('member-filter').innerHTML = members.map(m => `
    <button class="filter-btn ${m === 'all' ? 'active' : ''}" onclick="filterByMember('${m}', this)">
      ${m === 'all' ? 'メンバー全員' : m}
    </button>
  `).join('');

  renderTasksTable(tasks.filter(t => t.status !== '完了'));
}

function renderCasesTable(cases) {
  document.getElementById('cases-tbody').innerHTML = cases.length
    ? cases.map(c => `
        <tr>
          <td><strong>${c.name || '（未入力）'}</strong></td>
          <td><span class="badge ${typeBadge(c.type)}">${c.type || '—'}</span></td>
          <td><span class="badge ${statusBadge(c.status)}">${c.status || '—'}</span></td>
          <td>${c.members.map(m => `<span class="badge ${memberBadge(m)}">${m}</span>`).join(' ') || '—'}</td>
          <td>${c.deadline || '—'}</td>
        </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#999;padding:24px">案件なし</td></tr>';
}

function renderTasksTable(tasks) {
  document.getElementById('tasks-tbody').innerHTML = tasks.length
    ? tasks.map(t => `
        <tr>
          <td><strong>${t.name || '（未入力）'}</strong></td>
          <td style="color:#666;font-size:12px">${t.case_name || '—'}</td>
          <td><span class="badge ${memberBadge(t.member)}">${t.member || '—'}</span></td>
          <td><span class="badge ${priorityBadge(t.priority)}">${t.priority || '—'}</span></td>
          <td><span class="badge ${taskStatusBadge(t.status)}">${t.status || '—'}</span></td>
          <td>${t.deadline || '—'}</td>
        </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;color:#999;padding:24px">タスクなし</td></tr>';
}

function filterCases(status, btn) {
  document.querySelectorAll('#section-cases .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = status === 'all' ? allCases : allCases.filter(c => c.status === status);
  renderCasesTable(filtered);
}

function filterTasks(status, btn) {
  document.querySelectorAll('#section-tasks .filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTaskStatus = status;
  applyTaskFilters();
}

function filterByMember(member, btn) {
  document.querySelectorAll('#member-filter .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTaskMember = member;
  applyTaskFilters();
}

function applyTaskFilters() {
  let filtered = allTasks;
  if (currentTaskStatus !== 'all') filtered = filtered.filter(t => t.status === currentTaskStatus);
  if (currentTaskMember !== 'all') filtered = filtered.filter(t => t.member === currentTaskMember);
  renderTasksTable(filtered);
}

function showSection(name, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  el.classList.add('active');
}

// バッジスタイル
function typeBadge(t) {
  return {'代行':'badge-blue','クリエイティブ':'badge-pink','スクール':'badge-green','コンサル':'badge-orange'}[t] || 'badge-gray';
}
function statusBadge(s) {
  return {'進行中':'badge-blue','商談中':'badge-yellow','完了':'badge-green','保留':'badge-gray'}[s] || 'badge-gray';
}
function taskStatusBadge(s) {
  return {'進行中':'badge-blue','未着手':'badge-gray','完了':'badge-green','保留':'badge-yellow'}[s] || 'badge-gray';
}
function priorityBadge(p) {
  if (!p) return 'badge-gray';
  if (p.includes('最優先')) return 'badge-red';
  if (p.includes('高')) return 'badge-orange';
  if (p.includes('中')) return 'badge-yellow';
  return 'badge-gray';
}
function memberBadge(m) {
  return {'しおりさん':'badge-purple','えりーさん':'badge-pink','上さん':'badge-blue','ひな':'badge-green','げんくん':'badge-orange','こうくん':'badge-yellow'}[m] || 'badge-gray';
}
function axisStatusBadge(s) {
  return {'稼働中':'badge-green','ステイ中':'badge-gray','準備中':'badge-blue'}[s] || 'badge-gray';
}

loadData();
