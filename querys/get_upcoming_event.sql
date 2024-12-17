
create function get_upcoming_event () returns table (
  event_name text,
  coverphoto_url text,
  stadium_name text,
  full_address text,
  event_date text,
  event_year text,
  event_month text,
  event_day text,
  start_time text,
  start_date timestamp with time zone
) language sql
SECURITY DEFINER
SET search_path = public
 as $$
  SELECT
    ev.name AS event_name,
    ev.coverphoto_url AS coverphoto_url,
    s.name AS stadium_name,
    (l.address || ', ' || l.city) as full_address,
    TO_CHAR(ev.start_date, 'FMDay, DD FMMonth YYYY') AS event_date,  -- Format date
    TO_CHAR(ev.start_date, 'YYYY') AS event_year,
    TO_CHAR(ev.start_date, 'FMMonth') AS event_month,
    TO_CHAR(ev.start_date, 'DD') AS event_day,
    TO_CHAR(ev.start_date, 'HH24:MI') AS start_time,
    ev.start_date
  FROM 
    event AS ev 
  JOIN 
    stadium AS s ON s.partner_id = ev.partner_id
  JOIN
    location AS l ON s.location_id = l.id
  WHERE 
    ev.status = 'plan'
    AND ev.start_date > NOW()  -- Only previous events
  ORDER BY 
    ev.start_date DESC
$$;