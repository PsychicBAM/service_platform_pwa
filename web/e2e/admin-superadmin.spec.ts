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
    await expect(page.getByText(/active plan:/i)).toBeVisible();
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
});
