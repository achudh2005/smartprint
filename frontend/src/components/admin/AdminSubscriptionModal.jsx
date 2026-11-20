import { useState, useEffect } from 'react';
import {
  CreditCard, ShieldCheck, Clock, Calendar, CheckCircle2,
  AlertTriangle, ShieldAlert, Sparkles, X, Plus, Ban, RotateCcw
} from 'lucide-react';
import { Modal, Button, Badge, Alert, Spinner } from '../ui';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminSubscriptionModal({ shop, isOpen, onClose, onUpdated }) {
  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'extend' | 'grant' | 'force' | 'suspend'

  // Form states
  const [extendDays, setExtendDays] = useState(14);
  const [grantDays, setGrantDays] = useState(30);
  const [grantReason, setGrantReason] = useState('Customer satisfaction compensation');
  const [forceExpiryDate, setForceExpiryDate] = useState('');
  const [forceReason, setForceReason] = useState('Manual bank wire transfer verified');
  const [suspendReason, setSuspendReason] = useState('Policy violation or non-payment');

  const fetchDetails = async () => {
    if (!shop?.id) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/admin/shops/${shop.id}/subscription`);
      setSubData(data.data);
    } catch (err) {
      toast.error('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && shop?.id) {
      fetchDetails();
      // default force expiry date to 30 days from now (YYYY-MM-DD)
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setForceExpiryDate(d.toISOString().split('T')[0]);
    }
  }, [isOpen, shop?.id]);

  const handleAction = async (endpoint, payload, successMsg) => {
    try {
      setActionLoading(true);
      await api.post(`/admin/shops/${shop.id}/subscription/${endpoint}`, payload);
      toast.success(successMsg);
      await fetchDetails();
      if (onUpdated) onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const subscription = subData?.subscription;
  const calculation = subData?.calculation;
  const payments = subData?.payments || [];
  const status = calculation?.status || 'EXPIRED';
  const daysRemaining = calculation?.daysRemaining ?? 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center shrink-0">
              <CreditCard size={20} strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text)]">
                Manage Subscription: {shop?.name}
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Code: {shop?.shopCode} • Shop ID #{shop?.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Spinner size="md" />
            <p className="mt-2 text-xs text-[var(--text-muted)]">Loading subscription ledger...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Live Status Header Card */}
            <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text-muted)]">Status:</span>
                  <Badge
                    variant={
                      status === 'ACTIVE' ? 'success'
                      : status === 'TRIAL' ? 'info'
                      : status === 'PAST_DUE' ? 'warning'
                      : 'danger'
                    }
                    className="font-bold text-[11px]"
                  >
                    {status}
                  </Badge>
                  {subscription?.bonusDays > 0 && (
                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      +{subscription.bonusDays} Bonus Days
                    </span>
                  )}
                </div>
                <div className="text-[var(--text-muted)]">
                  Plan: <span className="font-semibold text-[var(--text)]">{subscription?.plan || (calculation?.isTrial ? 'FREE TRIAL' : 'NONE')}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-extrabold text-[var(--text)]">
                  {daysRemaining} Day{daysRemaining === 1 ? '' : 's'} Left
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  {calculation?.effectiveExpiryDate ? (
                    `Expires: ${new Date(calculation.effectiveExpiryDate).toLocaleDateString()}`
                  ) : (
                    'No expiry date'
                  )}
                </div>
              </div>
            </div>

            {/* Admin Action Tabs */}
            <div className="flex border-b border-[var(--border)] gap-2 text-xs overflow-x-auto pb-1">
              {[
                { id: 'overview', label: 'History & Ledger' },
                { id: 'extend', label: 'Extend Trial' },
                { id: 'grant', label: 'Grant Free Days' },
                { id: 'force', label: 'Force Activate' },
                { id: 'suspend', label: 'Suspend / Status' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#007AFF] text-white font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/[0.04]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB: OVERVIEW & PAYMENTS */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">Trial Started</div>
                    <div className="font-semibold text-[var(--text)] mt-0.5">
                      {subscription?.trialStartedAt ? new Date(subscription.trialStartedAt).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">Trial Ends</div>
                    <div className="font-semibold text-[var(--text)] mt-0.5">
                      {subscription?.trialEndsAt ? new Date(subscription.trialEndsAt).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">Paid Period End</div>
                    <div className="font-semibold text-[var(--text)] mt-0.5">
                      {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'None'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">Bonus Days</div>
                    <div className="font-semibold text-[var(--text)] mt-0.5">
                      {subscription?.bonusDays || 0} Days
                    </div>
                  </div>
                </div>

                {/* Payments */}
                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="bg-[var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text)] border-b border-[var(--border)]">
                    Subscription Payment History ({payments.length})
                  </div>
                  {payments.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                      No online payments recorded yet for this shop.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)] border-b border-[var(--border)]">
                          <tr>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Ref ID</th>
                            <th className="py-2 px-3">Amount</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {payments.map((p) => (
                            <tr key={p.id}>
                              <td className="py-2 px-3">{new Date(p.createdAt).toLocaleDateString()}</td>
                              <td className="py-2 px-3 font-mono text-[10px]">{p.razorpayPaymentId || p.razorpayOrderId}</td>
                              <td className="py-2 px-3 font-semibold">₹{Number(p.amount).toFixed(2)}</td>
                              <td className="py-2 px-3">
                                <Badge variant={p.status === 'PAID' ? 'success' : 'warning'} className="text-[9px]">
                                  {p.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: EXTEND TRIAL */}
            {activeTab === 'extend' && (
              <div className="space-y-3 p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] text-xs">
                <div>
                  <h4 className="font-bold text-[var(--text)]">Extend Trial Days</h4>
                  <p className="text-[var(--text-muted)] text-[11px] mt-0.5">
                    Adds extra bonus days to the shop's free trial window. If currently expired, this immediately restores active trial access.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={extendDays}
                    onChange={(e) => setExtendDays(e.target.value)}
                    className="input w-28 h-9 text-xs"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    loading={actionLoading}
                    onClick={() => handleAction('extend-trial', { days: extendDays }, `Extended trial by ${extendDays} days.`)}
                  >
                    <Plus size={13} /> Add {extendDays} Days
                  </Button>
                </div>
              </div>
            )}

            {/* TAB: GRANT FREE DAYS */}
            {activeTab === 'grant' && (
              <div className="space-y-3 p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] text-xs">
                <div>
                  <h4 className="font-bold text-[var(--text)]">Grant Free Days (Promotional / Goodwill)</h4>
                  <p className="text-[var(--text-muted)] text-[11px] mt-0.5">
                    Extends the shop's active paid period without recording a real payment, preserving financial revenue integrity.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="text-[var(--text-muted)] w-24">Days to grant:</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={grantDays}
                      onChange={(e) => setGrantDays(e.target.value)}
                      className="input w-28 h-9 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-[var(--text-muted)] w-24">Reason / Note:</label>
                    <input
                      type="text"
                      value={grantReason}
                      onChange={(e) => setGrantReason(e.target.value)}
                      placeholder="e.g. Compensation for downtime"
                      className="input flex-1 h-9 text-xs"
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={actionLoading}
                    onClick={() => handleAction('grant-days', { days: grantDays, reason: grantReason }, `Granted ${grantDays} free days.`)}
                  >
                    Grant {grantDays} Days
                  </Button>
                </div>
              </div>
            )}

            {/* TAB: FORCE ACTIVATE */}
            {activeTab === 'force' && (
              <div className="space-y-3 p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] text-xs">
                <div>
                  <h4 className="font-bold text-[var(--text)]">Force Activate (Offline Bank Transfer / Custom)</h4>
                  <p className="text-[var(--text-muted)] text-[11px] mt-0.5">
                    Manually sets status to ACTIVE until a specified expiry date, creating a traceable manual payment ledger entry.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="text-[var(--text-muted)] w-24">Expiry Date:</label>
                    <input
                      type="date"
                      value={forceExpiryDate}
                      onChange={(e) => setForceExpiryDate(e.target.value)}
                      className="input w-44 h-9 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-[var(--text-muted)] w-24">Audit Reason:</label>
                    <input
                      type="text"
                      value={forceReason}
                      onChange={(e) => setForceReason(e.target.value)}
                      placeholder="e.g. Offline cash or wire transfer received"
                      className="input flex-1 h-9 text-xs"
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={actionLoading}
                    onClick={() => handleAction('force-activate', { expiryDate: forceExpiryDate, reason: forceReason }, 'Shop force-activated successfully.')}
                  >
                    <CheckCircle2 size={13} /> Force Activate Until Date
                  </Button>
                </div>
              </div>
            )}

            {/* TAB: SUSPEND / REACTIVATE / CANCEL */}
            {activeTab === 'suspend' && (
              <div className="space-y-4 p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] text-xs">
                {status === 'SUSPENDED' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
                      <ShieldAlert size={15} /> Currently Suspended
                    </div>
                    <p className="text-[var(--text-muted)] text-[11px]">
                      Reason: {subscription?.suspendedReason || 'Administrative suspension'}
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      loading={actionLoading}
                      onClick={() => handleAction('reactivate', {}, 'Shop reactivated.')}
                    >
                      <RotateCcw size={13} /> Reactivate Shop (Restore Valid Dates)
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h4 className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <Ban size={14} /> Immediately Suspend Shop
                    </h4>
                    <p className="text-[var(--text-muted)] text-[11px]">
                      This immediately blocks the shop owner and locks the storefront for customers.
                    </p>
                    <input
                      type="text"
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      placeholder="Suspension reason (required)"
                      className="input w-full h-9 text-xs"
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      loading={actionLoading}
                      disabled={!suspendReason.trim()}
                      onClick={() => handleAction('suspend', { reason: suspendReason }, 'Shop suspended.')}
                    >
                      Suspend Access Immediately
                    </Button>
                  </div>
                )}

                <div className="border-t border-[var(--border)] pt-3 flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Cancel auto-renewal at period end:</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={actionLoading}
                    onClick={() => handleAction('cancel', { reason: 'Admin cancelled' }, 'Subscription marked cancelled.')}
                  >
                    Cancel Plan Renewal
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-[var(--border)]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
