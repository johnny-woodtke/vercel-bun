# 🧪 Benchmark Test Suite for Bun vs Node.js on Vercel

A comprehensive benchmark suite comparing Bun and Node.js performance for serverless functions deployed on Vercel.

## 📋 Overview

This test suite measures and compares performance across multiple dimensions:

- **Cold Start Latency** - Initial response times after functions go idle
- **Warm Latency** - Response times under sustained load
- **Throughput** - Maximum sustainable requests per second
- **Concurrency** - Performance under simultaneous connections
- **Payload Size** - Handling of different request body sizes
- **Burst Traffic** - Response to sudden traffic spikes
- **Error Handling** - Stability and proper error responses

## 🛠️ Prerequisites

1. **Deploy your endpoints** to Vercel with both Bun and Node.js runtimes
2. **Install dependencies**:
   ```bash
   cd bench
   bun install
   ```
3. **Install k6** (for load testing):

   ```bash
   # macOS
   brew install k6

   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6

   # Windows
   choco install k6
   ```

## ⚙️ Configuration

Set your Vercel deployment URL:

```bash
export BENCH_API_DOMAIN="https://vercel-bun-bench.vercel.app"
```

Or modify `benchmarks/config.ts` to set the default URL.

## 🚀 Running Tests

### Run All Tests

```bash
bun run bench:all
```

This runs the complete suite and generates a comparison report.

### Individual Tests

```bash
# Cold start test
bun run bench:cold-start

# Warm latency test
bun run bench:warm

# Throughput test
bun run bench:throughput

# Concurrency test
bun run bench:concurrency

# Payload size test
bun run bench:payload

# Burst traffic test
bun run bench:burst

# Error handling test
bun run bench:error
```

### Custom Test Parameters

You can customize test parameters using environment variables:

```bash
# Test specific endpoint
BASE_URL="https://vercel-bun-bench.vercel.app" ENDPOINT="/api/bun" bun run bench:warm

# Custom RPS for warm test
BASE_URL="https://vercel-bun-bench.vercel.app" RPS=500 bun run bench:warm

# Custom payload size
PAYLOAD_SIZE=1048576 bun run bench:payload  # 1MB payload
```

## 📊 Understanding Results

### Test Metrics

Each test provides specific metrics:

#### Cold Start

- **Average Response Time** - Time for first request after idle
- **TTFB (Time to First Byte)** - Network + processing time
- **P95/P99 Latency** - Response time percentiles

#### Warm Latency

- **RPS (Requests per Second)** - Actual vs target request rate
- **Average/P95/P99 Latency** - Response time distribution
- **Error Rate** - Percentage of failed requests

#### Throughput

- **Max Sustainable RPS** - Highest RPS with <5% errors
- **Can Sustain Target Load** - Boolean success indicator
- **Latency under Load** - Response times at max RPS

#### Concurrency

- **Effective Max Connections** - Max concurrent connections handled well
- **Connection Time** - Time to establish connections
- **Performance Degradation** - Latency increase under load

#### Payload Size

- **Latency per KB** - Processing efficiency
- **Throughput (Mbps)** - Data transfer rate
- **Error Rate** - Payload rejection/failure rate

#### Burst Traffic

- **Burst Efficiency** - Percentage of target burst achieved
- **Recovery Time** - Time to return to normal after burst
- **Error Rate during Burst** - Failures under spike load

#### Error Handling

- **System Stability** - Percentage avoiding 5xx errors
- **Error Response Time** - Speed of error responses
- **Proper Error Codes** - Correct HTTP status codes

### Sample Output

```
🏆 BENCHMARK COMPARISON REPORT
=====================================

📊 COLD-START
Metric: Average Latency (ms)
🚀 BUN WINS by 23.4%

📊 WARM-LATENCY
Metric: Average Latency (ms)
🚀 BUN WINS by 15.2%

📊 THROUGHPUT
Metric: Requests per Second
🟢 NODE WINS by 8.7%

📈 OVERALL SUMMARY
==================
Bun wins: 5
Node wins: 2
Ties: 0

🏆 BUN IS THE OVERALL WINNER! 🚀
```

## 📁 Results

Results are saved in the `results/` directory:

- **Individual test results**: `{test-type}-{endpoint}-{timestamp}.json`
- **Comparison reports**: `benchmark-report-{timestamp}.json`

Each result file contains:

- Raw performance metrics
- Statistical analysis (avg, p95, p99, etc.)
- Test configuration used
- Metadata about the test run

## 🔧 Customizing Tests

### Modifying Test Parameters

Edit `benchmarks/config.ts` to adjust:

```typescript
export const defaultConfig: BenchmarkConfig = {
  tests: {
    coldStart: {
      waitTime: 5, // minutes between tests
      iterations: 10, // number of cold start measurements
    },
    warm: {
      duration: "60s", // test duration
      rps: [100, 200, 300, 500], // RPS levels to test
    },
    // ... other test configurations
  },
};
```

### Adding New Tests

1. Create a new K6 script in `benchmarks/`
2. Add the test type to `run-all.ts`
3. Update the comparison logic if needed

## 🚨 Troubleshooting

### Common Issues

**"Connection refused" errors:**

- Verify your Vercel URL is correct and accessible
- Check that both `/api/bun` and `/api/node` endpoints exist

**K6 not found:**

- Install k6 using the instructions above
- Ensure k6 is in your PATH

**High error rates:**

- Your endpoints might be hitting Vercel limits
- Reduce RPS or connection counts in config
- Check Vercel function logs for errors

**Inconsistent results:**

- Network conditions can affect results
- Run tests multiple times for consistency
- Use the `bench:consistency` script for stability testing

### Vercel Limits

Be aware of Vercel's limits:

- **Execution time**: 10s for Hobby, 15s for Pro
- **Memory**: 1GB default
- **Concurrent executions**: Limited by plan
- **Bandwidth**: Limited by plan

Adjust test parameters accordingly.

## 📈 Performance Tips

### For Better Benchmarking

1. **Warm up functions** before main tests
2. **Run from same region** as your Vercel deployment
3. **Use consistent network conditions**
4. **Test during low-traffic periods**
5. **Run multiple iterations** for statistical significance

### Interpreting Results

- **Cold starts**: Bun typically wins due to faster V8 initialization
- **Warm performance**: Results vary by workload type
- **Memory usage**: Check Vercel function logs for actual usage
- **Error rates**: Should be <1% for production-ready performance

## 🤝 Contributing

To add new benchmark tests:

1. Create test script in `benchmarks/`
2. Add configuration in `config.ts`
3. Update `run-all.ts` to include the new test
4. Add comparison logic if needed
5. Update this README

## 📄 License

This benchmark suite is provided as-is for performance testing purposes.
