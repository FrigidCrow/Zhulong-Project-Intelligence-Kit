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
    ".route-map",
    ".comparison",
    ".story-row",
    ".signal",
    ".tutorial-step",
    ".visual-card",
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

function installReadingProgress() {
  const progress = document.createElement("div");
  progress.className = "reading-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.prepend(progress);
}

function installMetricCounters() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const metrics = [...document.querySelectorAll(".metric strong")]
    .map((element) => ({ element, value: Number(element.textContent.trim()) }))
    .filter((item) => Number.isInteger(item.value) && item.value >= 0);
  if (!metrics.length || reduced || !("IntersectionObserver" in window)) return;

  metrics.forEach(({ element, value }) => {
    element.dataset.metricValue = String(value);
    element.setAttribute("aria-label", String(value));
    element.textContent = "0";
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      const target = Number(element.dataset.metricValue);
      const startedAt = performance.now();
      const duration = 760;

      function frame(now) {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = String(Math.round(target * eased));
        if (progress < 1) window.requestAnimationFrame(frame);
      }

      window.requestAnimationFrame(frame);
      observer.unobserve(element);
    });
  }, { threshold: 0.5 });

  metrics.forEach(({ element }) => observer.observe(element));
}

function installFlowSequences() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const flows = document.querySelectorAll(".stage-flow");
  if (!flows.length || reduced || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-running");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -10%", threshold: 0.35 });

  flows.forEach((flow) => observer.observe(flow));
}

function installHeroMotion() {
  const emblem = document.querySelector(".hero-emblem");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  if (!emblem || reduced || !finePointer) return;

  let frame = 0;
  emblem.addEventListener("pointermove", (event) => {
    const rect = emblem.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      emblem.style.setProperty("--tilt-x", `${(-y * 3.5).toFixed(2)}deg`);
      emblem.style.setProperty("--tilt-y", `${(x * 3.5).toFixed(2)}deg`);
      emblem.style.setProperty("--shift-x", `${(x * 5).toFixed(2)}px`);
      emblem.style.setProperty("--shift-y", `${(y * 5).toFixed(2)}px`);
    });
  });
  emblem.addEventListener("pointerleave", () => {
    emblem.style.setProperty("--tilt-x", "0deg");
    emblem.style.setProperty("--tilt-y", "0deg");
    emblem.style.setProperty("--shift-x", "0px");
    emblem.style.setProperty("--shift-y", "0px");
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

function installScrollableRegions() {
  document.querySelectorAll(".table-wrap").forEach((region, index) => {
    const heading = region.closest("section")?.querySelector("h2, h3")?.textContent?.trim();
    region.tabIndex = 0;
    region.setAttribute("role", "region");
    region.setAttribute("aria-label", `${heading || `数据表 ${index + 1}`}，可横向滚动`);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  installReadingProgress();
  installCopyControls();
  installReveals();
  installMetricCounters();
  installFlowSequences();
  installHeroMotion();
  installTocTracking();
  installScrollableRegions();
});
