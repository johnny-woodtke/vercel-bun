import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("error_rate");
const burstResponseTime = new Trend("burst_response_time");
const recoveryTime = new Trend("recovery_time");

// Configuration
const baseUrl: string = __ENV.BASE_URL || "https://vercel-bun-bench.vercel.app";
const endpoint: string = __ENV.ENDPOINT || "/api/bun";
const burstRequests: number = parseInt(__ENV.BURST_REQUESTS || "1000");
const burstDuration: string = __ENV.BURST_DURATION || "2s";
const iterations: number = parseInt(__ENV.ITERATIONS || "5");

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
    http_req_duration: ["p(95)<3000"], // Allow higher latency during bursts
    error_rate: ["rate<0.15"], // Allow higher error rate during burst
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

  const payload = JSON.stringify({
    test: "burst-traffic",
    timestamp: currentTime,
    burstId: data.startTime,
    requestNumber: requestCount,
    elapsedTime: elapsedTime,
    targetBurstSize: data.burstRequests,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
      "X-Burst-Test": "true",
    },
    tags: {
      endpoint: endpoint,
      test_type: "burst-traffic",
      burst_phase: "active",
    },
  };

  const requestStart = Date.now();
  const response = http.post(url, payload, params);
  const requestEnd = Date.now();

  const responseTime = requestEnd - requestStart;

  // Record metrics
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

  errorRate.add(!success);
  burstResponseTime.add(responseTime);

  // Log severe issues
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

    const payload = JSON.stringify({
      test: "burst-recovery",
      timestamp: Date.now(),
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
  const endpoint_name = endpoint.replace("/api/", "");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  // Helper function to safely get metric values
  const safeMetric = (value: any, fallback: number = 0): number => {
    return value !== undefined && value !== null ? value : fallback;
  };

  const errorRatePercent =
    safeMetric(data.metrics.http_req_failed?.values?.rate) * 100;
  const avgBurstLatency =
    safeMetric(data.metrics.burst_response_time?.values?.avg) ||
    safeMetric(data.metrics.http_req_duration?.values?.avg);
  const p90BurstLatency =
    safeMetric(data.metrics.burst_response_time?.values?.["p(90)"]) ||
    safeMetric(data.metrics.http_req_duration?.values?.["p(90)"]);
  const p95BurstLatency =
    safeMetric(data.metrics.burst_response_time?.values?.["p(95)"]) ||
    safeMetric(data.metrics.http_req_duration?.values?.["p(95)"]);

  const totalRequests = safeMetric(data.metrics.http_reqs?.values?.count);
  const actualBurstDuration = safeMetric(data.state?.testRunDurationMs);
  const actualRps = (totalRequests / actualBurstDuration) * 1000;

  // Burst efficiency calculation
  const targetRps = burstRequests / parseFloat(burstDuration.replace("s", ""));
  const burstEfficiency = (actualRps / targetRps) * 100;

  const summary = {
    endpoint: endpoint_name,
    testType: "burst-traffic",
    timestamp: new Date(),
    targetBurstRequests: burstRequests,
    targetBurstDuration: parseFloat(burstDuration.replace("s", "")) * 1000,
    actualBurstDuration: actualBurstDuration,
    actualRequests: totalRequests,
    targetRps: targetRps,
    actualRps: actualRps,
    burstEfficiency: burstEfficiency,
    requests: totalRequests,
    avgLatency: safeMetric(data.metrics.http_req_duration?.values?.avg),
    avgBurstLatency: avgBurstLatency,
    p50Latency: safeMetric(data.metrics.http_req_duration?.values?.med),
    p90Latency: safeMetric(data.metrics.http_req_duration?.values?.["p(90)"]),
    p95Latency: safeMetric(data.metrics.http_req_duration?.values?.["p(95)"]),
    p99Latency: safeMetric(data.metrics.http_req_duration?.values?.["p(99)"]),
    maxLatency: safeMetric(data.metrics.http_req_duration?.values?.max),
    minLatency: safeMetric(data.metrics.http_req_duration?.values?.min),
    errors: safeMetric(data.metrics.http_req_failed?.values?.count),
    errorRate: errorRatePercent,
    bytesTransferred:
      safeMetric(data.metrics.data_received?.values?.count) +
      safeMetric(data.metrics.data_sent?.values?.count),
    metadata: {
      burstIntensity:
        burstRequests / parseFloat(burstDuration.replace("s", "")),
      maxVUs: safeMetric(data.metrics.vus?.values?.max),
      iterations: safeMetric(data.metrics.iterations?.values?.count),
      httpReqBlocked: safeMetric(data.metrics.http_req_blocked?.values?.avg),
      httpReqConnecting: safeMetric(
        data.metrics.http_req_connecting?.values?.avg
      ),
      httpReqWaiting: safeMetric(data.metrics.http_req_waiting?.values?.avg),
    },
  };

  // Console output
  console.log("\n📊 Burst Traffic Test Results:");
  console.log(`Endpoint: ${endpoint_name.toUpperCase()}`);
  console.log(`Target Burst: ${burstRequests} requests in ${burstDuration}`);
  console.log(
    `Actual: ${totalRequests} requests in ${(
      actualBurstDuration / 1000
    ).toFixed(2)}s`
  );
  console.log(
    `Target RPS: ${targetRps.toFixed(2)}, Actual RPS: ${actualRps.toFixed(2)}`
  );
  console.log(`Burst Efficiency: ${burstEfficiency.toFixed(1)}%`);
  console.log(`Error Rate: ${errorRatePercent.toFixed(2)}%`);
  console.log(`Average Burst Latency: ${avgBurstLatency.toFixed(2)}ms`);
  console.log(`P90 Burst Latency: ${p90BurstLatency.toFixed(2)}ms`);
  console.log(`P95 Burst Latency: ${p95BurstLatency.toFixed(2)}ms`);
  console.log(`Max Latency: ${summary.maxLatency.toFixed(2)}ms`);

  if (burstEfficiency < 80) {
    console.log("\n⚠️  Burst Performance Issues:");
    console.log(
      `   • Burst efficiency: ${burstEfficiency.toFixed(1)}% (target: 80%+)`
    );
    console.log("   • System may not be handling burst traffic optimally");
  }

  if (errorRatePercent > 15) {
    console.log("\n⚠️  High Error Rate During Burst:");
    console.log(
      `   • Error rate: ${errorRatePercent.toFixed(2)}% (threshold: 15%)`
    );
    console.log(
      "   • Consider reducing burst intensity or investigating capacity limits"
    );
  }

  return {
    [`results/burst-traffic-${endpoint_name}-${timestamp}.json`]:
      JSON.stringify(summary, null, 2),
  };
}
