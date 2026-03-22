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

  normalizeProjectCode(projectCode) {
    return String(projectCode || '').toUpperCase();
  }

  subscribe(projectCode, subscriber) {
    const normalizedCode = this.normalizeProjectCode(projectCode);
    if (!this.subscribersByProject.has(normalizedCode)) {
      this.subscribersByProject.set(normalizedCode, new Map());
    }

    const subscriberId = this.nextSubscriberId++;
    this.subscribersByProject.get(normalizedCode).set(subscriberId, subscriber);
    return subscriberId;
  }

  unsubscribe(projectCode, subscriberId) {
    const normalizedCode = this.normalizeProjectCode(projectCode);
    const projectSubscribers = this.subscribersByProject.get(normalizedCode);
    if (!projectSubscribers) return;

    projectSubscribers.delete(subscriberId);
    if (projectSubscribers.size === 0) {
      this.subscribersByProject.delete(normalizedCode);
    }
  }

  getSubscriberCount(projectCode) {
    const normalizedCode = this.normalizeProjectCode(projectCode);
    return this.subscribersByProject.get(normalizedCode)?.size || 0;
  }

  publish(projectCode, payload = {}) {
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

  toSseMessage(event) {
    const eventName = event.eventType || 'message';
    return `id: ${event.id}\nevent: ${eventName}\ndata: ${JSON.stringify(event)}\n\n`;
  }
}
