import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


DATA_PATH = Path(__file__).resolve().parent / "ngo_large_1000.csv"


def feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["surplus"] = df["income"] - df["expense"]
    df["donation_ratio"] = df["donations"] / df["income"]
    df["expense_to_income"] = df["expense"] / df["income"]
    return df


def main():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    df = feature_engineering(df).dropna()

    feature_cols = [
        "income",
        "expense",
        "donations",
        "surplus",
        "donation_ratio",
        "expense_to_income",
    ]

    X = df[feature_cols]
    y = df["future_fund_need"].astype(float)

    base_cols = ["income", "expense", "donations"]

    preprocessor = ColumnTransformer(
        transformers=[("scale_base", StandardScaler(), base_cols)],
        remainder="passthrough",
    )

    candidates = {
        "rf": RandomForestRegressor(
            n_estimators=500,
            max_depth=12,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        ),
        "gbr": GradientBoostingRegressor(
            n_estimators=400,
            learning_rate=0.05,
            max_depth=3,
            subsample=0.9,
            random_state=42,
        ),
    }

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    cv_results = {}
    for name, est in candidates.items():
        pipe = Pipeline([
            ("preprocess", preprocessor),
            ("model", est),
        ])
        scores = cross_val_score(
            pipe,
            X_train,
            y_train,
            cv=5,
            scoring="neg_mean_absolute_error",
            n_jobs=-1,
        )
        cv_results[name] = {
            "mae_mean": -scores.mean(),
            "mae_std": scores.std(),
        }

    best_name = min(cv_results, key=lambda k: cv_results[k]["mae_mean"])
    best_est = candidates[best_name]
    best_pipe = Pipeline([
        ("preprocess", preprocessor),
        ("model", best_est),
    ])

    best_pipe.fit(X_train, y_train)

    preds = best_pipe.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)

    print("Model training complete.")
    print(f"Selected model: {best_name}")
    print(f"CV MAE (mean±std): {cv_results[best_name]['mae_mean']:.2f} ± {cv_results[best_name]['mae_std']:.2f}")
    print(f"Test MAE: {mae:.2f}")
    print(f"Test R2 : {r2:.2f}")

    scaler = best_pipe.named_steps["preprocess"].named_transformers_["scale_base"]
    model = best_pipe.named_steps["model"]

    with open("model.pkl", "wb") as f:
        pickle.dump(model, f)

    with open("scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)

    with open("feature_list.pkl", "wb") as f:
        pickle.dump(feature_cols, f)

    print("\nSaved:")
    print(" - model.pkl")
    print(" - scaler.pkl")
    print(" - feature_list.pkl")


if __name__ == "__main__":
    main()