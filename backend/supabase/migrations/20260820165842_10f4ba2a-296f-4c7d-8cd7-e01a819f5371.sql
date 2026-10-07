ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS fulfilled_quantity integer NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5;

CREATE POLICY "Admins can update order items"
ON public.order_items FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete orders"
ON public.orders FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, UPDATE ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;