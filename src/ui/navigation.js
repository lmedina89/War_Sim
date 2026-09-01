import { readUiText, writeUiText } from "./uiStorage.js";

const VIEW_NAMES = ["career", "unit", "personnel", "orders", "more"];
const SUBSCREENS = {
  career: { allowed:["home","actions","soldier","records","inbox"], selector:"[data-career-screen]", button:"[data-career-tab]", fallback:"home" },
  unit: { allowed:["overview","roster","readiness","admin"], selector:"[data-unit-screen]", button:"[data-unit-tab]", fallback:"overview" },
  personnel: { allowed:["roster","relationships"], selector:"[data-personnel-screen]", button:"[data-personnel-tab]", fallback:"roster" }
};

export function createNavigationController({ root = document, win = window, storage } = {}) {
  let activeView = "career";
  const activeScreens = { career:"home", unit:"overview", personnel:"roster" };

  function setSubscreen(kind, value, { scroll = true } = {}) {
    const config = SUBSCREENS[kind];
    if (!config) return activeScreens[kind] ?? null;
    const next = config.allowed.includes(value) ? value : config.fallback;
    activeScreens[kind] = next;
    root.querySelectorAll(config.selector).forEach(section => { section.hidden = section.dataset[`${kind}Screen`] !== next; });
    root.querySelectorAll(config.button).forEach(button => {
      const selected = button.dataset[`${kind}Tab`] === next;
      if (selected) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    });
    writeUiText(`war-sim:ui:screen:${kind}`, next, storage);
    if (scroll) win.scrollTo({ top:0, behavior:"auto" });
    return next;
  }

  function restoreSubscreens() {
    for (const [kind, config] of Object.entries(SUBSCREENS)) {
      setSubscreen(kind, readUiText(`war-sim:ui:screen:${kind}`, config.fallback, storage), { scroll:false });
    }
  }

  function setActiveView(view, { scroll = true } = {}) {
    activeView = VIEW_NAMES.includes(view) ? view : "career";
    root.querySelectorAll(".game-view[data-view]").forEach(section => { section.hidden = section.dataset.view !== activeView; });
    root.querySelectorAll("#bottom-nav [data-view]").forEach(button => {
      if (button.dataset.view === activeView) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    });
    if (scroll) win.scrollTo({ top:0, behavior:"auto" });
    return activeView;
  }

  function bindNavigation() {
    root.querySelectorAll("#bottom-nav [data-view]").forEach(button => button.addEventListener("click", () => setActiveView(button.dataset.view)));
    root.querySelectorAll("[data-career-tab]").forEach(button => button.addEventListener("click", () => setSubscreen("career", button.dataset.careerTab)));
    root.querySelectorAll("[data-unit-tab]").forEach(button => button.addEventListener("click", () => setSubscreen("unit", button.dataset.unitTab)));
    root.querySelectorAll("[data-personnel-tab]").forEach(button => button.addEventListener("click", () => setSubscreen("personnel", button.dataset.personnelTab)));
  }

  function reset({ view = "career", career = "home", unit = "overview", personnel = "roster", scroll = false } = {}) {
    setActiveView(view, { scroll:false });
    setSubscreen("career", career, { scroll:false });
    setSubscreen("unit", unit, { scroll:false });
    setSubscreen("personnel", personnel, { scroll:false });
    if (scroll) win.scrollTo({ top:0, behavior:"auto" });
  }

  return {
    setSubscreen,
    restoreSubscreens,
    setActiveView,
    bindNavigation,
    reset,
    getActiveView: () => activeView,
    getActiveSubscreen: kind => activeScreens[kind] ?? null
  };
}
