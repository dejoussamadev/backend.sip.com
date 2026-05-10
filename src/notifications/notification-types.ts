import { NotificationType } from '@prisma/client';

export const LOGIN_REQUEST_CREATED =
  'LOGIN_REQUEST_CREATED' as NotificationType;
export const LOGIN_REQUEST_APPROVED =
  'LOGIN_REQUEST_APPROVED' as NotificationType;
export const LOGIN_REQUEST_REJECTED =
  'LOGIN_REQUEST_REJECTED' as NotificationType;
export const RESERVATION_SUBMITTED =
  'RESERVATION_SUBMITTED' as NotificationType;
export const RESERVATION_APPROVED =
  'RESERVATION_APPROVED' as NotificationType;
export const RESERVATION_REJECTED =
  'RESERVATION_REJECTED' as NotificationType;
