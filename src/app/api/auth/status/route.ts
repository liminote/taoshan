import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token');

    if (authToken && authToken.value === 'authenticated') {
      return NextResponse.json({ authenticated: true });
    } else {
      return NextResponse.json({ authenticated: false });
    }
  } catch (error) {
    return NextResponse.json(
      { authenticated: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}