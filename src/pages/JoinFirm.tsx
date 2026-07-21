import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { edgeHeaders } from "@/lib/edgeAuth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

type Status = "checking" | "needs-signin" | "redeeming" | "success" | "error";

const JoinFirm = () => {
  const { token } = useParams();
  const { user, session, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState("");
  const [firmName, setFirmName] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setStatus("error");
      setMessage("This invite link is missing its token.");
      return;
    }
    if (!user) {
      setStatus("needs-signin");
      return;
    }
    setStatus("redeeming");
    (async () => {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/firm-invite`, {
          method: "POST",
          headers: edgeHeaders(),
          body: JSON.stringify({ accessToken: session?.access_token, action: "redeem", token }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          setStatus("error");
          setMessage(data.error || "Couldn't join that firm.");
          return;
        }
        setFirmName(data.firmName ?? "the firm");
        setStatus("success");
      } catch {
        setStatus("error");
        setMessage("Couldn't reach the invite service.");
      }
    })();
  }, [authLoading, user, session?.access_token, token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        {(status === "checking" || status === "redeeming") && (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground font-body">Joining the firm…</p>
          </>
        )}

        {status === "needs-signin" && (
          <>
            <Users className="w-8 h-8 text-primary mx-auto mb-4" />
            <p className="font-display text-xl text-foreground mb-2">Sign in first</p>
            <p className="text-sm text-muted-foreground font-body mb-6">
              You'll need an account to accept this invite. Sign in or create one, then open this link again.
            </p>
            <Link to="/" className="text-xs text-primary hover:text-gold-light font-body">
              Go to sign in →
            </Link>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-4" />
            <p className="font-display text-xl text-foreground mb-2">You're in</p>
            <p className="text-sm text-muted-foreground font-body mb-6">
              You've joined <span className="text-foreground">{firmName}</span>. Your dashboard now shows the
              firm's shared Market Visibility history.
            </p>
            <Link to="/" className="text-xs text-primary hover:text-gold-light font-body">
              Go to your dashboard →
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-8 h-8 text-destructive mx-auto mb-4" />
            <p className="font-display text-xl text-foreground mb-2">Couldn't join</p>
            <p className="text-sm text-muted-foreground font-body mb-6">{message}</p>
            <Link to="/" className="text-xs text-primary hover:text-gold-light font-body">
              ← Back to the app
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default JoinFirm;
