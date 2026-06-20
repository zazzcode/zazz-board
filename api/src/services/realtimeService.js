/**
 * @typedef {import('../types.js').RealtimeEventPayload} RealtimeEventPayload
 * @typedef {import('../types.js').SseSubscriber} SseSubscriber
 */

/**
 * In-memory Server-Sent Events broker scoped by project code.
 * This keeps active subscribers per project and broadcasts lightweight events
 * when task/graph-related API mutations occur.
 */
export default class RealtimeService {
  constructor() {
    this.subscribersByProject = new Map();
    this.nextSubscriberId = 1;
    this.nextEventId = 1;
  }

  /**
   * @param {string} projectCode - Project code to normalize.
   * @returns {string} Uppercase project code.
   */
  normalizeProjectCode(/** @type {string} */ projectCode) {
    return String(projectCode || '').toUpperCase();
  }

  /**
   * @param {string} projectCode - Project code scope.
   * @param {SseSubscriber} subscriber - Open SSE subscriber.
   * @returns {number} Subscriber id for later unsubscribe.
   */
  subscribe(/** @type {string} */ projectCode, /** @type {SseSubscriber} */ subscriber) {
    const normalizedCode = this.normalizeProjectCode(projectCode);
    if (!this.subscribersByProject.has(normalizedCode)) {
      this.subscribersByProject.set(normalizedCode, new Map());
    }

    const subscriberId = this.nextSubscriberId++;
    this.subscribersByProject.get(normalizedCode).set(subscriberId, subscriber);
    return subscriberId;
  }

  unsubscribe(/** @type {any} */ projectCode, /** @type {any} */ subscriberId) {
    const normalizedCode = this.normalizeProjectCode(projectCode);
    const projectSubscribers = this.subscribersByProject.get(normalizedCode);
    if (!projectSubscribers) return;

    projectSubscribers.delete(subscriberId);
    if (projectSubscribers.size === 0) {
      this.subscribersByProject.delete(normalizedCode);
    }
  }

  getSubscriberCount(/** @type {any} */ projectCode) {
    const normalizedCode = this.normalizeProjectCode(projectCode);
    return this.subscribersByProject.get(normalizedCode)?.size || 0;
  }

  /**
   * @param {string} projectCode - Project code scope.
   * @param {RealtimeEventPayload} [payload] - Event payload to broadcast.
   * @returns {void}
   */
  publish(/** @type {string} */ projectCode, /** @type {RealtimeEventPayload} */ payload = {}) {
    const normalizedCode = this.normalizeProjectCode(projectCode);
    const projectSubscribers = this.subscribersByProject.get(normalizedCode);
    if (!projectSubscribers || projectSubscribers.size === 0) return;

    const event = {
      id: this.nextEventId++,
      timestamp: new Date().toISOString(),
      projectCode: normalizedCode,
      ...payload,
    };

    const sseMessage = this.toSseMessage(event);
    for (const [subscriberId, subscriber] of projectSubscribers.entries()) {
      try {
        subscriber.send(sseMessage);
      } catch {
        // Drop dead subscribers so one broken connection does not poison broadcasts.
        this.unsubscribe(normalizedCode, subscriberId);
      }
    }
  }

  /**
   * @param {RealtimeEventPayload & { id: number, timestamp: string, projectCode: string }} event - Event envelope.
   * @returns {string} Encoded SSE message.
   */
  toSseMessage(/** @type {RealtimeEventPayload & { id: number, timestamp: string, projectCode: string }} */ event) {
    const eventName = event.eventType || 'message';
    return `id: ${event.id}\nevent: ${eventName}\ndata: ${JSON.stringify(event)}\n\n`;
  }
}
