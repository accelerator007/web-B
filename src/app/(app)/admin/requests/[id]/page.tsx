import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getRequestBundle } from '@/lib/queries';
import { canDecide } from '@/lib/workflow';
import {
  AttachmentsCard,
  DecisionsCard,
  RequestHeader,
  TimelineCard,
} from '@/components/request-detail';
import { DecisionForm } from '@/components/decision-form';
import { DangerDialog } from '@/components/admin/danger-dialog';
import { Alert } from '@/components/ui';
import { decideAction } from '@/app/(app)/dashboard/requests/[id]/actions';
import { deleteRequestAction } from '../../actions';
import type { AttachmentRow, RequestRow, ReviewRow } from '@/lib/types';
import type { Department } from '@/lib/constants';

export const dynamic = 'force-dynamic';

function stageDepartment(r: RequestRow): Department {
  if (r.status === 'pending_finance') return 'finance';
  if (r.status === 'pending_investment') return 'investment';
  if (r.status === 'pending_departments') return r.technical_decision ? 'health' : 'technical';
  return 'admin';
}

export default async function AdminRequestDetail({ params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  const { request, attachments, reviews } = await getRequestBundle(params.id);
  if (!request) notFound();

  const editable = canDecide(admin, request);
  const action = decideAction.bind(null, request.id);

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          <Link href="/admin/requests" className="hover:text-brand-700">
            إدارة الطلبات
          </Link>
          <span className="mx-2">/</span>
          <span dir="ltr" className="text-slate-800">
            {request.request_number}
          </span>
        </div>

        <DangerDialog
          action={deleteRequestAction}
          triggerLabel="حذف الطلب نهائياً"
          triggerClass="btn-danger !py-2 !text-sm"
          title={`حذف الطلب ${request.request_number}`}
          description="سيتم حذف الطلب وجميع مرفقاته من قاعدة البيانات والتخزين نهائياً."
          confirmLabel="حذف نهائي"
          hidden={{ request_id: request.id, redirect_to: '/admin/requests' }}
        />
      </nav>

      <RequestHeader r={request} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AttachmentsCard attachments={attachments as AttachmentRow[]} />
          <DecisionsCard r={request} />

          {editable ? (
            <>
              <Alert kind="warn">
                بصفتك مدير النظام يمكنك اتخاذ القرار نيابةً عن الجهة المسؤولة عن المرحلة الحالية، وسيُسجَّل
                باسمك في سجل الإجراءات.
              </Alert>
              <DecisionForm action={action} actingAs={stageDepartment(request)} isAdmin />
            </>
          ) : (
            <Alert kind="info">
              {request.status === 'approved'
                ? 'اكتملت إجراءات هذا الطلب واعتُمد نهائياً.'
                : 'هذا الطلب مرفوض ولا يمكن اتخاذ إجراء عليه.'}
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
