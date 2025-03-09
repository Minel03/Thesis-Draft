from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, desc
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
import os
import re
import json
import pandas as pd
import logging
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = FastAPI()

# Enable CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
DATABASE_URL = f"mysql+mysqlconnector://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}/{os.getenv('DB_NAME')}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLAlchemy models
class BaseDataModel(Base):
    __abstract__ = True
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)

class HourlyData(BaseDataModel):
    __tablename__ = "hourly_data"

class DailyData(BaseDataModel):
    __tablename__ = "daily_data"

class WeeklyData(BaseDataModel):
    __tablename__ = "weekly_data"

Base.metadata.create_all(bind=engine)

# Database session dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Response models
class FileResponse(BaseModel):
    status: str
    file_path: str

class LatestFileResponse(BaseModel):
    id: int
    filename: str

# Storage configuration
BASE_STORAGE_PATH = os.getenv('STORAGE_PATH', "../../storage")
os.makedirs(BASE_STORAGE_PATH, exist_ok=True)

FOLDERS = ["hourly", "daily", "weekly", "others", "json"]
DATA_MODELS = {
    "hourly": HourlyData,
    "daily": DailyData,
    "weekly": WeeklyData
}

def get_file_path(filename: str) -> str:
    for folder in FOLDERS:
        file_path = os.path.join(BASE_STORAGE_PATH, folder, filename)
        if os.path.exists(file_path):
            return file_path
    return None

@app.get("/storage/read/{filename}")
async def read_json_file(filename: str):
    try:
        logger.info(f"Reading file: {filename}")
        folders = ['hourly', 'daily', 'weekly', 'json', 'others']
        file_path = None
        for folder in folders:
            temp_path = os.path.join(BASE_STORAGE_PATH, folder, filename)
            if os.path.exists(temp_path):
                file_path = temp_path
                break
        if not file_path:
            logger.error(f"File not found: {filename}")
            raise HTTPException(status_code=404, detail="File not found")

        with open(file_path, 'r') as f:
            content = f.read()
            logger.info(f"Raw content: {content[:100]}...")
            data = json.loads(content)
        logger.info(f"Parsed data: {data[:2] if isinstance(data, list) else data}")
        return data
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Invalid JSON: {str(e)}")
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")

@app.post("/storage/process_model_data/")
async def process_model_data(file: UploadFile = File(...)):
    try:
        filename = file.filename
        logger.info(f"Processing file: {filename}")
        if "hourly" in filename:
            subfolder = "hourly"
            logger.info("Matched subfolder: hourly")
        elif "daily" in filename:
            subfolder = "daily"
            logger.info("Matched subfolder: daily")
        elif "weekly" in filename:
            subfolder = "weekly"
            logger.info("Matched subfolder: weekly")
        else:
            logger.error(f"Invalid filename format: {filename}")
            raise HTTPException(status_code=400, detail="Invalid filename format")
        
        target_folder = os.path.join(BASE_STORAGE_PATH, subfolder)
        os.makedirs(target_folder, exist_ok=True)
        file_path = os.path.join(target_folder, filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        logger.info(f"File saved to: {file_path}")
        return {"status": "File processed", "file_path": file_path}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/storage/upload/", response_model=FileResponse)
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        filename = file.filename
        print(f"Received file: {filename}")

        # Determine data type from filename
        pattern = r"^(hourly|daily|weekly)_(solar|wind)_data_\d{4}_\d{2}_\d{2}T\d{2}_\d{2}_\d{2}_\d{3}Z\.json$"
        match = re.match(pattern, filename)
        
        subfolder = "others"
        data_model = None
        
        if match:
            frequency = match.group(1)
            subfolder = frequency
            data_model = DATA_MODELS[frequency]

        # Save file
        target_folder = os.path.join(BASE_STORAGE_PATH, subfolder)
        os.makedirs(target_folder, exist_ok=True)
        file_location = os.path.join(target_folder, filename)
        
        content = await file.read()
        with open(file_location, "wb") as f:
            f.write(content)

        # Create DB entry if valid model type
        if data_model:
            db_entry = data_model(filename=filename)
            db.add(db_entry)
            db.commit()

        return {"status": "File uploaded successfully", "file_path": file_location}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/storage/upload_csv/", response_model=FileResponse)
async def upload_csv(file: UploadFile = File(...)):
    try:
        file_location = os.path.join(BASE_STORAGE_PATH, "json", file.filename)
        os.makedirs(os.path.dirname(file_location), exist_ok=True)
        
        content = await file.read()
        with open(file_location, "wb") as f:
            f.write(content)

        return {"status": "File uploaded successfully", "file_path": file_location}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/storage/latest-file/", response_model=LatestFileResponse)
async def get_latest_file(data_type: str, db: Session = Depends(get_db)):
    try:
        data_model = DATA_MODELS.get(data_type)
        if not data_model:
            raise HTTPException(status_code=400, detail="Invalid data_type. Valid options are 'hourly', 'daily', 'weekly'.")

        latest_file = db.query(data_model).order_by(desc(data_model.id)).first()
        if not latest_file:
            raise HTTPException(status_code=404, detail=f"No files found in the {data_model.__tablename__} table.")

        return {"id": latest_file.id, "filename": latest_file.filename}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))