const { Worker } = require('bullmq');
const pool = require('../config/database');
const ResumeParserService = require('../services/resumeParserService');
const SkillExtractorService = require('../services/skillExtractorService');
const SupabaseStorageService = require('../services/supabaseStorageService');
const { connection } = require('./index');

const queueName = 'resume-processing';

const normalizeDownloadedData = async (downloaded) => {
  if (Buffer.isBuffer(downloaded)) {
    return downloaded;
  }

  if (downloaded && typeof downloaded.arrayBuffer === 'function') {
    const arrayBuffer = await downloaded.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  if (downloaded && typeof downloaded.stream === 'function') {
    const chunks = [];
    for await (const chunk of downloaded.stream()) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  throw new Error('Unsupported resume download response format');
};

const worker = new Worker(
  queueName,
  async (job) => {
    const { resumeId, userId, filePath } = job.data;

    try {
      // Step 1: Download file (10%)
      await job.updateProgress(10);
      const downloadResult = await SupabaseStorageService.downloadResumeFile(filePath);
      const fileBuffer = await normalizeDownloadedData(downloadResult);

      // Step 2: Extract text (30%)
      await job.updateProgress(30);
      const extractedText = await ResumeParserService.extractTextFromPDFBuffer(fileBuffer);

      // Step 3: Parse structured data (50%)
      await job.updateProgress(50);
      const parsedResume = await ResumeParserService.parseResumeText(extractedText);

      // Step 4: Extract skills (70%)
      await job.updateProgress(70);
      const extractedSkills = await SkillExtractorService.extractSkills(extractedText);
      parsedResume.extractedSkills = extractedSkills;

      // Step 5: Save to database (100%)
      await job.updateProgress(100);
      await pool.query(
        `UPDATE resumes
         SET extracted_text = $1, parsed_data = $2, upload_status = 'completed', updated_at = NOW()
         WHERE id = $3 AND user_id = $4`,
        [extractedText, JSON.stringify(parsedResume), resumeId, userId]
      );

      return {
        resumeId,
        skillsExtracted: extractedSkills.length,
        status: 'completed',
        parsedData: parsedResume,
        extractedSkills
      };
    } catch (error) {
      console.error(`❌ Resume processing failed for job ${job.id}:`, error);
      await pool.query(
        `UPDATE resumes SET upload_status = 'failed', updated_at = NOW() WHERE id = $1`,
        [resumeId]
      );
      throw error;
    }
  },
  {
    connection,
    concurrency: 1
  }
);

worker.on('completed', (job) => {
  console.log(`✅ Resume processing job completed: ${job.id} (resumeId=${job.returnvalue?.resumeId || 'unknown'})`);
});

worker.on('failed', async (job, err) => {
  console.error(`❌ Resume processing job failed: ${job.id}`, err);
  if (job?.data?.resumeId) {
    await pool.query(
      `UPDATE resumes SET upload_status = 'failed', updated_at = NOW() WHERE id = $1`,
      [job.data.resumeId]
    );
  }
});

worker.on('error', (err) => {
  console.error('Resume worker error:', err);
});

module.exports = worker;