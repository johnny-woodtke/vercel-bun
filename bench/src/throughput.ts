import { check } from "k6";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("error_rate");
const successRate = new Rate("success_rate");
const responseTime = new Trend("response_time");

// Configuration
const baseUrl: string = __ENV.BASE_URL || "https://vercel-bun-bench.vercel.app";
const endpoint: string = __ENV.ENDPOINT || "/api/bun";
const maxRps: number = parseInt(__ENV.MAX_RPS || "1000");
const rampUpDuration: string = __ENV.RAMP_UP_DURATION || "2m";
const sustainDuration: string = __ENV.SUSTAIN_DURATION || "3m";

export const options = {
  scenarios: {
    throughput_ramp: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { duration: rampUpDuration, target: maxRps }, // Ramp up to max RPS
        { duration: sustainDuration, target: maxRps }, // Sustain max RPS
        { duration: "30s", target: 0 }, // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% of requests must complete below 2s
    error_rate: ["rate<0.05"], // Error rate must be less than 5% for throughput test
    success_rate: ["rate>0.95"], // Success rate must be greater than 95%
  },
};

export default function () {
  const url = `${baseUrl}${endpoint}`;

  const payload = JSON.stringify({
    test: "throughput",
    timestamp: Date.now(),
    maxRps: maxRps,
    iteration: __ITER,
    vu: __VU,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
    tags: {
      endpoint: endpoint,
      test_type: "throughput",
    },
  };

  const response = http.post(url, payload, params);

  // Record metrics
  const success = check(response, {
    "status is 200": (r) => r.status === 200,
    "response time < 2000ms": (r) => r.timings.duration < 2000,
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

  // Track different types of errors
  if (response.status >= 500) {
    console.warn(
      `Server error: ${response.status} at RPS ~${
        __ENV.CURRENT_RPS || "unknown"
      }`
    );
  } else if (response.status >= 400) {
    console.warn(
      `Client error: ${response.status} at RPS ~${
        __ENV.CURRENT_RPS || "unknown"
      }`
    );
  }
}

export function handleSummary(data: any) {
  const endpoint_name = endpoint.replace("/api/", "").replace("/", "-");
  const timestamp = new Date().getTime();

  // Helper function to safely get metric values
  const safeMetric = (value: any, fallback: number = 0): number => {
    return value !== undefined && value !== null ? value : fallback;
  };

  // Calculate maximum sustainable RPS
  const actualRps = safeMetric(data.metrics.http_reqs?.values?.rate);
  const errorRatePercent =
    safeMetric(data.metrics.http_req_failed?.values?.rate) * 100;
  const p95Latency = safeMetric(
    data.metrics.http_req_duration?.values?.["p(95)"]
  );

  // Determine if the endpoint can handle the target load
  const canSustainLoad = errorRatePercent < 5 && p95Latency < 2000;
  const maxSustainableRps = canSustainLoad ? actualRps : actualRps * 0.8; // Conservative estimate

  const summary = {
    endpoint: endpoint_name,
    testType: "throughput",
    timestamp: new Date(),
    duration:
      (parseFloat(rampUpDuration.replace("m", "")) +
        parseFloat(sustainDuration.replace("m", ""))) *
      60000,
    targetMaxRps: maxRps,
    actualRps: actualRps,
    maxSustainableRps: maxSustainableRps,
    requests: safeMetric(data.metrics.http_reqs?.values?.count),
    avgLatency: safeMetric(data.metrics.http_req_duration?.values?.avg),
    p50Latency: safeMetric(data.metrics.http_req_duration?.values?.med),
    p95Latency: p95Latency,
    p99Latency: safeMetric(data.metrics.http_req_duration?.values?.["p(99)"]),
    maxLatency: safeMetric(data.metrics.http_req_duration?.values?.max),
    minLatency: safeMetric(data.metrics.http_req_duration?.values?.min),
    errors: safeMetric(data.metrics.http_req_failed?.values?.count),
    errorRate: errorRatePercent,
    bytesTransferred: safeMetric(data.metrics.data_received?.values?.count),
    canSustainTargetLoad: canSustainLoad,
    metadata: {
      rampUpDuration: rampUpDuration,
      sustainDuration: sustainDuration,
      maxVUs: safeMetric(data.metrics.vus?.values?.max),
      iterations: safeMetric(data.metrics.iterations?.values?.count),
      dataReceived: safeMetric(data.metrics.data_received?.values?.count),
      dataSent: safeMetric(data.metrics.data_sent?.values?.count),
      httpReqBlocked: safeMetric(data.metrics.http_req_blocked?.values?.avg),
      httpReqConnecting: safeMetric(
        data.metrics.http_req_connecting?.values?.avg
      ),
      httpReqWaiting: safeMetric(data.metrics.http_req_waiting?.values?.avg),
      httpReqSending: safeMetric(data.metrics.http_req_sending?.values?.avg),
      httpReqReceiving: safeMetric(
        data.metrics.http_req_receiving?.values?.avg
      ),
    },
  };

  // Console output
  console.log("\n📊 Throughput Test Results:");
  console.log(`Endpoint: ${endpoint_name.toUpperCase()}`);
  console.log(`Target Max RPS: ${maxRps}`);
  console.log(`Actual Average RPS: ${summary.actualRps.toFixed(2)}`);
  console.log(`Max Sustainable RPS: ${summary.maxSustainableRps.toFixed(2)}`);
  console.log(
    `Can Sustain Target Load: ${canSustainLoad ? "✅ YES" : "❌ NO"}`
  );
  console.log(`Total Requests: ${summary.requests}`);
  console.log(`Error Rate: ${summary.errorRate.toFixed(2)}%`);
  console.log(`P95 Latency: ${summary.p95Latency.toFixed(2)}ms`);

  // Only show P99 if it's available
  if (summary.p99Latency > 0) {
    console.log(`P99 Latency: ${summary.p99Latency.toFixed(2)}ms`);
  }

  if (!canSustainLoad) {
    console.log("\n⚠️  Performance Issues Detected:");
    if (errorRatePercent >= 5) {
      console.log(
        `   • High error rate: ${errorRatePercent.toFixed(2)}% (threshold: 5%)`
      );
    }
    if (p95Latency >= 2000) {
      console.log(
        `   • High P95 latency: ${p95Latency.toFixed(2)}ms (threshold: 2000ms)`
      );
    }
  }

  return {
    [`results/throughput-${endpoint_name}-${timestamp}.json`]: JSON.stringify(
      summary,
      null,
      2
    ),
  };
}
