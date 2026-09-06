import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { UserData } from '../types';
import { Send, Globe2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { sendNotification } from '../lib/notifications';

interface GlobalMessage {
  id: string;
  userId: string;
  userName: string;
  originalText: string;
  translations: {
    en?: string;
    pt?: string;
    es?: string;
    [key: string]: string | undefined;
  };
  timestamp: number;
}

interface GlobalChatBoxProps {
  currentUser: UserData;
  className?: string;
}

export default function GlobalChatBox({ currentUser, className }: GlobalChatBoxProps) {
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [localLang, setLocalLang] = useState<'pt' | 'en' | 'es'>('pt');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const db = getDb();
    const q = query(
      collection(db, 'globalChat'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data() as GlobalMessage;
          if (msg.userId !== currentUser.uid && msg.timestamp > Date.now() - 5000) {
            const textToNotify = msg.translations[localLang] || msg.originalText;
            sendNotification('Chat Global: ' + msg.userName, {
              body: textToNotify
            });
          }
        }
      });
      
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GlobalMessage));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return unsubscribe;
  }, [currentUser.uid, localLang]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    
    const text = inputText.trim();
    setInputText('');
    setIsSending(true);
    
    try {
      await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          userId: currentUser.uid,
          userName: currentUser.displayName
        })
      });
    } catch (error) {
      console.error('Failed to send global chat message:', error);
      // Put text back if failed
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={cn("flex flex-col bg-neutral-800 rounded-2xl border border-neutral-700/50 shadow-xl overflow-hidden", className)}>
      <div className="bg-neutral-900/50 border-b border-neutral-700/50 p-3 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold text-white">Chat Mundial</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">Seu Idioma:</span>
          <select 
            value={localLang} 
            onChange={(e) => setLocalLang(e.target.value as any)}
            className="bg-neutral-800 border border-neutral-700 text-sm text-white rounded-md px-2 py-1 outline-none focus:border-emerald-500"
          >
            <option value="pt">Português (BR)</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[200px] max-h-[400px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-sm gap-2">
            <Globe2 className="w-8 h-8 opacity-20" />
            <p>Nenhuma mensagem ainda.</p>
            <p className="text-xs opacity-60">Mensagens serão traduzidas via IA.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.userId === currentUser.uid;
            // Fallback to original text if translation is missing
            const displayText = msg.translations?.[localLang] || msg.originalText;
            
            return (
              <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                <span className="text-xs text-neutral-400 mb-1 px-1">{isMe ? 'Você' : msg.userName}</span>
                <div className={cn(
                  "px-3 py-2 rounded-xl text-sm max-w-[85%]",
                  isMe ? "bg-emerald-500 text-neutral-950 rounded-br-sm" : "bg-neutral-700 text-white rounded-bl-sm"
                )}>
                  {displayText}
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
          disabled={!inputText.trim() || isSending}
          className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSending ? (
            <div className="w-4 h-4 rounded-full border-2 border-neutral-950 border-t-transparent animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
