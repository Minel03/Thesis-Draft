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

    let buffer = "";
    let isHeaderParsed = false;
    let headers = [];
    let rawData = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop();

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
            acc[header] = values[i] ?? "";
            return acc;
          }, {});

          const dateTime = new Date(row["time"] + "Z");
          if (isNaN(dateTime)) continue;

          const dayKey = dateTime.toISOString().slice(0, 10); // YYYY-MM-DD

          rawData.push({
            day: dayKey,
            wind_power: parseFloat(row["wind_power"]) || 0,
            wind_speed: parseFloat(row["Wind Speed"]) || 0,
            dew_point: parseFloat(row["Dew Point"]) || null,
          });
        }
      }
    }

    // Aggregate by day
    const dailyData = {};
    rawData.forEach((row) => {
      if (!dailyData[row.day]) {
        dailyData[row.day] = {
          day: row.day,
          wind_power: 0,
          wind_speed: [],
          dew_point: [],
          count: 0,
        };
      }

      dailyData[row.day].wind_power += row.wind_power;
      if (row.wind_speed !== null)
        dailyData[row.day].wind_speed.push(row.wind_speed);
      if (row.dew_point !== null)
        dailyData[row.day].dew_point.push(row.dew_point);

      dailyData[row.day].count++;
    });

    // Compute averages where needed
    const aggregatedData = Object.values(dailyData).map((dayEntry) => {
      return {
        day: dayEntry.day,
        wind_power: dayEntry.wind_power, // Keep sum
        wind_speed:
          dayEntry.count > 0 ? dayEntry.wind_speed / dayEntry.count : 0, // Mean
        dew_point: dayEntry.count > 0 ? dayEntry.dew_point / dayEntry.count : 0, // Mean
      };
    });

    self.postMessage({ type: "complete", data: aggregatedData });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
