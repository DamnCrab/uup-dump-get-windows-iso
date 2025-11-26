import {chromium, Page} from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import {
    ChannelLink,
    ChannelData,
    VersionEntry,
    VersionType,
    KnowledgeBase,
    VersionParameters,
    AutodlValue,
    TypesSummary,
    SummaryItem,
} from './types';

const HOMEPAGE = 'https://uupdump.net/';
// 固定输出到项目的 playwright/output 目录，避免受当前工作目录影响
const OUTPUT_DIR = path.resolve(__dirname, '..', 'output');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'uupdump-data.json');
const OUTPUT_TYPES_SUMMARY_JSON = path.join(OUTPUT_DIR, 'uupdump-types-summary.json');

// 固定种子渠道（确保常见渠道被纳入抓取范围）
const SEED_CATEGORIES: ChannelLink[] = [
    {category: 'canary', url: 'https://uupdump.net/known.php?q=category:canary', source: 'seed'},
    {category: 'w11-25h2', url: 'https://uupdump.net/known.php?q=category:w11-25h2', source: 'seed'},
    {category: 'w11-22h2', url: 'https://uupdump.net/known.php?q=category:w11-22h2', source: 'seed'},
];

async function ensureOutputDir() {
    fs.mkdirSync(OUTPUT_DIR, {recursive: true});
}

function uniqBy<T>(arr: T[], key: (t: T) => string): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of arr) {
        const k = key(item);
        if (!seen.has(k)) {
            seen.add(k);
            out.push(item);
        }
    }
    return out;
}

// 标题分类算法：根据关键字匹配归类版本类型
function classifyTitle(title: string): VersionType {
    const t = title.toLowerCase();
    if (t.includes('insider preview')) return 'Windows 11 Insider Preview';
    if (t.includes('cumulative update preview for windows 11')) return 'Cumulative Update Preview for Windows 11';
    if (t.includes('cumulative update for windows 11')) return 'Cumulative Update for Windows 11';
    if (t.includes('feature update to windows 10')) return 'Feature update to Windows 10';
    if (t.includes('windows server')) return 'Windows Server';
    if (t.includes('windows 11')) return 'Windows 11';
    if (t.includes('windows 10')) return 'Windows 10';
    return 'Other';
}

// 从首页发现渠道并与固定种子合并，按 URL 去重
async function discoverChannelsFromHomepage(page: Page): Promise<ChannelLink[]> {
    await page.goto(HOMEPAGE, {waitUntil: 'load', timeout: 30000});
    const links: ChannelLink[] = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="known.php?q=category:"]')) as HTMLAnchorElement[];
        return anchors.map(a => ({
            category: (new URL(a.href)).searchParams.get('q')?.replace('category:', '') || 'unknown',
            url: a.href,
            source: 'homepage' as const,
        }));
    });
    return uniqBy([...links, ...SEED_CATEGORIES], l => l.url);
}

// 解析 known.php 渠道列表页中的表格条目
async function parseKnownPageItems(page: Page): Promise<VersionEntry[]> {
    const rows: VersionEntry[] = await page.evaluate(() => {
        const table = Array.from(document.querySelectorAll('table')).find(t => {
            const header = t.previousElementSibling?.textContent?.toLowerCase() || '';
            return header.includes('浏览已知内部版本') || header.includes('known builds') || header.includes('根据你的查询');
        });
        const out: VersionEntry[] = [] as any;
        if (!table) {
            // 兜底：扫描页面中所有 selectlang 链接
            const links = Array.from(document.querySelectorAll('a[href*="selectlang.php?id="]')) as HTMLAnchorElement[];
            for (const a of links) {
                const title = a.textContent?.trim() || '';
                const href = a.href;
                const tr = a.closest('tr');
                const tds = tr ? Array.from(tr.querySelectorAll('td')) : [];
                const archText = tds[1]?.textContent?.trim();
                const addedAt = tds[2]?.textContent?.trim();
                out.push({title, href, arch: (archText as any) || undefined, addedAt, type: 'Other'});
            }
            return out;
        }
        const rows = Array.from(table.querySelectorAll('tr')).slice(1);
        for (const tr of rows) {
            const linkEl = tr.querySelector('a[href*="selectlang.php?id="]') as HTMLAnchorElement | null;
            if (!linkEl) continue;
            const title = linkEl.textContent?.trim() || '';
            const href = linkEl.href;
            const cells = Array.from(tr.querySelectorAll('td'));
            const archText = cells[1]?.textContent?.trim();
            const addedAt = cells[2]?.textContent?.trim();
            out.push({title, href, arch: (archText as any) || undefined, addedAt, type: 'Other'});
        }
        return out;
    });
    // Classify types
    return rows.map(r => ({...r, type: classifyTitle(r.title)}));
}

