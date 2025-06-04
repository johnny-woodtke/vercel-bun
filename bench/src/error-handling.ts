import { check, sleep } from "k6";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

import {
  createBaseSummary,
  getCommonConfig,
  logBasicResults,
  safeMetric,
  saveResults,
} from "./k6-utils.ts";

// Configuration using common utilities
const config = getCommonConfig();
const { baseUrl, endpoint } = config;

// Custom metrics for error handling tests
const malformedJsonRate = new Rate("malformed_json_rate");
const oversizedPayloadRate = new Rate("oversized_payload_rate");
const invalidHeaderRate = new Rate("invalid_header_rate");
const errorResponseTime = new Trend("error_response_time");
const stabilityRate = new Rate("stability_rate");

export const options = {
  scenarios: {
    error_handling: {
      executor: "per-vu-iterations",
      vus: 5,
      iterations: 10, // Each VU will run 10 iterations of error tests
      maxDuration: "5m",
    },
  },
  thresholds: {
    error_response_time: ["p(95)<2000"], // Error responses should still be fast
    stability_rate: ["rate>0.95"], // System should remain stable (no 500s)
  },
};

interface ErrorTestCase {
  name: string;
  description: string;
  payload: string;
  headers: Record<string, string>;
  expectedStatus: number[];
  metric: Rate;
}

// Helper function for generating nested JSON
function generateNestedJson(depth: number): string {
  let json = '{"level": 0';
  for (let i = 1; i < depth; i++) {
    json += `, "nested${i}": {"level": ${i}`;
  }
  for (let i = 0; i < depth; i++) {
    json += "}";
  }
  return json;
}

// Test data generators
const errorTestCases: ErrorTestCase[] = [
  {
    name: "malformed_json",
    description: "Invalid JSON syntax",
    payload: '{"invalid": json, missing quotes}',
    headers: { "Content-Type": "application/json" },
    expectedStatus: [400, 422],
    metric: malformedJsonRate,
  },
  {
    name: "invalid_content_type",
    description: "Wrong content type",
    payload: JSON.stringify({ test: "error-handling" }),
    headers: { "Content-Type": "text/plain" },
    expectedStatus: [400, 415],
    metric: invalidHeaderRate,
  },
  {
    name: "missing_content_type",
    description: "No content type header",
    payload: JSON.stringify({ test: "error-handling" }),
    headers: {},
    expectedStatus: [400, 415],
    metric: invalidHeaderRate,
  },
  {
    name: "empty_payload",
    description: "Empty request body",
    payload: "",
    headers: { "Content-Type": "application/json" },
    expectedStatus: [400, 422],
    metric: malformedJsonRate,
  },
  {
    name: "oversized_payload",
    description: "Extremely large payload",
    payload: JSON.stringify({
      test: "oversized",
      data: "A".repeat(10 * 1024 * 1024), // 10MB payload
    }),
    headers: { "Content-Type": "application/json" },
    expectedStatus: [413, 400],
    metric: oversizedPayloadRate,
  },
  {
    name: "invalid_encoding",
    description: "Invalid character encoding",
    payload: Buffer.from([0xff, 0xfe, 0x00, 0x00]).toString(),
    headers: { "Content-Type": "application/json; charset=utf-8" },
    expectedStatus: [400, 422],
    metric: malformedJsonRate,
  },
  {
    name: "null_bytes",
    description: "Payload with null bytes",
    payload: JSON.stringify({ test: "null\0bytes\0test" }),
    headers: { "Content-Type": "application/json" },
    expectedStatus: [200, 400, 422], // Might be handled gracefully
    metric: malformedJsonRate,
  },
  {
    name: "extremely_nested",
    description: "Deeply nested JSON",
    payload: generateNestedJson(1000),
    headers: { "Content-Type": "application/json" },
    expectedStatus: [400, 413, 422],
    metric: malformedJsonRate,
  },
];

