CREATE FUNCTION get_dashboard_sale(
  input_event_id uuid   -- Parameter for event_id
)
RETURNS TABLE (
  stadium_zone text,
  revenue float,
  soldquantity int,
  totalsell_seat int,
  totalseat_left int,
  sort_order int
)
LANGUAGE sql
AS $$
SELECT * from(
  SELECT 
   sz.name AS stadium_zone,
    SUM(t.unitprice) AS revenue,
    COUNT(t.id) AS soldquantity,
    tq.max_limit AS totalsell_seat,
    tq.max_limit - COUNT(t.id) AS totalseat_left,
   sz.sort_order AS sort_order
FROM 
    ticket AS t
JOIN
    "order" AS od ON t.order_id = od.id
JOIN 
    stadium_zone AS sz ON t.stadium_zone_id = sz.id
join
    ticket_quota AS tq on t.event_id = tq.event_id and sz.id = tq.stadium_zone_id
  WHERE 
    t.event_id = input_event_id -- Replace with the actual event ID
    and od.status = 'COMPLETED'
  GROUP BY 
    sz.name,sz.sort_order,tq.max_limit
) as zone_data
  ORDER BY
    zone_data.sort_order ASC;
$$;
