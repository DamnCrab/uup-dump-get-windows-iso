import fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { rules } from './config/rules';
import { selectBuild } from './selector';
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

async function loadState(): Promise<BuildState> {
    if (await fs.pathExists(STATE_FILE)) {
        return fs.readJson(STATE_FILE);
    }
    return {};
}

async function saveState(state: BuildState) {
    await fs.writeJson(STATE_FILE, state, { spaces: 2 });
}

async function main() {
    console.log('--- Starting Automated Build Process ---');

    const state = await loadState();
    let hasWork = false;

    const summary: Array<{ rule: string, buildId: string, status: string, details: string }> = [];

    for (const rule of rules) {
        console.log(`\nProcessing Rule: ${rule.name}`);

        try {
            const buildId = await selectBuild(rule);

            // If no build found / 如果未找到构建
            if (!buildId) {
                console.log(`Skipping rule ${rule.name}: No available build found.`);
                summary.push({ rule: rule.name, buildId: 'N/A', status: '⏭️ Skipped', details: 'No build found' });
                continue;
            }

            const lastState = state[rule.name];

            // Check if we already built this ID successfully / 检查是否已成功构建此 ID
            if (lastState && lastState.lastBuildId === buildId && lastState.status === 'success') {
                console.log(`Skipping rule ${rule.name}: Build ${buildId} already completed successfully on ${lastState.lastBuildDate}.`);
                summary.push({ rule: rule.name, buildId: buildId, status: '✅ Up-to-date', details: `Built on ${lastState.lastBuildDate}` });
                continue;
            }

            console.log(`New build detected for ${rule.name} (New: ${buildId}, Old: ${lastState?.lastBuildId || 'None'})`);
            hasWork = true;

            // Execute Build / 执行构建
            await buildIso(buildId, rule);

            // Update State on Success / 成功后更新状态
            state[rule.name] = {
                lastBuildId: buildId,
                lastBuildDate: new Date().toISOString(),
                status: 'success'
            };
            await saveState(state);

            console.log(`[SUCCESS] Rule ${rule.name} completed.`);
            summary.push({ rule: rule.name, buildId: buildId, status: '🎉 Success', details: 'New ISO built' });

        } catch (error: any) {
            console.error(`[FAILURE] Rule ${rule.name} failed:`, error);
            summary.push({ rule: rule.name, buildId: 'Unknown', status: '❌ Failed', details: error.message });
        }
    }

    if (!hasWork) {
        console.log('\nNo new builds needed.');
    }
    console.log('\n--- Automation Complete ---');

    // Generate GitHub Summary / 生成 GitHub 摘要
    if (process.env.GITHUB_STEP_SUMMARY) {
        const summaryTable = [
            '### 🏗️ Build Summary / 构建摘要',
            '| Rule / 规则 | Build ID | Status / 状态 | Details / 详情 |',
            '|---|---|---|---|',
            ...summary.map(s => `| ${s.rule} | \`${s.buildId}\` | ${s.status} | ${s.details} |`)
        ].join('\n');

        await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summaryTable + '\n\n');
    }
}

main().catch(console.error);
