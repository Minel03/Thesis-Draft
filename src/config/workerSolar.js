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

          // Collect "time", "solar_power", "DHI", "DNI", "GHI", "Temperature", "Relative Humidity", and "Solar Zenith Angle"
          allData.push({
            time: row["time"], // Extract the "time" column
            solar_power: row["solar_power"], // Extract the "solar_power" column
            dhi: row["DHI"], // Extract the "DHI" column
            dni: row["DNI"], // Extract the "DNI" column
            ghi: row["GHI"], // Extract the "GHI" column
            temperature: row["Temperature"], // Extract the "Temperature" column
            relative_humidity: row["Relative Humidity"], // Extract the "Relative Humidity" column
            solar_zenith_angle: row["Solar Zenith Angle"], // Extract the "Solar Zenith Angle" column
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
        solar_power: row["solar_power"],
        dhi: row["DHI"],
        dni: row["DNI"],
        ghi: row["GHI"],
        temperature: row["Temperature"],
        relative_humidity: row["Relative Humidity"],
        solar_zenith_angle: row["Solar Zenith Angle"],
      });
    }

    // Send the final data back to the main thread
    self.postMessage({ type: "complete", data: allData });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
