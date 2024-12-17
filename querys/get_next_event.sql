CREATE FUNCTION get_next_event(input_user_id uuid) 
RETURNS TABLE (
  order_id text,
  event_id text,
  event_name text,
  coverphoto_url text,
  stadium_name text,
  full_address text,
  event_date text,
  event_year text,
  event_month text,
  event_day text,
  event_time text,
  start_date timestamp with time zone
) 
LANGUAGE sql 
SECURITY DEFINER
SET search_path = public
AS $$
 SELECT
    od.id AS order_id,
    od.event_id AS event_id,
    ev.name AS event_name,
    ev.coverphoto_url AS coverphoto_url,
    s.name AS stadium_name,
    (l.address || ', ' || l.city) as full_address,
    TO_CHAR(ev.start_date, 'FMDay, DD FMMonth YYYY') AS event_date,  -- Format date
    TO_CHAR(ev.start_date, 'YYYY') AS event_year,
    TO_CHAR(ev.start_date, 'FMMonth') AS event_month,
    TO_CHAR(ev.start_date, 'DD') AS event_day,
    CONCAT(TO_CHAR(ev.start_date, 'HH24:MI'), ' - ', TO_CHAR(ev.end_date, 'HH24:MI')) AS event_time,  -- Format time range
    ev.start_date
  FROM 
    "order" AS od
  JOIN 
    event AS ev ON od.event_id = ev.id AND od.partner_id = ev.partner_id
  JOIN 
    stadium AS s ON s.partner_id = ev.partner_id
  JOIN
    location AS l ON s.location_id = l.id
  WHERE 
    od.user_id = input_user_id
    AND od.status = 'COMPLETED'
    AND ev.status = 'sale'
    AND ev.end_date > NOW()  -- Only upcoming events
  ORDER BY 
    ev.start_date ASC  -- Order by the next event
  LIMIT 1;  -- Return only the next event
$$;
