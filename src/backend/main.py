from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# Enable CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Path to save the uploaded files
STORAGE_PATH = "../../storage"

# Ensure the storage folder exists
os.makedirs(STORAGE_PATH, exist_ok=True)

@app.post("/storage/upload/")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Save the uploaded file to the storage directory
        file_location = os.path.join(STORAGE_PATH, file.filename)
        
        with open(file_location, "wb") as f:
            content = await file.read()  # Read the file content
            f.write(content)  # Write the content to the file
        
        return {"status": "File uploaded successfully", "file_path": file_location}
    
    except Exception as e:
        return {"error": f"Error storing the file: {str(e)}"}
