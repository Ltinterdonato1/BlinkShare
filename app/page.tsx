"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // 🔹 Added for instant redirect
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  where, 
  getDocs, 
  limit 
} from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { PostCard } from "@/components/PostCard";
import { SuggestedUsers } from "@/components/SuggestedUsers";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function HomePage() {
  const { user: currentUser, loading: authLoading } = useAuth(); // 🔹 Track auth loading state
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔹 INSTANT REDIRECT LOGIC
  // This runs as soon as Firebase confirms the user is null, 
  // bypassing the 5-second timer below.
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace("/login");
    }
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    // If we're still checking auth, or if we've already determined no user, don't run feed logic
    if (authLoading || !currentUser) return;

    // Fallback timer to prevent infinite loading if Firestore is slow
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    let unsubPosts: () => void = () => {};

    const fetchFollowingFeed = async () => {
      try {
        const followingRef = collection(db, "users", currentUser.uid, "following");
        const followingSnap = await getDocs(followingRef);
        const followingIds = followingSnap.docs.map(doc => doc.id);

        // If not following anyone, show a global feed instead of an empty screen
        if (followingIds.length === 0) {
          const globalQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20));
          unsubPosts = onSnapshot(globalQuery, (snap) => {
            setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
            clearTimeout(timer);
          });
          return;
        }

        const feedIds = [...followingIds, currentUser.uid];
        const postsQuery = query(
          collection(db, "posts"),
          where("userId", "in", feedIds.slice(0, 10)),
          orderBy("createdAt", "desc")
        );

        unsubPosts = onSnapshot(postsQuery, (postSnap) => {
          setPosts(postSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
          clearTimeout(timer);
        }, (err) => {
          console.error("Following Feed Error:", err);
          setLoading(false);
        });
      } catch (err) {
        console.error("Feed Fetch Error:", err);
        setLoading(false);
      }
    };

    fetchFollowingFeed();

    return () => {
      unsubPosts();
      clearTimeout(timer);
    };
  }, [currentUser, authLoading]);

  // Show a clean loader while the initial auth check is happening
  if (authLoading || (loading && !posts.length)) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // If we reach this point and have no user, the useEffect above will 
  // already be triggering the redirect. We return null to prevent a flash.
  if (!currentUser) return null;

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#020617] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-[#020617] to-[#020617]">
        <div className="max-w-6xl mx-auto py-20 px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Feed Area */}
          <div className="lg:col-span-8 space-y-8">
            {posts.length > 0 ? (
              posts.map((post) => (
                <PostCard 
                  key={post.id} 
                  id={post.id}
                  userId={post.userId}
                  username={post.username}
                  userImage={post.userImage}
                  postImage={post.postImage}
                  caption={post.caption}
                  likes={post.likes}
                  createdAt={post.createdAt}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-24 px-6 text-center border border-slate-800/60 rounded-3xl bg-slate-900/20 backdrop-blur-sm">
                <div className="p-4 bg-slate-800/40 rounded-full mb-4">
                  <Loader2 className="h-10 w-10 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Your feed is quiet</h3>
                <p className="text-slate-400 max-w-xs">
                  Follow some creators or post your own moments to get things started.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block lg:col-span-4 sticky top-24 h-fit">
            <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-sm shadow-xl">
              <h2 className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-6">Suggested for you</h2>
              <SuggestedUsers />
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}