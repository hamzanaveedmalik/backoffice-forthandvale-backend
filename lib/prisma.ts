import { PrismaClient } from "@prisma/client";
import { computedTotalsMiddleware } from './middleware.js';

export const prisma = new PrismaClient();

// Add middleware for computed totals
prisma.$use(computedTotalsMiddleware);