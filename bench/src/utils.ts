import chalk from "chalk";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

export interface BenchmarkResult {
  endpoint: string;
  testType: string;
  timestamp: Date;
  duration: number;
  requests: number;
  rps: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  maxLatency: number;
  minLatency: number;
  errors: number;
  errorRate: number;
  bytesTransferred?: number;
  metadata?: Record<string, any>;
}

export class Logger {
  static info(message: string) {
    console.log(chalk.blue(`ℹ️  ${message}`));
  }

  static success(message: string) {
    console.log(chalk.green(`✅ ${message}`));
  }

  static error(message: string) {
    console.log(chalk.red(`❌ ${message}`));
  }

  static warning(message: string) {
    console.log(chalk.yellow(`⚠️  ${message}`));
  }

  static testStart(testName: string, endpoint: string) {
    console.log(chalk.cyan(`\n🧪 Starting ${testName} test for ${endpoint}`));
  }

  static testComplete(testName: string, endpoint: string, duration: number) {
    console.log(
      chalk.green(
        `✅ Completed ${testName} test for ${endpoint} in ${duration}ms`
      )
    );
  }
}

export const TEST_TYPES = [
  "burst-traffic",
  "cold-start",
  "concurrency",
  "error-handling",
  "payload-size",
  "throughput",
  "warm-latency",
] as const;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function saveResult(result: BenchmarkResult, filename?: string) {
  const resultsDir = join(process.cwd(), "results");
  if (!existsSync(resultsDir)) {
    mkdirSync(resultsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const defaultFilename = `${result.testType}-${result.endpoint.replace(
    "/",
    ""
  )}-${timestamp}.json`;
  const filepath = join(resultsDir, filename || defaultFilename);

  writeFileSync(filepath, JSON.stringify(result, null, 2));
  Logger.info(`Results saved to ${filepath}`);
}

export async function waitForColdStart(minutes: number) {
  Logger.info(`Waiting ${minutes} minutes for cold start...`);
  await sleep(minutes * 60 * 1000);
  Logger.success("Cold start wait complete");
}

export function createProgressBar(total: number) {
  let current = 0;

  return {
    increment() {
      current++;
      const percentage = Math.round((current / total) * 100);
      const bar =
        "█".repeat(Math.round(percentage / 5)) +
        "░".repeat(20 - Math.round(percentage / 5));
      process.stdout.write(`\r[${bar}] ${percentage}% (${current}/${total})`);

      if (current >= total) {
        console.log(""); // New line when complete
      }
    },
  };
}
