import { db } from '../../lib/db/index.js';
import { AGENT_TOKENS, PROJECTS, USERS } from '../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Token Service
 * Manages user and agent access tokens for API authorization.
 * Caches token-to-context mapping plus project lookup tables for fast auth checks.
 */
class TokenService {
  constructor() {
    this.tokenCache = new Map();
    this.projectIdByCode = new Map();
    this.projectCodeById = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize token cache on server startup
   */
  async initialize() {
    await this.refreshCache();
  }

  async loadProjects() {
    const projects = await db.select({
      id: PROJECTS.id,
      code: PROJECTS.code,
    }).from(PROJECTS);

    for (const project of projects) {
      this.projectIdByCode.set(project.code, project.id);
      this.projectCodeById.set(project.id, project.code);
    }
  }

  async loadUserTokens() {
    const users = await db.select({
      id: USERS.id,
      fullName: USERS.full_name,
      email: USERS.email,
      accessToken: USERS.access_token,
    }).from(USERS);

    for (const user of users) {
      this.tokenCache.set(user.accessToken, {
        type: 'user',
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
      });
    }

    return users.length;
  }

  async loadAgentTokens() {
    const agentTokens = await db.select({
      token: AGENT_TOKENS.token,
      userId: AGENT_TOKENS.user_id,
      projectId: AGENT_TOKENS.project_id,
      label: AGENT_TOKENS.label,
      email: USERS.email,
      fullName: USERS.full_name,
      projectCode: PROJECTS.code,
    })
      .from(AGENT_TOKENS)
      .innerJoin(USERS, eq(AGENT_TOKENS.user_id, USERS.id))
      .innerJoin(PROJECTS, eq(AGENT_TOKENS.project_id, PROJECTS.id));

    for (const agentToken of agentTokens) {
      this.tokenCache.set(agentToken.token, {
        type: 'agent',
        userId: agentToken.userId,
        projectId: agentToken.projectId,
        projectCode: agentToken.projectCode,
        label: agentToken.label,
        email: agentToken.email,
        fullName: agentToken.fullName,
      });
    }

    return agentTokens.length;
  }

  resetCaches() {
    this.tokenCache.clear();
    this.projectIdByCode.clear();
    this.projectCodeById.clear();
    this.isInitialized = false;
  }

  /**
   * Initialize token cache on server startup
   */
  async refreshCache() {
    try {
      console.log('🔐 Initializing token cache...');

      this.resetCaches();
      await this.loadProjects();
      const userCount = await this.loadUserTokens();
      const agentTokenCount = await this.loadAgentTokens();

      this.isInitialized = true;
      console.log(
        `✅ Token cache initialized with ${userCount} user tokens, ${agentTokenCount} agent tokens, ${this.projectIdByCode.size} projects`,
      );
    } catch (error) {
      console.error('❌ Failed to initialize token cache:', error);
      throw error;
    }
  }

  /**
   * Validate token and return user info
   */
  validateToken(token) {
    if (!this.isInitialized) {
      throw new Error('Token service not initialized');
    }

    if (!token) {
      return null;
    }

    return this.tokenCache.get(token) || null;
  }

  /**
   * Extract token from request headers
   * Supports both TB_TOKEN and Authorization: Bearer formats
   */
  extractTokenFromRequest(request) {
    // Check for TB_TOKEN header first (case insensitive)
    const tbToken = request.headers['tb-token'] || request.headers['TB_TOKEN'] || request.headers['tb_token'];
    if (tbToken) {
      return tbToken;
    }

    // Check for Authorization: Bearer header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    return null;
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    let userCount = 0;
    let agentTokenCount = 0;

    for (const entry of this.tokenCache.values()) {
      if (entry.type === 'agent') {
        agentTokenCount += 1;
      } else {
        userCount += 1;
      }
    }

    return {
      isInitialized: this.isInitialized,
      userCount,
      agentTokenCount,
      projectCount: this.projectIdByCode.size,
      tokens: Array.from(this.tokenCache.keys()),
    };
  }

  getProjectIdByCode(projectCode) {
    return this.projectIdByCode.get(projectCode) ?? null;
  }

  getProjectCodeById(projectId) {
    const normalizedProjectId = Number(projectId);
    return this.projectCodeById.get(normalizedProjectId) ?? null;
  }

  addAgentTokenToCache({ token, userId, projectId, projectCode, email = null, fullName = null, label = null }) {
    if (!token) {
      throw new Error('token is required to add agent token to cache');
    }

    let resolvedProjectCode = projectCode ?? null;
    if (!resolvedProjectCode && projectId !== undefined && projectId !== null) {
      resolvedProjectCode = this.getProjectCodeById(projectId);
    }

    if (projectId !== undefined && projectId !== null && resolvedProjectCode) {
      this.projectIdByCode.set(resolvedProjectCode, projectId);
      this.projectCodeById.set(Number(projectId), resolvedProjectCode);
    }

    this.tokenCache.set(token, {
      type: 'agent',
      userId,
      projectId,
      projectCode: resolvedProjectCode,
      email,
      fullName,
      label,
    });
  }

  removeAgentTokenFromCache(token) {
    if (!token) {
      return;
    }

    const cachedToken = this.tokenCache.get(token);
    if (cachedToken?.type !== 'agent') {
      return;
    }

    this.tokenCache.delete(token);
  }
}

// Export singleton instance
export const tokenService = new TokenService(); 
