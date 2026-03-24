
function getArticleKey() {
  const lang = document.documentElement.lang || "en";
  const path = window.location.pathname || "";
  // Expect paths like /wiki/Title
  const titlePart = path.startsWith("/wiki/") ? path.slice("/wiki/".length) : path;
  return {
    lang,
    title: titlePart,
    storageKey: `progress:${lang}:${titlePart}`,
  };
}

(function () {
  const heading = document.getElementById("firstHeading");
  const title = heading ? heading.textContent?.trim() : document.title;
  console.log("[wikitrack] content script loaded on:", title);

  const contentRoot =
    document.querySelector("#mw-content-text .mw-parser-output") ||
    document.getElementById("mw-content-text");

  if (!contentRoot) {
    console.log("[wikitrack] no content root found");
    return;
  }

  const headingSelectors = ["h2", "h3", "h4"]; // we can refine later
  const headings = contentRoot.querySelectorAll(headingSelectors.join(","));

  const sections = [];
  headings.forEach((el, index) => {
    const headline = el.querySelector(".mw-headline");
    const id = (headline && headline.id) || el.id || `section-${index}`;
    const text = (headline && headline.textContent) || el.textContent || "";

    const titleText = text.trim();
    const lower = titleText.toLowerCase();
	// dont have to be part of reading progress
	const skipTitles = [
      "references",
      "notes",
      "external links",
      "see also",
      "further reading",
    ];
    if (skipTitles.includes(lower)) {
      return;
    }

    el.dataset.wikitrackSectionId = id;

    sections.push({ id, title: titleText, level: el.tagName.toLowerCase() });
  });

  console.log("[wikitrack] detected sections:", sections);

  if (sections.length === 0) {
    return;
  }

  const seen = new Set();

  let overlay = document.getElementById("wikitrack-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "wikitrack-overlay";
    overlay.style.position = "fixed";
    overlay.style.bottom = "12px";
    overlay.style.right = "12px";
    overlay.style.zIndex = "9999";
    overlay.style.padding = "4px 8px";
    overlay.style.borderRadius = "4px";
    overlay.style.background = "rgba(0, 0, 0, 0.7)";
    overlay.style.color = "#fff";
    overlay.style.fontSize = "12px";
    overlay.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    overlay.style.pointerEvents = "none";
    document.body.appendChild(overlay);
  }

  function logProgress() {
    const progress = Math.round((seen.size / sections.length) * 100);
    const text = `${progress}% read (${seen.size}/${sections.length})`;
    console.log("[wikitrack] progress:", text);
    if (overlay) {
      overlay.textContent = text;
    }
  }

  const { storageKey } = getArticleKey();

  // Load existing progress from storage, then set up observers
  chrome.storage.local.get(storageKey, (result) => {
    const stored = result[storageKey];
    if (stored && stored.sections) {
      sections.forEach((s) => {
        if (stored.sections[s.id]) {
          seen.add(s.id);
        }
      });
      if (seen.size > 0) {
        logProgress();
      }
    }

    const firstHeading = headings[0];
    if (firstHeading && seen.size === 0) {
      const rect = firstHeading.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        const id = firstHeading.dataset.wikitrackSectionId;
        if (id) {
          seen.add(id);
          logProgress();
        }
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let changed = false;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const id = entry.target.dataset.wikitrackSectionId;
          if (!id || seen.has(id)) return;

          seen.add(id);
          changed = true;
        });

        if (changed) {
          logProgress();

          const sectionsMap = {};
          seen.forEach((id) => {
            sectionsMap[id] = true;
          });
          chrome.storage.local.set({
            [storageKey]: {
              sections: sectionsMap,
              totalSections: sections.length,
              updatedAt: Date.now(),
            },
          });
        }
      },
      {
        root: null,
        threshold: 0.1,
      }
    );

    headings.forEach((el) => observer.observe(el));
  });
})();
