import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { unpack } from "../tools/unpack.js";
import { assertEstimateStamped, stampEstimateRecipient } from "../tools/estimate-mail.js";
import { SEND_FAILURE, estimateOutcome, validateEstimate } from "../src/assets/js/estimate-outcome.js";

const phpSource = () => fs.readFileSync(new URL("../src/api/estimate.php", import.meta.url), "utf8");

test("stampEstimateRecipient writes the mailbox into the handler", () => {
  const stamped = stampEstimateRecipient(phpSource(), "chris@greengardenlawncare.com");
  assert.match(stamped, /const RECIPIENT = 'chris@greengardenlawncare\.com';/);
  assert.doesNotMatch(stamped, /__ESTIMATE_TO__/);
  assert.doesNotThrow(() => assertEstimateStamped(stamped));
});

test("stampEstimateRecipient rejects a missing or unsafe mailbox", () => {
  assert.throws(() => stampEstimateRecipient(phpSource(), ""), /ESTIMATE_TO/);
  assert.throws(() => stampEstimateRecipient(phpSource(), "chris@greengardenlawncare.com\nBcc: evil@example.com"), /ESTIMATE_TO/);
  assert.throws(() => assertEstimateStamped(phpSource()), /ESTIMATE_TO/);
});

test("estimate.php emails a valid request and fails closed without a mailbox", () => {
  const php = phpSource();
  assert.match(php, /const RECIPIENT = '__ESTIMATE_TO__';/);
  assert.match(php, /mail\s*\(/);
  assert.match(php, /Reply-To:/);
  assert.match(php, /name="notes"|field\('notes'/);
  assert.match(php, /leave_blank/);
  assert.match(php, /ESTIMATE_MAIL_SINK/);
  assert.match(php, /X-Robots-Tag: noindex/);
  assert.match(php, /name="robots" content="noindex"/);
  assert.match(php, /green-garden-lawn-care-logo\.jpg/);
  assert.match(php, /#103D27/);
  assert.match(php, /#C6A35A/);
  assert.match(php, /multipart\/alternative/);
  assert.match(php, /Thanks for your estimate request/);
  assert.match(php, /New estimate request from /);
  assert.doesNotMatch(php, /No email was sent|reserved and unused/);
});

test("the estimate form no longer shows the prototype disclaimer", () => {
  const bundle = unpack(fs.readFileSync(new URL("../index.html", import.meta.url), "utf8"));
  assert.doesNotMatch(bundle.template, /Prototype only|Simulated success|no data was sent/);
  assert.match(bundle.template, /name="leave_blank"/);
});

test("validateEstimate accepts a complete request and rejects a broken email", () => {
  const valid = new Map([
    ["name", "Ada Lovelace"],
    ["phone", "214-555-0100"],
    ["email", "ada@example.com"],
    ["service", "Lawn Maintenance"],
    ["address", "75001"],
  ]);
  assert.deepEqual(validateEstimate(valid), {});
  const injected = new Map(valid);
  injected.set("email", "ada@example.com\nBcc: evil@example.com");
  assert.equal(validateEstimate(injected).email, "Enter a valid email address.");
});

test("estimateOutcome shows success only after the handler accepts the request", () => {
  assert.deepEqual(estimateOutcome(200, { ok: true, errors: [] }), { ok: true, message: "" });
  assert.deepEqual(estimateOutcome(422, { ok: false, errors: ["Choose a service."] }), {
    ok: false,
    message: "Choose a service.",
  });
  assert.deepEqual(estimateOutcome(503, null), { ok: false, message: SEND_FAILURE });
  assert.equal(SEND_FAILURE.includes("214-962-9089"), true);
});
