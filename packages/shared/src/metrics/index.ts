import { register, Counter, Histogram, Gauge } from 'prom-client';

const metricsRegistry = register;

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry]
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry]
});

export const jobsTotal = new Counter({
  name: 'jobs_total',
  help: 'Total number of jobs processed',
  labelNames: ['type', 'status'],
  registers: [metricsRegistry]
});

export const jobsDuration = new Histogram({
  name: 'jobs_duration_seconds',
  help: 'Duration of job processing in seconds',
  labelNames: ['type', 'status'],
  registers: [metricsRegistry]
});

export const activeJobs = new Gauge({
  name: 'active_jobs',
  help: 'Number of currently active jobs',
  labelNames: ['type'],
  registers: [metricsRegistry]
});

export const queueSize = new Gauge({
  name: 'queue_size',
  help: 'Current size of job queues',
  labelNames: ['queue'],
  registers: [metricsRegistry]
});

export const externalApiCalls = new Counter({
  name: 'external_api_calls_total',
  help: 'Total number of external API calls',
  labelNames: ['provider', 'status'],
  registers: [metricsRegistry]
});

export function getMetricsRegistry() {
  return metricsRegistry;
}