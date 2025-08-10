import UupDumpScraper from '../scrapers/uupDumpScraper.js';
import Logger from '../utils/logger.js';
import fs from 'fs-extra';
import path from 'path';
import axios, { AxiosResponse } from 'axios';
import { spawn, ChildProcess } from 'child_process';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import { 
    Builder, 
    DownloadInfo, 
    BuildResult, 
    TargetConfig,
    DownloadConfig
} from '../types/index.js';

class WindowsIsoBuilder implements Builder {
    private scraper: UupDumpScraper;
    private logger: Logger;
    private outputDir: string;

    constructor(scraper: UupDumpScraper, outputDir: string = './output') {
        this.scraper = scraper;
        this.logger = new Logger('WindowsIsoBuilder');
        this.outputDir = outputDir || './output';
    }

    /**
     * 构建Windows ISO
     * @param {TargetConfig} target - 目标配置
     * @returns {Promise<BuildResult>} 构建结果
     */
    async buildIso(target: TargetConfig): Promise<BuildResult> {
        try {
            this.logger.info(`开始构建 ${target.name}`);
            
            // 确保输出目录存在
            await fs.ensureDir(this.outputDir);
            
            // 1. 获取构建列表
            const builds = await this.scraper.getBuilds(target.search);
            if (builds.length === 0) {
                throw new Error(`未找到匹配的构建: ${target.search}`);
            }
            
            // 2. 过滤构建（只过滤Preview构建，不过滤语言）
            const filteredBuilds = this.scraper.filterBuilds(builds, {
                edition: target.edition
            });
            
            if (filteredBuilds.length === 0) {
                this.logger.warn(`未找到匹配条件的构建，使用所有构建`);
                filteredBuilds.push(...builds);
            }
            
            // 3. 选择第一个构建
            const selectedBuild = filteredBuilds[0];
            if (!selectedBuild) {
                throw new Error('未找到可用的构建');
            }
            this.logger.info(`选择构建: ${selectedBuild.title} (${selectedBuild.id})`);
            
            // 4. 获取语言选项
            const languages = await this.scraper.getLanguages(selectedBuild.id);
            const targetLang = languages.find(lang => 
                lang.code === target.lang || 
                lang.name.includes('中文') ||
                lang.name.toLowerCase().includes('chinese')
            );
            
            if (!targetLang) {
                throw new Error(`未找到目标语言: ${target.lang}`);
            }
            
            this.logger.info(`选择语言: ${targetLang.name} (${targetLang.code})`);
            
            // 5. 获取版本选项
            const editions = await this.scraper.getEditions(selectedBuild.id, targetLang.code);
            let targetEdition = editions.find(edition => 
                edition.name.toLowerCase().includes(target.edition.toLowerCase()) ||
                edition.name.toLowerCase().includes('professional')
            );
            
            if (!targetEdition) {
                this.logger.warn(`未找到目标版本 ${target.edition}，使用第一个可用版本`);
                if (editions.length === 0) {
                    throw new Error('未找到任何版本');
                }
                targetEdition = editions[0];
            }
            
            if (!targetEdition) {
                throw new Error('无法确定目标版本');
            }
            
            this.logger.info(`选择版本: ${targetEdition.name}`);
            
            // 6. 获取下载信息
            const editionParam = targetEdition.value || 'professional';
            const downloadInfo = await this.scraper.getDownloadInfo(
                selectedBuild.id, 
                targetLang.code, 
                editionParam
            );
            
            // 7. 下载构建脚本
            if (downloadInfo.downloadLinks.length === 0) {
                throw new Error('未找到下载链接');
            }
            
            const downloadLink = downloadInfo.downloadLinks[0];
            if (!downloadLink) {
                throw new Error('下载链接为空');
            }
            this.logger.info(`下载构建脚本: ${downloadLink.url}`);
            
            const scriptPath = await this.downloadScript(downloadLink, target.name);
            
            // 8. 执行构建脚本
            const isoPath = await this.executeScript(scriptPath, target.name);
            
            // 9. 生成元数据文件
            await this.generateMetadata(selectedBuild, targetLang, targetEdition, isoPath, target.name);
            
            return {
                success: true,
                target: target.name,
                buildId: selectedBuild.id,
                buildTitle: selectedBuild.title,
                language: targetLang.name,
                edition: targetEdition.name,
                isoPath: isoPath,
                scriptPath: scriptPath
            };
            
        } catch (error: any) {
            this.logger.error(`构建 ${target.name} 失败: ${error.message}`);
            return {
                success: false,
                target: target.name,
                error: error.message
            };
        }
    }

