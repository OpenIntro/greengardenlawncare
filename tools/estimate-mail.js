const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const MARKER = "const RECIPIENT = '__ESTIMATE_TO__';";

function mailbox(recipient) {
  const address = String(recipient || "").trim();
  if (!EMAIL.test(address)) {
    throw new Error("ESTIMATE_TO must be an email address.");
  }
  return address;
}

export function stampEstimateRecipient(source, recipient) {
  const address = mailbox(recipient);
  if (!source.includes(MARKER)) {
    throw new Error("estimate.php is missing the recipient placeholder.");
  }
  return source.replace(MARKER, `const RECIPIENT = '${address}';`);
}

export function assertEstimateStamped(source) {
  const match = String(source || "").match(/const RECIPIENT = '([^']*)';/);
  if (!match || !EMAIL.test(match[1])) {
    throw new Error("ESTIMATE_TO was not written into api/estimate.php. Set it in .env and rebuild.");
  }
}
