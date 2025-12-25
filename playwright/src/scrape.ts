import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import {
    ChannelLink,
    ChannelData,
    VersionEntry,
    KnowledgeBase,
} from './types';

// ==========================================
// 1. 配置常量
// ==========================================

const HOMEPAGE = 'https://uupdump.net/';
// 输出目录：项目根目录下的 output 文件夹
const OUTPUT_DIR = path.resolve(__dirname, '..', 'output');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'uupdump-data.json');

// 浏览器配置：使用固定的 User-Agent 和 Header 以规避简单的反爬虫检查 (Cloudflare)
const BROWSER_CONFIG = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"'
    }
};

// ==========================================
// 2. 工具函数
// ==========================================

/**
 * 确保输出目录存在，如果不存在则创建
 */
async function ensureOutputDir() {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 从 selectlang.php 的 url 中提取 id 参数
 * @param url 完整的 URL 字符串
 * @returns 提取出的 id，如果失败返回 undefined
 */
function getIdFromSelectLangUrl(url: string): string | undefined {
    try {
        const u = new URL(url);
        return u.searchParams.get('id') || undefined;
    } catch {
        return undefined;
    }
}

/**
 * 将层级结构的渠道列表展平，方便后续遍历抓取
 * @param hierarchy 从首页抓取到的层级数据
 * @returns 展平后的渠道列表，包含父级名称
 */
function flattenChannels(hierarchy: ChannelLink[]): { link: ChannelLink, parentName?: string }[] {
    const flat: { link: ChannelLink, parentName?: string }[] = [];

    for (const item of hierarchy) {
        if (item.isDropdown && item.subLinks) {
            // 如果是下拉菜单，遍历子链接
            for (const sub of item.subLinks) {
                if (sub.url) {
                    flat.push({ link: sub, parentName: item.name });
                }
            }
        } else if (item.url) {
            // 如果是直接链接
            flat.push({ link: item });
        }
    }
    return flat;
}

// ==========================================
// 3. 核心抓取逻辑
// ==========================================

/**
 * 抓取首页 (.quick-search-buttons) 的渠道层级结构
 * @param page Playwright Page 对象
 */
async function scrapeHomepageHierarchy(page: Page): Promise<ChannelLink[]> {
    console.log('正在访问首页抓取分类目录...');
    await page.goto(HOMEPAGE, { waitUntil: 'load', timeout: 30000 });

    // 等待搜索按钮区域加载
    await page.waitForSelector('.quick-search-buttons');

    const hierarchy = await page.evaluate(() => {
        const container = document.querySelector('.quick-search-buttons');
        if (!container) return [];

        const results: any[] = [];
        // 每个分组包裹在 .ui.tiny.compact.menu 中
        const menus = Array.from(container.querySelectorAll('.ui.tiny.compact.menu'));

        for (const menu of menus) {
            const item = menu.querySelector('.item') as HTMLElement;
            if (!item) continue;

            const name = item.innerText.split('\n')[0].trim();
            const isDropdown = item.classList.contains('dropdown');
            const link = item.tagName === 'A' ? (item as HTMLAnchorElement).href : undefined;

            if (isDropdown) {
                // 处理下拉菜单类型的分类 (如 Windows 11)
                const subLinks: any[] = [];
                const menuItems = Array.from(item.querySelectorAll('.menu a.item'));

                for (const subItem of menuItems) {
                    const subName = (subItem as HTMLElement).innerText.trim();
                    const subUrl = (subItem as HTMLAnchorElement).href;

                    // 尝试从 URL 中提取 category (兼容性逻辑)
                    let category = undefined;
                    try {
                        const urlObj = new URL(subUrl);
                        category = urlObj.searchParams.get('q')?.replace('category:', '');
                    } catch (e) { }

                    subLinks.push({
                        name: subName,
                        url: subUrl,
                        isDropdown: false,
                        category: category,
                        source: 'dynamic'
                    });
                }

                results.push({
                    name: name,
                    isDropdown: true,
                    subLinks: subLinks,
                    source: 'dynamic'
                });
            } else {
                // 处理直接链接类型的分类
                let category = undefined;
                try {
                    if (link) {
                        const urlObj = new URL(link);
                        category = urlObj.searchParams.get('q')?.replace('category:', '');
                    }
                } catch (e) { }

                results.push({
                    name: name,
                    url: link,
                    isDropdown: false,
                    category: category,
                    source: 'dynamic'
                });
            }
        }
        return results;
    });

    return hierarchy;
}

/**
 * 解析列表页 (known.php) 中的表格数据
 * @param page Playwright Page 对象
 */
async function parseKnownPageItems(page: Page): Promise<VersionEntry[]> {
    // 检查是否存在分页组件，以此判断是否为有效的列表页
    const hasPagination = await page.$('.pagination, .ui.pagination.menu');

    const rows: VersionEntry[] = await page.evaluate(() => {
        // 尝试定位表格
        let table = document.querySelector('table');
        // 后备选择器
        if (!table) table = document.querySelector('.ui.table');

        const out: VersionEntry[] = [] as any;

        if (!table) return out;

        // 遍历 tbody 下的每一行
        const rows = Array.from(table.querySelectorAll('tbody tr'));

        for (const tr of rows) {
            // 查找详情链接 (a 标签)
            const linkEl = tr.querySelector('a[href*="selectlang.php?id="]') as HTMLAnchorElement | null;
            if (!linkEl) continue;

            const title = linkEl.textContent?.trim() || '';
            const href = linkEl.href;

            // 提取架构和添加日期 (通常在第2、3列)
            const cells = Array.from(tr.querySelectorAll('td'));
            const archText = cells[1]?.textContent?.trim();
            const addedAt = cells[2]?.textContent?.trim();

            out.push({ title, href, arch: (archText as any) || undefined, addedAt });
        }
        return out;
    });
    return rows;
}

/**
 * 抓取指定渠道的所有分页数据
 * @param page Playwright Page 对象
 * @param url 渠道入口 URL (第1页)
 * @param category 分类标识，用作文件名
 * @param name 渠道显示名称
 * @param parentName 父级分类名称 (可选)
 */
async function scrapeChannel(page: Page, url: string, category: string, name: string, parentName?: string): Promise<ChannelData> {
    const versions: VersionEntry[] = [];

    console.log(`开始抓取渠道: ${name} (分类: ${category})`);

    try {
        // ------------------------------------
        // 第一步：抓取第 1 页
        // ------------------------------------
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });

        // 解析第 1 页的数据
        const page1Items = await parseKnownPageItems(page);
        for (const it of page1Items) {
            it.id = getIdFromSelectLangUrl(it.href);
            versions.push(it);
        }

        // ------------------------------------
        // 第二步：确定总页数
        // ------------------------------------
        const totalPages = await page.evaluate(() => {
            const pagination = document.querySelector('.pagination, .ui.pagination.menu');
            if (!pagination) return 1;

            // 提取所有数字页码链接
            const links = Array.from(pagination.querySelectorAll('a.item'));
            const nums = links
                .map(a => parseInt(a.textContent?.trim() || ''))
                .filter(n => !isNaN(n));

            // 如果没有找到数字，说明只有1页
            if (nums.length === 0) return 1;
            return Math.max(...nums);
        });

        console.log(`渠道 ${name}: 共发现 ${totalPages} 页`);

        // ------------------------------------
        // 第三步：遍历剩余页码
        // ------------------------------------
        if (totalPages > 1) {
            for (let p = 2; p <= totalPages; p++) {
                // 构造分页 URL，注意使用 'p' 参数
                const separator = url.includes('?') ? '&' : '?';
                const pageUrl = `${url}${separator}p=${p}`;

                try {
                    await page.goto(pageUrl, { waitUntil: 'load', timeout: 30000 });
                    const pItems = await parseKnownPageItems(page);

                    if (pItems.length === 0 && p <= totalPages) {
                        console.warn(`警告: 第 ${p} 页未返回数据，但预期共有 ${totalPages} 页。`);
                    }

                    for (const it of pItems) {
                        it.id = getIdFromSelectLangUrl(it.href);
                        versions.push(it);
                    }
                } catch (e) {
                    console.error(`抓取 ${name} 第 ${p} 页时出错:`, e);
                }
            }
        }

    } catch (e) {
        console.error(`抓取渠道 ${name} 时发生致命错误:`, e);
    }

    console.log(`完成 ${name} 抓取。共获取 ${versions.length} 条数据。`);

    return {
        category: category,
        url: url,
        name: name,
        parentName: parentName,
        pages: versions.length > 0 ? Math.ceil(versions.length / 50) : 0, // 估算页数
        versions,
    };
}

