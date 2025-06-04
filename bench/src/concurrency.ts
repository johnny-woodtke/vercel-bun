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
const { baseUrl, endpoint, testDuration } = config;
const maxConnections = config.maxConnections || 1000;

// Custom metrics using common utilities plus concurrency-specific metrics
const metrics = createCommonMetrics();
const connectionTime = new Trend("connection_time");

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
    ...createStandardThresholds({
      maxLatencyP95: 3000, // Allow higher latency under load
      maxErrorRate: 0.1, // Allow higher error rate under stress
      minSuccessRate: 0.9,
      maxConnectionTime: 1000,
    }),
  },
};

export default function () {
  const url = `${baseUrl}${endpoint}`;

  // Create payload using utility with concurrency-specific data
  const payload = createPayload("concurrency", {
    maxConnections: maxConnections,
    currentVU: __VU,
  });

  // Create request params with concurrency-specific headers and tags
  const params = createRequestParams("concurrency", endpoint, {
    vu_id: __VU.toString(),
  });
  params.headers!["User-Agent"] = `k6-concurrency-test-vu-${__VU}`;

  const response = http.post(url, payload, params);

  // Perform enhanced checks for concurrency scenarios
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

  // Record metrics
  metrics.errorRate.add(!success);
  metrics.successRate.add(success);
  metrics.responseTime.add(response.timings.duration);
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
  const endpoint_name = endpoint.replace("/api/", "").replace("/", "-");

  // Create base summary using utility
  const duration = parseFloat(testDuration?.replace("s", "") || "60") * 1000;
  const baseSummary = createBaseSummary(
    data,
    "concurrency",
    endpoint,
    duration
  );

  // Calculate concurrency-specific metrics
  const maxVUs = safeMetric(data.metrics.vus?.values?.max);
  const canSustainLoad =
    baseSummary.errorRate < 10 && baseSummary.p95Latency < 3000;
  const effectiveMaxConnections = canSustainLoad
    ? maxVUs
    : Math.floor(maxVUs * 0.8);

  // Extended summary with concurrency-specific data
  const summary = {
    ...baseSummary,
    targetMaxConnections: maxConnections,
    actualMaxVUs: maxVUs,
    effectiveMaxConnections: effectiveMaxConnections,
    handlesMaxConcurrency: canSustainLoad,
    rps: safeMetric(data.metrics.http_reqs?.values?.rate),
    metadata: {
      ...baseSummary.metadata,
      avgConnectionTime: safeMetric(
        data.metrics.http_req_connecting?.values?.avg
      ),
      p95ConnectionTime: safeMetric(
        data.metrics.http_req_connecting?.values?.["p(95)"]
      ),
      avgBlockingTime: safeMetric(data.metrics.http_req_blocked?.values?.avg),
    },
  };

  // Log results using utility
  logBasicResults(baseSummary, "Concurrency Stress Test Results");
  console.log(`Target Max Connections: ${maxConnections}`);
  console.log(`Actual Max VUs: ${maxVUs}`);
  console.log(`Effective Max Connections: ${effectiveMaxConnections}`);
  console.log(
    `Handles Max Concurrency: ${canSustainLoad ? "✅ YES" : "❌ NO"}`
  );
  console.log(`Request Rate: ${summary.rps.toFixed(2)} RPS`);
  console.log(
    `Avg Connection Time: ${summary.metadata.avgConnectionTime.toFixed(2)}ms`
  );

  if (!canSustainLoad) {
    console.log("\n⚠️  Concurrency Issues Detected:");
    if (baseSummary.errorRate >= 10) {
      console.log(
        `   • High error rate under load: ${baseSummary.errorRate.toFixed(
          2
        )}% (threshold: 10%)`
      );
    }
    if (baseSummary.p95Latency >= 3000) {
      console.log(
        `   • High P95 latency under load: ${baseSummary.p95Latency.toFixed(
          2
        )}ms (threshold: 3000ms)`
      );
    }
    console.log(
      `   • Consider reducing concurrent connections to ~${effectiveMaxConnections}`
    );
  }

  // Save results using utility
  return saveResults(summary, `concurrency-${endpoint_name}`);
}
