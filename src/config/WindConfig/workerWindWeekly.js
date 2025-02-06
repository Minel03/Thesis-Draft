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
          const requiredColumns = ["wind_power", "wind_speed", "dew_point"];

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
            wind_power: 0,
            wind_speed: 0,
            dew_point: 0,
            count: 0,
          };
        }

        jsonData[timestamp].wind_power += row["wind_power"] ?? 0;
        jsonData[timestamp].wind_speed += row["wind_speed"] ?? 0;
        jsonData[timestamp].dew_point += row["dew_point"] ?? 0;
        jsonData[timestamp].count += 1;
      }
    }

    self.postMessage({ type: "complete", data: Object.values(jsonData) });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
