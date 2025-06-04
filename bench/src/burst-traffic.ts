import { check, sleep } from "k6";
import http from "k6/http";
import { Trend } from "k6/metrics";

import {
  createBaseSummary,
  createCommonMetrics,
  createPayload,
  createRequestParams,
  createStandardThresholds,
  getCommonConfig,
  logBasicResults,
  safeMetric,
  saveResults,
} from "./k6-utils.ts";

// Configuration using common utilities
const config = getCommonConfig();
const { baseUrl, endpoint } = config;
const burstRequests = config.burstRequests || 1000;
const burstDuration = config.burstDuration || "2s";
const iterations = config.iterations || 5;

// Custom metrics using common utilities plus burst-specific metrics
const metrics = createCommonMetrics();
const burstResponseTime = new Trend("burst_response_time");
const recoveryTime = new Trend("recovery_time");

export const options = {
  scenarios: {
    burst_test: {
      executor: "per-vu-iterations",
      vus: Math.min(burstRequests, 100), // Limit VUs to reasonable number
      iterations: Math.ceil(burstRequests / Math.min(burstRequests, 100)),
      maxDuration: "30s",
    },
  },
  thresholds: {
    ...createStandardThresholds({
      maxLatencyP95: 3000, // Allow higher latency during bursts
      maxErrorRate: 0.15, // Allow higher error rate during burst
      minSuccessRate: 0.85,
    }),
    burst_response_time: ["p(90)<2000"],
  },
};

let burstStartTime: number | null = null;
let requestCount: number = 0;

interface SetupData {
  burstRequests: number;
  burstDuration: number;
  startTime: number;
}

export function setup(): SetupData {
  console.log(`🚀 Starting Burst Traffic Test`);
  console.log(`Target: ${burstRequests} requests in ${burstDuration}`);
  console.log(`Endpoint: ${endpoint}`);

  return {
    burstRequests: burstRequests,
    burstDuration: parseFloat(burstDuration.replace("s", "")) * 1000,
    startTime: Date.now(),
  };
}

export default function (data: SetupData) {
  if (!burstStartTime) {
    burstStartTime = Date.now();
  }

  const url = `${baseUrl}${endpoint}`;
  const currentTime = Date.now();
  const elapsedTime = currentTime - burstStartTime;

  // Only send requests during burst window
  if (elapsedTime > data.burstDuration) {
    return; // Stop sending requests after burst duration
  }

  requestCount++;

  // Create payload using utility with burst-specific data
  const payload = createPayload("burst-traffic", {
    burstId: data.startTime,
    requestNumber: requestCount,
    elapsedTime: elapsedTime,
    targetBurstSize: data.burstRequests,
  });

  // Create request params with burst-specific headers
  const params = createRequestParams("burst-traffic", endpoint, {
    burst_phase: "active",
  });
  params.headers!["X-Burst-Test"] = "true";

  const requestStart = Date.now();
  const response = http.post(url, payload, params);
  const requestEnd = Date.now();

  const responseTime = requestEnd - requestStart;

  // Perform custom checks for burst scenarios
  const success = check(response, {
    "status is 200": (r) => r.status === 200,
    "response time < 10000ms": (r) => r.timings.duration < 10000,
    "response has body": (r) => {
      if (!r.body) return false;
      if (typeof r.body === "string") return r.body.length > 0;
      if (r.body instanceof ArrayBuffer) return r.body.byteLength > 0;
      return false;
    },
    "no timeout": (r) => r.status !== 0,
    "server responsive": (r) => r.status < 500 || r.status === 503, // 503 is acceptable during burst
  });

  // Record metrics
  metrics.errorRate.add(!success);
  burstResponseTime.add(responseTime);

  // Log severe issues (but 503 is expected during burst)
  if (!success && response.status !== 503) {
    console.warn(
      `Burst request ${requestCount} failed: Status ${response.status}, Time: ${responseTime}ms`
    );
  }

  // Immediate retry pattern (simulate real burst behavior)
  if (elapsedTime < data.burstDuration * 0.5) {
    // No sleep during first half of burst (maximum intensity)
  } else {
    // Slight delay in second half
    sleep(0.001); // 1ms sleep
  }
}

interface TeardownData {
  recoveryTimes: number[];
  avgRecoveryTime: number;
  maxRecoveryTime: number;
}

