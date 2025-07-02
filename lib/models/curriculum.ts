import { z } from 'zod';
import { SubjectSchema } from './subject';

export const CurriculumSchema = z.array(SubjectSchema);

export type Curriculum = z.infer<typeof CurriculumSchema>; 