import test from "node:test";
import assert from "node:assert/strict";
import { schemas, validate } from "../lib/security.js";
import { PLAN_DEFS } from "../lib/billing.js";
import { databaseHealth } from "../lib/health.js";

test("billing plans include commercial tiers", () => {
  const codes = PLAN_DEFS.map((p) => p.code);
  assert.deepEqual(codes, ["free", "starter", "pro", "agency"]);
});

test("signup validation rejects invalid email", () => {
  const result = validate(schemas.signup, { email: "bad", password: "123" });
  assert.equal(result.error, "Dados inválidos. Revise os campos e tente novamente.");
});

test("checkout validation accepts starter monthly stripe", () => {
  const result = validate(schemas.billingCheckout, { planCode: "starter", interval: "monthly", provider: "stripe" });
  assert.equal(result.data.planCode, "starter");
});

test("database health exposes expected SaaS tables", () => {
  const health = databaseHealth({ deep: true });
  assert.equal(health.ok, true);
  assert.equal(health.counts.plans >= 4, true);
  assert.equal(typeof health.counts.provider_webhooks, "number");
});
