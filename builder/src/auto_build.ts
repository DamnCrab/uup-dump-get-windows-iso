import * as fs from 'fs-extra';
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

    for (const rule of rules) {
        console.log(`\nProcessing Rule: ${rule.name}`);

        try {
            const buildId = await selectBuild(rule);

            if (!buildId) {
                console.log(`Skipping rule ${rule.name}: No available build found.`);
                continue;
            }

            const lastState = state[rule.name];

            // Check if we already built this ID successfully
            if (lastState && lastState.lastBuildId === buildId && lastState.status === 'success') {
                console.log(`Skipping rule ${rule.name}: Build ${buildId} already completed successfully on ${lastState.lastBuildDate}.`);
                continue;
            }

            console.log(`New build detected for ${rule.name} (New: ${buildId}, Old: ${lastState?.lastBuildId || 'None'})`);
            hasWork = true;

            // Execute Build
            await buildIso(buildId, rule);

            // Update State on Success
            state[rule.name] = {
                lastBuildId: buildId,
                lastBuildDate: new Date().toISOString(),
                status: 'success'
            };
            await saveState(state);

            console.log(`[SUCCESS] Rule ${rule.name} completed.`);

        } catch (error) {
            console.error(`[FAILURE] Rule ${rule.name} failed:`, error);
            // Optionally record failure in state so we can retry or not loop forever?
            // For now, we don't update state, so it will retry next time.
        }
    }

    if (!hasWork) {
        console.log('\nNo new builds needed.');
    }
    console.log('\n--- Automation Complete ---');
}

main().catch(console.error);
