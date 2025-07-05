import { NextRequest, NextResponse } from 'next/server';
import { validateJWT } from './jwtUtils';
import { TokenPayload } from '@/lib/types/user';

export interface AuthenticatedRequest extends NextRequest {
  user: TokenPayload;
}

export function withPlatformAuth(
  handler: (req: AuthenticatedRequest) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    const authorization = request.headers.get('authorization');
    const token = authorization?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    const tokenPayload = validateJWT(token);
    if (!tokenPayload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Attach user context to request
    (request as AuthenticatedRequest).user = tokenPayload;
    
    try {
      const response = await handler(request as AuthenticatedRequest);
      
      // Add CORS headers to response
      const corsHeaders = new Headers(response.headers);
      corsHeaders.set('Access-Control-Allow-Origin', '*');
      corsHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      corsHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error('Platform API error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }
  };
}

export function createPlatformHandler(
  handler: (req: AuthenticatedRequest, platform: string) => Promise<any>
) {
  return withPlatformAuth(async (request: AuthenticatedRequest) => {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const platformIndex = pathSegments.findIndex(segment => 
      ['splint_invest', 'masterworks', 'realt'].includes(segment)
    );
    
    if (platformIndex === -1) {
      return NextResponse.json(
        { error: 'Platform not found in URL' },
        { status: 400 }
      );
    }
    
    const platform = pathSegments[platformIndex];
    const result = await handler(request, platform);
    
    return NextResponse.json(result, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  });
}