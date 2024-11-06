// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
//const Allow_origin_url_prd = "https://kickoff.in.th";
const Allow_origin_url_prd="*"
//import { qrcode } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

// The main function that handles the request logic
async function slipokcall(req: Request): Promise<Response> {
  // Ensure it's a POST request

  // CORS preflight handling
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Parse the JSON body from the request
  let params;
  try {
    params = await req.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Destructure parameters
  const { apikey, fileurl, amount } = params;
  if (!apikey || !fileurl || !amount) {
    return new Response(
      JSON.stringify({ error: "Missing required parameters" }),
      {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": Allow_origin_url_prd,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }

  // Call the external API
  try {
    const apiResponse = await fetch(
      "https://api.slipok.com/api/line/apikey/24188",
      {
        method: "POST",
        headers: {
          "x-authorization": apikey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: fileurl,
          log: true,
          amount: amount,
        }),
      }
    );

    const responseData = await apiResponse.json();

    // Determine the response format based on success or error code
    const result = apiResponse.ok
      ? { isSuccess: responseData.success, errorCode: "none" }
      : { isSuccess: false, errorCode: responseData.code || "Unknown error", message: responseData.message || "Unknown message" };
    console.log(result);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    // Handle fetch errors (e.g., network issues)
    return new Response(
      JSON.stringify({ isSuccess: false, errorCode: "Network error", message: "Network error"  }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": Allow_origin_url_prd,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}

// Serve the request by calling slipokcall
Deno.serve(async (req) => {
  return await slipokcall(req);
});
/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/slipokcall' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
