import pickle
from pathlib import Path
import numpy as np
from typing import Dict, Any

# -------------------------------
#  MODEL + SCALER LOADING (SAFE)
# -------------------------------

# Load once → keep in memory
def load_artifacts():
    base_dir = Path(__file__).resolve().parent
    model_path = base_dir / "model.pkl"
    scaler_path = base_dir / "scaler.pkl"

    try:
        with model_path.open("rb") as mf, scaler_path.open("rb") as sf:
            model = pickle.load(mf)
            scaler = pickle.load(sf)
        return model, scaler
    except Exception as e:
        raise RuntimeError(f"Error loading model artifacts: {e}")

model, scaler = load_artifacts()


# -------------------------------
#  FINANCIAL FEATURE ENGINEERING
# -------------------------------
def build_features(income: float, expense: float, donations: float):
    """
    Creates engineered features for stronger predictions.
    Useful when NGO data behaves differently from normal finance.
    """

    # Basic features
    base_features = np.array([
        income,
        expense,
        donations
    ], dtype=float)

    # Engineered features
    surplus = income - expense
    donation_ratio = donations / income if income > 0 else 0.0
    expense_to_income = expense / income if income > 0 else 0.0

    engineered = np.array([
        surplus,
        donation_ratio,
        expense_to_income
    ])

    # Final feature vector
    final_vector = np.concatenate([base_features, engineered])
    final_vector = final_vector.reshape(1, -1)

    return final_vector


# -------------------------------
#  MAIN PREDICTION FUNCTION
# -------------------------------
def predict_finance(income: float, expense: float, donations: float) -> Dict[str, Any]:
    """
    Returns:
        - predicted funding requirement
        - confidence score
        - risk level
    """

    # Step 1: Build features
    features = build_features(income, expense, donations)

    # Step 2: Scale only the BASE features (first 3)
    base_scaled = scaler.transform(features[:, :3])

    # Replace the first 3 values in the full feature vector
    features[:, :3] = base_scaled

    # Step 3: Run model prediction
    try:
        prediction = model.predict(features)[0]
    except Exception as e:
        raise RuntimeError(f"Model prediction failed: {e}")

    prediction = float(round(prediction, 2))

    # Step 4: Confidence Score (robust proxy)
    # Use coefficient of variation of tree predictions to avoid scale issues.
    try:
        if hasattr(model, "estimators_"):
            preds = np.array([est.predict(features)[0] for est in model.estimators_], dtype=float)
            std = float(np.std(preds))
            mean_pred = float(abs(np.mean(preds)))
            # Coefficient of variation (std relative to mean). Lower CV -> higher confidence.
            denom = max(mean_pred, 1.0)
            cv = std / denom
            confidence = (1.0 - max(0.0, min(1.0, cv))) * 100.0
        else:
            confidence = 85.0  # Default confidence when ensemble details not available
    except Exception:
        confidence = 85.0

    confidence = float(round(confidence, 2))

    # Step 5: Risk Level
    if expense > income:
        risk = "High"
    elif (expense / income) > 0.7:
        risk = "Medium"
    else:
        risk = "Low"

    # Final structured response
    return {
        "future_funding_required": prediction,
        "confidence_score": confidence,
        "risk_level": risk
    } 