function getIdFromSelectLangUrl(url: string): string | undefined {
    try {
        const u = new URL(url);
        return u.searchParams.get('id') || undefined;
    } catch {
        return undefined;
    }
}

// 抓取指定渠道的前两页数据并聚合类型计数
async function scrapeChannel(page: Page, link: ChannelLink, pagesToScrape = 2): Promise<ChannelData> {
    const versions: VersionEntry[] = [];
    for (let p = 1; p <= pagesToScrape; p++) {
        const url = link.url + (link.url.includes('?') ? `&page=${p}` : `?page=${p}`);
        await page.goto(url, {waitUntil: 'load', timeout: 30000});
        const pageItems = await parseKnownPageItems(page);
        for (const it of pageItems) {
            it.id = getIdFromSelectLangUrl(it.href);
            versions.push(it);
        }
    }
    // Aggregate type counts
    const typeCounts: Record<VersionType, number> = {
        'Windows 11': 0, 'Windows 10': 0, 'Windows Server': 0,
        'Windows 11 Insider Preview': 0,
        'Cumulative Update for Windows 11': 0,
        'Cumulative Update Preview for Windows 11': 0,
        'Feature update to Windows 10': 0,
        'Other': 0,
    };
    for (const v of versions) typeCounts[v.type] = (typeCounts[v.type] || 0) + 1;
    return {
        category: link.category,
        url: link.url,
        pages: pagesToScrape,
        versions,
        parametersByVersionId: {},
        versionTypeCounts: typeCounts,
    };
}

async function selectLanguage(page: Page): Promise<string | undefined> {
    const lang = await page.evaluate(() => {
        const sel = document.querySelector('select[name="pack"]') as HTMLSelectElement | null;
        if (!sel) return undefined;
        const opts = Array.from(sel.options).map(o => o.value);
        const preferred = opts.includes('en-us') ? 'en-us' : (opts.includes('zh-cn') ? 'zh-cn' : opts[0]);
        sel.value = preferred;
        sel.dispatchEvent(new Event('change', {bubbles: true}));
        const btn = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement | null;
        btn?.click();
        return preferred;
    });
    await page.waitForLoadState('load', {timeout: 15000}).catch(() => {
    });
    return lang;
}

async function selectEdition(page: Page): Promise<string | undefined> {
    const picked = await page.evaluate(() => {
        const boxes = Array.from(document.querySelectorAll('input[type="checkbox"][name="edition[]"]')) as HTMLInputElement[];
        let target = boxes.find(b => (b.value || '').toUpperCase().includes('PROFESSIONAL')) || boxes[0];
        if (!target) return undefined;
        target.checked = true;
        target.dispatchEvent(new Event('change', {bubbles: true}));
        const btn = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement | null;
        btn?.click();
        return target.value;
    });
    await page.waitForLoadState('load', {timeout: 15000}).catch(() => {
    });
    return picked;
}

function parseQueryFromAction(action: string): { id?: string; pack?: string; edition?: string[] } {
    try {
        const rel = action.startsWith('http') ? action : `https://uupdump.net/${action}`;
        const u = new URL(rel);
        const id = u.searchParams.get('id') || undefined;
        const pack = u.searchParams.get('pack') || undefined;
        const editionRaw = u.searchParams.get('edition') || undefined;
        const edition = editionRaw ? editionRaw.split(';').map(s => s.trim()).filter(Boolean) : undefined;
        return {id, pack, edition};
    } catch {
        return {};
    }
}

