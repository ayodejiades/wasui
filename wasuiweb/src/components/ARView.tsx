"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Camera } from "lucide-react";

interface ARViewProps {
  onClose: () => void;
  onClaim: () => void;
  treasureName: string;
  isProcessing: boolean;
}

export default function ARView({ onClose, onClaim, treasureName, isProcessing }: ARViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamAllowed, setStreamAllowed] = useState(false);

  useEffect(() => {
    // Access Camera
    // Access Camera
    async function setupCamera() {
      try {
        let stream: MediaStream;
        try {
          // Try rear camera first with ideal constraint
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } }
          });
        } catch (e) {
          console.warn("Rear camera access failed, trying fallback:", e);
          // Fallback to any available video source
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamAllowed(true);
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        alert("Camera permission is required for AR Mode. Please check your browser settings or use the non-AR claim option.");
        onClose();
      }
    }
    setupCamera();

    // Cleanup: Stop camera when component unmounts
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover opacity-80"
      />

      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10">
        <div className="bg-black/60 backdrop-blur-xl px-5 py-3 rounded-xl border border-cyan-500/40 shadow-[0_0_25px_rgba(0,234,255,0.3)]">
          <p className="text-xs text-cyan-400 font-mono tracking-wider font-semibold drop-shadow-[0_0_6px_rgba(0,234,255,0.8)]">⚡ AR SYSTEM: ONLINE</p>
          <h2 className="text-2xl font-black text-white mt-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">{treasureName}</h2>
        </div>
        <button
          onClick={onClose}
          className="bg-black/60 p-3 rounded-full border-2 border-red-500/40 text-white hover:bg-red-900/40 hover:border-red-500/80 transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] hover:scale-110 active:scale-95"
        >
          <X size={26} className="drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
        </button>
      </div>

      {/* The Floating Treasure (3D CSS) */}
      {streamAllowed && (
        <motion.div
          initial={{ scale: 0, rotateY: 0 }}
          animate={{ scale: 1, rotateY: 360 }}
          transition={{ duration: 1, type: "spring" }}
          className="relative z-20 cursor-pointer group"
          onClick={onClaim}
        >
          {/* Glowing Orb / Chest Representation */}
          <div className="relative w-48 h-48">
            <div className="absolute inset-0 bg-yellow-500 rounded-full blur-[50px] opacity-30 animate-pulse"></div>
            <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-600 rounded-xl border-4 border-white/50 shadow-2xl flex items-center justify-center transform rotate-45 hover:scale-110 transition-transform">
              <span className="text-6xl -rotate-45 transform">💎</span>
            </div>
          </div>

          <p className="mt-8 text-center text-white font-black text-xl bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent px-6 py-2 rounded-full border-2 border-yellow-400/60 animate-bounce shadow-[0_0_20px_rgba(234,179,8,0.6)] backdrop-blur-sm bg-black/40">
            ✨ TAP TO CLAIM ✨
          </p>
        </motion.div>
      )}

      {/* Processing State Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/90 z-30 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="w-20 h-20 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(0,234,255,0.6)]"></div>
          <p className="mt-6 text-cyan-400 font-mono text-lg font-bold tracking-wider drop-shadow-[0_0_10px_rgba(0,234,255,0.8)] animate-pulse">⚡ VERIFYING ZK PROOF...</p>
        </div>
      )}
    </div>
  );
}
