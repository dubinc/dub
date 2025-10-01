# Redis Streams for High-Frequency Click Tracking

This implementation uses Redis Streams to handle high-frequency link click and project usage updates efficiently. Instead of immediately updating the database for each event, we publish events to separate Redis Streams and process them in batches via dedicated cron jobs.

## Architecture

1. **High-frequency publishing**: Click and usage events are published to separate Redis Streams at 10+ times per second
2. **Dual-stream processing**: Separate cron jobs run every 5 seconds to consume and aggregate updates
3. **Database efficiency**: Aggregated updates reduce database load and improve performance
4. **Separation of concerns**: Link clicks and project usage are handled in separate streams for better modularity

## Components

### RedisStream Class (`redis-streams.ts`)

Core class that handles stream operations:

- `publishClickUpdate(event)`: Publishes click events to the stream
- `publishProjectUsageUpdate(event)`: Publishes project usage events to the stream
- `readAndProcessUpdates(options)`: Reads and aggregates click data from the stream
- `readAndProcessProjectUpdates(options)`: Reads and aggregates project usage data from the stream
- `getStreamInfo()`: Gets stream metadata for monitoring

### Stream Instances

Two separate stream instances for different concerns:

- `clickUpdatesStream`: Handles link click events (`link-click-updates` stream)
- `projectUsageStream`: Handles project usage events (`project-usage-updates` stream)

### Cron Jobs

**Link Clicks** (`/api/cron/links/click-updates-queue/route.ts`):

- Processes aggregated click updates every 5 seconds
- Reads up to 1000 entries at once
- Aggregates clicks by linkId
- Updates Link table with click counts
- Cleans up processed entries

**Project Usage** (`/api/cron/projects/usage-updates-queue/route.ts`):

- Processes aggregated usage updates every 5 seconds
- Reads up to 1000 entries at once
- Aggregates usage and clicks by projectId
- Updates Project table with usage and totalClicks
- Cleans up processed entries

## Usage Example

### Publishing Click Updates

```typescript
import { clickUpdatesStream } from "@/lib/upstash/redis-streams";

// Publish a single click
await clickUpdatesStream.publishClickUpdate({
  linkId: "link-123",
  timestamp: Date.now(),
  count: 1,
});
```

### Publishing Project Usage Updates

```typescript
import { projectUsageStream } from "@/lib/upstash/redis-streams";

// Publish project usage update
await projectUsageStream.publishProjectUsageUpdate({
  projectId: "project-456",
  timestamp: Date.now(),
  usageCount: 1,
  clickCount: 1,
});
```

### Integration with Existing Click Recording

Instead of directly updating the database in your click recording logic:

```typescript
// Before (direct database updates)
await conn.execute(
  "UPDATE Link SET clicks = clicks + 1, lastClicked = NOW() WHERE id = ?",
  [linkId],
);
await conn.execute(
  "UPDATE Project p JOIN Link l ON p.id = l.projectId SET p.usage = p.usage + 1, p.totalClicks = p.totalClicks + 1 WHERE l.id = ?",
  [linkId],
);

// After (dual-stream approach)
await clickUpdatesStream.publishClickUpdate({
  linkId,
  timestamp: Date.now(),
  count: 1,
});

await projectUsageStream.publishProjectUsageUpdate({
  projectId,
  timestamp: Date.now(),
  usageCount: 1,
  clickCount: 1,
});
```

### Monitoring Stream Health

```typescript
// Monitor click stream
const clickStreamInfo = await clickUpdatesStream.getStreamInfo();
console.log(`Click stream has ${clickStreamInfo.length} entries`);

// Monitor project usage stream
const usageStreamInfo = await projectUsageStream.getStreamInfo();
console.log(`Usage stream has ${usageStreamInfo.length} entries`);
```

## Configuration

### Cron Job Setup

Set up cron jobs to run both processing endpoints every 5 seconds:

```bash
# In your cron configuration or deployment platform

# Link clicks processing
*/5 * * * * curl -X GET https://your-domain.com/api/cron/links/click-updates-queue

# Project usage processing
*/5 * * * * curl -X GET https://your-domain.com/api/cron/projects/usage-updates-queue
```

### Environment Variables

Make sure these are set in your environment:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Performance Benefits

1. **Reduced Database Load**: Batch processing reduces individual database calls
2. **High Throughput**: Can handle 10+ events per second without performance degradation
3. **Fault Tolerance**: If processing fails, events remain in streams for retry
4. **Memory Management**: Automatic cleanup prevents unbounded memory growth
5. **Separation of Concerns**: Independent processing of clicks and usage allows for different scaling strategies
6. **Better Resource Utilization**: Dedicated streams prevent blocking between different types of updates

## Monitoring

Both cron jobs return detailed metrics:

**Click Updates Response:**

```json
{
  "success": true,
  "processed": 150,
  "errors": 0,
  "lastProcessedId": "1734633600000-5",
  "streamInfo": {
    "length": 0,
    "firstEntryId": null,
    "lastEntryId": null
  },
  "message": "Successfully processed 150 click updates"
}
```

**Project Usage Response:**

```json
{
  "success": true,
  "processed": 75,
  "errors": 0,
  "lastProcessedId": "1734633600000-3",
  "streamInfo": {
    "length": 0,
    "firstEntryId": null,
    "lastEntryId": null
  },
  "message": "Successfully processed 75 project usage updates"
}
```

## Error Handling

- Stream operations include comprehensive error handling
- Failed database updates are logged but don't stop processing
- Stream cleanup failures are non-fatal
- Detailed logging for debugging

## Deployment Notes

1. Make sure both cron job endpoints are secured with Vercel signature verification
2. Monitor both stream lengths to ensure they don't grow unbounded
3. Set up alerts for processing errors on both streams
4. Consider adjusting batch sizes based on your database capacity
5. Both streams can be scaled independently based on their respective load patterns
6. Consider staggering the cron jobs slightly to avoid database contention (e.g., run one at :00, :05, :10 and the other at :02, :07, :12)
