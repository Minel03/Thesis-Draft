from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import os
import re

app = FastAPI()

# Enable CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Base storage path
BASE_STORAGE_PATH = "../../storage"

# Ensure base storage folder exists
os.makedirs(BASE_STORAGE_PATH, exist_ok=True)

@app.post("/storage/upload/")
async def upload_file(file: UploadFile = File(...)):
    try:
        filename = file.filename
        
        # Determine subfolder based on filename pattern
        if re.match(r"^daily_(solar|wind)_data_\d{4}_\d{2}_\d{2}T\d{2}_\d{2}_\d{2}_\d{3}Z.json$", filename):
            subfolder = "daily"
        elif re.match(r"^hourly_(solar|wind)_data_\d{4}_\d{2}_\d{2}T\d{2}_\d{2}_\d{2}_\d{3}Z.json$", filename):
            subfolder = "hourly"
        elif re.match(r"^weekly_(solar|wind)_data_\d{4}_\d{2}_\d{2}T\d{2}_\d{2}_\d{2}_\d{3}Z.json$", filename):
            subfolder = "weekly"
        else:
            subfolder = "others"  # Default folder for unrecognized patterns

        # Create the target folder if it doesn't exist
        target_folder = os.path.join(BASE_STORAGE_PATH, subfolder)
        os.makedirs(target_folder, exist_ok=True)

        # Save the uploaded file to the determined directory
        file_location = os.path.join(target_folder, filename)
        
        with open(file_location, "wb") as f:
            content = await file.read()  # Read the file content
            f.write(content)  # Write the content to the file
        
        return {"status": "File uploaded successfully", "file_path": file_location}
    
    except Exception as e:
        return {"error": f"Error storing the file: {str(e)}"}