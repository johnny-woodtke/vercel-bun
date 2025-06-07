import { check } from "k6";
import http, { type Response } from "k6/http";
import { Rate, Trend } from "k6/metrics";

// ========================================
// COMMON CONFIGURATION
// ========================================

export interface BenchConfig {
  baseUrl: string;
  endpoint: string;
  testDuration: string;
  rpsTarget: number;
  maxRps: number;
  maxConnections: number;
  payloadSize: number;
  payloadSizes: number[];
  iterations: number;
  burstRequests: number;
  burstDuration: string;
  burstIntensity: number;
  rampUpDuration: string;
  sustainDuration: string;
  thinkTime: number;
  coldStartWaitTimeMins: number;
  coldStartIterations: number;
  coldStartWarmupRequests: number;
  httpTimeout: string;
  connectionTimeout: string;
}

export function getCommonConfig(): BenchConfig {
  // Parse payload sizes from environment variable
  const payloadSizesStr = __ENV.PAYLOAD_SIZES || "100,1024,10240,102400";
  const payloadSizes = payloadSizesStr
    .split(",")
    .map((size) => parseInt(size.trim()));

  return {
    baseUrl: __ENV.BENCH_API_DOMAIN || "https://vercel-bun-bench.vercel.app",
    endpoint: __ENV.ENDPOINT || "/api/bun",
    testDuration: __ENV.DURATION || "90s",
    rpsTarget: parseInt(__ENV.RPS || "100"),
    maxRps: parseInt(__ENV.MAX_RPS || "1500"),
    maxConnections: parseInt(__ENV.MAX_CONNECTIONS || "1500"),
    payloadSize: parseInt(__ENV.PAYLOAD_SIZE || "1024"),
    payloadSizes: payloadSizes,
    iterations: parseInt(__ENV.ITERATIONS || "100"),
    burstRequests: parseInt(__ENV.BURST_REQUESTS || "500"),
    burstDuration: __ENV.BURST_DURATION || "10s",
    burstIntensity: parseInt(__ENV.BURST_INTENSITY || "100"),
    rampUpDuration: __ENV.RAMP_UP_DURATION || "3m",
    sustainDuration: __ENV.SUSTAIN_DURATION || "5m",
    thinkTime: parseFloat(__ENV.THINK_TIME || "0"),
    coldStartWaitTimeMins: parseFloat(__ENV.COLD_START_WAIT_TIME_MINS || "3"),
    coldStartIterations: parseInt(__ENV.COLD_START_ITERATIONS || "10"),
    coldStartWarmupRequests: parseInt(__ENV.COLD_START_WARMUP_REQUESTS || "5"),
    httpTimeout: __ENV.HTTP_TIMEOUT || "30s",
    connectionTimeout: __ENV.CONNECTION_TIMEOUT || "10s",
  };
}

// ========================================
// COMMON METRICS
// ========================================

export interface CommonMetrics {
  errorRate: Rate;
  successRate: Rate;
  responseTime: Trend;
}

export function createCommonMetrics(): CommonMetrics {
  return {
    errorRate: new Rate("error_rate"),
    successRate: new Rate("success_rate"),
    responseTime: new Trend("response_time"),
  };
}

// ========================================
// COMMON REQUEST HELPERS
// ========================================

export interface RequestParams {
  headers?: Record<string, string>;
  tags?: Record<string, string>;
}

export function createRequestParams(
  testType: string,
  endpoint: string,
  additionalTags?: Record<string, string>
): RequestParams {
  return {
    headers: {
      "Content-Type": "application/json",
    },
    tags: {
      endpoint: endpoint,
      test_type: testType,
      ...additionalTags,
    },
  };
}

export function createPayload(
  testType: string,
  additionalData?: Record<string, any>
): string {
  // Handle cases where __ITER and __VU are not defined (e.g., in teardown/setup)
  const iteration = typeof __ITER !== "undefined" ? __ITER : -1;
  const vu = typeof __VU !== "undefined" ? __VU : -1;

  return JSON.stringify({
    test: testType,
    timestamp: Date.now(),
    iteration: iteration,
    vu: vu,
    ...additionalData,
  });
}

// ========================================
// COMMON CHECKS
// ========================================

export interface CheckResult {
  status200: boolean;
  hasBody: boolean;
  noServerErrors: boolean;
  reasonableTime: boolean;
  overall: boolean;
}

export function performStandardChecks(
  response: Response,
  maxDuration: number = 1000
): CheckResult {
  const checks = {
    "status is 200": (r: Response) => r.status === 200,
    [`response time < ${maxDuration}ms`]: (r: Response) =>
      r.timings.duration < maxDuration,
    "response has body": (r: Response) => {
      if (!r.body) return false;
      if (typeof r.body === "string") return r.body.length > 0;
      if (r.body instanceof ArrayBuffer) return r.body.byteLength > 0;
      return false;
    },
    "no server errors": (r: Response) => r.status < 500,
  };

  const success = check(response, checks);

  return {
    status200: response.status === 200,
    hasBody: checks["response has body"](response),
    noServerErrors: response.status < 500,
    reasonableTime: response.timings.duration < maxDuration,
    overall: success,
  };
}

