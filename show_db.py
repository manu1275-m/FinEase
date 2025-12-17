import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'database', 'ngo_finance.db')

try:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # Get all tables
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cur.fetchall()]
    print('='*60)
    print(f'Tables found: {tables}')
    print('='*60)
    print()
    
    # Show uploads
    if 'ngo_financial_uploads' in tables:
        print('=== ngo_financial_uploads (Recent 5) ===')
        cur.execute('''SELECT id, total_income, total_expense, total_donations, 
                              surplus_or_deficit, risk_level, stability_score, uploaded_at 
                       FROM ngo_financial_uploads ORDER BY uploaded_at DESC LIMIT 5''')
        cols = [description[0] for description in cur.description]
        print(f"Columns: {cols}")
        for row in cur.fetchall():
            print(row)
        print()
    else:
        print('No ngo_financial_uploads table')
        print()
    
    # Show predictions
    if 'ngo_predictions' in tables:
        print('=== ngo_predictions (Recent 5) ===')
        cur.execute('''SELECT id, income, expense, donations, future_funding_required, 
                              confidence_score, risk_level, created_at 
                       FROM ngo_predictions ORDER BY created_at DESC LIMIT 5''')
        cols = [description[0] for description in cur.description]
        print(f"Columns: {cols}")
        for row in cur.fetchall():
            print(row)
    else:
        print('No ngo_predictions table')
    
    conn.close()
    print()
    print(f'Database location: {db_path}')
except FileNotFoundError:
    print(f'Database file not found at: {db_path}')
except Exception as e:
    print(f'Error: {e}')
