"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { 
  collection, query, orderBy, onSnapshot, addDoc, 
  updateDoc, serverTimestamp, doc, getDoc, deleteDoc 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, Send, Loader2, Trash2, Pencil, X, ImageIcon, Check } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  createdAt: any;
}

export default function ChatRoom() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveMessageId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!chatId || !user) return;
    const fetchChatData = async () => {
      try {
        const chatSnap = await getDoc(doc(db, "chats", chatId as string));
        if (chatSnap.exists()) {
          const data = chatSnap.data();
          const otherId = data.participants.find((id: string) => id !== user.uid);
          const userSnap = await getDoc(doc(db, "users", otherId));
          if (userSnap.exists()) setOtherUser(userSnap.data());
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchChatData();
  }, [chatId, user]);

  useEffect(() => {
    if (!chatId) return;
    const q = query(collection(db, "chats", chatId as string, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, [chatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !imageFile) || !user || !chatId || isUploading) return;

    setIsUploading(true);
    let url = null;

    try {
      if (imageFile) {
        const fileRef = ref(storage, `chats/${chatId}/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(fileRef, imageFile);
        url = await getDownloadURL(uploadResult.ref);
      }

      if (editingMessageId) {
        await updateDoc(doc(db, "chats", chatId as string, "messages", editingMessageId), {
          text: newMessage,
          updatedAt: serverTimestamp(),
        });
        setEditingMessageId(null);
      } else {
        await addDoc(collection(db, "chats", chatId as string, "messages"), {
          senderId: user.uid,
          text: newMessage,
          imageUrl: url,
          createdAt: serverTimestamp(),
        });
      }

      await updateDoc(doc(db, "chats", chatId as string), {
        lastMessage: url ? "📷 Photo" : newMessage,
        updatedAt: serverTimestamp(),
      });

      setNewMessage("");
      setImageFile(null);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const startEditing = (msg: Message) => {
    setEditingMessageId(msg.id);
    setNewMessage(msg.text);
    setActiveMessageId(null);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!chatId) return;
    try {
      await deleteDoc(doc(db, "chats", chatId as string, "messages", messageId));
      setActiveMessageId(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen bg-[#020617]">
      <Loader2 className="animate-spin text-slate-400" />
    </div>
  );

  return (
    <main className="flex flex-col h-[calc(100vh-3.5rem)] mt-14 sm:mt-0 sm:h-screen bg-[#020617] text-slate-100 max-w-2xl mx-auto border-x border-slate-800/60 shadow-2xl overflow-hidden">
      {/* Header */}
      <header className="flex items-center p-4 border-b border-slate-800/60 bg-[#020617]/95 backdrop-blur-xl sticky top-0 z-20">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push("/messages")} 
          className="mr-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-full"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="relative">
          <Avatar className="h-10 w-10 ring-2 ring-slate-800/50">
            <AvatarImage src={otherUser?.photoURL} />
            <AvatarFallback className="bg-slate-800 text-slate-300">
              {otherUser?.displayName?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 border-2 border-[#020617] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        </div>
        <div className="flex flex-col ml-3">
          <span className="font-semibold text-sm tracking-tight">{otherUser?.displayName || "User"}</span>
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Online</span>
        </div>
      </header>

      {/* Chat Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-[#020617] to-[#020617]">
        {messages.map((msg, index) => {
          const isMe = msg.senderId === user?.uid;
          const isActive = activeMessageId === msg.id;
          
          // 🔹 GROUPING LOGIC: Check if the next message is from the same person
          const isLastFromUser = messages[index + 1]?.senderId !== msg.senderId;

          return (
            <div 
              key={msg.id} 
              className={`flex flex-col ${isMe ? "items-end" : "items-start"} group ${isLastFromUser ? "mb-4" : "mb-1"}`}
              onClick={(e) => {
                e.stopPropagation(); 
                if (isMe && !editingMessageId) setActiveMessageId(isActive ? null : msg.id);
              }}
            >
              <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                
                {/* 🔹 AVATAR: Only show on the last message of a block */}
                {!isMe && (
                  <div className="w-7 flex-shrink-0">
                    {isLastFromUser ? (
                      <Avatar className="h-7 w-7 border border-slate-800">
                        <AvatarImage src={otherUser?.photoURL} />
                        <AvatarFallback className="bg-slate-800 text-[10px]">{otherUser?.displayName?.[0]}</AvatarFallback>
                      </Avatar>
                    ) : <div className="w-7" />}
                  </div>
                )}

                {/* Edit/Delete Actions */}
                {isMe && isActive && (
                  <div className="flex gap-1 animate-in zoom-in duration-200">
                    <button onClick={(e) => { e.stopPropagation(); startEditing(msg); }} className="p-2 text-blue-300 bg-slate-900 rounded-full border border-slate-800 hover:bg-slate-800 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }} className="p-2 text-rose-400 bg-slate-900 rounded-full border border-slate-800 hover:bg-slate-800 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`relative transition-all duration-300 overflow-hidden shadow-sm ${
                  isMe 
                    ? `bg-blue-600 text-white ${isLastFromUser ? "rounded-2xl rounded-br-none" : "rounded-2xl"}` 
                    : `bg-slate-900/90 text-slate-100 border border-slate-800/50 backdrop-blur-sm ${isLastFromUser ? "rounded-2xl rounded-bl-none" : "rounded-2xl"}`
                } ${isActive ? "ring-2 ring-blue-400 scale-[1.02]" : ""}`}>
                  
                  {msg.imageUrl && (
                    <div className="relative group/media">
                      <img 
                        src={msg.imageUrl} 
                        alt="Shared" 
                        className="w-full aspect-auto max-h-72 object-cover cursor-pointer" 
                        onClick={() => window.open(msg.imageUrl, '_blank')}
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover/media:bg-transparent transition-colors" />
                    </div>
                  )}
                  
                  {msg.text && (
                    <div className="px-4 py-2.5 text-[14px] leading-relaxed font-medium">
                      {msg.text}
                    </div>
                  )}
                </div>
              </div>

              {/* 🔹 TIMESTAMP: Only show on last message or if active */}
              {(isLastFromUser || isActive) && (
                <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? "mr-1" : "ml-9"}`}>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter opacity-70">
                    {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), "h:mm a") : "Sending..."}
                  </span>
                  {isMe && <Check className="h-2.5 w-2.5 text-blue-500" />}
                </div>
              )}
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Footer / Input */}
      <div className="p-4 bg-[#020617] border-t border-slate-800/40">
        <div className="max-w-3xl mx-auto">
          {imageFile && (
            <div className="relative inline-block mb-3 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <img src={URL.createObjectURL(imageFile)} alt="preview" className="h-24 w-24 object-cover rounded-lg" />
              <button onClick={() => setImageFile(null)} className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-500 rounded-full p-1.5 shadow-xl transition-transform hover:scale-110">
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          )}

          {editingMessageId && (
            <div className="flex items-center justify-between mb-3 px-3 py-2 bg-blue-500/10 border-l-4 border-blue-500 rounded-r-lg animate-in slide-in-from-left-2">
              <span className="text-[11px] text-blue-400 font-bold uppercase tracking-widest">Editing message...</span>
              <button onClick={() => { setEditingMessageId(null); setNewMessage(""); }} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
          )}
          
          <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
            <div className="flex-1 flex items-center gap-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-1.5 focus-within:bg-slate-900/60 focus-within:border-blue-500/40 transition-all duration-200 backdrop-blur-sm">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="text-slate-400 hover:text-blue-400 hover:bg-slate-800/50 shrink-0 rounded-xl h-9 w-9"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-5 w-5" />
              </Button>

              <Input
                placeholder="Message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="bg-transparent border-none focus-visible:ring-0 text-slate-100 placeholder:text-slate-500 h-9 text-[14px]"
              />
            </div>
            
            <Button 
              type="submit" 
              size="icon" 
              disabled={(!newMessage.trim() && !imageFile) || isUploading} 
              className="bg-blue-600 hover:bg-blue-500 text-white h-10 w-10 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all shrink-0"
            >
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}