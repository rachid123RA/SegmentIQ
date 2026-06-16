# SegmentIQ — Customer Segmentation Platform

Plateforme web de segmentation client basée sur l'algorithme **Fuzzy C-Means (FCM)**. Le système analyse les données de clients d'un mall commercial et les regroupe en segments actionnables à partir de leur revenu annuel et de leur score de dépense.

---

## Fonctionnalités

### Modèle de Machine Learning
- Algorithme **Fuzzy C-Means** (scikit-fuzzy) avec **k = 5 clusters**
- Chaque client reçoit un **degré d'appartenance flou** pour chaque segment (entre 0 et 1)
- Métriques de validation : **FPC**, **Silhouette Score**, **Davies-Bouldin Index**
- Modèle pré-entraîné et sauvegardé dans `model.pkl` pour des prédictions instantanées
- Normalisation par **StandardScaler** avant l'entraînement

### Les 5 segments identifiés

| Segment | Description |
|---|---|
| High income high spending | Fort revenu, forte dépense — profil VIP |
| High income low spending | Fort revenu, faible dépense — potentiel non activé |
| Low income high spending | Faible revenu, forte dépense — sensible au prix |
| Low income low spending | Faible revenu, faible dépense — à engager |
| Average customers | Profil modéré — comportement médian |

### Interface Web
- **Dashboard** : métriques du modèle en temps réel, répartition des segments
- **Prédiction** : formulaire client → segment + degrés d'appartenance fuzzy + recommandation marketing
- **Section Modèle** : visualisation complète du notebook (EDA, Feature Engineering, Choix de k, Clustering, Résultats)
- **Base clients** : historique de toutes les prédictions effectuées avec export
- **Espace Admin** : authentification sécurisée, gestion des données

### Visualisations (Canvas JS)
- Histogrammes de distribution (Age, Revenu, Spending Score)
- Matrice de corrélation (heatmap)
- Scatter plot Income vs Spending (avant et après clustering)
- Courbes FPC / Silhouette / Davies-Bouldin pour k = 2 à 7
- Graphiques de répartition des segments
- Barres de membership fuzzy par client

---

## Stack Technique

| Couche | Technologie |
|---|---|
| Frontend | Vanilla JavaScript (SPA), HTML5 Canvas |
| Backend | Node.js, Express.js |
| Base de données | SQLite (better-sqlite3) |
| Machine Learning | Python 3, scikit-fuzzy, scikit-learn, pandas, numpy |
| Dataset | Mall Customers (200 observations, 5 variables) |

---

## Installation

### Prérequis
- Node.js >= 18
- Python 3 >= 3.9
- pip3

### Etape 1 — Cloner le projet

```bash
git clone https://github.com/rachid123RA/SegmentIQ.git
cd SegmentIQ
```

### Etape 2 — Installer les dépendances Node.js

```bash
npm install
```

### Etape 3 — Installer les dépendances Python

```bash
pip3 install scikit-fuzzy scikit-learn pandas numpy
```

### Etape 4 — Entraîner le modèle (première fois uniquement)

Cette étape génère le fichier `model.pkl` qui contient le modèle FCM entraîné.

```bash
python3 train.py
```

Résultat attendu :
```json
{"status": "ok", "fpc": 0.6711, "silhouette": 0.5547, "davies_bouldin": 0.5722, ...}
```

### Etape 5 — Lancer le serveur

```bash
node server.js
```

Ouvrir dans le navigateur : **http://localhost:3030**

---

## Connexion Admin

| Champ | Valeur |
|---|---|
| Nom d'utilisateur | `admin` |
| Mot de passe | `admin123` |

---

## Structure du Projet

```
SegmentIQ/
├── server.js              # Serveur Express — API REST
├── predict.py             # Moteur de prédiction FCM (charge model.pkl)
├── train.py               # Entraînement du modèle — génère model.pkl
├── database.js            # Configuration SQLite
├── model.pkl              # Modèle FCM pré-entraîné
├── Mall_Customers.csv     # Dataset d'entraînement
├── package.json           # Dépendances Node.js
└── public/
    ├── index.html         # Application SPA complète
    ├── css/
    │   └── style.css      # Design de l'interface
    └── js/
        ├── app.js         # Logique frontend — routing, API calls
        └── charts.js      # Graphiques Canvas (histogrammes, scatter, heatmap)
```

---

## API Endpoints

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/login` | Authentification admin |
| POST | `/api/predict` | Prédiction d'un client (income + spending) |
| GET | `/api/model-info` | Métriques du modèle (FPC, Silhouette, DBI) |
| GET | `/api/eda` | Données complètes pour visualisation (EDA + clustering) |
| GET | `/api/clients` | Historique des prédictions enregistrées |
| DELETE | `/api/clients/:id` | Suppression d'une entrée |
| GET | `/api/segments` | Description des 5 segments |

---

## Dataset

**Mall Customers Dataset** — 200 observations

| Variable | Type | Description |
|---|---|---|
| CustomerID | Entier | Identifiant unique |
| Gender | Texte | Genre (Male / Female) |
| Age | Entier | Age en années |
| Annual Income (k$) | Entier | Revenu annuel en milliers de dollars |
| Spending Score (1-100) | Entier | Score d'intensité de dépense attribué par le mall |

---

## Résultats du Modèle

| Métrique | Valeur | Interprétation |
|---|---|---|
| FPC | 0.6711 | Bonne partition floue (proche de 1) |
| Silhouette Score | 0.5547 | Bonne séparation des clusters |
| Davies-Bouldin Index | 0.5722 | Clusters compacts et bien séparés (bas = meilleur) |

---

## Auteur

Rachid Ait Aissa — Projet universitaire de Data Science / Machine Learning
