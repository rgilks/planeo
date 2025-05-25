import { test, expect, Page } from "@playwright/test";

const pollForCondition = async (
  page: Page,
  conditionFn: () => Promise<boolean>,
  timeout = 10000,
  pollInterval = 100,
) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await conditionFn()) {
      return true;
    }
    await page.waitForTimeout(pollInterval);
  }
  return false;
};

test.describe("Multi-User Event Synchronization", () => {
  let page1: Page;
  let page2: Page;

  test.beforeEach(async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();

    await page1.goto("/");
    await page2.goto("/");
    await expect(page1).toHaveTitle(/Planeo/);
    await expect(page2).toHaveTitle(/Planeo/);
  });

  test("synchronizes eye updates between two users", async ({ request }) => {
    const user1EyeId = "user1-eye-test";
    const user1EyePos: [number, number, number] = [10, 20, 30];

    // Allow page2 a moment to fully initialize its event listeners
    await page2.waitForTimeout(500);

    // User 1 posts a eye update
    const postData = {
      type: "eyeUpdate",
      id: user1EyeId,
      p: user1EyePos,
      t: Date.now(),
    };
    const postResponse = await request.post("/api/events", { data: postData });
    expect(postResponse.ok()).toBeTruthy();

    // User 2 verifies receiving the eye update
    const receivedOnPage2 = await pollForCondition(page2, async () => {
      const eyeData = await page2.evaluate((id) => {
        const storeState = window.__eyeStore?.getState();
        return storeState?.eyes?.[id];
      }, user1EyeId);
      return JSON.stringify(eyeData?.p) === JSON.stringify(user1EyePos);
    });
    expect(receivedOnPage2).toBe(true);
  });

  test("synchronizes symbol events between two users", async ({ request }) => {
    const user1SymbolId = "user1-key-test";
    const user1Key = "g";

    // User 1 posts a symbol event
    const symbolEventData = {
      type: "symbol",
      id: user1SymbolId,
      key: user1Key,
    };
    const symbolPostResponse = await request.post("/api/events", {
      data: symbolEventData,
    });
    expect(symbolPostResponse.ok()).toBeTruthy();

    // User 2 verifies receiving the symbol event
    const symbolEventReceivedOnPage2 = await pollForCondition(
      page2,
      async () => {
        const keyData = await page2.evaluate((id) => {
          const storeState = window.__symbolStore?.getState();
          return storeState?.remoteKeys?.[id];
        }, user1SymbolId);
        return keyData?.key === user1Key;
      },
    );
    expect(symbolEventReceivedOnPage2).toBe(true);
  });

  test("full client-side symbol event synchronization", async () => {
    await page1.locator("body").focus(); // Ensure page1 is focused to receive symbol input
    await page1.keyboard.press("h");

    const clientSideSymbolEventReceived = await pollForCondition(
      page2,
      async () => {
        const remoteKeys = await page2.evaluate(() => {
          const storeState = window.__symbolStore?.getState();
          return storeState?.remoteKeys as
            | Record<string, { key: string; ts: number }>
            | undefined;
        });
        return Object.values(remoteKeys || {}).some(
          (entry) => entry.key === "h",
        );
      },
    );
    expect(clientSideSymbolEventReceived).toBe(true);
  });
});

test("original: has title and receives initial event data", async ({
  page,
  request,
}) => {
  page.on("console", (msg) =>
    console.log(`BROWSER CONSOLE: ${msg.type()}: ${msg.text()}`),
  );

  const postData = {
    type: "eyeUpdate",
    id: "test-eye",
    p: [1, 2, 3],
    t: Date.now(),
  };
  const postResponse = await request.post("/api/events", { data: postData });
  expect(postResponse.ok()).toBeTruthy();

  await page.goto("/");
  await expect(page).toHaveTitle(/Planeo/);

  const received = await pollForCondition(
    page,
    async () => {
      const eyeData = await page.evaluate(() => {
        const storeState = window.__eyeStore?.getState();
        return storeState?.eyes?.["test-eye"];
      });
      return JSON.stringify(eyeData?.p) === JSON.stringify([1, 2, 3]);
    },
    10000,
  );
  expect(received).toBe(true);
});
