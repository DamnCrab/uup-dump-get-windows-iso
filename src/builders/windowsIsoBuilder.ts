/**
 * Windows ISO Builder - Core implementation for building Windows ISO files from UUP dumps
 * Windows ISO 构建器 - 从 UUP 转储构建 Windows ISO 文件的核心实现
 * 
 * This module provides the main functionality for:
 * 该模块提供以下主要功能：
 * - Downloading UUP dump scripts / 下载 UUP 转储脚本
 * - Executing build scripts to create ISO files / 执行构建脚本创建 ISO 文件
 * - Managing build process and output / 管理构建过程和输出
 * - Generating metadata for built ISOs / 为构建的 ISO 生成元数据
 */

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

/**
 * Windows ISO Builder class - Implements the Builder interface for Windows ISO creation
 * Windows ISO 构建器类 - 实现用于 Windows ISO 创建的 Builder 接口
 */
class WindowsIsoBuilder implements Builder {
    private scraper: UupDumpScraper;  // UUP dump scraper instance / UUP 转储爬虫实例
    private logger: Logger;           // Logger instance for this builder / 此构建器的日志记录器实例
    private outputDir: string;        // Output directory for built files / 构建文件的输出目录

    /**
     * Constructor for WindowsIsoBuilder
     * WindowsIsoBuilder 构造函数
     * 
     * @param scraper - UUP dump scraper instance / UUP 转储爬虫实例
     * @param outputDir - Output directory path (default: './output') / 输出目录路径（默认：'./output'）
     */
    constructor(scraper: UupDumpScraper, outputDir: string = './output') {
        this.scraper = scraper;
        this.logger = new Logger('WindowsIsoBuilder');
        this.outputDir = outputDir || './output';
    }

