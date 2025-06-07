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
const { baseUrl, endpoint, burstRequests, burstDuration, burstIntensity } =
  config;

// Custom metrics using common utilities plus burst-specific metrics
const metrics = createCommonMetrics();
const burstResponseTime = new Trend("burst_response_time");
const recoveryTime = new Trend("recovery_time");

export const options = {
  scenarios: {
    // Warm-up phase
    warmup: {
      executor: "constant-arrival-rate",
      rate: 10,
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 10,
      maxVUs: 20,
      tags: { phase: "warmup" },
      exec: "warmupRequest",
    },
    // Main burst test
    burst_spike: {
      executor: "constant-arrival-rate",
      rate: burstIntensity,
      timeUnit: "1s",
      duration: burstDuration,
      preAllocatedVUs: Math.min(burstIntensity, 100),
      maxVUs: Math.min(burstIntensity * 2, 200),
      startTime: "35s", // Start after warmup
      tags: { phase: "burst" },
      exec: "burstRequest",
    },
    // Recovery phase
    recovery: {
      executor: "constant-arrival-rate",
      rate: 20,
      timeUnit: "1s",
      duration: "60s",
      preAllocatedVUs: 20,
      maxVUs: 30,
      startTime: `${35 + parseInt(burstDuration.replace("s", ""))}s`,
      tags: { phase: "recovery" },
      exec: "recoveryRequest",
    },
  },
  thresholds: {
    ...createStandardThresholds({
      maxLatencyP95: 5000, // Allow higher latency during bursts
      maxErrorRate: 0.1, // Allow moderate error rate during burst
      minSuccessRate: 0.9,
    }),
    burst_response_time: ["p(90)<3000", "p(95)<5000"],
    "http_req_duration{phase:burst}": ["p(90)<3000"],
    "http_req_failed{phase:burst}": ["rate<0.15"],
  },
};

let burstStartTime: number | null = null;
let requestCount: number = 0;

interface SetupData {
  burstRequests: number;
  burstDuration: number;
  burstIntensity: number;
  startTime: number;
}

export function setup(): SetupData {
  console.log(`🚀 Starting Improved Burst Traffic Test`);
  console.log(`Target: ${burstIntensity} RPS for ${burstDuration}`);
  console.log(
    `Expected total requests: ~${
      burstIntensity * parseInt(burstDuration.replace("s", ""))
    }`
  );
  console.log(`Endpoint: ${endpoint}`);

  return {
    burstRequests: burstRequests,
    burstDuration: parseInt(burstDuration.replace("s", "")) * 1000,
    burstIntensity: burstIntensity,
    startTime: Date.now(),
  };
}

// Warmup function
export function warmupRequest(data: SetupData) {
  const url = `${baseUrl}${endpoint}`;

  // Create payload using utility with warmup-specific data
  const payload = createPayload("burst-warmup", {
    phase: "warmup",
    timestamp: Date.now(),
  });

  // Create request params with warmup-specific headers
  const params = createRequestParams("burst-warmup", endpoint, {
    phase: "warmup",
  });

  const requestStart = Date.now();
  const response = http.post(url, payload, params);
  const requestEnd = Date.now();

  // Basic checks for warmup
  check(response, {
    "warmup status is 200": (r) => r.status === 200,
    "warmup response time reasonable": (r) => r.timings.duration < 2000,
  });
}

// Main burst function
export function burstRequest(data: SetupData) {
  if (!burstStartTime) {
    burstStartTime = Date.now();
    console.log("🔥 Burst phase started!");
  }

  requestCount++;
  const url = `${baseUrl}${endpoint}`;

  // Create payload using utility with burst-specific data
  const payload = createPayload("burst-traffic", {
    phase: "burst",
    burstId: data.startTime,
    requestNumber: requestCount,
    targetIntensity: data.burstIntensity,
  });

  // Create request params with burst-specific headers
  const params = createRequestParams("burst-traffic", endpoint, {
    phase: "burst",
  });
  params.headers!["X-Burst-Test"] = "true";
  params.headers!["X-Burst-Intensity"] = data.burstIntensity.toString();

  const requestStart = Date.now();
  const response = http.post(url, payload, params);
  const requestEnd = Date.now();

  const responseTime = requestEnd - requestStart;

  // Perform checks for burst scenarios with more tolerance
  const success = check(response, {
    "burst status is 2xx or 503": (r) =>
      (r.status >= 200 && r.status < 300) || r.status === 503,
    "burst response time < 10s": (r) => r.timings.duration < 10000,
    "burst has response body": (r) => {
      if (!r.body) return false;
      if (typeof r.body === "string") return r.body.length > 0;
      if (r.body instanceof ArrayBuffer) return r.body.byteLength > 0;
      return false;
    },
    "burst no connection timeout": (r) => r.status !== 0,
  });

  // Record metrics
  metrics.errorRate.add(!success);
  burstResponseTime.add(responseTime);

  // Log progress every 50 requests during burst
  if (requestCount % 50 === 0) {
    console.log(
      `📊 Burst progress: ${requestCount} requests sent, last response: ${responseTime}ms`
    );
  }
}

