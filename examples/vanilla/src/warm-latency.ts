import { sleep } from "k6";

import {
  createBaseSummary,
  createCommonMetrics,
  createPayload,
  createRequestParams,
  createStandardThresholds,
  executeRequest,
  getCommonConfig,
  logBasicResults,
  saveResults,
} from "./utils.ts";

// Configuration using common utilities
const { baseUrl, endpoint, testDuration, rpsTarget, thinkTime } =
  getCommonConfig();

// Custom metrics using common utilities
const metrics = createCommonMetrics();

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
  thresholds: createStandardThresholds({
    maxLatencyP95: 1000,
    maxErrorRate: 0.01,
    minSuccessRate: 0.99,
  }),
};

export default function () {
  const url = `${baseUrl}${endpoint}`;

  // Create payload using utility
  const payload = createPayload("warm-latency", {
    rps: rpsTarget,
  });

  // Create request params using utility
  const params = createRequestParams("warm-latency", endpoint);

  // Execute request with common logic
  const { response, checkResult } = executeRequest(
    url,
    payload,
    params,
    metrics,
    1000
  );

  // Optional: Add think time
  if (thinkTime > 0) {
    sleep(thinkTime);
  }
}

export function handleSummary(data: any) {
  const endpoint_name = endpoint.replace("/api/", "").replace("/", "-");

  // Create base summary using utility
  const baseSummary = createBaseSummary(
    data,
    "warm-latency",
    endpoint,
    parseFloat(testDuration.replace("s", "")) * 1000,
    {
      rpsTarget: rpsTarget,
      actualRps: data.metrics.http_reqs?.values?.rate || 0,
    }
  );

  // Extended summary with test-specific data
  const summary = {
    ...baseSummary,
    rpsTarget: rpsTarget,
    actualRps: baseSummary.metadata.actualRps,
  };

  // Log results using utility
  logBasicResults(baseSummary, "Warm Latency Test Results");
  console.log(
    `Target RPS: ${rpsTarget}, Actual RPS: ${summary.actualRps.toFixed(2)}`
  );

  // Save results using utility
  return saveResults(summary, `warm-latency-${endpoint_name}`);
}
