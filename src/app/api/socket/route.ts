export async function GET() {
  return new Response('Socket.IO endpoint', { status: 200 });
}

export async function POST() {
  return new Response('Method not allowed', { status: 405 });
}