import { NextRequest, NextResponse } from 'next/server';
import { validatePlatformCredentials, storePlatformLink } from '@/lib/auth/platform-auth';
import { getAuthSession, updateSessionPlatformLink } from '@/lib/auth/session-manager';
import { PlatformType } from '@/lib/types/platformAsset';

export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const body = await request.json();
    const { sessionId, email, password } = body;

    if (!sessionId || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: sessionId, email, password' },
        { status: 400 }
      );
    }

    // Validate platform
    const platform = params.platform.replace('-', '_') as PlatformType;
    if (!['splint_invest', 'masterworks', 'realt'].includes(platform)) {
      return NextResponse.json(
        { success: false, message: `Unsupported platform: ${params.platform}` },
        { status: 400 }
      );
    }

    // Validate session exists and is active
    const session = await getAuthSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Validate platform credentials against platform API
    const authResult = await validatePlatformCredentials(platform, email, password);
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        message: authResult.error || 'Invalid platform credentials'
      }, { status: 401 });
    }

    if (!authResult.user || !authResult.accessToken) {
      return NextResponse.json({
        success: false,
        message: 'Platform authentication failed - missing user data'
      }, { status: 500 });
    }

    // Store platform link with JWT token
    const platformLink = await storePlatformLink({
      luxUserId: session.luxUserId,
      platform,
      platformUserId: authResult.user.userId,
      platformEmail: email,
      accessToken: authResult.accessToken,
      tokenExpiry: authResult.expiresAt
    });

    // Update session with linked platform
    await updateSessionPlatformLink(sessionId, platform, platformLink);

    return NextResponse.json({
      success: true,
      platform: params.platform,
      platformName: authResult.user.name || email,
      linkedAt: platformLink.linkedAt,
      message: `Successfully connected ${params.platform.replace('-', ' ')} account`
    });

  } catch (error) {
    console.error('Platform auth completion error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error. Please try again.'
    }, { status: 500 });
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}