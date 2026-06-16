/* ── STATE ── */
let currentUser = sessionStorage.getItem('siq_user') || null;
let currentPage = 'home';
let currentSection = 'dashboard';

const SEGMENT_COLORS = {
  'High income high spending': '#2563eb',
  'High income low spending': '#0891b2',
  'Low income high spending': '#7c3aed',
  'Low income low spending': '#9ca3af',
  'Average customers': '#059669',
};

/* ── ROUTER ── */
function navigate(page) {
  const protected_pages = ['dashboard', 'predict', 'clients', 'segments'];

  if (protected_pages.includes(page) && !currentUser) {
    sessionStorage.setItem('siq_redirect', page);
    page = 'login';
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  if (page === 'predict' || page === 'clients' || page === 'segments') {
    document.getElementById('page-dashboard').classList.add('active');
    showAdminSection(page);
    updateNavLinks('dashboard');
  } else {
    const el = document.getElementById('page-' + page);
    if (el) el.classList.add('active');
    updateNavLinks(page);
    if (page === 'dashboard') {
      showAdminSection('dashboard');
      loadDashboard();
    }
    if (page === 'segments-public') loadSegmentsPublic();
  }

  currentPage = page;
  updateNavState();
}

function showAdminSection(section) {
  document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

  const el = document.getElementById('section-' + section);
  if (el) el.style.display = 'block';

  document.querySelectorAll(`.sidebar-link[data-section="${section}"]`).forEach(l => l.classList.add('active'));
  currentSection = section;

  if (section === 'dashboard') loadDashboard();
  if (section === 'clients') loadClients();
  if (section === 'segments') loadSegments();
  if (section === 'modele') loadModele();
}

function updateNavLinks(page) {
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
}

function updateNavState() {
  const loginBtn = document.getElementById('navLoginBtn');
  const logoutBtn = document.getElementById('navLogoutBtn');
  const userEl = document.getElementById('navUser');

  if (currentUser) {
    loginBtn.style.display = 'none';
    logoutBtn.style.display = '';
    userEl.textContent = currentUser;
  } else {
    loginBtn.style.display = '';
    logoutBtn.style.display = 'none';
    userEl.textContent = '';
  }
}

/* ── AUTH ── */
async function doLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Erreur de connexion';
      errEl.style.display = 'block';
      return;
    }
    currentUser = data.username;
    sessionStorage.setItem('siq_user', currentUser);
    const redirect = sessionStorage.getItem('siq_redirect') || 'dashboard';
    sessionStorage.removeItem('siq_redirect');
    navigate(redirect);
  } catch {
    errEl.textContent = 'Impossible de contacter le serveur.';
    errEl.style.display = 'block';
  }
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem('siq_user');
  navigate('home');
}

/* ── DASHBOARD ── */
async function loadDashboard() {
  try {
    const [infoRes, predsRes] = await Promise.all([
      fetch('/api/model-info'),
      fetch('/api/clients'),
    ]);
    const info = await infoRes.json();
    const preds = await predsRes.json();

    document.getElementById('dbCustomers').textContent = info.total_customers;
    document.getElementById('dbFPC').textContent = info.fpc;
    document.getElementById('dbSilhouette').textContent = info.silhouette;
    document.getElementById('dbDBI').textContent = info.davies_bouldin;
    document.getElementById('dbPredictions').textContent = preds.length;

    // Home stats
    document.getElementById('statCustomers').textContent = info.total_customers;
    document.getElementById('statFPC').textContent = info.fpc;
    document.getElementById('statSilhouette').textContent = info.silhouette;

    renderBarChart(info.distribution);
  } catch (e) {
    document.getElementById('dbBarChart').innerHTML = '<div style="color:#b91c1c;font-size:13px;">Erreur chargement modele. Verifiez que Python et scikit-fuzzy sont installes.</div>';
  }
}

