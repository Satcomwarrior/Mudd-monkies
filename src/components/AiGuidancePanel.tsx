'use client';

import { useMemo } from 'react';
import type { ConstructGuidanceMessage } from '@/types/guidance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AiGuidancePanelProps {
  messages: ConstructGuidanceMessage[];
  isLoading: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export function AiGuidancePanel({
  messages,
  isLoading,
  error,
  onRefresh,
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
      <CardContent className="flex-1 overflow-y-auto space-y-3">
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
      </CardContent>
    </Card>
  );
}
