// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import {createClient} from 'npm:@supabase/supabase-js@2.45.4'
//const Allow_origin_url_prd="https://kickoff.in.th";
const Allow_origin_url_prd="*"
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

async function getZoneTicketInfo(eventId: string,stadiumId: string,partnerId: string) {
  const { data, error } = await supabase.rpc("get_zone_ticket_info", 
    { input_event_id: eventId, input_stadium_id: stadiumId, input_partner_id: partnerId });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  const stadiumId = url.searchParams.get("stadiumId");
  const partnerId = url.searchParams.get("partnerId");
  
  
  if (eventId == "" || stadiumId == "" || partnerId == "") {
    return new Response("Invalid Input", { status: 400 });
  }

  try {
    const zoneDetails = await getZoneTicketInfo(eventId??"",stadiumId??"",partnerId??"");
    
    if (!zoneDetails) {
      return new Response("Zones not found", { status: 404,
        headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Allowed methods
        "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
        }
      });
    }

    return new Response(JSON.stringify({ zones: zoneDetails }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Allowed methods
        "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Allowed methods
        "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
      },
    });
  }
 
})


/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/getzoneticketinfo' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
