"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { useFollow } from "@/hooks/useFollow";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2, LogOut, Heart } from "lucide-react";
import { EditProfile } from "@/components/EditProfile";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, logout } = useAuth();
  
  const targetUserId = params?.id as string;

  const [posts, setPosts] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const isOwnProfile = currentUser?.uid === targetUserId;
  const { isFollowing, toggleFollow, loading: followLoading } = useFollow(currentUser, targetUserId);

  const handleMessageUser = async () => {
    if (!currentUser || !targetUserId || currentUser.uid === targetUserId) return;
    const chatId = currentUser.uid < targetUserId 
      ? `${currentUser.uid}_${targetUserId}` 
      : `${targetUserId}_${currentUser.uid}`;
    const chatRef = doc(db, "chats", chatId);
    try {
      await setDoc(chatRef, {
        participants: [currentUser.uid, targetUserId],
        updatedAt: serverTimestamp(),
        users: {
          [currentUser.uid]: { name: currentUser.displayName || "User", image: currentUser.photoURL || "" },
          [targetUserId]: { name: profileData?.displayName || "User", image: profileData?.photoURL || "" }
        }
      }, { merge: true });
      router.push(`/messages/${chatId}`);
    } catch (e) {
      console.error("Error starting chat:", e);
    }
  };

  useEffect(() => {
    if (!targetUserId || targetUserId === "undefined") {
      setLoading(false);
      return;
    }
    const userDocRef = doc(db, "users", targetUserId);
    const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) setProfileData(docSnap.data());
    });
    const q = query(collection(db, "posts"), where("userId", "==", targetUserId), orderBy("createdAt", "desc"));
    const unsubPosts = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    const unsubFollowers = onSnapshot(collection(db, "users", targetUserId, "followers"), (snap) => setFollowerCount(snap.size));
    const unsubFollowing = onSnapshot(collection(db, "users", targetUserId, "following"), (snap) => setFollowingCount(snap.size));
    return () => { unsubProfile(); unsubPosts(); unsubFollowers(); unsubFollowing(); };
  }, [targetUserId]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-[#020617]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  );

  const displayName = profileData?.displayName || "User";
  const photoURL = profileData?.photoURL || "";
  const bio = profileData?.bio || "No bio yet.";

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#020617] text-slate-100 pb-24 mt-12">
        {/* 🔹 pt-10 provides the perfect gap between the profile pic and the header */}
        <div className="max-w-2xl mx-auto px-6 pt-10 pb-6">
          <section className="mb-6">
            <div className="flex items-center gap-6 md:gap-16">
              <div className="flex-shrink-0">
                <Avatar className="h-20 w-20 md:h-24 md:w-24 border-2 border-slate-800 shadow-xl">
                  <AvatarImage src={photoURL} />
                  <AvatarFallback className="bg-slate-800 text-xl font-bold">{displayName[0]}</AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex flex-1 justify-between items-center px-2">
                <StatItem label="Posts" count={posts.length} />
                <StatItem label="Followers" count={followerCount} />
                <StatItem label="Following" count={followingCount} />
              </div>
            </div>

            <div className="mt-5 flex items-start justify-between">
              <div className="flex-1">
                <h1 className="font-bold text-[15px] md:text-base text-white">{displayName}</h1>
                <p className="text-[13px] text-slate-400 leading-snug whitespace-pre-wrap mt-0.5">{bio}</p>
              </div>
              
            </div>

            <div className="mt-6 flex gap-2 w-full">
              {isOwnProfile ? (
                <div className="w-full"><EditProfile /></div>
              ) : (
                <>
                  <Button 
                    onClick={toggleFollow} 
                    disabled={followLoading}
                    className={`flex-1 h-10 font-bold rounded-xl active:scale-95 transition-all ${isFollowing ? "bg-slate-800 text-white border border-slate-700" : "bg-blue-600 hover:bg-blue-500"}`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                  <Button 
                    onClick={handleMessageUser}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-10 font-bold border border-slate-800 rounded-xl active:scale-95 transition-all"
                  >
                    Message
                  </Button>
                </>
              )}
            </div>
          </section>

          <div className="grid grid-cols-3 gap-[2px] md:gap-2 border-t border-slate-800/50 pt-1">
            {posts.map((post) => (
              <Link key={post.id} href={`/post/${post.id}`} className="group relative aspect-square bg-slate-900 overflow-hidden active:opacity-90">
                <img src={post.postImage} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Post" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="flex items-center gap-1.5 text-white font-bold">
                    <Heart className="h-5 w-5 fill-white text-white" />
                    <span className="text-sm md:text-base">{post.likes?.length || 0}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {posts.length === 0 && (
            <div className="text-center py-24">
              <p className="text-slate-500 text-sm font-medium">No posts to show yet.</p>
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}

function StatItem({ label, count }: { label: string, count: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-base font-bold text-white">{count}</span>
      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{label}</span>
    </div>
  );
}