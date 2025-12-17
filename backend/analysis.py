import pandas as pd
import numpy as np

def analyze_financial_file(df: pd.DataFrame):
    """
    Advanced financial analysis for NGO datasets.
    Expected columns in CSV:
        income, expense, donations (at minimum)
    """

    # --- BASIC AGGREGATES ---
    total_income = float(df["income"].sum())
    total_expense = float(df["expense"].sum())
    total_donations = float(df["donations"].sum())

    surplus = float(total_income - total_expense)


    # --- BURN RATE (How fast money is consumed) ---
    monthly_expense_avg = float(df["expense"].mean())
    burn_rate = float(round(monthly_expense_avg, 2))


    # --- DONATION DEPENDENCY ---
    if total_income > 0:
        donation_dependency = float(round((total_donations / total_income) * 100, 2))
    else:
        donation_dependency = 0


    # --- EXPENSE VOLATILITY (How unstable spending is) ---
    expense_volatility = float(round(df["expense"].std(), 2))


    # --- ANOMALY DETECTION (Simple rule-based) ---
    anomalies = []
    expense_threshold = float(df["expense"].mean() + 2 * df["expense"].std())

    for idx, value in enumerate(df["expense"]):
        if value > expense_threshold:
            anomalies.append({
                "row": int(idx),
                "expense": float(value),
                "issue": "Unusually high expense detected"
            })


    # --- FINANCIAL STABILITY SCORE (0–100) ---
    stability_score = 100
    if surplus < 0:
        stability_score -= 30
    if burn_rate > (total_income / len(df)) * 0.8:
        stability_score -= 25
    if donation_dependency > 70:
        stability_score -= 15
    if expense_volatility > float(df["expense"].mean()) * 0.5:
        stability_score -= 10
    stability_score = int(max(0, stability_score))


    # --- INSIGHTS ---
    insights = {
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "total_donations": round(total_donations, 2),
        "surplus_or_deficit": round(surplus, 2),
        "monthly_burn_rate": burn_rate,
        "donation_dependency_percent": donation_dependency,
        "expense_volatility": expense_volatility,
        "stability_score": stability_score,
        "anomalies": anomalies,
        "summary": generate_summary(
            surplus,
            burn_rate,
            donation_dependency,
            stability_score,
            len(anomalies)
        )
    }

    return insights



def generate_summary(surplus, burn_rate, donation_dependency, stability_score, anomalies_count):
    """
    Creates a human-readable, intelligent summary for dashboards.
    """

    summary = []

    # Surplus/Deficit Insight
    if surplus >= 0:
        summary.append(f"NGO is operating at a surplus of ₹{surplus}.")
    else:
        summary.append(f"NGO is running a deficit of ₹{abs(surplus)}.")

    # Burn Rate Insight
    summary.append(f"Average monthly burn rate is ₹{burn_rate}.")

    # Donation Dependency
    if donation_dependency > 70:
        summary.append("High dependency on donations — risk of instability.")
    elif donation_dependency > 40:
        summary.append("Moderate donation dependency — maintain donor relationships.")
    else:
        summary.append("Healthy revenue mix with low donation dependency.")

    # Financial Stability Score
    summary.append(f"Financial stability score is {stability_score}/100.")

    # Anomaly Alert
    if anomalies_count > 0:
        summary.append(f"{anomalies_count} unusual expense spikes detected.")
    else:
        summary.append("No financial anomalies detected.")

    return summary