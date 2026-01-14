import morgan from 'morgan';
import chalk from 'chalk';
import { logger } from '../utils/logger';

// Add user info to logs
morgan.token('user', (req: any) => {
  return req.user?.userId || 'guest';
});

morgan.token('status-colored', (req: any, res: any) => {
  const status = res.statusCode;
  
  if (status >= 500) return chalk.red(status);      // Red for 5xx
  if (status >= 400) return chalk.yellow(status);   // Yellow for 4xx
  if (status >= 300) return chalk.cyan(status);     // Cyan for 3xx
  if (status >= 200) return chalk.green(status);    // Green for 2xx
  return chalk.white(status);                       // White for others
});

const format = ':method :url :status-colored :response-time ms - User: :user';
export const httpLogger = morgan(format, {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    },
  },
});

export default httpLogger;