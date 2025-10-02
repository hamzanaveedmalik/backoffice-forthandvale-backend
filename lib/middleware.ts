import { Prisma } from '@prisma/client';

// Middleware to auto-calculate computed totals
export const computedTotalsMiddleware: Prisma.Middleware = async (params, next) => {
  // Handle QuoteLine operations
  if (params.model === 'QuoteLine') {
    if (params.action === 'create' || params.action === 'update') {
      const data = params.args.data as any;
      if (data.qty && data.unitPrice) {
        data.lineTotal = data.qty * data.unitPrice;
      }
    }
  }

  // Handle OrderLine operations
  if (params.model === 'OrderLine') {
    if (params.action === 'create' || params.action === 'update') {
      const data = params.args.data as any;
      if (data.qty && data.unitPrice) {
        data.lineTotal = data.qty * data.unitPrice;
      }
    }
  }

  // Execute the operation
  const result = await next(params);

  // After operation, recalculate parent totals
  if (params.model === 'QuoteLine' && (params.action === 'create' || params.action === 'update' || params.action === 'delete')) {
    await recalculateQuoteTotal(params.args.data?.quoteId || result?.quoteId);
  }

  if (params.model === 'OrderLine' && (params.action === 'create' || params.action === 'update' || params.action === 'delete')) {
    await recalculateOrderTotal(params.args.data?.orderId || result?.orderId);
  }

  return result;
};

// Helper function to recalculate quote total
async function recalculateQuoteTotal(quoteId: string) {
  if (!quoteId) return;

  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Get all quote lines
    const lines = await prisma.quoteLine.findMany({
      where: { quoteId }
    });

    // Calculate totals
    const subtotal = lines.reduce((sum, line) => sum + Number(line.lineTotal), 0);

    // Get quote to access other fields
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId }
    });

    if (quote) {
      const total = subtotal + Number(quote.shipping) + Number(quote.tax) - Number(quote.discount);

      await prisma.quote.update({
        where: { id: quoteId },
        data: {
          subtotal,
          total
        }
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error recalculating quote total:', error);
  }
}

// Helper function to recalculate order total
async function recalculateOrderTotal(orderId: string) {
  if (!orderId) return;

  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Get all order lines
    const lines = await prisma.orderLine.findMany({
      where: { orderId }
    });

    // Calculate totals
    const subtotal = lines.reduce((sum, line) => sum + Number(line.lineTotal), 0);

    // Get order to access other fields
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (order) {
      const total = subtotal + Number(order.shipping) + Number(order.tax) - Number(order.discount);

      await prisma.order.update({
        where: { id: orderId },
        data: {
          subtotal,
          total
        }
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error recalculating order total:', error);
  }
}