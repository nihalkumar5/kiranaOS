import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const storeId = client.handshake.query.storeId as string;
    if (storeId) {
      client.join(storeId);
      console.log(`Client ${client.id} joined store channel: ${storeId}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  sendToStore(storeId: string, event: string, payload: any) {
    if (this.server) {
      this.server.to(storeId).emit(event, payload);
    }
  }
}
