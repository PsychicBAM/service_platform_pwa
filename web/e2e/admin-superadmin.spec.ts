import { test, expect } from "@playwright/test";
import { DEMO, USERS, loginAs } from "./helpers";

test.describe("superadmin access", () => {
  test("H. superadmin can open dashboard and businesses", async ({ page }) => {
    await loginAs(page, USERS.superadmin.email, USERS.superadmin.password);
    await page.goto("/superadmin");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByText("Platform-wide business summary")).toBeVisible();

    await page.goto("/superadmin/businesses");
    await expect(page.getByRole("heading", { name: "Businesses" })).toBeVisible();
    await expect(page.getByText(DEMO.slug)).toBeVisible();
    const demoCard = page.locator("article").filter({ hasText: DEMO.businessName });
    await expect(demoCard.getByText(/active plan:/i)).toBeVisible();
  });

  test("I. owner is blocked from superadmin", async ({ page }) => {
    await loginAs(page, USERS.owner.email, USERS.owner.password);
    await page.goto("/superadmin");
    await expect(page.getByText("Superadmin access required")).toBeVisible();
  });

  test("J. superadmin can open legal consent records page", async ({ page }) => {
    await loginAs(page, USERS.superadmin.email, USERS.superadmin.password);
    await page.goto("/superadmin/legal-consents");
    await expect(
      page.getByRole("heading", { name: "Platform legal consent records" }),
    ).toBeVisible();
    await expect(
      page.getByText(/audit summary only\. legal text is still pending final review\./i),
    ).toBeVisible();
  });

  test("K. manual plan change persists after reload", async ({ page }) => {
    await loginAs(page, USERS.superadmin.email, USERS.superadmin.password);
    await page.goto("/superadmin/businesses");
    await expect(page.getByText(DEMO.businessName)).toBeVisible();

    const demoCard = page.locator("article").filter({ hasText: DEMO.businessName });
    await demoCard.getByRole("button", { name: "View / edit" }).click();

    const detailPanel = page
      .locator("div.rounded-2xl.border-slate-300")
      .filter({ has: page.getByRole("heading", { name: DEMO.businessName, level: 3 }) });
    await expect(detailPanel.getByLabel(/set active plan manually/i)).toBeVisible();

    await detailPanel.getByLabel(/set active plan manually/i).selectOption("pro");
    await detailPanel.getByRole("button", { name: /save manual plan change/i }).click();
    await expect(page.getByText("Manual plan change saved.")).toBeVisible({ timeout: 10_000 });
    await expect(
      detailPanel.getByRole("heading", { name: "Subscription" }).locator(".."),
    ).toContainText("Pro");

    await page.reload();
    await expect(page.getByText(DEMO.businessName)).toBeVisible();
    await expect(demoCard).toContainText(/Active plan:\s*Pro/i);

    await demoCard.getByRole("button", { name: "View / edit" }).click();
    const detailAfterReload = page
      .locator("div.rounded-2xl.border-slate-300")
      .filter({ has: page.getByRole("heading", { name: DEMO.businessName, level: 3 }) });
    await expect(
      detailAfterReload.getByRole("heading", { name: "Subscription" }).locator(".."),
    ).toContainText("Pro");

    await detailAfterReload.getByLabel(/set active plan manually/i).selectOption("business");
    await detailAfterReload.getByRole("button", { name: /save manual plan change/i }).click();
    await expect(page.getByText("Manual plan change saved.")).toBeVisible({ timeout: 10_000 });
  });
});
