import { test, expect } from '@playwright/test';

const baseURL = 'https://dub.sh';

test('Password-protected links', async ({ page }) => {
    const passwordPage = `${baseURL}/password`;
    await page.goto(passwordPage);

    const modal = await page.waitForSelector('h3:has-text("Password Required")');
    expect(modal).toBeTruthy();
});

test('Device Targeting', async ({ page, userAgent }) => {
    const expectedURLs = {
        iOS: 'https://apps.apple.com/us/app/chatgpt/id6448311069',
        Android: 'https://play.google.com/store/apps/details?hl=en_US&id=com.openai.chatgpt&gl=US',
        Default: 'https://chat.openai.com/auth/login',
    };

    await page.goto(`${baseURL}/device-targeting`);

    let expectedURL: string;

    switch (true) {
        case userAgent?.includes('iPhone'):
            expectedURL = expectedURLs.iOS;
            break;
        case userAgent?.includes('Android'):
            expectedURL = expectedURLs.Android;
            break;
        default:
            expectedURL = expectedURLs.Default;
            break;
    }

    const currentURL = page.url();
    expect(currentURL).toBe(expectedURL);
});

test('Geo Targeting', async ({ page }) => {
    const countryToURL = {
        'uk': 'https://www.google.co.uk/',
        'jp': 'https://www.google.co.jp/',
        'mx': 'https://www.google.com.mx/',
        'default': 'https://www.google.com/',
    };

    await page.goto(`${baseURL}/geo-targeting`);

    const currentURL = page.url();

    let expectedURL = countryToURL['default'];

    const countryCode = currentURL.split('.').pop() || '';

    if (countryToURL[countryCode]) {
        expectedURL = countryToURL[countryCode];
    }

    expect(currentURL).toBe(expectedURL);
});




