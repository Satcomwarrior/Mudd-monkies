'use client';

import { useMemo } from 'react';
import type { ConstructGuidanceMessage } from '@/types/guidance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AlgorithmicInsight } from '@/lib/measurementInsights';
import { cn } from '@/lib/utils';

interface AiGuidancePanelProps {
  messages: ConstructGuidanceMessage[];
  isLoading: boolean;
  error?: string | null;
  onRefresh?: () => void;
  insights?: AlgorithmicInsight[];
}

export function AiGuidancePanel({
  messages,
  isLoading,
  error,
  onRefresh,
  insights = [],
}: AiGuidancePanelProps) {
  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [messages]
  );

  return (
    <Card className="w-full lg:w-80 flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">AI Guidance</CardTitle>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? 'Loading…' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {insights.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Algorithmic insights
              </p>
              <div className="space-y-2">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={cn(
                      'rounded-md border px-3 py-2 text-sm shadow-sm',
                      insight.tone === 'success' &&
                        'border-emerald-200 bg-emerald-50 text-emerald-800',
                      insight.tone === 'warning' &&
                        'border-amber-200 bg-amber-50 text-amber-800',
                      insight.tone === 'info' && 'border-blue-200 bg-blue-50 text-blue-800',
                      !insight.tone && 'border-gray-200 bg-gray-50 text-gray-700'
                    )}
                  >
                    <p className="font-semibold">{insight.title}</p>
                    <p className="text-sm leading-relaxed">{insight.value}</p>
                    {insight.helperText && (
                      <p className="text-xs text-current/80 mt-1">{insight.helperText}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-2">
              {error}
            </p>
          )}

          {!error && sortedMessages.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground">
              Open a drawing or record a measurement to see ConstructConnect guidance here.
            </p>
          )}

          {sortedMessages.map((message) => (
            <div
              key={message.id}
              className="rounded-md border border-gray-200 bg-gray-50 p-2 text-sm"
            >
              <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">
                {message.role === 'assistant' ? 'ConstructConnect' : message.role}
              </p>
              <p className="whitespace-pre-wrap leading-relaxed text-gray-800">
                {message.content}
              </p>
            </div>
          ))}

          {isLoading && (
            <p className="text-sm text-muted-foreground">Fetching guidance…</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
