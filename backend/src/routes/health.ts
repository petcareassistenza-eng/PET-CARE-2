import { Router, Request, Response } from 'express'
import { getStats } from '../utils/cache'
import * as fs from 'fs'
import * as path from 'path'

const r = Router()

/**
 * Health Check Endpoint
 * Verifica che il servizio sia attivo e funzionante
 * 
 * @route GET /healthz
 * @returns {object} 200 - { ok: true, status: 'healthy' }
 */
r.get('/healthz', (_req: Request, res: Response) => {
  res.json({ ok: true, status: 'healthy' })
})

/**
 * Readiness Check Endpoint
 * Verifica che il servizio sia pronto a ricevere traffico
 * Include controllo connessioni critiche (cache, etc.)
 * 
 * @route GET /readiness
 * @returns {object} 200 - { ok: true, ready: true, cache: {...} }
 */
r.get('/readiness', (_req: Request, res: Response) => {
  // Verifica cache statistics come proxy di salute del sistema
  const cacheStats = getStats()
  
  // Sistema è ready se la cache è inizializzata
  const isReady = cacheStats !== null
  
  res.json({ 
    ok: true, 
    ready: isReady,
    cache: cacheStats
  })
})

/**
 * Version Info Endpoint
 * Restituisce informazioni sulla versione deployata
 * Include GIT SHA, timestamp build, e metadata CI/CD
 * 
 * @route GET /version
 * @returns {object} 200 - Version information
 */
r.get('/version', (_req: Request, res: Response) => {
  try {
    // Cerca version.json generato in CI (backend/version.json)
    const versionPath = path.join(__dirname, '../../version.json')
    
    if (fs.existsSync(versionPath)) {
      const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'))
      return res.json({ ok: true, ...versionData })
    }
  } catch (error) {
    console.error('Error reading version.json:', error)
  }
  
  // Fallback a variabili d'ambiente (sviluppo locale)
  return res.json({ 
    ok: true, 
    version: process.env.GIT_SHA || process.env.GITHUB_SHA || 'dev',
    environment: process.env.NODE_ENV || 'development',
    builtAt: process.env.BUILD_TIMESTAMP || new Date().toISOString()
  })
})

/**
 * Cache Metrics Endpoint
 * Espone metriche della cache in-memory per monitoring
 * 
 * @route GET /metrics/cache
 * @returns {object} 200 - Cache statistics (hits, misses, hitRate, entries)
 */
r.get('/metrics/cache', (_req: Request, res: Response) => {
  const stats = getStats()
  res.json({ 
    ok: true, 
    cache: stats,
    timestamp: new Date().toISOString()
  })
})

/**
 * Process Info Endpoint (Internal)
 * Restituisce informazioni sul processo Node.js
 * Utile per debugging memory leaks o performance issues
 * 
 * @route GET /metrics/process
 * @returns {object} 200 - Process metrics
 */
r.get('/metrics/process', (_req: Request, res: Response) => {
  const memUsage = process.memoryUsage()
  const cpuUsage = process.cpuUsage()
  
  res.json({
    ok: true,
    process: {
      uptime: process.uptime(),
      memory: {
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`
      },
      cpu: {
        user: `${(cpuUsage.user / 1000).toFixed(2)} ms`,
        system: `${(cpuUsage.system / 1000).toFixed(2)} ms`
      },
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform
    },
    timestamp: new Date().toISOString()
  })
})

export default r
