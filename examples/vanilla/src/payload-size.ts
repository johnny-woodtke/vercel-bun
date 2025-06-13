import { sleep } from "k6";
import { Trend } from "k6/metrics";

import {
  createBaseSummary,
  createCommonMetrics,
  createRequestParams,
  createStandardThresholds,
  executeRequest,
  formatBytes,
  generatePayloadOfSize,
  getCommonConfig,
  logBasicResults,
  safeMetric,
  saveResults,
} from "./utils.ts";

// Configuration using common utilities
const { baseUrl, endpoint, iterations, payloadSizes } = getCommonConfig();

// Custom metrics using common utilities plus payload-specific metrics
const metrics = createCommonMetrics();
const processingTime = new Trend("processing_time");
const throughputMetric = new Trend("throughput_mbps");

export const options = {
  scenarios: {
    payload_size_test: {
      executor: "per-vu-iterations",
      vus: 1, // Single VU to ensure consistent timing
      iterations: iterations * payloadSizes.length, // iterations per payload size
      maxDuration: "10m", // Allow enough time for all sizes
    },
  },
  thresholds: {
    ...createStandardThresholds({
      maxLatencyP95: 5000, // Allow higher latency for large payloads
      maxErrorRate: 0.05,
      minSuccessRate: 0.95,
    }),
    processing_time: ["p(95)<3000"], // Processing time threshold
    throughput_mbps: ["avg>0.5"], // Minimum throughput threshold
  },
};

interface PayloadTestData {
  size: number;
  sizeFormatted: string;
  iterations: number;
  responses: number[];
  throughputValues: number[];
  processingTimes: number[];
  errors: number;
}

const testResults: { [key: number]: PayloadTestData } = {};

export function setup() {
  console.log(`📦 Starting Payload Size Test`);
  console.log(`Payload sizes: ${payloadSizes.map(formatBytes).join(", ")}`);
  console.log(`Iterations per size: ${iterations}`);
  console.log(`Total iterations: ${iterations * payloadSizes.length}`);
  console.log(`Endpoint: ${endpoint}`);

  // Initialize test results structure
  payloadSizes.forEach((size) => {
    testResults[size] = {
      size: size,
      sizeFormatted: formatBytes(size),
      iterations: 0,
      responses: [],
      throughputValues: [],
      processingTimes: [],
      errors: 0,
    };
  });

  return {
    payloadSizes: payloadSizes,
    iterations: iterations,
    testResults: testResults,
  };
}

