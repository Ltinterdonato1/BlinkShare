"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit 
} from "firebase/firestore";
import { Search as SearchIcon, Loader2, User, X } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose // 🔹 Crucial for force-closing
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function Search() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-clear when the modal is closed via any method
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim().length > 0) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "users"),
        where("displayName", ">=", searchTerm),
        where("displayName", "<=", searchTerm + "\uf8ff"),
        limit(5)
      );
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResults(users);
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-800/40 transition-colors">
          <SearchIcon className="h-5 w-5 text-zinc-400" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:max-w-[400px] p-0 gap-0 bg-zinc-950 border-zinc-800 text-white shadow-2xl z-[100] rounded-2xl outline-none">
        
        <DialogHeader className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xs font-bold uppercase tracking-widest text-blue-400">Search Users</DialogTitle>
            <DialogClose className="text-zinc-500 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </DialogClose>
          </div>
          <div className="relative mt-3">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-800 focus-visible:ring-1 focus-visible:ring-blue-500/50 h-10 text-sm"
              autoFocus
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto max-h-[60vh] p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-[11px] text-zinc-500">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((u) => (
              /* 🔹 Wrapping the Link in DialogClose FORCES the modal to unmount on click */
              <DialogClose asChild key={u.id}>
                <Link 
                  href={`/profile/${u.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-zinc-900 rounded-xl group transition-all"
                >
                  <Avatar className="h-10 w-10 border border-zinc-800">
                    <AvatarImage src={u.photoURL} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-500">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-zinc-100">{u.displayName}</span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">View Profile</span>
                  </div>
                </Link>
              </DialogClose>
            ))
          ) : searchTerm ? (
            <div className="text-center py-10">
              <p className="text-xs text-zinc-500">No users found.</p>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-[11px] text-zinc-500 italic">Enter a name to begin...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}