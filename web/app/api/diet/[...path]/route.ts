import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.DIET_API_URL || 'http://localhost:3000';
const API_KEY = process.env.DIET_API_KEY || '';

async function handler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const targetPath = path.join('/');
  const search = request.nextUrl.search;
  const url = `${API_URL}/${targetPath}${search}`;

  const headers = new Headers();
  if (API_KEY) headers.set('X-API-Key', API_KEY);

  const ct = request.headers.get('content-type');
  if (ct) headers.set('content-type', ct);

  const accept = request.headers.get('accept');
  if (accept) headers.set('accept', accept);

  let body: ArrayBuffer | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  const upstream = await fetch(url, {
    method: request.method,
    headers,
    body: body && body.byteLength > 0 ? body : undefined,
  });

  const responseBody = await upstream.arrayBuffer();
  const responseHeaders = new Headers();
  const upstreamCt = upstream.headers.get('content-type');
  if (upstreamCt) responseHeaders.set('content-type', upstreamCt);

  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
