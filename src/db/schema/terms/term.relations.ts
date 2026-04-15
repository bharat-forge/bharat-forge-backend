import { relations } from 'drizzle-orm';
import { termsConditions } from './term.schema';

export const termsRelations = relations(termsConditions, () => ({}));