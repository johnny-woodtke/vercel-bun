import { check } from "k6";
import http from "k6/http";
import { Trend } from "k6/metrics";

import {
  createBaseSummary,
  createCommonMetrics,
  createRequestParams,
  createStandardThresholds,
  formatBytes,
  generatePayloadOfSize,
  getCommonConfig,
  logBasicResults,
  logRequestError,
  safeMetric,
  saveResults,
} from "./k6-utils.ts";

// Configuration using common utilities
const config = getCommonConfig();
const {
  baseUrl,
  endpoint,
  payloadSize: configPayloadSize,
  iterations,
} = config;

// Ensure payloadSize has a default value
const payloadSize = configPayloadSize || 1024;

// Custom metrics using common utilities plus payload-specific metrics
const metrics = createCommonMetrics();
const payloadProcessingTime = new Trend("payload_processing_time");

export const options = {
  scenarios: {
    payload_test: {
      executor: "shared-iterations",
      vus: 10,
      iterations: iterations,
      maxDuration: "10m",
    },
  },
  thresholds: createStandardThresholds({
    maxLatencyP95: 5000, // Allow more time for large payloads
    maxErrorRate: 0.02,
    minSuccessRate: 0.98,
  }),
};

export default function () {
  const url = `${baseUrl}${endpoint}`;

  // Generate payload of specific size using utility
  const payload = generatePayloadOfSize(payloadSize);

  // Create request params with additional headers
  const params = createRequestParams("payload-size", endpoint, {
    payload_size: payloadSize.toString(),
  });

  const startTime = Date.now();
  const response = http.post(url, payload, params);
  const endTime = Date.now();

  const processingTime = endTime - startTime;

  // Perform custom checks for payload-specific concerns
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

  // Record metrics
  metrics.errorRate.add(!success);
  metrics.responseTime.add(response.timings.duration);
  payloadProcessingTime.add(processingTime);

  // Log payload-specific issues
  if (!success) {
    if (response.status === 413) {
      console.warn(`Payload too large: ${formatBytes(payloadSize)} rejected`);
    } else {
      logRequestError(response, `${formatBytes(payloadSize)} payload`);
    }
  }
}

export function handleSummary(data: any) {
  const endpoint_name = endpoint.replace("/api/", "").replace("/", "-");

  // Create base summary using utility
  const baseSummary = createBaseSummary(
    data,
    "payload-size",
    endpoint,
    safeMetric(data.state?.testRunDurationMs)
  );

  // Calculate payload-specific metrics
  const totalDataSent = safeMetric(data.metrics.data_sent?.values?.count);
  const totalDataReceived = safeMetric(
    data.metrics.data_received?.values?.count
  );
  const testDuration = safeMetric(data.state?.testRunDurationMs, 1) / 1000; // Convert to seconds
  const throughputMbps =
    ((totalDataSent + totalDataReceived) * 8) / (testDuration * 1024 * 1024);

  // Extended summary with payload-specific data
  const summary = {
    ...baseSummary,
    payloadSize: payloadSize,
    payloadSizeFormatted: formatBytes(payloadSize),
    iterations: iterations,
    successfulRequests: baseSummary.requests - baseSummary.errors,
    bytesTransferred: totalDataSent + totalDataReceived,
    throughputMbps: throughputMbps,
    avgProcessingTime:
      safeMetric(data.metrics.payload_processing_time?.values?.avg) ||
      baseSummary.avgLatency,
    metadata: {
      ...baseSummary.metadata,
      dataSent: totalDataSent,
      dataReceived: totalDataReceived,
    },
  };

  // Log results using utility
  logBasicResults(baseSummary, "Payload Size Test Results");
  console.log(`Payload Size: ${summary.payloadSizeFormatted}`);
  console.log(`Successful Requests: ${summary.successfulRequests}`);
  console.log(`Throughput: ${summary.throughputMbps.toFixed(2)} Mbps`);
  console.log(`Avg Processing Time: ${summary.avgProcessingTime.toFixed(2)}ms`);

  if (summary.errorRate > 0) {
    console.log(`\n⚠️  Issues with ${summary.payloadSizeFormatted} payload:`);
    console.log(`   • Error rate: ${summary.errorRate.toFixed(2)}%`);
    if (summary.avgLatency > 5000) {
      console.log(`   • High latency: ${summary.avgLatency.toFixed(2)}ms`);
    }
  }

  // Save results using utility
  return saveResults(summary, `payload-size-${endpoint_name}`);
}
