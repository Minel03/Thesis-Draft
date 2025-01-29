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

    // Aggregate by hour
    const hourlyData = {};
    rawData.forEach((row) => {
      if (!hourlyData[row.hour]) {
        hourlyData[row.hour] = {
          hour: row.hour,
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

      hourlyData[row.hour].solar_power += row.solar_power;
      hourlyData[row.hour].dhi += row.dhi;
      hourlyData[row.hour].dni += row.dni;
      hourlyData[row.hour].ghi += row.ghi;

      if (row.temperature !== null)
        hourlyData[row.hour].temperature.push(row.temperature);
      if (row.relative_humidity !== null)
        hourlyData[row.hour].relative_humidity.push(row.relative_humidity);
      if (row.solar_zenith_angle !== null)
        hourlyData[row.hour].solar_zenith_angle.push(row.solar_zenith_angle);

      hourlyData[row.hour].count++;
    });

    // Compute averages where needed
    const aggregatedData = Object.values(hourlyData).map((hourEntry) => {
      return {
        hour: hourEntry.hour,
        solar_power: hourEntry.solar_power,
        dhi: hourEntry.dhi,
        dni: hourEntry.dni,
        ghi: hourEntry.ghi,
        temperature: hourEntry.temperature.length
          ? hourEntry.temperature.reduce((a, b) => a + b, 0) /
            hourEntry.temperature.length
          : null,
        relative_humidity: hourEntry.relative_humidity.length
          ? hourEntry.relative_humidity.reduce((a, b) => a + b, 0) /
            hourEntry.relative_humidity.length
          : null,
        solar_zenith_angle: hourEntry.solar_zenith_angle.length
          ? hourEntry.solar_zenith_angle.reduce((a, b) => a + b, 0) /
            hourEntry.solar_zenith_angle.length
          : null,
      };
    });

    // Send the aggregated data back to the main thread
    self.postMessage({ type: "complete", data: aggregatedData });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
