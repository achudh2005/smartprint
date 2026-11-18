import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, PhoneCall, AlertTriangle, Clock, Check,
  CheckCheck, Lock, AlertCircle, RefreshCw, Loader2, Phone
} from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Badge } from '../ui';
import api from '../../lib/api';
import { getSocket, playNotificationSound } from '../../lib/socket';
import toast from 'react-hot-toast';

export default function OrderChatPanel({ shopId, orderId, orderNumber }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatCloseMessage, setChatCloseMessage] = useState(null);

  // "Request a Call" escalation state
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callReason, setCallReason] = useState('');
  const [sendingCallRequest, setSendingCallRequest] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const messagesEndRef = useRef(null);
  const cooldownTimerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChat = async () => {
    if (!orderId) return;
    try {
      const { data } = await api.get(`/shops/${shopId}/orders/${orderId}/chat`);
      if (data?.data) {
        setMessages(data.data.messages || []);
        setIsChatOpen(Boolean(data.data.isChatOpen));
        setChatCloseMessage(data.data.chatCloseMessage);
        if (typeof data.data.callCooldownRemaining === 'number') {
          setCooldownRemaining(data.data.callCooldownRemaining);
        }
      }
    } catch (err) {
      console.error('Failed to load chat:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChat();
  }, [shopId, orderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time socket listener
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (payload) => {
      if (payload && (payload.orderId === Number(orderId) || payload.orderNumber === orderNumber)) {
        setMessages((prev) => {
          // Avoid duplicate insertion
          if (prev.some((m) => m.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });

        if (payload.message.senderType === 'CUSTOMER') {
          playNotificationSound();
          toast(`New message from customer on Order #${orderNumber}`, { icon: '💬' });
        }
      }
    };

    socket.on('chat:new-message', handleNewMessage);
    return () => {
      socket.off('chat:new-message', handleNewMessage);
    };
  }, [orderId, orderNumber]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(cooldownTimerRef.current);
  }, [cooldownRemaining]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const clean = textInput.trim();
    if (!clean || sending || !isChatOpen) return;

    try {
      setSending(true);
      const { data } = await api.post(`/shops/${shopId}/orders/${orderId}/chat`, {
        body: clean,
        type: 'TEXT',
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

  const handleSendCallRequest = async () => {
    if (sendingCallRequest || cooldownRemaining > 0 || !isChatOpen) return;

    // Use current text input as call reason if provided, or clear default prompt
    const reasonText = textInput.trim() || 'Urgent: Please call the print shop regarding your order instructions.';

    try {
      setSendingCallRequest(true);
      const { data } = await api.post(`/shops/${shopId}/orders/${orderId}/chat`, {
        body: reasonText,
        type: 'CALL_REQUEST',
        urgent: true,
      });

      if (data?.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.data.id)) return prev;
          return [...prev, data.data];
        });
        setTextInput('');
        toast.success('Urgent Call Request sent to customer phone!', { icon: '📞', duration: 5000 });
        setCooldownRemaining(30); // 30s rate limit cooldown
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setCooldownRemaining(30);
      }
      toast.error(err.response?.data?.message || 'Failed to send call request.');
    } finally {
      setSendingCallRequest(false);
    }
  };

  return (
    <Card className="flex flex-col h-[520px] overflow-hidden">
      {/* Header */}
      <CardHeader className="py-3 px-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-subtle)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
            <MessageSquare size={16} strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-semibold text-xs sm:text-sm text-[var(--text)] flex items-center gap-2">
              Order Chat
              {isChatOpen ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-muted)] bg-black/[0.05] dark:bg-white/[0.05] px-2 py-0.5 rounded-full">
                  <Lock size={10} /> Closed
                </span>
              )}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Direct two-way messages with customer for Order #{orderNumber}
            </p>
          </div>
        </div>

        {/* Request Call Trigger */}
        <div className="flex items-center gap-2">
          {isChatOpen && (
            <Button
              variant="secondary"
              size="sm"
              loading={sendingCallRequest}
              disabled={cooldownRemaining > 0 || sendingCallRequest}
              onClick={handleSendCallRequest}
              className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/20 active:scale-95 text-xs flex items-center gap-1.5 transition-all shadow-xs"
              title="Click to immediately dispatch an urgent Call Request to customer's phone notification bar"
            >
              <PhoneCall size={13} strokeWidth={2.2} />
              <span>{cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : 'Request Call'}</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchChat}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)]"
            title="Refresh chat"
          >
            <RefreshCw size={13} />
          </Button>
        </div>
      </CardHeader>

      {/* Messages Stream */}
      <CardBody className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--surface-hover)]">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-2">
            <Loader2 className="animate-spin text-[#007AFF]" size={24} />
            <span className="text-xs">Loading order messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)]">
            <div className="w-12 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] flex items-center justify-center mb-2">
              <MessageSquare size={22} className="opacity-50" />
            </div>
            <p className="text-xs font-semibold text-[var(--text)]">No messages yet</p>
            <p className="text-[11px] mt-1 max-w-xs">
              Ask the customer a question about their print file, resolution, or instructions.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isShop = m.senderType === 'SHOP';
            const isCallReq = m.type === 'CALL_REQUEST';

            if (isCallReq) {
              return (
                <div key={m.id} className="flex justify-center my-2">
                  <div className="w-full max-w-md bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                        <PhoneCall size={16} strokeWidth={2.2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                            Call Request Sent
                          </span>
                          <span className="text-[10px] text-amber-800/70 dark:text-amber-400">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-amber-950 dark:text-amber-100 mt-1">
                          {m.body}
                        </p>
                        {m.shopPhone && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono text-amber-800 dark:text-amber-300">
                            <Phone size={11} /> Shop Phone: {m.shopPhone}
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
                className={`flex flex-col ${isShop ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                    {isShop ? (m.senderName || 'Shop Staff') : 'Customer'}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] opacity-60">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-xs ${
                    isShop
                      ? 'bg-[#007AFF] text-white rounded-tr-xs'
                      : 'bg-white dark:bg-slate-800 text-[var(--text)] border border-[var(--border)] rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>

                <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-[var(--text-muted)]">
                  {isShop && (
                    m.readAt ? (
                      <span className="flex items-center gap-0.5 text-blue-500 font-medium">
                        <CheckCheck size={12} /> Read
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[var(--text-muted)]">
                        <Check size={12} /> Sent
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
              placeholder="Type a message to the customer..."
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
            <span>{chatCloseMessage || 'This chat has closed because the order reached terminal state.'}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
