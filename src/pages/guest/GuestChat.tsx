import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { chatMessages } from '../../data/mockData';

export default function GuestChat() {
  const [messages, setMessages] = useState(chatMessages);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate staff typing after guest sends message
  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg = {
      id: `m${messages.length + 1}`,
      sender: 'guest',
      name: 'You',
      message: input.trim(),
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      type: 'guest' as const,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');

    // Simulate staff response
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `m${prev.length + 1}`,
          sender: 'staff',
          name: 'Maria Santos',
          message: 'Understood. Security Unit 12 is now on your floor. Please stay in your room with the door closed. We will knock and identify ourselves.',
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          type: 'staff' as const,
        },
      ]);
    }, 2500);
  };

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/guest/sos" className="text-blue-300">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-sm font-bold">Emergency Channel</h2>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Staff connected • Room 1402
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full">
          <span className="material-symbols-outlined text-sm">timer</span>
          ETA: 1:45
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${msg.type === 'guest' ? 'items-end' : msg.type === 'system' ? 'items-center' : 'items-start'}`}
          >
            {msg.type === 'system' ? (
              <div className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-blue-300/70 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">info</span>
                {msg.message}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-blue-300/40">
                  {msg.type === 'staff' && (
                    <>
                      <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[8px] text-white">person</span>
                      </span>
                      <span className="font-semibold text-blue-300/60">{msg.name}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{msg.time}</span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.type === 'guest'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-white/10 text-white rounded-bl-md'
                  }`}
                >
                  {msg.message}
                </div>
              </>
            )}
          </motion.div>
        ))}

        {typing && (
          <div className="flex items-center gap-2 text-sm text-blue-300/50">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400/50 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-400/50 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-400/50 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            Staff is typing...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            className="bg-blue-600 text-white px-4 rounded-xl hover:bg-blue-500 transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
        <div className="flex justify-center gap-4 mt-2">
          <button className="text-xs text-blue-300/40 flex items-center gap-1 hover:text-blue-300/70">
            <span className="material-symbols-outlined text-sm">mic</span> Voice
          </button>
          <button className="text-xs text-blue-300/40 flex items-center gap-1 hover:text-blue-300/70">
            <span className="material-symbols-outlined text-sm">photo_camera</span> Photo
          </button>
          <button className="text-xs text-blue-300/40 flex items-center gap-1 hover:text-blue-300/70">
            <span className="material-symbols-outlined text-sm">my_location</span> Location
          </button>
        </div>
      </div>
    </div>
  );
}
