import { z } from 'zod';

export const SubjectSchema = z.object({
  Course: z.string(),
  ID: z.string(),
  Year: z.union([z.number(), z.string()]),
  Semester: z.union([z.number(), z.null()]),
  Credits: z.string().nullable(),
  'Prerequisites to Take': z.string().nullable(),
  'Prerequisites to Pass': z.string().nullable(),
  'Prerequisite to Take for': z.string().nullable(),
  'Prerequisite to Pass for': z.string().nullable(),
  status: z.string().optional(),
  grade: z.union([z.number(), z.string()]).optional(),
});

export type Subject = z.infer<typeof SubjectSchema>; 