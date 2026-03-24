document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("importFile");
  const importButton = document.getElementById("import");
  const statusEl = document.getElementById("status");

  importButton.onclick = () => {
    statusEl.textContent = "";

    if (!fileInput.files || fileInput.files.length === 0) {
      statusEl.textContent = "Please choose a JSON file first.";
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) {
          statusEl.textContent = "Invalid file: expected an array of entries.";
          return;
        }

        const toStore = {};
        let importedCount = 0;

        chrome.storage.local.get(null, (existingItems) => {
          data.forEach((e) => {
            if (!e || !e.lang || !e.title) return;
            const key = `progress:${e.lang}:${e.title}`;

            const existing = existingItems[key] || {};
            const existingSections = existing.sections || {};
            let existingReadCount = Object.keys(existingSections).length;
            if (
              typeof existing.readCount === "number" &&
              existing.readCount > existingReadCount
            ) {
              existingReadCount = existing.readCount;
            }

            const sectionsFromExport =
              e.sections && typeof e.sections === "object" ? e.sections : {};
            const importedReadCount =
              typeof e.readCount === "number"
                ? e.readCount
                : Object.keys(sectionsFromExport).length;

            const mergedSections = { ...existingSections, ...sectionsFromExport };
            const mergedReadCount = Math.max(existingReadCount, importedReadCount);

            const importedTotalSections =
              typeof e.total === "number"
                ? e.total
                : typeof e.totalSections === "number"
                ? e.totalSections
                : importedReadCount;

            const existingTotalSections = existing.totalSections || existingReadCount;
            const mergedTotalSections = Math.max(
              existingTotalSections,
              importedTotalSections,
              mergedReadCount
            );

            const existingUpdatedAt = existing.updatedAt || 0;
            const importedUpdatedAt = e.updatedAt || Date.now();

            toStore[key] = {
              sections: mergedSections,
              totalSections: mergedTotalSections,
              readCount: mergedReadCount,
              updatedAt: Math.max(existingUpdatedAt, importedUpdatedAt),
            };
            importedCount += 1;
          });

          chrome.storage.local.set(toStore, () => {
            statusEl.textContent = `Imported ${importedCount} article(s). You can now close this tab.`;
          });
        });
      } catch (err) {
        console.error("[wikitrack] import error:", err);
        statusEl.textContent = "Import failed: invalid JSON.";
      }
    };
    reader.readAsText(file);
  };
});
