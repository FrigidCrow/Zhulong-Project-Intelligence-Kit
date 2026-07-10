function installCopyControls() {
  document.querySelectorAll("pre.code-block").forEach((block) => {
    if (block.querySelector(".copy-control")) return;
    const code = block.querySelector("code");
    if (!code) return;

    const button = document.createElement("button");
    button.className = "copy-control";
    button.type = "button";
    button.textContent = "⧉";
    button.title = "复制代码";
    button.setAttribute("aria-label", "复制代码");
    button.addEventListener("click", async () => {
      try {
        const value = code.textContent || "";
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = value;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.append(textarea);
          textarea.select();
          document.execCommand("copy");
          textarea.remove();
        }
        button.textContent = "✓";
        button.title = "已复制";
        window.setTimeout(() => {
          button.textContent = "⧉";
          button.title = "复制代码";
        }, 1400);
      } catch {
        button.textContent = "!";
        button.title = "复制失败";
      }
    });
    block.append(button);
  });
}

function installReveals() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const elements = document.querySelectorAll([
    ".hero-content",
    ".hero-emblem",
    ".section-header",
    ".page-section",
    ".control-card",
    ".metric",
  ].join(","));

  if (reduced || !("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

  elements.forEach((element, index) => {
    element.classList.add("reveal-ready");
    element.style.transitionDelay = `${Math.min(index % 5, 3) * 45}ms`;
    observer.observe(element);
  });
}

function installTocTracking() {
  const links = [...document.querySelectorAll(".toc a[href^='#']")];
  if (!links.length || !("IntersectionObserver" in window)) return;

  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  const linkById = new Map(links.map((link) => [link.getAttribute("href").slice(1), link]));
  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!visible) return;
    links.forEach((link) => link.classList.remove("is-active"));
    linkById.get(visible.target.id)?.classList.add("is-active");
  }, { rootMargin: "-18% 0px -68%", threshold: 0 });

  sections.forEach((section) => observer.observe(section));
}

document.addEventListener("DOMContentLoaded", () => {
  installCopyControls();
  installReveals();
  installTocTracking();
});
