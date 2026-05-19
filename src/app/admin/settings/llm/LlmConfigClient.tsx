'use client';

import { useState, useEffect } from 'react';

interface LlmConfig {
  provider: string;
  claudeModels: {
    question: string;
    assessment: string;
    rubric: string;
    matching: string;
  };
  ollamaModels: {
    question: string;
    assessment: string;
    rubric: string;
    matching: string;
  };
  updatedBy?: string;
  updatedAt?: string;
}

interface AvailableModels {
  claude: string[];
  ollama: string[];
}

export default function LlmConfigClient() {
  const [config, setConfig] = useState<LlmConfig | null>(null);
  const [availableModels, setAvailableModels] = useState<AvailableModels | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'CLAUDE' | 'OLLAMA'>('CLAUDE');
  const [claudeModels, setClaudeModels] = useState({
    question: 'claude-haiku-4-5',
    assessment: 'claude-sonnet-4-5',
    rubric: 'claude-haiku-4-5',
    matching: 'claude-sonnet-4-5'
  });
  const [ollamaModels, setOllamaModels] = useState({
    question: 'qwen2.5:7b',
    assessment: 'qwen2.5:32b',
    rubric: 'qwen2.5:14b',
    matching: 'qwen2.5:32b'
  });

  useEffect(() => {
    fetchConfig();
    fetchAvailableModels();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/llm/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setSelectedProvider(data.provider);
        setClaudeModels(data.claudeModels);
        setOllamaModels(data.ollamaModels);
      }
    } catch (error) {
      console.error('Failed to fetch LLM config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const response = await fetch('/api/admin/llm/available-models');
      if (response.ok) {
        const data = await response.json();
        setAvailableModels(data);
      }
    } catch (error) {
      console.error('Failed to fetch available models:', error);
    }
  };

  const handleSwitch = async () => {
    setSwitching(true);
    try {
      const response = await fetch('/api/admin/llm/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          claudeModels,
          ollamaModels
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully switched to ${result.currentProvider}`);
        await fetchConfig();
      } else {
        const error = await response.json();
        alert(`Failed to switch provider: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Error switching provider');
      console.error(error);
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading LLM configuration...</div>;
  }

  const inputCls = "w-full p-2.5 border rounded-lg bg-white dark:bg-black dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm";
  const labelCls = "block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300";

  return (
    <div className="max-w-5xl space-y-6">
      {/* Current Configuration */}
      <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Current Configuration</h2>
        {config && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Active Provider:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                config.provider === 'CLAUDE' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
              }`}>
                {config.provider}
              </span>
            </div>
            {config.updatedAt && (
              <div className="text-sm text-zinc-500">
                Last updated: {new Date(config.updatedAt).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Provider Selection */}
      <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold mb-6 text-zinc-900 dark:text-zinc-100">Switch Provider</h2>
        
        <div className="space-y-6">
          {/* Provider Toggle */}
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedProvider('CLAUDE')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                selectedProvider === 'CLAUDE'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">Claude (Anthropic)</div>
              <div className="text-sm text-zinc-500 mt-1">High-quality AI models</div>
            </button>
            <button
              onClick={() => setSelectedProvider('OLLAMA')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                selectedProvider === 'OLLAMA'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">Ollama (Local)</div>
              <div className="text-sm text-zinc-500 mt-1">Self-hosted models</div>
            </button>
          </div>

          {/* Claude Models Configuration */}
          {selectedProvider === 'CLAUDE' && (
            <div className="space-y-4 p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200">Claude Models</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Question Generation</label>
                  <select
                    value={claudeModels.question}
                    onChange={(e) => setClaudeModels(prev => ({ ...prev, question: e.target.value }))}
                    className={inputCls}
                  >
                    {availableModels?.claude.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-1">Fast, cost-effective for questions</p>
                </div>
                <div>
                  <label className={labelCls}>Assessment</label>
                  <select
                    value={claudeModels.assessment}
                    onChange={(e) => setClaudeModels(prev => ({ ...prev, assessment: e.target.value }))}
                    className={inputCls}
                  >
                    {availableModels?.claude.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-1">Powerful for accurate scoring</p>
                </div>
                <div>
                  <label className={labelCls}>Rubric Generation</label>
                  <select
                    value={claudeModels.rubric}
                    onChange={(e) => setClaudeModels(prev => ({ ...prev, rubric: e.target.value }))}
                    className={inputCls}
                  >
                    {availableModels?.claude.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-1">Balanced for rubric extraction</p>
                </div>
                <div>
                  <label className={labelCls}>Candidate Matching</label>
                  <select
                    value={claudeModels.matching}
                    onChange={(e) => setClaudeModels(prev => ({ ...prev, matching: e.target.value }))}
                    className={inputCls}
                  >
                    {availableModels?.claude.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-1">Complex analysis for matching</p>
                </div>
              </div>
            </div>
          )}

          {/* Ollama Models Configuration */}
          {selectedProvider === 'OLLAMA' && (
            <div className="space-y-4 p-4 rounded-lg bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-900/30">
              <h3 className="font-semibold text-purple-900 dark:text-purple-200">Ollama Models</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Question Generation</label>
                  <select
                    value={ollamaModels.question}
                    onChange={(e) => setOllamaModels(prev => ({ ...prev, question: e.target.value }))}
                    className={inputCls}
                  >
                    {availableModels?.ollama.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-1">Fast model for questions</p>
                </div>
                <div>
                  <label className={labelCls}>Assessment</label>
                  <select
                    value={ollamaModels.assessment}
                    onChange={(e) => setOllamaModels(prev => ({ ...prev, assessment: e.target.value }))}
                    className={inputCls}
                  >
                    {availableModels?.ollama.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-1">Powerful for accurate scoring</p>
                </div>
                <div>
                  <label className={labelCls}>Rubric Generation</label>
                  <select
                    value={ollamaModels.rubric}
                    onChange={(e) => setOllamaModels(prev => ({ ...prev, rubric: e.target.value }))}
                    className={inputCls}
                  >
                    {availableModels?.ollama.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-1">Balanced for rubric extraction</p>
                </div>
                <div>
                  <label className={labelCls}>Candidate Matching</label>
                  <select
                    value={ollamaModels.matching}
                    onChange={(e) => setOllamaModels(prev => ({ ...prev, matching: e.target.value }))}
                    className={inputCls}
                  >
                    {availableModels?.ollama.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-1">Complex analysis for matching</p>
                </div>
              </div>
            </div>
          )}

          {/* Apply Button */}
          <button
            onClick={handleSwitch}
            disabled={switching || selectedProvider === config?.provider}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
          >
            {switching ? 'Switching...' : selectedProvider === config?.provider ? `${selectedProvider} is currently active` : `Switch to ${selectedProvider}`}
          </button>
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-xl border border-amber-200 dark:border-amber-900/30">
        <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-3">Important Notes</h3>
        <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-2 list-disc list-inside">
          <li>Changes take effect immediately (cached for 1 minute)</li>
          <li>All configuration changes are logged in audit logs</li>
          <li>Only SUPER_ADMIN can modify LLM configuration</li>
          <li>Different models are used for different operations to optimize cost and performance</li>
          <li>Ensure Ollama service is running before switching to Ollama provider</li>
        </ul>
      </div>
    </div>
  );
}
