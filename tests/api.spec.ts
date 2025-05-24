import { test, expect } from "@playwright/test";

const API_ENDPOINT = "/api/events";

test.describe("API Robustness - POST /api/events", () => {
  test("should return 400 for empty payload", async ({ request }) => {
    const response = await request.post(API_ENDPOINT, { data: {} });
    expect(response.status()).toBe(400);
  });

  test("should return 400 for missing 'type' field", async ({ request }) => {
    const response = await request.post(API_ENDPOINT, {
      data: { id: "test", key: "g" },
    });
    expect(response.status()).toBe(400);
  });

  test("should return 400 for invalid 'type' field", async ({ request }) => {
    const response = await request.post(API_ENDPOINT, {
      data: { type: "invalidType", id: "test" },
    });
    expect(response.status()).toBe(400);
  });

  test.describe("Symbol Event Validation", () => {
    test("should return 400 for missing 'id' in symbol event", async ({
      request,
    }) => {
      const response = await request.post(API_ENDPOINT, {
        data: { type: "symbol", key: "g" },
      });
      expect(response.status()).toBe(400);
    });

    test("should return 400 for missing 'key' in symbol event", async ({
      request,
    }) => {
      const response = await request.post(API_ENDPOINT, {
        data: { type: "symbol", id: "test" },
      });
      expect(response.status()).toBe(400);
    });

    test("should return 200 for valid symbol event", async ({ request }) => {
      const response = await request.post(API_ENDPOINT, {
        data: { type: "symbol", id: "test-valid", key: "g" },
      });
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe("Eye Update Event Validation", () => {
    test("should return 400 for missing 'id' in eye event", async ({
      request,
    }) => {
      const response = await request.post(API_ENDPOINT, {
        data: { type: "eyeUpdate", p: [1, 2, 3], t: Date.now() },
      });
      expect(response.status()).toBe(400);
    });

    test("should return 400 for missing 'p' in eye event", async ({
      request,
    }) => {
      const response = await request.post(API_ENDPOINT, {
        data: { type: "eyeUpdate", id: "test", t: Date.now() },
      });
      expect(response.status()).toBe(400);
    });

    test("should return 400 for 'p' not an array in eye event", async ({
      request,
    }) => {
      const response = await request.post(API_ENDPOINT, {
        data: {
          type: "eyeUpdate",
          id: "test",
          p: "not-an-array",
          t: Date.now(),
        },
      });
      expect(response.status()).toBe(400);
    });

    test("should return 400 for 'p' not an array of 3 numbers", async ({
      request,
    }) => {
      const response = await request.post(API_ENDPOINT, {
        data: { type: "eyeUpdate", id: "test", p: [1, 2], t: Date.now() },
      });
      expect(response.status()).toBe(400);
    });

    test("should return 400 for 'p' with non-number elements", async ({
      request,
    }) => {
      const response = await request.post(API_ENDPOINT, {
        data: {
          type: "eyeUpdate",
          id: "test",
          p: [1, "a", 3],
          t: Date.now(),
        },
      });
      expect(response.status()).toBe(400);
    });

    test("should return 400 for missing 't' in eye event", async ({
      request,
    }) => {
      const response = await request.post(API_ENDPOINT, {
        data: { type: "eyeUpdate", id: "test", p: [1, 2, 3] },
      });
      expect(response.status()).toBe(400);
    });

    test("should return 200 for valid eye event", async ({ request }) => {
      const response = await request.post(API_ENDPOINT, {
        data: {
          type: "eyeUpdate",
          id: "test-valid-eye",
          p: [1, 2, 3],
          t: Date.now(),
        },
      });
      expect(response.ok()).toBeTruthy();
    });
  });
});
