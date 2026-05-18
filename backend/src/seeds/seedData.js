const { randomUUID } = require('crypto');
const pool = require('../config/database');

const skills = [
  { name: 'JavaScript', category: 'Programming Languages', description: 'Dynamic language for web applications, services, and tooling.' },
  { name: 'Python', category: 'Programming Languages', description: 'General-purpose language used in backend, automation, data science, and AI.' },
  { name: 'Java', category: 'Programming Languages', description: 'Object-oriented language widely used for enterprise systems and Android services.' },
  { name: 'TypeScript', category: 'Programming Languages', description: 'Typed superset of JavaScript for scalable application development.' },
  { name: 'C++', category: 'Programming Languages', description: 'High-performance systems language used in software, games, and infrastructure.' },
  { name: 'C#', category: 'Programming Languages', description: 'Modern language for .NET applications, services, desktop, and game development.' },
  { name: 'Go', category: 'Programming Languages', description: 'Compiled language for cloud services, networking, and distributed systems.' },
  { name: 'Rust', category: 'Programming Languages', description: 'Memory-safe systems language for reliable and performant software.' },
  { name: 'PHP', category: 'Programming Languages', description: 'Server-side language commonly used for web applications and content platforms.' },
  { name: 'Ruby', category: 'Programming Languages', description: 'Productive language often used for web applications and scripting.' },

  { name: 'React', category: 'Frontend', description: 'JavaScript library for building component-based user interfaces.' },
  { name: 'Vue.js', category: 'Frontend', description: 'Progressive JavaScript framework for reactive frontend applications.' },
  { name: 'Angular', category: 'Frontend', description: 'Full-featured TypeScript framework for large frontend applications.' },
  { name: 'Next.js', category: 'Frontend', description: 'React framework for server rendering, routing, and full-stack web applications.' },
  { name: 'HTML', category: 'Frontend', description: 'Markup language used to structure content on the web.' },
  { name: 'CSS', category: 'Frontend', description: 'Stylesheet language used to design and lay out web interfaces.' },
  { name: 'Tailwind CSS', category: 'Frontend', description: 'Utility-first CSS framework for rapidly building custom interfaces.' },
  { name: 'Redux', category: 'Frontend', description: 'Predictable state management library for JavaScript applications.' },

  { name: 'Node.js', category: 'Backend', description: 'JavaScript runtime for server-side applications and APIs.' },
  { name: 'Express.js', category: 'Backend', description: 'Minimal Node.js framework for building HTTP APIs and web servers.' },
  { name: 'Django', category: 'Backend', description: 'Python web framework for secure, database-backed applications.' },
  { name: 'FastAPI', category: 'Backend', description: 'Modern Python framework for high-performance APIs.' },
  { name: 'Spring Boot', category: 'Backend', description: 'Java framework for production-ready services and enterprise applications.' },
  { name: 'Laravel', category: 'Backend', description: 'PHP framework for expressive backend and web application development.' },

  { name: 'PostgreSQL', category: 'Database', description: 'Advanced relational database for transactional and analytical workloads.' },
  { name: 'MySQL', category: 'Database', description: 'Popular relational database used in web and business applications.' },
  { name: 'MongoDB', category: 'Database', description: 'Document database for flexible, JSON-like data models.' },
  { name: 'Redis', category: 'Database', description: 'In-memory data store used for caching, queues, and fast lookups.' },
  { name: 'Elasticsearch', category: 'Database', description: 'Search and analytics engine for text search and observability use cases.' },
  { name: 'SQL', category: 'Database', description: 'Query language for working with relational databases and structured data.' },

  { name: 'Docker', category: 'DevOps', description: 'Container platform for packaging and running applications consistently.' },
  { name: 'Kubernetes', category: 'DevOps', description: 'Container orchestration platform for deploying and scaling services.' },
  { name: 'AWS', category: 'DevOps', description: 'Cloud platform offering compute, storage, networking, and managed services.' },
  { name: 'GCP', category: 'DevOps', description: 'Google Cloud Platform services for cloud infrastructure and data workloads.' },
  { name: 'Azure', category: 'DevOps', description: 'Microsoft cloud platform for applications, data, and infrastructure.' },
  { name: 'CI/CD', category: 'DevOps', description: 'Automated practices for building, testing, and deploying software.' },
  { name: 'Git', category: 'DevOps', description: 'Distributed version control system for collaborative software development.' },
  { name: 'Linux', category: 'DevOps', description: 'Operating system foundation for servers, cloud infrastructure, and tooling.' },

  { name: 'TensorFlow', category: 'AI/ML', description: 'Machine learning framework for training and deploying neural networks.' },
  { name: 'PyTorch', category: 'AI/ML', description: 'Deep learning framework popular for research and production AI systems.' },
  { name: 'Scikit-learn', category: 'AI/ML', description: 'Python library for classical machine learning and model evaluation.' },
  { name: 'Pandas', category: 'AI/ML', description: 'Python library for data manipulation, cleaning, and analysis.' },
  { name: 'NumPy', category: 'AI/ML', description: 'Python library for numerical computing and array operations.' },
  { name: 'LangChain', category: 'AI/ML', description: 'Framework for building applications powered by large language models.' },

  { name: 'React Native', category: 'Mobile', description: 'Framework for building native mobile apps with React.' },
  { name: 'Flutter', category: 'Mobile', description: 'UI toolkit for building cross-platform mobile, web, and desktop apps.' },
  { name: 'Swift', category: 'Mobile', description: 'Language for building iOS, macOS, watchOS, and tvOS applications.' },
  { name: 'Kotlin', category: 'Mobile', description: 'Modern language for Android and JVM application development.' },

  { name: 'Communication', category: 'Soft Skills', description: 'Ability to convey ideas, updates, tradeoffs, and decisions clearly.' },
  { name: 'Leadership', category: 'Soft Skills', description: 'Ability to guide teams, set direction, and support delivery outcomes.' },
  { name: 'Problem Solving', category: 'Soft Skills', description: 'Ability to break down ambiguity and deliver practical solutions.' },
  { name: 'Team Collaboration', category: 'Soft Skills', description: 'Ability to work effectively with peers across roles and disciplines.' },
  { name: 'Cloud Computing', category: 'DevOps', description: 'Concepts and practices for building and operating systems on cloud platforms.' }
];

