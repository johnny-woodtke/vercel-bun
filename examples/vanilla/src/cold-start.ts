import { sleep } from "k6";
import http from "k6/http";
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
} from "./utils.ts";

// Configuration using common utilities
const {
  baseUrl,
  endpoint,
  coldStartWaitTimeMins,
  coldStartIterations,
  coldStartWarmupRequests: warmupRequests,
} = getCommonConfig();

// Custom metrics using common utilities plus cold start specific metrics
const metrics = createCommonMetrics();
const ttfbMetric = new Trend("time_to_first_byte");
const coldStartLatency = new Trend("cold_start_latency");
const warmupLatency = new Trend("warmup_latency");

export const options = {
  scenarios: {
    cold_start_test: {
      executor: "per-vu-iterations",
      vus: 1, // Single VU to ensure proper cold start isolation
      iterations: coldStartIterations + warmupRequests * coldStartIterations, // Cold starts + warmup requests
      maxDuration: `${
        (coldStartWaitTimeMins * coldStartIterations + 10) * 60
      }s`, // Buffer for execution time
    },
  },
  thresholds: {
    ...createStandardThresholds({
      maxLatencyP95: 15000, // Allow higher latency for cold starts
      maxErrorRate: 0.1, // Allow some failures during cold starts
      minSuccessRate: 0.9,
    }),
    time_to_first_byte: ["p(95)<10000"], // TTFB threshold for cold starts
    cold_start_latency: ["p(95)<8000"], // Cold start specific threshold
    warmup_latency: ["p(95)<2000"], // Warmup should be fast
  },
};

interface ColdStartResult {
  iteration: number;
  coldStartLatency: number;
  ttfb: number;
  success: boolean;
  warmupResults: {
    latency: number;
    success: boolean;
  }[];
}

const coldStartResults: ColdStartResult[] = [];
let currentIteration = 0;

