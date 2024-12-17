create function get_future_event (input_user_id uuid) returns table (
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
  start_date timestamp with time zone,
  purchase_at timestamp
) language sql 
SECURITY DEFINER
SET search_path = public
as $$
 SELECT
    od.id AS order_id,
    ev.id AS event_id,
    ev.name AS event_name,
    ev.coverphoto_url AS coverphoto_url,
    s.name AS stadium_name,
    (l.address || ', ' || l.city) as full_address,
    TO_CHAR(ev.start_date, 'FMDay, DD FMMonth YYYY') AS event_date,  -- Format date
    TO_CHAR(ev.start_date, 'YYYY') AS event_year,
    TO_CHAR(ev.start_date, 'FMMonth') AS event_month,
    TO_CHAR(ev.start_date, 'DD') AS event_day,
    ev.start_date,
    od.purchase_at
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
    AND ev.start_date > NOW()  -- Only future events
  ORDER BY 
    ev.start_date ASC, od.purchase_at ASC

$$;