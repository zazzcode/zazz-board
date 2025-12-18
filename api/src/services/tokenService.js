import { db } from '../../lib/db/index.js';
import { USERS } from '../../lib/db/schema.js';

/**
 * Token Service
 * Manages user access tokens for API authorization.
 * Caches token-to-user mapping for fast validation and audit logging.
 */
class TokenService {
  constructor() {
    this.tokenCache = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize token cache on server startup
   */
  async initialize() {
    try {
      console.log('🔐 Initializing token cache...');
      
      const users = await db.select({
        id: USERS.id,
        fullName: USERS.full_name,
        email: USERS.email,
        accessToken: USERS.access_token
      }).from(USERS);

      // Build cache: token -> {userId, email, fullName}
      for (const user of users) {
        this.tokenCache.set(user.accessToken, {
          userId: user.id,
          email: user.email,
          fullName: user.fullName
        });
      }

      this.isInitialized = true;
      console.log(`✅ Token cache initialized with ${this.tokenCache.size} users`);
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
    return {
      isInitialized: this.isInitialized,
      userCount: this.tokenCache.size,
      tokens: Array.from(this.tokenCache.keys())
    };
  }

  /**
   * Refresh cache (useful for testing or when users are added)
   */
  async refreshCache() {
    this.tokenCache.clear();
    this.isInitialized = false;
    await this.initialize();
  }
}

// Export singleton instance
export const tokenService = new TokenService(); 