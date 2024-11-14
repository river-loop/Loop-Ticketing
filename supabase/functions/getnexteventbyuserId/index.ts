// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import {createClient} from 'npm:@supabase/supabase-js@2.45.4'
import { verify } from "https://deno.land/x/djwt@v2.4/mod.ts";
//const Allow_origin_url_prd="https://kickoff.in.th";
const Allow_origin_url_prd="*"
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

const JWT_SECRET = Deno.env.get("JWT_SECRET");

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret); // Encode the secret as Uint8Array
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign", "verify"]
  );
}

async function getNextEventByUserId(userId: string) {
  const { data, error } = await supabase.rpc("get_next_event", { input_user_id: userId });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400" // Cache the preflight response for 24 hours
      },
    });
  }
  if (!JWT_SECRET) {
    return new Response(JSON.stringify({
      message: `JWT error: ${JWT_SECRET}`,
    }), { status: 401, headers: {
      "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Allowed methods
      "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
    }, });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized: No token provided", { status: 401, headers: {
      "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Allowed methods
      "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
    }, });
  }

  // Extract the token from the Authorization header
  const token = authHeader.split(" ")[1];
  const JWT_SECRET_KEY = await getCryptoKey(JWT_SECRET);
  // Verify the JWT
  const payload = await verify(token,JWT_SECRET_KEY);
  
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  
  if (userId == "") {
    return new Response("Invalid user ID", { status: 400, headers: {
      "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Allowed methods
      "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
    }, });
  }

  try {
    const eventorderDetails = await getNextEventByUserId(userId??"");
    
    if (!eventorderDetails) {
      return new Response("Order not found", { status: 404, headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Allowed methods
        "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
      }, });
    }

    return new Response(JSON.stringify(eventorderDetails), {
      headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Allowed methods
        "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500, headers: {
      "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Allowed methods
      "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
    }, });
  }
 
})


/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/getnexteventbyuserId' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
