from fastapi import FastAPI, File, UploadFile, HTTPException
import os
import re
import pandas as pd
import json
import mysql.connector
from datetime import datetime

app = FastAPI()

BASE_STORAGE_PATH = "../../storage"
os.makedirs(BASE_STORAGE_PATH, exist_ok=True)

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "thesis",
}

def get_db_connection():
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except mysql.connector.Error as err:
        print("Database connection error:", err)
        raise HTTPException(status_code=500, detail="Database connection failed.")

@app.post("/storage/upload/")
async def upload_file(file: UploadFile = File(...)):
    try:
        filename = file.filename
        print("Received file:", filename)

        if not filename.endswith(".csv"):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed.")

        match = re.match(r"^(hourly|daily|weekly)_(solar|wind)_data.*\.csv$", filename)
        if not match:
            raise HTTPException(status_code=400, detail="Invalid filename format.")

        timeframe, energy_type = match.groups()
        print(f"Processing {timeframe} {energy_type} data...")

        df = pd.read_csv(file.file)
        if df.empty:
            raise HTTPException(status_code=400, detail="CSV file is empty.")

        json_data = df.to_json(orient="records", indent=2)

        timestamp = datetime.now().strftime("%Y_%m_%dT%H_%M_%S_%fZ")
        json_filename = f"{timeframe}_{energy_type}_data_{timestamp}.json"

        target_folder = os.path.join(BASE_STORAGE_PATH, timeframe)
        os.makedirs(target_folder, exist_ok=True)

        json_path = os.path.join(target_folder, json_filename)
        with open(json_path, "w", encoding="utf-8") as json_file:
            json_file.write(json_data)

        print("File saved at:", json_path)

        return {
            "status": "File uploaded and stored successfully",
            "json_path": json_path,
            "table_name": f"{timeframe}_data",
        }

    except Exception as e:
        print("Upload error:", str(e))
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
