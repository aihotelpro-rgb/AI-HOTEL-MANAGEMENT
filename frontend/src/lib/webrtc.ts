import { apiRequest } from './api';

// Free high-performance public STUN servers for WebRTC peer connection
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
};

export class IntercomAudioSession {
  private callId: string;
  private role: 'caller' | 'receiver';
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private pollInterval: any = null;
  private processedCandidates = new Set<string>();
  private remoteDescSet = false;

  constructor(callId: string, role: 'caller' | 'receiver') {
    this.callId = callId;
    this.role = role;
  }

  public async start() {
    try {
      if (typeof window === 'undefined') return;

      // 1. Create WebRTC PeerConnection
      this.pc = new RTCPeerConnection(ICE_CONFIG);

      // 2. Setup remote audio output element
      this.remoteAudio = new Audio();
      this.remoteAudio.autoplay = true;
      (this.remoteAudio as any).playsInline = true;

      // 3. Handle incoming remote voice track
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

      // 5. Request microphone access & attach track
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.localStream.getTracks().forEach((track) => {
            if (this.pc && this.localStream) {
              this.pc.addTrack(track, this.localStream);
            }
          });
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

      // 7. Start polling signaling server for remote SDP & ICE candidates
      this.startSignalPolling();
    } catch (err) {
      console.warn('WebRTC audio session start error:', err);
    }
  }

  private startSignalPolling() {
    this.pollInterval = setInterval(async () => {
      try {
        if (!this.pc) return;

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

        // Process incoming ICE candidates from opposite peer
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
      } catch (err) {
        // ignore polling glitches
      }
    }, 1500);
  }

  public stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
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
