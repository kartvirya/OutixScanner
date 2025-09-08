// Enhanced logging utility for better console output
export class Logger {
  private static isDevelopment = __DEV__;

  static info(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`ℹ️ ${message}`, data ? data : '');
    }
  }

  static success(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`✅ ${message}`, data ? data : '');
    }
  }

  static warning(message: string, data?: any) {
    if (this.isDevelopment) {
      console.warn(`⚠️ ${message}`, data ? data : '');
    }
  }

  static error(message: string, data?: any) {
    if (this.isDevelopment) {
      console.error(`❌ ${message}`, data ? data : '');
    }
  }

  static debug(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`🐛 ${message}`, data ? data : '');
    }
  }

  static scan(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`📱 ${message}`, data ? data : '');
    }
  }

  static navigation(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`🔄 ${message}`, data ? data : '');
    }
  }

  static api(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`🌐 ${message}`, data ? data : '');
    }
  }

  static camera(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`📷 ${message}`, data ? data : '');
    }
  }

  static ticket(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`🎫 ${message}`, data ? data : '');
    }
  }

  static group(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`👥 ${message}`, data ? data : '');
    }
  }

  static performance(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`⚡ ${message}`, data ? data : '');
    }
  }
}

// Export individual functions for convenience
export const log = {
  info: Logger.info,
  success: Logger.success,
  warning: Logger.warning,
  error: Logger.error,
  debug: Logger.debug,
  scan: Logger.scan,
  navigation: Logger.navigation,
  api: Logger.api,
  camera: Logger.camera,
  ticket: Logger.ticket,
  group: Logger.group,
  performance: Logger.performance,
};

