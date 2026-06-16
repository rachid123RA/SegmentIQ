const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3030;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function runPython(args) {
  return new Promise((resolve, reject) => {
    execFile('python3', [path.join(__dirname, 'predict.py'), ...args], (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject('Invalid JSON from Python: ' + stdout);
      }
    });
  });
}

// Auth
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username=? AND password=?').get(username, password);
  if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });
  res.json({ ok: true, username: user.username });
});

// Model info
app.get('/api/model-info', async (req, res) => {
  try {
    const info = await runPython(['info']);
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

// Predict single
app.post('/api/predict', async (req, res) => {
  const { age, gender, income, spending } = req.body;
  if (income == null || spending == null) {
    return res.status(400).json({ error: 'income et spending sont requis' });
  }
  try {
    const result = await runPython(['predict', String(income), String(spending)]);
    db.prepare(`
      INSERT INTO predictions (age, gender, income, spending, segment, cluster, confidence, membership, recommendation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      age || null, gender || null, income, spending,
      result.segment, result.cluster, result.confidence,
      JSON.stringify(result.membership), result.recommendation
    );
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

// Clients history
app.get('/api/clients', (req, res) => {
  const rows = db.prepare('SELECT * FROM predictions ORDER BY created_at DESC').all();
  res.json(rows);
});

app.delete('/api/clients/:id', (req, res) => {
  db.prepare('DELETE FROM predictions WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// EDA + full model data
app.get('/api/eda', async (req, res) => {
  try {
    const result = await runPython(['eda']);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

// Segments static info
app.get('/api/segments', (req, res) => {
  res.json([
    {
      name: 'High income high spending',
      color: '#2563eb',
      description: 'Clients a fort revenu et fort score de depense. Profil VIP, ideal pour des programmes de fidelite premium.',
      recommendation: 'Avantages VIP, acces prioritaire, evenements exclusifs.',
    },
    {
      name: 'High income low spending',
      color: '#0891b2',
      description: 'Clients a fort revenu mais peu actifs en depenses. Potentiel non active, sensible aux offres personnalisees.',
      recommendation: 'Offres premium personnalisees, incentives a duree limitee.',
    },
    {
      name: 'Low income high spending',
      color: '#7c3aed',
      description: 'Clients au revenu modeste mais avec un score de depense eleve. Actifs et engages, sensibles au prix.',
      recommendation: 'Bundles abordables, points de fidelite, campagnes de reduction.',
    },
    {
      name: 'Low income low spending',
      color: '#9ca3af',
      description: 'Clients a faible revenu et faible engagement. Segment a activer progressivement.',
      recommendation: 'Promotions accessibles, campagnes d\'engagement a faible friction.',
    },
    {
      name: 'Average customers',
      color: '#059669',
      description: 'Clients au profil median. Revenu et depenses moderes, receptifs aux offres saisonnieres.',
      recommendation: 'Promotions saisonnieres, cross-selling, offres groupees.',
    },
  ]);
});

app.listen(PORT, () => {
  console.log(`SegmentIQ running on http://localhost:${PORT}`);
});
