import { expect, test, type Page } from "@playwright/test";

const openAppSection = async (page: Page, label: string) => {
  const mobileNav = page.getByRole("navigation", { name: "Mobile primary" });

  if (await mobileNav.isVisible().catch(() => false)) {
    await mobileNav.getByRole("link", { name: label, exact: true }).click();
    return;
  }

  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: label, exact: true }).click();
};

test("registers, chats, collaborates in a room, and updates settings", async ({ page }, testInfo) => {
  const thumbsUp = "\u{1F44D}";
  const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const projectTag = testInfo.project.name.replace(/\W+/g, "").toLowerCase();
  const username = `smoke${projectTag}${stamp.slice(-8)}`;
  const email = `${username}@example.com`;
  const roomName = `Smoke Room ${String(stamp).slice(-5)}`;

  await page.goto("/register");
  await page.getByRole("textbox", { name: "Username" }).fill(username);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.locator("#password").fill("secret123");
  await page.locator("#confirmPassword").fill("secret123");
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/app\/ai/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /solo ai chat/i })).toBeVisible();

  await page.getByRole("textbox", { name: "AI message composer" }).fill("Give me a one-line smoke test acknowledgement.");
  await page.getByRole("button", { name: /^send$/i }).click();
  await expect(page).toHaveURL(/\/app\/ai\/.+/);
  await expect(
    page.getByText("I could not reach the configured AI providers right now. Please try again shortly.").first()
  ).toBeVisible();

  await openAppSection(page, "Rooms");
  await expect(page.getByRole("heading", { name: /create room/i })).toBeVisible();
  await page.getByRole("textbox", { name: "Room name" }).fill(roomName);
  await page.getByRole("textbox", { name: "Room description" }).fill("Smoke coverage room");
  await page.getByRole("button", { name: /^create$/i }).click();

  await expect(page).toHaveURL(/\/app\/rooms\/.+/);
  await expect(page.getByRole("heading", { name: roomName, level: 2 })).toBeVisible();

  await page.getByRole("textbox", { name: "Room message composer" }).fill("Smoke message");
  await page.getByRole("button", { name: /^send$/i }).click();
  await expect(page.getByText("Smoke message")).toBeVisible();

  await page.getByRole("button", { name: `React with ${thumbsUp}` }).first().click();
  await expect(page.getByRole("button", { name: new RegExp(`${thumbsUp}\\s+1`) })).toBeVisible();

  await openAppSection(page, "Settings");
  await expect(page.getByRole("heading", { name: /personalize the command center/i })).toBeVisible();
  await page.getByLabel("Accent").selectOption("coral");
  await page.getByRole("button", { name: /save preferences/i }).click();

  const previewToggle = page.getByRole("button", { name: "Preview" });
  if (await previewToggle.isVisible().catch(() => false)) {
    await previewToggle.click();
  }

  await expect(page.getByText(/Accent: coral/i)).toBeVisible();
});
