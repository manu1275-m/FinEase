from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from analysis import analyze_financial_file
from predict import predict_finance
from pathlib import Path
import sqlite3

# --- Local DB helpers (avoid import path issues) ---
DB_PATH = Path(__file__).resolve().parents[1] / "database" / "ngo_finance.db"

def get_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(str(DB_PATH), check_same_thread=False)

def create_table():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS ngo_financial_uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            total_income REAL,
            total_expense REAL,
            total_donations REAL,
            surplus_or_deficit REAL,
            risk_level TEXT,
            stability_score REAL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()
from fastapi import Depends
from typing import Any, Dict

app = FastAPI(
    title="FinEase - AI Financial Analyst",
    description="Upload NGO financial documents or predict funding requirements using AI.",
    version="2.0"
)

# --- CORS (Allow frontend to call backend) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database setup on startup ---
@app.on_event("startup")
def startup_event():
    try:
        create_table()
    except Exception as e:
        # Avoid crashing startup if table creation fails; surface via health
        print(f"[DB] Startup table creation failed: {e}")


# ----------------------------
#  Prediction Input Schema
# ----------------------------
class FinanceInput(BaseModel):
    income: float
    expense: float
    donations: float


# ----------------------------
#  ROOT ENDPOINT
# ----------------------------
@app.get("/")
def root():
    return {
        "message": "FinEase Backend Running Successfully",
        "endpoints": {
            "/predict": "Predict funding requirement",
            "/upload-file": "Upload NGO financial CSV/Excel for analysis",
            "/health": "Check backend health"
        }
    }


# ----------------------------
#  HEALTH CHECK ENDPOINT
# ----------------------------
@app.get("/health")
def health_check():
    return {"status": "OK", "server": "running"}


# ----------------------------
#  AI PREDICTION ENDPOINT
# ----------------------------
@app.post("/predict")
def predict_route(data: FinanceInput):
    try:
        result = predict_finance(data.income, data.expense, data.donations)

        # Persist prediction to DB (create table if missing)
        try:
            conn = get_db()
            cur = conn.cursor()
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS ngo_predictions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    income REAL,
                    expense REAL,
                    donations REAL,
                    future_funding_required REAL,
                    confidence_score REAL,
                    risk_level TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            cur.execute(
                """
                INSERT INTO ngo_predictions (income, expense, donations, future_funding_required, confidence_score, risk_level)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    float(data.income), float(data.expense), float(data.donations),
                    float(result.get("future_funding_required", 0.0)),
                    float(result.get("confidence_score", 0.0)),
                    str(result.get("risk_level", "Unknown"))
                )
            )
            conn.commit()
            conn.close()
        except Exception as db_err:
            print(f"[DB] Failed to persist prediction: {db_err}")

        return {
            "status": "success",
            "input_data": data.dict(),
            **result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------
#  FILE UPLOAD + ANALYSIS
# ----------------------------
@app.post("/upload-file")
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename.lower()

    try:
        # --- Read CSV or Excel automatically ---
        if filename.endswith(".csv"):
            df = pd.read_csv(file.file)
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(file.file)
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Upload CSV or Excel."
            )

        # --- Validate Required Columns ---
        required_cols = {"income", "expense", "donations"}
        if not required_cols.issubset(df.columns):
            raise HTTPException(
                status_code=400,
                detail=f"File missing required columns: {required_cols}"
            )

        # --- Perform Analysis ---
        insights = analyze_financial_file(df)

        # Persist insights summary to DB
        try:
            conn = get_db()
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO ngo_financial_uploads (
                    total_income, total_expense, total_donations, surplus_or_deficit, risk_level, stability_score
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    float(insights.get("total_income", 0.0)),
                    float(insights.get("total_expense", 0.0)),
                    float(insights.get("total_donations", 0.0)),
                    float(insights.get("surplus_or_deficit", 0.0)),
                    str(insights.get("risk_level", "Unknown")),
                    float(insights.get("stability_score", 0.0))
                )
            )
            conn.commit()
            conn.close()
        except Exception as db_err:
            print(f"[DB] Failed to persist upload insights: {db_err}")

        return {
            "status": "success",
            "rows_processed": len(df),
            "analysis": insights
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# ----------------------------
#  LIST RECENT UPLOADS
# ----------------------------
@app.get("/uploads")
def list_uploads(limit: int = 20):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, total_income, total_expense, total_donations, surplus_or_deficit, risk_level, stability_score, uploaded_at
            FROM ngo_financial_uploads
            ORDER BY uploaded_at DESC
            LIMIT ?
            """,
            (limit,)
        )
        rows = cur.fetchall()
        conn.close()
        uploads = [
            {
                "id": r[0],
                "total_income": r[1],
                "total_expense": r[2],
                "total_donations": r[3],
                "surplus_or_deficit": r[4],
                "risk_level": r[5],
                "stability_score": r[6],
                "uploaded_at": r[7],
            }
            for r in rows
        ]
        return {"status": "success", "items": uploads}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----------------------------
#  LIST RECENT PREDICTIONS
# ----------------------------
@app.get("/predictions")
def list_predictions(limit: int = 20):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, income, expense, donations, future_funding_required, confidence_score, risk_level, created_at
            FROM ngo_predictions
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,)
        )
        rows = cur.fetchall()
        conn.close()

        items = [
            {
                "id": r[0],
                "income": r[1],
                "expense": r[2],
                "donations": r[3],
                "future_funding_required": r[4],
                "confidence_score": r[5],
                "risk_level": r[6],
                "created_at": r[7],
            }
            for r in rows
        ]
        return {"status": "success", "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