// 进入语言选择与版本选择流程，最终解析下载选项页的表单参数
async function probeDownloadParameters(page: Page, selectLangUrl: string): Promise<VersionParameters | { error: string }> {
    try {
        await page.goto(selectLangUrl, {waitUntil: 'load', timeout: 30000});
        const pack = await selectLanguage(page);
        if (!pack) return {error: 'language select not found'};
        const pickedEdition = await selectEdition(page);
        if (!pickedEdition) return {error: 'edition checkbox not found'};
        // On options page
        const formSnapshot = await page.evaluate(() => {
            const form = document.querySelector('form[action*="get.php"], form[action*="download.php"], form');
            if (!form) return null;
            const action = form.getAttribute('action') || '';
            const method = (form.getAttribute('method') || 'GET').toUpperCase();
            const autodlRadios = Array.from(form.querySelectorAll('input[type="radio"][name="autodl"]')) as HTMLInputElement[];
            const autodlValues = autodlRadios.map(r => ({value: r.value, checked: r.checked}));
            const checkboxes = Array.from(form.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
            const options = checkboxes.map(c => ({name: c.name, value: c.value || '1', checked: c.checked, disabled: c.disabled}));
            const virtuals = options.filter(o => o.name === 'virtualEditions[]');
            const opts = options.filter(o => ['updates', 'cleanup', 'netfx', 'esd'].includes(o.name));
            return {action, method, autodlValues, opts, virtuals};
        });
        if (!formSnapshot) return {error: 'download options form not found'};
        type AutodlItem = { value: string; checked: boolean };
        type OptItem = { name: string; value: string; checked: boolean; disabled: boolean };
        const {action, method, autodlValues, opts, virtuals} = formSnapshot as {
            action: string;
            method: string;
            autodlValues: AutodlItem[];
            opts: OptItem[];
            virtuals: OptItem[];
        };
        const {id, edition} = parseQueryFromAction(action);
        if (!id || !edition) return {error: 'missing id or edition in action query'};
        const autodlDefaults = autodlValues
            .filter((v: AutodlItem) => v.checked)
            .map((v: AutodlItem) => v.value as AutodlValue);
        const autodlDefault = autodlDefaults[0] || '2';
        const optional = {
            autodl: {values: autodlValues.map((v: AutodlItem) => v.value) as AutodlValue[], default: autodlDefault},
            updates: !!opts.find((o: OptItem) => o.name === 'updates')?.checked,
            cleanup: !!opts.find((o: OptItem) => o.name === 'cleanup')?.checked,
            netfx: !!opts.find((o: OptItem) => o.name === 'netfx')?.checked,
            esd: !!opts.find((o: OptItem) => o.name === 'esd')?.checked,
            virtualEditions: virtuals.map((v: OptItem) => v.value),
        };
        return {
            required: {id, pack: pack!, edition},
            optional,
            method: method === 'POST' ? 'POST' : 'GET',
            formAction: action,
        };
    } catch (e: any) {
        return {error: `probe failed: ${e?.message || String(e)}`};
    }
}

// 构建类型分类汇总（聚合所有渠道前两页的条目，按 VersionType 分组）
function buildTypesSummary(channels: ChannelData[]): TypesSummary {
    const types: VersionType[] = [
        'Windows 11', 'Windows 10', 'Windows Server', 'Windows 11 Insider Preview',
        'Cumulative Update for Windows 11', 'Cumulative Update Preview for Windows 11',
        'Feature update to Windows 10', 'Other'];
    const countsByType = Object.fromEntries(types.map(t => [t, 0])) as Record<VersionType, number>;
    const itemsByType = Object.fromEntries(types.map(t => [t, [] as SummaryItem[]])) as Record<VersionType, SummaryItem[]>;
    for (const ch of channels) {
        for (const v of ch.versions) {
            countsByType[v.type] += 1;
            itemsByType[v.type].push({
                channel: ch.category,
                id: v.id,
                title: v.title,
                href: v.href,
                arch: v.arch,
                addedAt: v.addedAt,
            });
        }
    }
    return {
        summaryAt: new Date().toISOString(),
        countsByType,
        itemsByType,
    };
}

async function main() {
    await ensureOutputDir();
    const browser = await chromium.launch({headless: true});
    const page = await browser.newPage();
    const channels = await discoverChannelsFromHomepage(page);
    const channelDatas: ChannelData[] = [];
    for (const ch of channels) {
        const data = await scrapeChannel(page, ch, 2);
        // Probe parameters for each version (best-effort, limit to first 8 per channel to avoid rate limits)
        const toProbe = data.versions.slice(0, 8);
        for (const v of toProbe) {
            const params = await probeDownloadParameters(page, v.href);
            if (v.id) data.parametersByVersionId[v.id] = params;
        }
        channelDatas.push(data);
    }
    const kb: KnowledgeBase = {
        scrapedAt: new Date().toISOString(),
        channels: channelDatas,
    };
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(kb, null, 2), 'utf-8');
    // 生成分类汇总 JSON（将各渠道前两页版本聚合后输出）
    const typesSummary = buildTypesSummary(channelDatas);
    fs.writeFileSync(OUTPUT_TYPES_SUMMARY_JSON, JSON.stringify(typesSummary, null, 2), 'utf-8');
    await browser.close();
    console.log(`Saved ${OUTPUT_JSON}`);
    console.log(`Saved ${OUTPUT_TYPES_SUMMARY_JSON}`);
}

if (require.main === module) {
    main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}