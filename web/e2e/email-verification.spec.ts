import { test, expect } from "@playwright/test";
import { USERS, loginAs } from "./helpers";

test.describe("email verification smoke audit", () => {
  test("A. /check-email logged out shows login link", async ({ page }) => {
    await page.goto("/check-email");
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to login" })).toBeVisible();
  });

  test("B. /verify-email without token shows missing-token message", async ({ page }) => {
    await page.goto("/verify-email");
    await expect(page.getByRole("heading", { name: "Verify email" })).toBeVisible();
    await expect(page.getByText("Verification link is missing.")).toBeVisible();
  });

  test("C. /register empty submit shows validation", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Full name is required.")).toBeVisible();
    await expect(page.getByText("Email is required.")).toBeVisible();
  });

  test("D. verified demo user sees already verified on /check-email", async ({ page }) => {
    await loginAs(page, USERS.client.email, USERS.client.password);
    await page.goto("/check-email");
    await expect(page.getByText("Your email is already verified.")).toBeVisible();
  });
});
