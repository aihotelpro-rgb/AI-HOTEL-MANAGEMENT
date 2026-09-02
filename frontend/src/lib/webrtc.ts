import { apiRequest } from './api';

// High-availability ICE Configuration including TURN over TCP 443 (Bypasses Jio Wi-Fi & BSNL Mobile CGNAT)
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:openrelay.metered.ca:80' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
};

export class IntercomAudioSession {
  private callId: string;
  private role: 'caller' | 'receiver';
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private signalInterval: any = null;
  private relayInterval: any = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recorderTimer: any = null;
  private processedCandidates = new Set<string>();
  private remoteDescSet = false;
  private lastChunkId = 0;
  private isStopped = false;

  constructor(callId: string, role: 'caller' | 'receiver') {
    this.callId = callId;
    this.role = role;
  }

  public async start() {
    try {
      if (typeof window === 'undefined') return;
      this.isStopped = false;

      // 1. Create WebRTC PeerConnection
      this.pc = new RTCPeerConnection(ICE_CONFIG);

      // 2. Setup remote audio element
      this.remoteAudio = new Audio();
      this.remoteAudio.autoplay = true;
      (this.remoteAudio as any).playsInline = true;

      // 3. Handle WebRTC remote track stream
      this.pc.ontrack = (event) => {
        if (event.streams && event.streams[0] && this.remoteAudio) {
          this.remoteAudio.srcObject = event.streams[0];
          this.remoteAudio.play().catch((e) => console.warn('Remote audio play warning:', e));
        }
      };

      // 4. Handle ICE candidates generated locally
      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          apiRequest('/api/v1/intercom/signal', {
            method: 'POST',
            body: JSON.stringify({
              call_id: this.callId,
              sender: this.role,
              type: 'candidate',
              payload: event.candidate.toJSON(),
            }),
          }).catch(() => {});
        }
      };

      // 5. Request microphone access FIRST so audio track is attached BEFORE offer/answer creation!
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          
          // Attach tracks to WebRTC PeerConnection (Engine 1)
          this.localStream.getTracks().forEach((track) => {
            if (this.pc && this.localStream) {
              this.pc.addTrack(track, this.localStream);
            }
          });

