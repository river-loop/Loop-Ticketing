CREATE FUNCTION get_event_details(event_id uuid)
RETURNS TABLE (
  event_id text,
  event_name text,
  event_description text,
  event_date text,  -- Formatted date
  event_time text,  -- Formatted time
  event_coverphoto_url text,
  partner_id text,
  stadium_id text,
  stadium_name text,
  location_address text,
  location_maplink text
) 
LANGUAGE sql
AS $$
  SELECT DISTINCT  -- Add DISTINCT to remove duplicates
    ev.id AS event_id,
    ev.name AS event_name, 
    ev.description AS event_description, 
    TO_CHAR(ev.start_date, 'FMDay, DD FMMonth YYYY') AS event_date,  -- Format date
    CONCAT(TO_CHAR(ev.start_date, 'HH24:MI'), ' - ', TO_CHAR(ev.end_date, 'HH24:MI')) AS event_time,  -- Format time range
    ev.coverphoto_url AS event_coverphoto_url,
    p.id AS partner_id,
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
