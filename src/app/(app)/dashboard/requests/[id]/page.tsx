import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getRequestBundle } from '@/lib/queries';
import { canDecide } from '@/lib/workflow';
import { markRequestNotificationsRead } from '@/lib/notifications';
import {
  AttachmentsCard,
  DecisionsCard,
  RequestHeader,
  TimelineCard,
} from '@/components/request-detail';
import { DecisionForm } from '@/components/decision-form';
import { Alert } from '@/components/ui';
import { createContractUploadTicketAction, decideAction } from './actions';
import type { AttachmentRow, ReviewRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const { request, attachments, reviews } = await getRequestBundle(params.id);
  if (!request) notFound();

  await markRequestNotificationsRead(user.id, request.id);

  const editable = canDecide(user, request);
  const action = decideAction.bind(null, request.id);
  const contractTicketAction = createContractUploadTicketAction.bind(null, request.id);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-slate-500">
        <Link href="/dashboard/requests" className="hover:text-brand-700">
          الطلبات
        </Link>
        <span className="mx-2">/</span>
        <span dir="ltr" className="text-slate-800">
          {request.request_number}
        </span>
      </nav>

      <RequestHeader r={request} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AttachmentsCard attachments={attachments as AttachmentRow[]} />
          <DecisionsCard r={request} />

          {editable ? (
            <DecisionForm action={action} actingAs={user.department} contractTicketAction={contractTicketAction} />
          ) : (
            <Alert kind="info">
              {request.status === 'approved'
                ? 'اكتملت إجراءات هذا الطلب واعتُمد نهائياً.'
                : request.status === 'rejected'
                ? 'هذا الطلب مرفوض ولا يمكن اتخاذ إجراء عليه.'
                : 'الطلب حالياً لدى جهة أخرى — العرض للاطلاع فقط.'}
            </Alert>
          )}
        </div>

        <div className="lg:col-span-1">
          <TimelineCard reviews={reviews as ReviewRow[]} />
        </div>
      </div>
    </div>
  );
}
