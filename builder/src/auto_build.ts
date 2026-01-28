import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { rules } from './config/rules';
import { selectBuild, ScrapedVersion } from './selector';
import { buildIso } from './iso_builder';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_FILE = path.join(__dirname, '../build_state.json');

interface BuildState {
    [ruleName: string]: {
        lastBuildId: string;
        lastBuildDate: string;
        status: 'success' | 'failed';
    };
}

interface SummaryEntry {
    rule: string;
    buildId: string;
    title: string;
    arch: string;
    isoName: string;
    duration: string;
    status: string;
    details: string;
    // Config details
    language: string;
    editions: string;
    virtualEditions: string;
    options: string;
}

async function loadState(): Promise<BuildState> {
    if (await fs.pathExists(STATE_FILE)) {
        return fs.readJson(STATE_FILE);
    }
    return {};
}

async function saveState(state: BuildState) {
    await fs.writeJson(STATE_FILE, state, { spaces: 2 });
}

function formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
}

import { Command } from 'commander';

const program = new Command();

program
    .option('--rule <name>', 'Run a specific rule by name')
    .option('--list-rules', 'List all rule names as JSON for GitHub Actions matrix');

program.parse(process.argv);
const options = program.opts();

async function main() {

    // Handle --list-rules
    if (options['listRules']) {
        const ruleNames = rules.map(r => r.name);
        console.log(JSON.stringify(ruleNames));
        return;
    }

    console.log('--- Starting Automated Build Process / 开始自动化构建流程 ---');

    const state = await loadState();
    let hasWork = false;

    const summary: SummaryEntry[] = [];

    // Filter rules if --rule is specified
    const ruleName = options['rule'] as string | undefined;
    const activeRules = ruleName
        ? rules.filter(r => r.name === ruleName)
        : rules;

    if (ruleName && activeRules.length === 0) {
        console.error(`Error: Rule "${ruleName}" not found.`);
        process.exit(1);
    }

    for (const rule of activeRules) {
        console.log(`\nProcessing Rule: ${rule.name}`);
        const startTime = Date.now();

        // Prepare config strings for summary
        const configDetails = {
            language: rule.language,
            editions: rule.editions.join(', '),
            virtualEditions: rule.virtualEditions ? rule.virtualEditions.join(', ') : '-',
            options: rule.options ? rule.options.join(', ') : '-'
        };

        try {
            const build = await selectBuild(rule);

            // If no build found / 如果未找到构建
            if (!build) {
                console.log(`Skipping rule ${rule.name}: No available build found.`);
                summary.push({
                    rule: rule.name,
                    buildId: 'N/A',
                    title: 'N/A',
                    arch: rule.arch,
                    isoName: '-',
                    duration: '0s',
                    status: '⏭️ Skipped',
                    details: 'No matching build found',
                    ...configDetails
                });
                continue;
            }

            const lastState = state[rule.name];

            // Check if we already built this ID successfully / 检查是否已成功构建此 ID
            if (lastState && lastState.lastBuildId === build.id && lastState.status === 'success') {
                console.log(`Skipping rule ${rule.name}: Build ${build.id} already completed successfully on ${lastState.lastBuildDate}.`);
                summary.push({
                    rule: rule.name,
                    buildId: build.id,
                    title: build.title,
                    arch: build.arch,
                    isoName: '-',
                    duration: '0s',
                    status: '✅ Up-to-date',
                    details: `Built on ${new Date(lastState.lastBuildDate).toLocaleDateString()}`,
                    ...configDetails
                });
                continue;
            }

            console.log(`New build detected for ${rule.name} (New: ${build.id}, Old: ${lastState?.lastBuildId || 'None'})`);
            hasWork = true;

            // Execute Build / 执行构建
            const isoName = await buildIso(build.id, rule);
            const duration = formatDuration(Date.now() - startTime);

            // Update State on Success / 成功后更新状态
            // NOTE: In parallel mode, this state file might face race conditions if we were writing to the SAME file.
            // However, since we are likely running in separate containers/runners, they won't share the local file system.
            // But if we want to persist state, we need to commit it back.
            // For now, let's assume valid flow.
            state[rule.name] = {
                lastBuildId: build.id,
                lastBuildDate: new Date().toISOString(),
                status: 'success'
            };
            await saveState(state);

            console.log(`[SUCCESS] Rule ${rule.name} completed.`);
            summary.push({
                rule: rule.name,
                buildId: build.id,
                title: build.title,
                arch: build.arch,
                isoName: isoName,
                duration: duration,
                status: '🎉 Success',
                details: 'New ISO built',
                ...configDetails
            });

        } catch (error: any) {
            console.error(`[FAILURE] Rule ${rule.name} failed:`, error);
            const duration = formatDuration(Date.now() - startTime);
            summary.push({
                rule: rule.name,
                buildId: 'Unknown',
                title: 'Error',
                arch: rule.arch,
                isoName: '-',
                duration: duration,
                status: '❌ Failed',
                details: error.message,
                ...configDetails
            });
        }
    }

    if (!hasWork) {
        console.log('\nNo new builds needed.');
    }
    console.log('\n--- Automation Complete ---');

    // Generate GitHub Summary / 生成 GitHub 摘要
    if (process.env['GITHUB_STEP_SUMMARY']) {
        const summaryTable = [
            '### 🏗️ Build Summary / 构建摘要',
            '| Rule / 规则 | Configuration / 配置 | Build Info / 构建信息 | Result / 结果 | Status / 状态 |',
            '|---|---|---|---|---|',
            ...summary.map(s => {
                const config = [
                    `**Lang:** \`${s.language}\``,
                    `**Arch:** \`${s.arch}\``,
                    `**Editions:** ${s.editions}`,
                    `**Virtual:** ${s.virtualEditions}`,
                    `**Opt:** ${s.options}`
                ].join('<br/>');

                // Fallback for N/A title
                const displayTitle = s.title !== 'N/A' ? s.title : 'No Build Found';
                const displayId = s.buildId !== 'N/A' ? `\`${s.buildId}\`` : '';

                const buildInfo = s.buildId !== 'N/A'
                    ? `**${displayTitle}**<br/>ID: ${displayId}`
                    : '-';

                const result = s.isoName !== '-'
                    ? `\`${s.isoName}\`<br/>⏰ ${s.duration}`
                    : '-';

                return `| **${s.rule}** | ${config} | ${buildInfo} | ${result} | ${s.status}<br/>${s.details} |`;
            })
        ].join('\n');

        await fs.appendFile(process.env['GITHUB_STEP_SUMMARY'], summaryTable + '\n\n');
    }
}

main().catch(console.error);
