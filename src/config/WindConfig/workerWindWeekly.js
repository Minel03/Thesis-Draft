import * as Comlink from "comlink";
import { parse } from "csv-parse/browser/esm/sync";

// Create a schema for the expected data structure
class DataValidator {
  validateWeeklyTimestamp(timestamp) {
    return /^\d{4}-W\d{2}$/.test(timestamp);
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

    if (
      !headers.includes("week") ||
      !headers.includes("wind_power") ||
      !headers.includes("wind_speed") ||
      !headers.includes("dew_point")
    ) {
      self.postMessage({
        type: "error",
        error: "Missing required columns in CSV",
      });
      return;
    }

    // Process and validate each row
    const jsonData = {};
    records.forEach((row) => {
      // Validate timestamp
      if (!validator.validateWeeklyTimestamp(row.week)) {
        self.postMessage({
          type: "error",
          error: `Invalid timestamp detected: ${row.week}. Only weekly timestamps are allowed.`,
        });
        return;
      }

      if (!jsonData[row.week]) {
        jsonData[row.week] = {
          week: row.week,
          wind_power: 0,
          wind_speed: 0,
          dew_point: 0,
          count: 0,
        };
      }

      jsonData[row.week].wind_power += parseFloat(row.wind_power) || 0;
      jsonData[row.week].wind_speed += parseFloat(row.wind_speed) || 0;
      jsonData[row.week].dew_point += parseFloat(row.dew_point) || 0;
      jsonData[row.week].count += 1;
    });

    self.postMessage({ type: "complete", data: Object.values(jsonData) });
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
