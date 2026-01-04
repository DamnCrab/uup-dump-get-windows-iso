import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { BuildRule } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../output'); // Output directory / 输出目录
const TEMP_DIR = path.join(__dirname, '../temp');     // Temp directory / 临时目录
const SCRIPTS_DIR = path.join(__dirname, '../scripts'); // Scripts directory / 脚本目录

export async function buildIso(buildId: string, rule: BuildRule): Promise<void> {
    console.log(`Starting ISO Build for ${buildId} using rule [${rule.name}]`);

    // Ensure directories
    await fs.ensureDir(OUTPUT_DIR);
    await fs.ensureDir(TEMP_DIR);

    // 1. Prepare Configuration / 准备配置
    const pack = rule.language;
    // Join editions with semicolon and lowercase (e.g. "core;professional")
    // 将版本用分号连接并转小写
    const edition = rule.editions.map(e => e.toLowerCase()).join(';');
    const autodl = rule.downloadMethod;

    // Map options array to object / 将选项数组映射为对象
    const optionsObj: Record<string, string> = {};
    if (rule.options) {
        rule.options.forEach(opt => {
            optionsObj[opt] = '1';
        });
    }

    // 2. Construct POST Data / 构造 POST 数据
    const formData = new URLSearchParams();
    formData.append('autodl', autodl);

    Object.keys(optionsObj).forEach(key => {
        formData.append(key, '1');
    });

    if (rule.virtualEditions && rule.virtualEditions.length > 0) {
        rule.virtualEditions.forEach(ve => {
            formData.append('virtualEditions[]', ve);
        });
    }

    console.log(`Requesting download package from UUP dump...`);
    // URL contains id, pack, edition
    const url = `https://uupdump.net/get.php?id=${buildId}&pack=${pack}&edition=${encodeURIComponent(edition)}`;
    console.log(`URL: ${url}`);

    try {
        const response = await axios.post(url, formData, {
            responseType: 'arraybuffer',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const zipPath = path.join(TEMP_DIR, `${buildId}.zip`);
        await fs.writeFile(zipPath, response.data);
        console.log(`Download package saved to: ${zipPath}`);

        // 3. Extract / 解压
        const extractDir = path.join(TEMP_DIR, `${buildId}_extract`);
        await fs.emptyDir(extractDir); // Clean extract dir / 清空解压目录
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractDir, true);
        console.log(`Extracted to: ${extractDir}`);

        // 4. Find and Prepare Script / 查找并准备脚本
        const files = await fs.readdir(extractDir);
        const scriptName = files.find(f => f.endsWith('.cmd') && (f.includes('convert') || f.includes('uup')));

        if (!scriptName) {
            throw new Error('No conversion script found in the downloaded package. / 下载包中未找到转换脚本。');
        }

        const scriptPath = path.join(extractDir, scriptName);
        console.log(`Found script: ${scriptPath}`);

        // Modify script to remove pauses / 修改脚本移除暂停
        let content = await fs.readFile(scriptPath, 'utf8');
        content = content.replace(/^pause/gim, ':: pause')
            .replace(/@pause/gim, ':: @pause');

        // Ensure aria2c has retry parameters / 确保 aria2c 有重试参数
        content = content.replace(/(aria2c\.exe"?)/g, '$1 --retry-wait=5 --max-tries=5');

        // FORCE PWSH: Replace legacy powershell invocations with pwsh
        // 强制使用 PWSH: 将旧版 powershell 调用替换为 pwsh
        // This fixes 'Get-FileHash' not found errors in GitHub Actions env
        //这修复了 GitHub Actions 环境中找不到 'Get-FileHash' 的错误
        content = content.replace(/%SystemRoot%\\System32\\WindowsPowerShell\\v1\.0\\powershell\.exe/gi, 'pwsh');
        content = content.replace(/powershell\.exe/gi, 'pwsh');
        content = content.replace(/\bpowershell\b/gi, 'pwsh');

        await fs.writeFile(scriptPath, content);
        console.log('Script patched for automation (and forced pwsh).');

        // 5. Execute using Monitor Script / 使用监控脚本执行
        console.log('Launching monitor script...');
        const monitorScript = path.join(SCRIPTS_DIR, 'monitor-uup-script.ps1');

        if (!fs.existsSync(monitorScript)) {
            throw new Error(`Monitor script not found at ${monitorScript}`);
        }

        return new Promise<void>((resolve, reject) => {
            // Use pwsh (PowerShell Core) instead of powershell.exe
            const ps = spawn('pwsh', [
                '-ExecutionPolicy', 'Bypass',
                '-File', monitorScript,
                '-ScriptPath', scriptPath,
                '-WorkingDirectory', extractDir,
                '-Timeout', '7200' // Increase timeout to 2h just in case
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

                    if (status.startsWith('SUCCESS:')) {
                        const isoName = status.split(':')[1] || '';
                        if (!isoName) {
                            console.error('Error: ISO name missing in status.');
                            reject(new Error('ISO name missing'));
                            return;
                        }
                        const srcIso = path.join(extractDir, isoName);
                        const destIso = path.join(OUTPUT_DIR, isoName);
                        console.log(`Moving ISO to ${destIso}`);
                        if (fs.existsSync(srcIso)) {
                            fs.moveSync(srcIso, destIso, { overwrite: true });
                            console.log('Build Completed Successfully.');
                            resolve();
                        } else {
                            reject(new Error('Generated ISO file not found'));
                        }
                    } else {
                        reject(new Error(`Build failed with status: ${status}`));
                    }
                } else {
                    reject(new Error('No status file found (Script might have crashed)'));
                }
            });

            ps.on('error', (err) => {
                reject(err);
            });
        });

    } catch (err: any) {
        if (axios.isAxiosError(err) && err.response) {
            console.error('Error Status:', err.response.status);
            console.error('Error Data:', err.response.data.toString());
        }
        throw err;
    }
}
