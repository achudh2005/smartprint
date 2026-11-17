import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, PhoneCall, Bell, Check, Lock,
  AlertCircle, Phone, ArrowUpRight, CheckCheck, Loader2
} from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Badge } from '../ui';
import api from '../../lib/api';
import { subscribeToCustomerOrder, playNotificationSound } from '../../lib/socket';
import { isPushSupported, subscribeToPushNotifications } from '../../lib/pushClient';
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

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChat = async () => {
    if (!orderNumber) return;
    try {
      const { data } = await api.get(`/customer/orders/${orderNumber}/chat`);
      if (data?.data) {
        setMessages(data.data.messages || []);
        setIsChatOpen(Boolean(data.data.isChatOpen));
        setChatCloseMessage(data.data.chatCloseMessage);
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

  // Check initial push permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setPushEnabled(true);
      }
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
                toast.error('The shop has requested you to call them regarding your order!', { duration: 6000 });
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
      toast.success('Phone notifications enabled! You will be alerted if the shop messages you.', { icon: '🔔' });
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

      {/* Web Push Permission Banner (Honest Context Before Native Prompt) */}
      {!pushEnabled && !pushDismissed && isPushSupported() && isChatOpen && (
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Bell size={15} className="text-[#007AFF] shrink-0" />
            <p className="text-[11px] text-[var(--text)] truncate">
              Get notified on your phone bar if the shop has a question about your file.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="primary"
              size="sm"
              loading={enablingPush}
              onClick={handleEnablePush}
              className="text-[11px] py-1 px-2.5 rounded-lg"
            >
              Notify Me
            </Button>
            <button
              type="button"
              onClick={handleDismissPushBanner}
              className="text-[var(--text-muted)] hover:text-[var(--text)] px-1.5 py-1 text-xs"
              title="Dismiss"
            >
              ✕
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
