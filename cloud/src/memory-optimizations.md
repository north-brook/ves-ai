# Memory Optimizations for Cloud Run

## Quick wins without major refactoring:

### 1. Update Dockerfile NODE_OPTIONS
```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=3072"  # 3GB heap for 4GB container
```

### 2. Add streaming for event processing in constructor.ts
- Process events in chunks instead of loading all into memory
- Stream directly to temp file instead of holding in memory

### 3. Optimize Playwright settings in constructor.ts
```typescript
const launchOptions: LaunchOptions = {
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox", 
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-web-security",
    "--disable-features=IsolateOrigins,site-per-process",
    "--single-process",  // Reduce process overhead
    "--no-zygote",       // Reduce memory overhead
    "--memory-pressure-off",
    "--max_old_space_size=512",  // Limit V8 heap per context
  ],
};
```

### 4. Clean up aggressively
- Close browser immediately after use
- Delete temp files immediately after upload
- Clear event data from memory after writing to disk

### 5. Monitor with environment variables
```typescript
// Add to index.ts
setInterval(() => {
  const mem = process.memoryUsage();
  if (mem.heapUsed / 1024 / 1024 > 2500) {  // If > 2.5GB
    console.warn(`⚠️ High memory usage: ${(mem.heapUsed / 1024 / 1024).toFixed(0)}MB`);
    if (global.gc) global.gc();  // Force GC if available
  }
}, 30000);
```

## Cost Optimization

With these settings:
- 4GB/2CPU instance: ~$0.00012/second
- Processing 60s video in ~90s: ~$0.011 per video
- vs 8GB/2CPU: ~$0.00018/second = ~$0.016 per video
- **33% cost reduction** with same throughput