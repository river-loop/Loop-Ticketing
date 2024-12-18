CREATE OR REPLACE FUNCTION get_event_details(event_id uuid)
RETURNS TABLE (
    event_id text,
    event_name TEXT,
    event_description TEXT,
    event_date TEXT,
    event_time TEXT,
    status TEXT,
    event_coverphoto_url TEXT,
    ticket_max_buy INT,
    partner_id text,
    commission_rate NUMERIC,
    commission_type TEXT,
    stadium_id text,
    stadium_name TEXT,
    location_address TEXT,
    location_maplink TEXT
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public AS $$
    
  SELECT DISTINCT  -- Add DISTINCT to remove duplicates
    ev.id AS event_id,
    ev.name AS event_name, 
    ev.description AS event_description, 
    TO_CHAR(ev.start_date, 'FMDay, DD FMMonth YYYY') AS event_date,  -- Format date
    CONCAT(TO_CHAR(ev.start_date, 'HH24:MI'), ' - ', TO_CHAR(ev.end_date, 'HH24:MI')) AS event_time,  -- Format time range
    ev.status as status,
    ev.coverphoto_url AS event_coverphoto_url,
    ev.ticket_max_buy AS ticket_max_buy,
    p.id AS partner_id,
    p.commission_rate AS commission_rate,
    p.commission_type AS commission_type,
    s.id AS stadium_id,
    s.name AS stadium_name, 
    l.address AS location_address, 
    l.maplink AS location_maplink
  FROM 
    event AS ev
  LEFT JOIN
    partner AS p ON ev.partner_id = p.id
  LEFT JOIN 
    stadium AS s ON ev.stadium_id = s.id and s.partner_id = p.id
  LEFT JOIN 
    location AS l ON s.location_id = l.id
  WHERE 
    ev.id = event_id;

$$;
