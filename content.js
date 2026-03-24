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

    sections.push({ id, title: text.trim(), level: el.tagName.toLowerCase() });
  });

  console.log("[wikitrack] detected sections:", sections);
})();
