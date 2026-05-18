const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const pdfParse = require('pdf-parse');
const pool = require('../config/database');
const { softDelete } = require('../config/database');
const authenticateUser = require('../middleware/authenticateUser');
const rateLimit = require('../middleware/rateLimit');
const ResumeParserService = require('../services/resumeParserService');
const SkillExtractorService = require('../services/skillExtractorService');
const SupabaseStorageService = require('../services/supabaseStorageService');
const AuditService = require('../services/auditService');
const GuestSessionService = require('../services/guestSessionService');
const CareerDecisionService = require('../services/careerDecisionService');
const { resumeQueue } = require('../queue/index');

const router = express.Router();
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_PDF_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

/**
 * POST /api/resumes/upload
 * Upload and parse resume (async via BullMQ queue)
 */
/**
 * @openapi
 * /api/resumes/upload:
 *   post:
 *     summary: Upload a resume file for analysis
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '200':
 *         description: Resume uploaded successfully
 *       '400':
 *         description: Upload failed or invalid input
 */
router.post('/upload', authenticateUser, upload.single('resume'), async (req, res) => {
  let uploadedFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }
    if (req.file.size > MAX_PDF_SIZE_BYTES) {
      return res.status(400).json({ error: 'PDF file must be 10MB or smaller' });
    }

    const resumeUuid = uuidv4();

    // Upload file to Supabase Storage
    const { fileId, filePath, publicUrl, size } = await SupabaseStorageService.uploadResumeFile(
      req.file,
      req.user.userId
    );
    uploadedFilePath = filePath;

    // Save resume metadata to database
    const result = await pool.query(
      `INSERT INTO resumes (uuid, user_id, filename, file_path, file_size, upload_status, parsed_data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'processing', NULL, NOW(), NOW())
       RETURNING id, uuid, filename, created_at`,
      [resumeUuid, req.user.userId, req.file.originalname, filePath, size]
    );

    const resume = result.rows[0];

    // Log audit event
    const ipAddress = req.ip || req.connection.remoteAddress;
    await AuditService.log(
      req.user.userId,
      'resume.upload',
      'resume',
      resume.id,
      { filename: req.file.originalname, size },
      ipAddress
    );

    // Queue resume for async processing
    const job = await resumeQueue.add(
      'process-resume',
      {
        resumeId: resume.id,
        userId: req.user.userId,
        filePath
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    );

    res.status(202).json({
      success: true,
      resume,
      fileUrl: publicUrl,
      jobId: job.id,
      status: 'processing',
      message: 'Resume queued for processing'
    });
  } catch (error) {
    if (uploadedFilePath) {
      await SupabaseStorageService.deleteResumeFile(uploadedFilePath);
    }
    console.error('Resume upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/resumes/status/:jobId
 * Get resume processing job status
 */
/**
 * @openapi
 * /api/resumes/status/{jobId}:
 *   get:
 *     summary: Get the current processing status of a resume job
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Resume job status returned
 *       '404':
 *         description: Job not found
 */
router.get('/status/:jobId', authenticateUser, async (req, res) => {
  try {
    const job = await resumeQueue.getJob(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue || null;

    res.json({
      success: true,
      jobId: req.params.jobId,
      status: state,
      progress: progress || 0,
      result: state === 'completed' ? result : null,
      error: state === 'failed' ? job.failedReason : null
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/resumes
 * Get user's resumes
 */
/**
 * @openapi
 * /api/resumes:
 *   get:
 *     summary: List the authenticated user\'s resumes
 *     responses:
 *       '200':
 *         description: Resume list returned
 *       '401':
 *         description: Unauthorized
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, uuid, filename, file_size, upload_status, is_primary, created_at
       FROM resumes
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [req.user.userId]
    );

    res.json({
      success: true,
      resumes: result.rows
    });
  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/resumes/:resumeId
 * Get specific resume details
 */
/**
 * @openapi
 * /api/resumes/{resumeId}:
 *   get:
 *     summary: Get details for a specific resume
 *     parameters:
 *       - in: path
 *         name: resumeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Resume details returned
 *       '404':
 *         description: Resume not found
 */
router.get('/:resumeId', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM resumes
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [req.params.resumeId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    res.json({
      success: true,
      resume: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/resumes/:resumeId
 * Soft delete resume
 */
/**
 * @openapi
 * /api/resumes/{resumeId}:
 *   delete:
 *     summary: Delete a resume
 *     parameters:
 *       - in: path
 *         name: resumeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Resume deleted
 *       '404':
 *         description: Resume not found
 */
router.delete('/:resumeId', authenticateUser, async (req, res) => {
  try {
    const resumeResult = await pool.query(
      `SELECT file_path FROM resumes WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [req.params.resumeId, req.user.userId]
    );

    if (resumeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const filePath = resumeResult.rows[0].file_path;

    // Delete PDF from Supabase Storage
    if (filePath) {
      await SupabaseStorageService.deleteResumeFile(filePath);
    }

    // Soft delete from database
    await softDelete('resumes', req.params.resumeId, 'user_id', req.user.userId);

    // Log audit event
    const ipAddress = req.ip || req.connection.remoteAddress;
    await AuditService.log(
      req.user.userId,
      'resume.delete',
      'resume',
      req.params.resumeId,
      { filename: resumeResult.rows[0].file_path },
      ipAddress
    );

    res.json({ success: true, message: 'Resume deleted' });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/resumes/:resumeId/set-primary
 * Set resume as primary
 */
/**
 * @openapi
 * /api/resumes/{resumeId}/set-primary:
 *   put:
 *     summary: Mark a resume as the primary resume
 *     parameters:
 *       - in: path
 *         name: resumeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Resume marked primary
 *       '404':
 *         description: Resume not found
 */
router.put('/:resumeId/set-primary', authenticateUser, async (req, res) => {
  try {
    // Remove primary flag from all user resumes
    await pool.query(
      'UPDATE resumes SET is_primary = false WHERE user_id = $1 AND deleted_at IS NULL',
      [req.user.userId]
    );

    // Set this resume as primary
    const result = await pool.query(
      `UPDATE resumes SET is_primary = true WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id, uuid, filename, is_primary`,
      [req.params.resumeId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    res.json({ success: true, resume: result.rows[0] });
  } catch (error) {
    console.error('Error setting primary resume:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/resumes/analyze-guest
 * Analyze resume without authentication (guest mode)
 * Rate limited: 3 requests per hour per IP
 * Stores analysis in guest_sessions for later claiming
 */
/**
 * @openapi
 * /api/resumes/analyze-guest:
 *   post:
 *     summary: Analyze a resume as a guest user
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '200':
 *         description: Guest resume analysis started
 *       '400':
 *         description: Invalid file upload
 */
router.post('/analyze-guest', rateLimit(3, 60 * 60 * 1000), upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }
    if (req.file.size > MAX_PDF_SIZE_BYTES) {
      return res.status(400).json({ error: 'PDF file must be 10MB or smaller' });
    }

    // Parse PDF to extract text
    const pdfData = await pdfParse(req.file.buffer);
    const extractedText = pdfData.text;

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from PDF' });
    }

    // Extract skills from text
    const extractedSkills = await SkillExtractorService.extractSkillsWithLlm(extractedText);

    // Parse resume structure
    const parsedData = await ResumeParserService.parseResumeText(extractedText);

    // Get career snapshot (top matching roles)
    const careerSnapshot = await CareerDecisionService.getCareerSnapshot(extractedSkills);

    // Build analysis data
    const analysisData = {
      resumeFilename: req.file.originalname,
      extractedAt: new Date().toISOString(),
      extractedText: extractedText.substring(0, 5000), // First 5000 chars
      parsedData,
      extractedSkills,
      snapshot: careerSnapshot
    };

    // Create guest session
    const session = await GuestSessionService.createSession(analysisData, 24);

    res.status(201).json({
      success: true,
      sessionToken: session.session_token,
      snapshot: careerSnapshot,
      extractedSkills,
      message: 'Analysis complete. Create an account to save this analysis.'
    });
  } catch (error) {
    console.error('Guest analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
