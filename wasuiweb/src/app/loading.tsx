export default function Loading() {
    return (
        <div className="flex items-center justify-center h-screen bg-black">
            <div className="text-center">
                <div className="w-20 h-20 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-[0_0_30px_rgba(0,234,255,0.6)]" />
                <h2 className="text-2xl font-black text-cyan-400 mb-2 drop-shadow-[0_0_10px_rgba(0,234,255,0.8)]">
                    Loading waSUI...
                </h2>
                <p className="text-gray-400 font-mono text-sm">Initializing AR treasure hunt</p>
            </div>
        </div>
    );
}
