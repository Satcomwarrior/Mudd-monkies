'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  GuidanceAction,
  GuidanceResponse,
  PromptExchange
} from '@/lib/constructConnect';

type AiGuidancePanelProps = {
  guidance: GuidanceResponse | null;
  history: PromptExchange[];
  onSendPrompt: (prompt: string) => Promise<void> | void;
  onAction?: (action: GuidanceAction) => Promise<void> | void;
  isLoading?: boolean;
  error?: string | null;
};

const defaultQuickActions: GuidanceAction[] = [
  {
    label: 'Suggest next steps',
    prompt: 'What should I do next based on the current takeoff?'
  },
  {
    label: 'Surface risks',
    prompt: 'Are there any risks or missing information in this plan set?'
  },
  {
    label: 'Verify measurements',
    prompt: 'Do these measurements look accurate or should I re-check something?'
  }
];

const roleLabel: Record<PromptExchange['role'], string> = {
  user: 'You',
  assistant: 'ConstructConnect AI',
  system: 'System'
};

export function AiGuidancePanel({
  guidance,
  history,
  onSendPrompt,
  onAction,
  isLoading = false,
  error = null
}: AiGuidancePanelProps) {
  const [promptDraft, setPromptDraft] = useState('');

  const quickActions = useMemo(() => {
    if (!guidance?.actions?.length) {
      return defaultQuickActions;
    }

    return guidance.actions;
  }, [guidance?.actions]);

  const handleSubmit = async () => {
    const trimmedPrompt = promptDraft.trim();
    if (!trimmedPrompt) return;

    await onSendPrompt(trimmedPrompt);
    setPromptDraft('');
  };

  const handleAction = async (action: GuidanceAction) => {
    if (onAction) {
      await onAction(action);
      return;
    }

    await onSendPrompt(action.prompt);
  };

  return (
    <aside className="w-full lg:w-96 bg-white rounded-lg shadow flex flex-col h-full max-h-[32rem]">
      <header className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">AI Guidance</h2>
        <p className="text-sm text-gray-500">
          Review AI insights and ask follow-up questions about your takeoffs.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <section>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Latest guidance</h3>
          <div className="rounded border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 min-h-[6rem]">
            {isLoading ? (
              <p className="text-gray-500">Generating insights…</p>
            ) : error ? (
              <p className="text-red-600">{error}</p>
            ) : guidance ? (
              <div className="space-y-2">
                <p>{guidance.message}</p>
                {guidance.summary && (
                  <p className="text-gray-600 text-xs border-l-2 border-blue-500 pl-2">
                    {guidance.summary}
                  </p>
                )}
                {guidance.recommendations?.length ? (
                  <ul className="list-disc list-inside text-gray-600 text-xs space-y-1">
                    {guidance.recommendations.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="text-gray-500">
                No AI guidance yet. Start by uploading a PDF or requesting insights.
              </p>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Prompt history</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {history.length === 0 ? (
              <p className="text-sm text-gray-500">No prompts sent yet.</p>
            ) : (
              history.map((entry, index) => (
                <article
                  key={`${entry.role}-${index}-${entry.timestamp ?? index}`}
                  className="rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm"
                >
                  <p className="font-semibold text-gray-800">{roleLabel[entry.role]}</p>
                  <p className="whitespace-pre-wrap">{entry.content}</p>
                  {entry.error && (
                    <p className="text-red-600 mt-1">{entry.error}</p>
                  )}
                  {entry.timestamp && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Quick actions</h3>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAction(action)}
                disabled={isLoading}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </section>
      </div>

      <footer className="border-t px-4 py-3 space-y-2">
        <Input
          value={promptDraft}
          placeholder="Ask about the plan, scope, or takeoff…"
          onChange={(event) => setPromptDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
          disabled={isLoading}
        />
        <Button
          type="button"
          className="w-full"
          onClick={() => void handleSubmit()}
          disabled={isLoading || !promptDraft.trim()}
        >
          {isLoading ? 'Thinking…' : 'Send to ConstructConnect AI'}
        </Button>
      </footer>
    </aside>
  );
}
