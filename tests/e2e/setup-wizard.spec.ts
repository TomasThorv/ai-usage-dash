import { expect, test } from "@playwright/test";
import { mockVerifySuccess, wipeAll } from "./helpers";

test.describe("setup wizard happy path", () => {
  test.beforeEach(async () => {
    await wipeAll();
  });

  test("redirects to /setup when no credentials, then walks all 3 steps to dashboard", async ({
    page,
  }) => {
    await mockVerifySuccess(page);

    // 1. Fresh visit redirects to /setup?step=select
    await page.goto("/");
    await expect(page).toHaveURL(/\/setup\?step=select/);
    await expect(page.getByRole("heading", { name: "Pick providers" })).toBeVisible();

    // 2. Pick claude → Continue → step=keys
    await page.locator("button[aria-pressed]", { hasText: "Claude" }).first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/setup\?step=keys/);
    await expect(page.getByRole("heading", { name: "Enter API keys" })).toBeVisible();

    // 3. Fill the Admin API Key field for Claude and click Verify.
    // The adapter would normally call Anthropic's API; we intercept it via mockVerifySuccess.
    const adminKeyInput = page.getByLabel(/Admin API Key/i);
    await adminKeyInput.fill("sk-ant-admin01-test-value");
    await page.getByRole("button", { name: "Verify" }).click();

    // Green state: re-verify button signals success, and the continue label
    // updates to "1 verified". Both must be visible.
    await expect(page.getByRole("button", { name: "Re-verify" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /\d+ verified/ })).toBeEnabled();

    // 4. Continue → step=verify
    await page.getByRole("button", { name: /\d+ verified/ }).click();
    await expect(page).toHaveURL(/\/setup\?step=verify/);
    await expect(page.getByRole("heading", { name: "Ready to go" })).toBeVisible();

    // 5. Finish → /
    await page.getByRole("button", { name: "Finish" }).click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 10_000 });

    // Dashboard shell visible — top bar with the brand mark / aggregate metrics.
    await expect(page.locator("main").first()).toBeVisible();
  });
});
