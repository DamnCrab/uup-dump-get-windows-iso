
import { rules } from './config/rules';
import { selectBuild } from './selector';

async function verify() {
    console.log('--- Verifying Build Rules ---');
    for (const rule of rules) {
        console.log(`\nTesting Rule: ${rule.name}`);
        try {
            const buildId = await selectBuild(rule);
            if (buildId) {
                console.log(`[SUCCESS] Matched Build ID: ${buildId.id}`);
                console.log(`Title: ${buildId.title}`);
                console.log(`Arch: ${buildId.arch}`);
            } else {
                console.log(`[WARNING] No build found for rule: ${rule.name}`);
            }
        } catch (error) {
            console.error(`[ERROR] Failed to select build for ${rule.name}:`, error);
        }
    }
}

verify().catch(console.error);
