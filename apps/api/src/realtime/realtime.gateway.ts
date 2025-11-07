import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createLogger } from '@zemo/shared/logger';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = createLogger('realtime-gateway');

  constructor(private readonly realtimeService: RealtimeService) {}

  handleConnection(client: Socket) {
    this.logger.info({ clientId: client.id }, 'Client connected to realtime gateway');
    
    // Join client to general room
    client.join('general');
    
    // Send initial connection event
    client.emit('connected', {
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.info({ clientId: client.id }, 'Client disconnected from realtime gateway');
  }

  @SubscribeMessage('subscribe-job')
  async handleSubscribeJob(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string },
  ) {
    this.logger.info({ clientId: client.id, jobId: data.jobId }, 'Client subscribed to job updates');
    
    // Join client to job-specific room
    client.join(`job:${data.jobId}`);
    
    // Send current job status
    const jobStatus = await this.realtimeService.getJobStatus(data.jobId);
    client.emit('job-status', jobStatus);
  }

  @SubscribeMessage('unsubscribe-job')
  handleUnsubscribeJob(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string },
  ) {
    this.logger.info({ clientId: client.id, jobId: data.jobId }, 'Client unsubscribed from job updates');
    
    // Leave job-specific room
    client.leave(`job:${data.jobId}`);
  }

  @SubscribeMessage('subscribe-jobs')
  handleSubscribeJobs(@ConnectedSocket() client: Socket) {
    this.logger.info({ clientId: client.id }, 'Client subscribed to all job updates');
    
    // Join client to jobs room
    client.join('jobs');
  }

  // Methods to broadcast events to clients
  broadcastJobUpdate(jobId: string, data: any) {
    this.server.to(`job:${jobId}`).emit('job-update', { jobId, ...data });
    this.server.to('jobs').emit('job-update', { jobId, ...data });
  }

  broadcastJobProgress(jobId: string, progress: any) {
    this.server.to(`job:${jobId}`).emit('job-progress', { jobId, progress });
  }

  broadcastJobCompletion(jobId: string, result: any) {
    this.server.to(`job:${jobId}`).emit('job-completed', { jobId, result });
    this.server.to('jobs').emit('job-completed', { jobId, result });
  }

  broadcastJobError(jobId: string, error: any) {
    this.server.to(`job:${jobId}`).emit('job-error', { jobId, error });
    this.server.to('jobs').emit('job-error', { jobId, error });
  }

  broadcastSystemNotification(notification: any) {
    this.server.emit('system-notification', notification);
  }
}