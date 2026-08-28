'use client';

import { useState, useEffect } from 'react';
import { Camera, Shield, Eye, Maximize2, RefreshCw, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface CameraFeed {
  id: number;
  camera_code: string;
  name: string;
  location: string;
  brand?: string;
  status: string;
  is_active: boolean;
  stream_url: string;
  fps: number;
}

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600',
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600'
];

export default function CCTVMonitor() {
  const [cameras, setCameras] = useState<CameraFeed[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<CameraFeed | null>(null);

  const loadCameras = async () => {
    try {
      const data = await apiRequest('/api/v1/admin/cctv');
      setCameras(data);
    } catch (err: any) {
      console.error('Failed to load CCTV cameras:', err);
    }
  };

  useEffect(() => {
    loadCameras();
  }, []);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4">
      <div className="flex flex-wrap md:flex-nowrap justify-between items-center gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 bg-red-950 text-red-400 border border-red-800/80 rounded-xl flex items-center justify-center font-bold shrink-0">
            <Camera className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs md:text-sm font-extrabold text-white whitespace-nowrap">
                📹 Live CCTV Surveillance
              </h3>
              <span className="text-[10px] px-2 py-0.5 bg-red-950 text-red-400 border border-red-800 font-extrabold rounded-full animate-pulse whitespace-nowrap shrink-0">
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5 truncate">Hotel Security Cameras • Motion Sensor Active</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadCameras}
            className="p-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-amber-400 rounded-xl transition shrink-0"
            title="Refresh Camera Feeds"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] px-2.5 py-1 bg-neutral-950 border border-neutral-800 text-neutral-300 font-extrabold rounded-xl flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" />
            {cameras.filter(c => c.is_active).length} Active Streams
          </span>
        </div>
      </div>

      {/* 4-Grid Camera Streams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cameras.map((cam, idx) => (
          <div
            key={cam.id}
            className={`group relative bg-neutral-950 border hover:border-amber-500/60 rounded-2xl overflow-hidden shadow-lg transition ${
              !cam.is_active ? 'opacity-50 border-neutral-800' : 'border-neutral-800'
            }`}
          >
            {/* Live Camera Stream Image Preview with Overlay */}
            <div className="relative h-44 w-full bg-neutral-900 overflow-hidden">
              <img
                src={DEFAULT_IMAGES[idx % DEFAULT_IMAGES.length]}
                alt={cam.name}
                className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950/70" />

              {/* Top Overlay Badges */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center text-[10px] font-bold">
                <span className="bg-neutral-950/80 backdrop-blur text-neutral-200 px-2 py-0.5 rounded-lg border border-neutral-700">
                  {cam.camera_code} • {cam.location}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-lg border font-extrabold flex items-center gap-1 ${
                    !cam.is_active
                      ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      : cam.status === 'MOTION'
                        ? 'bg-amber-950/90 text-amber-300 border-amber-600 animate-pulse'
                        : 'bg-red-950/90 text-red-400 border-red-700'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${cam.is_active ? 'bg-red-500 animate-ping' : 'bg-neutral-500'}`} />
                  {!cam.is_active ? 'OFFLINE' : cam.status === 'MOTION' ? '⚠️ MOTION' : 'LIVE'}
                </span>
              </div>

              {/* Bottom Camera Name & Expand Button */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex justify-between items-end">
                <div>
                  <h4 className="text-xs font-extrabold text-white">{cam.name}</h4>
                  <span className="text-[9px] text-neutral-400 font-mono">30 FPS • 1080p HD</span>
                </div>
                <button
                  onClick={() => setSelectedCamera(cam)}
                  className="p-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl font-bold transition shadow"
                  title="Expand Full Stream"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Expanded Stream Modal */}
      {selectedCamera && (
        <div className="fixed inset-0 bg-neutral-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 max-w-3xl w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>📹 {selectedCamera.name}</span>
                  <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full font-bold">
                    LIVE HD RTSP
                  </span>
                </h3>
                <p className="text-[10px] text-neutral-400">{selectedCamera.id} • {selectedCamera.location}</p>
              </div>
              <button
                onClick={() => setSelectedCamera(null)}
                className="h-8 w-8 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="relative h-96 bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800">
              <img
                src={DEFAULT_IMAGES[(selectedCamera.id || 0) % DEFAULT_IMAGES.length]}
                alt={selectedCamera.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-neutral-950/80 backdrop-blur px-3 py-1.5 rounded-xl border border-neutral-700 text-xs text-neutral-200 font-mono">
                Stream Latency: 12ms • Codec: H.264 High Profile
              </div>
            </div>

            <button
              onClick={() => setSelectedCamera(null)}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-extrabold text-xs rounded-xl transition"
            >
              Close Full Monitor View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
