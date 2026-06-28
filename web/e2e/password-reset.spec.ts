import { test, expect } from "@playwright/test";

test.describe("password reset smoke", () => {
  test("A. /forgot-password loads and validates empty submit", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: "Forgot password" })).toBeVisible();
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("Email is required.")).toBeVisible();
  });

  test("B. /forgot-password validates invalid email", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.locator('input[type="email"]').fill("not-an-email");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  });

  test("C. /reset-password without token shows friendly error", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
    await expect(page.getByText("Password reset link is missing.")).toBeVisible();
  });
});
