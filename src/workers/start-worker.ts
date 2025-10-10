#!/usr/bin/env node
/**
 * Notification Worker Startup Script
 *
 * This script starts the notification worker as a standalone process.
 * It can be run:
 * - Locally during development: npm run worker
 * - In production as a separate service/container
 * - Alongside the main Next.js app
 *
 * The worker will:
 * 1. Connect to Redis and Supabase
 * 2. Poll the notification_jobs table every 10 seconds
 * 3. Queue pending jobs for processing
 * 4. Send notifications via email/SMS/push
 * 5. Update job status and log delivery results
 *
 * Usage:
 *   ts-node src/workers/start-worker.ts
 *   npm run worker
 */

import { getNotificationWorker } from './notificationWorker'
import { createLogger } from '../lib/logger'

const logger = createLogger('WorkerStartup')

async function startWorker() {
  try {
    logger.info('Starting notification worker...')

    // Get worker instance
    const worker = getNotificationWorker()

    // Initialize and start
    await worker.initialize()
    await worker.startWorker()

    logger.info('Notification worker started successfully')
    logger.info('Worker is now processing notifications in the background')
    logger.info('Press Ctrl+C to stop')

    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info('Received shutdown signal')
      await worker.close()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    // Keep process alive
    setInterval(async () => {
      try {
        const metrics = await worker.getMetrics()
        if (metrics) {
          logger.debug('Worker metrics', metrics)
        }
      } catch (error) {
        logger.error('Error getting metrics', {
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }, 60000) // Log metrics every minute
  } catch (error) {
    logger.error('Failed to start notification worker', {
      error: error instanceof Error ? error.message : String(error)
    })
    process.exit(1)
  }
}

// Start the worker
startWorker()
