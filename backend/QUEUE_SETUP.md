# Upstash Redis & BullMQ Resume Processing Queue

## Overview
This implementation uses **Upstash Redis** (serverless Redis) with **BullMQ** to asynchronously process resume uploads. Resume extraction and skill parsing happen in the background, making the upload API fast and responsive.

## Architecture

### Components
1. **Upstash Redis**: Cloud-hosted Redis at `golden-krill-117516.upstash.io`
2. **BullMQ Queue**: Job queue system (`resume-processing`)
3. **Resume Worker**: Background processor that:
   - Downloads PDF from Supabase Storage
   - Extracts text via PDF parser
   - Extracts skills via keyword matching + Groq LLM
   - Updates database with results
   - Saves skills to user profile

### Data Flow
```
User Upload
    ↓
[resumeRoutes.js POST /upload]
    ↓
File → Supabase Storage
    ↓
Job → Upstash Redis Queue (BullMQ)
    ↓
[resumeWorker.js] (async processing)
    ↓
Extract → Parse → Add Skills → Update DB
    ↓
Job Complete (or Retry 3x on failure)
```

## Configuration

### Environment Variables
```env
# Redis Connection (from Upstash Dashboard)
REDIS_URL=redis://default:gQAAAAAAAcsMAAIgcDI1ZTM0YWZkNjU2NTc0ZDE3YTY2N2NhMmM0YjEyMDliNA@golden-krill-117516.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://golden-krill-117516.upstash.io
UPSTASH_REDIS_REST_TOKEN=gQAAAAAAAcsMAAIgcDI1ZTM0YWZkNjU2NTc0ZDE3YTY2N2NhMmM0YjEyMDliNA

# Supabase (for file storage)
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=[your key]
```

### Queue Configuration
- **Queue Name**: `resume-processing`
- **Job Name**: `process-resume`
- **Concurrency**: 1 (sequential processing to avoid rate limits)
- **Retry Policy**: 3 attempts with exponential backoff (2s, 4s, 8s)
- **Timeout**: Inherited from worker configuration

## File Structure
```
backend/src/
├── queue/
│   ├── index.js              # Queue initialization + connection
│   └── resumeWorker.js       # Resume processing job handler
├── routes/
│   └── resumeRoutes.js       # Updated POST /upload to queue job
├── server.js                 # Updated to start worker
└── ...
```

## API Changes

### POST /api/resumes/upload
**Before**: Synchronous (blocking, 5-30s response)
```json
{
  "resume": { /* parsed data */ },
  "extractedSkills": [ /* immediate results */ ]
}
```

**After**: Asynchronous via queue
```json
{
  "resume": { /* metadata only */ },
  "status": "processing",
  "fileUrl": "https://supabase.../..."
}
```

**Client Considerations**:
1. Poll `GET /api/resumes/:resumeId` to check upload_status
   - `processing` → in queue or being processed
   - `completed` → ready to use
   - `failed` → error during processing
2. Job completes typically within 5-30 seconds (depending on file size)

### GET /api/resumes/:resumeId
Shows current `upload_status`:
```json
{
  "resume": {
    "id": 1,
    "upload_status": "completed",
    "extracted_text": "...",
    ...
  }
}
```

## Job Lifecycle

### Enqueuing (resumeRoutes.js)
```javascript
await resumeQueue.add(
  'process-resume',
  { resumeId, userId, filePath },
  {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
);
```

### Processing (resumeWorker.js)
1. **Download**: Get PDF from Supabase Storage
2. **Extract**: Parse PDF → text
3. **Analyze**: Extract skills via Groq LLM
4. **Save**: Update database + user_skills
5. **Complete**: Job marked as completed

### Error Handling
- **Failed Job**: Max 3 retries with exponential backoff
- **Database Update Failure**: Job fails, queue notified
- **Download Failure**: Job retried up to 3 times
- **Final Failure**: Job marked as failed, upload_status = 'failed'

## Monitoring

### Server Logs
```
✅ Resume processing job completed: abc123 (resumeId=45)
❌ Resume processing job failed: xyz789
  Error: Download failed...
```

### BullMQ UI (Optional)
Install BullMQ Board for visual queue monitoring:
```bash
npm install --save-dev @bull-board/express
npm install --save-dev @bull-board/ui
```

Setup in server.js:
```javascript
const { createBullBoard } = require('@bull-board/express');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');

const { setQueues, replaceQueues } = createBullBoard({
  queues: [new BullMQAdapter(resumeQueue)]
});

app.use('/admin/queues', setQueues);
```

Then visit: `http://localhost:5003/admin/queues`

## Upstash Redis Limits

### Free Tier
- **Storage**: 256 MB
- **Connections**: 50 concurrent
- **API Calls**: 10,000/day (REST API)
- **Throughput**: ~100 ops/sec

### Best Practices
1. **Job Retention**: Default 24 hours, jobs auto-cleaned
2. **Memory**: Each job ~1-2 KB; 1000 jobs ≈ 2-4 MB
3. **Concurrency**: Set to 1 to avoid memory bloat
4. **Scaling**: Upgrade to paid plan for production volume

## Deployment

### Local Testing
```bash
# Install dependencies
npm install

# Start backend (includes worker)
npm run dev

# Upload resume → watch for "processing" status
# Poll for "completed" status
```

### Production Deployment
1. **Set REDIS_URL** in production environment
2. **Set SUPABASE credentials** for file storage
3. **Worker runs as part of server process** (no separate service needed)
4. **Logs**: Monitor via `tail -f logs/server.log`

### Scaling (Production)
Option 1: **Multiple Workers**
```javascript
// Start separate worker process (workers.js)
const worker = require('./queue/resumeWorker');
worker.waitUntilReady();
```

Option 2: **Separate Queue Service**
```bash
# server.js → API only
# worker.js → Queue processing only (scale independently)
```

## Troubleshooting

### Queue Not Processing
```
❌ Error: "getaddrinfo ENOTFOUND golden-krill-117516.upstash.io"
```
**Solution**: Verify REDIS_URL in .env matches Upstash credentials

### Job Stuck in Pending
```
BullMQ status: "waiting" after 30+ seconds
```
**Solutions**:
1. Check worker is running: `console.log('Worker ready')`
2. Verify Redis connectivity: `redis-cli --tls -u $REDIS_URL PING`
3. Check job logs in worker stderr

### Upload Returns 500 Error
```json
{ "error": "REDIS_URL is required" }
```
**Solution**: Add REDIS_URL to .env and restart server

## Migration from Synchronous Upload

### Old API Response (Sync)
```json
{
  "success": true,
  "resume": { ... },
  "parsedData": { ... },
  "extractedSkills": [ ... ]
}
```

### New API Response (Async)
```json
{
  "success": true,
  "resume": { ... },
  "status": "processing",
  "fileUrl": "..."
}
```

### Frontend Adaptation
```javascript
// Old: Direct response
const skills = response.extractedSkills;

// New: Poll until complete
const pollResume = async (resumeId) => {
  const response = await fetch(`/api/resumes/${resumeId}`);
  const { resume } = await response.json();
  
  if (resume.upload_status === 'processing') {
    setTimeout(() => pollResume(resumeId), 2000);
  } else if (resume.upload_status === 'completed') {
    const skills = resume.extracted_text; // parse manually or fetch separately
  }
};
```

## References
- [Upstash Redis Documentation](https://upstash.com/docs)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [ioredis Documentation](https://github.com/luin/ioredis)
