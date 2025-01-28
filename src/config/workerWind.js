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
    let allData = []; // To store all parsed rows

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
        if (!isHeaderParsed) {
          // Parse headers from the first line
          headers = line.split(",");
          isHeaderParsed = true;
        } else {
          // Parse the row
          const values = line.split(",");
          const row = headers.reduce((acc, header, i) => {
            acc[header.trim()] = values[i]?.trim();
            return acc;
          }, {});

          // Collect "time", "wind_power", "Wind Speed", and "Dew Point"
          allData.push({
            time: row["time"], // Extract the "time" column
            wind_power: row["wind_power"], // Extract the "wind_power" column
            wind_speed: row["Wind Speed"], // Extract the "Wind Speed" column
            dew_point: row["Dew Point"], // Extract the "Dew Point" column
          });
        }
      }
    }

    // Handle the last line in the buffer
    if (buffer) {
      const values = buffer.split(",");
      const row = headers.reduce((acc, header, i) => {
        acc[header.trim()] = values[i]?.trim();
        return acc;
      }, {});

      allData.push({
        time: row["time"],
        wind_power: row["wind_power"],
        wind_speed: row["Wind Speed"],
        dew_point: row["Dew Point"],
      });
    }

    // Send the final data back to the main thread
    self.postMessage({ type: "complete", data: allData });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
