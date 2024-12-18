// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import {createClient} from 'npm:@supabase/supabase-js@2.45.4'

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

async function getTicketQuotaForEdit(stadiumId: string,eventId: string) {
  const { data, error } = await supabase.rpc("get_ticketquota_bystadiumid",
                   { input_stadium_id: stadiumId,input_event_id: eventId });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const stadiumId = url.searchParams.get("stadiumId");
  const eventId = url.searchParams.get("eventId");
  
  if (stadiumId == "" || eventId=="") {
    return new Response("Invalid Input", { status: 400 });
  }

  try {
    const ticketQuotaDetails = await getTicketQuotaForEdit(stadiumId??"",eventId??"");
    
    if (!ticketQuotaDetails) {
      return new Response("Tickets not found", { status: 404 });
    }

    return new Response(JSON.stringify({ quotas: ticketQuotaDetails }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://loop-ticketing-uh7jtm.flutterflow.app", // Allow only your specific domain
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Allowed methods
        "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
 
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/getticketquotaforedit' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
