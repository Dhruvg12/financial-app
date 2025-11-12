from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
import yfinance as yf
import pandas as pd
from auth import get_current_user, authenticate_user, create_user, create_token, get_db
from database import engine, Base
from models import User

app = FastAPI()

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for local dev; tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

@app.get("/api/stock/{symbol}")
def get_stock(symbol: str, period: str = "6mo", interval: str = "1d", user: dict = Depends(get_current_user)):
    """Return OHLCV data for a symbol.

    Query params:
    - period: yfinance period string (e.g. '1mo','3mo','6mo','1y','max')
    - interval: '1d' or '1wk'
    """
    # Validate interval to avoid unexpected values
    if interval not in ("1d", "1wk"):
        raise HTTPException(status_code=400, detail="Invalid interval; allowed: 1d, 1wk")
    try:
        data = yf.download(symbol, period=period, interval=interval, auto_adjust=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {e}")
    data.reset_index(inplace=True)
    
    # Flatten MultiIndex columns if present and clean up column names
    if isinstance(data.columns, pd.MultiIndex):
        # Extract just the metric name (Open, High, Low, Close, Volume) without symbol
        data.columns = [col[0] if isinstance(col, tuple) else str(col) for col in data.columns.values]
    else:
        data.columns = [str(col) for col in data.columns]
    
    # Clean up column names - remove symbol suffixes and underscores
    column_mapping = {}
    for col in data.columns:
        # Remove trailing underscores and symbol suffixes
        clean_col = str(col).rstrip('_')
        # Remove symbol suffix if present (e.g., "Close_TSLA" -> "Close")
        if '_' in clean_col and clean_col.split('_')[-1].isupper():
            clean_col = '_'.join(clean_col.split('_')[:-1])
        # Standardize Date column name
        if 'Date' in clean_col or clean_col == 'Datetime':
            clean_col = 'Date'
        column_mapping[col] = clean_col
    
    data.rename(columns=column_mapping, inplace=True)
    
    # Convert Date column to string for JSON serialization
    if 'Date' in data.columns:
        data['Date'] = pd.to_datetime(data['Date']).dt.strftime('%Y-%m-%d')
    
    # Convert DataFrame to JSON-serializable format
    import numpy as np
    
    def convert_value(val):
        """Convert pandas/numpy types to native Python types"""
        if pd.isna(val):
            return None
        if isinstance(val, (pd.Timestamp, pd.Timedelta)):
            return str(val)
        if isinstance(val, (np.integer, np.int64, np.int32)):
            return int(val)
        if isinstance(val, (np.floating, np.float64, np.float32)):
            return float(val)
        if isinstance(val, np.ndarray):
            return val.tolist()
        if hasattr(val, 'item'):
            return val.item()
        return val
    
    # Build records manually
    records = []
    for idx in data.index:
        record = {}
        for col in data.columns:
            val = data.at[idx, col]
            record[str(col)] = convert_value(val)
        records.append(record)
    
    return records


# --- Authentication endpoints ---
class RegisterModel(BaseModel):
    username: str
    password: str


@app.post("/api/register")
def register(data: RegisterModel, db=Depends(get_db)):
    # Prevent duplicate users
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")
    user = create_user(data.username, data.password, db)
    token = create_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer", "username": user.username}


@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer", "username": user.username}
