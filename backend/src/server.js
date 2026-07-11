import app from './app.js';
import config from './config/env.js';

const startServer = () => {
  try {
    app.listen(config.port, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║         PGPOS Backend Server                ║
╠══════════════════════════════════════════════╣
║ Status:  Running                            ║
║ Port:    ${config.port.toString().padEnd(36)}║
║ Env:     ${config.nodeEnv.padEnd(36)}║
║ CORS:    ${(typeof config.cors.origin === 'function' ? 'dynamic' : Array.isArray(config.cors.origin) ? config.cors.origin.join(', ') : config.cors.origin || 'all').padEnd(36)}║
╚══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();