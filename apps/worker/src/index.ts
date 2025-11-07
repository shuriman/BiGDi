import { bootstrap } from './bootstrap';

bootstrap().catch((error) => {
  console.error('Failed to start worker service:', error);
  process.exit(1);
});