    /**
     * 从URL中提取版本参数
     * @param {string} url - 版本URL
     * @returns {string} 版本参数
     */
    extractEditionParam(url: string): string {
        const match = url.match(/edition=([^&]+)/);
        if (match && match[1]) {
            try {
                return decodeURIComponent(match[1]);
            } catch (error) {
                this.logger.warn(`解码版本参数失败: ${match[1]}`);
                return match[1];
            }
        }
        return 'professional';
    }

    /**
     * 下载构建脚本
     * @param {Object} downloadLink - 下载链接对象
     * @param {string} targetName - 目标名称
     * @returns {Promise<string>} 脚本文件路径
     */
    async downloadScript(downloadLink: any, targetName: string): Promise<string> {
        try {
            if (downloadLink.isDirectDownload && downloadLink.data) {
                // 直接下载的ZIP数据
                const zipPath = path.join(this.outputDir, `${targetName}-download.zip`);
                await fs.writeFile(zipPath, downloadLink.data);
                this.logger.info(`ZIP文件已保存: ${zipPath}`);
                
                // 解压ZIP文件
                const extractDir = path.join(this.outputDir, `${targetName}-extracted`);
                await this.extractZip(zipPath, extractDir);
                
                // 查找CMD脚本文件
                const scriptPath = await this.findScriptFile(extractDir, targetName);
                return scriptPath;
            } else {
                // 传统的URL下载
                if (!downloadLink.url) {
                    throw new Error('下载链接URL为空');
                }
                const response = await axios.get(downloadLink.url, { responseType: 'stream' });
                const scriptPath = path.join(this.outputDir, `${targetName}-script.cmd`);
                
                const writer = fs.createWriteStream(scriptPath);
                response.data.pipe(writer);
                
                return new Promise((resolve, reject) => {
                    writer.on('finish', () => resolve(scriptPath));
                    writer.on('error', reject);
                });
            }
        } catch (error: any) {
            this.logger.error(`下载脚本失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 解压ZIP文件
     * @param {string} zipPath - ZIP文件路径
     * @param {string} extractDir - 解压目录
     */
    async extractZip(zipPath: string, extractDir: string): Promise<void> {
        try {
            await fs.ensureDir(extractDir);
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractDir, true);
            this.logger.info(`ZIP文件已解压到: ${extractDir}`);
        } catch (error: any) {
            this.logger.error(`解压ZIP文件失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 查找脚本文件
     * @param {string} dir - 搜索目录
     * @param {string} targetName - 目标名称
     * @returns {Promise<string>} 脚本文件路径
     */
    async findScriptFile(dir: string, targetName: string): Promise<string> {
        try {
            const files = await fs.readdir(dir);
            
            // 查找.cmd或.bat文件
            const scriptFiles = files.filter(file => 
                file.endsWith('.cmd') || file.endsWith('.bat')
            );
            
            if (scriptFiles.length === 0) {
                throw new Error('未找到脚本文件');
            }
            
            // 优先选择包含"uup"或"convert"的脚本
            let scriptFile = scriptFiles.find(file => 
                file.toLowerCase().includes('uup') || 
                file.toLowerCase().includes('convert')
            );
            
            if (!scriptFile) {
                scriptFile = scriptFiles[0];
            }
            
            if (!scriptFile) {
                throw new Error('未找到任何脚本文件');
            }
            
            const scriptPath = path.join(dir, scriptFile);
            this.logger.info(`找到脚本文件: ${scriptPath}`);
            return scriptPath;
            
        } catch (error: any) {
            this.logger.error(`查找脚本文件失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 执行构建脚本
     * @param {string} scriptPath - 脚本路径
     * @param {string} targetName - 目标名称
     * @returns {Promise<string>} ISO文件路径
     */
    async executeScript(scriptPath: string, targetName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.logger.info(`执行构建脚本: ${scriptPath}`);
            
            const scriptDir = path.dirname(scriptPath);
            const process = spawn('cmd.exe', ['/c', path.basename(scriptPath)], {
                cwd: scriptDir,
                stdio: ['inherit', 'pipe', 'pipe']
            });
            
            let output = '';
            let error = '';
            
            process.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                this.logger.info(text.trim());
            });
            
            process.stderr.on('data', (data) => {
                const text = data.toString();
                error += text;
                this.logger.error(text.trim());
            });
            
            process.on('close', (code) => {
                if (code === 0) {
                    // 查找生成的ISO文件
                    const isoPath = this.findGeneratedIso(scriptDir, targetName);
                    if (isoPath) {
                        this.logger.info(`ISO构建成功: ${isoPath}`);
                        resolve(isoPath);
                    } else {
                        reject(new Error('未找到生成的ISO文件'));
                    }
                } else {
                    reject(new Error(`脚本执行失败，退出代码: ${code}`));
                }
            });
            
            process.on('error', (err) => {
                reject(new Error(`脚本执行错误: ${err.message}`));
            });
        });
    }

    /**
     * 查找生成的ISO文件
     * @param {string} dir - 搜索目录
     * @param {string} targetName - 目标名称
     * @returns {string|null} ISO文件路径
     */
    findGeneratedIso(dir: string, targetName: string): string | null {
        try {
            const files = fs.readdirSync(dir);
            const isoFiles = files.filter(file => file.endsWith('.iso'));
            
            if (isoFiles.length > 0) {
                // 返回最新的ISO文件
                const isoFile = isoFiles.sort((a, b) => {
                    const statA = fs.statSync(path.join(dir, a));
                    const statB = fs.statSync(path.join(dir, b));
                    return statB.mtime.getTime() - statA.mtime.getTime();
                })[0];
                
                if (!isoFile) {
                    return null;
                }
                
                return path.join(dir, isoFile);
            }
            
            return null;
        } catch (error: any) {
            this.logger.error(`查找生成的ISO文件失败: ${error.message}`);
            return null;
        }
    }

    /**
     * 生成元数据文件
     * @param {Object} build - 构建信息
     * @param {Object} language - 语言信息
     * @param {Object} edition - 版本信息
     * @param {string} isoPath - ISO文件路径
     * @param {string} targetName - 目标名称
     */
    async generateMetadata(build: any, language: any, edition: any, isoPath: string, targetName: string): Promise<void> {
        try {
            // 计算ISO文件校验和
            const checksum = await this.calculateChecksum(isoPath);
            
            // 生成安全的文件名
            const titleSafe = this.generateSafeTitle(build.title);
            
            // 移动ISO文件到输出目录
            const finalIsoPath = path.join(this.outputDir, `${titleSafe}.iso`);
            if (isoPath !== finalIsoPath) {
                await fs.move(isoPath, finalIsoPath);
                this.logger.info(`ISO文件已移动到: ${finalIsoPath}`);
            }
            
            // 生成校验和文件
            const checksumPath = `${finalIsoPath}.sha256.txt`;
            await fs.writeFile(checksumPath, checksum, 'ascii');
            this.logger.info(`校验和文件已生成: ${checksumPath}`);
            
            // 生成元数据JSON
            const metadata = {
                name: targetName,
                title: build.title,
                titleSafe: titleSafe,
                build: build.build || build.version || 'unknown',
                checksum: checksum,
                images: [], // 简化版本，不解析ISO内容
                uupDump: {
                    id: build.id,
                    apiUrl: `https://uupdump.net/get.php?id=${build.id}`,
                    downloadUrl: `https://uupdump.net/selectlang.php?id=${build.id}`,
                    downloadPackageUrl: `https://uupdump.net/download.php?id=${build.id}&pack=${language.code}&edition=${edition.name}`
                }
            };
            
            const metadataPath = `${finalIsoPath}.json`;
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
            this.logger.info(`元数据文件已生成: ${metadataPath}`);
            
        } catch (error: any) {
            this.logger.error(`生成元数据失败: ${error.message}`);
        }
    }

    /**
     * 计算文件SHA256校验和
     * @param {string} filePath - 文件路径
     * @returns {Promise<string>} 校验和
     */
    async calculateChecksum(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);
            
            stream.on('data', (data) => {
                hash.update(data);
            });
            
            stream.on('end', () => {
                resolve(hash.digest('hex').toLowerCase());
            });
            
            stream.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * 生成安全的文件名
     * @param {string} title - 原始标题
     * @returns {string} 安全的文件名
     */
    generateSafeTitle(title: string): string {
        return title
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }

    /**
     * 清理临时文件
     * @param {string} scriptPath - 脚本路径
     */
    async cleanup(scriptPath: string): Promise<void> {
        try {
            if (fs.existsSync(scriptPath)) {
                await fs.remove(scriptPath);
                this.logger.info(`已清理临时文件: ${scriptPath}`);
            }
        } catch (error: any) {
            this.logger.error(`清理失败: ${error.message}`);
        }
    }
}

export default WindowsIsoBuilder;