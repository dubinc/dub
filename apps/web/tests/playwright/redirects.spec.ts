import { test, expect } from "@playwright/test";

const baseUrl = "https://dub.sh";
const targetBaseURL = "https://www.google.com/";

test("Regular Redirect - Status Code 307", async ({ page }) => {
    const shortLink = `${baseUrl}/regular-redirect`;

    let responsePromise = page.waitForResponse(shortLink);
    await page.goto(shortLink);
    const response = await responsePromise;

    expect(response.status()).toBe(307);
    await expect(page).toHaveURL(targetBaseURL);
});

test("Redirects with slashes", async ({ page }) => {
    const shortLink = `${baseUrl}/redirect/slash`;

    await page.goto(shortLink);

    await expect(page).toHaveURL(targetBaseURL);
});

test("Redirect with passthrough query", async ({ page }) => {
    const shortLink = `${baseUrl}/passthrough-query?utm_source=x`;

    await page.goto(shortLink);

    await expect(page).toHaveURL(`${targetBaseURL}?utm_medium=social&utm_source=x&utm_campaign=devrel`);
});
