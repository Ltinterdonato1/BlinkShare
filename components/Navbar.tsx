"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreatePost } from "./CreatePost";
import { 
  Home, 
  Search, 
  Heart, 
  User, 
  MessageSquare, 
  LogOut 
} from "lucide-react";
import { collection, query, where, getDocs, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationDropdown } from "./NotificationDropdown";

// --- 🔹 MOBILE HEADER (TOP) ---
export function MobileHeader() {
  const { logout } = useAuth();

  return (
    <div className="sm:hidden fixed top-0 left-0 right-0 h-14 bg-background border-b border-zinc-800 flex items-center justify-between px-6 z-50">
      <Link
        href="/"
        className="text-xl font-semibold tracking-tight text-white select-none"
      >
        Blink<span className="text-blue-400">Share</span>
      </Link>

      <button 
        onClick={logout} 
        className="text-slate-400 hover:text-white transition-colors p-1"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </div>
  );
}

// --- 🔹 MAIN NAVBAR ---
export function Navbar() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      where("isRead", "==", false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSearch = async (val: string) => {
    setSearchTerm(val);
    const searchLower = val.toLowerCase();
    if (searchLower.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, "users"),
        where("displayNameLower", ">=", searchLower),
        where("displayNameLower", "<=", searchLower + "\uf8ff"),
        limit(5)
      );
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setResults(users);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      <MobileHeader />

      <nav className="fixed bottom-0 sm:top-0 w-full bg-background border-t sm:border-b sm:border-t-0 h-14 flex items-center justify-around px-4 z-50">
        
        {/* Logo (Desktop Only) */}
        <Link
          href="/"
          className="hidden sm:block text-xl font-semibold tracking-tight text-white select-none"
        >
          Blink<span className="text-blue-400">Share</span>
        </Link>

        {/* Home */}
        <Link href="/">
          <Home className="h-7 w-7 hover:scale-110 transition-transform text-white" />
        </Link>

        {/* Search */}
        <Dialog onOpenChange={(open) => { if (!open) { setSearchTerm(""); setResults([]); } }}>
          <DialogTrigger asChild>
            <Search className="h-7 w-7 cursor-pointer hover:text-blue-500 transition-colors text-white" />
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
            <DialogHeader><DialogTitle>Search Users</DialogTitle></DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="mb-4 bg-zinc-900 border-zinc-700 text-white"
                autoFocus
              />
              <div className="space-y-4 max-h-75 overflow-y-auto">
                {loading && <p className="text-sm text-center text-muted-foreground italic">Searching...</p>}
                {results.map((u) => (
                  <Link key={u.id} href={`/profile/${u.id}`} className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-lg transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={u.photoURL} />
                      <AvatarFallback>{u.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-sm">{u.displayName}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">View Profile</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Post (Now optimized to match styling) */}
        <CreatePost />

        {/* Messages */}
        <Link href="/messages">
          <MessageSquare className="h-7 w-7 hover:text-blue-500 transition-colors text-white" />
        </Link>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative p-1 outline-none">
              <Heart className={`h-7 w-7 transition-colors ${unreadCount > 0 ? "text-red-500 fill-red-500" : "hover:text-red-500 text-white"}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full border-2 border-background">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 mr-4 mt-2 shadow-2xl border-zinc-800 bg-zinc-950" align="end">
            <NotificationDropdown />
          </PopoverContent>
        </Popover>

        {/* Profile */}
        <Link href={user ? `/profile/${user.uid}` : "/login"}>
          {user?.photoURL ? (
            <Avatar className="h-7 w-7 border border-zinc-800 hover:opacity-80 transition-opacity">
              <AvatarImage src={user.photoURL} />
              <AvatarFallback>{user.displayName?.[0] || "U"}</AvatarFallback>
            </Avatar>
          ) : (
            <User className="h-7 w-7 hover:text-blue-500 transition-colors text-white" />
          )}
        </Link>
      </nav>
    </>
  );
}