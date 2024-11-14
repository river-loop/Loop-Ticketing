CREATE OR REPLACE FUNCTION get_dashboard_summary(input_event_id uuid)
RETURNS TABLE (
    total_sales NUMERIC,
    total_quantity INT,
    total_tickets_scanned INT,
    remaining_tickets INT
)
LANGUAGE sql
AS $$
    SELECT 
        -- Sum of final_amount for completed orders
        COALESCE(SUM(o.final_amount), 0) AS total_sales,
        
        -- Sum of count for completed orders
        COALESCE(SUM(o.count), 0) AS total_quantity,
        
        -- Count of scanned tickets
        COALESCE((SELECT COUNT(*) 
                  FROM ticket t 
                  WHERE t.status = 'SCANNED' AND t.event_id = input_event_id), 0) AS total_tickets_scanned,
        
        -- Remaining tickets calculation
        COALESCE((SELECT SUM(q.max_limit) 
                  FROM ticket_quota q 
                  WHERE q.event_id = event_id), 0) - 
        COALESCE(SUM(o.count), 0) AS remaining_tickets
    FROM "order" o
    WHERE o.status = 'COMPLETED' 
    AND o.event_id = input_event_id;
$$;