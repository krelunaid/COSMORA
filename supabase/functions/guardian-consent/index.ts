// Feature flag intentionally OFF. Do not connect SMTP or the handler until the
// complete authorization rollout in docs/GUARDIAN-CONSENT-PREPARATION.md is tested.
// No database call, email, public authorization or review action runs in this entrypoint.
Deno.serve(() => new Response(JSON.stringify({ error: 'workflow_not_active' }), {
  status: 503,
  headers: {
    'Content-Type': 'application/json', 'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
  },
}));
