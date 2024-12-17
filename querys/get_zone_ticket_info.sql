CREATE FUNCTION get_zone_ticket_info(
  input_event_id uuid,    -- Parameter for event_id
  input_stadium_id uuid,  -- Parameter for stadium_id
  input_partner_id uuid   -- Parameter for partner_id
)
RETURNS TABLE (
  zone_id text,
  zone_name text,
  zone_price float,
  sort_order int,
  row_index int,
  avai_ticket_count int,
  online_avai_count int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT * from(
  SELECT 
    z.id AS zone_id,
    z.name AS zone_name,
    z.price AS zone_price,
    z.sort_order AS sort_order,
    (ROW_NUMBER() OVER (ORDER BY z.sort_order)-1) AS row_index,
    (z.total_seat - COUNT(t.id)) AS avai_ticket_count,
     (q.max_limit - 
      COUNT(CASE WHEN t.status != 'CANCELLED' THEN t.id END)) AS online_avai_count
  FROM 
    stadium_zone AS z
  JOIN 
    stadium AS s ON z.stadium_id = s.id  -- Join zone with stadium by stadium_id
  JOIN 
    event AS e ON s.partner_id = e.partner_id  -- Join stadium with event by partner_id
  INNER JOIN
    ticket_quota AS q ON z.id = q.stadium_zone_id and e.id = q.event_id
  LEFT JOIN 
    ticket AS t ON t.event_id = e.id and t.stadium_zone_id = z.id -- Join zone with ticket by zone_id

  WHERE 
    e.id = input_event_id  -- Filter by event_id
    AND s.id = input_stadium_id  -- Filter by stadium_id
    AND e.partner_id = input_partner_id  -- Filter by partner_id
  GROUP BY 
    z.id, z.name, z.price, q.max_limit
) as zone_data
  ORDER BY
    zone_data.sort_order ASC;
$$;
