from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
import os
import re

app = FastAPI()

# Enable CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow requests from any frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# MySQL Database Connection
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",      # XAMPP MySQL host
        user="root",           # Default XAMPP user
        password="",           # Default XAMPP password (empty)
        database="thesis",      # Your database name
        autocommit=True  # Auto-commit each query
    )

# Base storage path
BASE_STORAGE_PATH = "../../storage"
os.makedirs(BASE_STORAGE_PATH, exist_ok=True)  # Ensure base storage exists

@app.post("/storage/upload/")
async def upload_file(file: UploadFile = File(...)):
    try:
        filename = file.filename
        print(f"Received file: {filename}")  # Debugging

        # Determine subfolder based on filename pattern
        if re.match(r"^hourly_(solar|wind)_data_\d{4}_\d{2}_\d{2}T\d{2}_\d{2}_\d{2}_\d{3}Z\.json$", filename):
            subfolder = "hourly"
            table_name = "hourly_data"
        elif re.match(r"^daily_(solar|wind)_data_\d{4}_\d{2}_\d{2}T\d{2}_\d{2}_\d{2}_\d{3}Z\.json$", filename):
            subfolder = "daily"
            table_name = "daily_data"
        elif re.match(r"^weekly_(solar|wind)_data_\d{4}_\d{2}_\d{2}T\d{2}_\d{2}_\d{2}_\d{3}Z\.json$", filename):
            subfolder = "weekly"
            table_name = "weekly_data"
        else:
            print(f"No match found! Assigning to 'others' folder. Filename: {filename}")
            subfolder = "others"
            table_name = None

        # Ensure the correct subfolder exists
        target_folder = os.path.join(BASE_STORAGE_PATH, subfolder)
        os.makedirs(target_folder, exist_ok=True)

        # Save the uploaded file to the storage directory
        file_location = os.path.join(target_folder, filename)
        with open(file_location, "wb") as f:
            content = await file.read()  # Read the file content
            f.write(content)  # Write the content to the file

        print(f"File saved to: {file_location}")  # Debugging

        # Insert filename into database if valid
        if table_name:
            db_conn = get_db_connection()
            cursor = db_conn.cursor()

        try:
            query = f"INSERT INTO {table_name} (filename) VALUES (%s)"
            cursor.execute(query, (filename,))
            db_conn.commit()
            print(f"Inserted {filename} into {table_name} table.")  # Confirm insertion
        except Exception as e:
            print(f"Database Error: {str(e)}")  # Print any DB error
        finally:
            cursor.close()
            db_conn.close()

        return {"status": "File uploaded successfully", "file_path": file_location}
    
    except Exception as e:
        print(f"Error storing the file: {str(e)}")  # Debugging
        return {"error": f"Error storing the file: {str(e)}"}
