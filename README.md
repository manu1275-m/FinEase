# FinEase - AI Financial Analyst for NGOs

An intelligent financial prediction and analysis platform that helps Non-Governmental Organizations (NGOs) forecast funding requirements and analyze financial health using machine learning.

## 🎯 Features

...

## 📊 Tech Stack

### Backend
- **Framework**: FastAPI + Uvicorn
- **ML**: Scikit-learn (RandomForestRegressor)
- **Data Processing**: Pandas, NumPy
- **Database**: SQLite3
- **Language**: Python 3.10.11

### Frontend
- **HTML5, CSS3, JavaScript (Vanilla)**
- **Visualization**: Chart.js
- **Font**: Google Fonts (Space Grotesk)
- **Theme**: Modern dark gradient design

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ (tested on 3.10.11)
- Windows/Mac/Linux
- 200MB disk space

### Installation

1. **Clone or navigate to project**
	 ```bash
	 cd C:\Users\manu7\VSCode\FinEase
	 ```

2. **Activate virtual environment**
	 ```bash
	 # Windows
	 .\.venv\Scripts\Activate.ps1
   
	 # Mac/Linux
	 source .venv/bin/activate
	 ```

3. **Install dependencies**
	 ```bash
	 pip install -r backend/requirements.txt
	 ```

### Running the Application

#### **Option 1: One-Click Launcher** (Recommended)
```powershell
& '.\run_local.ps1'
```
- Starts backend on `http://127.0.0.1:8011`
- Starts frontend on `http://127.0.0.1:5500`
- Auto-opens browser to frontend

#### **Option 2: Manual Start**

**Terminal 1 - Backend**
```bash
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8011
```

**Terminal 2 - Frontend**
```bash
cd frontend
python -m http.server 5500
```

Then open: `http://127.0.0.1:5500`

## 📖 Usage Guide

### Web Interface

1. **Prediction**
	 - Enter Income, Expense, and Donations
	 - Click "Predict Funding"
	 - View funding requirement + confidence + risk level

2. **File Upload**
	 - Upload NGO financial data (CSV or Excel)
	 - Required columns: `income`, `expense`, `donations`
	 - View comprehensive financial analysis with metrics and charts

3. **Database Inspector**
	 - Terminal: `python show_db.py`
	 - Shows all recorded uploads and predictions

## 🔌 API Endpoints

### Root
```
GET /
```
Returns welcome message and available endpoints.

### Health Check
```
GET /health
```
Returns server status.

### Prediction
```
POST /predict
Content-Type: application/json

{
	"income": 100000,
	"expense": 80000,
	"donations": 20000
}
```

**Response:**
```json
{
	"status": "success",
	"input_data": {
		"income": 100000,
		"expense": 80000,
		"donations": 20000
	},
	"future_funding_required": 81926.91,
	"confidence_score": 94.05,
	"risk_level": "Medium"
}
```

### File Upload & Analysis
```
POST /upload-file
Content-Type: multipart/form-data

file: <CSV or Excel file>
```

**Response:**
```json
{
	"status": "success",
	"rows_processed": 12,
	"analysis": {
		"total_income": 1200000.0,
		"total_expense": 1570000.0,
		"total_donations": 200000.0,
		"surplus_or_deficit": -370000.0,
		"burn_rate": 130833.33,
		"donation_dependency": 16.67,
		"expense_volatility": 45000.0,
		"stability_score": 45.0,
		"risk_level": "High",
		"anomalies": [],
		"summary": [...]
	}
}
```

### List Uploads
```
GET /uploads?limit=20
```

Returns recent financial uploads from database.

## 📂 Project Structure

```
FinEase/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── predict.py              # ML prediction module
│   ├── analysis.py             # Financial analysis engine
│   ├── train_model.py          # Model training pipeline
│   ├── requirements.txt        # Python dependencies
│   ├── model.pkl               # Trained RandomForest model
│   ├── scaler.pkl              # Feature scaler
│   ├── ngo_large_1000.csv      # Training dataset
│   └── database/               # SQLite database directory
├── frontend/
│   ├── index.html              # Main UI
│   ├── script.js               # API interactions & charts
│   └── script.css              # Styling
├── run_local.ps1               # One-click launcher
├── show_db.py                  # Database inspector utility
└── README.md                   # This file
```

