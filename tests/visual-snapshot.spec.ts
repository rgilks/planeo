import { test, expect } from "@playwright/test";

test.describe("Visual Snapshots", () => {
  test("captures image of animation after 3 seconds", async ({ page }) => {
    await page.goto("/");

    // Click the start overlay to reveal the canvas
    await page.locator("text=Click to Start").click();

    await page.waitForTimeout(3000);

    await page.screenshot({
      path: "screenshots/loaded.png",
      fullPage: true,
    });

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });
});