          // Initialize MediaRecorder for HTTP Audio Relay (Engine 2: Cross-ISP Fallback)
          this.startMediaRecorderRelay(this.localStream);
        }
      } catch (err) {
        console.warn('Microphone permission warning:', err);
      }

      // 6. Role specific SDP offer/answer creation (AFTER microphone tracks are added!)
      if (this.role === 'caller') {
        const offer = await this.pc.createOffer({
          offerToReceiveAudio: true
        });
        await this.pc.setLocalDescription(offer);
        await apiRequest('/api/v1/intercom/signal', {
          method: 'POST',
          body: JSON.stringify({
            call_id: this.callId,
            sender: 'caller',
            type: 'offer',
            payload: offer,
          }),
        });
      }

      // 7. Start polling WebRTC signaling server & Audio Relay stream
      this.startSignalPolling();
      this.startAudioRelayPolling();
    } catch (err) {
      console.warn('Intercom audio session start error:', err);
    }
  }

  // Engine 2 (Sender): Record microphone in self-contained 1.2s chunks with valid WebM headers
  private startMediaRecorderRelay(stream: MediaStream) {
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      const recordSlice = () => {
        if (this.isStopped || !this.localStream) return;
        try {
          const recorder = new MediaRecorder(stream, { mimeType });
          const chunks: Blob[] = [];

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          recorder.onstop = () => {
            if (chunks.length > 0 && !this.isStopped) {
              const fullBlob = new Blob(chunks, { type: mimeType });
              const reader = new FileReader();
              reader.onloadend = async () => {
                const base64Data = reader.result as string;
                if (base64Data && !this.isStopped) {
                  await apiRequest('/api/v1/intercom/audio-relay', {
                    method: 'POST',
                    body: JSON.stringify({
                      call_id: this.callId,
                      sender: this.role,
                      audio: base64Data,
                    }),
                  }).catch(() => {});
                }
              };
              reader.readAsDataURL(fullBlob);
            }

            // Schedule next slice if session active
            if (!this.isStopped) {
              this.recorderTimer = setTimeout(recordSlice, 150);
            }
          };

          recorder.start();
          setTimeout(() => {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          }, 1200);
        } catch (e) {
          console.warn('Recorder slice error', e);
        }
      };

      recordSlice();
    } catch (err) {
      console.warn('MediaRecorder relay start skipped:', err);
    }
  }

  // Engine 2 (Receiver): Poll new self-contained audio chunks from opposite peer and play them
  private startAudioRelayPolling() {
    this.relayInterval = setInterval(async () => {
      if (this.isStopped) return;
      try {
        const chunks = await apiRequest(
          `/api/v1/intercom/audio-relay?call_id=${this.callId}&role=${this.role}&last_id=${this.lastChunkId}`
        );
        if (Array.isArray(chunks) && chunks.length > 0) {
          for (const chunk of chunks) {
            if (chunk.id > this.lastChunkId) {
              this.lastChunkId = chunk.id;
              this.playAudioChunk(chunk.audio);
            }
          }
        }
      } catch (err) {
        // ignore polling glitches
      }
    }, 600);
  }

  private playAudioChunk(base64Audio: string) {
    if (this.isStopped || !base64Audio) return;
    try {
      const audio = new Audio(base64Audio);
      audio.autoplay = true;
      (audio as any).playsInline = true;
      audio.play().catch((e) => console.warn('Audio chunk playback warning:', e));
    } catch (err) {}
  }

  private startSignalPolling() {
    this.signalInterval = setInterval(async () => {
      if (this.isStopped || !this.pc) return;
      try {
        const signals = await apiRequest(`/api/v1/intercom/signal?call_id=${this.callId}`);
        if (!signals) return;

        // If receiver: check for caller's SDP offer
        if (this.role === 'receiver' && signals.offer && !this.remoteDescSet) {
          this.remoteDescSet = true;
          await this.pc.setRemoteDescription(new RTCSessionDescription(signals.offer));
          const answer = await this.pc.createAnswer({ offerToReceiveAudio: true });
          await this.pc.setLocalDescription(answer);
          await apiRequest('/api/v1/intercom/signal', {
            method: 'POST',
            body: JSON.stringify({
              call_id: this.callId,
              sender: 'receiver',
              type: 'answer',
              payload: answer,
            }),
          });
        }

        // If caller: check for receiver's SDP answer
        if (this.role === 'caller' && signals.answer && !this.remoteDescSet) {
          this.remoteDescSet = true;
          await this.pc.setRemoteDescription(new RTCSessionDescription(signals.answer));
        }

        // Process incoming ICE candidates
        const remoteCandidates = this.role === 'caller' ? signals.receiverCandidates : signals.callerCandidates;
        if (Array.isArray(remoteCandidates) && this.remoteDescSet) {
          for (const cand of remoteCandidates) {
            const key = JSON.stringify(cand);
            if (!this.processedCandidates.has(key)) {
              this.processedCandidates.add(key);
              try {
                await this.pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {}
            }
          }
        }
      } catch (err) {}
    }, 1000);
  }

  public stop() {
    this.isStopped = true;

    if (this.signalInterval) {
      clearInterval(this.signalInterval);
      this.signalInterval = null;
    }

    if (this.relayInterval) {
      clearInterval(this.relayInterval);
      this.relayInterval = null;
    }

    if (this.recorderTimer) {
      clearTimeout(this.recorderTimer);
      this.recorderTimer = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteAudio) {
      try {
        this.remoteAudio.pause();
        this.remoteAudio.srcObject = null;
      } catch (e) {}
      this.remoteAudio = null;
    }

    if (this.pc) {
      try {
        this.pc.close();
      } catch (e) {}
      this.pc = null;
    }
  }
}
