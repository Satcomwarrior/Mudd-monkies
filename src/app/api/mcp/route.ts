import { NextRequest, NextResponse } from 'next/server';
import { callToolHandler } from '../../../../mcp-server/src/tool-handler';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export async function POST(req: NextRequest) {
  const params = await req.json();

  let tempFilePath: string | undefined;

  // Handle file content passed from the frontend
  if (params.fileName && params.fileContent) {
    const { fileName, fileContent } = params;
    const buffer = Buffer.from(fileContent, 'base64');
    tempFilePath = path.join(os.tmpdir(), fileName);
    await fs.writeFile(tempFilePath, buffer);

    // Replace fileContent with the filePath for the handler
    params.filePath = tempFilePath;
    delete params.fileContent;
    delete params.fileName;
  }

  // Construct the request object for the tool handler
  const toolRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'call-tool',
    params: {
      name: params.toolName,
      arguments: params,
    },
  };

  try {
    const result = await callToolHandler(toolRequest);
    return NextResponse.json({ result });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Tool handler failed', details: errorMessage },
      { status: 500 }
    );
  } finally {
    // Clean up the temporary file
    if (tempFilePath) {
      await fs.unlink(tempFilePath);
    }
  }
}
