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
║ CORS:    ${config.cors.origin.padEnd(36)}║
╚══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();