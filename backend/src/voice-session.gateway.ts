import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { WebSocket } from 'ws';
import {
  ClientWsEventSchema,
  WS_EVENTS,
  createServerEvent,
  type ClientWsEvent,
} from '@airealtalk/shared';

@WebSocketGateway({ path: '/', cors: { origin: '*' } })
export class VoiceSessionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(VoiceSessionGateway.name);

  handleConnection(client: WebSocket): void {
    this.logger.log('WebSocket client connected');

    client.on('message', (raw) => {
      this.handleMessage(client, raw);
    });
  }

  handleDisconnect(): void {
    this.logger.log('WebSocket client disconnected');
  }

  private handleMessage(client: WebSocket, raw: unknown): void {
    try {
      const text = typeof raw === 'string' ? raw : raw?.toString();
      if (!text) {
        return;
      }

      const json: unknown = JSON.parse(text);
      const event = ClientWsEventSchema.parse(json);
      this.dispatch(client, event);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid WebSocket message';
      this.logger.warn(`Failed to handle WS message: ${message}`);
      client.send(
        JSON.stringify(
          createServerEvent(WS_EVENTS.ERROR, {
            code: 'INVALID_MESSAGE',
            message,
          }),
        ),
      );
    }
  }

  private dispatch(client: WebSocket, event: ClientWsEvent): void {
    switch (event.type) {
      case WS_EVENTS.SESSION_CONNECT:
        this.logger.log(
          `Session connect${event.payload.scenarioId ? `: ${event.payload.scenarioId}` : ''}`,
        );
        break;
      case WS_EVENTS.SESSION_PING:
        client.send(
          JSON.stringify(createServerEvent(WS_EVENTS.SESSION_PONG, {})),
        );
        break;
      case WS_EVENTS.AUDIO_START:
      case WS_EVENTS.AUDIO_CHUNK:
      case WS_EVENTS.AUDIO_END:
      case WS_EVENTS.SESSION_END:
        this.logger.debug(`Ignored event in Issue #02 scope: ${event.type}`);
        break;
      default: {
        const _exhaustive: never = event;
        return _exhaustive;
      }
    }
  }
}
