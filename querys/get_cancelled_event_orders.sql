CREATE OR REPLACE FUNCTION get_cancelled_event_orders(input_user_id uuid)
RETURNS TABLE (
    order_id TEXT,
    event_id TEXT,
    event_name TEXT,
    event_date timestamp,
    event_date_str TEXT,
    total_amount NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public AS $$
SELECT 
    o.id AS order_id,
    e.id AS event_id,
    e.name AS event_name,
    e.start_date AS event_date,
    TO_CHAR(e.start_date, 'FMDay, DD FMMonth YYYY') AS event_date_str,
    o.total_amount
FROM 
    public.event AS e
JOIN 
    public."order" AS o ON e.id = o.event_id
WHERE 
    e.status = 'cancelled'
    and o.user_id = input_user_id;
$$;