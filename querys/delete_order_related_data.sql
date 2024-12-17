CREATE OR REPLACE FUNCTION delete_order_related_data(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  -- Delete from the ticket table
  DELETE FROM ticket
  WHERE order_id = p_order_id;

  -- Delete from the payment table
  DELETE FROM payment
  WHERE order_id = p_order_id;

  -- Delete from the order table
  DELETE FROM "order"
  WHERE id = p_order_id;

EXCEPTION
  -- Handle any errors
  WHEN OTHERS THEN
    RAISE EXCEPTION 'An error occurred while deleting order-related data for order ID: %', p_order_id;
END;
$$;
