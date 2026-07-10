import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';

let io = null;

export const initSockets = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.email}`);
    socket.join(`user:${socket.user.userId}`);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user.email}`);
    });
  });

  return io;
};

export const getIO = () => io;

export const emitToUser = (userId, event, payload) => {
  if (io) io.to(`user:${userId}`).emit(event, payload);
};

export const emitToAll = (event, payload) => {
  if (io) io.emit(event, payload);
};