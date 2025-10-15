import { NextRequest, NextResponse } from 'next/server';
import {
  ConstructConnectError,
  fetchGuidance,
  searchProjects,
  type GuidanceRequest
} from '@/lib/constructConnect';

const buildErrorResponse = (error: unknown, defaultStatus = 500) => {
  if (error instanceof ConstructConnectError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
        status: error.status
      },
      { status: error.status }
    );
  }

  console.error('Guidance API error', error);

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : 'Unexpected server error.',
      status: defaultStatus
    },
    { status: defaultStatus }
  );
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query');

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchProjects(query);
    return NextResponse.json({ results });
  } catch (error) {
    return buildErrorResponse(error, 502);
  }
}

export async function POST(request: NextRequest) {
  let payload: GuidanceRequest;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Unable to parse guidance request payload.' },
      { status: 400 }
    );
  }

  if (!payload.prompt) {
    return NextResponse.json(
      { error: 'A prompt is required to generate guidance.' },
      { status: 400 }
    );
  }

  try {
    const guidance = await fetchGuidance(payload);
    return NextResponse.json({ guidance });
  } catch (error) {
    return buildErrorResponse(error, 502);
  }
}
