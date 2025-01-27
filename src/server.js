const express = require("express");
const multer = require("multer");
const csvStream = require("csv-stream");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "uploads/" }); // Temporary upload folder

app.post("/upload", upload.single("file"), (req, res) => {
  const results = [];
  const options = {
    delimiter: ",",
    endLine: "\n",
    columns: true, // Treat the first row as column headers
    escapeChar: '"',
    enclosedChar: '"',
  };

  const fileStream = fs.createReadStream(req.file.path);
  const csv = csvStream.createStream(options);

  fileStream
    .pipe(csv)
    .on("data", (row) => {
      // Extract the "wind_power" field
      if (row["wind_power"]) {
        results.push(row["wind_power"]);
      }
    })
    .on("end", () => {
      fs.unlinkSync(req.file.path); // Delete the file after processing
      res.json(results); // Send the JSON response
    })
    .on("error", (error) => {
      console.error("Error processing file:", error);
      res.status(500).json({ error: "Failed to process file." });
    });
});

const PORT = 3001; // Server port
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
