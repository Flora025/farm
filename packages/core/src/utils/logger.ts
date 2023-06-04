import chalk from 'chalk';

export const brandColor = chalk.rgb(113, 26, 95);

type LogLevelNames = 'trace' | 'debug' | 'info' | 'warn' | 'error';

enum LogLevel {
  Trace = 'trace',
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error'
}

export interface Logger {
  trace(message: string): void;
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string | Error): void;
}

export class DefaultLogger implements Logger {
  constructor(
    public level: LogLevelNames = 'info',
    private name: string = 'Farm',
    private levelValues: Record<LogLevelNames, number> = {
      trace: 0,
      debug: 1,
      info: 2,
      warn: 3,
      error: 4
    },
    private prefix?: string
  ) {
    this.prefix = brandColor(`[ ${this.name} ] `);
  }

  private logMessage(
    level: LogLevelNames,
    message: string,
    color?: any,
    showBanner?: boolean
  ): void {
    if (this.levelValues[this.level] <= this.levelValues[level]) {
      const loggerMessage = color
        ? color(`${showBanner ? this.prefix : ''}${message}`)
        : `${showBanner ? this.prefix : ''}${message}`;
      console.log(loggerMessage);
    }
  }

  trace(message: string): void {
    this.logMessage(LogLevel.Trace, message, chalk.magenta);
  }

  debug(message: string): void {
    this.logMessage(LogLevel.Debug, message, chalk.blue);
  }

  info(message: string): void {
    this.logMessage(LogLevel.Info, message);
  }

  warn(message: string): void {
    this.logMessage(LogLevel.Warn, message, chalk.yellow);
  }

  error(message: string | Error): void {
    const errorMessage =
      message instanceof Error ? message.stack : `${message}`;
    this.logMessage(LogLevel.Error, errorMessage, chalk.red);
  }
}
