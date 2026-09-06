import { z } from 'zod';

export const shippingSchema = z.discriminatedUnion('shippingMode', [
  z.object({ shippingMode: z.literal('courier'), shippingMethod: z.string().trim().min(2).max(120),
    shippingCost: z.union([z.number(), z.string().trim().min(1)]).transform(Number).pipe(z.number().min(0).max(10000)), shippingTime: z.string().trim().min(2).max(200) }),
  z.object({ shippingMode: z.literal('pickup'), shippingMethod: z.string().trim().min(2).max(120),
    shippingCost: z.union([z.number(), z.string().trim().min(1)]).transform(Number).pipe(z.number().max(0).min(0)), shippingTime: z.string().trim().min(2).max(200) }),
]);
export function parseShipping(form: FormData) {
  const mode = form.get('shippingMode');
  // Older app versions may still publish without these fields; such listings show "not specified".
  if (mode === null) return null;
  if (form.get('shippingCost') === null || form.get('shippingCost') === '') throw new Error('Indica il costo di spedizione, anche se gratuito.');
  const parsed = shippingSchema.safeParse(Object.fromEntries(['shippingMode', 'shippingMethod', 'shippingCost', 'shippingTime'].map((key) => [key, form.get(key)])));
  if (!parsed.success) throw new Error('Controlla modalità, costo e tempi di consegna. Il ritiro a mano deve avere costo zero.');
  return { shipping_mode: parsed.data.shippingMode, shipping_method: parsed.data.shippingMethod,
    shipping_cost_cents: Math.round(parsed.data.shippingCost * 100), shipping_time: parsed.data.shippingTime };
}
