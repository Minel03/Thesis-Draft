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

    let timeIndex, windPowerIndex, windSpeedIndex, dewPointIndex;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // Keep last incomplete line

      for (const line of lines) {
        const cleanLine = line.trim();

        // 🚀 Skip completely empty lines
        if (!cleanLine) continue;

        if (!isHeaderParsed) {
          headers = cleanLine.split(",").map((h) => h.trim());
          isHeaderParsed = true;

          // Find column indexes
          timeIndex = headers.indexOf("date");
          windPowerIndex = headers.indexOf("wind_power");
          windSpeedIndex = headers.indexOf("wind_speed");
          dewPointIndex = headers.indexOf("dew_point");

          if (
            timeIndex === -1 ||
            windPowerIndex === -1 ||
            windSpeedIndex === -1 ||
            dewPointIndex === -1
          ) {
            self.postMessage({
              type: "error",
              error: "Missing required columns in CSV.",
            });
            return;
          }
        } else {
          const values = cleanLine.split(",").map((v) => v.trim());

          // 🚀 Skip rows with missing values
          if (values.length !== headers.length) continue;

          const row = headers.reduce((acc, header, i) => {
            acc[header] = isNaN(values[i]) ? values[i] : parseFloat(values[i]);
            return acc;
          }, {});

          const timestamp = row["date"];
          if (!timestamp || !/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
            console.warn(`Skipping invalid timestamp: ${timestamp}`);
            continue;
          }

          jsonData.push({
            date: row["date"],
            wind_power: row["wind_power"] ?? 0,
            wind_speed: row["wind_speed"] ?? 0,
            dew_point: row["dew_point"] ?? 0,
          });
        }
      }
    }

    self.postMessage({ type: "complete", data: jsonData });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
