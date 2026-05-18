/**
 * Seed skill implications - common patterns like React → JavaScript, etc.
 * Run this after setting up main skills in the database
 * 
 * Usage: node src/seeds/seedSkillImplications.js
 */

const pool = require('../config/database');

const skillImplications = [
  // Frontend frameworks → JavaScript
  { source: 'React', implied: 'JavaScript', minProficiency: 5, impliedProficiency: 3 },
  { source: 'Vue.js', implied: 'JavaScript', minProficiency: 5, impliedProficiency: 3 },
  { source: 'Angular', implied: 'JavaScript', minProficiency: 5, impliedProficiency: 3 },
  { source: 'TypeScript', implied: 'JavaScript', minProficiency: 4, impliedProficiency: 2 },

  // Backend frameworks → Base languages
  { source: 'Django', implied: 'Python', minProficiency: 5, impliedProficiency: 4 },
  { source: 'Flask', implied: 'Python', minProficiency: 5, impliedProficiency: 3 },
  { source: 'Express', implied: 'JavaScript', minProficiency: 5, impliedProficiency: 3 },
  { source: 'Spring', implied: 'Java', minProficiency: 5, impliedProficiency: 4 },
  { source: 'Rails', implied: 'Ruby', minProficiency: 5, impliedProficiency: 4 },

  // Databases → SQL
  { source: 'PostgreSQL', implied: 'SQL', minProficiency: 4, impliedProficiency: 3 },
  { source: 'MySQL', implied: 'SQL', minProficiency: 4, impliedProficiency: 3 },
  { source: 'Oracle', implied: 'SQL', minProficiency: 4, impliedProficiency: 3 },

  // DevOps
  { source: 'Docker', implied: 'Linux', minProficiency: 5, impliedProficiency: 2 },
  { source: 'Kubernetes', implied: 'Docker', minProficiency: 6, impliedProficiency: 4 },
  { source: 'Kubernetes', implied: 'Linux', minProficiency: 6, impliedProficiency: 3 },

  // Cloud platforms
  { source: 'AWS', implied: 'Cloud Computing', minProficiency: 5, impliedProficiency: 3 },
  { source: 'Azure', implied: 'Cloud Computing', minProficiency: 5, impliedProficiency: 3 },
  { source: 'Google Cloud', implied: 'Cloud Computing', minProficiency: 5, impliedProficiency: 3 },

  // Testing
  { source: 'Jest', implied: 'JavaScript', minProficiency: 4, impliedProficiency: 2 },
  { source: 'PyTest', implied: 'Python', minProficiency: 4, impliedProficiency: 2 },

  // Build tools
  { source: 'Webpack', implied: 'JavaScript', minProficiency: 4, impliedProficiency: 2 },
  { source: 'Gradle', implied: 'Java', minProficiency: 4, impliedProficiency: 2 },

  // Data & Analytics
  { source: 'TensorFlow', implied: 'Python', minProficiency: 5, impliedProficiency: 3 },
  { source: 'PyTorch', implied: 'Python', minProficiency: 5, impliedProficiency: 3 },
  { source: 'Pandas', implied: 'Python', minProficiency: 4, impliedProficiency: 2 },
];

async function seedImplications() {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting skill implications seed...');

    for (const implication of skillImplications) {
      try {
        // Get source and implied skill IDs
        const sourceResult = await client.query(
          'SELECT id FROM skills WHERE LOWER(name) = LOWER($1)',
          [implication.source]
        );

        const impliedResult = await client.query(
          'SELECT id FROM skills WHERE LOWER(name) = LOWER($1)',
          [implication.implied]
        );

        if (sourceResult.rows.length === 0) {
          console.log(`⚠️  Skill "${implication.source}" not found, skipping`);
          continue;
        }

        if (impliedResult.rows.length === 0) {
          console.log(`⚠️  Skill "${implication.implied}" not found, skipping`);
          continue;
        }

        const sourceId = sourceResult.rows[0].id;
        const impliedId = impliedResult.rows[0].id;

        await client.query(
          `INSERT INTO skill_implications 
           (source_skill_id, implied_skill_id, min_proficiency_threshold, implied_proficiency, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (source_skill_id, implied_skill_id) DO NOTHING`,
          [sourceId, impliedId, implication.minProficiency, implication.impliedProficiency]
        );

        console.log(`✅ ${implication.source} → ${implication.implied}`);
      } catch (error) {
        console.error(`❌ Error seeding "${implication.source}" → "${implication.implied}":`, error.message);
      }
    }

    console.log('✨ Skill implications seed complete!');
  } catch (error) {
    console.error('Fatal error during seed:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedImplications();
