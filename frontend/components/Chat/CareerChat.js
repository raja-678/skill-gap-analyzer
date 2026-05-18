import { useEffect, useRef, useState } from 'react';
import { FiMessageCircle, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const starterPrompts = [
  'What should I learn next based on my profile?',
  'How can I improve my resume for a software role?',
  'Which target role fits me best right now?'
];

export default function CareerChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Ask me about your skill gaps, target roles, learning path, or resume positioning.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await api.get('/chat/history?limit=30');
        if (response.data.history?.length) {
          setMessages(response.data.history.map((message) => ({
            role: message.role,
            content: message.content
          })));
        }
      } catch (error) {
        // Chat remains usable even if history cannot be loaded.
      }
    };

    loadHistory();
  }, []);

  const sendMessage = async (content = input) => {
    const trimmed = content.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const history = nextMessages
        .filter((message) => ['user', 'assistant'].includes(message.role))
        .slice(-8);
      const response = await api.post('/chat/message', {
        message: trimmed,
        history
      });

      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: response.data.reply
        }
      ]);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Chat agent failed to respond');
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: 'I could not reach the AI service. Check the backend Groq configuration and try again.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <div className="bg-white rounded-lg shadow flex h-[calc(100vh-12rem)] min-h-[560px] flex-col">
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            <FiMessageCircle className="text-xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-dark">Career Agent</h2>
            <p className="text-sm text-gray-500">Chat with an assistant that understands your skill profile.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-5 flex flex-wrap gap-2">
          {starterPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:border-primary hover:text-primary disabled:opacity-60"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[78%] whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-6 ${
                  message.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-500">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask about your next skill, target role, resume gaps, or learning plan..."
            className="input-field min-h-[48px] flex-1 resize-none"
            rows={1}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary flex h-12 items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiSend />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
