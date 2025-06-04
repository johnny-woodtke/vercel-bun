import { check, sleep } from "k6";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("error_rate");
const successRate = new Rate("success_rate");
const responseTime = new Trend("response_time");

// Configuration
const baseUrl: string = __ENV.BASE_URL || "https://vercel-bun-bench.vercel.app";
const endpoint: string = __ENV.ENDPOINT || "/api/bun";
const testDuration: string = __ENV.DURATION || "60s";
const rpsTarget: number = parseInt(__ENV.RPS || "100");

export const options = {
  scenarios: {
    warm_latency: {
      executor: "constant-arrival-rate",
      rate: rpsTarget,
      timeUnit: "1s",
      duration: testDuration,
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1000"], // 95% of requests must complete below 1s
    error_rate: ["rate<0.01"], // Error rate must be less than 1%
    success_rate: ["rate>0.99"], // Success rate must be greater than 99%
  },
};

export default function () {
  const url = `${baseUrl}${endpoint}`;

  const payload = JSON.stringify({
    test: "warm-latency",
    timestamp: Date.now(),
    rps: rpsTarget,
    iteration: __ITER,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
    tags: {
      endpoint: endpoint,
      test_type: "warm-latency",
    },
  };

  const response = http.post(url, payload, params);

  // Record metrics
  const success = check(response, {
    "status is 200": (r) => r.status === 200,
    "response time < 1000ms": (r) => r.timings.duration < 1000,
    "response has body": (r) => {
      if (!r.body) return false;
      if (typeof r.body === "string") return r.body.length > 0;
      if (r.body instanceof ArrayBuffer) return r.body.byteLength > 0;
      return false;
    },
    "no server errors": (r) => r.status < 500,
  });

  errorRate.add(!success);
  successRate.add(success);
  responseTime.add(response.timings.duration);

  // Optional: Add some think time to simulate real user behavior
  if (__ENV.THINK_TIME) {
    sleep(parseFloat(__ENV.THINK_TIME));
  }
}

export function handleSummary(data: any) {
  const endpoint_name = endpoint.replace("/api/", "").replace("/", "-");
  const timestamp = new Date().getTime();

  // Helper function to safely get metric values
  const safeMetric = (value: any, fallback: number = 0): number => {
    return value !== undefined && value !== null ? value : fallback;
  };

  // Create detailed summary
  const summary = {
    endpoint: endpoint_name,
    testType: "warm-latency",
    timestamp: new Date(),
    duration: parseFloat(testDuration.replace("s", "")) * 1000, // Convert to ms
    rpsTarget: rpsTarget,
    actualRps: safeMetric(data.metrics.http_reqs?.values?.rate),
    requests: safeMetric(data.metrics.http_reqs?.values?.count),
    avgLatency: safeMetric(data.metrics.http_req_duration?.values?.avg),
    p50Latency: safeMetric(data.metrics.http_req_duration?.values?.med),
    p95Latency: safeMetric(data.metrics.http_req_duration?.values?.["p(95)"]),
    p99Latency: safeMetric(data.metrics.http_req_duration?.values?.["p(99)"]),
    maxLatency: safeMetric(data.metrics.http_req_duration?.values?.max),
    minLatency: safeMetric(data.metrics.http_req_duration?.values?.min),
    errors: safeMetric(data.metrics.http_req_failed?.values?.count),
    errorRate: safeMetric(data.metrics.http_req_failed?.values?.rate) * 100,
    bytesTransferred: safeMetric(data.metrics.data_received?.values?.count),
    metadata: {
      vus: safeMetric(data.metrics.vus?.values?.max),
      iterations: safeMetric(data.metrics.iterations?.values?.count),
      dataReceived: safeMetric(data.metrics.data_received?.values?.count),
      dataSent: safeMetric(data.metrics.data_sent?.values?.count),
      httpReqBlocked: safeMetric(data.metrics.http_req_blocked?.values?.avg),
      httpReqConnecting: safeMetric(
        data.metrics.http_req_connecting?.values?.avg
      ),
      httpReqWaiting: safeMetric(data.metrics.http_req_waiting?.values?.avg),
    },
  };

  // Console output
  console.log("\n📊 Warm Latency Test Results:");
  console.log(`Endpoint: ${endpoint_name.toUpperCase()}`);
  console.log(
    `Target RPS: ${rpsTarget}, Actual RPS: ${summary.actualRps.toFixed(2)}`
  );
  console.log(`Total Requests: ${summary.requests}`);
  console.log(`Success Rate: ${(100 - summary.errorRate).toFixed(2)}%`);
  console.log(`Average Latency: ${summary.avgLatency.toFixed(2)}ms`);
  console.log(`P95 Latency: ${summary.p95Latency.toFixed(2)}ms`);

  // Only show P99 if it's available
  if (summary.p99Latency > 0) {
    console.log(`P99 Latency: ${summary.p99Latency.toFixed(2)}ms`);
  }

  console.log(
    `Min/Max Latency: ${summary.minLatency.toFixed(
      2
    )}ms / ${summary.maxLatency.toFixed(2)}ms`
  );

  return {
    [`results/warm-latency-${endpoint_name}-${timestamp}.json`]: JSON.stringify(
      summary,
      null,
      2
    ),
  };
}
