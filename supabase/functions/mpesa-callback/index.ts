import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ttnztozwxhoxqlalhyts.supabase.co",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  try {
    const body = await req.json();
    const cb = body?.Body?.stkCallback;
    if (!cb) return new Response("ok");

    if (cb.ResultCode === 0) {
      const items: Array<{ Name: string; Value: unknown }> = cb.CallbackMetadata?.Item ?? [];
      const get = (name: string) => items.find((i) => i.Name === name)?.Value;

      const phone = String(get("PhoneNumber") ?? "");
      const accountRef = String(get("AccountReference") ?? "");

      // If accountRef contains a contributionId (format: "CWG_<uuid>"), confirm that contribution
      const parts = accountRef.split("_");
      const contributionId = parts.length > 1 ? parts[parts.length - 1] : null;

      if (contributionId && contributionId.length === 36) {
        await supabase
          .from("contributions")
          .update({ status: "confirmed" })
          .eq("id", contributionId);
      }

      // Also mark member as paid if it was a membership payment
      if (!contributionId) {
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
