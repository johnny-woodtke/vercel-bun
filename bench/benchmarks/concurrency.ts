import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("error_rate");
const successRate = new Rate("success_rate");
const responseTime = new Trend("response_time");
const connectionTime = new Trend("connection_time");

// Configuration
const baseUrl: string = __ENV.BASE_URL || "https://vercel-bun-bench.vercel.app";
const endpoint: string = __ENV.ENDPOINT || "/api/bun";
const maxConnections: number = parseInt(__ENV.MAX_CONNECTIONS || "1000");
const testDuration: string = __ENV.DURATION || "60s";

export const options = {
  scenarios: {
    concurrency_test: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [
        { duration: "30s", target: Math.floor(maxConnections * 0.25) },
        { duration: "30s", target: Math.floor(maxConnections * 0.5) },
        { duration: "30s", target: Math.floor(maxConnections * 0.75) },
        { duration: testDuration, target: maxConnections },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<3000"], // 95% of requests must complete below 3s under load
    error_rate: ["rate<0.1"], // Error rate must be less than 10% under stress
    success_rate: ["rate>0.9"], // Success rate must be greater than 90%
    http_req_connecting: ["p(95)<1000"], // Connection time should be reasonable
  },
};

export default function () {
  const url = `${baseUrl}${endpoint}`;

  const payload = JSON.stringify({
    test: "concurrency",
    timestamp: Date.now(),
    maxConnections: maxConnections,
    currentVU: __VU,
    iteration: __ITER,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": `k6-concurrency-test-vu-${__VU}`,
    },
    tags: {
      endpoint: endpoint,
      test_type: "concurrency",
      vu_id: __VU.toString(),
    },
  };

  const response = http.post(url, payload, params);

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
    "no server errors": (r) => r.status < 500,
    "connection established": (r) => r.timings.connecting >= 0,
  });

  errorRate.add(!success);
  successRate.add(success);
  responseTime.add(response.timings.duration);
  connectionTime.add(response.timings.connecting);

  // Log errors with context
  if (!success) {
    console.warn(
      `VU ${__VU}: Request failed - Status: ${
        response.status
      }, Duration: ${response.timings.duration.toFixed(2)}ms`
    );
  }

  // Simulate some processing time
  sleep(Math.random() * 2 + 1); // 1-3 seconds think time
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
  const p95Latency = safeMetric(
    data.metrics.http_req_duration?.values?.["p(95)"]
  );
  const maxVUs = safeMetric(data.metrics.vus?.values?.max);

  // Determine performance under concurrency
  const handlesMaxConcurrency = errorRatePercent < 10 && p95Latency < 3000;
  const effectiveMaxConnections = handlesMaxConcurrency
    ? maxVUs
    : Math.floor(maxVUs * 0.8);

  const summary = {
    endpoint: endpoint_name,
    testType: "concurrency",
    timestamp: new Date(),
    duration: parseFloat(testDuration.replace("s", "")) * 1000,
    targetMaxConnections: maxConnections,
    actualMaxVUs: maxVUs,
    effectiveMaxConnections: effectiveMaxConnections,
    handlesMaxConcurrency: handlesMaxConcurrency,
    requests: safeMetric(data.metrics.http_reqs?.values?.count),
    rps: safeMetric(data.metrics.http_reqs?.values?.rate),
    avgLatency: safeMetric(data.metrics.http_req_duration?.values?.avg),
    p50Latency: safeMetric(data.metrics.http_req_duration?.values?.med),
    p95Latency: p95Latency,
    p99Latency: safeMetric(data.metrics.http_req_duration?.values?.["p(99)"]),
    maxLatency: safeMetric(data.metrics.http_req_duration?.values?.max),
    minLatency: safeMetric(data.metrics.http_req_duration?.values?.min),
    errors: safeMetric(data.metrics.http_req_failed?.values?.count),
    errorRate: errorRatePercent,
    bytesTransferred: safeMetric(data.metrics.data_received?.values?.count),
    metadata: {
      avgConnectionTime: safeMetric(
        data.metrics.http_req_connecting?.values?.avg
      ),
      p95ConnectionTime: safeMetric(
        data.metrics.http_req_connecting?.values?.["p(95)"]
      ),
      avgBlockingTime: safeMetric(data.metrics.http_req_blocked?.values?.avg),
      avgWaitingTime: safeMetric(data.metrics.http_req_waiting?.values?.avg),
      avgSendingTime: safeMetric(data.metrics.http_req_sending?.values?.avg),
      avgReceivingTime: safeMetric(
        data.metrics.http_req_receiving?.values?.avg
      ),
      iterations: safeMetric(data.metrics.iterations?.values?.count),
      dataReceived: safeMetric(data.metrics.data_received?.values?.count),
      dataSent: safeMetric(data.metrics.data_sent?.values?.count),
    },
  };

  // Console output
  console.log("\n📊 Concurrency Stress Test Results:");
  console.log(`Endpoint: ${endpoint_name.toUpperCase()}`);
  console.log(`Target Max Connections: ${maxConnections}`);
  console.log(`Actual Max VUs: ${maxVUs}`);
  console.log(`Effective Max Connections: ${effectiveMaxConnections}`);
  console.log(
    `Handles Max Concurrency: ${handlesMaxConcurrency ? "✅ YES" : "❌ NO"}`
  );
  console.log(`Total Requests: ${summary.requests}`);
  console.log(`Request Rate: ${summary.rps.toFixed(2)} RPS`);
  console.log(`Error Rate: ${summary.errorRate.toFixed(2)}%`);
  console.log(`Average Latency: ${summary.avgLatency.toFixed(2)}ms`);
  console.log(`P95 Latency: ${summary.p95Latency.toFixed(2)}ms`);

  // Only show P99 if it's available
  if (summary.p99Latency > 0) {
    console.log(`P99 Latency: ${summary.p99Latency.toFixed(2)}ms`);
  }

  console.log(
    `Avg Connection Time: ${summary.metadata.avgConnectionTime.toFixed(2)}ms`
  );

  if (!handlesMaxConcurrency) {
    console.log("\n⚠️  Concurrency Issues Detected:");
    if (errorRatePercent >= 10) {
      console.log(
        `   • High error rate under load: ${errorRatePercent.toFixed(
          2
        )}% (threshold: 10%)`
      );
    }
    if (p95Latency >= 3000) {
      console.log(
        `   • High P95 latency under load: ${p95Latency.toFixed(
          2
        )}ms (threshold: 3000ms)`
      );
    }
    console.log(
      `   • Consider reducing concurrent connections to ~${effectiveMaxConnections}`
    );
  }

  return {
    [`results/concurrency-${endpoint_name}-${timestamp}.json`]: JSON.stringify(
      summary,
      null,
      2
    ),
  };
}