export function recordMetrics(
  metrics: CommonMetrics,
  checkResult: CheckResult,
  response: Response
): void {
  metrics.errorRate.add(!checkResult.overall);
  metrics.successRate.add(checkResult.overall);
  metrics.responseTime.add(response.timings.duration);
}

// ========================================
// COMMON REQUEST EXECUTION
// ========================================

export function executeRequest(
  url: string,
  payload: string,
  params: RequestParams,
  metrics: CommonMetrics,
  maxDuration: number = 1000
): { response: Response; checkResult: CheckResult } {
  const response = http.post(url, payload, params);
  const checkResult = performStandardChecks(response, maxDuration);
  recordMetrics(metrics, checkResult, response);

  return { response, checkResult };
}

// ========================================
// SUMMARY HANDLING UTILITIES
// ========================================

export function safeMetric(value: any, fallback: number = 0): number {
  return value !== undefined && value !== null ? value : fallback;
}

export interface BaseSummary {
  endpoint: string;
  testType: string;
  timestamp: Date;
  duration: number;
  requests: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  maxLatency: number;
  minLatency: number;
  errors: number;
  errorRate: number;
  bytesTransferred: number;
  metadata: Record<string, any>;
}

export function createBaseSummary(
  data: any,
  testType: string,
  endpoint: string,
  duration: number,
  additionalMetadata?: Record<string, any>
): BaseSummary {
  const endpointName = endpoint.replace("/api/", "").replace("/", "-");

  return {
    endpoint: endpointName,
    testType: testType,
    timestamp: new Date(),
    duration: duration,
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
      httpReqSending: safeMetric(data.metrics.http_req_sending?.values?.avg),
      httpReqReceiving: safeMetric(
        data.metrics.http_req_receiving?.values?.avg
      ),
      ...additionalMetadata,
    },
  };
}

export function logBasicResults(summary: BaseSummary, title: string): void {
  console.log(`\n📊 ${title}:`);
  console.log(`Endpoint: ${summary.endpoint.toUpperCase()}`);
  console.log(`Total Requests: ${summary.requests}`);
  console.log(`Success Rate: ${(100 - summary.errorRate).toFixed(2)}%`);
  console.log(`Average Latency: ${summary.avgLatency.toFixed(2)}ms`);
  console.log(`P95 Latency: ${summary.p95Latency.toFixed(2)}ms`);

  if (summary.p99Latency > 0) {
    console.log(`P99 Latency: ${summary.p99Latency.toFixed(2)}ms`);
  }

  console.log(
    `Min/Max Latency: ${summary.minLatency.toFixed(
      2
    )}ms / ${summary.maxLatency.toFixed(2)}ms`
  );
}

export function saveResults(
  summary: any,
  filename: string
): Record<string, string> {
  const timestamp = new Date().getTime();
  const fullFilename = `results/${filename}-${timestamp}.json`;

  return {
    [fullFilename]: JSON.stringify(summary, null, 2),
  };
}

// ========================================
// COMMON THRESHOLDS
// ========================================

export interface ThresholdConfig {
  maxLatencyP95: number;
  maxErrorRate: number;
  minSuccessRate: number;
  maxLatencyP99?: number;
  maxConnectionTime?: number;
}

export function createStandardThresholds(
  config: ThresholdConfig
): Record<string, string[]> {
  const thresholds: Record<string, string[]> = {
    http_req_duration: [`p(95)<${config.maxLatencyP95}`],
    error_rate: [`rate<${config.maxErrorRate}`],
    success_rate: [`rate>${config.minSuccessRate}`],
  };

  if (config.maxLatencyP99) {
    thresholds.http_req_duration?.push(`p(99)<${config.maxLatencyP99}`);
  }

  if (config.maxConnectionTime) {
    thresholds.http_req_connecting = [`p(95)<${config.maxConnectionTime}`];
  }

  return thresholds;
}

// ========================================
// PAYLOAD UTILITIES
// ========================================

export function generatePayloadOfSize(
  sizeInBytes: number,
  testType: string = "payload-size"
): string {
  const baseData = {
    test: testType,
    timestamp: Date.now(),
    targetSize: sizeInBytes,
    id: Math.random().toString(36).substring(2, 15),
  };

  const baseSize = JSON.stringify(baseData).length;
  const paddingSize = Math.max(0, sizeInBytes - baseSize - 50);

  return JSON.stringify({
    ...baseData,
    padding: "A".repeat(paddingSize),
    actualSize: sizeInBytes,
  });
}

export function formatBytes(bytes: number): string {
  const sizes = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// ========================================
// ERROR HANDLING UTILITIES
// ========================================

export function logRequestError(response: Response, context: string): void {
  if (response.status >= 500) {
    console.warn(`${context}: Server error ${response.status}`);
  } else if (response.status >= 400) {
    console.warn(`${context}: Client error ${response.status}`);
  } else if (response.status === 0) {
    console.warn(`${context}: Request timeout or network error`);
  }
}

export function isSuccessfulResponse(response: Response): boolean {
  return response.status >= 200 && response.status < 300;
}

export function shouldRetry(response: Response): boolean {
  // Retry on network errors, timeouts, or server errors (but not client errors)
  return response.status === 0 || response.status >= 500;
}
