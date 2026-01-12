'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { getChatMessages, getOrCreateChat, ChatMessage } from '@/lib/db';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const subjectId = params.subjectId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user && subjectId) {
        loadChat(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [subjectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChat = async (uid: string) => {
    try {
      const id = await getOrCreateChat(subjectId, uid);
      setChatId(id);
      const messagesData = await getChatMessages(id, 50);
      setMessages(messagesData);
    } catch (error: any) {
      toast.error('Failed to load chat');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !chatId || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    // Add user message to UI immediately
    const tempUserMessage: ChatMessage = {
      id: 'temp',
      role: 'user',
      content: userMessage,
      createdAt: { toDate: () => new Date() } as any,
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          subjectId,
          message: userMessage,
        }),
      });

      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error('Server error: API returned invalid response. Check server logs and ensure OPENAI_API_KEY is set.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Reload messages to get the updated conversation
      if (chatId) {
        const messagesData = await getChatMessages(chatId, 50);
        setMessages(messagesData);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
      // Remove temp message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== 'temp'));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Navbar user={user} />
          <div className="text-center py-12">Loading chat...</div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar user={user} />
        
        <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-4">
          <div className="mb-4">
            <button
              onClick={() => router.push(`/subjects/${subjectId}`)}
              className="text-blue-600 hover:text-blue-700"
            >
              ← Back to Subject
            </button>
          </div>

          <div className="flex-1 bg-white rounded-lg shadow flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  Start a conversation! Ask questions about your notes.
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="border-t p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={sending}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
