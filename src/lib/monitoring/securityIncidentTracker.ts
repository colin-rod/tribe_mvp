import { createLogger } from '@/lib/logger'

const logger = createLogger('SecurityIncidentTracker')

export type SecurityIncidentSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SecurityIncident {
  type: string
  severity: SecurityIncidentSeverity
  source: string
  description: string
  metadata?: Record<string, unknown>
}

const incidentCounters = new Map<string, number>()

/**
 * Track a security incident and emit structured logs for alerting/monitoring.
 */
export function trackSecurityIncident(incident: SecurityIncident): void {
  const occurrences = (incidentCounters.get(incident.type) ?? 0) + 1
  incidentCounters.set(incident.type, occurrences)

  logger.error('Security incident detected', {
    ...incident,
    occurrences,
    alert: true,
    timestamp: new Date().toISOString()
  })
}

/**
 * Return counts for recorded security incidents.
 * Useful for diagnostics and testing.
 */
export function getSecurityIncidentMetrics(): Record<string, { count: number }> {
  const metrics: Record<string, { count: number }> = {}

  for (const [type, count] of incidentCounters.entries()) {
    metrics[type] = { count }
  }

  return metrics
}

/**
 * Reset recorded metrics (primarily for testing scenarios).
 */
export function resetSecurityIncidentMetrics(): void {
  incidentCounters.clear()
}
