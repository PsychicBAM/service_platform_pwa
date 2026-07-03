import { test, expect } from "@playwright/test";
import { DEMO, USERS, loginAs } from "./helpers";

test.describe("admin access guards", () => {
  test("F. owner can open admin dashboard and services", async ({ page }) => {
    await loginAs(page, USERS.owner.email, USERS.owner.password);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText(`Overview for ${DEMO.businessName}`)).toBeVisible();

    await page.goto("/admin/services");
    await expect(page.getByRole("heading", { name: "Services" })).toBeVisible();
    await expect(page.getByText(DEMO.bookingService)).toBeVisible();
    await expect(page.getByText(DEMO.orderService)).toBeVisible();
  });

  test("G. client is blocked from admin", async ({ page }) => {
    await loginAs(page, USERS.client.email, USERS.client.password);
    await page.goto("/admin");
    await expect(page.getByText("No business access")).toBeVisible();
  });

  test("H. owner can see billing section on settings", async ({ page }) => {
    await loginAs(page, USERS.owner.email, USERS.owner.password);
    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    const billingHeading = page.getByRole("heading", { name: "Billing / plan" });
    await billingHeading.scrollIntoViewIfNeeded();
    await expect(billingHeading).toBeVisible();
    await expect(page.getByText(/Stripe checkout is optional/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Start Starter checkout" })).toBeVisible();
  });

  test("I. owner can open legal consent records page", async ({ page }) => {
    await loginAs(page, USERS.owner.email, USERS.owner.password);
    await page.goto("/admin/legal-consents");
    await expect(page.getByRole("heading", { name: "Legal consent records" })).toBeVisible();
    await expect(
      page.getByText(/audit summary only\. legal text is still pending final review\./i),
    ).toBeVisible();
  });
});
