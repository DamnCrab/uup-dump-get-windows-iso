/**
 * UUP Dump Scraper Module
 * UUP Dump 数据抓取模块
 * 
 * This module implements the Scraper interface to interact with UUP Dump website
 * 该模块实现了 Scraper 接口，用于与 UUP Dump 网站交互
 * 
 * Features:
 * - Fetch available Windows builds / 获取可用的 Windows 构建
 * - Get language options for builds / 获取构建的语言选项
 * - Get edition options for builds / 获取构建的版本选项
 * - Generate download information / 生成下载信息
 * - Parse HTML responses using Cheerio / 使用 Cheerio 解析 HTML 响应
 */

import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import Logger from '../utils/logger.js';
import { 
    Scraper, 
    BuildInfo, 
    LanguageInfo, 
    EditionInfo, 
    DownloadInfo, 
    DownloadLink, 
    LanguageCode, 
    WindowsEdition, 
    DownloadConfig,
    Architecture
} from '../types/index.js';

/**
 * UUP Dump Scraper Class
 * UUP Dump 数据抓取类
 * 
 * Implements web scraping functionality for UUP Dump website
 * 实现 UUP Dump 网站的网页抓取功能
 */
class UupDumpScraper implements Scraper {
    private baseUrl: string;        // Base URL for UUP Dump / UUP Dump 基础 URL
    private logger: Logger;         // Logger instance / 日志记录器实例
    private axiosConfig: any;       // Axios configuration / Axios 配置

