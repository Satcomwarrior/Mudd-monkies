import { NextResponse } from 'next/server';
import {
  ConstructConnectConfigurationError,
  fetchGuidance,
} from '@/lib/constructConnect';
import type { ConstructGuidancePayload } from '@/types/guidance';

export async function POST(request: Request) {
  let body: ConstructGuidancePayload;

  try {
    body = (await request.json()) as ConstructGuidancePayload;
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON payload', details: String(error) },
      { status: 400 }
    );
  }

  if (!body.event) {
    return NextResponse.json(
      { error: 'Missing event type in request body' },
      { status: 400 }
    );
  }

  try {
    const guidance = await fetchGuidance(body);
    return NextResponse.json(guidance, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof ConstructConnectConfigurationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to retrieve ConstructConnect guidance',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
