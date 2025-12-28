"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2, MessageSquare, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Chat {
  id: string;
  participants: string[];
  lastMessage: string;
  updatedAt: any;
  users: {
    [key: string]: {
      name: string;
      image: string;
    };
  };
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat)));
      setLoading(false);
    }, (error) => {
      console.error("Chat list error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <ProtectedRoute>
      <main className="max-w-2xl mx-auto py-20 px-4 min-h-screen bg-transparent text-white">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-3 tracking-tight mx-auto">
            
            Messages
          </h1>
          
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-xs text-slate-500 animate-pulse">Loading chats...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800/60 bg-slate-900/20 rounded-3xl backdrop-blur-sm">
            <p className="text-slate-400 font-medium">No messages yet.</p>
            <Link href="/" className="text-blue-400 text-sm mt-3 inline-block hover:text-blue-300 transition-colors font-bold">
              Find someone to chat with →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {chats.map((chat) => {
              const otherId = chat.participants.find(id => id !== user?.uid);
              const otherUser = chat.users[otherId!];

              return (
                <Link 
                  key={chat.id} 
                  href={`/messages/${chat.id}`}
                  className="flex items-center gap-4 p-4 bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl transition-all hover:bg-slate-800/40 hover:border-slate-700/80 group active:scale-[0.98]"
                >
                  <div className="relative">
                    <Avatar className="h-14 w-14 ring-2 ring-slate-800 group-hover:ring-blue-500/30 transition-all">
                      <AvatarImage src={otherUser?.image} />
                      <AvatarFallback className="bg-slate-800 text-slate-400">
                        {otherUser?.name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 border-2 border-[#020617] rounded-full"></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="font-bold text-[15px] text-slate-100 group-hover:text-white transition-colors">
                        {otherUser?.name}
                      </span>
                      {chat.updatedAt && (
                        <span className="text-[10px] font-medium text-slate-500">
                          {formatDistanceToNow(chat.updatedAt.toDate(), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] text-slate-400 truncate leading-relaxed max-w-[85%] group-hover:text-slate-300 transition-colors">
                        {chat.lastMessage || "Started a conversation"}
                      </p>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}