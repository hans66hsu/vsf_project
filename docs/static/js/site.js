(() => {
  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("[data-nav]");
  const navToggle = document.querySelector("[data-nav-toggle]");

  const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 18);
  };

  const closeNav = (returnFocus = false) => {
    if (!nav || !navToggle) return;
    const wasOpen = navToggle.getAttribute("aria-expanded") === "true";
    nav.classList.remove("is-open");
    header?.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
    if (returnFocus && wasOpen) navToggle.focus();
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  navToggle?.addEventListener("click", () => {
    const willOpen = navToggle.getAttribute("aria-expanded") !== "true";
    nav?.classList.toggle("is-open", willOpen);
    header?.classList.toggle("is-open", willOpen);
    navToggle.setAttribute("aria-expanded", String(willOpen));
    document.body.classList.toggle("nav-open", willOpen);
    if (willOpen) nav?.querySelector("a")?.focus();
  });

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => closeNav());
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 780) closeNav();
  }, { passive: true });

  window.addEventListener("load", () => {
    if (!window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    if (!target) return;
    const previousBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    target.scrollIntoView({ block: "start" });
    document.documentElement.style.scrollBehavior = previousBehavior;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNav(true);
  });

  const tabs = [...document.querySelectorAll("[role='tab'][data-tab]")];

  const activateTab = (tab, shouldFocus = false) => {
    tabs.forEach((item) => {
      const isActive = item === tab;
      const pane = document.getElementById(item.dataset.tab);
      item.setAttribute("aria-selected", String(isActive));
      item.tabIndex = isActive ? 0 : -1;
      if (pane) pane.hidden = !isActive;
    });
    if (shouldFocus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      activateTab(tabs[nextIndex], true);
    });
  });

  const copyButton = document.querySelector("[data-copy-citation]");
  const copyStatus = document.querySelector("[data-copy-status]");
  const citation = document.getElementById("bibtex");

  const legacyCopy = (text) => {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    return copied;
  };

  copyButton?.addEventListener("click", async () => {
    if (!citation) return;
    const label = copyButton.querySelector("span");
    let copied = false;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(citation.textContent.trim());
        copied = true;
      } else {
        copied = legacyCopy(citation.textContent.trim());
      }
    } catch {
      copied = legacyCopy(citation.textContent.trim());
    }

    if (!label) return;
    const original = label.textContent;
    label.textContent = copied ? "Copied" : "Select text";
    if (copyStatus) {
      copyStatus.textContent = copied
        ? "BibTeX citation copied to the clipboard."
        : "Copy failed. Select the citation text manually.";
    }
    window.setTimeout(() => {
      label.textContent = original;
      if (copyStatus) copyStatus.textContent = "";
    }, 1800);
  });
})();
