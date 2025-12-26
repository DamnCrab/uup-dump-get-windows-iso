import * as fs from 'fs-extra';
import * as path from 'path';
import { BuildRule } from './types';
import { fileURLToPath } from 'url';

// Fix for ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../playwright/output');

interface ScrapedVersion {
    title: string;
    href: string;
    arch: string;
    addedAt: string;
    id: string;
}

interface ScrapedCategory {
    versions: ScrapedVersion[];
}

export async function selectBuild(rule: BuildRule): Promise<string | null> {
    const jsonPath = path.join(DATA_DIR, `${rule.category}.json`);

    if (!await fs.pathExists(jsonPath)) {
        console.error(`Category file not found: ${jsonPath}`);
        return null;
    }

    try {
        const data: ScrapedCategory = await fs.readJson(jsonPath);

        // Filter versions
        const matches = data.versions.filter(v => {
            const archMatch = v.arch.toLowerCase() === rule.arch.toLowerCase();
            const titleMatch = rule.titlePattern.test(v.title);
            return archMatch && titleMatch;
        });

        if (matches.length === 0) {
            console.log(`No matches found for rule: ${rule.name}`);
            return null;
        }

        // Sort by addedAt (descending)
        // Format: "2025-12-09 19:01:31 UTC"
        matches.sort((a, b) => {
            return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        });

        const latest = matches[0];
        if (!latest) return null;

        console.log(`[${rule.name}] Selected Build: ${latest.title} (${latest.id}) - ${latest.addedAt}`);

        return latest.id;

    } catch (error) {
        console.error(`Error selecting build for rule ${rule.name}:`, error);
        return null;
    }
}
