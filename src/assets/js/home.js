import { SEND_FAILURE, estimateOutcome, validateEstimate } from "./estimate-outcome.js";

const desktop = window.matchMedia("(min-width: 900px)");
const headerTones = {
  dark: {
    bg: "rgba(8,30,20,.35)",
    border: "rgba(255,255,255,.14)",
    ink: "#FFFFFF",
  },
  light: {
    bg: "rgba(248,247,242,.92)",
    border: "rgba(16,61,39,.1)",
    ink: "#103D27",
  },
};

const header = document.querySelector("[data-header-bg]");
const phone = document.querySelector("[data-phone-label]");
const menu = document.querySelector("#mobile-menu");
const menuButton = document.querySelector('[data-action="toggle-menu"]');
const lightbox = document.querySelector("[data-lightbox]");
const gallery = document.querySelector('[style*="grid-auto-flow:dense"]');
const formPanel = document.querySelector('[data-panel="form"]');
const successPanel = document.querySelector('[data-panel="success"]');
const form = document.querySelector("[data-estimate-form]");
let lastFocus = null;
let headerTone = "";
let resizeFrame = 0;

function mobile() {
  return !desktop.matches;
}

function applyHeader() {
  if (!header) return;
  const menuOpen = menu && !menu.hasAttribute("hidden");
  const nextTone = window.scrollY <= 24 && !menuOpen ? "dark" : "light";
  if (nextTone === headerTone) return;
  headerTone = nextTone;
  const tone = headerTones[nextTone];
  header.style.background = tone.bg;
  header.style.borderBottomColor = tone.border;
  document.querySelectorAll("[data-header-ink]").forEach((element) => {
    element.style.color = tone.ink;
  });
}

function applyPhone() {
  if (!phone) return;
  phone.textContent = mobile() ? "Call" : `Call ${phone.dataset.phone}`;
}

function applyBars() {
  const block = mobile() && ((menu && !menu.hasAttribute("hidden")) || (lightbox && !lightbox.hasAttribute("hidden")));
  document.querySelectorAll(".when-bar, .when-bar-spacer").forEach((element) => {
    if (block) element.setAttribute("hidden", "");
    else element.removeAttribute("hidden");
  });
}

function applyChrome() {
  applyHeader();
  applyPhone();
  applyBars();
}

function setMenu(open) {
  if (!menu || !menuButton) return;
  if (open) menu.removeAttribute("hidden");
  else menu.setAttribute("hidden", "");
  menuButton.setAttribute("aria-expanded", open ? "true" : "false");
  applyChrome();
  if (open) menu.querySelector("a")?.focus();
}

const reveals = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.setAttribute("data-in", "1");
      reveals.unobserve(entry.target);
    }
  },
  { threshold: 0.12 },
);

function observeReveals() {
  document.querySelectorAll("[data-reveal]:not([data-in])").forEach((element) => reveals.observe(element));
}

function visibleGallery() {
  const active = document.querySelector('[data-action="filter"][aria-pressed="true"]')?.dataset.filter || "all";
  return [...gallery.querySelectorAll("[data-cat]")].filter(
    (item) => active === "all" || item.dataset.cat === active,
  );
}

function layoutGallery() {
  if (!gallery) return;
  const active = document.querySelector('[data-action="filter"][aria-pressed="true"]')?.dataset.filter || "all";
  let index = 0;
  for (const item of gallery.querySelectorAll("[data-cat]")) {
    const show = active === "all" || item.dataset.cat === active;
    if (!show) {
      item.setAttribute("hidden", "");
      continue;
    }
    item.removeAttribute("hidden");
    const narrow = mobile();
    item.style.gridColumn = narrow ? "1 / -1" : index === 0 ? "1 / span 4" : index < 3 ? "5 / span 2" : "span 2";
    item.style.aspectRatio = narrow ? "4 / 3" : index < 3 ? "auto" : "4 / 3";
    item.style.minHeight = !narrow && index === 0 ? "560px" : !narrow && index < 3 ? "272px" : "auto";
    index += 1;
  }
}

function setFilter(id) {
  document.querySelectorAll('[data-action="filter"]').forEach((button) => {
    const on = button.dataset.filter === id;
    button.setAttribute("aria-pressed", on ? "true" : "false");
    button.style.background = on ? "#103D27" : "transparent";
    button.style.color = on ? "#F8F7F2" : "#103D27";
  });
  layoutGallery();
  observeReveals();
}

function renderLightbox() {
  const items = visibleGallery();
  const current = items[lightboxIndex(items)];
  if (!current || !lightbox) return;
  const image = lightbox.querySelector("img");
  image.src = current.dataset.src;
  image.alt = current.dataset.alt || "";
  lightbox.setAttribute("aria-label", image.alt);
  lightbox.querySelector("figcaption span").textContent = current.dataset.label || "";
  lightbox.querySelector("figcaption span:last-child").textContent = `${items.indexOf(current) + 1} / ${items.length}`;
}

