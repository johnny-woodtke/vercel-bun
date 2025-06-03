import chalk from "chalk";
import { writeFileSync, existsSync, mkdirSync } from "fs";
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

export function generatePayload(sizeInBytes: number): string {
  const data = {
    id: Math.random().toString(36).substring(2, 15),
    timestamp: new Date().toISOString(),
    message: "A".repeat(Math.max(0, sizeInBytes - 100)), // Account for JSON overhead
    metadata: {
      size: sizeInBytes,
      test: true,
    },
  };

  const payload = JSON.stringify(data);

  // Adjust payload size to match target
  if (payload.length < sizeInBytes) {
    data.message += "A".repeat(sizeInBytes - payload.length);
  } else if (payload.length > sizeInBytes) {
    data.message = data.message.substring(
      0,
      data.message.length - (payload.length - sizeInBytes)
    );
  }

  return JSON.stringify(data);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatLatency(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatBytes(bytes: number): string {
  const sizes = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
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

export function calculateStats(latencies: number[]) {
  if (latencies.length === 0) return null;

  const sorted = [...latencies].sort((a, b) => a - b);
  const len = sorted.length;

  return {
    min: sorted[0],
    max: sorted[len - 1],
    avg: latencies.reduce((sum, val) => sum + val, 0) / len,
    p50: sorted[Math.floor(len * 0.5)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)],
  };
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
