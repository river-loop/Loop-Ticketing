// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
//import { qrcode } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

async function handleDeleteOrder(req: Request): Promise<Response> {
  if (req.method === "DELETE") {
    try {
      // Parse the request body to get the pOrderId parameter
      const url = new URL(req.url);
      const pOrderId = url.searchParams.get('pOrderId');

      if (!pOrderId) {
        return new Response(
          JSON.stringify({
            statuscode: 400,
            message: "Missing required parameter: pOrderId, pUserId",
          }),
          { status: 400, headers: {
            "Access-Control-Allow-Origin": "https://loop-ticketing-uh7jtm.flutterflow.app", // Allow only your specific domain
            "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS", // Allowed methods
            "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
          } }
        );
      }

      // Call the SQL function to delete order-related data
      const { error } = await supabase.rpc('delete_order_related_data', {
        p_order_id: pOrderId
      });

      if (error) {
        throw new Error(`Failed to delete order-related data: ${error.message}`);
      }

      // Return a success response
      return new Response(
        JSON.stringify({
          statuscode: 200,
          message: `Successfully deleted order-related data for order ID: ${pOrderId}`,
        }),
        { status: 200, headers: {
          "Access-Control-Allow-Origin": "https://loop-ticketing-uh7jtm.flutterflow.app", // Allow only your specific domain
          "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS", // Allowed methods
          "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
        } }
      );
    } catch (error) {
      // Handle errors and return a 500 response
      return new Response(
        JSON.stringify({ statuscode: 500, message: error.message }),
        { status: 500, headers: {
          "Access-Control-Allow-Origin": "https://loop-ticketing-uh7jtm.flutterflow.app", // Allow only your specific domain
          "Access-Control-Allow-Methods": "POST, GET, DELETE,  OPTIONS", // Allowed methods
          "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
        } }
      );
    }
  } else {
    // Return a 405 response for any method other than POST
    return new Response("Method not allowed", { status: 405 });
  }
}

// Start the Deno server and listen for requests
Deno.serve(async (req: Request) => {
  return await handleDeleteOrder(req);
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/deleteorderrelated' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
