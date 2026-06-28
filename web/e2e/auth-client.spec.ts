import { test, expect } from "@playwright/test";
import { DEMO, USERS, loginAs } from "./helpers";

test.describe("client auth and /me pages", () => {
  test("E. client login sees linked bookings and orders", async ({ page }) => {
    await loginAs(page, USERS.client.email, USERS.client.password);
    await page.goto("/me/bookings");
    await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();
    await expect(page.getByText(DEMO.bookingService)).toBeVisible();

    await page.goto("/me/orders");
    await expect(page.getByRole("heading", { name: "My orders" })).toBeVisible();
    await expect(page.getByText(DEMO.orderService)).toBeVisible();
  });

  test("F. client can open claim page form", async ({ page }) => {
    await loginAs(page, USERS.client.email, USERS.client.password);
    await page.goto("/me/claim");
    await expect(
      page.getByRole("heading", { name: "Claim a booking or request" }),
    ).toBeVisible();
    await expect(page.getByLabel("Reference")).toBeVisible();
    await expect(page.getByRole("button", { name: "Claim booking" })).toBeVisible();
  });

  test("G. verify-email without token shows friendly error", async ({ page }) => {
    await page.goto("/verify-email");
    await expect(page.getByRole("heading", { name: "Verify email" })).toBeVisible();
    await expect(page.getByText("Verification link is missing.")).toBeVisible();
  });

  test("H. check-email route loads", async ({ page }) => {
    await page.goto("/check-email");
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to login" })).toBeVisible();
  });

  test("I. register page renders fields and validates empty submit", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
    await expect(page.getByText("Full name")).toBeVisible();
    await expect(page.getByText("Business slug")).toBeVisible();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Full name is required.")).toBeVisible();
    await expect(page.getByText("Email is required.")).toBeVisible();
  });
});
