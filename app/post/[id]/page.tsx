"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { PostCard } from "@/components/PostCard";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const unsub = onSnapshot(doc(db, "posts", id), (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#020617] text-white">
        <p className="text-slate-400">Post not found</p>
        <button onClick={() => router.back()} className="mt-4 text-blue-400 font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100 pb-24 mt-12">
      <div className="max-w-2xl mx-auto px-6 pt-6">
        
        {/* 🔹 FULLY CLICKABLE NAVIGATION GROUP */}
        <div className="flex items-center mb-6 -ml-2">
          <Button 
            variant="ghost" 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg px-2 py-1 h-auto transition-all group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">
              Back
            </span>
          </Button>
        </div>

        <div className="max-w-xl mx-auto">
          <PostCard 
            id={post.id}
            userId={post.userId}
            username={post.username}
            userImage={post.userImage}
            postImage={post.postImage}
            caption={post.caption}
            likes={post.likes}
            createdAt={post.createdAt}
          />
        </div>
      </div>
    </main>
  );
}