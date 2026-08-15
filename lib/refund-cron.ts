import cron from 'node-cron';
import { getPendingRefundRequestIds, reconcileRefundStatus } from '@/lib/refund-reconcile';
import { reportServerError } from '@/lib/error-log';

let started = false;

/**
 * Polls PayU every 30 minutes for any refund still in a non-terminal state
 * (PROCESSING/INITIATED/PENDING_REVIEW) and reconciles it — the same check
 * an admin can trigger manually via the "Check PayU Status" button, just on
 * a schedule so customers don't have to wait for an admin to click it.
 * Runs in-process (no VPS-level cron needed); guarded to start once per
 * server process since Next.js can otherwise invoke this module more than
 * once in dev.
 */
export function startRefundCron() {
  if (started) return;
  started = true;

  cron.schedule('*/30 * * * *', async () => {
    try {
      const refundRequestIds = await getPendingRefundRequestIds();
      for (const id of refundRequestIds) {
        try {
          await reconcileRefundStatus(id);
        } catch (err) {
          reportServerError(err, { route: 'refund-cron', step: 'reconcile', refundRequestId: id });
        }
      }
    } catch (err) {
      reportServerError(err, { route: 'refund-cron', step: 'fetch_pending' });
    }
  });

  console.info('[refund-cron] Scheduled refund status reconciliation every 30 minutes.');
}