const roles = [
  {
    title: 'Frontend Developer',
    description: 'Builds responsive, accessible, and maintainable user interfaces for web applications.',
    category: 'Software Engineering',
    seniority_level: 'Mid-Level',
    avg_salary_min: 85000,
    avg_salary_max: 140000,
    demand_level: 'high',
    requirements: [
      ['JavaScript', 8], ['TypeScript', 7], ['React', 8], ['HTML', 8], ['CSS', 8],
      ['Tailwind CSS', 6], ['Redux', 6], ['Git', 7], ['Communication', 6]
    ]
  },
  {
    title: 'Backend Developer',
    description: 'Designs APIs, services, databases, and integrations that power application backends.',
    category: 'Software Engineering',
    seniority_level: 'Mid-Level',
    avg_salary_min: 90000,
    avg_salary_max: 150000,
    demand_level: 'high',
    requirements: [
      ['Node.js', 8], ['Express.js', 7], ['Python', 6], ['PostgreSQL', 7], ['MongoDB', 6],
      ['Redis', 5], ['Docker', 6], ['Git', 7], ['Linux', 6], ['Problem Solving', 7]
    ]
  },
  {
    title: 'Full Stack Developer',
    description: 'Delivers end-to-end web features spanning frontend interfaces, APIs, and databases.',
    category: 'Software Engineering',
    seniority_level: 'Mid-Level',
    avg_salary_min: 95000,
    avg_salary_max: 160000,
    demand_level: 'high',
    requirements: [
      ['JavaScript', 8], ['TypeScript', 7], ['React', 7], ['Node.js', 7], ['Express.js', 6],
      ['PostgreSQL', 6], ['MongoDB', 5], ['Docker', 5], ['Git', 7], ['Communication', 6]
    ]
  },
  {
    title: 'DevOps Engineer',
    description: 'Builds deployment pipelines, cloud infrastructure, monitoring, and operational automation.',
    category: 'Infrastructure',
    seniority_level: 'Mid-Level',
    avg_salary_min: 105000,
    avg_salary_max: 170000,
    demand_level: 'high',
    requirements: [
      ['Linux', 8], ['Docker', 8], ['Kubernetes', 7], ['AWS', 7], ['GCP', 6],
      ['Azure', 6], ['CI/CD', 8], ['Git', 7], ['Go', 5], ['Problem Solving', 7]
    ]
  },
  {
    title: 'Data Scientist',
    description: 'Turns data into insights through analysis, experimentation, modeling, and communication.',
    category: 'Data',
    seniority_level: 'Mid-Level',
    avg_salary_min: 100000,
    avg_salary_max: 165000,
    demand_level: 'high',
    requirements: [
      ['Python', 8], ['SQL', 7], ['Pandas', 8], ['NumPy', 7], ['Scikit-learn', 7],
      ['PostgreSQL', 6], ['TensorFlow', 5], ['Communication', 7], ['Problem Solving', 8]
    ]
  },
  {
    title: 'Machine Learning Engineer',
    description: 'Builds, trains, deploys, and operates machine learning systems in production.',
    category: 'AI/ML',
    seniority_level: 'Mid-Level',
    avg_salary_min: 115000,
    avg_salary_max: 190000,
    demand_level: 'high',
    requirements: [
      ['Python', 8], ['TensorFlow', 7], ['PyTorch', 7], ['Scikit-learn', 7], ['NumPy', 7],
      ['Pandas', 6], ['Docker', 6], ['AWS', 6], ['Kubernetes', 5], ['Problem Solving', 8]
    ]
  },
  {
    title: 'Mobile Developer',
    description: 'Builds reliable, performant mobile applications for iOS, Android, or cross-platform stacks.',
    category: 'Software Engineering',
    seniority_level: 'Mid-Level',
    avg_salary_min: 90000,
    avg_salary_max: 150000,
    demand_level: 'medium',
    requirements: [
      ['React Native', 7], ['Flutter', 7], ['Swift', 6], ['Kotlin', 6], ['JavaScript', 6],
      ['TypeScript', 6], ['Git', 7], ['Communication', 6], ['Problem Solving', 7]
    ]
  },
  {
    title: 'Cloud Architect',
    description: 'Designs scalable, secure, and cost-effective cloud platforms and application architectures.',
    category: 'Infrastructure',
    seniority_level: 'Senior',
    avg_salary_min: 130000,
    avg_salary_max: 210000,
    demand_level: 'high',
    requirements: [
      ['Cloud Computing', 9], ['AWS', 8], ['Azure', 7], ['GCP', 7], ['Kubernetes', 7],
      ['Docker', 7], ['Linux', 7], ['CI/CD', 6], ['Leadership', 7], ['Communication', 8]
    ]
  },
  {
    title: 'Product Manager',
    description: 'Defines product strategy, prioritizes customer problems, and coordinates delivery with teams.',
    category: 'Product',
    seniority_level: 'Mid-Level',
    avg_salary_min: 95000,
    avg_salary_max: 160000,
    demand_level: 'medium',
    requirements: [
      ['Communication', 9], ['Leadership', 8], ['Problem Solving', 8], ['Team Collaboration', 8],
      ['SQL', 5], ['React', 4], ['AWS', 4], ['Git', 4]
    ]
  },
  {
    title: 'Cybersecurity Engineer',
    description: 'Protects systems and data through secure infrastructure, monitoring, and risk reduction.',
    category: 'Security',
    seniority_level: 'Mid-Level',
    avg_salary_min: 105000,
    avg_salary_max: 175000,
    demand_level: 'high',
    requirements: [
      ['Linux', 8], ['Python', 7], ['AWS', 6], ['Azure', 6], ['Docker', 6],
      ['Kubernetes', 5], ['SQL', 5], ['CI/CD', 5], ['Git', 6], ['Problem Solving', 8]
    ]
  }
];

