import { sleep } from "k6";
import { Trend } from "k6/metrics";

import {
  createBaseSummary,
  createCommonMetrics,
  createPayload,
  createRequestParams,
  createStandardThresholds,
  executeRequest,
  getCommonConfig,
  safeMetric,
  saveResults,
} from "./k6-utils.ts";

// Configuration using common utilities
const config = getCommonConfig();
const { baseUrl, endpoint, coldStartWaitTimeMins, coldStartIterations } =
  config;

// Custom metrics using common utilities plus cold start specific metrics
const metrics = createCommonMetrics();
const ttfbMetric = new Trend("time_to_first_byte");

export const options = {
  scenarios: {
    cold_start_test: {
      executor: "per-vu-iterations",
      vus: 1, // Single VU to ensure proper cold start isolation
      iterations: coldStartIterations,
      maxDuration: `${(coldStartWaitTimeMins * coldStartIterations + 5) * 60}s`, // Buffer for execution time
    },
  },
  thresholds: {
    ...createStandardThresholds({
      maxLatencyP95: 10000, // Allow higher latency for cold starts
      maxErrorRate: 0.1, // Allow some failures during cold starts
      minSuccessRate: 0.9,
    }),
    time_to_first_byte: ["p(95)<8000"], // TTFB threshold for cold starts
  },
};

export default function () {
  const url = `${baseUrl}${endpoint}`;

  // Log cold start attempt
  console.log(
    `🧪 Cold Start Test - Iteration ${__ITER + 1}/${coldStartIterations}`
  );

  // Wait for cold start if not the first iteration
  if (__ITER > 0) {
    const waitTimeSeconds = coldStartWaitTimeMins * 60;
    console.log(
      `⏳ Waiting ${coldStartWaitTimeMins} minutes for cold start...`
    );
    sleep(waitTimeSeconds);
    console.log("✅ Cold start wait complete");
  }

  // Create payload using utility with cold start specific data
  const payload = createPayload("cold-start", {
    iteration: __ITER + 1,
    waitTime: coldStartWaitTimeMins,
    timestamp: Date.now(),
  });

  // Create request params using utility
  const params = createRequestParams("cold-start", endpoint, {
    iteration: (__ITER + 1).toString(),
  });

  // Track TTFB separately for cold start analysis
  const startTime = Date.now();

  // Execute request with common logic (allow higher latency for cold starts)
  const { response, checkResult } = executeRequest(
    url,
    payload,
    params,
    metrics,
    10000 // 10 second timeout for cold starts
  );

  // Calculate and record TTFB
  const ttfb = response.timings.waiting;
  ttfbMetric.add(ttfb);

  // Log detailed results for each iteration
  console.log(
    `📊 Iteration ${__ITER + 1}: ${response.timings.duration.toFixed(
      2
    )}ms (TTFB: ${ttfb.toFixed(2)}ms) - ${
      checkResult.overall ? "SUCCESS" : "FAILED"
    }`
  );

  if (!checkResult.overall) {
    console.warn(
      `❌ Cold start failed - Status: ${response.status}, Error: ${
        response.error || "Unknown"
      }`
    );
  }
}

export function handleSummary(data: any) {
  const endpoint_name = endpoint.replace("/api/", "").replace("/", "-");

  // Calculate total test duration
  const totalDuration =
    (coldStartWaitTimeMins * (coldStartIterations - 1) + 2) * 60 * 1000; // Rough estimate

  // Create base summary using utility
  const baseSummary = createBaseSummary(
    data,
    "cold-start",
    endpoint,
    totalDuration,
    {
      waitTimeMinutes: coldStartWaitTimeMins,
      iterations: coldStartIterations,
    }
  );

  // Calculate cold start specific metrics
  const avgTtfb = safeMetric(data.metrics.time_to_first_byte?.values?.avg);
  const p95Ttfb = safeMetric(
    data.metrics.time_to_first_byte?.values?.["p(95)"]
  );
  const maxTtfb = safeMetric(data.metrics.time_to_first_byte?.values?.max);
  const minTtfb = safeMetric(data.metrics.time_to_first_byte?.values?.min);

  const successfulRequests = baseSummary.requests - baseSummary.errors;
  const successRate = (successfulRequests / baseSummary.requests) * 100;

  // Extended summary with cold start specific data
  const summary = {
    ...baseSummary,
    coldStartMetrics: {
      avgTtfb: avgTtfb,
      p95Ttfb: p95Ttfb,
      maxTtfb: maxTtfb,
      minTtfb: minTtfb,
      successRate: successRate,
      totalIterations: coldStartIterations,
      waitTime: coldStartWaitTimeMins,
    },
    metadata: {
      ...baseSummary.metadata,
      waitTimeMinutes: coldStartWaitTimeMins,
      iterations: coldStartIterations,
      avgTtfb: avgTtfb,
      p95Ttfb: p95Ttfb,
    },
  };

  // Log results using utility
  console.log("\n📊 Cold Start Test Results Summary:\n");

  console.log(`${endpoint_name.toUpperCase()}:`);
  console.log(`  Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`  Avg Response Time: ${baseSummary.avgLatency.toFixed(2)}ms`);
  console.log(`  Avg TTFB: ${avgTtfb.toFixed(2)}ms`);
  console.log(`  Min Response Time: ${baseSummary.minLatency.toFixed(2)}ms`);
  console.log(`  Max Response Time: ${baseSummary.maxLatency.toFixed(2)}ms`);
  console.log(`  P95 Response Time: ${baseSummary.p95Latency.toFixed(2)}ms`);
  console.log(`  P95 TTFB: ${p95Ttfb.toFixed(2)}ms`);
  console.log(`  Failed Requests: ${baseSummary.errors}`);
  console.log(`  Total Iterations: ${coldStartIterations}`);
  console.log(
    `  Wait Time Between Iterations: ${coldStartWaitTimeMins} minutes\n`
  );

  // Performance assessment
  if (successRate >= 90 && baseSummary.p95Latency < 8000) {
    console.log("✅ Cold start performance is acceptable");
  } else {
    console.log("⚠️  Cold Start Performance Issues Detected:");
    if (successRate < 90) {
      console.log(
        `   • Low success rate: ${successRate.toFixed(1)}% (threshold: 90%)`
      );
    }
    if (baseSummary.p95Latency >= 8000) {
      console.log(
        `   • High P95 latency: ${baseSummary.p95Latency.toFixed(
          2
        )}ms (threshold: 8000ms)`
      );
    }
  }

  // Save results using utility
  return saveResults(summary, `cold-start-${endpoint_name}`);
}
