from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import re
import pandas as pd
import json
import mysql.connector
from datetime import datetime

app = FastAPI()

# Enable CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base storage path
BASE_STORAGE_PATH = "../../storage"
os.makedirs(BASE_STORAGE_PATH, exist_ok=True)

# MySQL database connection
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",  # Change according to your database password
    "database": "thesis",
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

@app.post("/storage/upload/")
async def upload_file(file: UploadFile = File(...)):
    try:
        filename = file.filename
        if not filename.endswith(".csv"):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed.")

        # Extract details from filename
        match = re.match(r"^(hourly|daily|weekly)_(solar|wind)_data.*\.csv$", filename)
        if not match:
            raise HTTPException(status_code=400, detail="Invalid filename format.")

        timeframe, energy_type = match.groups()

        # Read CSV and convert to JSON
        df = pd.read_csv(file.file)
        json_data = df.to_json(orient="records", indent=2)

        # Generate JSON filename
        timestamp = datetime.now().strftime("%Y_%m_%dT%H_%M_%S_%fZ")
        json_filename = f"{timeframe}_{energy_type}_data_{timestamp}.json"

        # Determine subfolder
        target_folder = os.path.join(BASE_STORAGE_PATH, timeframe)
        os.makedirs(target_folder, exist_ok=True)

        # Save JSON file
        json_path = os.path.join(target_folder, json_filename)
        with open(json_path, "w", encoding="utf-8") as json_file:
            json_file.write(json_data)

        return {
            "status": "File uploaded and stored successfully",
            "json_path": json_path,
            "table_name": f"{timeframe}_data",  # Return correct table name
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.post("/insert_database/")
async def insert_database(data: dict):
    """Insert JSON data into MySQL."""
    json_path = data.get("json_path")
    table_name = data.get("table_name")

    if not json_path or not table_name:
        raise HTTPException(status_code=400, detail="Invalid request data")

    try:
        # Read JSON file
        with open(json_path, "r", encoding="utf-8") as json_file:
            json_data = json.load(json_file)

        # Insert data into the correct table
        insert_into_database(table_name, json_data)

        return {"status": "Data inserted into database successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inserting into database: {str(e)}")


def insert_into_database(table_name, data):
    """Insert JSON data into MySQL database."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Assuming JSON structure matches table fields (modify as needed)
    for row in data:
        keys = ", ".join(row.keys())
        values = ", ".join(["%s"] * len(row))
        sql = f"INSERT INTO {table_name} ({keys}) VALUES ({values})"
        cursor.execute(sql, tuple(row.values()))

    conn.commit()
    cursor.close()
    conn.close()
