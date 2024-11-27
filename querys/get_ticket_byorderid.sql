CREATE FUNCTION get_ticket_byorderid(input_order_id uuid)
RETURNS TABLE (
  ticket_id text,
  unitprice float,
  name_on_ticket text,
  status text,
  ticket_code text,  
  zone_name text,
  event_name text,
  event_date text,  -- Formatted date
  event_time text,  -- Formatted time
  stadium_name text,
  created_at timestamp
) 
LANGUAGE sql
AS $$
  SELECT DISTINCT  -- Add DISTINCT to remove duplicates
    t.id AS ticket_id,
    t.unitprice AS unitprice,
    t.name_on_ticket AS name_on_ticket, 
    t.status AS status, 
    t.ticket_code AS ticket_code,
    z.name AS zone_name,
    ev.name AS event_name,
    TO_CHAR(ev.start_date, 'FMDay, DD FMMonth YYYY') AS event_date,  -- Format date
    CONCAT(TO_CHAR(ev.start_date, 'HH24:MI'), ' - ', TO_CHAR(ev.end_date, 'HH24:MI')) AS event_time,  -- Format time range
    s.name AS stadium_name,
    t.created_at AS created_at
  FROM 
    ticket AS t
  LEFT JOIN
    event AS ev ON t.event_id = ev.id
  LEFT JOIN 
    stadium AS s ON ev.stadium_id = s.id and s.partner_id = ev.partner_id
  LEFT JOIN 
    stadium_zone AS z ON s.id = z.stadium_id
  WHERE 
    t.order_id = input_order_id
  ORDER BY 
    t.created_at ASC;
$$;