    /**
     * Build Windows ISO from UUP dump
     * 从 UUP 转储构建 Windows ISO
     * 
     * This method orchestrates the entire ISO building process:
     * 此方法协调整个 ISO 构建过程：
     * 1. Get available builds / 获取可用构建
     * 2. Filter and select target build / 筛选并选择目标构建
     * 3. Select language and edition / 选择语言和版本
     * 4. Download build script / 下载构建脚本
     * 5. Execute script to create ISO / 执行脚本创建 ISO
     * 6. Generate metadata / 生成元数据
     * 
     * @param target - Target configuration / 目标配置
     * @returns Promise resolving to build result / 返回构建结果的 Promise
     */
    async buildIso(target: TargetConfig): Promise<BuildResult> {
        try {
            this.logger.info(`开始构建 ${target.name} / Starting build for ${target.name}`);
            
            // Ensure output directory exists / 确保输出目录存在
            await fs.ensureDir(this.outputDir);
            
            // Step 1: Get build list / 步骤 1：获取构建列表
            const builds = await this.scraper.getBuilds(target.search);
            if (builds.length === 0) {
                throw new Error(`未找到匹配的构建: ${target.search} / No matching builds found: ${target.search}`);
            }
            
            // Step 2: Filter builds (only filter Preview builds, not language) / 步骤 2：过滤构建（只过滤Preview构建，不过滤语言）
            const filteredBuilds = this.scraper.filterBuilds(builds, {
                edition: target.edition
            });
            
            if (filteredBuilds.length === 0) {
                this.logger.warn(`未找到匹配条件的构建，使用所有构建 / No matching builds found, using all builds`);
                filteredBuilds.push(...builds);
            }
            
            // Step 3: Select first build / 步骤 3：选择第一个构建
            const selectedBuild = filteredBuilds[0];
            if (!selectedBuild) {
                throw new Error('未找到可用的构建 / No available builds found');
            }
            this.logger.info(`选择构建: ${selectedBuild.title} (${selectedBuild.id}) / Selected build: ${selectedBuild.title} (${selectedBuild.id})`);
            
            // Step 4: Get language options / 步骤 4：获取语言选项
            const languages = await this.scraper.getLanguages(selectedBuild.id);
            const targetLang = languages.find(lang => 
                lang.code === target.lang || 
                lang.name.includes('中文') ||
                lang.name.toLowerCase().includes('chinese')
            );
            
            if (!targetLang) {
                throw new Error(`未找到目标语言: ${target.lang} / Target language not found: ${target.lang}`);
            }
            
            this.logger.info(`选择语言: ${targetLang.name} (${targetLang.code}) / Selected language: ${targetLang.name} (${targetLang.code})`);
            
            // Step 5: Get edition options / 步骤 5：获取版本选项
            const editions = await this.scraper.getEditions(selectedBuild.id, targetLang.code);
            let targetEdition = editions.find(edition => 
                edition.name.toLowerCase().includes(target.edition.toLowerCase()) ||
                edition.name.toLowerCase().includes('professional')
            );
            
            if (!targetEdition) {
                this.logger.warn(`未找到目标版本 ${target.edition}，使用第一个可用版本 / Target edition ${target.edition} not found, using first available`);
                if (editions.length === 0) {
                    throw new Error('未找到任何版本 / No editions found');
                }
                targetEdition = editions[0];
            }
            
            if (!targetEdition) {
                throw new Error('无法确定目标版本 / Cannot determine target edition');
            }
            
            this.logger.info(`选择版本: ${targetEdition.name} / Selected edition: ${targetEdition.name}`);
            
            // Step 6: Get download information / 步骤 6：获取下载信息
            const editionParam = targetEdition.value || 'professional';
            const downloadInfo = await this.scraper.getDownloadInfo(
                selectedBuild.id, 
                targetLang.code, 
                editionParam
            );
            
            // Step 7: Download build script / 步骤 7：下载构建脚本
            if (downloadInfo.downloadLinks.length === 0) {
                throw new Error('未找到下载链接 / No download links found');
            }
            
            const downloadLink = downloadInfo.downloadLinks[0];
            if (!downloadLink) {
                throw new Error('下载链接为空 / Download link is empty');
            }
            this.logger.info(`下载构建脚本: ${downloadLink.url} / Downloading build script: ${downloadLink.url}`);
            
            const scriptPath = await this.downloadScript(downloadLink, target.name);
            
            // Step 8: Execute build script / 步骤 8：执行构建脚本
            const isoPath = await this.executeScript(scriptPath, target.name);
            
            // Step 9: Generate metadata file / 步骤 9：生成元数据文件
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
     * Extract edition parameter from URL
     * 从URL中提取版本参数
     * 
     * @param url - Edition URL containing edition parameter / 包含版本参数的版本URL
     * @returns Edition parameter string / 版本参数字符串
     */
    extractEditionParam(url: string): string {
        const match = url.match(/edition=([^&]+)/);
        if (match && match[1]) {
            try {
                return decodeURIComponent(match[1]);
            } catch (error) {
                this.logger.warn(`解码版本参数失败: ${match[1]} / Failed to decode edition parameter: ${match[1]}`);
                return match[1];
            }
        }
        return 'professional';
    }

    /**
     * Download build script from UUP dump
     * 从 UUP 转储下载构建脚本
     * 
     * Handles two types of downloads:
     * 处理两种类型的下载：
     * 1. Direct ZIP download with embedded data / 带有嵌入数据的直接 ZIP 下载
     * 2. Traditional URL-based download / 传统的基于 URL 的下载
     * 
     * @param downloadLink - Download link object / 下载链接对象
     * @param targetName - Target name for file naming / 用于文件命名的目标名称
     * @returns Promise resolving to script file path / 返回脚本文件路径的 Promise
     */
    async downloadScript(downloadLink: any, targetName: string): Promise<string> {
        try {
            if (downloadLink.isDirectDownload && downloadLink.data) {
                // Direct ZIP download with embedded data / 直接下载的ZIP数据
                const zipPath = path.join(this.outputDir, `${targetName}-download.zip`);
                await fs.writeFile(zipPath, downloadLink.data);
                this.logger.info(`ZIP文件已保存: ${zipPath} / ZIP file saved: ${zipPath}`);
                
                // Extract ZIP file / 解压ZIP文件
                const extractDir = path.join(this.outputDir, `${targetName}-extracted`);
                await this.extractZip(zipPath, extractDir);
                
                // Find CMD script file / 查找CMD脚本文件
                const scriptPath = await this.findScriptFile(extractDir, targetName);
                return scriptPath;
            } else {
                // Traditional URL-based download / 传统的URL下载
                if (!downloadLink.url) {
                    throw new Error('下载链接URL为空 / Download link URL is empty');
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
            this.logger.error(`下载脚本失败: ${error.message} / Script download failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Extract ZIP file to specified directory
     * 解压ZIP文件到指定目录
     * 
     * @param zipPath - Path to ZIP file / ZIP文件路径
     * @param extractDir - Directory to extract to / 解压目录
     */
    async extractZip(zipPath: string, extractDir: string): Promise<void> {
        try {
            await fs.ensureDir(extractDir);
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractDir, true);
            this.logger.info(`ZIP文件已解压到: ${extractDir} / ZIP file extracted to: ${extractDir}`);
        } catch (error: any) {
            this.logger.error(`解压ZIP文件失败: ${error.message} / ZIP extraction failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Find script file in directory
     * 在目录中查找脚本文件
     * 
     * Searches for .cmd or .bat files, prioritizing those containing "uup" or "convert"
     * 搜索 .cmd 或 .bat 文件，优先选择包含 "uup" 或 "convert" 的文件
     * 
     * @param dir - Directory to search / 搜索目录
     * @param targetName - Target name for logging / 用于日志记录的目标名称
     * @returns Promise resolving to script file path / 返回脚本文件路径的 Promise
     */
    async findScriptFile(dir: string, targetName: string): Promise<string> {
        try {
            const files = await fs.readdir(dir);
            
            // Find .cmd or .bat files / 查找.cmd或.bat文件
            const scriptFiles = files.filter(file => 
                file.endsWith('.cmd') || file.endsWith('.bat')
            );
            
            if (scriptFiles.length === 0) {
                throw new Error('未找到脚本文件 / No script files found');
            }
            
            // Prioritize scripts containing "uup" or "convert" / 优先选择包含"uup"或"convert"的脚本
            let scriptFile = scriptFiles.find(file => 
                file.toLowerCase().includes('uup') || 
                file.toLowerCase().includes('convert')
            );
            
            if (!scriptFile) {
                scriptFile = scriptFiles[0];
            }
            
            if (!scriptFile) {
                throw new Error('未找到任何脚本文件 / No script files found');
            }
            
            const scriptPath = path.join(dir, scriptFile);
            this.logger.info(`找到脚本文件: ${scriptPath} / Found script file: ${scriptPath}`);
            return scriptPath;
            
        } catch (error: any) {
            this.logger.error(`查找脚本文件失败: ${error.message} / Script file search failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute build script to create ISO
     * 执行构建脚本创建 ISO
     * 
     * Spawns a Windows command process to execute the UUP dump script
     * 生成 Windows 命令进程来执行 UUP 转储脚本
     * 
     * @param scriptPath - Path to the script file / 脚本文件路径
     * @param targetName - Target name for logging / 用于日志记录的目标名称
     * @returns Promise resolving to ISO file path / 返回 ISO 文件路径的 Promise
     */
    async executeScript(scriptPath: string, targetName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.logger.info(`执行构建脚本: ${scriptPath} / Executing build script: ${scriptPath}`);
            
            const scriptDir = path.dirname(scriptPath);
            const process = spawn('cmd.exe', ['/c', path.basename(scriptPath)], {
                cwd: scriptDir,
                stdio: ['inherit', 'pipe', 'pipe']
            });
            
            let output = '';
            let error = '';
            
            // Handle stdout output / 处理标准输出
            process.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                this.logger.info(text.trim());
            });
            
            // Handle stderr output / 处理错误输出
            process.stderr.on('data', (data) => {
                const text = data.toString();
                error += text;
                this.logger.error(text.trim());
            });
            
            // Handle process completion / 处理进程完成
            process.on('close', (code) => {
                if (code === 0) {
                    // Find generated ISO file / 查找生成的ISO文件
                    const isoPath = this.findGeneratedIso(scriptDir, targetName);
                    if (isoPath) {
                        this.logger.info(`ISO构建成功: ${isoPath} / ISO build successful: ${isoPath}`);
                        resolve(isoPath);
                    } else {
                        reject(new Error('未找到生成的ISO文件 / Generated ISO file not found'));
                    }
                } else {
                    reject(new Error(`脚本执行失败，退出代码: ${code} / Script execution failed, exit code: ${code}`));
                }
            });
            
            // Handle process errors / 处理进程错误
            process.on('error', (err) => {
                reject(new Error(`脚本执行错误: ${err.message} / Script execution error: ${err.message}`));
            });
        });
    }

    /**
     * Find generated ISO file in directory
     * 在目录中查找生成的 ISO 文件
     * 
     * Searches for .iso files and returns the most recently created one
     * 搜索 .iso 文件并返回最近创建的文件
     * 
     * @param dir - Directory to search / 搜索目录
     * @param targetName - Target name for logging / 用于日志记录的目标名称
     * @returns ISO file path or null / ISO 文件路径或 null
     */
    findGeneratedIso(dir: string, targetName: string): string | null {
        try {
            const files = fs.readdirSync(dir);
            const isoFiles = files.filter(file => file.endsWith('.iso'));
            
            if (isoFiles.length > 0) {
                // Return the newest ISO file / 返回最新的ISO文件
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
            this.logger.error(`查找生成的ISO文件失败: ${error.message} / Failed to find generated ISO file: ${error.message}`);
            return null;
        }
    }

    /**
     * Generate metadata files for the built ISO
     * 为构建的 ISO 生成元数据文件
     * 
     * Creates checksum file and JSON metadata with build information
     * 创建校验和文件和包含构建信息的 JSON 元数据
     * 
     * @param build - Build information / 构建信息
     * @param language - Language information / 语言信息
     * @param edition - Edition information / 版本信息
     * @param isoPath - Path to ISO file / ISO 文件路径
     * @param targetName - Target name / 目标名称
     */
    async generateMetadata(build: any, language: any, edition: any, isoPath: string, targetName: string): Promise<void> {
        try {
            // Calculate ISO file checksum / 计算ISO文件校验和
            const checksum = await this.calculateChecksum(isoPath);
            
            // Generate safe filename / 生成安全的文件名
            const titleSafe = this.generateSafeTitle(build.title);
            
            // Move ISO file to output directory / 移动ISO文件到输出目录
            const finalIsoPath = path.join(this.outputDir, `${titleSafe}.iso`);
            if (isoPath !== finalIsoPath) {
                await fs.move(isoPath, finalIsoPath);
                this.logger.info(`ISO文件已移动到: ${finalIsoPath} / ISO file moved to: ${finalIsoPath}`);
            }
            
            // Generate checksum file / 生成校验和文件
            const checksumPath = `${finalIsoPath}.sha256.txt`;
            await fs.writeFile(checksumPath, checksum, 'ascii');
            this.logger.info(`校验和文件已生成: ${checksumPath} / Checksum file generated: ${checksumPath}`);
            
            // Generate metadata JSON / 生成元数据JSON
            const metadata = {
                name: targetName,
                title: build.title,
                titleSafe: titleSafe,
                build: build.build || build.version || 'unknown',
                checksum: checksum,
                images: [], // Simplified version, does not parse ISO content / 简化版本，不解析ISO内容
                uupDump: {
                    id: build.id,
                    apiUrl: `https://uupdump.net/get.php?id=${build.id}`,
                    downloadUrl: `https://uupdump.net/selectlang.php?id=${build.id}`,
                    downloadPackageUrl: `https://uupdump.net/download.php?id=${build.id}&pack=${language.code}&edition=${edition.name}`
                }
            };
            
            const metadataPath = `${finalIsoPath}.json`;
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
            this.logger.info(`元数据文件已生成: ${metadataPath} / Metadata file generated: ${metadataPath}`);
            
        } catch (error: any) {
            this.logger.error(`生成元数据失败: ${error.message} / Metadata generation failed: ${error.message}`);
        }
    }

    /**
     * Calculate SHA256 checksum of file
     * 计算文件的 SHA256 校验和
     * 
     * @param filePath - Path to file / 文件路径
     * @returns Promise resolving to checksum string / 返回校验和字符串的 Promise
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
     * Generate safe filename from title
     * 从标题生成安全的文件名
     * 
     * Removes or replaces characters that are not safe for filenames
     * 移除或替换对文件名不安全的字符
     * 
     * @param title - Original title / 原始标题
     * @returns Safe filename / 安全的文件名
     */
    generateSafeTitle(title: string): string {
        return title
            .replace(/[<>:"/\\|?*]/g, '_')  // Replace unsafe characters / 替换不安全字符
            .replace(/\s+/g, '_')           // Replace spaces with underscores / 用下划线替换空格
            .replace(/_+/g, '_')            // Collapse multiple underscores / 合并多个下划线
            .replace(/^_|_$/g, '');         // Remove leading/trailing underscores / 移除首尾下划线
    }

    /**
     * Clean up temporary files
     * 清理临时文件
     * 
     * @param scriptPath - Path to script file to clean up / 要清理的脚本文件路径
     */
    async cleanup(scriptPath: string): Promise<void> {
        try {
            if (fs.existsSync(scriptPath)) {
                await fs.remove(scriptPath);
                this.logger.info(`已清理临时文件: ${scriptPath} / Cleaned up temporary file: ${scriptPath}`);
            }
        } catch (error: any) {
            this.logger.error(`清理失败: ${error.message} / Cleanup failed: ${error.message}`);
        }
    }
}

export default WindowsIsoBuilder;