const demandToMarketDemand = {
  high: 85,
  medium: 65,
  low: 40
};

async function getColumns(client, tableName) {
  const result = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );

  return new Set(result.rows.map((row) => row.column_name));
}

function pickColumns(record, columns, requiredColumns = []) {
  const picked = {};

  for (const column of requiredColumns) {
    if (columns.has(column)) {
      picked[column] = record[column];
    }
  }

  for (const [column, value] of Object.entries(record)) {
    if (columns.has(column) && value !== undefined && !(column in picked)) {
      picked[column] = value;
    }
  }

  return picked;
}

async function insertOrUpdateByName(client, tableName, keyColumn, columns, record) {
  const existing = await client.query(
    `SELECT id FROM ${tableName} WHERE LOWER(${keyColumn}) = LOWER($1) LIMIT 1`,
    [record[keyColumn]]
  );

  if (existing.rows.length > 0) {
    const updateColumns = Object.keys(record).filter((column) => column !== keyColumn && columns.has(column));
    if (updateColumns.length > 0) {
      const assignments = updateColumns.map((column, index) => `${column} = $${index + 2}`).join(', ');
      await client.query(
        `UPDATE ${tableName} SET ${assignments} WHERE id = $1`,
        [existing.rows[0].id, ...updateColumns.map((column) => record[column])]
      );
    }

    return existing.rows[0].id;
  }

  const insertRecord = { ...record };
  if (columns.has('uuid') && !insertRecord.uuid) {
    insertRecord.uuid = randomUUID();
  }

  const insertColumns = Object.keys(insertRecord).filter((column) => columns.has(column));
  const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
  const result = await client.query(
    `INSERT INTO ${tableName} (${insertColumns.join(', ')})
     VALUES (${placeholders})
     RETURNING id`,
    insertColumns.map((column) => insertRecord[column])
  );

  return result.rows[0].id;
}