function renderBarChart(distribution) {
  const container = document.getElementById('dbBarChart');
  if (!distribution) return;

  const max = Math.max(...Object.values(distribution));
  const html = Object.entries(distribution).map(([name, count]) => {
    const pct = Math.round((count / max) * 100);
    const color = SEGMENT_COLORS[name] || '#2563eb';
    const shortName = name.replace('High income', 'Hi-Inc').replace('Low income', 'Lo-Inc')
                         .replace('high spending', 'Hi-Sp').replace('low spending', 'Lo-Sp')
                         .replace('Average customers', 'Average');
    return `
      <div class="bar-col">
        <div class="bar-count">${count}</div>
        <div class="bar-fill" style="height:${pct}%; background:${color}; width:100%;"></div>
        <div class="bar-text">${shortName}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

/* ── PREDICTION ── */
function fillExample(income, spending) {
  document.getElementById('pIncome').value = income;
  document.getElementById('pSpending').value = spending;
}

async function doPredict() {
  const income = parseFloat(document.getElementById('pIncome').value);
  const spending = parseFloat(document.getElementById('pSpending').value);
  const age = parseInt(document.getElementById('pAge').value) || null;
  const gender = document.getElementById('pGender').value;
  const alertEl = document.getElementById('predictAlert');
  const resultEl = document.getElementById('predictResult');

  alertEl.innerHTML = '';

  if (isNaN(income) || isNaN(spending)) {
    alertEl.innerHTML = '<div class="alert alert-error">Veuillez renseigner le revenu et le spending score.</div>';
    return;
  }
  if (income < 1 || income > 200) {
    alertEl.innerHTML = '<div class="alert alert-error">Le revenu doit etre entre 1 et 200 k$.</div>';
    return;
  }
  if (spending < 1 || spending > 100) {
    alertEl.innerHTML = '<div class="alert alert-error">Le spending score doit etre entre 1 et 100.</div>';
    return;
  }

  resultEl.innerHTML = '<div class="loading"><div class="spinner"></div> Calcul en cours...</div>';

  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ income, spending, age, gender }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    renderPredictResult(data);
    alertEl.innerHTML = '<div class="alert alert-success">Prediction enregistree dans la base clients.</div>';
  } catch (e) {
    resultEl.innerHTML = '<div class="result-empty">Erreur : ' + e.message + '</div>';
  }
}

function renderPredictResult(data) {
  const color = SEGMENT_COLORS[data.segment] || '#2563eb';
  const pct = (data.confidence * 100).toFixed(1);

  const mbRows = Object.entries(data.membership)
    .sort((a, b) => b[1] - a[1])
    .map(([name, val]) => {
      const w = (val * 100).toFixed(1);
      const c = SEGMENT_COLORS[name] || '#ddd';
      return `
        <div class="mb-row">
          <div class="mb-name">${name}</div>
          <div class="mb-track"><div class="mb-fill" style="width:${w}%; background:${c}"></div></div>
          <div class="mb-pct">${w}%</div>
        </div>
      `;
    }).join('');

  document.getElementById('predictResult').innerHTML = `
    <div>
      <span class="segment-tag" style="background:${color}15; color:${color}; border-color:${color}40">${data.segment}</span>
      <div class="confidence-text">Confiance d'appartenance : <strong>${pct}%</strong></div>
      <div class="mb-section-label">Degres d'appartenance (Fuzzy)</div>
      ${mbRows}
      <div class="reco-box" style="border-left-color:${color}">${data.recommendation}</div>
    </div>
  `;
}

/* ── CLIENTS ── */
async function loadClients() {
  const tbody = document.getElementById('clientsTable');
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:#aaa;">Chargement...</td></tr>';

  try {
    const res = await fetch('/api/clients');
    const clients = await res.json();

    if (!clients.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:#aaa;">Aucun client analyse pour le moment.</td></tr>';
      return;
    }

    tbody.innerHTML = clients.map(c => {
      const color = SEGMENT_COLORS[c.segment] || '#999';
      const date = new Date(c.created_at).toLocaleString('fr-FR');
      const conf = (c.confidence * 100).toFixed(1) + '%';
      return `
        <tr>
          <td style="color:#aaa">#${c.id}</td>
          <td>${c.gender || '—'}</td>
          <td>${c.age || '—'}</td>
          <td>${c.income}</td>
          <td>${c.spending}</td>
          <td><span class="segment-pill" style="background:${color}15;color:${color}">${c.segment}</span></td>
          <td><strong>${conf}</strong></td>
          <td style="color:#aaa">${date}</td>
          <td><button class="btn btn-danger btn-sm" onclick="deleteClient(${c.id})">Suppr.</button></td>
        </tr>
      `;
    }).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:#b91c1c;">Erreur de chargement.</td></tr>';
  }
}

async function deleteClient(id) {
  if (!confirm('Supprimer cette entree ?')) return;
  await fetch('/api/clients/' + id, { method: 'DELETE' });
  loadClients();
}

/* ── SEGMENTS ── */
async function loadSegments() {
  renderSegments('segmentsGrid');
}

async function loadSegmentsPublic() {
  renderSegments('segmentsGridPublic');
}

async function renderSegments(containerId) {
  const container = document.getElementById(containerId);
  try {
    const res = await fetch('/api/segments');
    const segments = await res.json();
    container.innerHTML = segments.map(s => `
      <div class="seg-card">
        <div class="seg-header">
          <div class="seg-dot" style="background:${s.color}"></div>
          <div class="seg-name">${s.name}</div>
        </div>
        <div class="seg-desc">${s.description}</div>
        <div class="seg-reco">${s.recommendation}</div>
      </div>
    `).join('');
  } catch {
    container.innerHTML = '<div style="color:#b91c1c;font-size:13px;">Erreur chargement segments.</div>';
  }
}

/* ── MODELE ── */
let edaData = null;
let edaLoading = false;

function switchTab(name) {
  document.querySelectorAll('.model-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector(`.model-tab[onclick="switchTab('${name}')"]`).classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
  if (edaData) setTimeout(() => renderTab(name, edaData), 30);
}

async function loadModele() {
  if (edaLoading) return;

  // If already loaded, just re-render the active tab
  if (edaData) {
    const activeTab = document.querySelector('.model-tab.active');
    const tabName = activeTab ? activeTab.getAttribute('onclick').match(/'(\w+)'/)[1] : 'eda';
    setTimeout(() => renderTab(tabName, edaData), 30);
    return;
  }

  edaLoading = true;

  // Show overlay without touching canvas HTML
  const section = document.getElementById('section-modele');
  let overlay = document.getElementById('modele-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modele-overlay';
    overlay.style.cssText = 'position:absolute;inset:0;background:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;z-index:50;border-radius:12px;flex-direction:column;gap:12px;';
    overlay.innerHTML = '<div class="spinner" style="width:28px;height:28px;border-width:3px"></div><div style="font-size:13px;color:#64748b;font-weight:500">Chargement du modele depuis model.pkl...</div>';
    section.style.position = 'relative';
    section.appendChild(overlay);
  }
  overlay.style.display = 'flex';

  try {
    const res = await fetch('/api/eda');
    if (!res.ok) throw new Error('Erreur serveur ' + res.status);
    edaData = await res.json();
    overlay.style.display = 'none';
    edaLoading = false;
    const activeTab = document.querySelector('.model-tab.active');
    const tabName = activeTab ? activeTab.getAttribute('onclick').match(/'(\w+)'/)[1] : 'eda';
    setTimeout(() => renderTab(tabName, edaData), 30);
  } catch (e) {
    edaLoading = false;
    overlay.innerHTML = `<div style="font-size:13px;color:#b91c1c;text-align:center;padding:20px">
      Erreur : ${e.message}<br><br>
      <button class="btn btn-outline btn-sm" onclick="edaData=null;edaLoading=false;loadModele()">Reessayer</button>
    </div>`;
  }
}

function renderTab(name, d) {
  // Restore HTML structure before rendering (tabs may have been replaced by loader)
  if (name === 'eda') renderEDA(d);
  else if (name === 'features') renderFeatures(d);
  else if (name === 'choix-k') renderChoixK(d);
  else if (name === 'clustering') renderClustering(d);
  else if (name === 'resultats') renderResultats(d);
}

function renderEDA(d) {
  // Overview cards
  const og = document.getElementById('overviewGrid');
  if (og) og.innerHTML = `
    <div class="overview-card"><div class="overview-card-value">${d.overview.rows}</div><div class="overview-card-label">Observations</div></div>
    <div class="overview-card"><div class="overview-card-value">${d.overview.cols}</div><div class="overview-card-label">Variables</div></div>
    <div class="overview-card"><div class="overview-card-value">${d.overview.missing}</div><div class="overview-card-label">Valeurs manquantes</div></div>
    <div class="overview-card"><div class="overview-card-value">${d.overview.duplicates}</div><div class="overview-card-label">Doublons</div></div>
  `;

  // Stats table
  const st = document.getElementById('statsTable');
  if (st) {
    const cols = Object.keys(d.stats);
    const rows = ['mean','std','min','q25','q50','q75','max'];
    const rowLabels = { mean:'Moyenne', std:'Ecart-type', min:'Min', q25:'Q1 (25%)', q50:'Mediane', q75:'Q3 (75%)', max:'Max' };
    st.innerHTML = `<table class="stats-table">
      <thead><tr><th>Statistique</th>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r=>`<tr><td style="font-weight:600;color:#475569">${rowLabels[r]}</td>${cols.map(c=>`<td>${d.stats[c][r]}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
  }

  // Gender pie
  const genderColors = ['#1d4ed8','#7c3aed'];
  drawPie('genderChart', d.gender, genderColors);
  const gl = document.getElementById('genderLegend');
  if (gl) {
    const total = Object.values(d.gender).reduce((a,b)=>a+b,0);
    gl.innerHTML = Object.entries(d.gender).map(([k,v],i)=>`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="width:12px;height:12px;border-radius:50%;background:${genderColors[i]}"></div>
        <span style="font-size:13px;font-weight:600">${k}</span>
        <span style="font-size:13px;color:#64748b">${v} (${((v/total)*100).toFixed(1)}%)</span>
      </div>`).join('');
  }

  // Histograms
  const hColors = { 'Age':'#0891b2', 'Annual Income (k$)':'#1d4ed8', 'Spending Score (1-100)':'#7c3aed' };
  setTimeout(() => {
    drawHistogram('histAge', d.histograms['Age'].counts, d.histograms['Age'].edges, hColors['Age']);
    drawHistogram('histIncome', d.histograms['Annual Income (k$)'].counts, d.histograms['Annual Income (k$)'].edges, hColors['Annual Income (k$)']);
    drawHistogram('histSpending', d.histograms['Spending Score (1-100)'].counts, d.histograms['Spending Score (1-100)'].edges, hColors['Spending Score (1-100)']);
    drawHeatmap('heatmap', d.correlation.values, d.correlation.labels);
    drawScatter('scatterEDA', d.scatter.income, d.scatter.spending,
      d.scatter.gender.map(g => g === 'Male' ? '#1d4ed8' : '#7c3aed'),
      null, 'Revenu Annuel (k$)', 'Spending Score');
  }, 50);
}

function renderFeatures(d) {
  const fc = document.getElementById('featureCards');
  if (fc) fc.innerHTML = [
    { name:'Age_Group', formula:"pd.cut(Age, bins=[0,24,34,44,54,∞])", desc:"Categorise l'age en 5 tranches : 18-24, 25-34, 35-44, 45-54, 55+. Utile pour comparer la composition demographique des clusters." },
    { name:'Income_Category', formula:"pd.cut(Income, bins=[-∞,40,70,∞])", desc:"Classe le revenu en Low / Medium / High income. Permet de valider la coherence des segments avec les categories naturelles." },
    { name:'Spending_Category', formula:"pd.cut(Spending, bins=[-∞,40,70,∞])", desc:"Classe le score de depense en Low / Medium / High spending. Complement de l'Income_Category pour interpreter les clusters." },
    { name:'Spending_Income_Ratio', formula:"Spending / Income", desc:"Ratio depense sur revenu. Capture les clients qui depensent proportionnellement beaucoup par rapport a leur revenu." },
  ].map(f=>`<div class="feature-card"><div class="feature-card-name">${f.name}</div><div class="feature-card-formula">${f.formula}</div><div class="feature-card-desc">${f.desc}</div></div>`).join('');

  // Age group chart
  setTimeout(() => {
    const labels = Object.keys(d.age_group_counts);
    const values = Object.values(d.age_group_counts);
    drawVBar('ageGroupChart', labels, values, '#0891b2');
  }, 50);

  // Pipeline
  const pipe = document.getElementById('pipeline');
  if (pipe) {
    const steps = [
      { label:'Chargement CSV', sub:'pd.read_csv()' },
      { label:'Validation colonnes', sub:'5 colonnes requises' },
      { label:'Suppression doublons', sub:'drop_duplicates()' },
      { label:'Imputation mediane', sub:'fillna(median)' },
      { label:'Selection features', sub:'Income + Spending' },
      { label:'StandardScaler', sub:'fit_transform()' },
      { label:'FCM k=5', sub:'cmeans(c=5, m=2)' },
    ];
    pipe.innerHTML = steps.map((s,i)=>`
      <div class="pipe-step">${s.label}<span>${s.sub}</span></div>
      ${i < steps.length-1 ? '<div class="pipe-arrow">→</div>' : ''}
    `).join('');
  }
}

function renderChoixK(d) {
  const ks = d.k_metrics.map(m => m.k);
  const fpcs = d.k_metrics.map(m => m.fpc);
  const sils = d.k_metrics.map(m => m.silhouette);
  const dbis = d.k_metrics.map(m => m.dbi);

  setTimeout(() => {
    drawLineChart('kFPC', fpcs, ks, '#1d4ed8', 'FPC');
    drawLineChart('kSil', sils, ks, '#059669', 'Silhouette Score');
    drawLineChart('kDBI', dbis, ks, '#dc2626', 'Davies-Bouldin Index');
  }, 50);

  // Table
  const kt = document.getElementById('kMetricsTable');
  if (kt) kt.innerHTML = `<table class="k-table">
    <thead><tr><th>k</th><th>FPC</th><th>Silhouette Score</th><th>Davies-Bouldin Index</th></tr></thead>
    <tbody>${d.k_metrics.map(m=>`
      <tr class="${m.k===5?'k-selected':''}">
        <td style="font-weight:700">${m.k}${m.k===5?' — retenu':''}</td>
        <td class="${Math.max(...fpcs)===m.fpc?'best':''}">${m.fpc}</td>
        <td class="${Math.max(...sils)===m.silhouette?'best':''}">${m.silhouette}</td>
        <td class="${Math.min(...dbis)===m.dbi?'best':''}">${m.dbi}</td>
      </tr>`).join('')}</tbody>
  </table>`;
}

function renderClustering(d) {
  const algoEl = document.getElementById('algoSteps');
  if (algoEl) algoEl.innerHTML = [
    { title:'Initialisation', desc:'Les c centres de clusters sont initialises aleatoirement (seed=42 pour la reproductibilite).' },
    { title:'Calcul des degres d\'appartenance', desc:'Pour chaque point xi et chaque centre vj, le degre d\'appartenance uij est calcule selon la distance euclidienne et le parametre de flou m=2.' },
    { title:'Mise a jour des centres', desc:'Les centres sont recalcules comme la moyenne ponderee de tous les points, avec les degres d\'appartenance comme poids.' },
    { title:'Convergence', desc:'Les etapes 2 et 3 sont repetees jusqu\'a ce que la variation des centres soit inferieure au seuil error=0.005 ou jusqu\'a maxiter=1000 iterations.' },
    { title:'Attribution finale', desc:'Chaque client est assigne au cluster avec le degre d\'appartenance le plus eleve (argmax). Le score de confiance est ce degre maximum.' },
  ].map((s,i)=>`<div class="algo-step"><div class="algo-step-num">${i+1}</div><div class="algo-step-text"><h4>${s.title}</h4><p>${s.desc}</p></div></div>`).join('');

  const cs = d.cluster_scatter;
  const pointColors = cs.labels.map(l => SEG_COLORS[cs.segment_names[l]] || '#94a3b8');

  setTimeout(() => {
    drawScatter('scatterFCM', cs.income, cs.spending, pointColors, cs.centers, 'Revenu Annuel (k$)', 'Spending Score');
  }, 50);

  const legendEl = document.getElementById('scatterLegend');
  if (legendEl) legendEl.innerHTML = Object.entries(SEG_COLORS).map(([name, color])=>`
    <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
      <div style="width:10px;height:10px;border-radius:50%;background:${color}"></div>
      <span>${name}</span>
    </div>`).join('');
}

function renderResultats(d) {
  const pt = document.getElementById('profilesTable');
  if (pt) pt.innerHTML = `<table class="profiles-table">
    <thead><tr><th>Segment</th><th>Clients</th><th>Age moy.</th><th>Revenu moy. (k$)</th><th>Spending moy.</th><th>Genre dominant</th><th>Confiance moy.</th></tr></thead>
    <tbody>${d.profiles.map(p=>`<tr>
      <td><span style="display:inline-flex;align-items:center;gap:7px;">
        <span style="width:9px;height:9px;border-radius:50%;background:${SEG_COLORS[p.segment]||'#ccc'};display:inline-block;flex-shrink:0"></span>
        <strong>${p.segment}</strong></span></td>
      <td>${p.count}</td><td>${p.avg_age}</td><td>${p.avg_income}</td>
      <td>${p.avg_spending}</td><td>${p.dominant_gender}</td>
      <td><strong>${(p.avg_confidence*100).toFixed(1)}%</strong></td>
    </tr>`).join('')}</tbody>
  </table>`;

  const labels = d.profiles.map(p => p.segment.replace('income','inc.').replace('spending','sp.'));
  const values = d.profiles.map(p => p.count);
  const colors = d.profiles.map(p => SEG_COLORS[p.segment] || '#94a3b8');
  setTimeout(() => drawVBar('segDistChart', labels, values, colors), 50);

  const rc = document.getElementById('recoCards');
  if (rc) {
    const recos = {
      'High income high spending': 'Avantages VIP, acces prioritaire aux nouvelles collections, invitations a des evenements exclusifs. Fort potentiel de fidelisation haute valeur.',
      'High income low spending': 'Offres premium personnalisees, incentives a duree limitee. Fort pouvoir d\'achat non encore active.',
      'Low income high spending': 'Bundles abordables, points de fidelite, campagnes de reduction. Actifs et engages, sensibles au prix.',
      'Low income low spending': 'Promotions accessibles, campagnes d\'engagement progressif. Revenu et activite d\'achat limites.',
      'Average customers': 'Promotions saisonnieres, cross-selling, offres groupees. Comportement modere en revenu et en depenses.',
    };
    rc.innerHTML = '<div class="reco-cards">' + d.profiles.map(p=>`
      <div class="reco-card">
        <div class="reco-dot" style="background:${SEG_COLORS[p.segment]||'#ccc'}"></div>
        <div><div class="reco-card-name">${p.segment}</div>
        <div class="reco-card-text">${recos[p.segment]||''}</div></div>
      </div>`).join('') + '</div>';
  }
}

/* ── INIT ── */
updateNavState();

// Pre-load home stats in background
fetch('/api/model-info').then(r => r.json()).then(info => {
  document.getElementById('statCustomers').textContent = info.total_customers;
  document.getElementById('statFPC').textContent = info.fpc;
  document.getElementById('statSilhouette').textContent = info.silhouette;
}).catch(() => {});
