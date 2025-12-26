
import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import {
    BuildParams,
    UupEdition,
    UupOption,
    UupDownloadMethod,
    UupVirtualEdition,
    UupLanguage
} from './types';

const OUTPUT_DIR = path.resolve(__dirname, '..', 'output');
const ANALYSIS_OUTPUT = path.join(OUTPUT_DIR, 'parameter_analysis.json');

// Helper to wait
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface AnalysisResult {
    category: string;
    builds: BuildParams[];
}

async function analyzeBuild(page: Page, buildId: string, title: string): Promise<BuildParams> {
    const startUrl = `https://uupdump.net/selectlang.php?id=${buildId}`;
    await page.goto(startUrl, { waitUntil: 'domcontentloaded' });

    // Initial result structure
    const result: BuildParams = {
        id: buildId,
        title,
        url: startUrl,
        languages: [],
        editions: [],
        options: []
    };

    try {
        console.log(`Analyzing ${buildId}...`);

        // --- STEP 1: Languages ---
        // Extract languages
        const languages = await page.evaluate(() => {
            const results: { label: string, value: string, type: 'link' | 'select' | 'hidden' }[] = [];

            // Check for select
            const select = document.querySelector('select[name="pack"]');
            if (select) {
                Array.from((select as HTMLSelectElement).options).forEach(opt => {
                    results.push({ label: opt.textContent?.trim() || '', value: opt.value, type: 'select' });
                });
            }

            // Check for links
            if (results.length === 0) {
                const links = Array.from(document.querySelectorAll('a[href*="pack="]'));
                links.forEach(a => {
                    const href = a.getAttribute('href') || '';
                    const match = href.match(/pack=([^&]+)/);
                    if (match) {
                        results.push({ label: a.textContent?.trim() || '', value: match[1], type: 'link' });
                    }
                });
            }

            // Check for hidden (auto-redirect scenario logic, though usually we are on the page)
            if (results.length === 0) {
                const hidden = document.querySelector('input[name="pack"]');
                if (hidden) {
                    results.push({ label: 'Default', value: (hidden as HTMLInputElement).value, type: 'hidden' });
                }
            }
            return results;
        });

        result.languages = languages.map(l => ({ label: l.label, value: l.value as UupLanguage }));
        if (languages.length === 0) throw new Error('No languages found');

        // Determine target language
        const targetLang = languages.find(l => l.value === 'zh-cn') ||
            languages.find(l => l.value === 'en-us') ||
            languages[0];

        result.defaultLanguage = targetLang.value as UupLanguage;

        // Navigate to Editions page
        if (targetLang.type === 'link') {
            // Find specific link to click
            // We need to re-find it in handle context
            await page.click(`a[href*="pack=${targetLang.value}"]`);
        } else if (targetLang.type === 'select') {
            // Use JS to set the value directly to avoid visibility timeouts on hidden select
            await page.evaluate((value) => {
                const select = document.querySelector('select[name="pack"]') as HTMLSelectElement;
                if (select) {
                    select.value = value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, targetLang.value);
            await page.click('#submitForm'); // Standard UUP Dump next button ID
        } else if (targetLang.type === 'hidden') {
            // Usually just a submit button
            await page.click('#submitForm');
        } else {
            // Fallback: try finding any submit button
            await page.click('button[type="submit"], input[type="submit"]');
        }

        await page.waitForLoadState('domcontentloaded');

        // --- STEP 2: Editions ---
        // Extract editions
        const editions = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[name="edition[]"]'));
            return inputs.map(input => {
                const labelEl = document.querySelector(`label[for="${input.id}"]`);
                const label = labelEl?.textContent?.trim() || input.parentElement?.textContent?.trim() || '';
                return {
                    label: label,
                    value: (input as HTMLInputElement).value
                };
            });
        });

        // Cast to unknown first to avoid TS issues since we trust the scraper logic meets strict types eventually
        result.editions = editions as unknown as { label: string, value: UupEdition }[];
        if (editions.length === 0) throw new Error('No editions found');

        // Select all editions to see full options
        await page.evaluate(() => {
            const inputs = document.querySelectorAll('input[name="edition[]"]');
            inputs.forEach(i => (i as HTMLInputElement).checked = true);
        });

        // Click Next
        // ID is usually edition-selection-confirm
        const nextLink = await page.$('#edition-selection-confirm');
        if (nextLink) {
            await nextLink.click();
        } else {
            // Fallback
            await page.click('button.primary.button');
        }

        await page.waitForLoadState('domcontentloaded');

        // --- STEP 3: Options ---
        // Now we should be on selectoptions.php
        result.url = page.url(); // Capture the actual URL of the options page

        const { options, downloadMethods } = await page.evaluate(() => {
            // Helper to clean labels (Take first line ONLY, robustly)
            const cleanLabel = (element: Element | null | undefined) => {
                if (!element) return '';
                // Use innerText to get rendered text, split by newline, take first part
                const text = (element as HTMLElement).innerText || element.textContent || '';
                return text.split(/\r?\n/)[0].trim();
            };

            // Extract Checkboxes (Conversion Options)
            const inputs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
            const opts = inputs.map(input => ({
                label: cleanLabel(document.querySelector(`label[for="${input.id}"]`) ||
                    input.closest('.checkbox')?.querySelector('label')),
                name: (input as HTMLInputElement).name
            })).filter(o => ['updates', 'cleanup', 'netfx', 'esd'].includes(o.name));

            // Extract Download Methods (Radio Buttons)
            const radios = Array.from(document.querySelectorAll('input[name="autodl"]'));
            const methods = radios.map(input => ({
                label: cleanLabel(document.querySelector(`label[for="${input.id}"]`) ||
                    input.closest('.field')?.querySelector('label') ||
                    input.parentElement),
                value: (input as HTMLInputElement).value
            }));

            return { options: opts, downloadMethods: methods };
        });

        result.options = options as unknown as { label: string, name: UupOption }[];
        result.downloadMethods = downloadMethods as unknown as { label: string, value: UupDownloadMethod }[];

        // --- STEP 4: Virtual Editions (if autodl=3 is available) ---
        if (downloadMethods.some(m => m.value === '3')) {
            console.log('Checking for Virtual Editions...');
            try {
                // Select "Download, add additional editions and convert to ISO" (autodl=3)
                // Use JS to click/check to avoid visibility issues
                await page.evaluate(() => {
                    const radio = document.querySelector('input[name="autodl"][value="3"]') as HTMLInputElement;
                    if (radio) {
                        radio.click();
                        radio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });

                // Wait for the virtual editions list to appear
                // It might take a moment to fetch/render
                await page.waitForSelector('input[name="virtualEditions[]"]', { timeout: 5000 });

                // Extract Virtual Editions
                const virtualEditions = await page.evaluate(() => {
                    const cleanLabel = (element: Element | null | undefined) => {
                        if (!element) return '';
                        const text = (element as HTMLElement).innerText || element.textContent || '';
                        return text.split(/\r?\n/)[0].trim();
                    };

                    const inputs = Array.from(document.querySelectorAll('input[name="virtualEditions[]"]'));
                    return inputs.map(input => ({
                        label: cleanLabel(document.querySelector(`label[for="${input.id}"]`) ||
                            input.parentElement),
                        value: (input as HTMLInputElement).value
                    }));
                });

                result.virtualEditions = virtualEditions as unknown as { label: string, value: UupVirtualEdition }[];

            } catch (e) {
                console.log('Virtual Editions not found or timed out (might not be applicable for this specific language/edition combo).');
            }
        }

    } catch (e: any) {
        console.error(`Error analyzing ${buildId}: ${e.message}`);
        result.error = e.message;
        // Keep last known URL
        result.url = page.url();
    }

    return result;
}

async function main() {
    const categoriesToAnalyze = ['w11-24h2.json', 'w10-22h2.json'];
    const fullResults: AnalysisResult[] = [];

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    for (const catFile of categoriesToAnalyze) {
        const filePath = path.join(OUTPUT_DIR, catFile);
        if (!fs.existsSync(filePath)) continue;

        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const versions = data.versions.slice(0, 5);

        const buildResults: BuildParams[] = [];

        console.log(`Analyzing category: ${catFile}`);
        for (const v of versions) {
            const res = await analyzeBuild(page, v.id, v.title);
            buildResults.push(res);
            await delay(500);
        }

        fullResults.push({
            category: data.category,
            builds: buildResults
        });
    }

    fs.writeFileSync(ANALYSIS_OUTPUT, JSON.stringify(fullResults, null, 2));
    console.log(`Analysis saved to ${ANALYSIS_OUTPUT}`);

    await browser.close();
}

main().catch(console.error);
