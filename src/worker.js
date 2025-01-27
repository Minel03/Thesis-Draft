self.onmessage = async (e) => {
  const { file } = e.data;

  if (!file) {
    self.postMessage({ type: "error", error: "No file provided" });
    return;
  }

  try {
    const CHUNK_SIZE = 1024 * 1024; // 1 MB chunks
    const reader = file.stream().getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    let isHeaderParsed = false;
    let headers = [];
    let jsonData = [];
    let processedRows = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode chunk
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Split buffer into lines
      const lines = buffer.split("\n");
      buffer = lines.pop(); // Keep the last incomplete line

      for (const line of lines) {
        if (!isHeaderParsed) {
          // Parse headers from the first line
          headers = line.split(",");
          isHeaderParsed = true;
        } else {
          // Parse data rows
          const values = line.split(",");
          const row = headers.reduce((acc, header, i) => {
            acc[header.trim()] = values[i]?.trim();
            return acc;
          }, {});

          jsonData.push(row["wind_power"]); // Extract specific field

          processedRows++;
          if (processedRows % 10000 === 0) {
            // Send progress update
            self.postMessage({ type: "chunk", data: jsonData });
            jsonData = []; // Clear chunk
          }
        }
      }
    }

    // Process the remaining buffer
    if (buffer) {
      const values = buffer.split(",");
      const row = headers.reduce((acc, header, i) => {
        acc[header.trim()] = values[i]?.trim();
        return acc;
      }, {});

      jsonData.push(row["wind_power"]);
    }

    // Send the final data
    self.postMessage({ type: "complete", data: jsonData });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
