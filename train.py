"""
Run once to train the FCM model and save it to model.pkl.
Usage: python3 train.py
"""
import os, pickle, json
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score, davies_bouldin_score
import skfuzzy as fuzz

CSV_PATH = os.path.join(os.path.dirname(__file__), "Mall_Customers.csv")
PKL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

def assign_name(income, spending):
    if income >= 70 and spending >= 60: return "High income high spending"
    if income >= 70 and spending < 40:  return "High income low spending"
    if income < 40  and spending >= 60: return "Low income high spending"
    if income < 40  and spending < 40:  return "Low income low spending"
    return "Average customers"

df = pd.read_csv(CSV_PATH)
features = df[["Annual Income (k$)", "Spending Score (1-100)"]].values

scaler = StandardScaler()
scaled = scaler.fit_transform(features)

centers, membership, _, _, _, _, fpc = fuzz.cluster.cmeans(
    data=scaled.T, c=5, m=2.0, error=0.005, maxiter=1000, init=None, seed=42
)

labels = np.argmax(membership, axis=0)
sil = float(silhouette_score(scaled, labels))
dbi = float(davies_bouldin_score(scaled, labels))

centers_orig = scaler.inverse_transform(centers)
segment_names = [assign_name(c[0], c[1]) for c in centers_orig]

model = {
    "scaler_mean": scaler.mean_.tolist(),
    "scaler_scale": scaler.scale_.tolist(),
    "centers": centers.tolist(),
    "centers_original": centers_orig.tolist(),
    "segment_names": segment_names,
    "k": 5,
    "m": 2.0,
    "fpc": round(float(fpc), 4),
    "silhouette": round(sil, 4),
    "davies_bouldin": round(dbi, 4),
    "total_customers": len(df),
    "feature_names": ["Annual Income (k$)", "Spending Score (1-100)"],
    "hard_labels": labels.tolist(),
    "distribution": {segment_names[i]: int(np.sum(labels == i)) for i in range(5)},
}

with open(PKL_PATH, "wb") as f:
    pickle.dump(model, f)

print(json.dumps({
    "status": "ok",
    "model_saved": PKL_PATH,
    "fpc": model["fpc"],
    "silhouette": model["silhouette"],
    "davies_bouldin": model["davies_bouldin"],
    "segments": model["segment_names"],
}))