export default function () {
  const url = `${baseUrl}${endpoint}`;

  // Test each error case
  for (const testCase of errorTestCases) {
    const startTime = Date.now();

    const response = http.post(url, testCase.payload, {
      headers: testCase.headers,
      tags: {
        endpoint: endpoint,
        test_type: "error-handling",
        error_case: testCase.name,
      },
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Check if response is as expected
    const isExpectedStatus = testCase.expectedStatus.includes(response.status);
    const isStable = response.status < 500; // No server errors
    const hasReasonableResponseTime = responseTime < 5000;
    const hasErrorDetails = (() => {
      if (!response.body) return false;
      if (typeof response.body === "string") return response.body.length > 0;
      if (response.body instanceof ArrayBuffer)
        return response.body.byteLength > 0;
      return false;
    })();

    const success = check(response, {
      [`${testCase.name}: expected status`]: () => isExpectedStatus,
      [`${testCase.name}: system stable`]: () => isStable,
      [`${testCase.name}: fast error response`]: () =>
        hasReasonableResponseTime,
      [`${testCase.name}: error details provided`]: () => hasErrorDetails,
    });

    // Record metrics
    testCase.metric.add(isExpectedStatus);
    stabilityRate.add(isStable);
    errorResponseTime.add(responseTime);

    // Log unexpected behaviors
    if (!isExpectedStatus) {
      console.warn(
        `${testCase.name}: Unexpected status ${
          response.status
        }, expected one of [${testCase.expectedStatus.join(", ")}]`
      );
    }

    if (!isStable) {
      console.error(
        `${testCase.name}: Server error ${response.status} - System instability detected!`
      );
    }

    if (responseTime > 2000) {
      console.warn(`${testCase.name}: Slow error response: ${responseTime}ms`);
    }

    // Small delay between error tests
    sleep(0.1);
  }

  // Test normal request after error tests to ensure system recovery
  const recoveryPayload = JSON.stringify({
    test: "recovery-after-errors",
    timestamp: Date.now(),
  });

  const recoveryResponse = http.post(url, recoveryPayload, {
    headers: { "Content-Type": "application/json" },
    tags: {
      endpoint: endpoint,
      test_type: "error-recovery",
    },
  });

  const recoverySuccess = check(recoveryResponse, {
    "recovery: status 200": (r) => r.status === 200,
    "recovery: fast response": (r) => r.timings.duration < 1000,
    "recovery: has body": (r) => {
      if (!r.body) return false;
      if (typeof r.body === "string") return r.body.length > 0;
      if (r.body instanceof ArrayBuffer) return r.body.byteLength > 0;
      return false;
    },
  });

  stabilityRate.add(recoveryResponse.status < 500);

  if (!recoverySuccess) {
    console.error(
      `Recovery test failed! Status: ${recoveryResponse.status}, Time: ${recoveryResponse.timings.duration}ms`
    );
  }
}

export function handleSummary(data: any) {
  const endpoint_name = endpoint.replace("/api/", "").replace("/", "-");

  // Create base summary using utility
  const baseSummary = createBaseSummary(
    data,
    "error-handling",
    endpoint,
    safeMetric(data.state?.testRunDurationMs)
  );

  // Calculate error handling specific metrics
  const stabilityRatePercent =
    safeMetric(data.metrics.stability_rate?.values?.rate) * 100;
  const avgErrorResponseTime = safeMetric(
    data.metrics.error_response_time?.values?.avg
  );
  const p95ErrorResponseTime = safeMetric(
    data.metrics.error_response_time?.values?.["p(95)"]
  );

  // Calculate individual error test rates
  const errorTestResults = {
    malformedJson:
      safeMetric(data.metrics.malformed_json_rate?.values?.rate) * 100,
    oversizedPayload:
      safeMetric(data.metrics.oversized_payload_rate?.values?.rate) * 100,
    invalidHeader:
      safeMetric(data.metrics.invalid_header_rate?.values?.rate) * 100,
  };

  const overallErrorHandling =
    Object.values(errorTestResults).reduce((sum, rate) => sum + rate, 0) /
    Object.keys(errorTestResults).length;

  // Extended summary with error handling specific data
  const summary = {
    ...baseSummary,
    stabilityRate: stabilityRatePercent,
    avgErrorResponseTime: avgErrorResponseTime,
    p95ErrorResponseTime: p95ErrorResponseTime,
    maxErrorResponseTime: safeMetric(
      data.metrics.error_response_time?.values?.max
    ),
    minErrorResponseTime: safeMetric(
      data.metrics.error_response_time?.values?.min
    ),
    overallErrorHandling: overallErrorHandling,
    errorTestResults: errorTestResults,
    metadata: {
      ...baseSummary.metadata,
      totalRequests: baseSummary.requests,
    },
  };

  // Log results using utility
  logBasicResults(baseSummary, "Error Handling Test Results");
  console.log(`System Stability Rate: ${summary.stabilityRate.toFixed(2)}%`);
  console.log(
    `Overall Error Handling: ${summary.overallErrorHandling.toFixed(2)}%`
  );
  console.log(
    `Average Error Response Time: ${summary.avgErrorResponseTime.toFixed(2)}ms`
  );
  console.log(
    `P95 Error Response Time: ${summary.p95ErrorResponseTime.toFixed(2)}ms`
  );

  // Detailed error test results
  console.log("\n🔍 Error Test Details:");
  console.log(
    `   • Malformed JSON handling: ${errorTestResults.malformedJson.toFixed(
      1
    )}%`
  );
  console.log(
    `   • Oversized payload handling: ${errorTestResults.oversizedPayload.toFixed(
      1
    )}%`
  );
  console.log(
    `   • Invalid header handling: ${errorTestResults.invalidHeader.toFixed(
      1
    )}%`
  );

  if (summary.stabilityRate < 95) {
    console.log("\n⚠️  System Stability Issues:");
    console.log(
      `   • System stability rate: ${summary.stabilityRate.toFixed(
        2
      )}% (threshold: 95%)`
    );
    console.log("   • Server errors detected during error handling tests");
  }

  if (summary.p95ErrorResponseTime > 2000) {
    console.log("\n⚠️  Error Response Performance Issues:");
    console.log(
      `   • P95 error response time: ${summary.p95ErrorResponseTime.toFixed(
        2
      )}ms (threshold: 2000ms)`
    );
    console.log("   • Error responses are taking too long");
  }

  // Save results using utility
  return saveResults(summary, `error-handling-${endpoint_name}`);
}
