export interface BenchmarkConfig {
  baseUrl: string;
  endpoints: {
    bun: string;
    node: string;
  };
  tests: {
    coldStart: {
      waitTime: number; // minutes
      iterations: number;
    };
    warm: {
      duration: string;
      rps: number[];
    };
    throughput: {
      maxRps: number;
      rampUpDuration: string;
      sustainDuration: string;
    };
    concurrency: {
      connections: number[];
      duration: string;
    };
    payload: {
      sizes: number[]; // bytes
      iterations: number;
    };
    burst: {
      requests: number;
      duration: string;
      iterations: number;
    };
    consistency: {
      runs: number;
      requestsPerRun: number;
    };
  };
}

export const defaultConfig = {
  baseUrl:
    process.env.BENCH_API_DOMAIN || "https://vercel-bun-bench.vercel.app",
  endpoints: {
    bun: "/api/bun",
    node: "/api/node",
  },
  tests: {
    coldStart: {
      waitTime: 5, // 5 minutes
      iterations: 10,
    },
    warm: {
      duration: "60s",
      rps: [100, 200, 300, 500],
    },
    throughput: {
      maxRps: 1000,
      rampUpDuration: "2m",
      sustainDuration: "3m",
    },
    concurrency: {
      connections: [100, 200, 500, 1000],
      duration: "60s",
    },
    payload: {
      sizes: [1024, 10240, 102400, 1048576, 5242880], // 1KB, 10KB, 100KB, 1MB, 5MB
      iterations: 50,
    },
    burst: {
      requests: 1000,
      duration: "2s",
      iterations: 5,
    },
    consistency: {
      runs: 5,
      requestsPerRun: 100,
    },
  },
} as const satisfies BenchmarkConfig;

export function getConfig() {
  // Allow environment variable overrides
  const config = { ...defaultConfig };

  if (process.env.BENCH_API_DOMAIN) {
    config.baseUrl = process.env.BENCH_API_DOMAIN;
  }

  return config;
}
