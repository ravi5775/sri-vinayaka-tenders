const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getMongoClient } = require('../config/mongodb');
const { sendEmail } = require('../config/email');
const { backupEmailTemplate } = require('../templates/emailTemplates');
const { pool } = require('../config/database');

const router = express.Router();
router.use(authenticate);

// POST /api/backup/mongodb
router.post('/mongodb', async (req, res) => {
  try {
    const data = req.body;
    if (!data || (!data.loans && !data.investors)) {
      return res.status(400).json({ error: 'Backup data is required' });
    }

    const db = await getMongoClient();
    const collection = db.collection('backups');

    const fileName = `sri-vinayaka-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const backupDoc = {
      ...data,
      userId: req.user.id,
      userEmail: req.user.email,
      backedUpAt: new Date(),
      fileName,
    };

    await collection.insertOne(backupDoc);
    res.json({ message: 'Backup saved to MongoDB Atlas successfully' });
  } catch (err) {
    console.error('MongoDB backup error:', err);
    res.status(500).json({ error: 'Failed to backup to MongoDB: ' + err.message });
  }
});

// POST /api/backup/email - Send backup file via email
router.post('/email', async (req, res) => {
  try {
    const data = req.body;
    if (!data || (!data.loans && !data.investors)) {
      return res.status(400).json({ error: 'Backup data is required' });
    }

    // Get admin user info
    const userResult = await pool.query(
      'SELECT u.email, p.display_name FROM users u LEFT JOIN profiles p ON u.id::text = p.id::text WHERE u.id = $1',
      [req.user.id]
    );
    const adminEmail = userResult.rows[0]?.email || req.user.email;
    const displayName = userResult.rows[0]?.display_name || 'Admin';

    const fileName = `sri-vinayaka-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const stats = {
      loans: data.loans?.length || 0,
      investors: data.investors?.length || 0,
    };

    const html = backupEmailTemplate(displayName, fileName, stats);
    const emailResult = await sendEmail(adminEmail, `Data Backup - ${APP_NAME}`, html);

    res.json({
      message: emailResult.success ? 'Backup email sent successfully' : 'Failed to send backup email',
      emailSent: emailResult.success,
    });
  } catch (err) {
    console.error('Backup email error:', err);
    res.status(500).json({ error: 'Failed to send backup email: ' + err.message });
  }
});

const APP_NAME = 'Sri Vinayaka Tenders';

module.exports = router;
