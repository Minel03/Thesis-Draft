import * as Comlink from "comlink";
import { parse } from "csv-parse/browser/esm/sync";

// Define a class for validation
class DataValidator {
  validateWeeklyTimestamp(timestamp) {
    return /^\d{4}-W\d{2}$/.test(timestamp); // Validate weekly timestamp format (e.g., 2022-W01)
  }

  validateRequiredFields(headers) {
    const requiredFields = [
      "week", // Weekly timestamp (YYYY-W##)
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
    const jsonData = {};

    records.forEach((row, index) => {
      // Validate the weekly timestamp
      const timestamp = row.week;
      if (!validator.validateWeeklyTimestamp(timestamp)) {
        self.postMessage({
          type: "error",
          error: `Invalid timestamp on row ${
            index + 2
          }: ${timestamp}. Only weekly timestamps (YYYY-W##) are allowed.`,
        });
        return;
      }

      // Prepare the data for aggregation
      if (!jsonData[timestamp]) {
        jsonData[timestamp] = {
          week: timestamp,
          solar_power: 0,
          dhi: 0,
          dni: 0,
          ghi: 0,
          temperature: 0,
          relative_humidity: 0,
          solar_zenith_angle: 0,
          count: 0, // To track the number of records for averaging
        };
      }

      // Aggregate values for each week
      jsonData[timestamp].solar_power += parseFloat(row.solar_power) || 0;
      jsonData[timestamp].dhi += parseFloat(row.dhi) || 0;
      jsonData[timestamp].dni += parseFloat(row.dni) || 0;
      jsonData[timestamp].ghi += parseFloat(row.ghi) || 0;
      jsonData[timestamp].temperature += parseFloat(row.temperature) || 0;
      jsonData[timestamp].relative_humidity +=
        parseFloat(row.relative_humidity) || 0;
      jsonData[timestamp].solar_zenith_angle +=
        parseFloat(row.solar_zenith_angle) || 0;
      jsonData[timestamp].count += 1; // Increase the count for averaging
    });

    // Calculate averages for each week
    Object.values(jsonData).forEach((weekData) => {
      weekData.solar_power /= weekData.count;
      weekData.dhi /= weekData.count;
      weekData.dni /= weekData.count;
      weekData.ghi /= weekData.count;
      weekData.temperature /= weekData.count;
      weekData.relative_humidity /= weekData.count;
      weekData.solar_zenith_angle /= weekData.count;
      delete weekData.count; // Remove the count property after calculating the averages
    });

    // Send the processed data back
    self.postMessage({ type: "complete", data: Object.values(jsonData) });
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