export default function (data: any) {
  const url = `${baseUrl}${endpoint}`;

  // Use data from setup or fallback to global config
  const setupPayloadSizes = data?.payloadSizes || payloadSizes;
  const setupIterations = data?.iterations || iterations;

  // Calculate which payload size to use for this iteration
  const sizeIndex = Math.floor(__ITER / setupIterations);
  const currentSize = setupPayloadSizes[sizeIndex];
  const iterationWithinSize = (__ITER % setupIterations) + 1;

  if (currentSize === undefined) {
    console.error(
      `❌ Invalid payload size index: ${sizeIndex}, iteration: ${__ITER}`
    );
    return;
  }

  // Ensure testResults entry exists for this size
  if (!testResults[currentSize]) {
    testResults[currentSize] = {
      size: currentSize,
      sizeFormatted: formatBytes(currentSize),
      iterations: 0,
      responses: [],
      throughputValues: [],
      processingTimes: [],
      errors: 0,
    };
  }

  console.log(
    `📦 Testing ${formatBytes(
      currentSize
    )} - Iteration ${iterationWithinSize}/${setupIterations}`
  );

  // Generate payload of specific size
  const payloadData = generatePayloadOfSize(currentSize, "payload-size");

  // Create request params with payload size information
  const params = createRequestParams("payload-size", endpoint, {
    payload_size: currentSize.toString(),
    payload_size_formatted: formatBytes(currentSize),
    iteration_in_size: iterationWithinSize.toString(),
  });
  params.headers!["Content-Length"] = payloadData.length.toString();
  params.headers!["X-Payload-Size"] = currentSize.toString();

  // Measure processing time separately
  const startTime = Date.now();

  // Execute request with higher timeout for large payloads
  const maxDuration = Math.max(2000, currentSize / 1000); // Base 2s + 1ms per byte
  const { response, checkResult } = executeRequest(
    url,
    payloadData,
    params,
    metrics,
    maxDuration
  );

  const endTime = Date.now();
  const totalProcessingTime = endTime - startTime;

  // Calculate throughput in Mbps
  const bytesTransferred =
    payloadData.length + (response.body?.toString().length || 0);
  const throughputMbps =
    (bytesTransferred * 8) / (response.timings.duration * 1000); // Convert to Mbps

  // Record metrics
  processingTime.add(totalProcessingTime);
  throughputMetric.add(throughputMbps);

  // Store results for this payload size
  testResults[currentSize].iterations++;
  testResults[currentSize].responses.push(response.timings.duration);
  testResults[currentSize].throughputValues.push(throughputMbps);
  testResults[currentSize].processingTimes.push(totalProcessingTime);

  if (!checkResult.overall) {
    testResults[currentSize].errors++;
    console.warn(
      `❌ Payload test failed for ${formatBytes(currentSize)}: Status ${
        response.status
      }, Time: ${response.timings.duration.toFixed(2)}ms`
    );
  } else {
    console.log(
      `✅ ${formatBytes(currentSize)}: ${response.timings.duration.toFixed(
        2
      )}ms, ${throughputMbps.toFixed(2)} Mbps`
    );
  }

  // Short delay between requests to avoid overwhelming the server
  sleep(0.1);
}

