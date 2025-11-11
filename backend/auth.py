from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
from database import SessionLocal
from models import User
import bcrypt

SECRET_KEY = "SECRET"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_user(username: str, password: str, db):
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user = User(username=username, password=hashed_pw)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(username: str, password: str, db):
    user = db.query(User).filter(User.username == username).first()
    if user and bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
        return user
    return None

def create_token(data: dict):
    # Ensure token contains subject (username) in 'sub'
    data.update({"exp": datetime.utcnow() + timedelta(hours=3)})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    """Decode JWT and return the current user from the database.

    Raises 401 if token invalid or user not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user
