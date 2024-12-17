Create FUNCTION get_ticketquota_bystadiumid(input_stadium_id uuid,input_event_id uuid)
RETURNS TABLE (
  ticket_quota_id text,
  stadium_zone_id text,
  name text,
  total_seat int,
  sort_order int
) 
LANGUAGE sql
AS $$
 
  SELECT DISTINCT  -- Add DISTINCT to remove duplicates
    t.id as ticket_quota_id,
    z.id as stadium_zone_id,
    z.name as name,
    z.total_seat as total_seat,
    z.sort_order as sort_order
  FROM 
    stadium_zone AS z
  LEFT JOIN
    ticket_quota AS t ON z.id = t.stadium_zone_id
  WHERE 
    z.stadium_id = input_stadium_id
    and t.event_id = input_event_id
  order by
    z.sort_order asc

$$;