## 🤖 ML Model Details

### Architecture
- **Algorithm**: Random Forest Regressor
- **Training Data**: `ngo_large_1000.csv` (1000 NGO financial records)
- **Features**:
	- Base: income, expense, donations
	- Engineered: surplus, donation_ratio, expense_to_income
- **Metrics**: Cross-validated MAE for model selection

### Confidence Scoring
Confidence is calculated using **Coefficient of Variation (CV)** of ensemble tree predictions:

Where CV = std / mean (std of tree predictions / mean prediction)

- Higher CV → Lower confidence (more tree disagreement)
- Lower CV → Higher confidence (consistent predictions)

### Risk Levels
- **Low**: Expense-to-Income ≤ 70%
- **Medium**: Expense-to-Income 70-99%
- **High**: Expense-to-Income ≥ 100%

## 💾 Database Schema

### ngo_financial_uploads
```sql
CREATE TABLE ngo_financial_uploads (
	id INTEGER PRIMARY KEY,
	total_income REAL,
	total_expense REAL,
	total_donations REAL,
	surplus_or_deficit REAL,
	risk_level TEXT,
	stability_score REAL,
	uploaded_at TIMESTAMP
)
```

### ngo_predictions
```sql
CREATE TABLE ngo_predictions (
	id INTEGER PRIMARY KEY,
	income REAL,
	expense REAL,
	donations REAL,
	future_funding_required REAL,
	confidence_score REAL,
	risk_level TEXT,
	created_at TIMESTAMP
)
```

## 🧪 Testing

### Test Prediction
```powershell
$response = Invoke-WebRequest -UseBasicParsing -Method POST `
	-Uri "http://127.0.0.1:8011/predict" `
	-Headers @{"Content-Type"="application/json"} `
	-Body '{"income":100000,"expense":80000,"donations":20000}'
$response.Content | ConvertFrom-Json | ConvertTo-Json
```

### Test Database Connection
```bash
python show_db.py
```

### Test File Upload
Use the web interface or curl:
```bash
curl -X POST "http://127.0.0.1:8011/upload-file" \
	-F "file=@sample.csv"
```

## 🔧 Development

### Retraining Model
```bash
python backend/train_model.py
```
This will:
1. Load `ngo_large_1000.csv`
2. Train RandomForest and GradientBoosting
3. Compare via cross-validation MAE
4. Save best model to `model.pkl`

### Linting
```bash
python -m pylint backend/
```

## 📊 Sample Data Format

Expected CSV/Excel columns:
```
income,expense,donations
100000,80000,20000
120000,90000,25000
150000,110000,30000
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Port 8011 already in use** | Change port: `--port 8012` |
| **Module not found error** | Ensure venv activated: `.\.venv\Scripts\Activate.ps1` |
| **CORS error** | Backend CORS is enabled for all origins |
| **Database locked** | Ensure only one backend instance running |
| **Model prediction fails** | Check model.pkl exists in backend folder |

## 📝 Configuration

### Backend Port
Edit `run_local.ps1`:
```powershell
$BackendPort = 8011  # Change this
```

### Frontend Port
Edit `run_local.ps1`:
```powershell
$FrontendPort = 5500  # Change this
```

### Database Path
Edit `backend/main.py`:
```python
DB_PATH = Path(__file__).resolve().parents[1] / "database" / "ngo_finance.db"
```

## 🚀 Deployment

### Docker (Recommended)
```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY . .
RUN pip install -r backend/requirements.txt
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Cloud Deployment
- **Heroku**: Add Procfile and deploy
- **AWS**: Use EC2 + RDS for production database
- **Google Cloud**: Cloud Run + Cloud SQL
- **Azure**: App Service + SQL Database

## 📚 Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Scikit-learn Docs](https://scikit-learn.org/)
- [Pandas Guide](https://pandas.pydata.org/)
- [SQLite Tutorial](https://www.sqlite.org/lang.html)

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to branch
5. Open a Pull Request

## 📧 Support

For issues or questions, please:
- Open an issue on GitHub
- Check existing documentation
- Review the System Check Report: `SYSTEM_CHECK_REPORT.md`

---

**Last Updated**: December 13, 2025  
**Status**: ✅ Production Ready
# FinEase
# FinEase
