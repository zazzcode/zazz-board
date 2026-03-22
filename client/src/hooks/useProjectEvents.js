import { useEffect, useRef } from 'react';

function parseSseBlock(block) {
  const lines = block.split('\n');
  let eventName = 'message';
  const dataLines = [];

  for (const line of lines) {
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) return null;

  try {
    return { eventName, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return null;
  }
}

/**
 * Subscribe to project-scoped realtime events via SSE over fetch streaming.
 * Reconnects automatically if the stream disconnects.
 */
export function useProjectEvents(projectCode, { enabled = true, onEvent } = {}) {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || !projectCode) return;

    const token = localStorage.getItem('TB_TOKEN');
    if (!token) return;

    let disposed = false;
    let reconnectTimer = null;
    let controller = null;

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 1500);
    };

    const connect = async () => {
      if (disposed) return;

      controller = new AbortController();
      let reader = null;
      let shouldReconnect = false;
      try {
        const response = await fetch(
          `http://localhost:3030/projects/${encodeURIComponent(projectCode)}/events`,
          {
            method: 'GET',
            headers: {
              'TB_TOKEN': token,
              'Accept': 'text/event-stream',
              'Cache-Control': 'no-cache',
            },
            signal: controller.signal,
          }
        );

        if (!response.ok || !response.body) {
          shouldReconnect = true;
          return;
        }

        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!disposed) {
          const { value, done } = await reader.read();
          if (done) {
            shouldReconnect = !disposed;
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          let boundaryIndex = buffer.indexOf('\n\n');
          while (boundaryIndex !== -1) {
            const block = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + 2);
            boundaryIndex = buffer.indexOf('\n\n');

            const parsed = parseSseBlock(block);
            if (!parsed) continue;

            if (onEventRef.current) {
              onEventRef.current(parsed.data, parsed.eventName);
            }
          }
        }
      } catch (error) {
        if (!disposed && error.name !== 'AbortError') {
          shouldReconnect = true;
        }
      } finally {
        if (reader) {
          try {
            await reader.cancel();
          } catch {
            // no-op
          }
        }
        if (!disposed && shouldReconnect) {
          scheduleReconnect();
        }
      }
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (controller) controller.abort();
    };
  }, [enabled, projectCode]);
}
