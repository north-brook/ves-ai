/**
 * Semaphore for controlling concurrent access to resources
 * Useful for rate limiting API calls or limiting parallel operations
 */
export class Semaphore {
  private count: number;
  private waiting: (() => void)[] = [];

  constructor(private max: number) {
    this.count = max;
  }

  /**
   * Acquire a semaphore slot. If none available, waits until one is released.
   */
  async acquire(): Promise<void> {
    if (this.count > 0) {
      this.count--;
      return;
    }

    // Wait for a slot to become available
    await new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  /**
   * Release a semaphore slot, allowing waiting operations to proceed
   */
  release(): void {
    this.count++;
    const resolve = this.waiting.shift();
    if (resolve) {
      this.count--; // Immediately allocate to waiting task
      resolve();
    }
  }

  /**
   * Execute a function with semaphore protection
   * @param fn Function to execute
   * @returns Result of the function
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}
