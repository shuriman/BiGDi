import { z } from 'zod';

export const CreateJobRequestSchema = z.object({
  type: z.enum(['serpapi', 'scrape', 'analyze', 'generate', 'pipeline']),
  params: z.record(z.any()),
  priority: z.number().min(1).max(10).optional().default(5),
  delay: z.number().optional().default(0)
});

export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;

export const JobResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  progress: z.object({
    current: z.number(),
    total: z.number(),
    message: z.string().optional(),
    step: z.string().optional()
  }).optional(),
  result: z.any().optional(),
  error: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional()
});

export type JobResponse = z.infer<typeof JobResponseSchema>;

export const ApiKeyRequestSchema = z.object({
  provider: z.string(),
  value: z.string(),
  metadata: z.record(z.string()).optional()
});

export type ApiKeyRequest = z.infer<typeof ApiKeyRequestSchema>;

export const PromptRequestSchema = z.object({
  key: z.string(),
  body: z.string(),
  version: z.number().optional().default(1)
});

export type PromptRequest = z.infer<typeof PromptRequestSchema>;