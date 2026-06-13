import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { api, type ChatMessageRow } from '../../services/api';
import { supabase } from '../../lib/supabase';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDay = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return formatTime(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const channelLabel = (channel: string) => channel.replace('::', ' • Room ');

export default function Channels() {
  const [allMessages, setAllMessages] = useState<ChatMessageRow[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffName, setStaffName] = useState('Staff');
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState<null | 'image' | 'audio'>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Identify staff name from auth (best-effort).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) {
        const name =
          (u.user_metadata as any)?.full_name ||
          u.email?.split('@')[0] ||
          'Staff';
        setStaffName(name);
      }
    });
  }, []);

  // Initial load + global subscribe so the channel list stays live.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(2000);
        if (error) throw new Error(error.message);
        if (!active) return;
        setAllMessages((data || []) as ChatMessageRow[]);
      } catch (e: any) {
        setError(e?.message || 'Could not load messages.');
      }
    })();
    const unsub = api.subscribeAllMessages((row) => {
      setAllMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  // Group messages by channel for the sidebar.
  const channels = useMemo(() => {
    const map = new Map<string, { channel: string; last: ChatMessageRow; count: number; unread: number }>();
    for (const m of allMessages) {
      const existing = map.get(m.channel);
      if (!existing) {
        map.set(m.channel, { channel: m.channel, last: m, count: 1, unread: m.sender === 'guest' ? 1 : 0 });
      } else {
        existing.count += 1;
        if (new Date(m.created_at) > new Date(existing.last.created_at)) existing.last = m;
        if (m.sender === 'guest') existing.unread += 1;
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime(),
    );
  }, [allMessages]);

  const thread = useMemo(
    () =>
      activeChannel
        ? allMessages
            .filter((m) => m.channel === activeChannel)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        : [],
    [allMessages, activeChannel],
  );

  // Auto-select first channel if none selected.
  useEffect(() => {
    if (!activeChannel && channels.length > 0) setActiveChannel(channels[0].channel);
  }, [channels, activeChannel]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.length, activeChannel]);

  const sendStaff = async (payload: Parameters<typeof api.sendMessage>[0]) => {
    setError(null);
    try {
      await api.sendMessage(payload);
    } catch (e: any) {
      setError(e?.message || 'Send failed.');
    }
  };

  const handleSend = async () => {
    const body = input.trim();
    if (!body || !activeChannel || sending) return;
    setSending(true);
    await sendStaff({ channel: activeChannel, sender: 'staff', senderName: staffName, body });
    setInput('');
    setSending(false);
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeChannel) return;
    setUploading('image');
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const url = await api.uploadAttachment(file, { channel: activeChannel, kind: 'image', ext });
      await sendStaff({
        channel: activeChannel,
        sender: 'staff',
        senderName: staffName,
        body: 'Photo shared',
        attachmentUrl: url,
        attachmentType: 'image',
      });
    } catch (err: any) {
      setError(err?.message || 'Upload failed.');
    } finally {
      setUploading(null);
    }
  };

  const startRecording = async () => {
    if (recording || !activeChannel) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
      ];
      const supported = candidates.find((t) =>
        typeof MediaRecorder !== 'undefined' && (MediaRecorder as any).isTypeSupported?.(t),
      );
      const mr = supported ? new MediaRecorder(stream, { mimeType: supported }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const mime = mr.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        if (blob.size === 0 || !activeChannel) return;
        setUploading('audio');
        try {
          const ext = mime.includes('mp4') ? 'm4a' : 'webm';
          const url = await api.uploadAttachment(blob, { channel: activeChannel, kind: 'audio', ext });
          await sendStaff({
            channel: activeChannel,
            sender: 'staff',
            senderName: staffName,
            body: 'Voice note',
            attachmentUrl: url,
            attachmentType: 'audio',
          });
        } catch (err: any) {
          setError(err?.message || 'Voice upload failed.');
        } finally {
          setUploading(null);
        }
      };
      recorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (err: any) {
      setError(err?.message || 'Microphone permission denied.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Channel List */}
      <aside className="w-72 border-r border-outline-variant/60 bg-surface flex flex-col">
        <div className="px-4 py-4 border-b border-outline-variant/60">
          <h1 className="text-base font-bold text-on-surface">Channels</h1>
          <p className="text-xs text-on-surface-variant">Live guest conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {channels.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-on-surface-variant">
              No active channels yet. Guests who open the SOS chat will appear here.
            </div>
          )}
          {channels.map((c) => {
            const isActive = c.channel === activeChannel;
            return (
              <button
                key={c.channel}
                onClick={() => setActiveChannel(c.channel)}
                className={`w-full text-left px-4 py-3 border-b border-outline-variant/30 transition-colors ${
                  isActive ? 'bg-primary-container/40' : 'hover:bg-surface-variant'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-on-surface truncate">
                    {channelLabel(c.channel)}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    {formatDay(c.last.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-on-surface-variant truncate max-w-[180px]">
                    {c.last.sender === 'guest' ? '' : `${c.last.sender_name || 'Staff'}: `}
                    {c.last.body || (c.last.attachment_type === 'image' ? '📷 Photo' : c.last.attachment_type === 'audio' ? '🎤 Voice' : c.last.attachment_type === 'location' ? '📍 Location' : '')}
                  </span>
                  {c.unread > 0 && c.last.sender === 'guest' && (
                    <span className="text-[10px] bg-primary text-on-primary rounded-full px-1.5 py-0.5 ml-2">
                      {c.unread}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Thread */}
      <section className="flex-1 flex flex-col bg-surface-container-low">
        {!activeChannel ? (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">
            Select a channel to view the conversation.
          </div>
        ) : (
          <>
            <div className="px-5 py-4 border-b border-outline-variant/60 bg-surface flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-on-surface">{channelLabel(activeChannel)}</h2>
                <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live channel
                </p>
              </div>
              <div className="text-xs text-on-surface-variant">
                {thread.length} message{thread.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {thread.map((msg) => {
                const mine = msg.sender !== 'guest' && msg.sender !== 'system';
                const isSystem = msg.sender === 'system';
                const align = mine ? 'items-end' : isSystem ? 'items-center' : 'items-start';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${align}`}
                  >
                    {isSystem ? (
                      <div className="bg-surface-container border border-outline-variant/60 rounded-full px-3 py-1 text-[11px] text-on-surface-variant">
                        {msg.body}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-on-surface-variant">
                          <span className="font-semibold">
                            {msg.sender === 'guest' ? msg.sender_name || 'Guest' : msg.sender_name || 'Staff'}
                          </span>
                          <span>•</span>
                          <span>{formatTime(msg.created_at)}</span>
                        </div>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                            mine
                              ? 'bg-primary text-on-primary rounded-br-md'
                              : 'bg-surface text-on-surface rounded-bl-md border border-outline-variant/60'
                          }`}
                        >
                          {msg.attachment_type === 'image' && msg.attachment_url && (
                            <a href={msg.attachment_url} target="_blank" rel="noreferrer">
                              <img
                                src={msg.attachment_url}
                                alt="attachment"
                                className="rounded-lg max-h-64 mb-1"
                              />
                            </a>
                          )}
                          {msg.attachment_type === 'audio' && msg.attachment_url && (
                            <div className="mb-1">
                              <audio
                                controls
                                preload="metadata"
                                src={msg.attachment_url}
                                className="w-full max-w-[260px] block"
                              />
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] underline opacity-70"
                              >
                                Open audio
                              </a>
                            </div>
                          )}
                          {msg.attachment_type === 'location' && msg.lat != null && msg.lng != null && (
                            <a
                              href={`https://www.google.com/maps?q=${msg.lat},${msg.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="block mb-1 text-xs underline opacity-90"
                            >
                              📍 Open in Maps ({msg.lat.toFixed(5)}, {msg.lng.toFixed(5)})
                            </a>
                          )}
                          {msg.body}
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
              {uploading && (
                <div className="text-xs text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  Uploading {uploading}…
                </div>
              )}
              <div ref={threadEndRef} />
            </div>

            {error && (
              <div className="mx-5 mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="px-5 py-3 border-t border-outline-variant/60 bg-surface">
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-surface-container border border-outline-variant/60 rounded-xl px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder={`Reply to ${channelLabel(activeChannel)}…`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={sending}
                />
                <button
                  onClick={recording ? stopRecording : startRecording}
                  className={`px-3 rounded-xl border transition-colors ${
                    recording
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-surface-container text-on-surface-variant border-outline-variant/60 hover:bg-surface-variant'
                  }`}
                  title={recording ? 'Stop recording' : 'Record voice note'}
                >
                  <span className="material-symbols-outlined">
                    {recording ? 'stop_circle' : 'mic'}
                  </span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 rounded-xl border bg-surface-container text-on-surface-variant border-outline-variant/60 hover:bg-surface-variant"
                  title="Attach photo"
                >
                  <span className="material-symbols-outlined">photo_camera</span>
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="bg-primary disabled:bg-primary/40 text-on-primary px-4 rounded-xl hover:opacity-90 transition-opacity active:scale-95"
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelected}
                />
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
