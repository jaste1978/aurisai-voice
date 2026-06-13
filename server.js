require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');

// ── In-memory log ring buffer (intercepts console.* from startup) ────────────
require('./logger');
// ────────────────────────────────────────────────────────────────────────────

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// HTTP request logger — skip static assets to keep buffer clean
app.use((req, res, next) => {
  if (req.path.startsWith('/assets/') || req.path === '/favicon.svg') return next();
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const sev = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARNING' : 'INFO';
    console[sev === 'ERROR' ? 'error' : sev === 'WARNING' ? 'warn' : 'log'](
      `${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`
    );
  });
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

const customersRouter = require('./routes/customers');
const callsRouter = require('./routes/calls');
const webhooksRouter = require('./routes/webhooks');
const agentsRouter = require('./routes/agents');
const batchesRouter = require('./routes/batches');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const logsRouter = require('./routes/logs');
const scriptsRouter = require('./routes/scripts');
const agentConfigsRouter = require('./routes/agentConfigs');

app.use('/api/customers', customersRouter);
app.use('/api/calls', callsRouter);
app.use('/webhooks', webhooksRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/logs', logsRouter);
app.use('/api/scripts', scriptsRouter);
app.use('/api/agent-configs', agentConfigsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date(), db: 'postgresql' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ PostgreSQL connected successfully`);
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Dashboard available at http://localhost:${PORT}`);
      console.log(`📡 Bolna API Key configured: ${process.env.BOLNA_API_KEY ? '✅' : '❌'}`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err.message);
    process.exit(1);
  });
