'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Building2, Loader2, Trash2 } from 'lucide-react';

interface Client {
  id: string;
  clientName: string;
  jdRole: string;
  docId?: string;
  jdFileName?: string;
}

interface Message {
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export default function RecruiterBotClient() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [query, setQuery] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/recruiter/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (e) {
      console.error('Failed to fetch clients:', e);
    } finally {
      setClientsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !query.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: query.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/recruiter/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          query: userMessage.content,
          systemPrompt: systemPrompt.trim() || undefined
        })
      });

      const data = await res.json();
      const botMessage: Message = {
        role: 'bot',
        content: data.response || data.error || 'No response received',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', content: 'Failed to connect to the service.', timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const quickQueries = [
    'Generate 10 easy interview questions for this JD with answers',
    'Generate 5 hard technical questions for this JD',
    'Summarize the key skills required for this role',
    'What are the must-have vs nice-to-have requirements?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] gap-4">
      {/* Client Selector */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Select Client (with uploaded JD)</label>
            {clientsLoading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading clients...</div>
            ) : clients.length === 0 ? (
              <p className="text-sm text-zinc-500">No clients found. Create a client first.</p>
            ) : (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="input-base"
              >
                <option value="">Choose a client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.clientName} — {c.jdRole}</option>
                ))}
              </select>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowPrompt(!showPrompt)}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 whitespace-nowrap mt-4"
          >
            {showPrompt ? 'Hide' : 'System Prompt'}
          </button>
        </div>
        {showPrompt && (
          <input
            type="text"
            placeholder="Optional: e.g. You are a Senior Technical Interview Panel specializing in Java"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="input-base text-sm"
          />
        )}
        {selectedClient && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Building2 className="h-3.5 w-3.5" />
            <span>{selectedClient.clientName}</span>
            <span className="text-zinc-300 dark:text-zinc-600">•</span>
            <span>{selectedClient.jdRole}</span>
            {selectedClient.jdFileName ? (
              <>
                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                <span className="text-emerald-600">📄 {selectedClient.jdFileName}</span>
              </>
            ) : (
              <>
                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                <span className="text-amber-600">⚠ No JD file uploaded — upload one via Client Management to use the bot</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="card flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3" />
              <h3 className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">JD Assistant</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 max-w-md">
                Select a client and ask questions about their job description. Generate interview questions, summarize requirements, and more.
              </p>
              {selectedClientId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {quickQueries.map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuery(q)}
                      className="text-left text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'bot' && (
                    <div className="shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="shrink-0 w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                      <User className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 p-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={!selectedClientId ? "Select a client first" : !selectedClient?.docId ? "Upload a JD file for this client first" : "Ask about the JD..."}
              disabled={!selectedClientId || !selectedClient?.docId || loading}
              className="input-base flex-1"
            />
            <button
              type="submit"
              disabled={!selectedClientId || !selectedClient?.docId || !query.trim() || loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
