import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, PhoneCall, Bell, BellRing, Check, Lock,
  AlertCircle, Phone, ArrowUpRight, CheckCheck, Loader2, X
} from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Badge } from '../ui';
import api from '../../lib/api';
import { subscribeToCustomerOrder, playNotificationSound } from '../../lib/socket';
import { isPushSupported, subscribeToPushNotifications, registerServiceWorker } from '../../lib/pushClient';
import toast from 'react-hot-toast';

export default function CustomerOrderChat({ orderNumber, shopName, shopPhone, orderStatus }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatCloseMessage, setChatCloseMessage] = useState(null);

  // Web Push state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const [pushDismissed, setPushDismissed] = useState(false);
  // Track if there's an unread call request (shown prominently)
  const [urgentCallRequest, setUrgentCallRequest] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChat = async () => {
    if (!orderNumber) return;
    try {
      const { data } = await api.get(`/customer/orders/${orderNumber}/chat`);
      if (data?.data) {
        const msgs = data.data.messages || [];
        setMessages(msgs);
        setIsChatOpen(Boolean(data.data.isChatOpen));
        setChatCloseMessage(data.data.chatCloseMessage);
        // Find the most recent unread call request from shop
        const latestCall = [...msgs].reverse().find(
          m => m.type === 'CALL_REQUEST' && m.senderType === 'SHOP' && !m.readAt
        );
        if (latestCall) setUrgentCallRequest(latestCall);
      }
    } catch (err) {
      console.error('Failed to load customer chat:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChat();
  }, [orderNumber]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-register SW and silently resubscribe if permission already granted
  useEffect(() => {
    if (!orderNumber || !isPushSupported()) return;

    const permission = typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default';

    if (permission === 'granted') {
      setPushEnabled(true);
      // Silently re-register subscription so it stays alive (order-linked)
      subscribeToPushNotifications(orderNumber, { silent: true }).catch(() => {});
    } else {
      // Still register the SW so it's ready when permission is granted
      registerServiceWorker().catch(() => {});
    }

    const dismissed = localStorage.getItem(`smartprint_push_dismissed_${orderNumber}`);
    if (dismissed) setPushDismissed(true);
  }, [orderNumber]);

  // Real-time socket subscription
  useEffect(() => {
    if (!orderNumber) return;

    const cleanup = subscribeToCustomerOrder(
      { orderNumber },
      {
        onNewMessage: (payload) => {
          if (payload?.message) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.message.id)) return prev;
              return [...prev, payload.message];
            });

            if (payload.message.senderType === 'SHOP') {
              playNotificationSound();
              if (payload.message.type === 'CALL_REQUEST') {
                // Show prominent sticky urgent banner
                setUrgentCallRequest(payload.message);
                toast.error(`📞 ${shopName || 'The shop'} is requesting you to call them urgently!`, {
                  duration: 12000,
                  id: 'call-request-toast',
                });
                // Also trigger native OS/browser notification if backgrounded
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  try {
                    new Notification(`📞 Call Requested by ${shopName || 'Print Shop'}!`, {
                      body: payload.message.body || 'Please call the print shop urgently regarding your order.',
                      icon: '/favicon.ico',
                      tag: `smartprint-call-${orderNumber}`,
                      requireInteraction: true,
                    });
                  } catch (_) {}
                }
              } else {
                toast(`New message from ${shopName || 'the print shop'}`, { icon: '💬' });
              }
            }
          }
        },
      }
    );

    return cleanup;
  }, [orderNumber, shopName]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const clean = textInput.trim();
    if (!clean || sending || !isChatOpen) return;

    try {
      setSending(true);
      const { data } = await api.post(`/customer/orders/${orderNumber}/chat`, {
        body: clean,
      });

      if (data?.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.data.id)) return prev;
          return [...prev, data.data];
        });
        setTextInput('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleEnablePush = async () => {
    try {
      setEnablingPush(true);
      await subscribeToPushNotifications(orderNumber);
      setPushEnabled(true);
      toast.success('Phone notifications enabled! You will be alerted even after closing this tab.', { icon: '🔔' });
    } catch (err) {
      console.warn('Push registration error:', err);
      toast.error(err.message || 'Could not enable push notifications.');
    } finally {
      setEnablingPush(false);
    }
  };

  const handleDismissPushBanner = () => {
    setPushDismissed(true);
    localStorage.setItem(`smartprint_push_dismissed_${orderNumber}`, 'true');
  };

  return (
    <Card className="flex flex-col h-[520px] overflow-hidden border border-[var(--border)]">
      {/* Header */}
      <CardHeader className="py-3 px-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center shrink-0">
            <MessageSquare size={16} strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-semibold text-xs sm:text-sm text-[var(--text)] flex items-center gap-2">
              Chat with {shopName || 'Shop'}
              {isChatOpen ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-muted)] bg-black/[0.05] dark:bg-white/[0.05] px-2 py-0.5 rounded-full">
                  <Lock size={10} /> Closed
                </span>
              )}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Ask quick questions or clarify file requirements directly with the owner
            </p>
          </div>
        </div>
      </CardHeader>

      {/* Web Push Permission Banner (Prominent Callout) */}
      {!pushEnabled && !pushDismissed && isPushSupported() && isChatOpen && (
        <div className="bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-blue-500/15 border-b border-blue-500/25 px-4 py-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#007AFF]/15 text-[#007AFF] flex items-center justify-center shrink-0">
              <BellRing size={16} className="animate-wiggle" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--text)]">Enable Phone Notifications</p>
              <p className="text-[11px] text-[var(--text-muted)] truncate">
                Get alerted on your phone notification bar if the shop has questions or urgently requests a call.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="primary"
              size="sm"
              loading={enablingPush}
              onClick={handleEnablePush}
              className="text-xs py-1.5 px-3 rounded-lg font-semibold shadow-xs"
            >
              Allow Alerts
            </Button>
            <button
              type="button"
              onClick={handleDismissPushBanner}
              className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 text-xs"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Urgent Call Request Sticky Alert Banner */}
      {urgentCallRequest && (
        <div className="bg-gradient-to-r from-amber-500/25 via-rose-500/15 to-amber-500/25 border-b-2 border-amber-500/40 px-4 py-3 flex items-center justify-between gap-3 text-xs animate-pulse">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <PhoneCall size={16} strokeWidth={2.5} className="animate-bounce" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wide">
                Urgent Call Requested by Shop
              </p>
              <p className="text-[11px] text-amber-900/90 dark:text-amber-100 truncate">
                {urgentCallRequest.body || 'The shop needs to talk with you regarding your print file.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(urgentCallRequest.shopPhone || shopPhone) && (
              <a
                href={`tel:${urgentCallRequest.shopPhone || shopPhone}`}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Phone size={12} strokeWidth={2.2} />
                <span>Call Shop: {urgentCallRequest.shopPhone || shopPhone}</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setUrgentCallRequest(null)}
              className="text-amber-900/60 dark:text-amber-300 hover:text-amber-900 p-1"
              title="Acknowledge"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Messages Stream */}
      <CardBody className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--surface-hover)]">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-2">
            <Loader2 className="animate-spin text-[#007AFF]" size={24} />
            <span className="text-xs">Loading chat history...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)]">
            <div className="w-12 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] flex items-center justify-center mb-2">
              <MessageSquare size={22} className="opacity-50" />
            </div>
            <p className="text-xs font-semibold text-[var(--text)]">Direct Chat with {shopName || 'the Print Shop'}</p>
            <p className="text-[11px] mt-1 max-w-xs">
              Need special paper, binding, or have a question about your print? Send a quick message here.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isCustomer = m.senderType === 'CUSTOMER';
            const isCallReq = m.type === 'CALL_REQUEST';

            // Part 2: Prominent Distinct Urgent Banner for Call Request
            if (isCallReq) {
              const telNumber = m.shopPhone || shopPhone;
              return (
                <div key={m.id} className="flex justify-center my-2">
                  <div className="w-full max-w-md bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 shadow-sm animate-scaleIn">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                        <PhoneCall size={20} strokeWidth={2.2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                            Shop Requesting Call
                          </span>
                          <span className="text-[10px] text-amber-800/70 dark:text-amber-400">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-amber-950 dark:text-amber-100 mt-1 font-medium">
                          {m.body || 'The shop owner wants to quickly talk to you regarding your document.'}
                        </p>

                        {telNumber && (
                          <div className="mt-3 flex items-center gap-2">
                            <a
                              href={`tel:${telNumber}`}
                              className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs"
                            >
                              <Phone size={13} strokeWidth={2.2} />
                              <span>Call Shop: {telNumber}</span>
                              <ArrowUpRight size={13} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                    {isCustomer ? 'You' : (m.senderName || shopName || 'Shop')}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] opacity-60">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-xs ${
                    isCustomer
                      ? 'bg-[#007AFF] text-white rounded-tr-xs'
                      : 'bg-white dark:bg-slate-800 text-[var(--text)] border border-[var(--border)] rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>

                <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-[var(--text-muted)]">
                  {isCustomer && (
                    m.readAt ? (
                      <span className="flex items-center gap-0.5 text-blue-500 font-medium">
                        <CheckCheck size={12} /> Seen by shop
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[var(--text-muted)]">
                        <Check size={12} /> Delivered
                      </span>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </CardBody>

      {/* Input or Closed Notice */}
      <div className="p-3 bg-[var(--surface-card)] border-t border-[var(--border)]">
        {isChatOpen ? (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your message to the shop..."
              className="flex-1 bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text)] outline-hidden focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-all"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={sending}
              disabled={!textInput.trim() || sending}
              className="rounded-xl px-3 py-2 shrink-0"
            >
              <Send size={13} strokeWidth={2} />
            </Button>
          </form>
        ) : (
          <div className="flex items-center justify-center gap-2 py-1 text-xs text-[var(--text-muted)]">
            <Lock size={12} />
            <span>{chatCloseMessage || 'This chat has closed because the printing window ended.'}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
