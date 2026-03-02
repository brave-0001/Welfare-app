import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ttnztozwxhoxqlalhyts.supabase.co",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  try {
    const body = await req.json();
    const result = body?.Body?.stkCallback;

    if (result?.ResultCode === 0) {
      const phone = result.CallbackMetadata.Item.find(
        (i: any) => i.Name === "PhoneNumber"
      )?.Value?.toString();

      if (phone) {
        await supabase
          .from("members")
          .update({ paid: true })
          .eq("phone", phone);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});