from fastapi import FastAPI, File, UploadFile, HTTPException
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
                cursor.close()  # ✅ Only close cursor if initialized
                db_conn.close()

        return {"status": "File uploaded successfully", "file_path": file_location}

    except Exception as e:
        print(f"Error storing the file: {str(e)}")  # Debugging
        return {"error": f"Error storing the file: {str(e)}"}

@app.get("/storage/latest-file/")
async def get_latest_file(data_type: str):
    try:
        # Determine the correct table based on the data_type query parameter
        if data_type == "hourly":
            table_name = "hourly_data"
        elif data_type == "daily":
            table_name = "daily_data"
        elif data_type == "weekly":
            table_name = "weekly_data"
        else:
            raise HTTPException(status_code=400, detail="Invalid data_type. Valid options are 'hourly', 'daily', 'weekly'.")

        # Connect to the database and fetch the latest file from the specified table
        db_conn = get_db_connection()
        cursor = db_conn.cursor(dictionary=True)

        # Query to retrieve the latest uploaded file's id and filename
        query = f"SELECT id, filename FROM {table_name} ORDER BY id DESC LIMIT 1"
        cursor.execute(query)
        result = cursor.fetchone()

        cursor.close()
        db_conn.close()

        if result:
            return {"id": result["id"], "filename": result["filename"]}
        else:
            return {"error": f"No files found in the {table_name} table."}

    except Exception as e:
        return {"error": f"Error fetching the latest file: {str(e)}"}


