import { test, expect } from "@playwright/test";

test.describe("billing result pages", () => {
  test("A. success page shows webhook activation message", async ({ page }) => {
    await page.goto("/billing/success?session_id=cs_test_123");
    await expect(page.getByRole("heading", { name: "Checkout completed" })).toBeVisible();
    await expect(page.getByText(/webhook processing/i)).toBeVisible();
    await expect(page.getByText("cs_test_123")).toBeVisible();
  });

  test("B. cancel page shows no plan change message", async ({ page }) => {
    await page.goto("/billing/cancel");
    await expect(page.getByRole("heading", { name: "Checkout cancelled" })).toBeVisible();
    await expect(page.getByText(/active plan was not changed/i)).toBeVisible();
  });
});