export function teardown(data: SetupData): TeardownData {
  console.log("\n🔄 Testing recovery after burst...");

  // Test recovery - send some requests after burst to see how quickly system recovers
  const recoveryTests = 10;
  const recoveryTimes: number[] = [];

  for (let i = 0; i < recoveryTests; i++) {
    sleep(1); // Wait 1 second between recovery tests

    const recoveryStart = Date.now();
    const url = `${baseUrl}${endpoint}`;

    // Create recovery payload using utility
    const payload = createPayload("burst-recovery", {
      recoveryTest: i + 1,
    });

    const response = http.post(url, payload, {
      headers: { "Content-Type": "application/json" },
    });

    const recoveryEnd = Date.now();
    const recoveryLatency = recoveryEnd - recoveryStart;

    recoveryTimes.push(recoveryLatency);

    if (response.status === 200) {
      console.log(`Recovery test ${i + 1}: ${recoveryLatency}ms ✅`);
    } else {
      console.log(
        `Recovery test ${i + 1}: ${recoveryLatency}ms ❌ (${response.status})`
      );
    }
  }

  // Calculate recovery metrics
  const avgRecoveryTime =
    recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length;
  const maxRecoveryTime = Math.max(...recoveryTimes);

  console.log(`\nRecovery Summary:`);
  console.log(`Average recovery latency: ${avgRecoveryTime.toFixed(2)}ms`);
  console.log(`Max recovery latency: ${maxRecoveryTime.toFixed(2)}ms`);

  return {
    recoveryTimes,
    avgRecoveryTime,
    maxRecoveryTime,
  };
}

export function handleSummary(data: any) {
  const endpoint_name = endpoint.replace("/api/", "").replace("/", "-");

  // Create base summary using utility
  const actualBurstDuration = safeMetric(data.state?.testRunDurationMs);
  const baseSummary = createBaseSummary(
    data,
    "burst-traffic",
    endpoint,
    actualBurstDuration
  );

  // Calculate burst-specific metrics
  const avgBurstLatency =
    safeMetric(data.metrics.burst_response_time?.values?.avg) ||
    baseSummary.avgLatency;
  const p90BurstLatency =
    safeMetric(data.metrics.burst_response_time?.values?.["p(90)"]) ||
    baseSummary.p95Latency;
  const p95BurstLatency =
    safeMetric(data.metrics.burst_response_time?.values?.["p(95)"]) ||
    baseSummary.p95Latency;

  const targetRps = burstRequests / parseFloat(burstDuration.replace("s", ""));
  const actualRps = (baseSummary.requests / actualBurstDuration) * 1000;
  const burstEfficiency = (actualRps / targetRps) * 100;

  // Extended summary with burst-specific data
  const summary = {
    ...baseSummary,
    targetBurstRequests: burstRequests,
    targetBurstDuration: parseFloat(burstDuration.replace("s", "")) * 1000,
    actualBurstDuration: actualBurstDuration,
    actualRequests: baseSummary.requests,
    targetRps: targetRps,
    actualRps: actualRps,
    burstEfficiency: burstEfficiency,
    avgBurstLatency: avgBurstLatency,
    p90Latency: p90BurstLatency,
    p95BurstLatency: p95BurstLatency,
    metadata: {
      ...baseSummary.metadata,
      burstIntensity:
        burstRequests / parseFloat(burstDuration.replace("s", "")),
    },
  };

  // Log results using utility
  logBasicResults(baseSummary, "Burst Traffic Test Results");
  console.log(`Target Burst: ${burstRequests} requests in ${burstDuration}`);
  console.log(
    `Actual: ${baseSummary.requests} requests in ${(
      actualBurstDuration / 1000
    ).toFixed(2)}s`
  );
  console.log(
    `Target RPS: ${targetRps.toFixed(2)}, Actual RPS: ${actualRps.toFixed(2)}`
  );
  console.log(`Burst Efficiency: ${burstEfficiency.toFixed(1)}%`);
  console.log(`Average Burst Latency: ${avgBurstLatency.toFixed(2)}ms`);
  console.log(`P90 Burst Latency: ${p90BurstLatency.toFixed(2)}ms`);

  if (burstEfficiency < 80) {
    console.log("\n⚠️  Burst Performance Issues:");
    console.log(
      `   • Burst efficiency: ${burstEfficiency.toFixed(1)}% (target: 80%+)`
    );
    console.log("   • System may not be handling burst traffic optimally");
  }

  if (baseSummary.errorRate > 15) {
    console.log("\n⚠️  High Error Rate During Burst:");
    console.log(
      `   • Error rate: ${baseSummary.errorRate.toFixed(2)}% (threshold: 15%)`
    );
    console.log(
      "   • Consider reducing burst intensity or investigating capacity limits"
    );
  }

  // Save results using utility
  return saveResults(summary, `burst-traffic-${endpoint_name}`);
}
