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
            solar_power: parseFloat(row["solar_power"]) || 0,
            dhi: parseFloat(row["DHI"]) || 0,
            dni: parseFloat(row["DNI"]) || 0,
            ghi: parseFloat(row["GHI"]) || 0,
            temperature: parseFloat(row["Temperature"]) || null,
            relative_humidity: parseFloat(row["Relative Humidity"]) || null,
            solar_zenith_angle: parseFloat(row["Solar Zenith Angle"]) || null,
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
          solar_power: 0,
          dhi: 0,
          dni: 0,
          ghi: 0,
          temperature: [],
          relative_humidity: [],
          solar_zenith_angle: [],
          count: 0,
        };
      }

      dailyData[row.day].solar_power += row.solar_power;
      dailyData[row.day].dhi += row.dhi;
      dailyData[row.day].dni += row.dni;
      dailyData[row.day].ghi += row.ghi;

      if (row.temperature !== null)
        dailyData[row.day].temperature.push(row.temperature);
      if (row.relative_humidity !== null)
        dailyData[row.day].relative_humidity.push(row.relative_humidity);
      if (row.solar_zenith_angle !== null)
        dailyData[row.day].solar_zenith_angle.push(row.solar_zenith_angle);

      dailyData[row.day].count++;
    });

    // Compute averages where needed
    const aggregatedData = Object.values(dailyData).map((dayEntry) => {
      return {
        day: dayEntry.day,
        solar_power: dayEntry.solar_power,
        dhi: dayEntry.dhi,
        dni: dayEntry.dni,
        ghi: dayEntry.ghi,
        temperature: dayEntry.temperature.length
          ? dayEntry.temperature.reduce((a, b) => a + b, 0) /
            dayEntry.temperature.length
          : null,
        relative_humidity: dayEntry.relative_humidity.length
          ? dayEntry.relative_humidity.reduce((a, b) => a + b, 0) /
            dayEntry.relative_humidity.length
          : null,
        solar_zenith_angle: dayEntry.solar_zenith_angle.length
          ? dayEntry.solar_zenith_angle.reduce((a, b) => a + b, 0) /
            dayEntry.solar_zenith_angle.length
          : null,
      };
    });

    // Send the aggregated data back to the main thread
    self.postMessage({ type: "complete", data: aggregatedData });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
