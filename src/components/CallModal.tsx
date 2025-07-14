import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';
import { X } from 'lucide-react';

interface CallModalProps {
  open: boolean;
  onClose: () => void;
  room: string;
  currentUser: any;
  peerUser: any;
  socket: any; // Socket.IO client instance
}

const CallModal: React.FC<CallModalProps> = ({ open, onClose, room, currentUser, peerUser, socket }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ICE servers config
  const config = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  };

  // Setup media and peer connection
  useEffect(() => {
    if (!open) return;
    let pc: RTCPeerConnection;
    let stream: MediaStream;
    let isInitiator = false;
    let cleanup = false;
    setConnecting(true);
    setError(null);

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setLocalStream(stream);
        pc = new RTCPeerConnection(config);
        setPeerConnection(pc);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('signal', { room, signal: { candidate: event.candidate } });
          }
        };
        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        // Join the room
        socket.emit('joinRoom', { roomId: room });
        // Initiator logic: first to join creates offer
        socket.emit('signal', { room, signal: { ready: true } });
      } catch (err: any) {
        setError('Could not access camera/microphone.');
        setConnecting(false);
      }
    }

    start();

    // Handle signaling
    const handleSignal = async ({ signal }: any) => {
      if (!pc) return;
      try {
        if (signal.ready && pc.signalingState === 'stable') {
          // Create offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('signal', { room, signal: { sdp: pc.localDescription } });
        }
        if (signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          if (signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('signal', { room, signal: { sdp: pc.localDescription } });
          }
        }
        if (signal.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {
            // Ignore duplicate candidates
          }
        }
      } catch (e) {
        setError('WebRTC signaling error.');
      }
    };
    const handlePeerLeft = () => {
      setError('The other user has left the call.');
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };
    socket.on('signal', handleSignal);
    socket.on('peer-left', handlePeerLeft);

    setConnecting(false);

    return () => {
      cleanup = true;
      socket.off('signal', handleSignal);
      socket.off('peer-left', handlePeerLeft);
      if (pc) {
        pc.close();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setPeerConnection(null);
      setLocalStream(null);
    };
    // eslint-disable-next-line
  }, [open, room]);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Video Call with {peerUser?.displayName || peerUser?.username || 'User'}</DialogTitle>
        </DialogHeader>
        <button
          className="absolute right-4 top-4 rounded-full p-2 bg-gray-100 hover:bg-gray-200"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-col md:flex-row gap-4 items-center justify-center mt-4">
          <div className="flex flex-col items-center">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-64 h-48 bg-black rounded-lg border shadow"
            />
            <span className="mt-2 text-xs text-gray-500">You</span>
          </div>
          <div className="flex flex-col items-center">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-64 h-48 bg-black rounded-lg border shadow"
            />
            <span className="mt-2 text-xs text-gray-500">{peerUser?.displayName || peerUser?.username || 'Other User'}</span>
          </div>
        </div>
        {connecting && <div className="mt-4 text-blue-500">Connecting...</div>}
        {error && <div className="mt-4 text-red-500">{error}</div>}
      </DialogContent>
    </Dialog>
  );
};

export default CallModal; 