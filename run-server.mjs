#!/usr/bin/env node
import('./server/server.ts').catch(err => {
  console.error('Failed to import server:', err);
  process.exit(1);
});
