import { Router } from 'express';

export function createHealthRouter(storageType: 'file' | 'memory'): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'Waste2Watt Local Intelligence API',
      version: '0.1.0',
      uptimeSeconds: parseFloat(process.uptime().toFixed(1)),
      storageType,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
