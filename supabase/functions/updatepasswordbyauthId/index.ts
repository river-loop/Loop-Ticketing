// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { verify } from "https://deno.land/x/djwt@v2.4/mod.ts";
//const Allow_origin_url_prd="https://kickoff.in.th"
//const Allow_origin_url_prd = "https://loop-ticketing-test-3hanuu.flutterflow.app";
const Allow_origin_url_prd = "*";
//import { qrcode } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd,
        "Access-Control-Allow-Methods": "POST, GET, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400", // Cache the preflight response for 24 hours
      },
    });
  }

  if (req.method !== "PUT") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
        "Access-Control-Allow-Methods": "POST, PUT, OPTIONS", // Allowed methods
        "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
      },
    });
  }

  try {
    // Parse the JSON body of the request
    const { userId, newPassword } = await req.json();

    // Validate the input
    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing userId or newPassword",
        }),
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
            "Access-Control-Allow-Methods": "POST,PUT, OPTIONS", // Allowed methods
            "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
          },
        }
      );
    }

    // Use the Admin API to update the user's password
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
            "Access-Control-Allow-Methods": "POST,PUT, OPTIONS", // Allowed methods
            "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
          },
        }
      );
    }
    console.log("Password updated successfully:", data);
    // Return a success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Password updated successfully",
      }),
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
          "Access-Control-Allow-Methods": "POST,PUT, OPTIONS", // Allowed methods
          "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
        },
      }
    );
  } catch (e) {
    // Handle unexpected errors
    return new Response(
      JSON.stringify({
        success: false,
        message: `Unexpected error: ${e.message}`,
      }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
          "Access-Control-Allow-Methods": "POST,PUT, OPTIONS", // Allowed methods
          "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
        },
      }
    );
  }
});
/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/updatepasswordbyauthId' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
