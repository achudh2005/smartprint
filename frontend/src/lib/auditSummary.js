/**
 * Generates human-readable descriptions and badge configurations for AuditLog records
 */
export function getAuditSummary(log) {
  if (!log) return { summary: 'System Event', variant: 'gray' }

  const action = log.action || ''
  const details = log.details || log.newData || {}
  const targetName = log.shop?.name || (log.user?.name || log.user?.email) || log.resourceId || ''

  switch (action) {
    case 'LOGIN_SUCCESS':
      return {
        summary: `User logged in successfully${log.ipAddress ? ` from ${log.ipAddress}` : ''}`,
        variant: 'green',
      }
    case 'LOGIN_FAILED':
      return {
        summary: `Failed login attempt: ${details.reason || 'Invalid credentials'}${details.email ? ` (${details.email})` : ''}`,
        variant: 'red',
      }
    case 'CREATE_SHOP_OWNER':
      return {
        summary: `Provisioned new shop owner account "${details.ownerEmail || targetName}" with temporary credentials`,
        variant: 'blue',
      }
    case 'CREATE_USER':
      return {
        summary: `Created platform user account "${details.email || targetName}" (${details.role || 'OWNER'})`,
        variant: 'blue',
      }
    case 'RESET_PASSWORD':
      return {
        summary: `Administrative password reset issued for user #${log.resourceId || targetName}`,
        variant: 'yellow',
      }
    case 'PASSWORD_CHANGED':
      return {
        summary: `User changed password successfully`,
        variant: 'green',
      }
    case 'USER_UPDATED':
      return {
        summary: `Updated user account settings/status for ${targetName || `User #${log.resourceId}`}`,
        variant: 'yellow',
      }
    case 'REVOKE_SESSION':
      return {
        summary: `Revoked active session token (${details.tokenId ? `Token #${details.tokenId}` : 'Session'})`,
        variant: 'yellow',
      }
    case 'REVOKE_ALL_SESSIONS':
      return {
        summary: `Terminated all active sessions for ${targetName || `User #${log.resourceId}`}`,
        variant: 'red',
      }
    case 'AUTO_SUSPENDED_BRUTE_FORCE':
      return {
        summary: `Account automatically suspended after 5 repeated failed login attempts`,
        variant: 'red',
      }
    case 'IMPERSONATION_START':
      return {
        summary: `Super Admin initiated support impersonation session for ${targetName || `User #${log.resourceId}`}`,
        variant: 'yellow',
      }
    case 'USER_NOTE_UPDATED':
      return {
        summary: `Updated internal administrative note on user #${log.resourceId}`,
        variant: 'gray',
      }
    case 'USER_SESSION_LIMIT_UPDATED':
      return {
        summary: `Updated concurrent session limit for user #${log.resourceId} to ${details.maxActiveSessions ?? 'Default (3)'}`,
        variant: 'gray',
      }
    case 'BULK_ACTION_SUSPEND':
      return {
        summary: `Bulk suspension executed for user #${log.resourceId}`,
        variant: 'red',
      }
    case 'BULK_ACTION_ACTIVATE':
      return {
        summary: `Bulk reactivation executed for user #${log.resourceId}`,
        variant: 'green',
      }
    case 'BULK_ACTION_REVOKE_SESSIONS':
      return {
        summary: `Bulk forced logout (revoked all sessions) for user #${log.resourceId}`,
        variant: 'yellow',
      }
    case 'PLATFORM_BROADCAST':
      return {
        summary: `Sent platform broadcast announcement: "${details.subject || 'Announcement'}"`,
        variant: 'blue',
      }
    case 'SHOP_ACTIVE':
      return {
        summary: `Reactivated shop "${log.shop?.name || `Shop #${log.shopId}`}"`,
        variant: 'green',
      }
    case 'SHOP_SUSPENDED':
      return {
        summary: `Suspended shop "${log.shop?.name || `Shop #${log.shopId}`}"`,
        variant: 'red',
      }
    default:
      return {
        summary: log.action ? log.action.replace(/_/g, ' ') : 'Platform operation logged',
        variant: 'gray',
      }
  }
}
