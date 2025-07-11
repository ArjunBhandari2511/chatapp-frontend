import React, { useRef, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  socket: Socket;
  isCaller: boolean;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' }
];

const VideoCallModal: React.FC<VideoCallModalProps> = ({ isOpen, onClose, roomId, socket, isCaller }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [callActive, setCallActive] = useState(false);
  const offerCreatedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !roomId || !socket) return;
    let peerConnection: RTCPeerConnection;
    let localStream: MediaStream;
    let joined = false;

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
          console.log('Received remote track:', event.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };
        // 5. Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('Sending ICE candidate:', event.candidate);
            socket.emit('video-signal', { roomId, signal: { candidate: event.candidate } });
          }
        };
        // 6. Join call room
        socket.emit('join-call-room', { roomId });
        joined = true;
        setCallActive(true);
        // 7. If caller, create offer after joining
        if (isCaller && !offerCreatedRef.current) {
          // Wait a tick to ensure both peers are in the room
          setTimeout(async () => {
            if (peerConnectionRef.current && !offerCreatedRef.current) {
              console.log('Caller creating offer...');
              const offer = await peerConnectionRef.current.createOffer();
              await peerConnectionRef.current.setLocalDescription(offer);
              console.log('Caller set local description (offer):', offer);
              socket.emit('video-signal', { roomId, signal: { sdp: peerConnectionRef.current.localDescription } });
              offerCreatedRef.current = true;
            }
          }, 300);
        }
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
      if (signal.sdp) {
        console.log('Received SDP:', signal.sdp.type, signal.sdp);
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        console.log('Set remote description:', signal.sdp.type);
        if (signal.sdp.type === 'offer') {
          // Only callee creates answer
          if (!isCaller) {
            console.log('Callee creating answer...');
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log('Callee set local description (answer):', answer);
            socket.emit('video-signal', { roomId, signal: { sdp: pc.localDescription } });
          }
        }
      }
      if (signal.candidate) {
        console.log('Received ICE candidate:', signal.candidate);
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          console.log('Added ICE candidate');
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      }
    };

    const handleVideoSignal = (data: { signal: any; from: string }) => {
      handleSignal(data.signal);
    };
    const handlePeerLeft = () => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setCallActive(false);
      alert('The other user has left the call.');
    };
    socket.on('video-signal', handleVideoSignal);
    socket.on('peer-left', handlePeerLeft);

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
      offerCreatedRef.current = false;
    };
    // eslint-disable-next-line
  }, [isOpen, roomId, socket, isCaller]);

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