// Recovery function
export function recoveryRequest(data: SetupData) {
  const url = `${baseUrl}${endpoint}`;

  // Create payload using utility with recovery-specific data
  const payload = createPayload("burst-recovery", {
    phase: "recovery",
    timestamp: Date.now(),
  });

  const params = createRequestParams("burst-recovery", endpoint, {
    phase: "recovery",
  });

  const requestStart = Date.now();
  const response = http.post(url, payload, params);
  const requestEnd = Date.now();

  const responseTime = requestEnd - requestStart;

  // Check recovery performance
  const success = check(response, {
    "recovery status is 200": (r) => r.status === 200,
    "recovery response time < 2s": (r) => r.timings.duration < 2000,
    "recovery has body": (r) => {
      if (!r.body) return false;
      if (typeof r.body === "string") return r.body.length > 0;
      if (r.body instanceof ArrayBuffer) return r.body.byteLength > 0;
      return false;
    },
  });

  recoveryTime.add(responseTime);

  // Log recovery issues
  if (!success) {
    console.warn(
      `Recovery issue: Status ${response.status}, Time: ${responseTime}ms`
    );
  }
}

export function teardown(data: SetupData) {
  console.log("\n🔄 Burst test completed");
  console.log(`Total burst requests attempted: ${requestCount}`);
  console.log(`Expected RPS during burst: ${data.burstIntensity}`);

  // Additional post-test verification
  console.log("\n🔍 Running post-burst health check...");

  const url = `${baseUrl}${endpoint}`;
  const healthCheckPayload = createPayload("burst-health-check", {});

  for (let i = 0; i < 5; i++) {
    const response = http.post(url, healthCheckPayload, {
      headers: { "Content-Type": "application/json" },
    });

    const isHealthy =
      response.status === 200 && response.timings.duration < 1000;
    console.log(
      `Health check ${i + 1}: ${response.timings.duration.toFixed(2)}ms - ${
        isHealthy ? "✅" : "❌"
      }`
    );

    if (i < 4) sleep(2); // Wait between health checks
  }
}

export function handleSummary(data: any) {
  const endpoint_name = endpoint.replace("/api/", "").replace("/", "-");

  // Calculate actual test duration (including all phases)
  const totalDuration = 35000 + data.setupData?.burstDuration + 60000; // warmup + burst + recovery

  // Create base summary using utility
  const baseSummary = createBaseSummary(
    data,
    "burst-traffic",
    endpoint,
    totalDuration
  );

  // Calculate burst-specific metrics
  const burstPhaseData = data.metrics["http_req_duration{phase:burst}"];
  const burstFailureRate =
    safeMetric(data.metrics["http_req_failed{phase:burst}"]?.values?.rate) *
    100;

  const expectedRequests =
    burstIntensity * parseInt(burstDuration.replace("s", ""));
  const actualBurstRequests = safeMetric(
    data.metrics["http_reqs{phase:burst}"]?.values?.count
  );
  const actualRps =
    actualBurstRequests / parseInt(burstDuration.replace("s", ""));
  const burstEfficiency = (actualRps / burstIntensity) * 100;

  // Calculate recovery metrics
  const avgRecoveryTime = safeMetric(data.metrics.recovery_time?.values?.avg);
  const p90BurstLatency = safeMetric(
    data.metrics.burst_response_time?.values?.["p(90)"]
  );
  const p95BurstLatency = safeMetric(
    data.metrics.burst_response_time?.values?.["p(95)"]
  );

  // Extended summary with burst-specific data
  const summary = {
    ...baseSummary,
    targetBurstRequests: expectedRequests,
    targetBurstDuration: parseInt(burstDuration.replace("s", "")) * 1000,
    actualBurstDuration: parseInt(burstDuration.replace("s", "")) * 1000,
    actualRequests: actualBurstRequests,
    targetRps: burstIntensity,
    actualRps: actualRps,
    burstEfficiency: burstEfficiency,
    burstFailureRate: burstFailureRate,
    avgBurstLatency: safeMetric(burstPhaseData?.values?.avg),
    p90Latency: p90BurstLatency,
    p95BurstLatency: p95BurstLatency,
    avgRecoveryTime: avgRecoveryTime,
    metadata: {
      ...baseSummary.metadata,
      burstIntensity: burstIntensity,
      expectedRequests: expectedRequests,
      phases: ["warmup", "burst", "recovery"],
    },
  };

  // Log results using utility
  logBasicResults(baseSummary, "Burst Traffic Test Results");
  console.log(`\n🚀 Burst Performance Analysis:`);
  console.log(`Target RPS during burst: ${burstIntensity}`);
  console.log(`Actual RPS during burst: ${actualRps.toFixed(2)}`);
  console.log(`Burst efficiency: ${burstEfficiency.toFixed(1)}%`);
  console.log(`Burst failure rate: ${burstFailureRate.toFixed(1)}%`);
  console.log(`Average burst latency: ${summary.avgBurstLatency.toFixed(2)}ms`);
  console.log(`P95 burst latency: ${p95BurstLatency.toFixed(2)}ms`);
  console.log(`Average recovery time: ${avgRecoveryTime.toFixed(2)}ms`);

  // Performance assessment
  if (burstEfficiency >= 80 && burstFailureRate <= 10) {
    console.log("\n✅ Burst handling performance is excellent");
  } else if (burstEfficiency >= 60 && burstFailureRate <= 20) {
    console.log("\n⚠️  Burst handling performance is acceptable");
  } else {
    console.log("\n❌ Burst handling performance needs improvement");
    console.log(
      "   • Consider optimizing connection pooling, request handling, or scaling strategy"
    );
  }

  // Save results using utility
  return saveResults(summary, `burst-traffic-${endpoint_name}`);
}
