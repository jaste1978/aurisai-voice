const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { authenticate, requireAdmin } = require('../middleware/auth');

const GCP_PROJECT   = 'aiagents-490508';
const GCP_SERVICE   = 'augmont-voice-agents';
const GCP_REGION    = 'asia-south1';

// GET /api/logs?env=local|production&limit=200&severity=ALL&filter=
router.get('/', authenticate, requireAdmin, async (req, res) => {
  const { env = 'local', limit = 200, severity = 'ALL', filter = '', freshness = '1d' } = req.query;

  if (env === 'local') {
    const { logBuffer } = require('../logger');
    let logs = [...logBuffer].reverse(); // newest first

    if (severity !== 'ALL') {
      logs = logs.filter(l => l.severity === severity);
    }
    if (filter) {
      const lf = filter.toLowerCase();
      logs = logs.filter(l => l.message.toLowerCase().includes(lf));
    }

    return res.json({ success: true, env: 'local', data: logs.slice(0, parseInt(limit)) });
  }

  // Production — fetch from GCP Cloud Logging
  let severityFilter = '';
  if (severity !== 'ALL') {
    severityFilter = ` AND severity="${severity}"`;
  }

  const filterArg = filter
    ? ` AND textPayload:"${filter.replace(/"/g, '')}"` : '';

  const logFilter = [
    `resource.type=cloud_run_revision`,
    `resource.labels.service_name=${GCP_SERVICE}`,
    `resource.labels.location=${GCP_REGION}`,
  ].join(' AND ') + severityFilter + filterArg;

  const cmd = [
    `gcloud logging read '${logFilter}'`,
    `--project=${GCP_PROJECT}`,
    `--limit=${Math.min(parseInt(limit), 500)}`,
    `--freshness=${freshness}`,
    `--format=json`,
  ].join(' ');

  exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ success: false, error: stderr || err.message });
    }

    let raw = [];
    try { raw = JSON.parse(stdout || '[]'); } catch (e) {
      return res.status(500).json({ success: false, error: 'Failed to parse GCP log response' });
    }

    const logs = raw.map(entry => {
      const http = entry.httpRequest;
      let message = entry.textPayload
        || entry.jsonPayload?.message
        || (http ? `${http.requestMethod} ${http.requestUrl} → ${http.status}` : '')
        || JSON.stringify(entry.jsonPayload || {});

      return {
        timestamp: entry.timestamp,
        severity: entry.severity || 'DEFAULT',
        message,
        revision: entry.resource?.labels?.revision_name,
        requestMethod: http?.requestMethod,
        requestUrl: http?.requestUrl,
        status: http?.status,
        latency: http?.latency,
        userAgent: http?.userAgent,
        remoteIp: http?.remoteIp,
      };
    });

    res.json({ success: true, env: 'production', data: logs });
  });
});

module.exports = router;
