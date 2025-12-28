"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  limit 
} from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export function NotificationDropdown() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Listen to the notifications sub-collection we created in PostCard
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user]);

  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-zinc-500 w-64">
        No new notifications
      </div>
    );
  }

  return (
    <div className="flex flex-col w-80 max-h-96 overflow-y-auto bg-white shadow-xl rounded-lg border border-zinc-100">
      <div className="p-3 font-bold border-b border-zinc-100 text-sm">Notifications</div>
      {notifications.map((n) => (
        <Link 
          key={n.id} 
          href={`/post/${n.postId}`}
          className={`flex items-center p-3 hover:bg-zinc-50 transition-colors ${!n.isRead ? "bg-blue-50/30" : ""}`}
        >
          <Avatar className="h-10 w-10 mr-3 border">
            <AvatarImage src={n.fromUserImage} />
            <AvatarFallback>{n.fromUsername?.[0]}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-xs">
            <p className="text-zinc-900">
              <span className="font-bold">{n.fromUsername}</span> liked your photo.
              <span className="text-zinc-400 ml-1">
                {n.createdAt?.toDate() ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : ""}
              </span>
            </p>
          </div>

          {n.postImage && (
            <img src={n.postImage} alt="post" className="h-10 w-10 object-cover rounded ml-2" />
          )}
        </Link>
      ))}
    </div>
  );
}