"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, limit, getDocs, where } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export function SuggestedUsers() {
  const { user: currentUser } = useAuth();
  const [suggested, setSuggested] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If no user is logged in, we stop loading but show nothing
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fetchSuggested = async () => {
      try {
        // Query users where UID is not the current user
        const q = query(
          collection(db, "users"),
          where("uid", "!=", currentUser.uid),
          limit(5)
        );

        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            // Priority: Use document ID, fallback to uid field
            id: doc.id || data.uid, 
            ...data
          };
        });
        
        setSuggested(users);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggested();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (suggested.length === 0) return null;

  return (
    <div className="space-y-4">
      {suggested.map((user) => {
        // Double-check we have a valid ID for the link
        const profileId = user.id?.trim();
        if (!profileId) return null;

        return (
          <div key={profileId} className="flex items-center justify-between gap-4">
            <Link 
              href={`/profile/${profileId}`} 
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <Avatar className="h-9 w-9 border">
                <AvatarImage src={user.photoURL} />
                <AvatarFallback className="bg-muted text-xs">
                  {user.displayName?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold leading-none truncate max-w-30">
                  {user.displayName || "User"}
                </span>
                <span className="text-[10px] text-muted-foreground mt-1">
                  Suggested for you
                </span>
              </div>
            </Link>
            <Link 
              href={`/profile/${profileId}`} 
              className="text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors"
            >
              View
            </Link>
          </div>
        );
      })}
    </div>
  );
}