    /**
     * Constructor - Initialize scraper with default configuration
     * 构造函数 - 使用默认配置初始化抓取器
     */
    constructor() {
        this.logger = new Logger('UupDumpScraper');
        this.baseUrl = 'https://uupdump.net';
        
        // Configure axios default headers / 配置 axios 默认请求头
        this.axiosConfig = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 30000
        };
    }

    /**
     * Get available builds list
     * 获取可用的构建列表
     * 
     * Returns Windows 11 24H2 builds by default
     * 默认返回 Windows 11 24H2 构建
     * 
     * @returns Promise resolving to array of build information / 返回构建信息数组的 Promise
     */
    async getAvailableBuilds(): Promise<BuildInfo[]> {
        return this.getBuilds('category:w11-24h2');
    }

    /**
     * Get builds list for specified category
     * 获取指定类别的构建列表
     * 
     * Fetches and parses build information from UUP Dump website
     * 从 UUP Dump 网站获取并解析构建信息
     * 
     * @param category - Category query parameter (e.g., category:w11-24h2) / 类别查询参数
     * @returns Promise resolving to array of build information / 返回构建信息数组的 Promise
     */
    async getBuilds(category: string = 'category:w11-24h2'): Promise<BuildInfo[]> {
        try {
            const url = `${this.baseUrl}/known.php?q=${encodeURIComponent(category)}`;
            this.logger.info(`正在获取构建列表: ${url} / Fetching builds list: ${url}`);
            
            const response = await axios.get(url, this.axiosConfig);
            const $ = cheerio.load(response.data);
            
            const builds: BuildInfo[] = [];
            
            // Parse table data / 解析表格数据
            $('table tbody tr').each((index, element) => {
                const $row = $(element);
                const $cells = $row.find('td');
                
                if ($cells.length >= 3) {
                    const titleCell = $cells.eq(0);
                    const archCell = $cells.eq(1);
                    const dateCell = $cells.eq(2);
                    
                    const $link = titleCell.find('a');
                    if ($link.length > 0) {
                        const href = $link.attr('href');
                        const title = $link.text().trim();
                        const arch = archCell.text().trim();
                        const date = dateCell.text().trim();
                        
                        // Extract build ID from link / 从链接中提取构建ID
                        const buildId = href ? this.extractBuildId(href) : null;
                        
                        if (buildId && title && arch && href) {
                            builds.push({
                                id: buildId,
                                title: title,
                                architecture: (arch === 'x64' ? 'x64' : arch === 'x86' ? 'x86' : arch === 'arm64' ? 'arm64' : 'x64') as Architecture,
                                version: date,
                                language: 'en-us' as LanguageCode,
                                link: href.startsWith('http') ? href : `${this.baseUrl}/${href}`
                            });
                        }
                    }
                }
            });
            
            this.logger.info(`找到 ${builds.length} 个构建 / Found ${builds.length} builds`);
            return builds;
        } catch (error: any) {
            this.logger.error(`获取构建列表失败: ${error.message} / Failed to fetch builds list: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get language options for specified build
     * 获取指定构建的语言选项
     * 
     * Fetches available language packs for a Windows build
     * 获取 Windows 构建的可用语言包
     * 
     * @param buildId - Build ID / 构建ID
     * @returns Promise resolving to array of language information / 返回语言信息数组的 Promise
     */
    async getLanguages(buildId: string): Promise<LanguageInfo[]> {
        try {
            const url = `${this.baseUrl}/selectlang.php?id=${buildId}`;
            this.logger.info(`正在获取语言选项: ${url} / Fetching language options: ${url}`);
            
            const response = await axios.get(url, this.axiosConfig);
            const $ = cheerio.load(response.data);
            
            const languages: LanguageInfo[] = [];
            
            // Parse language selection dropdown / 解析语言选择下拉框
            $('select option').each((index, element) => {
                const $option = $(element);
                const langCode = $option.attr('value') as string;
                const langName = $option.text().trim();
                
                if (langCode && langName) {
                    languages.push({
                        code: langCode as LanguageCode,
                        name: langName,
                        url: `${this.baseUrl}/selectlang.php?id=${buildId}&pack=${langCode}`
                    });
                }
            });
            
            this.logger.info(`找到 ${languages.length} 种语言 / Found ${languages.length} languages`);
            return languages;
        } catch (error: any) {
            this.logger.error(`获取语言选项失败: ${error.message} / Failed to fetch language options: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get edition options for specified build and language
     * 获取指定构建和语言的版本选项
     * 
     * Fetches available Windows editions for a build and language combination
     * 获取构建和语言组合的可用 Windows 版本
     * 
     * @param buildId - Build ID / 构建ID
     * @param langCode - Language code / 语言代码
     * @returns Promise resolving to array of edition information / 返回版本信息数组的 Promise
     */
    async getEditions(buildId: string, langCode: string): Promise<EditionInfo[]> {
        try {
            const url = `${this.baseUrl}/selectedition.php?id=${buildId}&pack=${langCode}`;
            this.logger.info(`正在获取版本选项: ${url} / Fetching edition options: ${url}`);
            
            const response = await axios.get(url, this.axiosConfig);
            const $ = cheerio.load(response.data);
            
            const editions: EditionInfo[] = [];
            
            // Parse edition selection checkboxes / 解析版本选择复选框
            $('input[type="checkbox"][name="edition[]"]').each((index, element) => {
                const $checkbox = $(element);
                const value = $checkbox.attr('value') as string;
                const $label = $checkbox.siblings('label');
                const name = $label.text().trim();
                
                if (value && name) {
                    editions.push({
                        name: name,
                        value: value as WindowsEdition,
                        code: value.toLowerCase() as string
                    });
                }
            });
            
            this.logger.info(`找到 ${editions.length} 个版本 / Found ${editions.length} editions`);
            return editions;
        } catch (error: any) {
            this.logger.error(`获取版本选项失败: ${error.message} / Failed to fetch edition options: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get download information for specified build, language and editions
     * 获取指定构建、语言和版本的下载信息
     * 
     * Submits form to UUP Dump and retrieves download package information
     * 向 UUP Dump 提交表单并获取下载包信息
     * 
     * @param buildId - Build ID / 构建ID
     * @param langCode - Language code / 语言代码
     * @param editions - Edition string (e.g., PROFESSIONAL) / 版本字符串
     * @returns Promise resolving to download information / 返回下载信息的 Promise
     */
    async getDownloadInfo(buildId: string, langCode: string, editions: string): Promise<DownloadInfo> {
        try {
            const url = `${this.baseUrl}/download.php?id=${buildId}&pack=${langCode}&edition=${editions}`;
            this.logger.info(`正在获取下载信息: ${url} / Fetching download info: ${url}`);
            
            const response = await axios.get(url, this.axiosConfig);
            const $ = cheerio.load(response.data);
            
            // Find form and extract form data / 查找表单并提取表单数据
            const form = $('form').first();
            if (form.length === 0) {
                throw new Error('未找到下载表单 / Download form not found');
            }
            
            const formAction = form.attr('action');
            if (!formAction) {
                throw new Error('未找到表单action / Form action not found');
            }
            
            // Build form data with all default selected options / 构建表单数据，包含所有默认选中的选项
            const formData = new URLSearchParams();
            
            // Download method selection (default aria2) / 下载方式选择 (默认选中aria2)
            formData.append('autodl', '2');
            
            // Include updates (default selected) / 包含更新 (默认选中)
            formData.append('updates', '1');
            
            // Other default selected virtual editions / 其他默认选中的虚拟版本
            const virtualEditions = [
                'ProfessionalWorkstation',
                'ProfessionalEducation', 
                'Education',
                'Enterprise',
                'ServerRdsh',
                'IoTEnterprise',
                'IoTEnterpriseK'
            ];
            
            virtualEditions.forEach(edition => {
                formData.append('virtualEditions[]', edition);
            });
            
            // Submit form to create download package / 提交表单创建下载包
            const formUrl = formAction.startsWith('http') ? formAction : `${this.baseUrl}/${formAction}`;
            this.logger.info(`提交下载表单: ${formUrl} / Submitting download form: ${formUrl}`);
            
            const formResponse = await axios.post(formUrl, formData, {
                ...this.axiosConfig,
                headers: {
                    ...this.axiosConfig.headers,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                responseType: 'arraybuffer' // Handle binary response / 处理二进制响应
            });
            
            // Check response type / 检查响应类型
            const contentType = formResponse.headers['content-type'] || '';
            const downloadLinks = [];
            
            this.logger.info(`响应Content-Type: ${contentType} / Response Content-Type: ${contentType}`);
            this.logger.info(`响应数据长度: ${formResponse.data.length} / Response data length: ${formResponse.data.length}`);
            
            if (contentType.includes('application/zip') || contentType.includes('application/octet-stream') || 
                contentType.includes('archive/zip') || 
                (formResponse.data.length > 1000 && !contentType.includes('text/html'))) {
                // Server returns ZIP file directly / 直接返回ZIP文件
                this.logger.info('服务器直接返回ZIP文件 / Server returns ZIP file directly');
                downloadLinks.push({
                    text: 'UUP下载包',
                    url: formUrl,
                    isDirectDownload: true,
                    data: formResponse.data
                });
            } else {
                // Returns HTML page, find download links / 返回HTML页面，查找下载链接
                const $result = cheerio.load(formResponse.data.toString());
                
                $result('a[href$=".zip"]').each((index, element) => {
                    const $link = $result(element);
                    const href = $link.attr('href');
                    const text = $link.text().trim();
                    
                    if (href && text) {
                        downloadLinks.push({
                            text: text,
                            url: href.startsWith('http') ? href : `${this.baseUrl}/${href}`
                        });
                    }
                });
            }

            // Get build information / 获取构建信息
            const buildInfo = this.extractBuildInfo($);
            
            return {
                buildId: buildId,
                language: langCode,
                version: buildInfo?.version || 'Unknown',
                downloadLinks,
                buildInfo
            };
        } catch (error: any) {
            this.logger.error(`获取下载信息失败: ${error.message} / Failed to fetch download info: ${error.message}`);
            throw error;
        }
    }

    /**
     * Extract build ID from URL
     * 从URL中提取构建ID
     * 
     * @param url - URL string / URL字符串
     * @returns Build ID or null if not found / 构建ID或null（如果未找到）
     */
    extractBuildId(url: string): string | null {
        const match = url.match(/id=([a-f0-9-]+)/);
        return match ? match[1] || null : null;
    }

    /**
     * Extract build information from page
     * 从页面中提取构建信息
     * 
     * Parses table data to extract build metadata
     * 解析表格数据以提取构建元数据
     * 
     * @param $ - Cheerio object / Cheerio对象
     * @returns Build information object / 构建信息对象
     */
    extractBuildInfo($: any): any {
        const info: { [key: string]: string } = {};
        
        $('table tr').each((index: number, element: any) => {
            const $row = $(element);
            const cells = $row.find('td');
            
            if (cells.length >= 2) {
                const key = $(cells[0]).text().trim();
                const value = $(cells[1]).text().trim();
                
                if (key && value) {
                    info[key] = value;
                }
            }
        });
        
        return info;
    }

    /**
     * Filter builds list based on criteria
     * 根据条件过滤构建列表
     * 
     * Applies filtering logic to exclude preview builds and match criteria
     * 应用过滤逻辑以排除预览构建并匹配条件
     * 
     * @param builds - Array of builds / 构建数组
     * @param criteria - Filter criteria / 过滤条件
     * @returns Filtered builds array / 过滤后的构建数组
     */
    filterBuilds(builds: BuildInfo[], criteria: any = {}): BuildInfo[] {
        return builds.filter(build => {
            // Exclude Preview builds / 排除Preview构建
            if (build.title.toLowerCase().includes('preview')) {
                return false;
            }
            
            // Check language support / 检查语言支持
            if (criteria.lang && !build.title.toLowerCase().includes(criteria.lang.toLowerCase())) {
                return false;
            }
            
            // Check edition support / 检查版本支持
            if (criteria.edition && !build.title.toLowerCase().includes(criteria.edition.toLowerCase())) {
                return false;
            }
            
            return true;
        });
    }
}

export default UupDumpScraper;