export function teardown() {
  console.log("\n📊 Payload Size Test Results Summary:\n");

  // Display results for each payload size
  payloadSizes.forEach((size) => {
    const data = testResults[size];
    if (!data || data.iterations === 0) return;

    const avgResponseTime =
      data.responses.reduce((sum, time) => sum + time, 0) /
      data.responses.length;
    const avgThroughput =
      data.throughputValues.reduce((sum, tp) => sum + tp, 0) /
      data.throughputValues.length;
    const avgProcessingTime =
      data.processingTimes.reduce((sum, time) => sum + time, 0) /
      data.processingTimes.length;
    const successRate =
      ((data.iterations - data.errors) / data.iterations) * 100;

    console.log(`${data.sizeFormatted}:`);
    console.log(`  Iterations: ${data.iterations}`);
    console.log(`  Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`  Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Avg Throughput: ${avgThroughput.toFixed(2)} Mbps`);
    console.log(`  Avg Processing Time: ${avgProcessingTime.toFixed(2)}ms`);
    console.log(`  Errors: ${data.errors}\n`);
  });

  // Performance analysis
  console.log("📈 Performance Analysis:");

  // Find the best performing payload size
  let bestSize = payloadSizes[0] || 0;
  let bestThroughput = 0;

  payloadSizes.forEach((size) => {
    const data = testResults[size];
    if (!data || data.iterations === 0) return;

    const avgThroughput =
      data.throughputValues.reduce((sum: number, tp: number) => sum + tp, 0) /
      data.throughputValues.length;
    if (avgThroughput > bestThroughput) {
      bestThroughput = avgThroughput;
      bestSize = size;
    }
  });

  console.log(
    `Best throughput: ${formatBytes(bestSize)} at ${bestThroughput.toFixed(
      2
    )} Mbps`
  );

  // Check for performance degradation with larger payloads
  const firstPayloadSize = payloadSizes[0];
  const lastPayloadSize = payloadSizes[payloadSizes.length - 1];

  const smallPayloadThroughput =
    firstPayloadSize !== undefined && testResults[firstPayloadSize]
      ? testResults[firstPayloadSize].throughputValues.reduce(
          (sum: number, tp: number) => sum + tp,
          0
        ) / (testResults[firstPayloadSize].throughputValues.length || 1) || 0
      : 0;

  const largePayloadThroughput =
    lastPayloadSize !== undefined && testResults[lastPayloadSize]
      ? testResults[lastPayloadSize].throughputValues.reduce(
          (sum: number, tp: number) => sum + tp,
          0
        ) / (testResults[lastPayloadSize].throughputValues.length || 1) || 0
      : 0;

  const throughputRatio = largePayloadThroughput / smallPayloadThroughput;

  if (throughputRatio > 0.8) {
    console.log("✅ Payload size scaling is excellent");
  } else if (throughputRatio > 0.5) {
    console.log("⚠️  Payload size scaling shows some degradation");
  } else {
    console.log("❌ Significant performance degradation with larger payloads");
  }
}

export function handleSummary(data: any) {
  const endpoint_name = endpoint.replace("/api/", "").replace("/", "-");

  // Calculate comprehensive test duration
  const testDuration = safeMetric(data.state?.testRunDurationMs) || 0;

  // Create base summary using utility
  const baseSummary = createBaseSummary(
    data,
    "payload-size",
    endpoint,
    testDuration
  );

  // Calculate payload-specific metrics across all sizes
  const avgProcessingTime = safeMetric(
    data.metrics.processing_time?.values?.avg
  );
  const avgThroughputMbps = safeMetric(
    data.metrics.throughput_mbps?.values?.avg
  );
  const totalIterations = baseSummary.requests;
  const totalErrors = baseSummary.errors;

  // Find the most tested payload size (fallback)
  let primaryPayloadSize = payloadSizes[0] || 1024;
  let maxIterations = 0;

  payloadSizes.forEach((size) => {
    const data = testResults[size];
    if (data && data.iterations > maxIterations) {
      maxIterations = data.iterations;
      primaryPayloadSize = size;
    }
  });

  // Extended summary with payload-specific data
  const summary = {
    ...baseSummary,
    payloadSize: primaryPayloadSize, // Primary payload size for compatibility
    payloadSizeFormatted: formatBytes(primaryPayloadSize),
    payloadSizes: payloadSizes,
    iterations: totalIterations,
    successfulRequests: totalIterations - totalErrors,
    throughputMbps: avgThroughputMbps,
    avgProcessingTime: avgProcessingTime,
    payloadResults: testResults, // Detailed results for each payload size
    metadata: {
      ...baseSummary.metadata,
      payloadSizes: payloadSizes.map(formatBytes),
      iterationsPerSize: iterations,
      avgThroughputMbps: avgThroughputMbps,
      avgProcessingTime: avgProcessingTime,
    },
  };

  // Log results using utility
  logBasicResults(baseSummary, "Payload Size Test Results");
  console.log(`\n📦 Payload Analysis:`);
  console.log(
    `Payload sizes tested: ${payloadSizes.map(formatBytes).join(", ")}`
  );
  console.log(`Total iterations: ${totalIterations}`);
  console.log(`Average throughput: ${avgThroughputMbps.toFixed(2)} Mbps`);
  console.log(`Average processing time: ${avgProcessingTime.toFixed(2)}ms`);
  console.log(
    `Success rate: ${(
      ((totalIterations - totalErrors) / totalIterations) *
      100
    ).toFixed(1)}%`
  );

  // Performance assessment
  if (avgThroughputMbps >= 2.0 && baseSummary.errorRate <= 5) {
    console.log("\n✅ Payload handling performance is excellent");
  } else if (avgThroughputMbps >= 1.0 && baseSummary.errorRate <= 10) {
    console.log("\n⚠️  Payload handling performance is acceptable");
  } else {
    console.log("\n❌ Payload handling performance needs improvement");
    console.log(
      "   • Consider optimizing request parsing, memory allocation, or response generation"
    );
  }

  // Save results using utility
  return saveResults(summary, `payload-size-${endpoint_name}`);
}
