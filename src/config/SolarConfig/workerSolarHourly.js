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
    let firstTimestampChecked = false;
    let jsonData = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // Keep the last incomplete line

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;

        if (!isHeaderParsed) {
          headers = cleanLine.split(",").map((h) => h.trim());
          isHeaderParsed = true;
        } else {
          const values = cleanLine.split(",").map((v) => v.trim());
          if (values.length !== headers.length) continue;

          const row = headers.reduce((acc, header, i) => {
            acc[header] = isNaN(values[i]) ? values[i] : parseFloat(values[i]);
            return acc;
          }, {});

          const timestamp = row["time"];
          if (!timestamp) continue;

          // Validate hourly timestamp format (YYYY-MM-DDTHH:00:00)
          if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00:00$/.test(timestamp)) {
            self.postMessage({
              type: "error",
              error: `Invalid timestamp detected: ${timestamp}. Only hourly timestamps are allowed.`,
            });
            return;
          }

          if (!firstTimestampChecked) {
            firstTimestampChecked = true;
          }

          // Convert to desired JSON format
          jsonData.push({
            hour: timestamp.slice(0, 13), // Extract YYYY-MM-DDTHH
            solar_power: row["solar_power"] ?? 0,
            dhi: row["dhi"] ?? 0,
            dni: row["dni"] ?? 0,
            ghi: row["ghi"] ?? 0,
            temperature: row["temperature"] ?? 0,
            relative_humidity: row["relative_humidity"] ?? 0,
            solar_zenith_angle: row["solar_zenith_angle"] ?? 0,
          });
        }
      }
    }

    self.postMessage({ type: "complete", data: jsonData });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
