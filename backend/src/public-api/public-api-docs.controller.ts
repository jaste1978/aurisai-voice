import { Controller, Get, Header } from '@nestjs/common';

const BASE = 'https://voice.aurisaivoice.com/api/v1';

// Public, unauthenticated API docs at /api/v1/docs
@Controller('v1')
export class PublicApiDocsController {
  @Get('docs')
  @Header('Content-Type', 'text/html; charset=utf-8')
  docs(): string {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AurisAI API</title>
<style>
  body{font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;max-width:820px;margin:40px auto;padding:0 20px;color:#18120E;background:#fff}
  h1{font-size:28px} h2{margin-top:34px;border-bottom:1px solid #eee;padding-bottom:6px}
  code,pre{font-family:ui-monospace,Menlo,monospace}
  pre{background:#0F0D0A;color:#eee;padding:14px 16px;border-radius:8px;overflow:auto;font-size:13px}
  .m{display:inline-block;font-weight:700;font-size:12px;padding:2px 8px;border-radius:5px;color:#fff;margin-right:8px}
  .get{background:#2b8a3e}.post{background:#FF7A50}
  .ep{margin:14px 0 6px} .muted{color:#777}
  a{color:#FF7A50}
</style></head><body>
<h1>AurisAI Voice API <span class="muted">v1</span></h1>
<p>Place and manage AI voice calls programmatically. Base URL: <code>${BASE}</code></p>

<h2>Authentication</h2>
<p>Every request needs your API key in the <code>Authorization</code> header. Keys are issued by AurisAI.</p>
<pre>Authorization: Bearer sk_live_your_key_here</pre>

<h2>Place a call</h2>
<div class="ep"><span class="m post">POST</span><code>/calls</code></div>
<p><code>agent</code> is a preset (<code>hr</code>, <code>sales</code>, <code>support</code>) or one of your own agent ids. Pass an optional <code>webhook_url</code> to receive the outcome when the call ends, and any <code>metadata</code> you want echoed back.</p>
<pre>curl -X POST ${BASE}/calls \\
  -H "Authorization: Bearer sk_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent": "sales",
    "phone_number": "+919876543210",
    "webhook_url": "https://yourapp.com/hooks/auris",
    "metadata": { "lead_id": "abc123" }
  }'</pre>
<p class="muted">Returns <code>{ "success": true, "call": { "id", "status", ... } }</code>. Demo/preset calls run up to 2 minutes.</p>

<h2>Get a call</h2>
<div class="ep"><span class="m get">GET</span><code>/calls/:id</code></div>
<pre>curl ${BASE}/calls/123 -H "Authorization: Bearer sk_live_your_key"</pre>

<h2>Transcript &amp; recording</h2>
<div class="ep"><span class="m get">GET</span><code>/calls/:id/transcript</code> &nbsp; <span class="m get">GET</span><code>/calls/:id/recording</code></div>

<h2>List your calls</h2>
<div class="ep"><span class="m get">GET</span><code>/calls?limit=50</code></div>

<h2>List agents</h2>
<div class="ep"><span class="m get">GET</span><code>/agents</code></div>
<pre>curl ${BASE}/agents -H "Authorization: Bearer sk_live_your_key"</pre>

<h2>Webhooks</h2>
<p>If you pass <code>webhook_url</code> when placing a call, we POST the outcome to it once the call finishes:</p>
<pre>POST your webhook_url
{
  "event": "call.completed",
  "call": { "id", "status", "duration", "summary",
            "recording_url", "transcript_available", "metadata" }
}</pre>

<p class="muted">Errors use standard HTTP codes with <code>{ "message": "..." }</code>. 401 = bad/missing key, 403 = agent not allowed, 400 = bad request.</p>
</body></html>`;
  }
}
