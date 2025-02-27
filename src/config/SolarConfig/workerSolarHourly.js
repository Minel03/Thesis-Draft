import * as Comlink from "comlink";
import { parse } from "csv-parse/browser/esm/sync";

// Define a class for validation
class DataValidator {
  validateHourlyTimestamp(timestamp) {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:00:00$/.test(timestamp);
  }

  validateRequiredFields(headers) {
    const requiredFields = [
      "time",
      "solar_power",
      "dhi",
      "dni",
      "ghi",
      "temperature",
      "relative_humidity",
      "solar_zenith_angle",
    ];

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
    // Read the CSV file as text
    const text = await file.text();

    // Parse the CSV content
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
      .map((row, index) => {
        // Validate timestamp
        if (!validator.validateHourlyTimestamp(row.time)) {
          self.postMessage({
            type: "error",
            error: `Invalid timestamp on row ${index + 2}: ${
              row.time
            }. Only hourly timestamps (YYYY-MM-DDTHH:00:00) are allowed.`,
          });
          return null;
        }

        // Convert numeric values
        return {
          hour: row.time.slice(0, 13), // Extract YYYY-MM-DDTHH
          solar_power: parseFloat(row.solar_power) || 0,
          dhi: parseFloat(row.dhi) || 0,
          dni: parseFloat(row.dni) || 0,
          ghi: parseFloat(row.ghi) || 0,
          temperature: parseFloat(row.temperature) || 0,
          relative_humidity: parseFloat(row.relative_humidity) || 0,
          solar_zenith_angle: parseFloat(row.solar_zenith_angle) || 0,
        };
      })
      .filter(Boolean);

    self.postMessage({ type: "complete", data: jsonData });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};

// Expose the function via Comlink
Comlink.expose({
  processFile,
});

// For backward compatibility with existing code
self.onmessage = async (e) => {
  const { file } = e.data;
  await processFile(file);
};
