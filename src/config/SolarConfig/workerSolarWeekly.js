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

          const dateTime = new Date(row["time"]);
          if (isNaN(dateTime)) continue;

          const weekKey = `${dateTime.getFullYear()}-W${Math.ceil(
            (dateTime.getDate() - dateTime.getDay() + 10) / 7
          )}`;

          rawData.push({
            week: weekKey,
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

    // Aggregate by week
    const weeklyData = {};
    rawData.forEach((row) => {
      if (!weeklyData[row.week]) {
        weeklyData[row.week] = {
          week: row.week,
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

      weeklyData[row.week].solar_power += row.solar_power;
      weeklyData[row.week].dhi += row.dhi;
      weeklyData[row.week].dni += row.dni;
      weeklyData[row.week].ghi += row.ghi;

      if (row.temperature !== null)
        weeklyData[row.week].temperature.push(row.temperature);
      if (row.relative_humidity !== null)
        weeklyData[row.week].relative_humidity.push(row.relative_humidity);
      if (row.solar_zenith_angle !== null)
        weeklyData[row.week].solar_zenith_angle.push(row.solar_zenith_angle);

      weeklyData[row.week].count++;
    });

    // Compute averages where needed
    const aggregatedData = Object.values(weeklyData).map((weekEntry) => {
      return {
        week: weekEntry.week,
        solar_power: weekEntry.solar_power,
        dhi: weekEntry.dhi,
        dni: weekEntry.dni,
        ghi: weekEntry.ghi,
        temperature: weekEntry.temperature.length
          ? weekEntry.temperature.reduce((a, b) => a + b, 0) /
            weekEntry.temperature.length
          : null,
        relative_humidity: weekEntry.relative_humidity.length
          ? weekEntry.relative_humidity.reduce((a, b) => a + b, 0) /
            weekEntry.relative_humidity.length
          : null,
        solar_zenith_angle: weekEntry.solar_zenith_angle.length
          ? weekEntry.solar_zenith_angle.reduce((a, b) => a + b, 0) /
            weekEntry.solar_zenith_angle.length
          : null,
      };
    });

    self.postMessage({ type: "complete", data: aggregatedData });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
