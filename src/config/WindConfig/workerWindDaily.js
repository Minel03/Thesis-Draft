import * as Comlink from "comlink";
import { parse } from "csv-parse/browser/esm/sync";

// Create a schema for the expected data structure
class DataValidator {
  validateDailyTimestamp(timestamp) {
    return /^\d{4}-\d{2}-\d{2}$/.test(timestamp);
  }

  validateRequiredFields(headers) {
    const requiredFields = ["date", "wind_power", "wind_speed", "dew_point"];
    return requiredFields.every((field) => headers.includes(field));
  }
}

// Main worker function
const processFile = async (file) => {
  if (!file) {
    self.postMessage({ type: "error", error: "No file provided" });
    return;
  }

  try {
    // Read file as text
    const text = await file.text();

    // Parse CSV using csv-parser
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (!records.length) {
      self.postMessage({ type: "error", error: "No data found in CSV file" });
      return;
    }

    // Validate headers
    const validator = new DataValidator();
    const headers = Object.keys(records[0]);

    if (!validator.validateRequiredFields(headers)) {
      self.postMessage({
        type: "error",
        error: "Missing required columns in CSV",
      });
      return;
    }

    // Process and validate each row
    const jsonData = records
      .map((row) => {
        // Validate timestamp
        if (!validator.validateDailyTimestamp(row.date)) {
          self.postMessage({
            type: "error",
            error: `Invalid timestamp detected: ${row.date}. Only daily timestamps are allowed.`,
          });
          return null;
        }

        // Convert numeric values
        return {
          date: row.date,
          wind_power: parseFloat(row.wind_power) || 0,
          wind_speed: parseFloat(row.wind_speed) || 0,
          dew_point: parseFloat(row.dew_point) || 0,
        };
      })
      .filter(Boolean);

    self.postMessage({ type: "complete", data: jsonData });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};

// Expose the function via Comlink
Comlink.expose({ processFile });

// For backward compatibility with existing code
self.onmessage = async (e) => {
  const { file } = e.data;
  await processFile(file);
};
