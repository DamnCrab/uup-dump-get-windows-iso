
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

// Helper to wait with jitter to avoid detection / 随机等待以避免检测
const delay = (min: number, max: number) => {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
};

interface AnalysisResult {
    category: string;
    builds: BuildParams[];
}

async function analyzeBuild(page: Page, buildId: string, title: string): Promise<BuildParams> {
    const startUrl = `https://uupdump.net/selectlang.php?id=${buildId}`;

    try {
        console.log(`Analyzing ${buildId}... (Navigating / 正在导航)`);
        await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e: any) {
        console.error(`Navigation failed for ${buildId} / ${buildId} 导航失败: ${e.message}`);
        return {
            id: buildId,
            title,
            url: startUrl,
            languages: [],
            editions: [],
            options: [],
            error: `Navigation failed: ${e.message}`
        };
    }

    // Initial result structure / 初始结果结构
    const result: BuildParams = {
        id: buildId,
        title,
        url: startUrl,
        languages: [],
        editions: [],
        options: []
    };

    try {
        // --- STEP 1: Languages / 步骤 1: 语言 ---
        // Extract languages / 提取语言
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

        // --- STEP 2: Editions / 步骤 2: 版本 ---
        // Extract editions / 提取版本
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

        // Select all editions to see full options / 全选版本以查看完整选项
        await page.evaluate(() => {
            const inputs = document.querySelectorAll('input[name="edition[]"]');
            inputs.forEach(i => (i as HTMLInputElement).checked = true);
        });

        // Click Next / 点击下一步
        // ID is usually edition-selection-confirm
        const nextLink = await page.$('#edition-selection-confirm');
        if (nextLink) {
            await nextLink.click();
        } else {
            // Fallback
            await page.click('button.primary.button');
        }

        await page.waitForLoadState('domcontentloaded');

        // --- STEP 3: Options / 步骤 3: 选项 ---
        // Now we should be on selectoptions.php / 现在应该在 selectoptions.php
        result.url = page.url(); // Capture the actual URL of the options page / 捕获选项页面的实际 URL

        const { options, downloadMethods } = await page.evaluate(() => {
            // Helper to clean labels (Take first line ONLY, robustly)
            const cleanLabel = (element: Element | null | undefined) => {
                if (!element) return '';
                // Use innerText to get rendered text, split by newline, take first part
                const text = (element as HTMLElement).innerText || element.textContent || '';
                return text.split(/\r?\n/)[0].trim();
            };

            // Extract Checkboxes (Conversion Options) / 提取复选框（转换选项）
            const inputs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
            const opts = inputs.map(input => ({
                label: cleanLabel(document.querySelector(`label[for="${input.id}"]`) ||
                    input.closest('.checkbox')?.querySelector('label')),
                name: (input as HTMLInputElement).name
            })).filter(o => ['updates', 'cleanup', 'netfx', 'esd'].includes(o.name));

            // Extract Download Methods (Radio Buttons) / 提取下载方式（单选按钮）
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
        // --- 步骤 4: 虚拟版本 (如果 autodl=3 可用) ---
        if (downloadMethods.some(m => m.value === '3')) {
            console.log('Checking for Virtual Editions... / 检查虚拟版本...');
            try {
                // Select "Download, add additional editions and convert to ISO" (autodl=3)
                // 选择 "下载，添加附加版本并转换为 ISO" (autodl=3)
                // Use JS to click/check to avoid visibility issues / 使用 JS 点击/勾选以避免可见性问题
                await page.evaluate(() => {
                    const radio = document.querySelector('input[name="autodl"][value="3"]') as HTMLInputElement;
                    if (radio) {
                        radio.click();
                        radio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });

                // Wait for the virtual editions list to appear
                // 等待虚拟版本列表出现
                // It might take a moment to fetch/render
                await page.waitForSelector('input[name="virtualEditions[]"]', { timeout: 5000 });

                // Extract Virtual Editions / 提取虚拟版本
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
        // Keep last known URL / 保留最后已知的 URL
        result.url = page.url();
    }

    return result;
}

async function main() {
    console.log('--- Starting Incremental Analysis / 开始增量分析 ---');

    // 1. Load existing analysis / 加载现有分析
    let fullResults: AnalysisResult[] = [];
    if (fs.existsSync(ANALYSIS_OUTPUT)) {
        try {
            fullResults = JSON.parse(fs.readFileSync(ANALYSIS_OUTPUT, 'utf-8'));
            console.log(`Loaded existing analysis containing ${fullResults.length} categories.`);
        } catch (e) {
            console.error('Failed to load existing analysis, starting fresh. / 加载失败，开始新的分析。', e);
        }
    }

    // 2. Identify category files (exclude non-category files)
    // 识别分类文件（排除非分类文件）
    const files = fs.readdirSync(OUTPUT_DIR).filter(f =>
        f.endsWith('.json') &&
        f !== 'parameter_analysis.json' &&
        f !== 'uupdump-data.json'
    );

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    let newAnalysisCount = 0;

    for (const catFile of files) {
        const filePath = path.join(OUTPUT_DIR, catFile);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const categoryName = data.category; // e.g. "w11-24h2"

        console.log(`\nChecking category: ${categoryName} (${catFile})`);

        // Find or create category entry in results / 查找或创建结果中的分类条目
        let catResult = fullResults.find(r => r.category === categoryName);
        if (!catResult) {
            catResult = { category: categoryName, builds: [] };
            fullResults.push(catResult);
        }

        // Identify new builds / 识别新构建
        const existingIds = new Set(catResult.builds.map(b => b.id));
        const allVersions = data.versions || [];
        const newVersions = allVersions.filter((v: any) => !existingIds.has(v.id));

        if (newVersions.length === 0) {
            console.log(`  No new builds to analyze. / 没有新构建需要分析。`);
            continue;
        }

        console.log(`  Found ${newVersions.length} new builds. Starting analysis... / 发现 ${newVersions.length} 个新构建。开始分析...`);

        for (const v of newVersions) {
            try {
                // Rate Limiting: Delay before request (5s - 10s)
                // 速率限制：请求前延迟 (5s - 10s)
                const waitTime = Math.floor(Math.random() * 5000) + 5000;
                console.log(`  Waiting ${Math.round(waitTime / 1000)}s...`);
                await delay(5000, 10000);

                const res = await analyzeBuild(page, v.id, v.title);

                // Add to results / 添加到结果
                catResult!.builds.push(res);
                newAnalysisCount++;

                // Save incrementally so we don't lose progress / 增量保存以防丢失进度
                fs.writeFileSync(ANALYSIS_OUTPUT, JSON.stringify(fullResults, null, 2));
                console.log(`  [Saved] Analyzed: ${v.title}`);

            } catch (e) {
                console.error(`  Failed to analyze ${v.id}:`, e);
            }
        }
    }

    await browser.close();
    console.log(`\n--- Analysis Complete ---`);
    console.log(`Total new builds analyzed: ${newAnalysisCount}`);
}

main().catch(console.error);
