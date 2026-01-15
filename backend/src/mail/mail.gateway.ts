// backend/src/mail/mail.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: (requestOrigin, callback) => {
            const whitelist = process.env.CORS_ORIGINS?.split(',') || [];

            if (process.env.NODE_ENV !== 'production') {
                whitelist.push('http://localhost:5173');
            }

            if (!requestOrigin || whitelist.indexOf(requestOrigin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    },
})
export class MailGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        // console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        // console.log(`Client disconnected: ${client.id}`);
    }

    // Frontend sẽ emit sự kiện 'join_room' kèm userId
    @SubscribeMessage('join_room')
    handleJoinRoom(client: Socket, userId: string) {
        client.join(userId); // Cho client chui vào phòng mang tên userId
        console.log(`🔌 Client ${client.id} joined room: ${userId}`);
    }
}