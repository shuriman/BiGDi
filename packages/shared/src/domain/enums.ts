export enum JobType {
  SERPAPI = 'serpapi',
  SCRAPE = 'scrape',
  ANALYZE = 'analyze',
  GENERATE = 'generate',
  PIPELINE = 'pipeline'
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer'
}

export enum LLMProvider {
  OPENAI = 'openai',
  CLAUDE = 'claude',
  GEMINI = 'gemini'
}

export interface JobProgress {
  current: number;
  total: number;
  message?: string;
  step?: string;
}