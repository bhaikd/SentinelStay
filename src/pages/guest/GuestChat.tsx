import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, type ChatMessageRow } from '../../services/api';

// Pinned demo guest context — matches SOSPortal.tsx. In a multi-room build this
// would come from the guest's session / room key.
const ROOM = '1402';
const FLOOR = 14;
const BUILDING = 'Tower A';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function GuestChat() {
  const channel = api.channelKey(BUILDING, ROOM);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState<null | 'image' | 'audio' | 'location'>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initial fetch + realtime subscribe
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await api.fetchMessages(channel);
        if (!active) return;
        if (rows.length === 0) {
          setMessages([
            {
              id: 'sys-welcome',
              channel,
              sender: 'system',
              sender_name: 'SentinelStay',
              body: "You're connected to staff. Send a message, share your location, attach a photo, or record a voice note.",
              attachment_url: null,
              attachment_type: null,
              lat: null,
              lng: null,
              created_at: new Date().toISOString(),
            },
          ]);
        } else {
          setMessages(rows);
        }
      } catch (e: any) {
        setError(e?.message || 'Could not load chat history.');
      }
    })();
    const unsub = api.subscribeMessages(channel, (row) => {
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    });
    return () => {
      active = false;
      unsub();
    };
  }, [channel]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (payload: Parameters<typeof api.sendMessage>[0]) => {
    setError(null);
    try {
      await api.sendMessage(payload);
    } catch (e: any) {
      setError(e?.message || 'Failed to send.');
    }
  };

  const handleSend = async () => {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    await send({ channel, sender: 'guest', senderName: `Room ${ROOM}`, body });
    setInput('');
    setSending(false);
  };

  const handleLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser.');
      return;
    }
    setUploading('location');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        await send({
          channel,
          sender: 'guest',
          senderName: `Room ${ROOM}`,
          body: `Live location shared (±${Math.round(accuracy)}m) — Room ${ROOM}, Floor ${FLOOR}, ${BUILDING}`,
          attachmentType: 'location',
          lat: latitude,
          lng: longitude,
        });
        setUploading(null);
      },
      (err) => {
        setUploading(null);
        setError(`Location error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handlePhotoPick = () => fileInputRef.current?.click();

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading('image');
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const url = await api.uploadAttachment(file, { channel, kind: 'image', ext });
      await send({
        channel,
        sender: 'guest',
        senderName: `Room ${ROOM}`,
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
    if (recording) return;
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
        if (blob.size === 0) return;
        setUploading('audio');
        try {
          const ext = mime.includes('mp4') ? 'm4a' : 'webm';
          const url = await api.uploadAttachment(blob, { channel, kind: 'audio', ext });
          await send({
            channel,
            sender: 'guest',
            senderName: `Room ${ROOM}`,
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
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/guest/sos" className="text-blue-300">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-sm font-bold">Emergency Channel</h2>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Staff connected • Room {ROOM}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full">
          <span className="material-symbols-outlined text-sm">router</span>
          Live
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isGuest = msg.sender === 'guest';
          const isSystem = msg.sender === 'system';
          const align = isGuest ? 'items-end' : isSystem ? 'items-center' : 'items-start';
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${align}`}
            >
              {isSystem ? (
                <div className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-blue-300/70 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">info</span>
                  {msg.body}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-blue-300/40">
                    {!isGuest && (
                      <>
                        <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[8px] text-white">person</span>
                        </span>
                        <span className="font-semibold text-blue-300/60">{msg.sender_name || 'Staff'}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{formatTime(msg.created_at)}</span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isGuest
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white/10 text-white rounded-bl-md'
                    }`}
                  >
                    {msg.attachment_type === 'image' && msg.attachment_url && (
                      <a href={msg.attachment_url} target="_blank" rel="noreferrer">
                        <img
                          src={msg.attachment_url}
                          alt="attachment"
                          className="rounded-lg max-h-64 mb-1 border border-white/10"
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
                          className="text-[11px] underline opacity-80"
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
                        Open in Maps ({msg.lat.toFixed(5)}, {msg.lng.toFixed(5)})
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
          <div className="text-xs text-blue-300/60 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            Uploading {uploading}…
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {error && (
        <div className="mx-4 mb-2 text-xs text-red-300 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="bg-blue-600 disabled:bg-blue-600/40 text-white px-4 rounded-xl hover:bg-blue-500 transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoSelected}
        />
        <div className="flex justify-center gap-4 mt-2">
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`text-xs flex items-center gap-1 transition-colors ${
              recording ? 'text-red-400' : 'text-blue-300/40 hover:text-blue-300/70'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {recording ? 'stop_circle' : 'mic'}
            </span>
            {recording ? 'Stop' : 'Voice'}
          </button>
          <button
            onClick={handlePhotoPick}
            className="text-xs text-blue-300/40 flex items-center gap-1 hover:text-blue-300/70 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">photo_camera</span> Photo
          </button>
          <button
            onClick={handleLocation}
            className="text-xs text-blue-300/40 flex items-center gap-1 hover:text-blue-300/70 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">my_location</span> Location
          </button>
        </div>
      </div>
    </div>
  );
}
