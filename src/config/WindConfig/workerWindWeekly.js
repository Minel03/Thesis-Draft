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

    function getISOWeek(date) {
      const tempDate = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
      );
      const dayNum = tempDate.getUTCDay() || 7; // Make Sunday (0) become 7
      tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
      const weekNumber = Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);

      return { year: tempDate.getUTCFullYear(), week: weekNumber };
    }

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

          // Get correctly formatted ISO week
          const { year, week } = getISOWeek(dateTime);
          const weekKey = `${year}-W${week.toString().padStart(2, "0")}`;

          rawData.push({
            week: weekKey,
            wind_power: parseFloat(row["wind_power"]) || 0,
            wind_speed: parseFloat(row["Wind Speed"]) || 0,
            dew_point: parseFloat(row["Dew Point"]) || null,
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
          wind_power: 0,
          wind_speed: [],
          dew_point: [],
          count: 0,
        };
      }

      weeklyData[row.week].wind_power += row.wind_power;
      if (row.wind_speed !== null)
        weeklyData[row.week].wind_speed.push(row.wind_speed);
      if (row.dew_point !== null)
        weeklyData[row.week].dew_point.push(row.dew_point);

      weeklyData[row.week].count++;
    });

    // Compute averages where needed
    const aggregatedData = Object.values(weeklyData).map((weekEntry) => {
      return {
        week: weekEntry.week,
        wind_power: weekEntry.wind_power,
        wind_speed: weekEntry.wind_speed.length
          ? weekEntry.wind_speed.reduce((a, b) => a + b, 0) /
            weekEntry.wind_speed.length
          : null,
        dew_point: weekEntry.dew_point.length
          ? weekEntry.dew_point.reduce((a, b) => a + b, 0) /
            weekEntry.dew_point.length
          : null,
      };
    });

    self.postMessage({ type: "complete", data: aggregatedData });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
