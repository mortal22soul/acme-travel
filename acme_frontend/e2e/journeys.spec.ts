import { randomInt, randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function signup(page: Page, role: "agent" | "customer") {
  const username = `test-${randomUUID().slice(0, 12)}`;
  await page.goto("/signup", { waitUntil: "domcontentloaded" });
  await page.getByLabel("First name").fill("Local");
  await page.getByLabel("Last name").fill("Traveler");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Email address").fill(`${username}@example.com`);
  await page.getByLabel("Account type").selectOption(role);
  await page.getByLabel("Phone", { exact: true }).fill(`+1202${randomInt(1000000, 10000000)}`);
  if (role === "agent") {
    await page.getByLabel("Region").fill("Oregon");
  } else {
    await page.getByLabel("Street address", { exact: true }).fill("10 Test Ave");
    await page.getByLabel("City", { exact: true }).fill("Portland");
    await page.getByLabel("Postal code").fill("97035");
    await page.getByLabel("Date of birth").fill("1990-06-15");
  }
  await page.getByLabel("Password", { exact: true }).fill("LocalTraveler7!");
  const registered = page.waitForResponse(response => response.url().endsWith("/api/signup") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Create account" }).click();
  const response = await registered;
  expect(response.status()).toBe(201);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  await expect(page).toHaveURL(/\/destinations$/);
}

test("server renders trip information and sets real 404 statuses", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  expect((await page.goto(`${baseURL}/destinations`, { waitUntil: "domcontentloaded" }))?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Find your next adventure" })).toBeVisible();
  const trip = await page.locator('main a[href^="/destinations/"]').first().getAttribute("href");
  expect((await page.goto(`${baseURL}${trip}`, { waitUntil: "domcontentloaded" }))?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Trip details" })).toBeAttached();
  await expect(page.getByText("Route", { exact: true })).toBeVisible();
  for (const missing of ["/destinations/2147483647", "/does-not-exist"]) {
    expect((await page.request.get(`${baseURL}${missing}`)).status()).toBe(404);
  }
  await context.close();
});

test("customer can sign up, book, review, refresh and cancel", async ({ page, context }) => {
  await signup(page, "customer");
  const cookies = (await context.cookies()).filter(cookie => cookie.name.startsWith("__Host-acme_"));
  expect(cookies).toHaveLength(2);
  expect(cookies.every(cookie => cookie.httpOnly && cookie.secure && cookie.sameSite === "Lax")).toBe(true);
  await page.getByRole("link", { name: "Explore trip to Paris, France", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Paris, France" })).toBeVisible();
  await page.getByRole("button", { name: "Next photo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "2 of" })).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  const pay = page.getByRole("button", { name: /^Pay / });
  await expect(pay).toBeEnabled();
  await page.getByRole("radio", { name: /debit card/i }).check();
  await page.route("**/api/checkout", async route => {
    const committed = await route.fetch();
    expect(committed.status()).toBe(201);
    await route.fulfill({ status: 503, json: { message: "Simulated reconnect after payment" } });
  });
  await pay.click();
  await expect(page.getByRole("alert").filter({ hasText: "Simulated reconnect" })).toBeVisible();
  await page.unroute("**/api/checkout");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("radio", { name: /debit card/i })).toBeChecked();
  await page.getByRole("button", { name: "Retry checkout" }).click();
  await expect(page.getByRole("heading", { name: "Your trips are confirmed" })).toBeVisible();
  await page.getByRole("link", { name: "View my bookings" }).click();
  await expect(page.getByRole("link", { name: /to Paris, France/ })).toHaveCount(1);
  await page.getByRole("link", { name: /to Paris, France/ }).click();

  await page.getByRole("link", { name: "Write a review" }).click();
  await page.getByRole("radio", { name: "5", exact: true }).check();
  const reviewTitle = `Browser review ${randomUUID().slice(0, 6)}`;
  await page.getByLabel("Title", { exact: true }).fill(reviewTitle);
  await page.getByLabel("Comment").fill("The booking and itinerary were easy to find.");
  await page.getByRole("button", { name: "Publish review" }).click();
  await expect(page.getByRole("heading", { name: reviewTitle })).toBeVisible();

  await context.clearCookies({ name: "__Host-acme_access" });
  const rotation = await page.evaluate(() => Promise.all([
    fetch("/api/me").then(response => response.status),
    fetch("/api/me").then(response => response.status),
  ]));
  expect(rotation).toEqual([200, 200]);
  await page.getByRole("link", { name: "My account" }).click();
  await page.getByRole("button", { name: "Cancel booking", exact: true }).click();
  await page.getByRole("button", { name: "Confirm cancellation" }).click();
  await expect(page.getByText("canceled", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await context.cookies()).filter(cookie => cookie.name.startsWith("__Host-acme_"))).toHaveLength(0);
});

test("an agent can navigate to and publish a trip on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await signup(page, "agent");
  await page.getByRole("link", { name: "Add destination" }).click();
  await expect(page).toHaveURL(/\/destinations\/new$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const name = `E2E destination ${randomUUID().slice(0, 6)}`;
  await page.getByLabel("Destination", { exact: true }).fill(name);
  await page.getByLabel("Origin", { exact: true }).fill("Portland");
  await page.getByLabel("Departure date").fill(new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10));
  await page.getByLabel("Price per traveler (USD)").fill("125.50");
  await page.getByLabel("Available seats").fill("3");
  await page.getByLabel("Photo URLs").fill("https://images.pexels.com/photos/208745/pexels-photo-208745.jpeg");
  await page.getByRole("button", { name: "Publish destination" }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Add itinerary" }).click();
  await page.getByLabel("Activity").fill("Visit the local museum");
  await page.getByRole("button", { name: "Add itinerary entry" }).click();
  await expect(page.getByText("Itinerary entry added.")).toBeVisible();
  await page.getByRole("link", { name: "Back to trip" }).click();
  await expect(page.getByText("Visit the local museum")).toBeVisible();
});

test("keyboard navigation, persisted theme and accessibility", async ({ page, browserName }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  const menu = page.getByRole("button", { name: "Menu" });
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page.getByLabel("Theme").selectOption("light");
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  if (browserName === "chromium") {
    for (const path of ["/", "/login", "/signup", "/destinations"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })), path).toEqual([]);
    }
  }
});
