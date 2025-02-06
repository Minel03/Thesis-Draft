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
    let jsonData = [];

    let timeIndex,
      solarIndex,
      dhiIndex,
      dniIndex,
      ghiIndex,
      tempIndex,
      rhIndex,
      zenithIndex;

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

          // Find column indexes
          timeIndex = headers.indexOf("date");
          solarIndex = headers.indexOf("solar_power");
          dhiIndex = headers.indexOf("dhi");
          dniIndex = headers.indexOf("dni");
          ghiIndex = headers.indexOf("ghi");
          tempIndex = headers.indexOf("temperature");
          rhIndex = headers.indexOf("relative_humidity");
          zenithIndex = headers.indexOf("solar_zenith_angle");

          if (
            timeIndex === -1 ||
            solarIndex === -1 ||
            dhiIndex === -1 ||
            dniIndex === -1 ||
            ghiIndex === -1 ||
            tempIndex === -1 ||
            rhIndex === -1 ||
            zenithIndex === -1
          ) {
            self.postMessage({
              type: "error",
              error: "Missing required columns in CSV.",
            });
            return;
          }
        } else {
          const values = cleanLine.split(",").map((v) => v.trim());
          if (values.length !== headers.length) continue;

          const row = headers.reduce((acc, header, i) => {
            acc[header] = isNaN(values[i]) ? values[i] : parseFloat(values[i]);
            return acc;
          }, {});

          const timestamp = row["date"];
          if (!timestamp || !/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
            self.postMessage({
              type: "error",
              error: `Invalid timestamp detected: ${timestamp}. Only daily timestamps are allowed.`,
            });
            return;
          }

          // Convert to JSON format
          jsonData.push({
            date: row["date"],
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
