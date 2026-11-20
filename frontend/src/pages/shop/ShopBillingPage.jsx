import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CreditCard, ShieldCheck, CheckCircle2, AlertTriangle, Clock,
  Calendar, ArrowRight, RefreshCw, Sparkles, XCircle, FileText, Check, ShieldAlert
} from 'lucide-react';
import { PageHeader, Card, CardHeader, CardBody, Button, Badge, Alert, Spinner } from '../../components/ui';
import ShopNavTabs from '../../components/shop/ShopNavTabs';
import { openRazorpayCheckout } from '../../lib/razorpay';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function ShopBillingPage() {
  const { shopId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const fetchSubscription = async () => {
    try {
      setError('');
      const { data } = await api.get(`/shops/${shopId}/subscription`);
      if (data?.data) {
        setSubData(data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load subscription details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [shopId]);

  const handleSubscribeOrRenew = async () => {
    if (processingPayment) return;
    try {
      setProcessingPayment(true);
      // 1. Create Razorpay Subscription Order
      const { data: orderRes } = await api.post(`/shops/${shopId}/subscription/create-order`);
      const orderData = orderRes.data;

      // 2. Open Razorpay Checkout modal
      await openRazorpayCheckout({
        keyId: orderData.key,
        amount: orderData.amountInPaise,
        currency: orderData.currency || 'INR',
        razorpayOrderId: orderData.orderId,
        orderNumber: `SUB-SHOP-${shopId}`,
        customerName: user?.name || orderData.shopName || 'Shop Owner',
        customerEmail: user?.email || '',
        customerPhone: user?.phone || '',
        onSuccess: async (rzpResponse) => {
          try {
            toast.loading('Verifying subscription payment...', { id: 'sub-verify' });
            await api.post(`/shops/${shopId}/subscription/verify-payment`, {
              razorpayOrderId: rzpResponse.razorpay_order_id,
              razorpayPaymentId: rzpResponse.razorpay_payment_id,
              razorpaySignature: rzpResponse.razorpay_signature,
            });
            toast.success('Subscription successfully activated! 30 days added to your plan.', { id: 'sub-verify' });
            await fetchSubscription();
          } catch (verErr) {
            toast.error(verErr.response?.data?.message || 'Payment verification failed.', { id: 'sub-verify' });
          } finally {
            setProcessingPayment(false);
          }
        },
        onDismiss: () => {
          toast('Checkout dismissed. No payment was charged.');
          setProcessingPayment(false);
        },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate checkout.');
      setProcessingPayment(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your monthly renewal? Your access will continue until the end of your currently paid billing period.')) {
      return;
    }

    try {
      setCancelling(true);
      await api.post(`/shops/${shopId}/subscription/cancel`);
      toast.success('Subscription cancelled. Access remains active until billing period ends.');
      await fetchSubscription();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
        <p className="mt-3 text-sm text-[var(--text-muted)]">Loading subscription & billing details...</p>
      </div>
    );
  }

  const subscription = subData?.subscription;
  const calculation = subData?.calculation;
  const pricing = subData?.pricing;
  const payments = subData?.payments || [];

  const status = calculation?.status || 'EXPIRED';
  const daysRemaining = calculation?.daysRemaining ?? 0;
  const isActive = calculation?.isActive;
  const isTrial = calculation?.isTrial;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <ShopNavTabs shopId={shopId} />

      <PageHeader
        title="Subscription & Billing"
        subtitle="Manage your shop's software license, monthly renewal, and payment ledger."
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchSubscription}
            className="flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </Button>
        }
      />

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Plan Status Overview Card */}
      <Card className="overflow-hidden border border-[var(--border)] shadow-xs">
        <div className="p-6 sm:p-8 bg-gradient-to-br from-black/[0.02] dark:from-white/[0.02] to-transparent">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Current Status
                </span>
                <Badge
                  variant={
                    status === 'ACTIVE' ? 'success'
                    : status === 'TRIAL' ? 'info'
                    : status === 'PAST_DUE' ? 'warning'
                    : 'danger'
                  }
                  className="px-2.5 py-0.5 text-xs font-bold"
                >
                  {status === 'TRIAL' ? 'Free Trial (1 Month)' : status}
                </Badge>
                {subscription?.bonusDays > 0 && (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    +{subscription.bonusDays} Bonus Days
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-tight">
                  {daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'} Remaining
                </h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  {calculation?.effectiveExpiryDate ? (
                    <>
                      Valid until{' '}
                      <span className="font-semibold text-[var(--text)]">
                        {new Date(calculation.effectiveExpiryDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </>
                  ) : (
                    'No active billing period found.'
                  )}
                </p>
              </div>

              {calculation?.reason && (
                <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg max-w-xl">
                  {calculation.reason}
                </p>
              )}
            </div>

            {/* Quick Action Box */}
            <div className="flex flex-col gap-3 min-w-[220px]">
              {status !== 'SUSPENDED' && (
                <Button
                  variant="primary"
                  size="lg"
                  loading={processingPayment}
                  onClick={handleSubscribeOrRenew}
                  className="w-full flex items-center justify-center gap-2 shadow-sm font-semibold"
                >
                  <CreditCard size={16} />
                  <span>{isTrial || !isActive ? 'Subscribe Now' : 'Renew / Extend 30 Days'}</span>
                </Button>
              )}

              {status === 'ACTIVE' && (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={cancelling}
                  onClick={handleCancelSubscription}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                >
                  Cancel auto-renewal
                </Button>
              )}

              {status === 'SUSPENDED' && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-800 dark:text-rose-300 text-xs">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <ShieldAlert size={14} /> Suspended Account
                  </div>
                  Please contact platform support to resolve outstanding issues and reactivate.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feature inclusions */}
        <div className="border-t border-[var(--border)] px-6 py-4 bg-[var(--surface-subtle)] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
            <span>Unlimited Customer Orders & Print Agent</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
            <span>In-App PDF Editor & Direct Printing</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
            <span>Web Push Notifications & Customer Chat</span>
          </div>
        </div>
      </Card>

      {/* Plan Details & Pricing */}
      <Card>
        <CardHeader className="py-4 px-6 border-b border-[var(--border)]">
          <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
            <Sparkles size={16} className="text-[#007AFF]" />
            Monthly Cloud License Details
          </h3>
        </CardHeader>
        <CardBody className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xl font-bold text-[var(--text)]">
                ₹{pricing?.monthlyAmount?.toFixed(2) || '499.00'}{' '}
                <span className="text-xs font-normal text-[var(--text-muted)]">/ month</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Billed monthly via Razorpay. Zero hidden fees. Cancel anytime without penalty.
              </p>
            </div>

            <div className="text-xs space-y-1 text-right text-[var(--text-muted)]">
              <div>Secure Payment Gateway: <span className="font-semibold text-[var(--text)]">Razorpay India</span></div>
              <div>Accepted: <span className="font-semibold text-[var(--text)]">UPI, Cards, NetBanking, Wallets</span></div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Payment History Table */}
      <Card>
        <CardHeader className="py-4 px-6 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
            <FileText size={16} />
            Subscription Payment Ledger
          </h3>
          <span className="text-xs text-[var(--text-muted)]">
            {payments.length} transaction{payments.length === 1 ? '' : 's'}
          </span>
        </CardHeader>
        <CardBody className="p-0">
          {payments.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              No subscription payments recorded yet. Trial usage is active.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)] border-b border-[var(--border)]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Date</th>
                    <th className="py-2.5 px-4 font-semibold">Reference ID</th>
                    <th className="py-2.5 px-4 font-semibold">Billing Period</th>
                    <th className="py-2.5 px-4 font-semibold">Amount</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-medium text-[var(--text)] whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                        {p.razorpayPaymentId || p.razorpayOrderId}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[var(--text)]">
                        ₹{Number(p.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={p.status === 'PAID' ? 'success' : p.status === 'CREATED' ? 'warning' : 'danger'}
                          className="text-[10px]"
                        >
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
