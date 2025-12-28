"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp, 
  collection, 
  addDoc 
} from "firebase/firestore";

export function useFollow(currentUser: any, targetUserId: string) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Extract UID and trim target ID to prevent buffering from bad paths
  const currentUserId = currentUser?.uid;
  const cleanTargetId = targetUserId?.trim();

  useEffect(() => {
    if (!currentUserId || !cleanTargetId) return;
    
    const checkStatus = async () => {
      try {
        const followRef = doc(db, "users", currentUserId, "following", cleanTargetId);
        const docSnap = await getDoc(followRef);
        setIsFollowing(docSnap.exists());
      } catch (err) {
        console.error("Error checking follow status:", err);
      }
    };
    checkStatus();
  }, [currentUserId, cleanTargetId]);

  const toggleFollow = async () => {
    // 2. Prevent execution if IDs are missing or already loading
    if (!currentUserId || !cleanTargetId || loading) return;
    
    setLoading(true);

    const followingRef = doc(db, "users", currentUserId, "following", cleanTargetId);
    const followersRef = doc(db, "users", cleanTargetId, "followers", currentUserId);

    try {
      if (isFollowing) {
        await deleteDoc(followingRef);
        await deleteDoc(followersRef);
        setIsFollowing(false);
      } else {
        await setDoc(followingRef, { timestamp: serverTimestamp() });
        await setDoc(followersRef, { timestamp: serverTimestamp() });
        
        // 3. Add Notification so the target user sees the follow
        await addDoc(collection(db, "users", cleanTargetId, "notifications"), {
          type: "follow",
          fromUserId: currentUserId,
          fromUsername: currentUser.displayName || "Someone",
          fromUserImage: currentUser.photoURL || "",
          read: false,
          createdAt: serverTimestamp(),
        });

        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Follow toggle failed:", error);
      alert("Failed to follow user. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return { isFollowing, toggleFollow, loading };
}
