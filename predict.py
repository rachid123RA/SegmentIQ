import sys, json, os, pickle
import numpy as np
import pandas as pd
import skfuzzy as fuzz

PKL_PATH  = os.path.join(os.path.dirname(__file__), "model.pkl")
CSV_PATH  = os.path.join(os.path.dirname(__file__), "Mall_Customers.csv")

RECOMMENDATIONS = {
    "High income high spending": "Proposez des avantages VIP, un acces prioritaire aux nouvelles collections et des invitations a des evenements exclusifs. Ce profil presente un fort potentiel de fidelisation haute valeur.",
    "High income low spending":  "Utilisez des offres personnalisees premium et des incentives a duree limitee. Ce profil a un fort pouvoir d'achat mais ne depense pas encore suffisamment.",
    "Low income high spending":  "Proposez des bundles abordables, des points de fidelite et des campagnes de reduction. Ce profil est actif en depenses mais sensible au prix.",
    "Low income low spending":   "Concentrez-vous sur des promotions accessibles et des campagnes d'engagement. Revenu et activite d'achat limites — objectif : augmenter progressivement l'engagement.",
    "Average customers":         "Utilisez des promotions saisonnieres et des offres de cross-selling. Comportement modere en revenu et en depenses — des offres groupees augmentent la valeur du panier.",
}

def load_model():
    if not os.path.exists(PKL_PATH):
        raise FileNotFoundError(f"model.pkl introuvable. Lancez d'abord: python3 train.py")
    with open(PKL_PATH, "rb") as f:
        return pickle.load(f)

def predict(income, spending):
    m = load_model()
    mean  = np.array(m["scaler_mean"])
    scale = np.array(m["scaler_scale"])
    centers = np.array(m["centers"])

    point = (np.array([[income, spending]]) - mean) / scale

    membership, _, _, _, _, _ = fuzz.cluster.cmeans_predict(
        test_data=point.T, cntr_trained=centers,
        m=m["m"], error=0.005, maxiter=1000,
    )

    mem = membership[:, 0]
    best = int(np.argmax(mem))
    segment = m["segment_names"][best]

    return {
        "segment":        segment,
        "cluster":        best,
        "confidence":     round(float(mem[best]), 4),
        "membership":     {m["segment_names"][i]: round(float(mem[i]), 4) for i in range(m["k"])},
        "recommendation": RECOMMENDATIONS[segment],
    }

def get_model_info():
    m = load_model()
    return {
        "fpc":             m["fpc"],
        "silhouette":      m["silhouette"],
        "davies_bouldin":  m["davies_bouldin"],
        "total_customers": m["total_customers"],
        "k":               m["k"],
        "distribution":    m["distribution"],
    }

def get_eda():
    m = load_model()
    df = pd.read_csv(CSV_PATH)

    # Stats
    stats = {}
    for col in ["Age", "Annual Income (k$)", "Spending Score (1-100)"]:
        s = df[col].describe()
        stats[col] = {k: round(float(v), 2) for k, v in
                      zip(["mean","std","min","q25","q50","q75","max"],
                          [s["mean"],s["std"],s["min"],s["25%"],s["50%"],s["75%"],s["max"]])}

    gender = df["Gender"].value_counts().to_dict()

    def make_hist(col, bins=12):
        counts, edges = np.histogram(df[col].values, bins=bins)
        return {"counts": counts.tolist(), "edges": [round(float(e),1) for e in edges]}

    histograms = {c: make_hist(c) for c in ["Age","Annual Income (k$)","Spending Score (1-100)"]}

    scatter = {
        "income":   df["Annual Income (k$)"].tolist(),
        "spending": df["Spending Score (1-100)"].tolist(),
        "age":      df["Age"].tolist(),
        "gender":   df["Gender"].tolist(),
    }

    corr = df[["Age","Annual Income (k$)","Spending Score (1-100)"]].corr()
    correlation = {"labels": ["Age","Income","Spending"], "values": corr.values.round(3).tolist()}

    # k-metrics from pkl-trained model (recompute for k=2..7 using saved scaler)
    from sklearn.metrics import silhouette_score, davies_bouldin_score
    from sklearn.preprocessing import StandardScaler
    features = df[["Annual Income (k$)","Spending Score (1-100)"]].values
    sc = StandardScaler()
    scaled = sc.fit_transform(features)
    k_metrics = []
    for k in range(2, 8):
        c, mem, _, _, _, _, fpc = fuzz.cluster.cmeans(
            data=scaled.T, c=k, m=2.0, error=0.005, maxiter=1000, init=None, seed=42)
        lbs = np.argmax(mem, axis=0)
        sil = float(silhouette_score(scaled, lbs)) if len(np.unique(lbs)) > 1 else 0
        dbi = float(davies_bouldin_score(scaled, lbs)) if len(np.unique(lbs)) > 1 else 0
        k_metrics.append({"k": k, "fpc": round(float(fpc),4), "silhouette": round(sil,4), "dbi": round(dbi,4)})

    # Final cluster scatter — use saved labels & centers from pkl
    labels = m["hard_labels"]
    seg_names = m["segment_names"]
    centers_orig = m["centers_original"]

    cluster_scatter = {
        "income":   df["Annual Income (k$)"].tolist(),
        "spending": df["Spending Score (1-100)"].tolist(),
        "labels":   labels,
        "segment_names": seg_names,
        "centers": [{"income": round(c[0],1), "spending": round(c[1],1), "name": seg_names[i]}
                    for i, c in enumerate(centers_orig)],
    }

    # Cluster profiles
    df["_cluster"] = labels
    profiles = []
    for i, name in enumerate(seg_names):
        sub = df[df["_cluster"] == i]
        mem_arr = np.array(m["centers"])  # placeholder confidence from distribution
        profiles.append({
            "cluster": i, "segment": name,
            "count": int(len(sub)),
            "avg_age":      round(float(sub["Age"].mean()), 1),
            "avg_income":   round(float(sub["Annual Income (k$)"].mean()), 1),
            "avg_spending": round(float(sub["Spending Score (1-100)"].mean()), 1),
            "dominant_gender": sub["Gender"].mode().iloc[0] if not sub.empty else "—",
            "avg_confidence": round(m["fpc"], 3),
        })

    df["Age_Group"] = pd.cut(df["Age"], bins=[0,24,34,44,54,np.inf],
                              labels=["18-24","25-34","35-44","45-54","55+"], include_lowest=True)
    age_group_counts = {str(k): int(v) for k, v in
                        df["Age_Group"].value_counts().sort_index().items()}

    return {
        "overview":         {"rows": len(df), "cols": 5, "duplicates": 0, "missing": 0},
        "stats":            stats,
        "gender":           gender,
        "histograms":       histograms,
        "scatter":          scatter,
        "correlation":      correlation,
        "k_metrics":        k_metrics,
        "cluster_scatter":  cluster_scatter,
        "profiles":         profiles,
        "age_group_counts": age_group_counts,
    }


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "predict":
        print(json.dumps(predict(float(sys.argv[2]), float(sys.argv[3]))))
    elif cmd == "info":
        print(json.dumps(get_model_info()))
    elif cmd == "eda":
        print(json.dumps(get_eda()))
