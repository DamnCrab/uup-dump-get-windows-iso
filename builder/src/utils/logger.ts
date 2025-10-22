/**
 * Logger Utility Class
 * 日志工具类
 * 
 * Provides consistent logging functionality across the application with timestamp formatting.
 * Supports different log levels: debug, info, warn, and error.
 * 
 * 为应用程序提供一致的日志功能，包含时间戳格式化。
 * 支持不同的日志级别：调试、信息、警告和错误。
 */

import { Logger as ILogger, LogLevel } from '../types/index.js';

/**
 * Logger class implementation
 * 日志类实现
 */
class Logger implements ILogger {
    private name: string; // Logger name / 日志器名称

    /**
     * Constructor for Logger
     * 日志器构造函数
     * 
     * @param name - Logger name, defaults to 'UUP-DUMP' / 日志器名称，默认为 'UUP-DUMP'
     */
    constructor(name: string = 'UUP-DUMP') {
        this.name = name;
    }

    /**
     * Format log message with timestamp and level
     * 使用时间戳和级别格式化日志消息
     * 
     * @param level - Log level / 日志级别
     * @param message - Log message / 日志消息
     * @returns Formatted message / 格式化的消息
     */
    private _formatMessage(level: string, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] ${level.padEnd(5)} ${message}`;
    }

    /**
     * Log debug message
     * 记录调试消息
     */
    debug(message: string, ...args: any[]): void {
        console.debug(this._formatMessage('DEBUG', message), ...args);
    }

    /**
     * Log info message
     * 记录信息消息
     */
    info(message: string, ...args: any[]): void {
        console.info(this._formatMessage('INFO', message), ...args);
    }

    /**
     * Log warning message
     * 记录警告消息
     */
    warn(message: string, ...args: any[]): void {
        console.warn(this._formatMessage('WARN', message), ...args);
    }

    /**
     * Log error message
     * 记录错误消息
     */
    error(message: string, ...args: any[]): void {
        console.error(this._formatMessage('ERROR', message), ...args);
    }
}

export default Logger;
// Default logger instance / 默认日志器实例
export const logger = new Logger();