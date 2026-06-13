const LOG_BUFFER_SIZE = 500;
const logBuffer = [];

function pushLog(severity, args) {
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  logBuffer.push({ timestamp: new Date().toISOString(), severity, message: msg });
  if (logBuffer.length > LOG_BUFFER_SIZE) logBuffer.shift();
}

const _log   = console.log.bind(console);
const _warn  = console.warn.bind(console);
const _error = console.error.bind(console);

console.log   = (...a) => { pushLog('INFO',    a); _log(...a); };
console.warn  = (...a) => { pushLog('WARNING', a); _warn(...a); };
console.error = (...a) => { pushLog('ERROR',   a); _error(...a); };

module.exports = { logBuffer };
