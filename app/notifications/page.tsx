"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(docs);
      setLoading(false);

      // Mark unread notifications as read
      snapshot.docs.forEach(async (nDoc) => {
        if (!nDoc.data().read) {
          await updateDoc(doc(db, "users", user.uid, "notifications", nDoc.id), {
            read: true
          });
        }
      });
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto py-20 px-4">
      <h1 className="text-2xl font-bold mb-6">Activity</h1>
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">No activity yet.</p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={n.fromUserImage} />
                  <AvatarFallback>{n.fromUsername?.[0]}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p>
                    <span className="font-bold">{n.fromUsername}</span>{" "}
                    {n.type === "like" && "liked your post."}
                    {n.type === "follow" && "started following you."}
                    {n.type === "comment" && `commented: "${n.text}"`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {n.createdAt?.toDate() ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : "Just now"}
                  </p>
                </div>
              </div>
              {n.postImage && (
                <img src={n.postImage} className="h-12 w-12 object-cover rounded-md border" alt="Post" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}