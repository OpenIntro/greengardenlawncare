export const SEND_FAILURE = "We could not send that. Please call 214-962-9089.";

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function validateEstimate(data) {
  const errors = {};
  const read = (name) => String(data.get(name) || "");
  if (!read("name").trim()) errors.name = "Please enter your name.";
  if (!/^[\d\s().+-]{10,}$/.test(read("phone"))) errors.phone = "Enter a valid phone number.";
  if (!EMAIL.test(read("email").trim())) errors.email = "Enter a valid email address.";
  if (!read("service")) errors.service = "Choose a service.";
  if (!read("address").trim()) errors.address = "Enter an address or ZIP code.";
  return errors;
}

export function estimateOutcome(status, payload) {
  if (status >= 200 && status < 300 && payload?.ok === true) {
    return { ok: true, message: "" };
  }
  const errors = payload && Array.isArray(payload.errors)
    ? payload.errors.filter((item) => typeof item === "string" && item.trim())
    : [];
  return { ok: false, message: errors.length ? errors.join(" ") : SEND_FAILURE };
}
