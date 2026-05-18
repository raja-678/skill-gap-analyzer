const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const hasSupabaseConfig = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
let supabase = null;

if (hasSupabaseConfig) {
  try {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  } catch (error) {
    console.warn('⚠️  Supabase client initialization failed:', error.message);
    supabase = null;
  }
} else {
  console.warn('⚠️  Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY to enable file uploads.');
}

class SupabaseStorageService {
  static ensureConfigured() {
    if (!supabase) {
      throw new Error('Supabase storage is not configured. Configure SUPABASE_URL and SUPABASE_ANON_KEY in the backend .env file.');
    }
  }

  /**
   * Upload resume PDF to Supabase Storage
   */
  static async uploadResumeFile(file, userId) {
    try {
      this.ensureConfigured();
      const fileName = `${userId}/${Date.now()}_${file.originalname}`;
      const bucketName = 'resumes';

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      console.log('✅ File uploaded to Supabase Storage:', data.path);

      // Get public URL for the file
      const { data: publicData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      return {
        fileId: fileName,
        filePath: fileName,
        publicUrl: publicData.publicUrl,
        size: file.size
      };
    } catch (error) {
      console.error('❌ Error uploading resume:', error.message);
      throw error;
    }
  }

  /**
   * Download resume PDF from Supabase Storage
   */
  static async downloadResumeFile(filePath) {
    try {
      this.ensureConfigured();
      const bucketName = 'resumes';

      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (error) {
        throw new Error(`Download failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error downloading resume:', error.message);
      throw error;
    }
  }

  /**
   * Delete resume PDF from Supabase Storage
   */
  static async deleteResumeFile(filePath) {
    try {
      if (!filePath) return { success: true };

      this.ensureConfigured();
      const bucketName = 'resumes';

      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error && error.name !== 'NotFoundError') {
        throw new Error(`Delete failed: ${error.message}`);
      }

      console.log('✅ File deleted from Supabase Storage:', filePath);
      return { success: true };
    } catch (error) {
      console.error('⚠️  Error deleting resume:', error.message);
      // Don't throw - deletion errors shouldn't block the operation
      return { success: false, error: error.message };
    }
  }

  /**
   * List all resumes for a user
   */
  static async listUserResumes(userId) {
    try {
      this.ensureConfigured();
      const bucketName = 'resumes';
      const prefix = `${userId}/`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(prefix, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        throw new Error(`List failed: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error listing resumes:', error.message);
      throw error;
    }
  }
}

module.exports = SupabaseStorageService;
