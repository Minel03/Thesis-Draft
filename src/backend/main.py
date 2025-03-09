from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, MetaData, Table, desc
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, Field
from typing import Optional
import os
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Enable CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow requests from any frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Database connection using SQLAlchemy
DATABASE_URL = f"mysql+mysqlconnector://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}/{os.getenv('DB_NAME')}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Define SQLAlchemy models
class HourlyData(Base):
    __tablename__ = "hourly_data"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)

class DailyData(Base):
    __tablename__ = "daily_data"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)

class WeeklyData(Base):
    __tablename__ = "weekly_data"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models for response validation
class FileResponse(BaseModel):
    status: str
    file_path: str

class ErrorResponse(BaseModel):
    error: str

class LatestFileResponse(BaseModel):
    id: int
    filename: str

# Base storage path
BASE_STORAGE_PATH = os.getenv('STORAGE_PATH', "../../storage")
os.makedirs(BASE_STORAGE_PATH, exist_ok=True)  # Ensure base storage exists

@app.post("/storage/upload/", response_model=FileResponse)
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        filename = file.filename
        print(f"Received file: {filename}")  # Debugging

        # Determine subfolder and model based on filename pattern
        data_model = None
        if re.match(r"^hourly_(solar|wind)_data_\d{4}_\d{2}_\d{2}T\d{2}_\d{2}_\d{2}_\d{3}Z\.json$", filename):
            subfolder = "hourly"
            data_model = HourlyData
        elif re.match(r"^daily_(solar|wind)_data_\d{4}_\d{2}_\d{2}T\d{2}_\d{2}_\d{2}_\d{3}Z\.json$", filename):
            subfolder = "daily"
            data_model = DailyData
        elif re.match(r"^weekly_(solar|wind)_data_\d{4}_\d{2}_\d{2}T\d{2}_\d{2}_\d{2}_\d{3}Z\.json$", filename):
            subfolder = "weekly"
            data_model = WeeklyData
        else:
            print(f"No match found! Assigning to 'others' folder. Filename: {filename}")
            subfolder = "others"

        # Ensure the correct subfolder exists
        target_folder = os.path.join(BASE_STORAGE_PATH, subfolder)
        os.makedirs(target_folder, exist_ok=True)

        # Save the uploaded file to the storage directory
        file_location = os.path.join(target_folder, filename)
        content = await file.read()  # Read the file content
        
        with open(file_location, "wb") as f:
            f.write(content)  # Write the content to the file

        print(f"File saved to: {file_location}")  # Debugging

        # Insert filename into database if valid model exists
        if data_model:
            db_entry = data_model(filename=filename)
            db.add(db_entry)
            db.commit()
            print(f"Inserted {filename} into {data_model.__tablename__} table.")

        return {"status": "File uploaded successfully", "file_path": file_location}

    except Exception as e:
        print(f"Error storing the file: {str(e)}")  # Debugging
        raise HTTPException(status_code=500, detail=f"Error storing the file: {str(e)}")

@app.post("/storage/upload_csv/")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        filename = file.filename
        print(f"Received file: {filename}")  # Debugging

        # Fixed target folder: storage/json
        target_folder = os.path.join(BASE_STORAGE_PATH, "json")
        os.makedirs(target_folder, exist_ok=True)

        # Save the uploaded file to the storage/json directory
        file_location = os.path.join(target_folder, filename)
        content = await file.read()  # Read the file content
        
        with open(file_location, "wb") as f:
            f.write(content)  # Write the content to the file

        print(f"File saved to: {file_location}")  # Debugging

        # No database model selection since we're not categorizing
        # Optionally, you could still log the filename in a generic table if needed
        # For now, skipping database insertion unless you specify a table

        return {"status": "File uploaded successfully", "file_path": file_location}

    except Exception as e:
        print(f"Error storing the file: {str(e)}")  # Debugging
        raise HTTPException(status_code=500, detail=f"Error storing the file: {str(e)}")

@app.get("/storage/latest-file/", response_model=LatestFileResponse)
async def get_latest_file(data_type: str, db: Session = Depends(get_db)):
    try:
        # Determine the correct model based on the data_type query parameter
        if data_type == "hourly":
            data_model = HourlyData
        elif data_type == "daily":
            data_model = DailyData
        elif data_type == "weekly":
            data_model = WeeklyData
        else:
            raise HTTPException(status_code=400, detail="Invalid data_type. Valid options are 'hourly', 'daily', 'weekly'.")

        # Query to retrieve the latest uploaded file's id and filename
        latest_file = db.query(data_model).order_by(desc(data_model.id)).first()

        if latest_file:
            return {"id": latest_file.id, "filename": latest_file.filename}
        else:
            raise HTTPException(status_code=404, detail=f"No files found in the {data_model.__tablename__} table.")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching the latest file: {str(e)}")