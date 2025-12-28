"use client";

import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/lib/auth";
import { PlusSquare, Loader2, Image as ImageIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CreatePost() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true); 
  }, []);

  // Clear fields only when the dialog actually closes
  useEffect(() => {
    if (!open) {
      setCaption("");
      setImageFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !imageFile || loading) return;

    setLoading(true);

    try {
      // 1. Upload Image
      const fileName = `${Date.now()}_${imageFile.name}`;
      const storageRef = ref(storage, `posts/${user.uid}/${fileName}`);
      const uploadResult = await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // 2. Create Document
      await addDoc(collection(db, "posts"), {
        caption: caption,
        postImage: downloadURL, 
        userId: user.uid,
        username: user.displayName || "User",
        userImage: user.photoURL || "",
        createdAt: serverTimestamp(), // Matches your new Index
        likes: [],
      });

      // 3. Success
      setOpen(false); 
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(error.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* We use a plain button and clear out default button styles to match the other icons */}
        <button className="p-0 border-none bg-transparent outline-none cursor-pointer hover:scale-110 transition-transform text-white">
          <PlusSquare className="h-7 w-7" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
          <DialogDescription>
            Share a photo and caption with your followers.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleShare} className="space-y-4 pt-4">
          <div className="relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 hover:bg-muted/50 transition cursor-pointer min-h-50">
            {previewUrl ? (
              <div className="relative w-full">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-h-72 w-full rounded-md object-cover" 
                />
                {!loading && (
                  <button
                    type="button"
                    onClick={() => {
                        setImageFile(null);
                        setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer py-10">
                <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground font-medium">Select photo</p>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={loading}
                />
              </label>
            )}
          </div>

          <Textarea
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="resize-none"
            rows={3}
            disabled={loading}
          />

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !imageFile}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sharing...
              </>
            ) : (
              "Share Post"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
