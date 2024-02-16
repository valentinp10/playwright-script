import { chromium, Browser, Page, ElementHandle } from 'playwright';

interface Option {
    answer: string;
    conditionalQuestions: [];
}

interface DynamicQuestion {
    question: string;
    id: string;
    label: string;
    inputType: string;
    options?: Array<Option>;
    mandatory: boolean;
}

const processString = (inputStr: string): string => {
    // stop at first \n
    inputStr = inputStr.split('\n')[0].substring(0, 40);

    // convert to lowercase
    let lowerCaseStr: string = inputStr.toLowerCase();

    // remove punctuation using regex
    let noPunctuationStr: string = lowerCaseStr.replace(/[^\w\s]|_/g, '');

    // remove accents
    let normalizedStr: string = noPunctuationStr.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // replace spaces with dashes
    let finalStr: string = normalizedStr.replace(/\s+/g, '-');

    return finalStr;
};

(async () => {
    let dynamicQuestions: DynamicQuestion[] = [];
    const browser: Browser = await chromium.launch();
    const context = await browser.newContext();
    const page: Page = await context.newPage();
    await page.goto('https://click.appcast.io/track/ggfh5st?cs=itl&exch=ia&jg=6o0l&bid=7g-BOD3yIyJl4P4ikp9YSg==');
    await page.screenshot({ path: 'images/open-page.png' });

    await page.waitForSelector('.cky-notice-btn-wrapper button.cky-btn-reject', { timeout: 30000 });
    await page.locator('.cky-notice-btn-wrapper button.cky-btn-reject').click()

    try {
        await page.waitForSelector('input#name', { timeout: 100 });
        await page.locator('input#name').fill('Peter');
    } catch (error) {
        await page.locator('[id*="first_name"]').fill('Peter');
        await page.locator('input[id*="last_name"]').fill('Doe');
    }

    await page.locator('[id*="email"]').fill('abc@test.com');
    await page.locator('input[id*="phone"]').fill('(555) 555-1234');

    const questions = await page.$$('.form-group,div[class*="mb-4"],div[class*="mb-4"], .mb-3.row>.col-6');
    let results = [];

    for (const element of questions) {
        if (await element.isVisible()) {
            results.push(element);
        }
    }

    for (const el of results) {
        const dynamicQuestion: DynamicQuestion = { question: '', id: '', label: '', inputType: '', mandatory: false };

        let labelElement = await el.$('label');
        dynamicQuestion.question = labelElement ? await labelElement.innerText() : '';
        dynamicQuestion.id = processString(dynamicQuestion.question);
        dynamicQuestion.label = 'test-label';
        const type = [
            { selector: await el.$("[type='text']"), type: 'Text' },
            { selector: await el.$("[type='email']"), type: 'Text' },
            { selector: await el.$("[type='phone']"), type: 'Text' },
            { selector: await el.$("[type='radio']"), type: 'SelectOne' },
            { selector: await el.$("[type='checkbox']"), type: 'SelectMultiple' },
            { selector: await el.$("select[multiple='multiple']"), type: 'SelectMultiple' },
        ];
        const found = type.find((el) => el.selector?.isVisible());
        dynamicQuestion.inputType = found?.type ?? '';

        if (dynamicQuestion.inputType === 'SelectOne' || dynamicQuestion.inputType === 'SelectMultiple') {
            dynamicQuestion.options = [];
            const options = await el.$$('[type="radio"],[type="checkbox"],.option');
            let text;
            for (const element of options) {
                if (/\d+/g.test((await element.getAttribute('value')) ?? '')) {
                    const parentElementHandle = await element.evaluateHandle((el: HTMLElement) => el.parentElement);
                    const parentElement = parentElementHandle as ElementHandle;
                    text = await parentElement?.innerText();
                } else {
                    text = (await element.getAttribute('value')) || '';
                }

                const option: Option = { answer: text, conditionalQuestions: [] };
                dynamicQuestion.options?.push(option);
            }
        }

        if (dynamicQuestion.question === 'Certificate or License') {
            dynamicQuestion.mandatory = true;
        } else {
            const mandatory = await el.$('[required]');
            dynamicQuestion.mandatory = (await mandatory?.isVisible()) ?? false;
        }
        dynamicQuestions.push(dynamicQuestion);
    }
    await page.locator('#work_as_per_diem_no').click()

    console.log(JSON.stringify(dynamicQuestions));
    console.log(dynamicQuestions);
    await page.screenshot({ path: 'images/page.png', fullPage: true });
    await browser.close();
})();
