SELECT cron.schedule(
  'check_soldout_events', -- Job name
  '*/1 * * * *',          -- Schedule (every 5 minutes)
  $$WITH quota_totals AS (
      SELECT 
        event_id,
        SUM(max_limit) AS total_max_limit
      FROM 
        ticket_quota
      GROUP BY 
        event_id
    ),
    ticket_totals AS (
      SELECT 
        event_id,
        COUNT(id) AS total_ticket_count
      FROM 
        ticket
      GROUP BY 
        event_id
    ),
    remaining_tickets AS (
      SELECT 
        q.event_id,
        COALESCE(q.total_max_limit, 0) - COALESCE(t.total_ticket_count, 0) AS remaining_tickets
      FROM 
        quota_totals q
      LEFT JOIN 
        ticket_totals t
      ON 
        q.event_id = t.event_id
    )
    UPDATE event
    SET is_soldout=true
    WHERE 
      id IN (
        SELECT 
          event_id
        FROM 
          remaining_tickets
        WHERE 
          remaining_tickets = 0
      )
      AND is_soldout!=true;$$
);
