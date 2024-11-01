CREATE FUNCTION get_order_item(input_event_id uuid,input_order_id uuid)
RETURNS TABLE(
    event_name TEXT,
    event_description TEXT,
    event_coverphoto_url TEXT,
    ticket_count int,
    total_ticket_price float
)
LANGUAGE sql
AS $$
   SELECT 
        event.name AS event_name,
        event.description AS event_description,
        event.coverphoto_url AS event_coverphoto_url,
        COUNT(ticket.id) AS ticket_count,
        ticket.unitprice AS total_ticket_price
    FROM 
        "order"
    JOIN 
        event ON "order".event_id = event.id
    JOIN 
        ticket ON "order".id = ticket.order_id
    WHERE 
        "order".event_id = input_event_id 
        AND "order".id = input_order_id
    GROUP BY 
        event.name, 
        event.description, 
        event.coverphoto_url, 
        ticket.order_id,
        ticket.unitprice;
$$;