async function run() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const skillColumns = await getColumns(client, 'skills');
    const roleColumns = await getColumns(client, 'job_roles');
    const requirementColumns = await getColumns(client, 'job_role_requirements');

    const skillIds = new Map();
    for (const skill of skills) {
      const skillRecord = pickColumns({
        ...skill,
        industry_demand: 75,
        average_salary_impact: 5000
      }, skillColumns, ['name']);
      const id = await insertOrUpdateByName(client, 'skills', 'name', skillColumns, skillRecord);
      skillIds.set(skill.name, id);
    }

    const roleIds = new Map();
    for (const role of roles) {
      const avgSalary = Math.round((role.avg_salary_min + role.avg_salary_max) / 2);
      const roleRecord = pickColumns({
        title: role.title,
        description: role.description,
        category: role.category,
        seniority_level: role.seniority_level,
        avg_salary: avgSalary,
        avg_salary_min: role.avg_salary_min,
        avg_salary_max: role.avg_salary_max,
        market_demand: demandToMarketDemand[role.demand_level],
        demand_level: role.demand_level
      }, roleColumns, ['title']);

      const id = await insertOrUpdateByName(client, 'job_roles', 'title', roleColumns, roleRecord);
      roleIds.set(role.title, id);
    }

    let requirementCount = 0;
    for (const role of roles) {
      const roleId = roleIds.get(role.title);

      for (const [skillName, level] of role.requirements) {
        const skillId = skillIds.get(skillName);
        if (!skillId) {
          throw new Error(`Missing seeded skill "${skillName}" for role "${role.title}"`);
        }

        const levelColumn = requirementColumns.has('required_proficiency_level')
          ? 'required_proficiency_level'
          : 'proficiency_level';

        const existing = await client.query(
          'SELECT id FROM job_role_requirements WHERE job_role_id = $1 AND skill_id = $2 LIMIT 1',
          [roleId, skillId]
        );

        if (existing.rows.length > 0) {
          await client.query(
            `UPDATE job_role_requirements
             SET ${levelColumn} = $2, importance_level = $3
             WHERE id = $1`,
            [existing.rows[0].id, level, 'required']
          );
        } else {
          const requirementRecord = pickColumns({
            uuid: randomUUID(),
            job_role_id: roleId,
            skill_id: skillId,
            [levelColumn]: level,
            importance_level: 'required'
          }, requirementColumns, ['job_role_id', 'skill_id']);

          const columns = Object.keys(requirementRecord);
          const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
          await client.query(
            `INSERT INTO job_role_requirements (${columns.join(', ')})
             VALUES (${placeholders})`,
            columns.map((column) => requirementRecord[column])
          );
        }

        requirementCount += 1;
      }
    }

    await client.query('COMMIT');

    console.log(`Seeded ${skills.length} skills`);
    console.log(`Seeded ${roles.length} job roles`);
    console.log(`Seeded ${requirementCount} job role requirements`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = {
  run,
  skills,
  roles
};
