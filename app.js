let allCases = [];

async function loadData() {
  try {
    const res = await fetch('data/data.json');
    const data = await res.json();
    renderDashboard(data);
  } catch (e) {
    console.error('データ読み込みエラー:', e);
    document.getElementById('updatedAt').textContent = 'データなし';
  }
}

function renderDashboard(data) {
  const { summary, cases, clients, finance } = data;
  allCases = cases;

  // 更新日時
  document.getElementById('updatedAt').textContent = `更新: ${data.updated_at}`;

  // KPI
  document.getElementById('kpi-active').textContent = summary.active_cases;
  document.getElementById('kpi-negotiating').textContent = summary.negotiating_cases;
  document.getElementById('kpi-clients').textContent = summary.total_clients;
  document.getElementById('kpi-income').textContent = summary.total_income.toLocaleString();

  // 収支グラフ
  renderFinanceChart(finance);

  // 進行中案件リスト
  const activeCases = cases.filter(c => c.status === '進行中');
  const activeCasesList = document.getElementById('active-cases-list');
  if (activeCases.length === 0) {
    activeCasesList.innerHTML = '<div class="item-row" style="color:#999">案件なし</div>';
  } else {
    activeCasesList.innerHTML = activeCases.map(c => `
      <div class="item-row">
        <span class="${typeBadge(c.type)} badge">${c.type || '—'}</span>
        <span style="flex:1">${c.name}</span>
        ${c.amount ? `<span style="color:#4f46e5;font-weight:600">¥${c.amount.toLocaleString()}</span>` : ''}
      </div>
    `).join('');
  }

  // クライアントリスト
  const clientsList = document.getElementById('clients-list');
  clientsList.innerHTML = clients.slice(0, 6).map(c => `
    <div class="item-row">
      <span class="${relationBadge(c.relation)} badge">${c.relation || '—'}</span>
      <span style="flex:1">${c.name}</span>
      <span style="color:#999;font-size:12px">${c.industry || ''}</span>
    </div>
  `).join('');

  // 案件テーブル
  renderCasesTable(cases);

  // クライアントテーブル
  document.getElementById('clients-tbody').innerHTML = clients.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td><span class="${relationBadge(c.relation)} badge">${c.relation || '—'}</span></td>
      <td>${c.industry || '—'}</td>
      <td style="color:#666">${c.memo || '—'}</td>
    </tr>
  `).join('');

  // 収支テーブル
  document.getElementById('finance-tbody').innerHTML = finance.map(f => `
    <tr>
      <td><strong>${f.month}</strong></td>
      <td>¥${f.income.toLocaleString()}</td>
      <td>¥${f.expense.toLocaleString()}</td>
      <td style="color:${f.profit >= 0 ? '#059669' : '#dc2626'};font-weight:600">¥${f.profit.toLocaleString()}</td>
      <td>¥${f.target.toLocaleString()}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px">
            <div style="width:${Math.min(f.achievement, 100)}%;height:100%;background:#4f46e5;border-radius:3px"></div>
          </div>
          <span style="font-weight:600;color:#4f46e5">${f.achievement}%</span>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderFinanceChart(finance) {
  const ctx = document.getElementById('financeChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: finance.map(f => f.month),
      datasets: [
        {
          label: '収入',
          data: finance.map(f => f.income),
          backgroundColor: '#4f46e5cc',
          borderRadius: 6
        },
        {
          label: '支出',
          data: finance.map(f => f.expense),
          backgroundColor: '#f87171cc',
          borderRadius: 6
        },
        {
          label: '目標',
          data: finance.map(f => f.target),
          type: 'line',
          borderColor: '#f59e0b',
          borderDash: [4, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: {
          ticks: { callback: v => '¥' + v.toLocaleString() }
        }
      }
    }
  });
}

function renderCasesTable(cases) {
  document.getElementById('cases-tbody').innerHTML = cases.map(c => `
    <tr data-status="${c.status}">
      <td><strong>${c.name}</strong></td>
      <td><span class="${typeBadge(c.type)} badge">${c.type || '—'}</span></td>
      <td><span class="${statusBadge(c.status)} badge">${c.status || '—'}</span></td>
      <td>${c.amount ? '¥' + c.amount.toLocaleString() : '—'}</td>
      <td>${c.deadline || '—'}</td>
    </tr>
  `).join('');
}

function filterCases(status) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  const filtered = status === 'all' ? allCases : allCases.filter(c => c.status === status);
  renderCasesTable(filtered);
}

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  event.target.classList.add('active');
}

function typeBadge(type) {
  const map = { '代行': 'badge-blue', 'クリエイティブ': 'badge-pink', 'スクール': 'badge-green', 'コンサル': 'badge-orange' };
  return map[type] || 'badge-gray';
}

function statusBadge(status) {
  const map = { '進行中': 'badge-blue', '商談中': 'badge-yellow', '完了': 'badge-green', '保留': 'badge-gray' };
  return map[status] || 'badge-gray';
}

function relationBadge(rel) {
  const map = { '見込み': 'badge-yellow', 'モニター': 'badge-blue', '既存': 'badge-green', '過去': 'badge-gray' };
  return map[rel] || 'badge-gray';
}

loadData();
