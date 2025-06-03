#!/usr/bin/env bun

import chalk from "chalk";
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { getConfig } from "./config";
import { Logger } from "./utils";

interface TestResult {
  endpoint: string;
  testType: string;
  timestamp: Date;
  success: boolean;
  duration: number;
  summary: any;
  error?: string;
}

interface ComparisonResult {
  testType: string;
  bunResult: any;
  nodeResult: any;
  winner: "bun" | "node" | "tie";
  improvement: number;
  metric: string;
}

async function runTest(
  testType: string,
  endpoint: string,
  endpointPath: string
): Promise<TestResult> {
  const config = getConfig();
  const startTime = Date.now();

  Logger.testStart(testType, endpoint);

  try {
    let command: string;
    const env = {
      BASE_URL: config.baseUrl,
      ENDPOINT: endpointPath,
    };

    switch (testType) {
      case "cold-start":
        command = "bun run benchmarks/cold-start.ts";
        break;
      case "warm-latency":
        command = "k6 run benchmarks/warm-latency.js";
        Object.assign(env, {
          DURATION: config.tests.warm.duration,
          RPS: config.tests.warm.rps[1].toString(), // Use moderate RPS
        });
        break;
      case "throughput":
        command = "k6 run benchmarks/throughput.js";
        Object.assign(env, {
          MAX_RPS: config.tests.throughput.maxRps.toString(),
          RAMP_UP_DURATION: config.tests.throughput.rampUpDuration,
          SUSTAIN_DURATION: config.tests.throughput.sustainDuration,
        });
        break;
      case "concurrency":
        command = "k6 run benchmarks/concurrency.js";
        Object.assign(env, {
          MAX_CONNECTIONS: config.tests.concurrency.connections[2].toString(), // Use mid-range
          DURATION: config.tests.concurrency.duration,
        });
        break;
      case "payload-size":
        command = "k6 run benchmarks/payload-size.js";
        Object.assign(env, {
          PAYLOAD_SIZE: config.tests.payload.sizes[2].toString(), // 100KB
          ITERATIONS: config.tests.payload.iterations.toString(),
        });
        break;
      case "burst-traffic":
        command = "k6 run benchmarks/burst-traffic.js";
        Object.assign(env, {
          BURST_REQUESTS: config.tests.burst.requests.toString(),
          BURST_DURATION: config.tests.burst.duration,
        });
        break;
      case "error-handling":
        command = "k6 run benchmarks/error-handling.js";
        break;
      default:
        throw new Error(`Unknown test type: ${testType}`);
    }

    // Set environment variables and run command
    const envString = Object.entries(env)
      .map(([key, value]) => `${key}="${value}"`)
      .join(" ");

    const fullCommand = `${envString} ${command}`;

    console.log(chalk.dim(`Running: ${fullCommand}`));

    const output = execSync(fullCommand, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
    });

    const duration = Date.now() - startTime;
    Logger.testComplete(testType, endpoint, duration);

    // Try to find and parse the result file
    let summary = null;
    const resultsDir = join(process.cwd(), "results");
    if (existsSync(resultsDir)) {
      // Look for the most recent result file for this test
      const files = require("fs")
        .readdirSync(resultsDir)
        .filter(
          (file: string) => file.includes(testType) && file.includes(endpoint)
        )
        .sort()
        .reverse();

      if (files.length > 0) {
        const resultFile = join(resultsDir, files[0]);
        try {
          summary = JSON.parse(readFileSync(resultFile, "utf8"));
        } catch (e) {
          Logger.warning(`Could not parse result file: ${resultFile}`);
        }
      }
    }

    return {
      endpoint,
      testType,
      timestamp: new Date(),
      success: true,
      duration,
      summary,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    Logger.error(
      `Test failed for ${endpoint} ${testType}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );

    return {
      endpoint,
      testType,
      timestamp: new Date(),
      success: false,
      duration,
      summary: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function compareResults(
  bunResults: TestResult[],
  nodeResults: TestResult[]
): ComparisonResult[] {
  const comparisons: ComparisonResult[] = [];

  const testTypes = [
    "cold-start",
    "warm-latency",
    "throughput",
    "concurrency",
    "payload-size",
    "burst-traffic",
    "error-handling",
  ];

  for (const testType of testTypes) {
    const bunResult = bunResults.find(
      (r) => r.testType === testType && r.success
    );
    const nodeResult = nodeResults.find(
      (r) => r.testType === testType && r.success
    );

    if (
      !bunResult ||
      !nodeResult ||
      !bunResult.summary ||
      !nodeResult.summary
    ) {
      continue;
    }

    let winner: "bun" | "node" | "tie" = "tie";
    let improvement = 0;
    let metric = "";

    // Compare based on test type
    switch (testType) {
      case "cold-start":
      case "warm-latency":
      case "payload-size":
        // Lower latency is better
        const bunLatency =
          bunResult.summary.avgLatency || bunResult.summary.p95Latency || 0;
        const nodeLatency =
          nodeResult.summary.avgLatency || nodeResult.summary.p95Latency || 0;

        if (bunLatency < nodeLatency) {
          winner = "bun";
          improvement = ((nodeLatency - bunLatency) / nodeLatency) * 100;
        } else if (nodeLatency < bunLatency) {
          winner = "node";
          improvement = ((bunLatency - nodeLatency) / bunLatency) * 100;
        }
        metric = "Average Latency (ms)";
        break;

      case "throughput":
        // Higher RPS is better
        const bunRps =
          bunResult.summary.actualRps || bunResult.summary.rps || 0;
        const nodeRps =
          nodeResult.summary.actualRps || nodeResult.summary.rps || 0;

        if (bunRps > nodeRps) {
          winner = "bun";
          improvement = ((bunRps - nodeRps) / nodeRps) * 100;
        } else if (nodeRps > bunRps) {
          winner = "node";
          improvement = ((nodeRps - bunRps) / bunRps) * 100;
        }
        metric = "Requests per Second";
        break;

      case "concurrency":
        // Higher effective connections is better
        const bunConns = bunResult.summary.effectiveMaxConnections || 0;
        const nodeConns = nodeResult.summary.effectiveMaxConnections || 0;

        if (bunConns > nodeConns) {
          winner = "bun";
          improvement = ((bunConns - nodeConns) / nodeConns) * 100;
        } else if (nodeConns > bunConns) {
          winner = "node";
          improvement = ((nodeConns - bunConns) / bunConns) * 100;
        }
        metric = "Max Concurrent Connections";
        break;

      case "burst-traffic":
        // Higher efficiency is better
        const bunEfficiency = bunResult.summary.burstEfficiency || 0;
        const nodeEfficiency = nodeResult.summary.burstEfficiency || 0;

        if (bunEfficiency > nodeEfficiency) {
          winner = "bun";
          improvement =
            ((bunEfficiency - nodeEfficiency) / nodeEfficiency) * 100;
        } else if (nodeEfficiency > bunEfficiency) {
          winner = "node";
          improvement =
            ((nodeEfficiency - bunEfficiency) / bunEfficiency) * 100;
        }
        metric = "Burst Efficiency (%)";
        break;

      case "error-handling":
        // Higher stability rate is better
        const bunStability = bunResult.summary.stabilityRate || 0;
        const nodeStability = nodeResult.summary.stabilityRate || 0;

        if (bunStability > nodeStability) {
          winner = "bun";
          improvement = ((bunStability - nodeStability) / nodeStability) * 100;
        } else if (nodeStability > bunStability) {
          winner = "node";
          improvement = ((nodeStability - bunStability) / bunStability) * 100;
        }
        metric = "System Stability (%)";
        break;
    }

    comparisons.push({
      testType,
      bunResult: bunResult.summary,
      nodeResult: nodeResult.summary,
      winner,
      improvement: Math.abs(improvement),
      metric,
    });
  }

  return comparisons;
}

function generateReport(
  comparisons: ComparisonResult[],
  bunResults: TestResult[],
  nodeResults: TestResult[]
) {
  console.log(chalk.cyan("\n🏆 BENCHMARK COMPARISON REPORT"));
  console.log(chalk.cyan("=====================================\n"));

  let bunWins = 0;
  let nodeWins = 0;
  let ties = 0;

  for (const comparison of comparisons) {
    const { testType, winner, improvement, metric } = comparison;

    console.log(chalk.bold(`📊 ${testType.toUpperCase()}`));
    console.log(`Metric: ${metric}`);

    if (winner === "tie") {
      console.log(chalk.yellow("🤝 TIE - Performance is equivalent"));
      ties++;
    } else {
      const winnerEmoji = winner === "bun" ? "🚀" : "🟢";
      const color = winner === "bun" ? chalk.blue : chalk.green;
      console.log(
        color(
          `${winnerEmoji} ${winner.toUpperCase()} WINS by ${improvement.toFixed(
            1
          )}%`
        )
      );

      if (winner === "bun") bunWins++;
      else nodeWins++;
    }

    console.log("");
  }

  // Overall summary
  console.log(chalk.cyan("📈 OVERALL SUMMARY"));
  console.log(chalk.cyan("=================="));
  console.log(`Bun wins: ${bunWins}`);
  console.log(`Node wins: ${nodeWins}`);
  console.log(`Ties: ${ties}`);

  if (bunWins > nodeWins) {
    console.log(chalk.blue.bold("\n🏆 BUN IS THE OVERALL WINNER! 🚀"));
  } else if (nodeWins > bunWins) {
    console.log(chalk.green.bold("\n🏆 NODE.JS IS THE OVERALL WINNER! 🟢"));
  } else {
    console.log(
      chalk.yellow.bold("\n🤝 IT'S A TIE! Both runtimes perform similarly.")
    );
  }

  // Save detailed report
  const report = {
    timestamp: new Date(),
    summary: {
      bunWins,
      nodeWins,
      ties,
      totalTests: comparisons.length,
    },
    comparisons,
    bunResults: bunResults.map((r) => ({
      ...r,
      summary: r.summary ? "included" : "failed",
    })),
    nodeResults: nodeResults.map((r) => ({
      ...r,
      summary: r.summary ? "included" : "failed",
    })),
  };

  const reportPath = join(
    process.cwd(),
    "results",
    `benchmark-report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(chalk.dim(`\n📄 Detailed report saved to: ${reportPath}`));
}

async function runAllBenchmarks(): Promise<void> {
  console.log(chalk.blue.bold("🧪 STARTING COMPREHENSIVE BENCHMARK SUITE\n"));

  const config = getConfig();
  const testTypes = [
    "cold-start",
    "warm-latency",
    "throughput",
    "concurrency",
    "payload-size",
    "burst-traffic",
    "error-handling",
  ];

  Logger.info(`Base URL: ${config.baseUrl}`);
  Logger.info(`Test Types: ${testTypes.join(", ")}`);
  Logger.info("Starting tests...\n");

  const bunResults: TestResult[] = [];
  const nodeResults: TestResult[] = [];

  // Run tests for both endpoints
  for (const testType of testTypes) {
    console.log(chalk.yellow(`\n🔄 Running ${testType} tests...\n`));

    // Run Bun test
    const bunResult = await runTest(testType, "bun", config.endpoints.bun);
    bunResults.push(bunResult);

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Run Node test
    const nodeResult = await runTest(testType, "node", config.endpoints.node);
    nodeResults.push(nodeResult);

    // Longer delay between test types
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Generate comparison report
  console.log(
    chalk.yellow("\n🔍 Analyzing results and generating report...\n")
  );

  const comparisons = compareResults(bunResults, nodeResults);
  generateReport(comparisons, bunResults, nodeResults);

  Logger.success("All benchmarks completed!");
}

if (import.meta.main) {
  runAllBenchmarks().catch(console.error);
}
