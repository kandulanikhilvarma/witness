import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";

// Accessibility: fail on serious or critical axe violations (WCAG 2.2 A/AA
// rules). Colour contrast is also checked token by token in
// scripts/check-contrast.mjs; this catches the rendered combinations.
async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    blocking.map((v) => `${v.id}: ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(" ")}`),
  ).toEqual([]);
}

const PUBLIC = ["/", "/about", "/taxonomy", "/transparency", "/model-card", "/login"];

for (const path of PUBLIC) {
  test(`public page ${path} renders and passes axe`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    await expectAccessible(page);
  });
}

test("landing states the real gate and a working skip link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: "gate threshold: 0.70" })).toBeVisible();
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("unknown address answers 404 with a way back", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "No record at this address" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to the start" })).toBeVisible();
});

test("console: upload a photo and see the record land", async ({ page }) => {
  await page.goto("/console");
  await expect(page.getByRole("link", { name: "Records" })).toHaveAttribute("aria-current", "page");
  await expectAccessible(page);

  const code = `E2E-${Date.now()}`;
  const png = await sharp({
    create: { width: 96, height: 96, channels: 3, background: { r: 120, g: 110, b: 100 } },
  })
    .png()
    .toBuffer();
  await page.getByLabel("Part family").selectOption("gear");
  await page.getByLabel("Batch code").fill(code);
  await page.getByLabel("Photograph").setInputFiles({ name: "IMG_0001.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Analyse part" }).click();

  await expect(page.getByRole("cell", { name: code })).toBeVisible({ timeout: 20_000 });
  // Next.js mounts its own empty route announcer with role="alert"; only the
  // form's alerts matter here.
  await expect(page.locator("form [role=alert]")).toHaveCount(0);
});

test("console: a file that is not an image is refused with a reason", async ({ page }) => {
  await page.goto("/console");
  await page.getByLabel("Photograph").setInputFiles({
    name: "not-an-image.png",
    mimeType: "image/png",
    buffer: Buffer.from("this is not a png"),
  });
  await page.getByRole("button", { name: "Analyse part" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("not a readable image");
});

test("@phone console fits a phone with no sideways scroll", async ({ page }) => {
  await page.goto("/console");
  await expect(page.getByRole("navigation", { name: "Console" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
