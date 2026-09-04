import React, { useState, useEffect, useRef } from 'react';
import InitialAvatar from './InitialAvatar';
import { useLanguage } from '../context/LanguageContext';
import { MessageSquare, Send, Plus, Users, Hash, Gamepad2, Smile, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { UserState } from '../types/gamenet';
import { L } from '../utils/i18n';

interface Message {
  id: string;
  room: string;
  username: string;
  message: string;
  timestamp: string;
}

interface Props {
  user: UserState;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  onOpenAuth: () => void;
}

export default function ChatTab({ user, addNotification, onOpenAuth }: Props) {
  const { language, dir, t } = useLanguage();
  const [rooms, setRooms] = useState<string[]>([]);
  const [activeRoom, setActiveRoom] = useState<string>('عمومی (General)');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [newRoomName, setNewRoomName] = useState<string>('');
  const [showAddRoom, setShowAddRoom] = useState<boolean>(false);
  
  // Connection states
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(true);

  // Refs
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pollingIntervalRef = useRef<any>(null);

  // Quick emojis
  const quickEmojis = ['🎮', '🔥', '👑', '🎯', '🚀', '😱', '👍', '😂', 'GG'];

  // Fetch Rooms
  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/chat/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (err) {
      console.error("Error fetching rooms:", err);
    }
  };

  // Fetch Messages for active room
  const fetchMessages = async (roomName: string) => {
    try {
      const res = await fetch(`/api/chat/messages/${encodeURIComponent(roomName)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  // Scroll to bottom helper
  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial Fetch of Rooms
  useEffect(() => {
    fetchRooms();
  }, []);

  // Sync Messages when room changes
  useEffect(() => {
    fetchMessages(activeRoom);
    // On mobile, close sidebar after selecting room
    if (window.innerWidth < 1024) {
      setIsMobileSidebarOpen(false);
    }
  }, [activeRoom]);

  // Setup WebSocket & HTTP Fallback
  useEffect(() => {
    const connectWebSocket = () => {
      if (socketRef.current) {
        socketRef.current.close();
      }

      setWsStatus('connecting');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/chat/ws`;
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setWsStatus('connected');
        console.log("[WebSocket] Connected successfully.");
        // Clear HTTP polling if active
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === 'message') {
            const newMsg: Message = payload.data;
            // Only push if message matches active room
            if (newMsg.room === activeRoom) {
              setMessages((prev) => {
                // Ensure idempotency (no duplicate messages)
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            } else {
              // Optionally trigger a silent notification or indicator for other rooms
            }
          }
        } catch (err) {
          console.error("Error reading socket payload:", err);
        }
      };

      socket.onclose = () => {
        setWsStatus('disconnected');
        console.log("[WebSocket] Connection closed. Falling back to HTTP polling...");
        
        // Setup backup polling (every 3 seconds)
        if (!pollingIntervalRef.current) {
          pollingIntervalRef.current = setInterval(() => {
            fetchMessages(activeRoom);
          }, 3000);
        }

        // Retry WS connection in 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };

      socket.onerror = (err) => {
        console.error("[WebSocket] Error occurred:", err);
        socket.close();
      };
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [activeRoom]);

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    if (user.username === 'Guest') {
      addNotification(
        L(language, { fa: 'برای ارسال پیام در چت‌روم ابتدا باید وارد حساب خود شوید.', en: 'Please login/register to send chat messages.', ru: 'Чтобы писать в чат, сначала войдите в аккаунт.', tr: 'Sohbette mesaj göndermek için önce giriş yapmalısınız.' }),
        'info'
      );
      onOpenAuth();
      return;
    }

    const payload = {
      room: activeRoom,
      username: user.username,
      message: inputMessage.trim()
    };

    // Optimistic UI Update
    const tempId = "temp-" + Date.now();
    const tempMsg: Message = {
      id: tempId,
      room: activeRoom,
      username: user.username,
      message: inputMessage.trim(),
      timestamp: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
    };
    setMessages((prev) => [...prev, tempMsg]);
    setInputMessage('');

    // Try sending over WS if connected
    let sentOverWS = false;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({
          event: 'message',
          data: payload
        }));
        sentOverWS = true;
      } catch (err) {
        console.error("WS send failed, retrying via REST API", err);
      }
    }

    // Always hit the REST API to save to server state or fallback
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        // Replace temp message with server message, preventing duplication with WebSocket broadcast
        setMessages((prev) => {
          if (prev.some(m => m.id === data.message.id)) {
            return prev.filter(m => m.id !== tempId);
          }
          return prev.map(m => m.id === tempId ? data.message : m);
        });
      } else {
        throw new Error();
      }
    } catch (err) {
      // Rollback optimistic update on error
      setMessages((prev) => prev.filter(m => m.id !== tempId));
      addNotification(
        L(language, { fa: 'ارسال پیام با خطا مواجه شد.', en: 'Failed to send message.', ru: 'Не удалось отправить сообщение.', tr: 'Mesaj gönderilemedi.' }),
        'error'
      );
    }
  };

  // Handle Add Room
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    if (user.username === 'Guest') {
      addNotification(
        L(language, { fa: 'تنها گیمرهای عضو قادر به ساخت اتاق گفتگو هستند.', en: 'Only registered users can create new rooms.', ru: 'Создавать комнаты могут только зарегистрированные игроки.', tr: 'Yalnızca kayıtlı oyuncular yeni oda oluşturabilir.' }),
        'info'
      );
      onOpenAuth();
      return;
    }

    try {
      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setRooms(data.chatRooms);
        setActiveRoom(newRoomName.trim());
        setNewRoomName('');
        setShowAddRoom(false);
        addNotification(
          L(language, { fa: `اتاق جدید "${newRoomName}" با موفقیت ایجاد شد.`, en: `Room "${newRoomName}" created successfully.`, ru: `Комната "${newRoomName}" успешно создана.`, tr: `"${newRoomName}" odası başarıyla oluşturuldu.` }),
          'success'
        );
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      addNotification(err.message || 'خطا در ساخت اتاق.', 'error');
    }
  };

  return (
    <div className="bg-card-3 border border-white/10 rounded-3xl overflow-hidden min-h-[600px] flex flex-col lg:flex-row h-[calc(100vh-220px)]" dir={dir}>
      
      {/* Side list of rooms */}
      <div className={`w-full lg:w-80 border-r lg:border-r-0 lg:border-l border-white/10 flex flex-col shrink-0 ${isMobileSidebarOpen ? 'flex' : 'hidden lg:flex'}`}>
        {/* Sidebar Header */}
        <div className="p-4 bg-black/20 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            <span className="font-black text-xs text-white uppercase tracking-wider">
              {L(language, { fa: 'اتاق‌های گفتگوی بازی', en: 'Game Chat Rooms', ru: 'Игровые чат-комнаты', tr: 'Oyun Sohbet Odaları' })}
            </span>
          </div>
          <button 
            onClick={() => setShowAddRoom(!showAddRoom)}
            className="p-1.5 rounded-lg bg-primary text-black hover:bg-primary-hover transition-all cursor-pointer"
            title={L(language, { fa: 'ساخت اتاق جدید', en: 'Create Room', ru: 'Создать комнату', tr: 'Yeni Oda Oluştur' })}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Add Room Inline Form */}
        {showAddRoom && (
          <form onSubmit={handleAddRoom} className="p-3 bg-black/40 border-b border-white/10 flex gap-2 animate-fade-in">
            <input 
              type="text"
              required
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder={L(language, { fa: 'نام اتاق جدید...', en: 'Room name...', ru: 'Название комнаты...', tr: 'Oda adı...' })}
              className="flex-grow px-3 py-1.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary font-bold"
            />
            <button 
              type="submit"
              className="bg-primary text-black px-3 py-1.5 rounded-xl text-xs font-black hover:bg-primary-hover transition-all cursor-pointer shrink-0"
            >
              {L(language, { fa: 'ثبت', en: 'Add', ru: 'Добавить', tr: 'Ekle' })}
            </button>
          </form>
        )}

        {/* Rooms Scroll Area */}
        <div className="flex-grow overflow-y-auto p-3 space-y-1 scrollbar-none">
          {rooms.map((room) => (
            <button
              key={room}
              onClick={() => setActiveRoom(room)}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                activeRoom === room
                  ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(255,184,0,0.15)] font-black'
                  : 'bg-white/5 text-gray-300 border-transparent hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Hash className={`w-4 h-4 shrink-0 ${activeRoom === room ? 'text-black' : 'text-primary'}`} />
                <span className="truncate">{room}</span>
              </div>
              
              {/* Optional Active status */}
              <div className="flex items-center gap-1 shrink-0">
                <span className={`w-1.5 h-1.5 rounded-full ${activeRoom === room ? 'bg-black' : 'bg-green-500'}`} />
                <span className={`text-[10px] ${activeRoom === room ? 'text-black/70' : 'text-gray-500'} font-mono`}>
                  {room === 'عمومی (General)' ? '12' : '3'}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Connection status footer */}
        <div className="p-3.5 bg-black/20 border-t border-white/10 flex items-center justify-between text-[10px] font-bold">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              wsStatus === 'connected' ? 'bg-green-500 animate-pulse' :
              wsStatus === 'connecting' ? 'bg-amber-500 animate-spin border border-white' :
              'bg-rose-500'
            }`} />
            <span className="text-gray-400">
              {wsStatus === 'connected' && (L(language, { fa: 'شبکه زنده فعال', en: 'Live WebSocket active', ru: 'Live-соединение активно', tr: 'Canlı bağlantı etkin' }))}
              {wsStatus === 'connecting' && (L(language, { fa: 'اتصال به کلاود...', en: 'Connecting to cloud...', ru: 'Подключение к облаку...', tr: 'Buluta bağlanıyor...' }))}
              {wsStatus === 'disconnected' && (L(language, { fa: 'حالت آفلاین (پشتیبان)', en: 'Offline mode (Backup)', ru: 'Офлайн-режим (резерв)', tr: 'Çevrimdışı mod (Yedek)' }))}
            </span>
          </div>
          <button 
            onClick={() => { fetchRooms(); fetchMessages(activeRoom); }}
            className="text-gray-500 hover:text-primary transition-colors cursor-pointer"
            title={L(language, { fa: 'بروزرسانی', en: 'Refresh', ru: 'Обновить', tr: 'Yenile' })}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Chat Messages Panel */}
      <div className={`flex-grow flex flex-col h-full bg-[#0a0d1d]/60 relative ${!isMobileSidebarOpen ? 'flex' : 'hidden lg:flex'}`}>
        
        {/* Chat Area Header */}
        <div className="p-4 bg-black/20 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg cursor-pointer"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-black text-white">{activeRoom}</h4>
              </div>
              <span className="text-[10px] text-gray-500 font-bold block mt-0.5">
                {L(language, { fa: 'گفتگوی آنی و هماهنگی هم‌تیمی‌ها', en: 'Instant group chat and strategy sync', ru: 'Мгновенный групповой чат и координация команды', tr: 'Anlık grup sohbeti ve takım koordinasyonu' })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono">5 Gamer(s)</span>
          </div>
        </div>

        {/* Messages List Container */}
        <div ref={containerRef} className="flex-grow overflow-y-auto p-4 space-y-3.5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
              <MessageSquare className="w-10 h-10 text-primary animate-bounce" />
              <div>
                <p className="text-white text-xs font-black">{L(language, { fa: 'پیامی در این اتاق وجود ندارد', en: 'No messages yet', ru: 'В этой комнате пока нет сообщений', tr: 'Bu odada henüz mesaj yok' })}</p>
                <p className="text-gray-400 text-[10px] mt-1 font-medium">{L(language, { fa: 'اولین نفری باشید که گفتگو را آغاز می‌کند!', en: 'Be the first to start the conversation!', ru: 'Начните разговор первым!', tr: 'Sohbeti başlatan ilk kişi siz olun!' })}</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isCurrentUser = msg.username === user.username;
              return (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 max-w-[85%] ${
                    isCurrentUser 
                      ? (dir === 'rtl' ? 'mr-auto flex-row-reverse' : 'ml-auto flex-row-reverse') 
                      : ''
                  }`}
                >
                  {/* User Avatar */}
                  <div className="w-8.5 h-8.5 rounded-full border-2 border-primary/30 p-0.5 shrink-0">
                    <InitialAvatar name={msg.username} size={30} className="w-full h-full" />
                  </div>

                  {/* Message Bubble */}
                  <div className="space-y-1">
                    <div className={`flex items-center gap-1.5 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[10px] font-black text-white">@{msg.username}</span>
                      <span className="text-[10px] text-gray-500 font-bold font-mono">{msg.timestamp}</span>
                    </div>

                    <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed break-words ${
                      isCurrentUser 
                        ? 'bg-primary text-black rounded-tr-none font-bold shadow-[0_2px_10px_rgba(255,184,0,0.15)]' 
                        : 'bg-white/5 text-gray-100 border border-white/5 rounded-tl-none'
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Emojis & Chat Input Panel */}
        <div className="p-4 bg-black/40 border-t border-white/10 space-y-3">
          {/* Quick Emojis Selection */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setInputMessage((prev) => prev + emoji)}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-xs rounded-lg transition-all cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Form message input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input 
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                user.username === 'Guest'
                  ? (L(language, { fa: 'برای ارسال پیام ابتدا وارد شوید...', en: 'Login to write messages...', ru: 'Войдите, чтобы писать сообщения...', tr: 'Mesaj yazmak için giriş yapın...' }))
                  : (L(language, { fa: `ارسال پیام در ${activeRoom}...`, en: `Type a message in ${activeRoom}...`, ru: `Сообщение в ${activeRoom}...`, tr: `${activeRoom} odasına mesaj yazın...` }))
              }
              disabled={user.username === 'Guest'}
              className="flex-grow px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary font-bold disabled:opacity-50"
            />
            
            <button
              type="submit"
              disabled={user.username === 'Guest' || !inputMessage.trim()}
              className="bg-primary text-black hover:bg-primary-hover px-4 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {user.username === 'Guest' && (
            <div className="flex items-center gap-1.5 text-[10px] text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                {L(language, { fa: 'شما به عنوان مهمان وارد شده‌اید. برای چت کردن لطفاً وارد شوید.', en: 'You are viewing as a guest. Please login/register to participate in discussions.', ru: 'Вы вошли как гость. Чтобы участвовать в чате, войдите или зарегистрируйтесь.', tr: 'Misafir olarak görüntülüyorsunuz. Sohbete katılmak için lütfen giriş yapın veya kayıt olun.' })}
              </span>
              <button 
                type="button" 
                onClick={onOpenAuth}
                className="underline font-black mr-auto cursor-pointer"
              >
                {L(language, { fa: 'ورود / ثبت‌نام', en: 'Login / Register', ru: 'Войти / Регистрация', tr: 'Giriş / Kayıt' })}
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
