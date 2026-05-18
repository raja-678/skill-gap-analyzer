const express = require('express');
const pool = require('../config/database');


const router = express.Router();

/**
 * @openapi
 * /api/og/profile/{username}:
 *   get:
 *     summary: Generate an open graph image for a public user profile
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: OG image generated
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/svg+xml:
 *             schema:
 *               type: string
 *       '404':
 *         description: User not found or profile not public
 */
router.get('/profile/:username', async (req, res) => {
  try {
    // Lazy-load @vercel/og and React to avoid import-time platform issues
    let ImageResponse;
    let React;
    try {
      ImageResponse = require('@vercel/og').ImageResponse;
      React = require('react');
    } catch (depErr) {
      console.error('OG generation dependencies missing or failed to load:', depErr);
      // fall through to SVG fallback below
      ImageResponse = null;
      React = null;
    }
    const { username } = req.params;

    const userResult = await pool.query(
      `SELECT id, username, first_name, last_name, profile_headline, is_public_profile
       FROM users
       WHERE username = $1 AND is_public_profile = true AND deleted_at IS NULL`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).send('User not found or profile not public');
    }

    const user = userResult.rows[0];

    // Fetch top skills (names)
    const skillsResult = await pool.query(
      `SELECT s.name FROM user_skills us JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = $1 AND us.deleted_at IS NULL
       ORDER BY us.proficiency_level DESC NULLS LAST, us.endorsement_count DESC NULLS LAST
       LIMIT 8`,
      [user.id]
    );

    const topSkills = skillsResult.rows.map((r) => r.name);

    // Create OG image using @vercel/og ImageResponse if available
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    const headline = user.profile_headline || 'Skills & career snapshot';
    if (ImageResponse && React) {
      const image = new ImageResponse(
        (
          // Simple layout
          React.createElement('div', {
            style: {
              background: '#0f172a',
              width: '1200px',
              height: '630px',
              display: 'flex',
              padding: '48px',
              boxSizing: 'border-box',
              color: '#e6eef8',
              fontFamily: 'Inter, system-ui, sans-serif'
            }
          },
            React.createElement('div', { style: { flex: 1 } },
              React.createElement('div', { style: { fontSize: 48, fontWeight: 700, marginBottom: 8 } }, fullName),
              React.createElement('div', { style: { fontSize: 28, color: '#9fb0d6', marginBottom: 24 } }, headline),
              React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                topSkills.map((s) => React.createElement('span', {
                  key: s,
                  style: {
                    background: '#1f2937',
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: 18,
                    color: '#e6eef8'
                  }
                }, s))
              )
            ),
            React.createElement('div', { style: { width: 260, textAlign: 'right', alignSelf: 'flex-end', color: '#9fb0d6', fontSize: 16 } }, 'skillgap.ai')
          )
        ),
        { width: 1200, height: 630 }
      );

      // ImageResponse is a web-compatible Response; in Express we'll pipe the buffer
      const buffer = await image.arrayBuffer();
      res.set('Content-Type', 'image/png');
      res.send(Buffer.from(buffer));
      return;
    }

    // Fallback: generate a simple SVG image to serve as OG when @vercel/og isn't usable
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0f172a" />
  <g transform="translate(48,48)">
    <text x="0" y="60" fill="#e6eef8" font-size="48" font-family="Inter, system-ui, sans-serif" font-weight="700">${escapeXml(fullName)}</text>
    <text x="0" y="110" fill="#9fb0d6" font-size="28" font-family="Inter, system-ui, sans-serif">${escapeXml(headline)}</text>
    <g transform="translate(0,150)">
      ${topSkills.map((s, i) => `<rect x="${i*140}" y="0" rx="8" ry="8" width="130" height="36" fill="#1f2937"></rect><text x="${i*140+12}" y="24" fill="#e6eef8" font-size="18" font-family="Inter, system-ui, sans-serif">${escapeXml(s)}</text>`).join('')}
    </g>
    <text x="940" y="520" fill="#9fb0d6" font-size="16" font-family="Inter, system-ui, sans-serif">skillgap.ai</text>
  </g>
</svg>`;

    res.set('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (err) {
    console.error('OG image error:', err);
    res.status(500).send('Failed to generate image');
  }
});

// Helper to escape XML special characters
function escapeXml(unsafe) {
  return (unsafe || '').toString().replace(/[<>&"']/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
    }
  });
}

module.exports = router;
