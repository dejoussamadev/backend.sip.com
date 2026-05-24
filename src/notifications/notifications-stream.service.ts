import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Notification, Role } from '@prisma/client';
import { Observable, Subject, finalize, interval, map, merge } from 'rxjs';

interface Subscriber {
  userId: number;
  role: Role;
  subject: Subject<Notification>;
}

/**
 * In-memory subscriber registry that fans real-time notifications out to every
 * connected SSE client. Mirrors the API the WebSocket gateway used to expose
 * (sendToAdmins / sendToUser) so the caller in NotificationsService changes
 * by exactly two lines.
 *
 * Single-instance only: a subscriber registered on pod A won't receive an
 * event published on pod B. Fine for the current single-instance Render
 * deployment; swap for Redis pub/sub when we scale horizontally.
 */
@Injectable()
export class NotificationsStreamService {
  private readonly logger = new Logger(NotificationsStreamService.name);
  private readonly byUser = new Map<number, Set<Subscriber>>();
  private readonly byRole = new Map<Role, Set<Subscriber>>();

  // Idle proxies (Render, Vercel) drop long-lived HTTP connections without
  // traffic. Emit a comment line every 25s so the connection stays open.
  private static readonly HEARTBEAT_MS = 25_000;

  subscribe(userId: number, role: Role): Observable<MessageEvent> {
    const subject = new Subject<Notification>();
    const subscriber: Subscriber = { userId, role, subject };

    this.addToBucket(this.byUser, userId, subscriber);
    this.addToBucket(this.byRole, role, subscriber);
    this.logger.log(`SSE client subscribed: user ${userId} (${role})`);

    const notifications$ = subject
      .asObservable()
      .pipe(map((notification) => this.toMessageEvent(notification)));

    const heartbeats$ = interval(NotificationsStreamService.HEARTBEAT_MS).pipe(
      map(() => ({ type: 'ping', data: '' }) satisfies MessageEvent),
    );

    return merge(notifications$, heartbeats$).pipe(
      finalize(() => {
        this.removeFromBucket(this.byUser, userId, subscriber);
        this.removeFromBucket(this.byRole, role, subscriber);
        subject.complete();
        this.logger.log(`SSE client unsubscribed: user ${userId} (${role})`);
      }),
    );
  }

  publishToAdmins(notification: Notification): void {
    const targets = this.byRole.get(Role.ADMIN);
    if (!targets) return;
    for (const sub of targets) sub.subject.next(notification);
  }

  publishToUser(userId: number, notification: Notification): void {
    const targets = this.byUser.get(userId);
    if (!targets) return;
    for (const sub of targets) sub.subject.next(notification);
  }

  private toMessageEvent(notification: Notification): MessageEvent {
    return {
      type: 'notification',
      data: notification as unknown as Record<string, unknown>,
    };
  }

  private addToBucket<K>(
    map: Map<K, Set<Subscriber>>,
    key: K,
    sub: Subscriber,
  ): void {
    const bucket = map.get(key);
    if (bucket) bucket.add(sub);
    else map.set(key, new Set([sub]));
  }

  private removeFromBucket<K>(
    map: Map<K, Set<Subscriber>>,
    key: K,
    sub: Subscriber,
  ): void {
    const bucket = map.get(key);
    if (!bucket) return;
    bucket.delete(sub);
    if (bucket.size === 0) map.delete(key);
  }
}
