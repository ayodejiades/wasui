"use client";

import { useState } from "react";
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Camera, MapPin, Plus, Trash2, Clock } from "lucide-react";
import MapboxMap from "../components/MapboxMap";
import ARView from "../components/ARView";
import { useGameLogic, Treasure } from "../hooks/useGameLogic";
import { generateLocationProof } from "../utils/zkProof";
import { rateLimiter, RATE_LIMITS } from "../utils/rateLimit";
import { logger, logError } from "../utils/logger";

export default function Home() {
  const { userLocation, treasures, nearbyTreasure, addLocalTreasure, removeLocalTreasure, isLoadingTreasures } = useGameLogic();
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  // UI States
  const [isProcessing, setIsProcessing] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [arMode, setArMode] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [selectedTreasure, setSelectedTreasure] = useState<Treasure | null>(null);

  const activeTreasure = selectedTreasure || nearbyTreasure;
  const isNearby = activeTreasure && nearbyTreasure && activeTreasure.id === nearbyTreasure.id;

  // TREASURE CREATION 
  const handleMapClick = async (lat: number, lng: number) => {
    if (!createMode) {
      setSelectedTreasure(null);
      return;
    }
    if (!account) return;

    // Check rate limit
    if (!rateLimiter.isAllowed(RATE_LIMITS.TREASURE_CREATE)) {
      const remaining = Math.ceil(rateLimiter.getRemainingCooldown(RATE_LIMITS.TREASURE_CREATE) / 1000);
      setRateLimitMessage(`Please wait ${remaining} seconds before creating another treasure`);
      setTimeout(() => setRateLimitMessage(null), 3000);
      logger.warn('Treasure creation rate limited', { user: account.address, remaining });
      return;
    }

    const name = prompt("Enter a name for this Stash:");
    if (!name) return;

    setIsProcessing(true);
    const tx = new Transaction();

    // Construct Move Call
    tx.moveCall({
      target: `${process.env.NEXT_PUBLIC_SUI_PACKAGE_ID}::game::create_treasure`,
      arguments: [
        tx.pure.string(name),
        tx.pure.string("UGC Stash"),
        tx.pure.string(lat.toString()),
        tx.pure.string(lng.toString())
      ]
    });

    signAndExecute(
      // @ts-ignore - Options required for ID retrieval
      { transaction: tx, chain: 'sui:testnet', options: { showObjectChanges: true } },
      {
        onSuccess: (res: any) => {
          // Robust ID Parsing
          const createdObj = res.objectChanges?.find((c: any) => c.type === 'created');
          const newId = createdObj?.objectId || `temp-${Date.now()}`;

          addLocalTreasure({
            id: newId,
            creator: account.address,
            name: name,
            description: "New",
            lat, lng, isClaimed: false
          });
          setCreateMode(false);
          alert("Stash deployed on-chain! 🎉");
        },
        onError: (e) => {
          logError('Failed to create treasure', e, { user: account.address, name, lat, lng });
          alert("Failed to deploy stash: " + e.message);
        }
      }
    );
    setIsProcessing(false);
  };


  const handleDelete = (t: Treasure) => {
    if (!account) return;

    // Handle local-only items (failed deployments or optimistic updates)
    if (t.id.startsWith("temp-")) {
      if (confirm(`Remove local stash "${t.name}"?`)) {
        removeLocalTreasure(t.id);
        setSelectedTreasure(null);
        alert("Local stash removed.");
      }
      return;
    }

    if (confirm(`Burn "${t.name}"? Gas fees apply.`)) {
      setIsProcessing(true);
      const tx = new Transaction();
      tx.moveCall({
        target: `${process.env.NEXT_PUBLIC_SUI_PACKAGE_ID}::game::delete_treasure`,
        arguments: [tx.object(t.id)]
      });

      signAndExecute({ transaction: tx }, {
        onSuccess: () => {
          removeLocalTreasure(t.id);
          setArMode(false);
          setSelectedTreasure(null);
          alert("Treasure burned!");
        },
        onError: (e) => {
          logError('Failed to delete treasure', e, { user: account.address, treasureId: t.id });
          alert("Burn failed: " + e.message);
        }
      });
      setIsProcessing(false);
    }
  };


  const handleOpenTreasure = async (t: Treasure) => {
    if (!account || !userLocation) return;

    // Check for temp ID
    if (t.id.startsWith("temp-")) {
      alert("This stash is syncing with the blockchain. Please wait a moment and try again.");
      return;
    }

    setIsProcessing(true);
    try {
      // Generate ZK Proof (Client Side privacy)
      await generateLocationProof(userLocation.lat, userLocation.lng, t.id);

      // Submit to Blockchain
      const tx = new Transaction();
      tx.moveCall({
        target: `${process.env.NEXT_PUBLIC_SUI_PACKAGE_ID}::game::claim_treasure_with_proof`,
        arguments: [
          tx.object(t.id),
          tx.object("0x8"),
          tx.pure.vector("u8", [1, 2, 3])
        ]
      });

      signAndExecute({ transaction: tx }, {
        onSuccess: (res) => {
          alert(`🎉 Loot Claimed! Digest: ${res.digest.slice(0, 8)}...`);
          setArMode(false);
        },
        onError: (e) => {
          logError('Failed to claim treasure', e, { user: account.address, treasureId: t.id });
          alert("Transaction failed. Try again.");
        }
      });
    } catch (e) {
      logError('Error during treasure claim', e, { user: account.address, treasureId: t.id });
      alert("An error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">

      {/* AR VIEW OVERLAY */}
      {arMode && nearbyTreasure && (
        <ARView
          treasureName={nearbyTreasure.name}
          onClose={() => setArMode(false)}
          onClaim={() => handleOpenTreasure(nearbyTreasure)}
          isProcessing={isProcessing}
        />
      )}

      {/* MAP LAYER */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${arMode ? 'opacity-0' : 'opacity-100'}`}>
        <MapboxMap
          userLocation={userLocation}
          treasures={treasures}
          onMapClick={handleMapClick}
          onTreasureClick={(t) => {
            setSelectedTreasure(t);
            setCreateMode(false);
          }}
        />
      </div>

      {/* UI OVERLAY (Only visible if not in AR) */}
      {!arMode && (
        <div className="relative z-10 flex flex-col h-full justify-between p-4 sm:p-6 pointer-events-none">

          {/* Header */}
          <div className="flex justify-between items-start pointer-events-auto">
            {/* Glass Container */}
            <div className="relative group overflow-hidden bg-gradient-to-br from-white/10 via-black/30 to-black/50 backdrop-blur-2xl p-3 sm:p-5 rounded-2xl border border-white/10 border-t-white/20 border-l-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] hover:shadow-[0_8px_32px_0_rgba(0,234,255,0.2)] transition-all duration-500 max-w-[50%] sm:max-w-none">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              {/* Content */}
              <div className="relative z-10">
                <h1 className="text-2xl sm:text-4xl font-black tracking-tighter italic bg-gradient-to-r from-cyan-300 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,234,255,0.3)]">
                  wa <span className="text-cyan-200/90 mix-blend-overlay">SUI</span>
                </h1>

                <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-3">
                  <div className="relative flex items-center justify-center w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-black/20 shadow-inner ring-1 ring-white/10">
                    <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shadow-lg ${userLocation ? 'bg-green-400 shadow-green-400/50' : 'bg-red-400 shadow-red-400/50'}`} />
                  </div>

                  <p className="text-[10px] sm:text-xs font-mono text-cyan-100/70 tracking-widest tabular-nums drop-shadow-sm truncate">
                    {userLocation
                      ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
                      : "SIGNAL..."}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <ConnectButton />
              <button
                onClick={() => setCreateMode(!createMode)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-lg hover:scale-105 active:scale-95
                        ${createMode
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black animate-pulse shadow-[0_0_20px_rgba(234,179,8,0.6)] hover:shadow-[0_0_30px_rgba(234,179,8,0.8)]'
                    : 'bg-gradient-to-r from-gray-900 to-gray-800 text-white border border-cyan-500/30 hover:border-cyan-500/60 shadow-[0_0_15px_rgba(0,234,255,0.2)] hover:shadow-[0_0_25px_rgba(0,234,255,0.4)]'}`}
              >
                {createMode ? "TAP MAP TO PLACE" : <><Plus size={18} className="animate-pulse" /> CREATE STASH</>}
              </button>

              {/* Rate Limit Message */}
              {rateLimitMessage && (
                <div className="bg-orange-500/20 border border-orange-500/40 rounded-lg px-4 py-2 text-xs text-orange-300 flex items-center gap-2 animate-fade-in-up">
                  <Clock size={14} />
                  {rateLimitMessage}
                </div>
              )}
            </div>
          </div>

          {/* Blockchain Sync Loading Indicator */}
          {isLoadingTreasures && (
            <div className="mt-2 text-right items-center animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-cyan-500/30">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                <span className="text-xs text-cyan-400 font-mono tracking-wider">SYNCING CHAIN...</span>
              </div>
            </div>
          )}

          {/* Bottom Interaction Area */}
          <div className="flex flex-col items-center gap-4 mb-6 pointer-events-auto">

            {activeTreasure ? (
              <div className="flex flex-col gap-3 items-center w-full max-w-sm">

                {/* Treasure Info Card */}
                {!isNearby && (
                  <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-gray-600 mb-2 animate-fade-in-up text-center">
                    <p className="text-gray-300 text-sm font-bold">{activeTreasure.name}</p>
                    <p className="text-gray-500 text-xs mt-1">Move closer to claim</p>
                  </div>
                )}

                {/* AR Button (Only if nearby) */}
                {isNearby && (
                  <button
                    onClick={() => setArMode(true)}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-[length:200%_100%] hover:bg-[position:100%_0] text-white font-black py-5 rounded-2xl shadow-[0_0_40px_rgba(0,200,255,0.5)] hover:shadow-[0_0_60px_rgba(0,200,255,0.8)] flex items-center justify-center gap-3 transform transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-cyan-400/50 hover:border-cyan-300 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <Camera size={26} className="relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                    <span className="relative z-10 tracking-wider drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">ENTER AR MODE</span>
                  </button>
                )}

                {/* Quick Claim (Fallback - Only if nearby) */}
                {isNearby && (
                  <button
                    disabled={isProcessing}
                    onClick={() => handleOpenTreasure(activeTreasure)}
                    className="text-sm text-gray-400 underline hover:text-cyan-400 transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(0,234,255,0.8)] font-medium"
                  >
                    {isProcessing ? "Verifying..." : "Or claim without AR"}
                  </button>
                )}

                {/* Delete Option (If Creator) - Available even if remote */}
                {account && activeTreasure.creator.toLowerCase() === account.address.toLowerCase() && (
                  <button
                    onClick={() => handleDelete(activeTreasure)}
                    disabled={isProcessing}
                    className="flex items-center gap-2 text-sm text-red-400 bg-black/60 px-5 py-2.5 rounded-full border border-red-500/40 hover:bg-red-900/30 hover:border-red-500/70 transition-all duration-300 disabled:opacity-50 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] font-semibold hover:scale-105 active:scale-95"
                  >
                    <Trash2 size={14} className="drop-shadow-[0_0_4px_rgba(239,68,68,0.8)]" /> Burn Stash
                  </button>
                )}
              </div>
            ) : (
              userLocation && (
                <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 flex items-center gap-3 animate-fade-in-up">
                  <MapPin size={16} className="text-gray-400" />
                  <p className="text-xs font-mono text-gray-300">
                    Explore the map to find Stashes...
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )
      }
    </main >
  );
}