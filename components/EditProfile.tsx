"use client";

import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Camera } from "lucide-react";

export function EditProfile() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [existingPhotoURL, setExistingPhotoURL] = useState(""); // Track the current Firestore image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      const fetchUserData = async () => {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setName(data.displayName || "");
            setBio(data.bio || "");
            setExistingPhotoURL(data.photoURL || user.photoURL || ""); // Load existing photo
          } else {
            setName(user.displayName || "");
            setBio("");
            setExistingPhotoURL(user.photoURL || "");
          }
        } catch (error) {
          console.warn("Failed to load profile data:", error);
        }
      };
      fetchUserData();
    }
  }, [open, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || loading) return;

    setLoading(true);

    try {
      // Start with the existing photo URL so it isn't lost
      let downloadURL = existingPhotoURL;

      // Only upload and change the URL if a new file was picked
      if (imageFile) {
        const storageRef = ref(storage, `profiles/${user.uid}`);
        const uploadResult = await uploadBytes(storageRef, imageFile);
        downloadURL = await getDownloadURL(uploadResult.ref);
      }

      const userRef = doc(db, "users", user.uid);
      
      await setDoc(userRef, {
        displayName: name,
        displayNameLower: name.toLowerCase(),
        bio: bio,
        photoURL: downloadURL, // This will be the NEW url OR the OLD one
        uid: user.uid,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      setOpen(false);
      setPreviewUrl(null);
      setImageFile(null);
    } catch (error: any) {
      console.error("Profile update error:", error);
      alert(`Failed to update profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="font-semibold">
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Change your public display name, bio, and profile picture.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-6 pt-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2">
                {/* Priority: 1. Local Preview, 2. Existing Firestore Photo, 3. Auth Photo */}
                <AvatarImage src={previewUrl || existingPhotoURL || undefined} />
                <AvatarFallback className="text-xl">
                  {name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="h-6 w-6" />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  disabled={loading} 
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Click photo to change</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="resize-none"
              rows={4}
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}