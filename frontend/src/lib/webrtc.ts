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

      // 5. Request microphone access
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          // Attach track to WebRTC PeerConnection (Engine 1)
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

      // 6. Role specific SDP offer/answer creation
      if (this.role === 'caller') {
        const offer = await this.pc.createOffer({ offerToReceiveAudio: true });
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

  // Engine 2 (Sender): Record microphone in 600ms chunks and post to audio-relay endpoint
  private startMediaRecorderRelay(stream: MediaStream) {
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.mediaRecorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0 && !this.isStopped) {
          try {
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
            reader.readAsDataURL(e.data);
          } catch (err) {}
        }
      };
      this.mediaRecorder.start(600); // 600ms slice interval
    } catch (err) {
      console.warn('MediaRecorder relay start skipped:', err);
    }
  }

  // Engine 2 (Receiver): Poll new audio chunks from opposite peer and play them
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
    }, 500);
  }

  private playAudioChunk(base64Audio: string) {
    if (this.isStopped || !base64Audio) return;
    try {
      const audio = new Audio(base64Audio);
      audio.autoplay = true;
      audio.play().catch(() => {});
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
          const answer = await this.pc.createAnswer();
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
    }, 1200);
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

    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch (e) {}
      this.mediaRecorder = null;
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
