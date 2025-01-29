self.onmessage = async (e) => {
  const { file } = e.data;

  if (!file) {
    self.postMessage({ type: "error", error: "No file provided" });
    return;
  }

  try {
    const CHUNK_SIZE = 1024 * 1024; // 1 MB per chunk
    const reader = file.stream().getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = ""; // Buffer for incomplete lines
    let isHeaderParsed = false;
    let headers = [];
    let rawData = []; // Store raw minute-level data

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Split the buffer into lines
      const lines = buffer.split("\n");
      buffer = lines.pop(); // Keep the last incomplete line for the next chunk

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue; // Skip empty lines

        if (!isHeaderParsed) {
          headers = cleanLine.split(",").map((h) => h.trim());
          isHeaderParsed = true;
        } else {
          const values = cleanLine.split(",").map((v) => v.trim());
          if (values.length !== headers.length) continue;

          const row = headers.reduce((acc, header, i) => {
            acc[header] = values[i] ?? "";
            return acc;
          }, {});

          const dateTime = new Date(row["time"] + "Z");
          if (isNaN(dateTime)) continue;

          const hourKey = dateTime.toISOString().slice(0, 13); // YYYY-MM-DDTHH

          rawData.push({
            hour: hourKey,
            wind_power: parseFloat(row["wind_power"]) || 0,
            wind_speed: parseFloat(row["Wind Speed"]) || 0,
            dew_point: parseFloat(row["Dew Point"]) || null,
          });
        }
      }
    }

    // Aggregate by hour
    const hourlyData = {};
    rawData.forEach((row) => {
      if (!hourlyData[row.hour]) {
        hourlyData[row.hour] = {
          hour: row.hour,
          wind_power: 0,
          wind_speed: [],
          dew_point: [],
          count: 0,
        };
      }

      hourlyData[row.hour].wind_power += row.wind_power;
      if (row.wind_speed !== null)
        hourlyData[row.hour].wind_speed.push(row.wind_speed);
      if (row.dew_point !== null)
        hourlyData[row.hour].dew_point.push(row.dew_point);

      hourlyData[row.hour].count++;
    });

    // Compute averages where needed
    const aggregatedData = Object.values(hourlyData).map((hourEntry) => {
      return {
        hour: hourEntry.hour,
        wind_power: hourEntry.wind_power, // Keep sum
        wind_speed:
          hourEntry.count > 0 ? hourEntry.wind_speed / hourEntry.count : 0, // Mean
        dew_point:
          hourEntry.count > 0 ? hourEntry.dew_point / hourEntry.count : 0, // Mean
      };
    });

    // Send the aggregated data back to the main thread
    self.postMessage({ type: "complete", data: aggregatedData });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
