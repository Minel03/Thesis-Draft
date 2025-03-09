import * as Comlink from "comlink";
import { parse } from "csv-parse/browser/esm/sync";

class DataValidator {
  validateDailyTimestamp(timestamp) {
    return /^\d{4}-\d{2}-\d{2}$/.test(timestamp);
  }

  validateHourlyTimestamp(timestamp) {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:00:00$/.test(timestamp);
  }

  validateWeeklyTimestamp(timestamp) {
    return /^\d{4}-W\d{2}$/.test(timestamp);
  }

  validateRequiredFields(headers) {
    const requiredSolarFields = [
      "solar_power",
      "dhi",
      "dni",
      "ghi",
      "temperature",
      "relative_humidity",
      "solar_zenith_angle",
    ];
    return requiredSolarFields.every((field) => headers.includes(field));
  }
}

const processFile = async (file) => {
  if (!file) {
    self.postMessage({ type: "error", error: "No file provided" });
    return;
  }

  try {
    const text = await file.text();
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (!records.length) {
      self.postMessage({ type: "error", error: "No data found in CSV file" });
      return;
    }

    const validator = new DataValidator();
    const headers = Object.keys(records[0]);
    const timeColumns = ["date", "time", "week"];
    const foundTimeColumn = timeColumns.find((col) => headers.includes(col));

    if (!foundTimeColumn) {
      self.postMessage({
        type: "error",
        error:
          "CSV must contain exactly one time-related column: date, time, or week.",
      });
      return;
    }

    if (!validator.validateRequiredFields(headers)) {
      self.postMessage({
        type: "error",
        error: "Missing required solar columns",
      });
      return;
    }

    const firstRow = records[0];
    let expectedTimestampType = null;

    if (firstRow.date && validator.validateDailyTimestamp(firstRow.date)) {
      expectedTimestampType = "date";
    } else if (
      firstRow.time &&
      validator.validateHourlyTimestamp(firstRow.time)
    ) {
      expectedTimestampType = "time";
    } else if (
      firstRow.week &&
      validator.validateWeeklyTimestamp(firstRow.week)
    ) {
      expectedTimestampType = "week";
    } else {
      self.postMessage({
        type: "error",
        error:
          "Invalid timestamp in the first row. Ensure all timestamps follow a consistent format.",
      });
      return;
    }

    const jsonData = records
      .map((row, index) => {
        let isValidTime = false;

        if (
          expectedTimestampType === "date" &&
          row.date &&
          validator.validateDailyTimestamp(row.date)
        ) {
          isValidTime = true;
        } else if (
          expectedTimestampType === "time" &&
          row.time &&
          validator.validateHourlyTimestamp(row.time)
        ) {
          isValidTime = true;
        } else if (
          expectedTimestampType === "week" &&
          row.week &&
          validator.validateWeeklyTimestamp(row.week)
        ) {
          isValidTime = true;
        }

        if (!isValidTime) {
          self.postMessage({
            type: "error",
            error: `Inconsistent timestamp on row ${
              index + 2
            }. Expected ${expectedTimestampType}, but found a different format.`,
          });
          return null;
        }

        const result = {
          [expectedTimestampType]: row[expectedTimestampType],
          solar_power: Number(row.solar_power), // Keep as Number to preserve precision
          dhi: Number(row.dhi),
          dni: Number(row.dni),
          ghi: Number(row.ghi),
          temperature: Number(row.temperature),
          relative_humidity: Number(row.relative_humidity),
          solar_zenith_angle: Number(row.solar_zenith_angle),
        };

        return result;
      })
      .filter(Boolean);

    if (jsonData.length > 0) {
      self.postMessage({ type: "complete", data: jsonData });
    }
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};

Comlink.expose({ processFile });

self.onmessage = async (e) => {
  const { file } = e.data;
  await processFile(file);
};
