import { NextRequest, NextResponse } from 'next/server';
import { verifyApprovalActionToken } from '@/lib/approval-token';
import { resolveApprovalRequest } from '@/lib/admin';
import { queryOne } from '@/lib/domain';

// Public, no-login approve/decline — clicked directly from the email sent
// by createApprovalRequest (lib/admin.ts). The signed token embeds which
// approval_requests row, which decision, and which admin's link this is
// (see lib/approval-token.ts), so this route needs no session at all —
// same trust model as a password-reset link. resolveApprovalRequest's own
// "must still be pending" guard makes a second click on either link (by
// the same or a different recipient) a safe no-op rather than a
// double-apply.
function renderResultPage(opts: { ok: boolean; title: string; message: string }) {
  const color = opts.ok ? '#0df220' : '#ef4444';
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #050505; color: #fff; min-height: 100vh; margin: 0; display: flex; align-items: center; justify-content: center; padding: 20px;">
  <div style="max-width: 480px; text-align: center; background: #0f0f0f; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px 30px;">
    <div style="width: 56px; height: 56px; border-radius: 50%; background: ${color}22; border: 1px solid ${color}55; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 28px;">
      ${opts.ok ? '✓' : '!'}
    </div>
    <h1 style="font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 0 0 12px;">${opts.title}</h1>
    <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6; margin: 0 0 24px;">${opts.message}</p>
    <a href="/fg-admin/platform/approvals" style="display: inline-block; background: ${color}; color: #050505; font-weight: 900; font-size: 12px; text-decoration: none; padding: 12px 24px; border-radius: 8px;">OPEN APPROVALS DASHBOARD</a>
  </div>
</body>
</html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const parsed = verifyApprovalActionToken(token);

  if (!parsed) {
    return renderResultPage({
      ok: false,
      title: 'Link Expired or Invalid',
      message: 'This approval link has expired (links are valid for 48 hours) or is no longer valid. Please log in to the approvals dashboard to review this request instead.',
    });
  }

  const existing = await queryOne<{ status: string }>('SELECT status FROM approval_requests WHERE id = ? LIMIT 1', [parsed.requestId]);
  if (!existing) {
    return renderResultPage({ ok: false, title: 'Request Not Found', message: 'This approval request no longer exists.' });
  }
  if (existing.status !== 'pending') {
    return renderResultPage({
      ok: true,
      title: `Already ${existing.status === 'approved' ? 'Approved' : 'Declined'}`,
      message: `This request was already ${existing.status} — no action was taken.`,
    });
  }

  try {
    await resolveApprovalRequest({
      requestId: parsed.requestId,
      decisionBy: parsed.adminId,
      decision: parsed.action === 'approve' ? 'approved' : 'rejected',
      reason: parsed.action === 'decline' ? 'Declined via email link' : null,
    });
  } catch (err) {
    console.error('[Approvals] Failed to resolve via email link:', err);
    return renderResultPage({
      ok: false,
      title: 'Something Went Wrong',
      message: 'This request could not be processed. Please log in to the approvals dashboard and try again there.',
    });
  }

  return renderResultPage({
    ok: true,
    title: parsed.action === 'approve' ? 'Request Approved' : 'Request Declined',
    message: parsed.action === 'approve'
      ? 'The request has been approved and applied.'
      : 'The request has been declined. The person who submitted it has been notified.',
  });
}
