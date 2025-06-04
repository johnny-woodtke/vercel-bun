#!/usr/bin/env bun

import { getConfig } from "./config";
import {
  createProgressBar,
  Logger,
  saveResult,
  waitForColdStart,
  type BenchmarkResult,
} from "./utils";

interface ColdStartResult {
  endpoint: string;
  iteration: number;
  responseTime: number;
  ttfb: number; // Time to First Byte
  success: boolean;
  error?: string;
}

async function measureColdStart(
  url: string,
  endpoint: string
): Promise<ColdStartResult> {
  const fullUrl = `${url}${endpoint}`;
  const startTime = performance.now();

  try {
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ test: "cold-start", timestamp: Date.now() }),
    });

    const ttfb = performance.now() - startTime;
    await response.text(); // Consume response body
    const responseTime = performance.now() - startTime;

    return {
      endpoint,
      iteration: 0,
      responseTime,
      ttfb,
      success: response.ok,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    return {
      endpoint,
      iteration: 0,
      responseTime,
      ttfb: responseTime,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function runColdStartTest(): Promise<void> {
  const config = getConfig();
  const { baseUrl, endpoints, tests } = config;

  Logger.info("🧪 Cold Start Latency Benchmark");
  Logger.info(`Testing endpoints: ${Object.values(endpoints).join(", ")}`);
  Logger.info(`Iterations per endpoint: ${tests.coldStart.iterations}`);
  Logger.info(`Cold start wait time: ${tests.coldStart.waitTime} minutes\n`);

  const results: Record<string, ColdStartResult[]> = {};

  for (const [name, endpoint] of Object.entries(endpoints)) {
    Logger.testStart("Cold Start", name);
    results[name] = [];

    const progress = createProgressBar(tests.coldStart.iterations);

    for (let i = 0; i < tests.coldStart.iterations; i++) {
      // Wait for cold start
      await waitForColdStart(tests.coldStart.waitTime);

      const result = await measureColdStart(baseUrl, endpoint);
      result.iteration = i + 1;
      results[name].push(result);

      progress.increment();

      Logger.info(
        `Iteration ${i + 1}: ${result.responseTime.toFixed(
          2
        )}ms (TTFB: ${result.ttfb.toFixed(2)}ms) - ${
          result.success ? "SUCCESS" : "FAILED"
        }`
      );
    }

    Logger.testComplete("Cold Start", name, 0);
  }

  // Calculate and display results
  console.log("\n📊 Cold Start Results Summary:\n");

  for (const [name, endpointResults] of Object.entries(results)) {
    const successful = endpointResults.filter((r) => r.success);
    const failed = endpointResults.filter((r) => !r.success);

    if (successful.length === 0) {
      Logger.error(`${name}: All requests failed`);
      continue;
    }

    const responseTimes = successful.map((r) => r.responseTime);
    const ttfbs = successful.map((r) => r.ttfb);

    const avgResponseTime =
      responseTimes.reduce((sum, time) => sum + time, 0) / successful.length;
    const avgTtfb =
      ttfbs.reduce((sum, time) => sum + time, 0) / successful.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    const sortedResponseTimes = responseTimes.sort((a, b) => a - b);
    const p95ResponseTime =
      sortedResponseTimes[Math.floor(successful.length * 0.95)] || 0;
    const p99ResponseTime =
      sortedResponseTimes[Math.floor(successful.length * 0.99)] ||
      p95ResponseTime;

    console.log(`${name.toUpperCase()}:`);
    console.log(
      `  Success Rate: ${(
        (successful.length / endpointResults.length) *
        100
      ).toFixed(1)}%`
    );
    console.log(`  Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Avg TTFB: ${avgTtfb.toFixed(2)}ms`);
    console.log(`  Min Response Time: ${minResponseTime.toFixed(2)}ms`);
    console.log(`  Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
    console.log(`  P95 Response Time: ${p95ResponseTime.toFixed(2)}ms`);
    console.log(`  Failed Requests: ${failed.length}\n`);

    // Save individual results
    const benchmarkResult: BenchmarkResult = {
      endpoint: name,
      testType: "cold-start",
      timestamp: new Date(),
      duration: 0, // Not applicable for cold start
      requests: successful.length,
      rps: 0, // Not applicable
      avgLatency: avgResponseTime,
      p95Latency: p95ResponseTime,
      p99Latency: p99ResponseTime,
      maxLatency: maxResponseTime,
      minLatency: minResponseTime,
      errors: failed.length,
      errorRate: (failed.length / endpointResults.length) * 100,
      metadata: {
        ttfb: {
          avg: avgTtfb,
          min: Math.min(...ttfbs),
          max: Math.max(...ttfbs),
        },
        waitTime: tests.coldStart.waitTime,
        iterations: tests.coldStart.iterations,
      },
    };

    saveResult(benchmarkResult);
  }

  // Compare results
  const endpointNames = Object.keys(results);
  if (endpointNames.length === 2) {
    const [endpoint1, endpoint2] = endpointNames;
    if (endpoint1 && endpoint2) {
      const results1 = results[endpoint1]?.filter((r) => r.success) || [];
      const results2 = results[endpoint2]?.filter((r) => r.success) || [];

      if (results1.length > 0 && results2.length > 0) {
        const avg1 =
          results1.reduce((sum: number, r) => sum + r.responseTime, 0) /
          results1.length;
        const avg2 =
          results2.reduce((sum: number, r) => sum + r.responseTime, 0) /
          results2.length;

        const faster = avg1 < avg2 ? endpoint1 : endpoint2;
        const improvement = Math.abs(
          ((avg1 - avg2) / Math.max(avg1, avg2)) * 100
        );

        if (faster) {
          Logger.success(
            `🏆 ${faster.toUpperCase()} is ${improvement.toFixed(
              1
            )}% faster for cold starts`
          );
        }
      }
    }
  }
}

if (import.meta.main) {
  runColdStartTest().catch(console.error);
}
