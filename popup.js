function loadProgress() {
  chrome.storage.local.get(null, (items) => {
    const listEl = document.getElementById("list");
    listEl.innerHTML = "";

    const entries = [];
    for (const [key, value] of Object.entries(items)) {
      if (!key.startsWith("progress:")) continue;
      const parts = key.split(":");
      const lang = parts[1] || "";
      const title = parts.slice(2).join(":");

      const sections = value.sections || {};
      const readCount = Object.keys(sections).length;
      const total = value.totalSections || readCount;
      const progress = total > 0 ? Math.round((readCount / total) * 100) : 0;

      entries.push({ key, lang, title, readCount, total, progress, updatedAt: value.updatedAt });
    }

    entries.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    entries.forEach((e) => {
      const div = document.createElement("div");
      div.className = "item";
      const titleText = decodeURIComponent(e.title || "");
      div.innerHTML =
        `<div class="title">${titleText || "(unknown)"}</div>` +
        `<div class="meta">${e.progress}% read (${e.readCount}/${e.total || "?"}) · ${e.lang}</div>`;
      listEl.appendChild(div);
    });

    if (entries.length === 0) {
      listEl.textContent = "No reading progress recorded yet.";
    }

    document.getElementById("export").onclick = () => {
      const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "wikitrack-export.json";
      a.click();
      URL.revokeObjectURL(url);
    };
  });
}

document.addEventListener("DOMContentLoaded", loadProgress);
