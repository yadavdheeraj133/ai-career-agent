/**
 * Lightweight in-process scheduler built on Node timers.
 *
 * No external queue/worker dependency: each task reschedules itself after it
 * finishes (so a slow run never overlaps itself) and failures are caught and
 * logged so one bad run cannot kill the scheduler.
 */
import type { AggregationLogger } from "./aggregation.service.js";

export interface ScheduledTask {
  name: string;
  intervalMs: number;
  run: () => Promise<unknown>;
}

const silentLogger: AggregationLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

export class AutomationScheduler {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly running = new Set<string>();
  private stopped = true;
  private readonly logger: AggregationLogger;

  constructor(
    private readonly tasks: ScheduledTask[],
    logger?: AggregationLogger
  ) {
    this.logger = logger ?? silentLogger;
  }

  get isRunning(): boolean {
    return !this.stopped;
  }

  async runOnce(name: string): Promise<unknown> {
    const task = this.tasks.find((candidate) => candidate.name === name);
    if (!task) {
      throw new Error(`Unknown automation task "${name}"`);
    }
    return this.execute(task);
  }

  async runAll(): Promise<void> {
    for (const task of this.tasks) {
      await this.execute(task);
    }
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    for (const task of this.tasks) {
      this.schedule(task);
    }
    this.logger.info("Automation scheduler started", {
      tasks: this.tasks.map((task) => task.name),
    });
  }

  stop(): void {
    this.stopped = true;
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.logger.info("Automation scheduler stopped");
  }

  private schedule(task: ScheduledTask): void {
    const timer = setTimeout(() => {
      void this.tick(task);
    }, task.intervalMs);
    timer.unref?.();
    this.timers.set(task.name, timer);
  }

  private async tick(task: ScheduledTask): Promise<void> {
    await this.execute(task);
    if (!this.stopped) {
      this.schedule(task);
    }
  }

  private async execute(task: ScheduledTask): Promise<unknown> {
    if (this.running.has(task.name)) {
      this.logger.warn("Skipped overlapping automation run", {
        task: task.name,
      });
      return undefined;
    }

    this.running.add(task.name);
    try {
      return await task.run();
    } catch (error) {
      this.logger.error("Automation task failed", {
        task: task.name,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    } finally {
      this.running.delete(task.name);
    }
  }
}
