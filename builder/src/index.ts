/**
 * UUP Dump Windows ISO Builder - Main Entry Point
 * UUP Dump Windows ISO 构建器 - 主入口点
 * 
 * This is the main entry point for the UUP Dump Windows ISO Builder.
 * It provides a command-line interface for downloading and building Windows ISO files
 * from Microsoft's Unified Update Platform (UUP) using the UUP dump project.
 * 
 * 这是 UUP Dump Windows ISO 构建器的主入口点。
 * 它提供了一个命令行界面，用于从微软的统一更新平台 (UUP) 下载并构建 Windows ISO 文件，
 * 使用 UUP dump 项目的功能。
 */

import { Command } from 'commander';
import UupDumpScraper from './scrapers/uupDumpScraper.js';
import WindowsIsoBuilder from './builders/windowsIsoBuilder.js';
import Logger from './utils/logger.js';
import { TARGETS, getTargetByName, listTargets } from './config/targets.js';
import { TargetConfig, BuildResult } from './types/index.js';

// Global logger instance / 全局日志实例
const logger = new Logger();

// Target configurations have been moved to config/targets.ts
// 目标配置已移至 config/targets.ts

/**
 * Main function that handles command-line arguments and orchestrates the ISO building process
 * 主函数，处理命令行参数并协调 ISO 构建过程
 */
async function main(): Promise<void> {
    // Initialize command-line interface / 初始化命令行界面
    const program = new Command();
    const mainLogger = new Logger('Main');

    // Configure command-line options / 配置命令行选项
    program
        .name('uup-dump-iso-builder')
        .description('从 UUP Dump 下载并构建 Windows ISO 镜像 / Download and build Windows ISO from UUP Dump')
        .version('1.0.0')
        .option('-t, --target <target>', '目标配置名称 / Target configuration name')
        .option('-o, --output <path>', '输出目录 / Output directory', './output')
        .option('-l, --list', '列出所有可用的目标配置 / List all available target configurations')
        .option('-v, --verbose', '详细输出 / Verbose output')
        .parse();

    // Parse command-line options / 解析命令行选项
    const options = program.opts() as {
        target?: string;
        output?: string;
        list?: boolean;
        verbose?: boolean;
    };

    // Enable verbose mode if requested / 如果请求则启用详细模式
    if (options.verbose) {
        // Verbose mode - Logger class doesn't support dynamic level setting yet
        // 详细模式 - Logger类暂不支持动态设置级别
        mainLogger.debug('启用详细输出模式 / Verbose output mode enabled');
    }

    // Handle list command - display all available targets / 处理列表命令 - 显示所有可用目标
    if (options.list) {
        console.log('\n可用的目标配置 / Available target configurations:');
        Object.entries(TARGETS).forEach(([key, target]: [string, TargetConfig]) => {
            console.log(`  ${key}: ${target.name}`);
            console.log(`    描述 / Description: ${target.description}`);
            console.log(`    语言 / Language: ${target.language}, 架构 / Architecture: ${target.architecture}`);
            console.log(`    SKU: ${target.sku}`);
            console.log('');
        });
        return;
    }

    // Validate that target is specified / 验证是否指定了目标
    if (!options.target) {
        console.log('请指定目标配置名称，使用 -t 或 --target 参数');
        console.log('Please specify target configuration name using -t or --target parameter');
        console.log('使用 -l 或 --list 查看所有可用的目标配置');
        console.log('Use -l or --list to see all available target configurations');
        process.exit(1);
    }

    // Get target configuration / 获取目标配置
    const targetConfig = getTargetByName(options.target);
    if (!targetConfig) {
        mainLogger.error(`未找到目标配置 / Target configuration not found: ${options.target}`);
        mainLogger.info('使用 -l 或 --list 查看所有可用目标 / Use -l or --list to see all available targets');
        process.exit(1);
    }

    try {
        // Start the ISO building process / 开始 ISO 构建过程
        mainLogger.info(`开始构建 / Starting build: ${targetConfig.name}`);
        mainLogger.info(`输出目录 / Output directory: ${options.output || './output'}`);

        // Initialize scraper and builder / 初始化爬虫和构建器
        const scraper = new UupDumpScraper();
        const builder = new WindowsIsoBuilder(scraper, options.output || './output');

        // Execute the build process / 执行构建过程
        const result: BuildResult = await builder.buildIso(targetConfig);

        // Handle build result / 处理构建结果
        if (result.success) {
            mainLogger.info(`构建成功! / Build successful!`);
            mainLogger.info(`ISO 文件 / ISO file: ${result.isoPath}`);
        } else {
            mainLogger.error(`构建失败 / Build failed: ${result.error}`);
            process.exit(1);
        }
    } catch (error: any) {
        mainLogger.error('构建过程中发生错误 / Error occurred during build process:', error.message);
        process.exit(1);
    }
}

// Main program entry point / 主程序入口点
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file path for ES modules / 获取 ES 模块的当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Execute main function if this file is run directly / 如果直接运行此文件则执行主函数
if (process.argv[1] === __filename) {
    main().catch(error => {
        logger.error('程序执行失败 / Program execution failed:', error);
        process.exit(1);
    });
}