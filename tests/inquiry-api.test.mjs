import assert from "node:assert/strict";
import test from "node:test";
import inquiryHandler from "../api/inquiry.js";

function createResponseHarness() {
  const headers = {};
  return {
    statusCode: 200,
    headers,
    body: undefined,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
    },
    getHeader(name) {
      return headers[String(name).toLowerCase()];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.setHeader("content-type", "application/json; charset=utf-8");
      this.body = JSON.stringify(payload);
      return this;
    },
    end(payload) {
      this.body = payload;
      return this;
    },
  };
}

function createRequest(body, overrides = {}) {
  return {
    method: "POST",
    url: "/api/inquiry",
    headers: {
      host: "www.ou-link.com",
      origin: "https://www.ou-link.com",
      "content-type": "application/json",
    },
    body,
    ...overrides,
  };
}

const VALID_PAYLOAD = {
  name: "  Zhang Wei  ",
  contact: " zhangwei@tier1-harness.example ",
  phone: "13800138000",
  email: "zhangwei@tier1-harness.example",
  company: " Shanghai Tier-1 Harness Co., Ltd. ",
  organization: " Shanghai Tier-1 Harness Co., Ltd. ",
  customerType: "harness",
  inquiryType: "bom",
  topic: "bom",
  partNumbers: "1928404745 x 2000 PCS\n368500-1 x 5000 PCS",
  bomText: "1928404745 x 2000 PCS\n368500-1 x 5000 PCS",
  bomItems: [
    { mpn: "1928404745", qty: 2000, brand: "BOSCH" },
    { mpn: "368500-1", qty: 5000, brand: "TE Connectivity" },
  ],
  message: "  Requesting official BOM quotation and Lot/Date Code confirmation for 1928404745 and 368500-1.  ",
  locale: "zh",
  source: "/zh/contact",
  consent: true,
};

test("inquiry API rejects non-POST methods, cross-origin requests, and invalid payloads", async () => {
  // 1. Method check (GET -> 405)
  const getRes = createResponseHarness();
  await inquiryHandler(createRequest(undefined, { method: "GET" }), getRes);
  assert.equal(getRes.statusCode, 405, "GET /api/inquiry must return 405 Method Not Allowed");

  // 2. Cross-origin check (-> 403)
  const csrfRes = createResponseHarness();
  await inquiryHandler(
    createRequest(VALID_PAYLOAD, {
      headers: {
        host: "www.ou-link.com",
        origin: "https://evil-attacker.example",
        "content-type": "application/json",
      },
    }),
    csrfRes
  );
  assert.equal(csrfRes.statusCode, 403, "Cross-origin POST must be rejected with 403");

  // 3. Invalid / incomplete payload check (-> 400)
  const invalidRes = createResponseHarness();
  await inquiryHandler(
    createRequest({ name: "", contact: "x", message: "hi", consent: false }),
    invalidRes
  );
  assert.equal(invalidRes.statusCode, 400, "Incomplete or unconsented inquiry must return 400");
  const parsedInvalid = JSON.parse(invalidRes.body);
  assert.equal(parsedInvalid.ok, false);
});

test("inquiry API silently traps honeypot bot submissions without downstream delivery", async () => {
  const prevFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return { ok: true };
  };

  try {
    const res = createResponseHarness();
    await inquiryHandler(
      createRequest({ ...VALID_PAYLOAD, website: "https://spam-bot.example" }),
      res
    );
    assert.equal(res.statusCode, 200, "Honeypot submission should return 200");
    assert.equal(JSON.parse(res.body).ok, true);
    assert.equal(fetchCalled, false, "Honeypot submission must NOT trigger external fetch delivery");
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test("inquiry API honestly returns 503 when no webhook or email receiver credentials are configured", async () => {
  const envKeys = [
    "CONTACT_WEBHOOK_URL",
    "INQUIRY_WEBHOOK_URL",
    "CONTACT_WEBHOOK_TOKEN",
    "INQUIRY_WEBHOOK_TOKEN",
    "RESEND_API_KEY",
    "CONTACT_TO_EMAIL",
    "CONTACT_FROM_EMAIL",
  ];
  const backup = {};
  for (const k of envKeys) {
    backup[k] = process.env[k];
    delete process.env[k];
  }

  try {
    const res = createResponseHarness();
    await inquiryHandler(createRequest(VALID_PAYLOAD), res);
    assert.equal(
      res.statusCode,
      503,
      `Without receiver credentials, /api/inquiry must return honest 503 instead of ${res.statusCode}`
    );
    const payload = JSON.parse(res.body);
    assert.equal(payload.ok, false);
  } finally {
    for (const k of envKeys) {
      if (backup[k] !== undefined) process.env[k] = backup[k];
      else delete process.env[k];
    }
  }
});

test("inquiry API delivers sanitized BOM inquiry via webhook and never logs private contact details", async () => {
  const backupUrl = process.env.CONTACT_WEBHOOK_URL;
  const backupInqUrl = process.env.INQUIRY_WEBHOOK_URL;
  const backupToken = process.env.CONTACT_WEBHOOK_TOKEN;
  const prevFetch = globalThis.fetch;
  const prevLog = console.log;

  let deliveredRequest = null;
  const loggedLines = [];

  process.env.CONTACT_WEBHOOK_URL = "https://receiver.oulink.test/webhook";
  process.env.INQUIRY_WEBHOOK_URL = "https://receiver.oulink.test/webhook";
  process.env.CONTACT_WEBHOOK_TOKEN = "qa-bearer-secret";

  globalThis.fetch = async (url, options) => {
    deliveredRequest = {
      url: String(url),
      options,
      bodyText: options?.body ? String(options.body) : "",
    };
    return { ok: true, status: 200 };
  };
  console.log = (...args) => {
    loggedLines.push(args.map(String).join(" "));
  };

  try {
    const res = createResponseHarness();
    await inquiryHandler(createRequest(VALID_PAYLOAD), res);
    assert.equal(res.statusCode, 200, `Expected 200 with configured webhook, got ${res.statusCode}: ${res.body}`);
    assert.equal(JSON.parse(res.body).ok, true);
    assert.ok(deliveredRequest, "Expected fetch to be invoked for webhook delivery");
    assert.equal(deliveredRequest.url, "https://receiver.oulink.test/webhook");
    assert.ok(
      deliveredRequest.bodyText.includes("Zhang Wei") && !deliveredRequest.bodyText.includes("  Zhang Wei  "),
      "Webhook payload should contain trimmed contact name"
    );
    assert.ok(
      deliveredRequest.bodyText.includes("1928404745"),
      "Webhook payload must preserve BOM MPN 1928404745"
    );

    const combinedLogs = loggedLines.join("\n");
    assert.ok(
      !combinedLogs.includes("zhangwei@tier1-harness.example") && !combinedLogs.includes("13800138000"),
      "Private contact details must never be written to console.log"
    );
  } finally {
    globalThis.fetch = prevFetch;
    console.log = prevLog;
    if (backupUrl !== undefined) process.env.CONTACT_WEBHOOK_URL = backupUrl;
    else delete process.env.CONTACT_WEBHOOK_URL;
    if (backupInqUrl !== undefined) process.env.INQUIRY_WEBHOOK_URL = backupInqUrl;
    else delete process.env.INQUIRY_WEBHOOK_URL;
    if (backupToken !== undefined) process.env.CONTACT_WEBHOOK_TOKEN = backupToken;
    else delete process.env.CONTACT_WEBHOOK_TOKEN;
  }
});
