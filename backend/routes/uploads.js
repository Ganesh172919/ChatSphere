const express = require('express');
const path = require('path');
const authMiddleware = require('../middleware/auth');
const { upload, uploadDir } = require('../middleware/upload');

const router = express.Router();

// POST /api/uploads — Upload a file (authenticated)
router.post('/', authMiddleware, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    res.status(201).json({
      fileUrl: `/api/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });
  });
});

// GET /api/uploads/:filename — Serve uploaded file
router.get('/:filename', (req, res) => {
  const filename = req.params.filename;
  // Basic security: prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filePath = path.join(uploadDir, filename);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: 'File not found' });
    }
  });
});

module.exports = router;
