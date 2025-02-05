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
    let firstTimestampChecked = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // Keep the last incomplete line

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

          const timestamp = row["time"];
          if (!timestamp) continue;

          // Validate hourly timestamp format (YYYY-MM-DDTHH:00:00)
          if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00:00$/.test(timestamp)) {
            self.postMessage({
              type: "error",
              error: `Invalid timestamp detected: ${timestamp}. Only hourly timestamps are allowed.`,
            });
            return;
          }

          if (!firstTimestampChecked) {
            firstTimestampChecked = true;
          }
        }
      }
    }

    self.postMessage({ type: "complete", data: "Validation passed" });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
