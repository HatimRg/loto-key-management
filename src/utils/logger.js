// Comprehensive logging system for LOTO app
const { ipcRenderer } = window;

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 logs in memory
  }

  async log(level, action, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      action,
      details,
      userMode: details.userMode || 'Unknown'
    };

    // Add to memory
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Send to main process for file writing
    if (ipcRenderer) {
      await ipcRenderer.invoke('write-log', logEntry);
    }

    // Console output for development
    if (level === 'error') {
      console.error(`[${logEntry.timestamp}] ${action}`, details);
    } else if (level === 'warn') {
      console.warn(`[${logEntry.timestamp}] ${action}`, details);
    } else {
      console.log(`[${logEntry.timestamp}] ${action}`, details);
    }
  }

  info(action, details = {}) {
    return this.log('info', action, details);
  }

  warn(action, details = {}) {
    return this.log('warn', action, details);
  }

  error(action, details = {}) {
    return this.log('error', action, details);
  }

  success(action, details = {}) {
    return this.log('success', action, details);
  }

  async getRecentLogs(limit = 100) {
    return this.logs.slice(-limit);
  }

  async downloadLogs() {
    if (ipcRenderer) {
      return await ipcRenderer.invoke('download-logs');
    }
    return { success: false, error: 'IPC not available' };
  }

  async clearLogs() {
    this.logs = [];
    if (ipcRenderer) {
      return await ipcRenderer.invoke('clear-logs');
    }
    return { success: false, error: 'IPC not available' };
  }
}

// Singleton instance
const logger = new Logger();

export default logger;
