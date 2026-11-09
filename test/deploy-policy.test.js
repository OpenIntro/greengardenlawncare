import test from "node:test";
import assert from "node:assert/strict";
import { assertDeleteAllowed, shouldSkipRemote } from "../tools/deploy-policy.js";

test("delete refuses a broad remote directory and a missing identity", () => {
  assert.throws(() => assertDeleteAllowed("/public_html", "Green Garden Lawn Care"), /document root/);
  assert.throws(() => assertDeleteAllowed("/home/user/public_html", ""), /identity file/);
  assert.equal(assertDeleteAllowed("/home/user/public_html", "Green Garden Lawn Care\n"), "/home/user/public_html");
});

test("delete always skips well-known and cgi-bin", () => {
  assert.equal(shouldSkipRemote(".well-known/acme"), true);
  assert.equal(shouldSkipRemote("cgi-bin/form"), true);
  assert.equal(shouldSkipRemote("assets/css/site.css"), false);
});
