import { tokenService } from '../services/tokenService.js';

/**
 * Fastify Authentication Middleware
 * Validates access tokens and attaches user context to requests.
 * Supports both TB_TOKEN and Authorization: Bearer header formats.
 */
export async function authMiddleware(request, reply) {
  try {
    // Extract token from request headers
    const token = tokenService.extractTokenFromRequest(request);
    
    if (!token) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Access token required. Use TB_TOKEN header or Authorization: Bearer header.'
      });
    }

    // Validate token and get user info
    const userInfo = tokenService.validateToken(token);
    
    if (!userInfo) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid access token'
      });
    }

    // Attach user context to request for route handlers
    request.user = {
      id: userInfo.userId,
      email: userInfo.email,
      fullName: userInfo.fullName
    };

    // Log successful authentication (for debugging)
    request.log.info({
      userId: userInfo.userId,
      userEmail: userInfo.email,
      path: request.url,
      method: request.method
    }, 'User authenticated');

  } catch (error) {
    request.log.error(error, 'Authentication middleware error');
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'Authentication service error'
    });
  }
}

/**
 * Optional authentication middleware
 * Allows routes to work with or without authentication
 */
export async function optionalAuthMiddleware(request, reply) {
  try {
    const token = tokenService.extractTokenFromRequest(request);
    
    if (token) {
      const userInfo = tokenService.validateToken(token);
      if (userInfo) {
        request.user = {
          id: userInfo.userId,
          email: userInfo.email,
          fullName: userInfo.fullName
        };
      }
    }
    // Continue even if no valid token (optional auth)
  } catch (error) {
    request.log.error(error, 'Optional authentication middleware error');
    // Continue without authentication on error
  }
} 