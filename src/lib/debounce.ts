/**
 * Utilities para debounce e throttle
 */

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Rate limiter para subscriptions
export class SubscriptionManager {
  private static channels = new Map<string, unknown>();

  static createChannel(key: string, factory: () => unknown) {
    if (this.channels.has(key)) {
      return this.channels.get(key);
    }

    const channel = factory();
    this.channels.set(key, channel);
    return channel;
  }

  static removeChannel(key: string) {
    const channel = this.channels.get(key);
    if (channel) {
      this.channels.delete(key);
      return channel;
    }
  }

  static clear() {
    this.channels.clear();
  }
}
