"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { signup } = useAuth();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signup(email, password, username);
      router.push("/");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center px-4 bg-[#020617] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#020617] to-[#020617]">
      <Card className="w-full max-w-sm bg-slate-900/40 border-slate-800/60 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-bold tracking-tighter text-white">
            BlinkShare
          </CardTitle>
          <p className="text-sm text-slate-400 mt-2">
            Join the community and share your moments
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4 pt-4">
            <Input 
              placeholder="Username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="bg-slate-950/50 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-500/50"
              required 
              disabled={isLoading}
            />
            <Input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="bg-slate-950/50 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-500/50"
              required 
              disabled={isLoading}
            />
            <Input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="bg-slate-950/50 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-500/50"
              required 
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
          
          <p className="mt-8 text-center text-sm">
            <span className="text-slate-500">Have an account?</span>{" "}
            <Link href="/login" className="text-blue-400 font-bold hover:text-blue-300 transition-colors">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}