"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { 
  doc, getDoc, updateDoc, 
  collection, addDoc, query, where, orderBy, onSnapshot, 
  serverTimestamp, deleteDoc, arrayUnion, arrayRemove, setDoc 
} from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { useFollow } from "@/hooks/useFollow";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, MoreHorizontal, Pencil, Trash2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// --- REUSABLE TOAST STYLE ---
const centeredToastStyle = {
  background: "#0f172a",
  color: "#f1f5f9",
  border: "1px solid #1e293b",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  textAlign: "center" as const,
  padding: "16px",
  marginBottom: "20px", // 🔹 This pushes it "higher" from the bottom
};

// --- MOBILE OPTIMIZED COMMENT ITEM ---
function CommentItem({ comment, currentUser }: { comment: any; currentUser: any }) {
  const [userData, setUserData] = useState<{ displayName?: string; photoURL?: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text || "");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", comment.userId));
        if (userSnap.exists()) setUserData(userSnap.data());
      } catch (e) { console.error(e); }
    };
    fetchUserData();
  }, [comment.userId]);

  const handleUpdate = async () => {
    if (!editText.trim()) return;
    try {
      await updateDoc(doc(db, "comments", comment.id), { text: editText });
      setIsEditing(false);
      toast("Comment updated", {
        duration: 4000,
        style: centeredToastStyle
      });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex items-start justify-between py-1 group min-h-[28px]">
      <div className="flex-1 pr-4">
        <div className="text-[13px] leading-snug">
          <Link href={`/profile/${comment.userId}`} className="font-bold mr-1.5 text-white hover:underline">
            {userData?.displayName || comment.username}
          </Link>
          {isEditing ? (
            <div className="mt-1.5 space-y-2 w-full">
              <input 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 text-[12px]"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleUpdate} className="text-[10px] font-bold text-blue-400">Save</button>
                <button onClick={() => setIsEditing(false)} className="text-[10px] font-bold text-slate-500">Cancel</button>
              </div>
            </div>
          ) : (
            <span className="text-slate-300">{comment.text}</span>
          )}
        </div>
      </div>
      
      {currentUser?.uid === comment.userId && !isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 text-slate-600 active:text-white outline-none">
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200 shadow-2xl">
            <DropdownMenuItem onClick={() => setIsEditing(true)} className="text-xs cursor-pointer">
              <Pencil className="h-3 w-3 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                deleteDoc(doc(db, "comments", comment.id));
                toast("Comment deleted", {
                  style: { ...centeredToastStyle, color: "#f87171" }
                });
              }}
              className="text-rose-500 focus:text-rose-500 text-xs cursor-pointer"
            >
              <Trash2 className="h-3 w-3 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function PostCard({ 
  id, username: initialUsername, userImage: initialUserImage, 
  postImage, caption, likes = [], userId, createdAt 
}: any) {
  const { user } = useAuth();
  const router = useRouter();
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [showAllComments, setShowAllComments] = useState(false);
  const [author, setAuthor] = useState<{ displayName?: string; photoURL?: string } | null>(null);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editedCaption, setEditedCaption] = useState(caption || "");
  const { isFollowing, toggleFollow, loading: followLoading } = useFollow(user, userId);

  const hasLiked = user ? likes.includes(user.uid) : false;

  const handleMessageUser = async () => {
    if (!user || !userId || user.uid === userId) return;
    const chatId = user.uid < userId ? `${user.uid}_${userId}` : `${userId}_${user.uid}`;
    const chatRef = doc(db, "chats", chatId);
    try {
      await setDoc(chatRef, {
        participants: [user.uid, userId],
        updatedAt: serverTimestamp(),
        users: {
          [user.uid]: { name: user.displayName || "User", image: user.photoURL || "" },
          [userId]: { name: author?.displayName || initialUsername || "User", image: author?.photoURL || initialUserImage || "" }
        }
      }, { merge: true });
      router.push(`/messages/${chatId}`);
    } catch (e) { console.error("Error starting chat:", e); }
  };

  const toggleLike = async () => {
    if (!user || !id) return;
    const postRef = doc(db, "posts", id);
    try {
      await updateDoc(postRef, {
        likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (e) { console.error(e); }
  };

  const handleDeletePost = async () => {
    toast("Delete post?", {
      description: "This action cannot be undone.",
      duration: 6000,
      style: centeredToastStyle,
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await deleteDoc(doc(db, "posts", id));
            toast("Post removed", { style: centeredToastStyle });
          } catch (e) {
            toast.error("Failed to delete post");
          }
        },
      },
    });
  };

  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, "users", userId.trim())).then(snap => {
      if (snap.exists()) setAuthor(snap.data());
    });
  }, [userId]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "comments"), where("postId", "==", id), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !user) return;
    try {
      await addDoc(collection(db, "comments"), {
        postId: id,
        userId: user.uid,
        username: user.displayName || "Anonymous",
        text: commentInput,
        createdAt: serverTimestamp(),
      });
      setCommentInput("");
      setShowAllComments(true);
    } catch (e) { console.error(e); }
  };

  const handleUpdatePost = async () => {
    try {
      await updateDoc(doc(db, "posts", id), { caption: editedCaption });
      setIsEditingPost(false);
      toast("Caption updated", {
        duration: 4000,
        style: centeredToastStyle
      });
    } catch (e) { console.error(e); }
  };

  const displayedComments = showAllComments ? comments : comments.slice(0, 2);

  return (
    <div className="w-full border-b border-slate-800/40 bg-transparent mb-4 pb-2">
      <div className="flex items-center justify-between p-3">
        <Link 
          href={`/profile/${userId?.trim()}`} 
          className="flex items-center space-x-3 group active:opacity-70 transition-opacity"
        >
          <Avatar className="h-8 w-8 border border-slate-800">
            <AvatarImage src={author?.photoURL || initialUserImage} />
            <AvatarFallback className="bg-slate-800 text-slate-400">
              {(author?.displayName || initialUsername)?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[13px] text-white group-hover:underline decoration-slate-500">
                {author?.displayName || initialUsername}
              </span>
              
              {user && user.uid !== userId && (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFollow();
                  }} 
                  className="text-[12px] font-bold text-blue-400 z-10"
                >
                  {followLoading ? "..." : `• ${isFollowing ? "Following" : "Follow"}`}
                </button>
              )}
            </div>
            <span className="text-[10px] text-slate-500 uppercase font-medium tracking-tight">
              {createdAt?.toDate ? formatDistanceToNow(createdAt.toDate()) : "Just now"}
            </span>
          </div>
        </Link>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 text-slate-500 active:text-white outline-none">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200 w-44 shadow-2xl">
            {user?.uid === userId ? (
              <>
                <DropdownMenuItem onClick={() => setIsEditingPost(true)} className="py-3 text-sm cursor-pointer">
                  <Pencil className="h-4 w-4 mr-2" /> Edit Post
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDeletePost}
                  className="py-3 text-sm text-rose-500 focus:text-rose-500 cursor-pointer font-medium"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Post
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem 
                onClick={() => toast("Post Reported", {
                  description: "Our moderators will review this content shortly.",
                  duration: 5000,
                  style: centeredToastStyle,
                })}
                className="py-3 text-sm text-slate-300 focus:text-white cursor-pointer font-medium"
              >
                <AlertCircle className="h-4 w-4 mr-2" /> Report Post
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="aspect-square w-full bg-slate-950 overflow-hidden">
        <img src={postImage} alt="Post" className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
      </div>

      <div className="px-3 pt-3">
        <div className="flex items-center space-x-4 mb-2">
          <Heart 
            onClick={toggleLike}
            className={`h-6 w-6 cursor-pointer active:scale-125 transition-all duration-200 ${
              hasLiked ? "fill-rose-500 text-rose-500" : "text-white"
            }`} 
          />
          <MessageCircle 
            onClick={handleMessageUser}
            className="h-6 w-6 text-white cursor-pointer hover:text-blue-400 active:scale-110 transition-all" 
          />
        </div>

        <p className="font-bold text-[13px] text-white mb-1">{likes.length} likes</p>
        
        <div className="text-[13px] mb-2">
          <Link href={`/profile/${userId?.trim()}`} className="font-bold mr-2 text-white hover:underline">
            {author?.displayName || initialUsername}
          </Link>
          {isEditingPost ? (
            <div className="mt-2 space-y-2">
              <textarea 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none text-[13px] focus:ring-1 focus:ring-blue-500"
                value={editedCaption}
                onChange={(e) => setEditedCaption(e.target.value)}
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsEditingPost(false)} className="text-xs font-bold text-slate-500">Cancel</button>
                <button onClick={handleUpdatePost} className="text-xs font-bold text-blue-400">Save</button>
              </div>
            </div>
          ) : (
            <span className="text-slate-300">{caption}</span>
          )}
        </div>

        {comments.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {displayedComments.map((c) => (
              <CommentItem key={c.id} comment={c} currentUser={user} />
            ))}
            {comments.length > 2 && (
              <button 
                onClick={() => setShowAllComments(!showAllComments)}
                className="text-[13px] text-slate-500 mt-1 hover:text-slate-400 font-medium"
              >
                {showAllComments ? "Hide comments" : `View all ${comments.length} comments`}
              </button>
            )}
          </div>
        )}

        {user && (
          <form onSubmit={handleAddComment} className="mt-3 flex items-center border-t border-slate-800/20 pt-3">
            <input
              className="flex-1 text-[13px] bg-transparent text-slate-100 placeholder:text-slate-600 outline-none"
              placeholder="Add a comment..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={!commentInput.trim()}
              className="text-[13px] font-bold text-blue-400 px-2 disabled:opacity-30 hover:text-blue-300 transition-colors"
            >
              Post
            </button>
          </form>
        )}
      </div>
    </div>
  );
}