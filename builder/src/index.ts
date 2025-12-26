
/**
 * Windows ISO Generator
 * Replaces the complex builder architecture with a direct script.
 */

import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
    // Test Case: Windows 11 Feature Update
    buildId: "c45ca209-a5af-4551-8141-993c15a75b8b",
    pack: "zh-cn",
    // Base edition. The value in JSON is "PROFESSIONAL". The URL used "core;professional".
    // Trying explicit combined value from analysis.
    edition: "core;professional",
    // Note: checking valid editions for this build from analysis:
    // "CORE", "CORECOUNTRYSPECIFIC", "PROFESSIONAL", "PPIPRO"
    // Usually for virtual editions we want the Professional base. 
    // The previous analysis script used 'core;professional' for the URL.
    // The user said "PROFESSIONAL", but mapped to value.
    // Let's assume 'PROFESSIONAL' maps to 'PROFESSIONAL' or 'core;professional' as base.
    // Actually, looking at the previous analysis output for this build:
    // edtions: [{label: Windows Pro, value: PROFESSIONAL}]
    // user said: "edition": "PROFESSIONAL"

    autodl: "3", // Virtual Editions

    // Virtual Editions to include (User said "Select All")
    // From analysis: CoreSingleLanguage, ProfessionalWorkstation, ProfessionalEducation, Education, Enterprise, ServerRdsh, IoTEnterprise
    virtualEditions: [
        "CoreSingleLanguage",
        "ProfessionalWorkstation",
        "ProfessionalEducation",
        "Education",
        "Enterprise",
        "ServerRdsh",
        "IoTEnterprise"
    ],

    // Options (User said "Select All")
    options: {
        updates: 1,
        cleanup: 1,
        netfx: 1,
        esd: 1
    },

    outputDir: path.join(__dirname, '../output'),
    tempDir: path.join(__dirname, '../temp')
};

async function main() {
    console.log('Starting ISO Generation...');
    console.log(`Build ID: ${CONFIG.buildId}`);

    // Ensure directories
    await fs.ensureDir(CONFIG.outputDir);
    await fs.ensureDir(CONFIG.tempDir);

    // 1. Construct POST Data for get.php
    // Per analysis/browser behavior, the download button submits a POST form to https://uupdump.net/get.php
    /*
        <form action="get.php" method="post">
            <input type="hidden" name="id" value="...">
            <input type="hidden" name="pack" value="...">
            <input type="hidden" name="edition" value="..."> (semicolon separated?)
            <input type="hidden" name="autodl" value="3">
            ... options ...
        </form>
    */

    const formData = new URLSearchParams();
    // id, pack, edition are passed in URL query params, NOT in body.
    formData.append('autodl', CONFIG.autodl);

    // Add options
    if (CONFIG.options.updates) formData.append('updates', '1');
    if (CONFIG.options.cleanup) formData.append('cleanup', '1');
    if (CONFIG.options.netfx) formData.append('netfx', '1');
    if (CONFIG.options.esd) formData.append('esd', '1');

    // Add virtual editions
    // In PHP/HTML form, name="virtualEditions[]". 
    // URLSearchParams usually handles multiple keys if appended multiple times
    CONFIG.virtualEditions.forEach(ve => {
        formData.append('virtualEditions[]', ve);
    });

    console.log('Requesting download package from UUP dump...');
    // Construct URL with query parameters
    const url = `https://uupdump.net/get.php?id=${CONFIG.buildId}&pack=${CONFIG.pack}&edition=${encodeURIComponent(CONFIG.edition)}`;
    console.log(`URL: ${url}`);

    try {
        const response = await axios.post(url, formData, {
            responseType: 'arraybuffer',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const zipPath = path.join(CONFIG.tempDir, `${CONFIG.buildId}.zip`);
        await fs.writeFile(zipPath, response.data);
        console.log(`Download package saved to: ${zipPath}`);

        // 2. Extract
        const extractDir = path.join(CONFIG.tempDir, `${CONFIG.buildId}_extract`);
        await fs.ensureDir(extractDir);
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractDir, true);
        console.log(`Extracted to: ${extractDir}`);

        // 3. Find and Prepare Script
        const files = await fs.readdir(extractDir);
        const scriptName = files.find(f => f.endsWith('.cmd') && (f.includes('convert') || f.includes('uup')));

        if (!scriptName) {
            throw new Error('No conversion script found in the downloaded package.');
        }

        const scriptPath = path.join(extractDir, scriptName);
        console.log(`Found script: ${scriptPath}`);

        // Modify script to remove pauses (automation)
        let content = await fs.readFile(scriptPath, 'utf8');
        content = content.replace(/^pause/gim, ':: pause')
            .replace(/@pause/gim, ':: @pause');

        // Ensure aria2c has retry parameters
        content = content.replace(/(aria2c\.exe"?)/g, '$1 --retry-wait=5 --max-tries=5');

        await fs.writeFile(scriptPath, content);
        console.log('Script patched for automation.');

        // 4. Execute using Monitor Script
        console.log('Launching monitor script...');
        const monitorScript = path.join(__dirname, '../scripts/monitor-uup-script.ps1');

        // Spawn PowerShell
        const ps = spawn('powershell.exe', [
            '-ExecutionPolicy', 'Bypass',
            '-File', monitorScript,
            '-ScriptPath', scriptPath,
            '-WorkingDirectory', extractDir,
            '-Timeout', '120' // 2 hours timeout
        ], {
            stdio: 'inherit'
        });

        ps.on('close', (code) => {
            console.log(`Monitor script exited with code ${code}`);

            // Check status file
            const statusPath = path.join(extractDir, 'uup_monitor_status.txt');
            if (fs.existsSync(statusPath)) {
                const status = fs.readFileSync(statusPath, 'utf8').trim();
                console.log(`Final Status: ${status}`);

                // If success, move ISO
                if (status.startsWith('SUCCESS:')) {
                    const isoName = status.split(':')[1] || '';
                    if (!isoName) {
                        console.log('Error: ISO name missing in status.');
                        return;
                    }
                    const srcIso = path.join(extractDir, isoName);
                    const destIso = path.join(CONFIG.outputDir, isoName);
                    console.log(`Moving ISO to ${destIso}`);
                    if (fs.existsSync(srcIso)) {
                        fs.moveSync(srcIso, destIso, { overwrite: true });
                        console.log('DONE.');
                    }
                }
            } else {
                console.log('No status file found.');
            }
        });

    } catch (err: any) {
        if (axios.isAxiosError(err) && err.response) {
            console.error('Error Status:', err.response.status);
            console.error('Error Data:', err.response.data.toString());
        }
        if (err instanceof Error) {
            console.error('Error Message:', err.message);
        } else {
            console.error('Error:', String(err));
        }
    }
}

main();
