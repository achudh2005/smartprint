import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock, AlertTriangle, ShieldAlert, Sparkles, ArrowRight, CreditCard } from 'lucide-react';
import api from '../../lib/api';
import clsx from 'clsx';

export default function SubscriptionBanner() {
  const { shopId } = useParams();
  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shopId) return;

    let isMounted = true;
    api.get(`/shops/${shopId}/subscription`)
      .then(({ data }) => {
        if (isMounted && data?.data) {
          setSubData(data.data);
        }
      })
      .catch((err) => {
        // Silently ignore if not shop route or unauthorized
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [shopId]);

  if (!shopId || !subData || loading) return null;

  const { subscription, calculation } = subData;
  const { status, daysRemaining, isTrial, isActive } = calculation;

  // Escalation styles based on urgency
  let containerClass = 'bg-blue-500/10 border-blue-500/25 text-blue-800 dark:text-blue-300';
  let badgeClass = 'bg-blue-500/20 text-blue-900 dark:text-blue-200 border-blue-500/30';
  let Icon = Sparkles;
  let headline = '';
  let actionText = 'Upgrade Plan';

  if (status === 'SUSPENDED') {
    containerClass = 'bg-rose-500/15 border-rose-500/30 text-rose-900 dark:text-rose-200';
    badgeClass = 'bg-rose-500/25 text-rose-900 dark:text-rose-100 border-rose-500/40';
    Icon = ShieldAlert;
    headline = 'Shop Subscription Suspended: Operational access is paused by administration.';
    actionText = 'View Details';
  } else if (!isActive || status === 'EXPIRED') {
    containerClass = 'bg-rose-500/15 border-rose-500/30 text-rose-900 dark:text-rose-200';
    badgeClass = 'bg-rose-500/25 text-rose-900 dark:text-rose-100 border-rose-500/40';
    Icon = AlertTriangle;
    headline = isTrial
      ? 'Your free trial has ended. Subscribe now to continue printing.'
      : 'Your monthly subscription has expired. Renew now to restore access.';
    actionText = 'Subscribe Now';
  } else if (status === 'PAST_DUE' || daysRemaining <= 3) {
    containerClass = 'bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200';
    badgeClass = 'bg-amber-500/25 text-amber-900 dark:text-amber-100 border-amber-500/40';
    Icon = Clock;
    headline = isTrial
      ? `Urgent: Only ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left in your free trial!`
      : `Payment Due: Only ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining in your plan.`;
    actionText = 'Renew Now';
  } else if (daysRemaining <= 7) {
    containerClass = 'bg-sky-500/10 border-sky-500/25 text-sky-900 dark:text-sky-200';
    badgeClass = 'bg-sky-500/20 text-sky-900 dark:text-sky-100 border-sky-500/30';
    Icon = Clock;
    headline = isTrial
      ? `${daysRemaining} days left in your free trial.`
      : `${daysRemaining} days remaining in your monthly billing cycle.`;
    actionText = 'Manage Subscription';
  } else {
    // Normal / Healthy trial or plan (>7 days)
    containerClass = 'bg-black/[0.03] dark:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-[var(--text)]';
    badgeClass = 'bg-black/[0.06] dark:bg-white/[0.08] text-[var(--text-muted)] border-black/[0.1] dark:border-white/[0.1]';
    Icon = Sparkles;
    headline = isTrial
      ? `${daysRemaining} days left in your 1-month free trial.`
      : `${daysRemaining} days left in your active plan.`;
    actionText = 'Billing & Plan';
  }

  return (
    <div className={clsx('w-full border-b px-4 py-2.5 transition-colors duration-150', containerClass)}>
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-2xs', badgeClass)}>
            <Icon size={11} strokeWidth={2.5} />
            {isTrial ? 'Trial Period' : status}
          </span>
          <span className="font-medium">{headline}</span>
        </div>

        <Link
          to={`/shops/${shopId}/billing`}
          className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-2 hover:opacity-85 transition-opacity"
        >
          <CreditCard size={12} strokeWidth={2} />
          <span>{actionText}</span>
          <ArrowRight size={11} strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  );
}
