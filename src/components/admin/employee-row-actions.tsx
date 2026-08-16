'use client';

import { DangerDialog } from './danger-dialog';
import { DEPARTMENTS, type Department } from '@/lib/constants';
import type { ActionState, EmployeeRow } from '@/lib/types';

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function EmployeeRowActions({
  employee,
  updateAction,
  passwordAction,
  deleteAction,
}: {
  employee: EmployeeRow;
  updateAction: Action;
  passwordAction: Action;
  deleteAction: Action;
}) {
  return (
    <div className="flex items-center gap-4">
      {/* تعديل البيانات */}
      <DangerDialog
        action={updateAction}
        triggerLabel="تعديل"
        triggerClass="text-sm font-bold text-brand-700 hover:underline"
        title={`تعديل بيانات: ${employee.full_name}`}
        confirmLabel="حفظ التعديلات"
        confirmClass="btn-primary flex-1"
        hidden={{ employee_id: employee.id }}
      >
        <div>
          <label className="label">الرقم الوظيفي</label>
          <input name="employee_number" dir="ltr" className="input" defaultValue={employee.employee_number} required />
        </div>
        <div>
          <label className="label">اسم الموظف</label>
          <input name="full_name" className="input" defaultValue={employee.full_name} required />
        </div>
        <div>
          <label className="label">البريد الإلكتروني</label>
          <input name="email" type="email" dir="ltr" className="input" defaultValue={employee.email} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">القسم</label>
            <select name="department" className="input" defaultValue={employee.department}>
              {(Object.keys(DEPARTMENTS) as Department[]).map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENTS[d]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">الصلاحية</label>
            <select name="role" className="input" defaultValue={employee.role}>
              <option value="employee">موظف</option>
              <option value="admin">مدير النظام</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">حالة الحساب</label>
          <select name="status" className="input" defaultValue={employee.status === 'disabled' ? 'disabled' : 'active'}>
            <option value="active">مفعّل</option>
            <option value="disabled">موقوف</option>
          </select>
        </div>
      </DangerDialog>

      {/* تغيير كلمة المرور */}
      <DangerDialog
        action={passwordAction}
        triggerLabel="كلمة المرور"
        triggerClass="text-sm font-bold text-slate-700 hover:underline"
        title={`تغيير كلمة مرور: ${employee.full_name}`}
        description="سيتم إشعار الموظف بالبريد الإلكتروني بعد التغيير."
        confirmLabel="تغيير كلمة المرور"
        confirmClass="btn-primary flex-1"
        hidden={{ employee_id: employee.id }}
      >
        <div>
          <label className="label">كلمة المرور الجديدة</label>
          <input name="password" type="password" dir="ltr" minLength={8} className="input" required />
        </div>
        <div>
          <label className="label">تأكيد كلمة المرور</label>
          <input name="password_confirm" type="password" dir="ltr" minLength={8} className="input" required />
        </div>
      </DangerDialog>

      {/* حذف */}
      <DangerDialog
        action={deleteAction}
        triggerLabel="حذف"
        title={`حذف الموظف: ${employee.full_name}`}
        description="سيتم حذف الحساب نهائياً مع إشعاراته. لا يمكن التراجع عن هذه العملية."
        confirmLabel="حذف نهائي"
        hidden={{ employee_id: employee.id }}
      />
    </div>
  );
}
