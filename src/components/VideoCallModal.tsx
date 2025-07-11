import React, { useRef, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  socket: Socket;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' }
];

const VideoCallModal: React.FC<VideoCallModalProps> = ({ isOpen, onClose, roomId, socket }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [callActive, setCallActive] = useState(false);

  // Setup and cleanup WebRTC and signaling on open/close
  useEffect(() => {
    if (!isOpen || !roomId || !socket) return;
    let peerConnection: RTCPeerConnection;
    let localStream: MediaStream;
    let joined = false;
    let remoteHungUp = false;

    async function start() {
      try {
        // 1. Get user media
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = localStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        // 2. Create peer connection
        peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peerConnectionRef.current = peerConnection;
        // 3. Add local tracks
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });
        // 4. Handle remote stream
        peerConnection.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };
        // 5. Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('video-signal', { roomId, signal: { candidate: event.candidate } });
          }
        };
        // 6. Join call room
        socket.emit('join-call-room', { roomId });
        joined = true;
        setCallActive(true);
      } catch (err) {
        alert('Could not start video call: ' + (err as any).message);
        onClose();
      }
    }
    start();

    // --- Signaling handlers ---
    const handleSignal = async (signal: any) => {
      if (!peerConnectionRef.current) return;
      const pc = peerConnectionRef.current;
      if (signal.ready && pc.signalingState === 'stable') {
        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('video-signal', { roomId, signal: { sdp: pc.localDescription } });
      }
      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('video-signal', { roomId, signal: { sdp: pc.localDescription } });
        }
      }
      if (signal.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (e) {
          // Ignore duplicate candidates
        }
      }
    };

    const handleVideoSignal = (data: { signal: any; from: string }) => {
      handleSignal(data.signal);
    };
    const handlePeerLeft = () => {
      remoteHungUp = true;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setCallActive(false);
      alert('The other user has left the call.');
      // Optionally, auto-close modal
      // onClose();
    };
    socket.on('video-signal', handleVideoSignal);
    socket.on('peer-left', handlePeerLeft);

    // Initiate ready signal after joining
    socket.emit('video-signal', { roomId, signal: { ready: true } });

    // Cleanup on close
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (joined) {
        socket.emit('video-signal', { roomId, signal: { hangup: true } });
      }
      socket.off('video-signal', handleVideoSignal);
      socket.off('peer-left', handlePeerLeft);
      setCallActive(false);
    };
    // eslint-disable-next-line
  }, [isOpen, roomId, socket]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-white rounded-lg shadow-lg p-6 relative w-full max-w-2xl flex flex-col items-center">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl font-bold"
          onClick={onClose}
          aria-label="Close video call"
        >
          &times;
        </button>
        <h2 className="text-lg font-semibold mb-4">Video Call {roomId ? `- Room: ${roomId}` : ''}</h2>
        <div className="flex gap-4 w-full justify-center">
          <div className="flex flex-col items-center">
            <span className="text-xs mb-1">You</span>
            <video ref={localVideoRef} autoPlay muted playsInline className="w-48 h-36 bg-black rounded-lg" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs mb-1">Remote</span>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-48 h-36 bg-black rounded-lg" />
          </div>
        </div>
        {/* Controls (mute, camera, etc.) can be added here later */}
        {!callActive && <div className="mt-4 text-sm text-gray-500">Waiting for peer to join...</div>}
      </div>
    </div>
  );
};

export default VideoCallModal; 