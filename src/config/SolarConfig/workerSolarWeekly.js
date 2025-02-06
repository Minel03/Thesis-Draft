self.onmessage = async (e) => {
  const { file } = e.data;

  if (!file) {
    self.postMessage({ type: "error", error: "No file provided" });
    return;
  }

  try {
    const reader = file.stream().getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    let isHeaderParsed = false;
    let headers = [];
    let jsonData = {};

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;

        // Parse the headers once
        if (!isHeaderParsed) {
          headers = cleanLine.split(",").map((h) => h.trim());
          isHeaderParsed = true;

          // Define required columns
          const requiredColumns = [
            "week",
            "solar_power",
            "dhi",
            "dni",
            "ghi",
            "temperature",
            "relative_humidity",
            "solar_zenith_angle",
          ];

          // Check for missing columns
          const missingColumns = requiredColumns.filter(
            (col) => !headers.includes(col)
          );
          if (missingColumns.length > 0) {
            self.postMessage({
              type: "error",
              error: `Missing required columns: ${missingColumns.join(", ")}`,
            });
            return;
          }
          continue; // Move to the next line after parsing headers
        }

        // Process data rows
        const values = cleanLine.split(",").map((v) => v.trim());
        if (values.length !== headers.length) continue;

        const row = headers.reduce((acc, header, i) => {
          acc[header] = isNaN(values[i]) ? values[i] : parseFloat(values[i]);
          return acc;
        }, {});

        // Validate timestamp format
        const timestamp = row["week"];
        if (!timestamp || !/^\d{4}-W\d{2}$/.test(timestamp)) {
          self.postMessage({
            type: "error",
            error: `Invalid timestamp detected: ${timestamp}. Only weekly timestamps (YYYY-W##) are allowed.`,
          });
          return;
        }

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
            count: 0,
          };
        }

        jsonData[timestamp].solar_power += row["solar_power"] ?? 0;
        jsonData[timestamp].dhi += row["dhi"] ?? 0;
        jsonData[timestamp].dni += row["dni"] ?? 0;
        jsonData[timestamp].ghi += row["ghi"] ?? 0;
        jsonData[timestamp].temperature += row["temperature"] ?? 0;
        jsonData[timestamp].relative_humidity += row["relative_humidity"] ?? 0;
        jsonData[timestamp].solar_zenith_angle +=
          row["solar_zenith_angle"] ?? 0;
        jsonData[timestamp].count += 1;
      }
    }

    // Compute averages where necessary
    Object.values(jsonData).forEach((week) => {
      week.temperature /= week.count;
      week.relative_humidity /= week.count;
      week.solar_zenith_angle /= week.count;
      delete week.count;
    });

    self.postMessage({ type: "complete", data: Object.values(jsonData) });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
