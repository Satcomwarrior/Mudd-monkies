import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export async function POST(req: NextRequest) {
  const { method, params } = await req.json();

  let tempFilePath: string | undefined;
  if (method === 'pdf_extract_text' && params.fileContent) {
    const { fileName, fileContent } = params;
    const buffer = Buffer.from(fileContent, 'base64');
    tempFilePath = path.join(os.tmpdir(), fileName);
    await fs.writeFile(tempFilePath, buffer);
    params.filePath = tempFilePath;
    delete params.fileContent;
    delete params.fileName;
  }

  const mcpServerPath = path.resolve(process.cwd(), 'mcp-server/build/index.js');
  const mcpServer = spawn('node', [mcpServerPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  mcpServer.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }));
  mcpServer.stdin.end();

  let responseData = '';
  for await (const chunk of mcpServer.stdout) {
    responseData += chunk;
  }

  let errorData = '';
  for await (const chunk of mcpServer.stderr) {
    errorData += chunk;
  }

  if (tempFilePath) {
    await fs.unlink(tempFilePath);
  }

  if (errorData) {
    console.error('MCP Server Error:', errorData);
    return NextResponse.json({ error: 'MCP Server Error', details: errorData }, { status: 500 });
  }

  try {
    const response = JSON.parse(responseData);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error parsing MCP server response:', error);
    return NextResponse.json({ error: 'Error parsing MCP server response', details: responseData }, { status: 500 });
  }
}