export default function () {
  const url = `${baseUrl}${endpoint}`;

  // Determine if this is a cold start iteration or warmup
  const iterationInCycle = __ITER % (1 + warmupRequests);
  const isWarmupRequest = iterationInCycle > 0;

  if (!isWarmupRequest) {
    // This is a new cold start cycle
    currentIteration++;

    console.log(
      `🧪 Cold Start Test - Iteration ${currentIteration}/${coldStartIterations}`
    );

    // Wait for cold start if not the first iteration
    if (currentIteration > 1) {
      const waitTimeSeconds = coldStartWaitTimeMins * 60;
      console.log(
        `⏳ Waiting ${coldStartWaitTimeMins} minutes for cold start...`
      );
      sleep(waitTimeSeconds);
      console.log("✅ Cold start wait complete");
    }

    // Initialize result object for this cold start
    coldStartResults.push({
      iteration: currentIteration,
      coldStartLatency: 0,
      ttfb: 0,
      success: false,
      warmupResults: [],
    });
  }

  const currentResult = coldStartResults[coldStartResults.length - 1];

  if (isWarmupRequest) {
    // This is a warmup request after cold start
    const warmupIndex = iterationInCycle - 1;
    console.log(
      `🔥 Warmup request ${
        warmupIndex + 1
      }/${warmupRequests} for iteration ${currentIteration}`
    );

    // Create payload for warmup
    const payload = createPayload("cold-start-warmup", {
      iteration: currentIteration,
      warmupIndex: warmupIndex + 1,
      timestamp: Date.now(),
    });

    const params = createRequestParams("cold-start-warmup", endpoint, {
      iteration: currentIteration.toString(),
      warmup_index: (warmupIndex + 1).toString(),
    });

    const { response, checkResult } = executeRequest(
      url,
      payload,
      params,
      metrics,
      5000 // 5 second timeout for warmup
    );

    // Record warmup metrics
    warmupLatency.add(response.timings.duration);

    // Store warmup result
    currentResult?.warmupResults.push({
      latency: response.timings.duration,
      success: checkResult.overall,
    });

    console.log(
      `   Warmup ${warmupIndex + 1}: ${response.timings.duration.toFixed(
        2
      )}ms - ${checkResult.overall ? "✅" : "❌"}`
    );

    // Short delay between warmup requests
    sleep(0.5);
  } else {
    // This is the actual cold start request
    console.log(`❄️  Measuring cold start latency...`);

    // Create payload for cold start with specific data
    const payload = createPayload("cold-start", {
      iteration: currentIteration,
      waitTime: coldStartWaitTimeMins,
      timestamp: Date.now(),
      isColdStart: true,
    });

    const params = createRequestParams("cold-start", endpoint, {
      iteration: currentIteration.toString(),
      is_cold_start: "true",
    });
    params.headers!["X-Cold-Start-Test"] = "true";

    // Track TTFB separately for cold start analysis
    const startTime = Date.now();

    const { response, checkResult } = executeRequest(
      url,
      payload,
      params,
      metrics,
      15000 // 15 second timeout for cold starts
    );

    // Calculate and record TTFB
    const ttfb = response.timings.waiting;
    ttfbMetric.add(ttfb);
    coldStartLatency.add(response.timings.duration);

    // Update current result
    if (currentResult) {
      currentResult.coldStartLatency = response.timings.duration;
      currentResult.ttfb = ttfb;
      currentResult.success = checkResult.overall;
    }

    console.log(
      `📊 Cold Start ${currentIteration}: ${response.timings.duration.toFixed(
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

    // Small delay before warmup requests
    sleep(1);
  }
}

export function teardown() {
  console.log("\n📊 Cold Start Test Results Summary:\n");

  // Analyze cold start results
  const successfulColdStarts = coldStartResults.filter((r) => r.success);
  const failedColdStarts = coldStartResults.filter((r) => !r.success);

  if (successfulColdStarts.length > 0) {
    const avgColdStartLatency =
      successfulColdStarts.reduce((sum, r) => sum + r.coldStartLatency, 0) /
      successfulColdStarts.length;
    const avgTtfb =
      successfulColdStarts.reduce((sum, r) => sum + r.ttfb, 0) /
      successfulColdStarts.length;
    const maxColdStartLatency = Math.max(
      ...successfulColdStarts.map((r) => r.coldStartLatency)
    );
    const minColdStartLatency = Math.min(
      ...successfulColdStarts.map((r) => r.coldStartLatency)
    );

    console.log(`Cold Start Performance:`);
    console.log(
      `  Successful cold starts: ${successfulColdStarts.length}/${coldStartResults.length}`
    );
    console.log(
      `  Average cold start latency: ${avgColdStartLatency.toFixed(2)}ms`
    );
    console.log(`  Average TTFB: ${avgTtfb.toFixed(2)}ms`);
    console.log(
      `  Min cold start latency: ${minColdStartLatency.toFixed(2)}ms`
    );
    console.log(
      `  Max cold start latency: ${maxColdStartLatency.toFixed(2)}ms`
    );
    console.log(`  Failed cold starts: ${failedColdStarts.length}\n`);
  }

  // Analyze warmup performance
  const allWarmupResults = coldStartResults.flatMap((r) => r.warmupResults);
  const successfulWarmups = allWarmupResults.filter((w) => w.success);

  if (successfulWarmups.length > 0) {
    const avgWarmupLatency =
      successfulWarmups.reduce((sum, w) => sum + w.latency, 0) /
      successfulWarmups.length;
    const maxWarmupLatency = Math.max(
      ...successfulWarmups.map((w) => w.latency)
    );

    console.log(`Warmup Performance:`);
    console.log(
      `  Successful warmup requests: ${successfulWarmups.length}/${allWarmupResults.length}`
    );
    console.log(`  Average warmup latency: ${avgWarmupLatency.toFixed(2)}ms`);
    console.log(`  Max warmup latency: ${maxWarmupLatency.toFixed(2)}ms\n`);

    // Compare cold start vs warmup performance
    if (successfulColdStarts.length > 0) {
      // Calculate cold start latency for comparison
      const avgColdStartLatencyForComparison =
        successfulColdStarts.reduce((sum, r) => sum + r.coldStartLatency, 0) /
        successfulColdStarts.length;

      const coldVsWarmupRatio =
        avgColdStartLatencyForComparison / avgWarmupLatency;

      console.log(`Performance Analysis:`);
      console.log(
        `  Cold start overhead: ${coldVsWarmupRatio.toFixed(
          1
        )}x slower than warm requests`
      );

      if (coldVsWarmupRatio <= 2) {
        console.log("  ✅ Excellent cold start performance");
      } else if (coldVsWarmupRatio <= 5) {
        console.log("  ⚠️  Moderate cold start overhead");
      } else {
        console.log("  ❌ High cold start overhead - consider optimization");
      }
    }
  }

  // Display individual cold start results
  console.log(`\nDetailed Results:`);
  coldStartResults.forEach((r) => {
    const warmupSummary =
      r.warmupResults.length > 0
        ? `Warmup avg: ${(
            r.warmupResults.reduce((sum, w) => sum + w.latency, 0) /
            r.warmupResults.length
          ).toFixed(2)}ms`
        : "No warmup";

    console.log(
      `  Iteration ${r.iteration}: ${r.coldStartLatency.toFixed(2)}ms (${
        r.success ? "✅" : "❌"
      }) | ${warmupSummary}`
    );
  });
}

export function handleSummary(data: any) {
  const endpoint_name = endpoint.replace("/api/", "").replace("/", "-");

  // Calculate total test duration
  const totalDuration =
    (coldStartWaitTimeMins * (coldStartIterations - 1) + 5) * 60 * 1000; // Rough estimate

  // Create base summary using utility
  const baseSummary = createBaseSummary(
    data,
    "cold-start",
    endpoint,
    totalDuration,
    {
      waitTimeMinutes: coldStartWaitTimeMins,
      iterations: coldStartIterations,
      warmupRequests: warmupRequests,
    }
  );

  // Calculate cold start specific metrics
  const avgTtfb = safeMetric(data.metrics.time_to_first_byte?.values?.avg);
  const p95Ttfb = safeMetric(
    data.metrics.time_to_first_byte?.values?.["p(95)"]
  );
  const maxTtfb = safeMetric(data.metrics.time_to_first_byte?.values?.max);
  const minTtfb = safeMetric(data.metrics.time_to_first_byte?.values?.min);

  const avgColdStartLatency = safeMetric(
    data.metrics.cold_start_latency?.values?.avg
  );
  const avgWarmupLatency = safeMetric(data.metrics.warmup_latency?.values?.avg);

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
      avgColdStartLatency: avgColdStartLatency,
      avgWarmupLatency: avgWarmupLatency,
      coldStartOverhead:
        avgWarmupLatency > 0 ? avgColdStartLatency / avgWarmupLatency : 0,
      successRate: successRate,
      totalIterations: coldStartIterations,
      warmupRequestsPerIteration: warmupRequests,
      waitTime: coldStartWaitTimeMins,
    },
    metadata: {
      ...baseSummary.metadata,
      waitTimeMinutes: coldStartWaitTimeMins,
      iterations: coldStartIterations,
      warmupRequests: warmupRequests,
      avgTtfb: avgTtfb,
      p95Ttfb: p95Ttfb,
      avgColdStartLatency: avgColdStartLatency,
      avgWarmupLatency: avgWarmupLatency,
    },
  };

  // Log results using utility
  console.log("\n📊 Cold Start Test Results Summary:\n");

  console.log(`${endpoint_name.toUpperCase()}:`);
  console.log(`  Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`  Cold Start Iterations: ${coldStartIterations}`);
  console.log(`  Warmup Requests per Iteration: ${warmupRequests}`);
  console.log(
    `  Wait Time Between Iterations: ${coldStartWaitTimeMins} minutes`
  );
  console.log(`  Avg Cold Start Latency: ${avgColdStartLatency.toFixed(2)}ms`);
  console.log(`  Avg Warmup Latency: ${avgWarmupLatency.toFixed(2)}ms`);
  console.log(`  Avg TTFB: ${avgTtfb.toFixed(2)}ms`);
  console.log(`  P95 TTFB: ${p95Ttfb.toFixed(2)}ms`);
  console.log(`  Min Response Time: ${baseSummary.minLatency.toFixed(2)}ms`);
  console.log(`  Max Response Time: ${baseSummary.maxLatency.toFixed(2)}ms`);
  console.log(`  Failed Requests: ${baseSummary.errors}\n`);

  // Performance assessment
  const coldStartOverhead = summary.coldStartMetrics.coldStartOverhead;

  if (successRate >= 90 && avgColdStartLatency < 1000) {
    console.log("✅ Cold start performance is excellent");
  } else if (successRate >= 80 && avgColdStartLatency < 3000) {
    console.log("⚠️  Cold start performance is acceptable");
  } else {
    console.log("❌ Cold Start Performance Issues Detected:");
    if (successRate < 80) {
      console.log(
        `   • Low success rate: ${successRate.toFixed(1)}% (threshold: 80%)`
      );
    }
    if (avgColdStartLatency >= 3000) {
      console.log(
        `   • High cold start latency: ${avgColdStartLatency.toFixed(
          2
        )}ms (threshold: 3000ms)`
      );
    }
    if (coldStartOverhead > 5) {
      console.log(
        `   • High cold start overhead: ${coldStartOverhead.toFixed(
          1
        )}x slower than warm (threshold: 5x)`
      );
    }
  }

  // Save results using utility
  return saveResults(summary, `cold-start-${endpoint_name}`);
}
