import http from "k6/http";
import { check } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("error_rate");
const responseTime = new Trend("response_time");
const payloadProcessingTime = new Trend("payload_processing_time");

// Configuration
const baseUrl: string = __ENV.BASE_URL || "https://vercel-bun-bench.vercel.app";
const endpoint: string = __ENV.ENDPOINT || "/api/bun";
const payloadSize: number = parseInt(__ENV.PAYLOAD_SIZE || "1024"); // bytes
const iterations: number = parseInt(__ENV.ITERATIONS || "50");

// Generate payload of specific size
function generatePayload(sizeInBytes: number): string {
  const baseData = {
    test: "payload-size",
    timestamp: Date.now(),
    targetSize: sizeInBytes,
    id: Math.random().toString(36).substring(2, 15),
  };

  // Calculate remaining space for padding
  const baseSize = JSON.stringify(baseData).length;
  const paddingSize = Math.max(0, sizeInBytes - baseSize - 50); // Leave some buffer

  return JSON.stringify({
    ...baseData,
    padding: "A".repeat(paddingSize),
    actualSize: sizeInBytes,
  });
}

export const options = {
  scenarios: {
    payload_test: {
      executor: "shared-iterations",
      vus: 10,
      iterations: iterations,
      maxDuration: "10m",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<5000"], // Allow more time for large payloads
    error_rate: ["rate<0.02"], // Error rate must be less than 2%
  },
};

export default function () {
  const url = `${baseUrl}${endpoint}`;
  const payload = generatePayload(payloadSize);
  const actualSize = new Blob([payload]).size;

  const params = {
    headers: {
      "Content-Type": "application/json",
      "Content-Length": actualSize.toString(),
    },
    tags: {
      endpoint: endpoint,
      test_type: "payload-size",
      payload_size: payloadSize.toString(),
      actual_size: actualSize.toString(),
    },
  };

  const startTime = Date.now();
  const response = http.post(url, payload, params);
  const endTime = Date.now();

  const processingTime = endTime - startTime;

  // Record metrics
  const success = check(response, {
    "status is 200": (r) => r.status === 200,
    "response time reasonable": (r) => r.timings.duration < 10000,
    "response has body": (r) => {
      if (!r.body) return false;
      if (typeof r.body === "string") return r.body.length > 0;
      if (r.body instanceof ArrayBuffer) return r.body.byteLength > 0;
      return false;
    },
    "no server errors": (r) => r.status < 500,
    "payload accepted": (r) => {
      if (!r.body) return r.status !== 413;
      if (typeof r.body === "string") {
        return !r.body.includes("Payload Too Large") && r.status !== 413;
      }
      return r.status !== 413;
    },
  });

  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  payloadProcessingTime.add(processingTime);

  // Log issues
  if (!success) {
    if (response.status === 413) {
      console.warn(`Payload too large: ${formatBytes(actualSize)} rejected`);
    } else if (response.status >= 500) {
      console.warn(
        `Server error with ${formatBytes(actualSize)} payload: ${
          response.status
        }`
      );
    } else {
      console.warn(
        `Request failed with ${formatBytes(actualSize)} payload: ${
          response.status
        }`
      );
    }
  }
}

function formatBytes(bytes: number): string {
  const sizes = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
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
  const avgLatency = safeMetric(data.metrics.http_req_duration?.values?.avg);
  const p95Latency = safeMetric(
    data.metrics.http_req_duration?.values?.["p(95)"]
  );

  // Calculate throughput metrics
  const totalDataSent = safeMetric(data.metrics.data_sent?.values?.count);
  const totalDataReceived = safeMetric(
    data.metrics.data_received?.values?.count
  );
  const testDuration = safeMetric(data.state?.testRunDurationMs, 1) / 1000; // Convert to seconds
  const throughputMbps =
    ((totalDataSent + totalDataReceived) * 8) / (testDuration * 1024 * 1024);

  const summary = {
    endpoint: endpoint_name,
    testType: "payload-size",
    timestamp: new Date(),
    payloadSize: payloadSize,
    payloadSizeFormatted: formatBytes(payloadSize),
    iterations: iterations,
    duration: safeMetric(data.state?.testRunDurationMs),
    requests: safeMetric(data.metrics.http_reqs?.values?.count),
    successfulRequests:
      safeMetric(data.metrics.http_reqs?.values?.count) -
      safeMetric(data.metrics.http_req_failed?.values?.count),
    avgLatency: avgLatency,
    p50Latency: safeMetric(data.metrics.http_req_duration?.values?.med),
    p95Latency: p95Latency,
    p99Latency: safeMetric(data.metrics.http_req_duration?.values?.["p(99)"]),
    maxLatency: safeMetric(data.metrics.http_req_duration?.values?.max),
    minLatency: safeMetric(data.metrics.http_req_duration?.values?.min),
    errors: safeMetric(data.metrics.http_req_failed?.values?.count),
    errorRate: errorRatePercent,
    bytesTransferred: totalDataSent + totalDataReceived,
    throughputMbps: throughputMbps,
    avgProcessingTime:
      safeMetric(data.metrics.payload_processing_time?.values?.avg) ||
      avgLatency,
    metadata: {
      dataSent: totalDataSent,
      dataReceived: totalDataReceived,
      avgSendingTime: safeMetric(data.metrics.http_req_sending?.values?.avg),
      avgReceivingTime: safeMetric(
        data.metrics.http_req_receiving?.values?.avg
      ),
      avgWaitingTime: safeMetric(data.metrics.http_req_waiting?.values?.avg),
      httpReqBlocked: safeMetric(data.metrics.http_req_blocked?.values?.avg),
      httpReqConnecting: safeMetric(
        data.metrics.http_req_connecting?.values?.avg
      ),
    },
  };

  // Console output
  console.log("\n📊 Payload Size Test Results:");
  console.log(`Endpoint: ${endpoint_name.toUpperCase()}`);
  console.log(`Payload Size: ${summary.payloadSizeFormatted}`);
  console.log(`Total Requests: ${summary.requests}`);
  console.log(`Successful Requests: ${summary.successfulRequests}`);
  console.log(`Error Rate: ${summary.errorRate.toFixed(2)}%`);
  console.log(`Average Latency: ${summary.avgLatency.toFixed(2)}ms`);
  console.log(`P95 Latency: ${summary.p95Latency.toFixed(2)}ms`);

  // Only show P99 if it's available
  if (summary.p99Latency > 0) {
    console.log(`P99 Latency: ${summary.p99Latency.toFixed(2)}ms`);
  }

  console.log(`Throughput: ${summary.throughputMbps.toFixed(2)} Mbps`);
  console.log(`Data Transferred: ${formatBytes(summary.bytesTransferred)}`);

  // Performance analysis
  const latencyPerKB = avgLatency / (payloadSize / 1024);
  console.log(`Latency per KB: ${latencyPerKB.toFixed(2)}ms/KB`);

  if (errorRatePercent > 2) {
    console.log("\n⚠️  Payload Size Issues Detected:");
    console.log(
      `   • High error rate: ${errorRatePercent.toFixed(2)}% (threshold: 2%)`
    );
    if (safeMetric(data.metrics.http_req_failed?.values?.count) > 0) {
      console.log(
        `   • Consider reducing payload size or investigating server limits`
      );
    }
  }

  if (p95Latency > 5000) {
    console.log("\n⚠️  Performance Issues:");
    console.log(
      `   • High P95 latency: ${p95Latency.toFixed(2)}ms (threshold: 5000ms)`
    );
    console.log(`   • Large payloads may be impacting performance`);
  }

  return {
    [`results/payload-size-${endpoint_name}-${formatBytes(payloadSize).replace(
      " ",
      ""
    )}-${timestamp}.json`]: JSON.stringify(summary, null, 2),
  };
}
