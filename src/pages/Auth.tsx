import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, User, FileText, Shield } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate("/vault", { replace: true });
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/vault", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Login berhasil!", description: "Selamat datang kembali." });
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({ title: "Registrasi berhasil!", description: "Silakan cek email untuk verifikasi." });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <Shield size={28} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Private Vault</h1>
          <p className="text-sm text-muted-foreground">Manajemen dokumen pribadi yang aman</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{isLogin ? "Masuk" : "Daftar"}</CardTitle>
            <CardDescription>
              {isLogin ? "Masuk ke akun Anda" : "Buat akun baru untuk mulai mengelola dokumen"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Memproses..." : isLogin ? "Masuk" : "Daftar"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline font-medium"
              >
                {isLogin ? "Daftar" : "Masuk"}
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 justify-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><FileText size={12} /> Dokumen terenkripsi</div>
          <div className="flex items-center gap-1"><Lock size={12} /> Akses pribadi</div>
          <div className="flex items-center gap-1"><User size={12} /> RLS aktif</div>
        </div>
      </div>
    </div>
  );
}