// ==========================================
// 4. 主程序入口
// ==========================================

async function main() {
    await ensureOutputDir();

    // 启动浏览器
    // 使用 headless: false (有头模式) 可显著减少被 Cloudflare 拦截的概率
    // 配合真实的 User-Agent 和 Headers 模拟真实用户行为
    const browser = await chromium.launch({ headless: false });

    // 创建上下文，注入 Header
    const context = await browser.newContext(BROWSER_CONFIG);
    const page = await context.newPage();

    console.log('--- 步骤 1: 扫描首页结构 ---');
    const hierarchy = await scrapeHomepageHierarchy(page);
    console.log(`扫描完成，发现 ${hierarchy.length} 个顶级分类。`);

    // 展平层级，生成待抓取任务列表
    const channelsToScrape = flattenChannels(hierarchy);
    console.log(`共生成 ${channelsToScrape.length} 个待抓取渠道任务。`);

    // 保存层级结构元数据
    const kb: KnowledgeBase = {
        scrapedAt: new Date().toISOString(),
        hierarchy: hierarchy,
    };
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(kb, null, 2), 'utf-8');
    console.log(`已保存分类结构至: ${OUTPUT_JSON}`);

    console.log('--- 步骤 2: 开始逐个抓取渠道 ---');

    // 遍历所有渠道进行抓取并保存为独立文件
    for (const { link, parentName } of channelsToScrape) {
        if (!link.url) continue;

        // 简单的重试机制
        let attempts = 0;
        let success = false;

        while (attempts < 3 && !success) {
            try {
                // 使用 category 作为文件名，如果没有则通过名称生成一个安全的文件名
                const safeCategory = link.category || link.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const filename = `${safeCategory}.json`;
                const filePath = path.join(OUTPUT_DIR, filename);

                const data = await scrapeChannel(page, link.url, safeCategory, link.name, parentName);

                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                console.log(`[成功] 已保存: ${filename}`);
                success = true;
            } catch (e) {
                console.error(`[失败] 抓取 ${link.name} 失败 (第 ${attempts + 1} 次尝试):`, e);
                attempts++;
            }
        }
    }

    await browser.close();
    console.log('--- 全部任务完成 ---');
}

if (require.main === module) {
    main().catch(err => {
        console.error('未捕获的异常:', err);
        process.exit(1);
    });
}