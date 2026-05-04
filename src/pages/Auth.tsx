import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LayoutDashboard, ShieldCheck, ArrowLeft } from "lucide-react";
import { CourtsideLogo } from "@/components/CourtsideLogo";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().trim().min(6, "Password must be at least 6 characters").max(72),
  displayName: z.string().trim().min(1).max(60).optional(),
});

type PortalType = "player" | "owner" | "admin";

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roles, loading: rolesLoading } = useRoles();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  
  const [portal, setPortal] = useState<PortalType>("player");

  // Auto-fill credentials for easy testing
  useEffect(() => {
    if (portal === "admin") {
      setEmail("admin@courtside.com");
      setPassword("password123");
    } else if (portal === "owner") {
      setEmail("owner@courtside.com");
      setPassword("password123");
    } else if (portal === "player") {
      setEmail("player@courtside.com");
      setPassword("password123");
    }
  }, [portal]);

  useEffect(() => {
    if (user && !rolesLoading) {
      if (roles.includes("admin")) {
        navigate("/admin/users");
      } else if (roles.includes("owner")) {
        navigate("/owner");
      } else {
        navigate("/");
      }
    }
  }, [user, roles, rolesLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ 
      email: parsed.data.email, 
      password: parsed.data.password 
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, displayName });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: parsed.data.displayName || undefined },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("already")) toast.error("Account exists. Please sign in.");
      else toast.error(error.message);
      return;
    }
    toast.success("Account created! You can sign in now.");
  };

  const isPlayer = portal === "player";
  const isOwner = portal === "owner";
  const isAdmin = portal === "admin";

  return (
    <div className={`min-h-screen grid place-items-center px-4 py-12 transition-colors duration-500 relative ${
      isAdmin ? "bg-[#0a0a0c]" : isOwner ? "bg-[#06080f]" : "bg-hero"
    }`}>
      
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-6 left-6 text-muted-foreground hover:text-white z-20"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="size-4 mr-2" />
        Back to Home
      </Button>

      {/* Background Effects */}
      {isAdmin && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-transparent opacity-60" />
        </div>
      )}
      {isOwner && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-transparent opacity-60" />
        </div>
      )}

      <div className="w-full max-w-md relative z-10">
        
        {/* Portal Switcher */}
        <div className="flex justify-center gap-2 mb-8 bg-black/40 p-1.5 rounded-full border border-white/5 backdrop-blur-md">
          <button onClick={() => setPortal("player")} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${isPlayer ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-white"}`}>Player</button>
          <button onClick={() => setPortal("owner")} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${isOwner ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-muted-foreground hover:text-white"}`}>Owner</button>
          <button onClick={() => setPortal("admin")} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${isAdmin ? "bg-white/10 text-white border border-white/20" : "text-muted-foreground hover:text-white"}`}>Admin</button>
        </div>

        {/* Header section based on portal */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <CourtsideLogo size="lg" className="text-foreground" />
          </div>
          
          {isPlayer && (
            <p className="text-muted-foreground mt-2">Book your court. Play your game.</p>
          )}
          {isOwner && (
            <>
              <p className="text-sm font-bold uppercase tracking-widest text-blue-400 mt-1">Partner Portal</p>
              <p className="text-muted-foreground mt-2">Manage facilities and track revenue.</p>
            </>
          )}
          {isAdmin && (
            <>
              <p className="text-sm font-bold uppercase tracking-widest text-primary mt-1">System Admin</p>
              <p className="text-muted-foreground mt-2">Authorized personnel only.</p>
            </>
          )}
        </div>

        {/* Form Card */}
        <div className={`border rounded-2xl p-8 backdrop-blur-md transition-all ${
          isAdmin ? "bg-black/60 border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]" :
          isOwner ? "bg-[#0a0f1d]/80 border-blue-900/30 shadow-[0_0_30px_rgba(59,130,246,0.05)]" :
          "bg-card-gradient border-border shadow-elevated"
        }`}>
          <Tabs defaultValue="signin">
            {isPlayer && (
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            )}
            {/* Hide Sign Up for Owner and Admin views */}
            {!isPlayer && (
              <div className={`text-xs font-bold uppercase tracking-widest text-center mb-6 pb-4 border-b ${isOwner ? "text-blue-400 border-blue-900/30" : "text-muted-foreground border-white/10"}`}>
                Secure Authentication
              </div>
            )}

            <TabsContent value="signin" className="mt-0">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required 
                    className={isAdmin ? "bg-white/5 border-white/10 focus-visible:ring-primary/50" : isOwner ? "bg-blue-950/20 border-blue-900/30 focus-visible:ring-blue-500/50" : ""}
                  />
                </div>
                <div>
                  <Label htmlFor="si-pass">Password</Label>
                  <Input id="si-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required 
                    className={isAdmin ? "bg-white/5 border-white/10 focus-visible:ring-primary/50" : isOwner ? "bg-blue-950/20 border-blue-900/30 focus-visible:ring-blue-500/50" : ""}
                  />
                </div>
                <Button type="submit" className={`w-full font-bold tracking-wider ${
                  isAdmin ? "border border-primary/50 hover:bg-primary/20" :
                  isOwner ? "bg-blue-600 hover:bg-blue-500 text-white" : ""
                }`} size="lg" disabled={loading} variant={isAdmin ? "outline" : "default"}>
                  {loading ? "Authenticating..." : isAdmin ? "Access System" : isOwner ? "Sign In to Dashboard" : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="su-name">Display name</Label>
                  <Input id="su-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex Player" required />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="su-pass">Password</Label>
                  <Input id="su-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Creating..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
