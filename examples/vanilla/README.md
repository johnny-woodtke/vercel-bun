# Vanilla — Vercel Bun Runtime Example

This example demonstrates a comprehensive benchmarking suite comparing the performance of Bun and Node.js runtimes on Vercel serverless functions. It includes various performance tests to measure different aspects of serverless function execution.

## 🚀 Features

- **Performance Benchmarking**: Direct comparison between Bun and Node.js runtimes
- **Multiple Test Scenarios**:
  - Cold Start Performance
  - Warm Latency
  - Throughput Testing
  - Burst Traffic Handling
  - Concurrency Testing
  - Payload Size Impact
- **TypeScript Support**: Built with TypeScript for type safety
- **Automated Testing**: Includes test preparation and utility functions

## 📁 Project Structure

```
vanilla/
├── api/
│   ├── bun/          # Bun runtime serverless functions
│   ├── node/         # Node.js runtime serverless functions
│   ├── bun.ts        # Bun handler
│   └── node.ts       # Node.js handler
├── src/
│   ├── cold-start.ts     # Cold start performance tests
│   ├── warm-latency.ts   # Warm function latency tests
│   ├── throughput.ts     # Throughput measurement
│   ├── burst-traffic.ts  # Burst traffic handling
│   ├── concurrency.ts    # Concurrency testing
│   ├── payload-size.ts   # Payload size impact tests
│   ├── prepare.ts        # Test preparation utilities
│   └── utils.ts          # Shared utility functions
├── package.json      # Dependencies and scripts
├── tsconfig.json    # TypeScript configuration
└── vercel.json      # Vercel deployment config
```

## 🛠 Running the Tests

1. **Install dependencies**:

   ```bash
   bun install
   ```

2. **Run specific tests**:

   ```bash
   # Cold start test
   bun run src/cold-start.ts

   # Warm latency test
   bun run src/warm-latency.ts

   # Throughput test
   bun run src/throughput.ts

   # Burst traffic test
   bun run src/burst-traffic.ts

   # Concurrency test
   bun run src/concurrency.ts

   # Payload size test
   bun run src/payload-size.ts
   ```

## 📊 Test Scenarios

### Cold Start Performance

Measures the time taken for a serverless function to start from a cold state, including initialization and first execution.

### Warm Latency

Tests the response time of functions that are already "warm" (reused instances).

### Throughput Testing

Evaluates how many requests per second the function can handle under sustained load.

### Burst Traffic

Tests the system's ability to handle sudden spikes in traffic.

### Concurrency Testing

Measures performance under multiple concurrent requests.

### Payload Size Impact

Analyzes how different payload sizes affect function performance.

## 🚀 Deployment

The example is configured to deploy to Vercel with both Bun and Node.js runtimes:

```json
{
  "functions": {
    "api/bun.ts": {
      "runtime": "@godsreveal/vercel-bun@0.2.2"
    },
    "api/node.ts": {
      "runtime": "@vercel/node@2.15.8"
    }
  }
}
```

## 📚 Learn More

- [vercel-bun Documentation](../README.md) - Learn about the custom Bun runtime
- [Bun Runtime](https://bun.sh) - High-performance JavaScript runtime
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions) - Serverless function documentation
