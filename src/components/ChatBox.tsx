import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { UserData, Message } from '../types';
import { Send } from 'lucide-react';
import { cn } from '../lib/utils';
import { sendNotification } from '../lib/notifications';

interface ChatBoxProps {
  roomId: string;
  currentUser: UserData;
  className?: string;
  title?: string;
}

export default function ChatBox({ roomId, currentUser, className, title }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const db = getDb();
    const q = query(
      collection(db, 'messages'),
      where('roomId', '==', roomId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data() as Message;
          // Only notify if it's not my own message, and it's a relatively recent message to prevent spam on initial load
          if (msg.uid !== currentUser?.uid && (msg.createdAt || 0) > Date.now() - 5000) {
            sendNotification('Nova mensagem de ' + (msg.displayName || 'Jogador'), {
              body: msg.text
            });
          }
        }
      });
      
      const msgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Message))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => {
      console.warn("ChatBox messages error:", err);
    });

    return unsubscribe;
  }, [roomId, currentUser?.uid]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const db = getDb();
    const text = inputText.trim();
    setInputText('');

    await addDoc(collection(db, 'messages'), {
      roomId,
      uid: currentUser.uid,
      displayName: currentUser.displayName,
      text,
      createdAt: Date.now()
    });
  };

  return (
    <div className={cn("flex flex-col bg-neutral-800 rounded-2xl border border-neutral-700/50 shadow-xl overflow-hidden min-h-0", className)}>
      {title && (
        <div className="bg-neutral-900/50 border-b border-neutral-700/50 py-2.5 px-3.5 flex-shrink-0">
          <h3 className="font-semibold text-white text-xs sm:text-sm">{title}</h3>
        </div>
      )}
      
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-2 sm:space-y-3 min-h-0 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
            Nenhuma mensagem ainda.
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.uid === currentUser.uid;
            return (
              <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                <span className="text-xs text-neutral-400 mb-1 px-1">{isMe ? 'Você' : msg.displayName}</span>
                <div className={cn(
                  "px-3 py-2 rounded-xl text-sm max-w-[85%]",
                  isMe ? "bg-emerald-500 text-neutral-950 rounded-br-sm" : "bg-neutral-700 text-white rounded-bl-sm"
                )}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 bg-neutral-900/50 border-t border-neutral-700/50 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
