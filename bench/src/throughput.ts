import {
  createBaseSummary,
  createCommonMetrics,
  createPayload,
  createRequestParams,
  createStandardThresholds,
  executeRequest,
  getCommonConfig,
  logBasicResults,
  logRequestError,
  safeMetric,
  saveResults,
} from "./utils.ts";

// Configuration using common utilities
const { baseUrl, endpoint, maxRps, rampUpDuration, sustainDuration } =
  getCommonConfig();

// Custom metrics using common utilities
const metrics = createCommonMetrics();

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
  thresholds: createStandardThresholds({
    maxLatencyP95: 2000,
    maxErrorRate: 0.05, // Higher tolerance for throughput test
    minSuccessRate: 0.95,
  }),
};

export default function () {
  const url = `${baseUrl}${endpoint}`;

  // Create payload using utility
  const payload = createPayload("throughput", {
    maxRps: maxRps,
  });

  // Create request params using utility
  const params = createRequestParams("throughput", endpoint);

  // Execute request with common logic (allow higher latency for throughput test)
  const { response, checkResult } = executeRequest(
    url,
    payload,
    params,
    metrics,
    2000
  );

  // Track different types of errors with context
  if (!checkResult.overall) {
    logRequestError(response, "throughput-test");
  }
}

export function handleSummary(data: any) {
  const endpoint_name = endpoint.replace("/api/", "").replace("/", "-");

  // Calculate test duration
  const duration =
    (parseFloat(rampUpDuration.replace("m", "")) +
      parseFloat(sustainDuration.replace("m", ""))) *
    60000;

  // Create base summary using utility
  const baseSummary = createBaseSummary(data, "throughput", endpoint, duration);

  // Calculate throughput-specific metrics
  const actualRps = safeMetric(data.metrics.http_reqs?.values?.rate);
  const errorRatePercent = baseSummary.errorRate;
  const p95Latency = baseSummary.p95Latency;

  // Determine if the endpoint can handle the target load
  const canSustainLoad = errorRatePercent < 5 && p95Latency < 2000;
  const maxSustainableRps = canSustainLoad ? actualRps : actualRps * 0.8; // Conservative estimate

  // Extended summary with throughput-specific data
  const summary = {
    ...baseSummary,
    targetMaxRps: maxRps,
    actualRps: actualRps,
    maxSustainableRps: maxSustainableRps,
    canSustainTargetLoad: canSustainLoad,
    metadata: {
      ...baseSummary.metadata,
      rampUpDuration: rampUpDuration,
      sustainDuration: sustainDuration,
    },
  };

  // Log results using utility
  logBasicResults(baseSummary, "Throughput Test Results");
  console.log(`Target Max RPS: ${maxRps}`);
  console.log(`Actual Average RPS: ${summary.actualRps.toFixed(2)}`);
  console.log(`Max Sustainable RPS: ${summary.maxSustainableRps.toFixed(2)}`);
  console.log(
    `Can Sustain Target Load: ${canSustainLoad ? "✅ YES" : "❌ NO"}`
  );

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

  // Save results using utility
  return saveResults(summary, `throughput-${endpoint_name}`);
}
