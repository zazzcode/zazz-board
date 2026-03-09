import { tokenService } from '../services/tokenService.js';

function getRouteTemplate(request) {
  return request.routeOptions?.url || request.routerPath || request.url.split('?')[0];
}

function getProjectContext(request) {
  const routeTemplate = getRouteTemplate(request);
  const params = request.params || {};
  const projectCode = params.projectCode || params.code || null;

  if (projectCode) {
    return {
      routeTemplate,
      hasProjectContext: true,
      projectId: tokenService.getProjectIdByCode(projectCode),
      projectCode,
    };
  }

  const isProjectIdRoute =
    routeTemplate === '/projects/:id' || routeTemplate.startsWith('/projects/:id/');

  if (!isProjectIdRoute) {
    return { routeTemplate, hasProjectContext: false, projectId: null, projectCode: null };
  }

  const projectId = Number(params.id);
  if (!Number.isInteger(projectId)) {
    return { routeTemplate, hasProjectContext: true, projectId: null, projectCode: null };
  }

  return {
    routeTemplate,
    hasProjectContext: true,
    projectId,
    projectCode: tokenService.getProjectCodeById(projectId),
  };
}

function isUserTokenOnlyRoute(routeTemplate, hasProjectContext) {
  if (routeTemplate === '/token-cache/refresh') {
    return true;
  }

  if (routeTemplate.includes('/agent-tokens')) {
    return true;
  }

  return !hasProjectContext;
}

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
    request.tokenType = userInfo.type || 'user';

    if (userInfo.type === 'agent') {
      request.agentTokenUserId = userInfo.userId;
      request.agentTokenProjectId = userInfo.projectId ?? null;
      request.agentTokenProjectCode = userInfo.projectCode ?? null;
    }

    const { routeTemplate, hasProjectContext, projectId } = getProjectContext(request);

    if (request.tokenType === 'agent') {
      if (isUserTokenOnlyRoute(routeTemplate, hasProjectContext)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Agent tokens are not allowed on this endpoint'
        });
      }

      if (projectId !== null && userInfo.projectId !== projectId) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Agent token is not authorized for this project'
        });
      }
    }

    // Log successful authentication (for debugging)
    request.log.info({
      userId: userInfo.userId,
      userEmail: userInfo.email,
      tokenType: request.tokenType,
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
        request.tokenType = userInfo.type || 'user';

        if (userInfo.type === 'agent') {
          request.agentTokenUserId = userInfo.userId;
          request.agentTokenProjectId = userInfo.projectId ?? null;
          request.agentTokenProjectCode = userInfo.projectCode ?? null;
        }
      }
    }
    // Continue even if no valid token (optional auth)
  } catch (error) {
    request.log.error(error, 'Optional authentication middleware error');
    // Continue without authentication on error
  }
} 
