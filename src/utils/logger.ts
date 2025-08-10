import { Logger as ILogger, LogLevel } from '../types/index.js';

class Logger implements ILogger {
    private name: string;

    constructor(name: string = 'UUP-DUMP') {
        this.name = name;
    }

    private _formatMessage(level: string, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] ${level.padEnd(5)} ${message}`;
    }

    debug(message: string, ...args: any[]): void {
        console.debug(this._formatMessage('DEBUG', message), ...args);
    }

    info(message: string, ...args: any[]): void {
        console.info(this._formatMessage('INFO', message), ...args);
    }

    warn(message: string, ...args: any[]): void {
        console.warn(this._formatMessage('WARN', message), ...args);
    }

    error(message: string, ...args: any[]): void {
        console.error(this._formatMessage('ERROR', message), ...args);
    }
}

export default Logger;
export const logger = new Logger();