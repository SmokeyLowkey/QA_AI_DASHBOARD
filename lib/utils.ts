import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combine class names with Tailwind
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize a string for use as an S3 folder name
 */
export function sanitizeForS3(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-')        // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '');     // Remove leading/trailing hyphens
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const { db } = await import('@/lib/db');
    
    return db.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        details: data.details || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logs should not block main functionality
  }
}