function lightboxIndex(items) {
  const image = lightbox.querySelector("img");
  const current = new URL(image.src, location.origin).pathname;
  const index = items.findIndex((item) => new URL(item.dataset.src, location.origin).pathname === current);
  return index < 0 ? 0 : index;
}

function openLightbox(button) {
  const items = visibleGallery();
  const index = items.indexOf(button);
  if (index < 0 || !lightbox) return;
  lastFocus = document.activeElement;
  const image = lightbox.querySelector("img");
  image.src = button.dataset.src;
  image.alt = button.dataset.alt || "";
  lightbox.setAttribute("aria-label", image.alt);
  lightbox.querySelector("figcaption span").textContent = button.dataset.label || "";
  lightbox.querySelector("figcaption span:last-child").textContent = `${index + 1} / ${items.length}`;
  lightbox.removeAttribute("hidden");
  document.body.style.overflow = "hidden";
  lightbox.querySelector('[data-action="close-lightbox"]')?.focus();
  applyBars();
}

function closeLightbox() {
  if (!lightbox || lightbox.hasAttribute("hidden")) return;
  lightbox.setAttribute("hidden", "");
  document.body.style.overflow = "";
  lastFocus?.focus?.();
  applyBars();
}

function stepLightbox(direction) {
  const items = visibleGallery();
  if (!items.length) return;
  const next = (lightboxIndex(items) + direction + items.length) % items.length;
  const image = lightbox.querySelector("img");
  image.src = items[next].dataset.src;
  renderLightbox();
}

function setFieldError(field, message) {
  const control = form.elements[field];
  if (!control) return;
  const alert = control.parentElement?.querySelector("[role='alert']");
  control.style.border = message ? "1.5px solid #B4533A" : "1px solid #D7DDD6";
  control.setAttribute("aria-invalid", message ? "true" : "false");
  if (alert) alert.textContent = message || "";
}

function setFormStatus(message) {
  if (!form) return;
  let status = form.querySelector("[data-form-status]");
  if (!message) {
    status?.remove();
    return;
  }
  if (!status) {
    status = document.createElement("p");
    status.dataset.formStatus = "";
    status.setAttribute("role", "alert");
    status.style.margin = "0";
    status.style.fontSize = "12.5px";
    status.style.lineHeight = "1.5";
    status.style.textAlign = "center";
    status.style.color = "#B4533A";
    form.append(status);
  }
  status.textContent = message;
}

function showSuccess() {
  formPanel?.setAttribute("hidden", "");
  successPanel?.removeAttribute("hidden");
  successPanel?.querySelector("h3")?.focus?.();
}

function resetForm() {
  form?.reset();
  for (const field of ["name", "phone", "email", "service", "address"]) setFieldError(field, "");
  successPanel?.setAttribute("hidden", "");
  formPanel?.removeAttribute("hidden");
  setFormStatus("");
  form?.querySelector("#f-name")?.focus();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "lightbox-stop" || action === "lightbox-prev" || action === "lightbox-next") event.stopPropagation();
  if (action === "toggle-menu") setMenu(menu.hasAttribute("hidden"));
  if (action === "close-menu") setMenu(false);
  if (action === "filter") setFilter(target.dataset.filter);
  if (action === "open-lightbox") openLightbox(target);
  if (action === "close-lightbox") closeLightbox();
  if (action === "lightbox-prev") stepLightbox(-1);
  if (action === "lightbox-next") stepLightbox(1);
  if (action === "reset-form") resetForm();
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form || form.dataset.sending === "true") return;
  const data = new FormData(form);
  const errors = validateEstimate(data);
  for (const field of ["name", "phone", "email", "service", "address"]) setFieldError(field, errors[field] || "");
  setFormStatus("");
  if (Object.keys(errors).length) {
    form.elements[Object.keys(errors)[0]]?.focus();
    return;
  }
  const button = form.querySelector('[type="submit"]');
  form.dataset.sending = "true";
  if (button) button.disabled = true;
  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => null);
    const outcome = estimateOutcome(response.status, payload);
    if (outcome.ok) {
      showSuccess();
      return;
    }
    setFormStatus(outcome.message);
  } catch {
    setFormStatus(SEND_FAILURE);
  } finally {
    delete form.dataset.sending;
    if (button) button.disabled = false;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (lightbox && !lightbox.hasAttribute("hidden")) closeLightbox();
    else setMenu(false);
  }
  if (!lightbox || lightbox.hasAttribute("hidden")) return;
  if (event.key === "ArrowRight") stepLightbox(1);
  if (event.key === "ArrowLeft") stepLightbox(-1);
  if (event.key !== "Tab") return;
  const focusable = [...lightbox.querySelectorAll("button, a, [tabindex]")].filter((element) => !element.hasAttribute("hidden"));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

window.addEventListener("scroll", applyHeader, { passive: true });
window.addEventListener("resize", () => {
  if (resizeFrame) return;
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = 0;
    applyChrome();
    layoutGallery();
  });
}, { passive: true });
desktop.addEventListener("change", () => {
  applyChrome();
  layoutGallery();
});

applyChrome();
layoutGallery();
observeReveals();
