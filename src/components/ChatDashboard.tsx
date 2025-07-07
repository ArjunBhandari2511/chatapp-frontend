import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Send, 
  Search, 
  Settings, 
  LogOut, 
  Users, 
  Hash,
  MoreVertical,
  Phone,
  Video,
  Trash,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { fetchChannels, fetchUsers, createChannel, deleteChannel, getCurrentUserId, fetchChannelMessages, sendChannelMessage, fetchDirectMessages, sendDirectMessage, getAuthToken, uploadImage, fetchCurrentUserProfile } from '@/services/api';
import { compressImage, validateImageFile } from '@/utils/imageCompression';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { io, Socket } from 'socket.io-client';
import MessageItem from './MessageItem';
import UploadProgress from './UploadProgress';
import ImagePreview from './ImagePreview';
import ProfileSettings from './ProfileSettings';

const ChatDashboard = () => {
  const [message, setMessage] = useState('');
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [directMessages, setDirectMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newChannelName, setNewChannelName] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const currentUserId = getCurrentUserId();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [userStatus, setUserStatus] = useState<Record<string, 'online' | 'offline'>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'compressing' | 'uploading' | 'completed' | 'error'>('compressing');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeChatRef = useRef(activeChat);
  const channelsRef = useRef(channels);
  const directMessagesRef = useRef(directMessages);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [channelsData, usersData, userProfile] = await Promise.all([
          fetchChannels(),
          fetchUsers(),
          fetchCurrentUserProfile().catch(() => null), // Don't fail if profile fetch fails
        ]);
        setChannels(channelsData);
        setDirectMessages(usersData);
        setCurrentUserProfile(userProfile);
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err.message || 'Failed to fetch channels or users',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  // Fetch messages when activeChat changes
  React.useEffect(() => {
    const fetchMessages = async () => {
      setMessagesLoading(true);
      try {
        // If activeChat is a channel
        const channel = channels.find(c => (c._id || c.id) === activeChat);
        if (channel) {
          const msgs = await fetchChannelMessages(channel._id || channel.id);
          setMessages(msgs);
        } else {
          // Otherwise, treat as direct message
          const user = directMessages.find(u => (u._id || u.id) === activeChat);
          if (user) {
            const msgs = await fetchDirectMessages(user._id || user.id);
            setMessages(msgs);
          } else {
            setMessages([]);
          }
        }
      } catch (err: any) {
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    };
    if (activeChat) fetchMessages();
  }, [activeChat, channels, directMessages]);

  // Connect to Socket.IO server on mount
  React.useEffect(() => {
    const socket = io('ws://localhost:5000', {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket'],
    });
    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, []);

  // Join room on activeChat change
  React.useEffect(() => {
    if (!socketRef.current || !activeChat) return;
    // Room ID: channelId for channels, 'dm-<sortedUserIds>' for DMs
    const channel = channels.find(c => (c._id || c.id) === activeChat);
    if (channel) {
      socketRef.current.emit('joinRoom', { roomId: channel._id || channel.id });
    } else {
      const user = directMessages.find(u => (u._id || u.id) === activeChat);
      if (user && currentUserId) {
        const roomId = [currentUserId, user._id || user.id].sort().join('-');
        socketRef.current.emit('joinRoom', { roomId });
      }
    }
  }, [activeChat, channels, directMessages, currentUserId]);

  // Listen for incoming messages
  React.useEffect(() => {
    if (!socketRef.current) return;
    const handler = (msg: any) => {
      let isForCurrentChat = false;
      const channel = channelsRef.current.find(c => (c._id || c.id) === activeChatRef.current);
      if (channel && msg.type === 'channel') {
        isForCurrentChat = (msg.channel === (channel._id || channel.id));
      } else if (!channel && msg.type === 'direct') {
        const user = directMessagesRef.current.find(u => (u._id || u.id) === activeChatRef.current);
        if (user && currentUserId) {
          const roomId = [currentUserId, user._id || user.id].sort().join('-');
          const msgRoomId = [msg.sender?._id || msg.sender?.id || msg.sender, msg.recipient?._id || msg.recipient?.id || msg.recipient].sort().join('-');
          isForCurrentChat = (roomId === msgRoomId);
        }
      }
      if (isForCurrentChat) {
        setMessages(prev => [...prev, msg]);
      }
      // Only increment if the message is a direct message, not sent by the current user, and not currently viewing that chat
      const senderId = msg.sender._id || msg.sender.id || msg.sender;
      const recipientId = msg.recipient?._id || msg.recipient?.id || msg.recipient;
      if (
        msg.type === 'direct' &&
        recipientId === currentUserId && // Only increment if you are the recipient
        activeChatRef.current !== senderId // Only if you are not viewing this chat
      ) {
        setUnreadCounts(prev => {
          const newCount = (prev[senderId] || 0) + 1;
          console.log('Incrementing unread badge for', senderId, 'to', newCount);
          return {
            ...prev,
            [senderId]: newCount
          };
        });
      }
    };
    socketRef.current.on('messageReceived', handler);
    return () => {
      socketRef.current?.off('messageReceived', handler);
    };
  }, []);

  // Listen for typing events
  React.useEffect(() => {
    if (!socketRef.current) return;
    
    const typingHandler = (data: { sender: string, roomId: string }) => {
      if (data.sender !== currentUserId) {
        const currentRoomId = getCurrentRoomId();
        if (data.roomId === currentRoomId) {
          setTypingUser(data.sender);
        }
      }
    };

    const stopTypingHandler = (data: { sender: string, roomId: string }) => {
      if (data.sender !== currentUserId) {
        const currentRoomId = getCurrentRoomId();
        if (data.roomId === currentRoomId) {
          setTypingUser(null);
        }
      }
    };

    socketRef.current.on('typing', typingHandler);
    socketRef.current.on('stopTyping', stopTypingHandler);
    
    return () => {
      socketRef.current?.off('typing', typingHandler);
      socketRef.current?.off('stopTyping', stopTypingHandler);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [currentUserId, channels, directMessages, activeChat]);

  // Listen for userStatus events from the server
  React.useEffect(() => {
    if (!socketRef.current) return;
    const handler = (data: { userId: string; status: 'online' | 'offline' }) => {
      setUserStatus(prev => ({ ...prev, [data.userId]: data.status }));
    };
    socketRef.current.on('userStatus', handler);
    return () => {
      socketRef.current?.off('userStatus', handler);
    };
  }, []);

  // Listen for currentOnline event from the server and set online status for all those users
  React.useEffect(() => {
    if (!socketRef.current) return;
    const handler = (data: { userIds: string[] }) => {
      setUserStatus(prev => {
        const updated = { ...prev };
        data.userIds.forEach(id => {
          updated[id] = 'online';
        });
        return updated;
      });
    };
    socketRef.current.on('currentOnline', handler);
    return () => {
      socketRef.current?.off('currentOnline', handler);
    };
  }, []);

  // Listen for real-time channel/user updates
  React.useEffect(() => {
    if (!socketRef.current) return;
    const handleChannels = async () => {
      const updated = await fetchChannels();
      setChannels(updated);
    };
    const handleUsers = async () => {
      const updated = await fetchUsers();
      setDirectMessages(updated);
    };
    socketRef.current.on('channelsUpdated', handleChannels);
    socketRef.current.on('usersUpdated', handleUsers);
    return () => {
      socketRef.current?.off('channelsUpdated', handleChannels);
      socketRef.current?.off('usersUpdated', handleUsers);
    };
  }, []);

  // Listen for message editing and deletion events
  React.useEffect(() => {
    if (!socketRef.current) return;
    
    const handleMessageEdited = (editedMessage: any) => {
      setMessages(prev => prev.map(msg => 
        (msg._id || msg.id) === (editedMessage._id || editedMessage.id) 
          ? editedMessage 
          : msg
      ));
    };

    const handleMessageDeleted = (deletedMessage: any) => {
      setMessages(prev => prev.map(msg => 
        (msg._id || msg.id) === (deletedMessage._id || deletedMessage.id) 
          ? deletedMessage 
          : msg
      ));
    };

    socketRef.current.on('messageEdited', handleMessageEdited);
    socketRef.current.on('messageDeleted', handleMessageDeleted);
    
    return () => {
      socketRef.current?.off('messageEdited', handleMessageEdited);
      socketRef.current?.off('messageDeleted', handleMessageDeleted);
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      const channel = channels.find(c => (c._id || c.id) === activeChat);
      if (channel) {
        // Emit via WebSocket
        socketRef.current?.emit('chatMessage', {
          type: 'channel',
          roomId: channel._id || channel.id,
          content: message,
          sender: currentUserId,
        });
      } else {
        const user = directMessages.find(u => (u._id || u.id) === activeChat);
        if (user && currentUserId) {
          const roomId = [currentUserId, user._id || user.id].sort().join('-');
          socketRef.current?.emit('chatMessage', {
            type: 'direct',
            roomId,
            content: message,
            sender: currentUserId,
            recipient: user._id || user.id,
          });
        }
      }
      setMessage('');
      // Clear typing indicator when message is sent
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Play sent sound
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate('/');
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    setCreatingChannel(true);
    try {
      await createChannel(newChannelName.trim());
      setNewChannelName('');
      toast({ title: 'Channel created!' });
      // Refresh channels
      const updated = await fetchChannels();
      setChannels(updated);
      setShowCreateDialog(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreatingChannel(false);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    setDeletingChannelId(id);
    try {
      await deleteChannel(id);
      toast({ title: 'Channel deleted!' });
      // Refresh channels
      const updated = await fetchChannels();
      setChannels(updated);
      if (activeChat === id) setActiveChat('general');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeletingChannelId(null);
    }
  };

  // Emit typing event on input with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    // Only emit typing event if there's actual text content
    if (e.target.value.trim() && socketRef.current) {
      const roomId = getCurrentRoomId();
      if (roomId && currentUserId) {
        // Clear existing typing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        // Emit typing event
        socketRef.current.emit('typing', { roomId, sender: currentUserId });
        // Set timeout to stop typing indicator after 2 seconds of no input
        typingTimeoutRef.current = setTimeout(() => {
          socketRef.current?.emit('stopTyping', { roomId, sender: currentUserId });
        }, 2000);
      }
    } else if (!e.target.value.trim() && typingTimeoutRef.current) {
      // If input is empty, stop typing immediately
      clearTimeout(typingTimeoutRef.current);
      const roomId = getCurrentRoomId();
      if (roomId && currentUserId) {
        socketRef.current?.emit('stopTyping', { roomId, sender: currentUserId });
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast({
        title: 'Error',
        description: validation.error || 'Invalid file',
        variant: 'destructive',
      });
      return;
    }

    // Show image preview
    setSelectedFile(file);
    setCompressedFile(null);
    setShowImagePreview(true);
  };

  const handleImagePreviewConfirm = async () => {
    if (!selectedFile || !activeChat) return;

    setShowImagePreview(false);
    
    // Initialize upload state
    setUploadingImage(true);
    setUploadStatus('compressing');
    setUploadProgress(0);
    setUploadFileName(selectedFile.name);
    setUploadError('');

    try {
      // Step 1: Compress image
      setUploadStatus('compressing');
      setUploadProgress(10);
      
      const compressedFile = await compressImage(selectedFile);
      setUploadProgress(30);

      // Step 2: Upload compressed image with progress tracking
      setUploadStatus('uploading');
      setUploadProgress(40);

      const { imageUrl } = await uploadImage(compressedFile, (progress) => {
        // Map upload progress from 40% to 90% (compression was 30%)
        const mappedProgress = 40 + (progress * 0.5);
        setUploadProgress(mappedProgress);
      });

      setUploadProgress(100);
      setUploadStatus('completed');

      // Step 3: Send image message via WebSocket
      const channel = channels.find(c => (c._id || c.id) === activeChat);
      if (channel) {
        socketRef.current?.emit('chatMessage', {
          type: 'channel',
          content: message.trim() || 'Shared an image',
          roomId: channel._id || channel.id,
          messageType: 'image',
          imageUrl,
        });
      } else {
        const user = directMessages.find(u => (u._id || u.id) === activeChat);
        if (user && currentUserId) {
          const roomId = [currentUserId, user._id || user.id].sort().join('-');
          socketRef.current?.emit('chatMessage', {
            type: 'direct',
            content: message.trim() || 'Shared an image',
            recipient: user._id || user.id,
            roomId,
            messageType: 'image',
            imageUrl,
          });
        }
      }

      setMessage('');
      toast({
        title: 'Success',
        description: 'Image sent successfully',
      });

      // Hide progress after 2 seconds
      setTimeout(() => {
        setUploadingImage(false);
        setUploadStatus('compressing');
        setUploadProgress(0);
        setUploadFileName('');
      }, 2000);

    } catch (error: any) {
      setUploadStatus('error');
      setUploadError(error.message || 'Upload failed');
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });

      // Hide error after 5 seconds
      setTimeout(() => {
        setUploadingImage(false);
        setUploadStatus('compressing');
        setUploadProgress(0);
        setUploadFileName('');
        setUploadError('');
      }, 5000);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImagePreviewCancel = () => {
    setShowImagePreview(false);
    setSelectedFile(null);
    setCompressedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfileSettingsOpen = () => {
    setShowProfileSettings(true);
  };

  const handleProfileSettingsClose = () => {
    setShowProfileSettings(false);
  };

  const handleProfileUpdate = (updatedUser: any) => {
    setCurrentUserProfile(updatedUser);
    // Update the user in the directMessages list if they exist there
    setDirectMessages(prev => 
      prev.map(user => 
        user._id === updatedUser._id ? updatedUser : user
      )
    );
  };

  // Helper to get username from JWT if not found in directMessages
  function getUsernameFromJWT() {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.username || payload.name || null;
    } catch {
      return null;
    }
  }
  const currentUser = React.useMemo(() => {
    return (
      directMessages.find(u => (u._id || u.id) === currentUserId) ||
      { username: getUsernameFromJWT() || localStorage.getItem('username') }
    );
  }, [directMessages, currentUserId]);

  // Helper function to get current room ID
  const getCurrentRoomId = () => {
    const channel = channels.find(c => (c._id || c.id) === activeChat);
    if (channel) {
      return channel._id || channel.id;
    } else {
      const user = directMessages.find(u => (u._id || u.id) === activeChat);
      if (user && currentUserId) {
        return [currentUserId, user._id || user.id].sort().join('-');
      }
    }
    return '';
  };

  // When a user opens a chat, reset their unread count
  const handleSetActiveChat = (id: string) => {
    setActiveChat(id);
    setUnreadCounts(prev => {
      return { ...prev, [id]: 0 };
    });
    // Clear typing indicator when switching chats
    setTypingUser(null);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  function getUserId(user) {
    return user._id || user.id;
  }

  const handleMessageEdit = (messageId: string, newContent: string) => {
    setMessages(prev => prev.map(msg => 
      (msg._id || msg.id) === messageId 
        ? { ...msg, content: newContent, isEdited: true, editedAt: new Date().toISOString() }
        : msg
    ));
  };

  const handleMessageDelete = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      (msg._id || msg.id) === messageId 
        ? { ...msg, isDeleted: true }
        : msg
    ));
  };

  React.useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  React.useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);
  React.useEffect(() => {
    directMessagesRef.current = directMessages;
  }, [directMessages]);

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">ChatApp</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              className="pl-10 h-10"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Channels
              </h3>
              {/* Channel creation dialog trigger */}
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="ml-2">
                    +
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a new channel</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateChannel} className="space-y-4">
                    <Input
                      value={newChannelName}
                      onChange={e => setNewChannelName(e.target.value)}
                      placeholder="Channel name"
                      autoFocus
                      disabled={creatingChannel}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={creatingChannel || !newChannelName.trim()}>
                        {creatingChannel ? 'Creating...' : 'Create'}
                      </Button>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-1">
              {loading ? (
                <div>Loading channels...</div>
              ) : (
                <>
                  {channels
                    .filter(channel => channel.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((channel) => (
                      <div key={channel._id || channel.id} className="flex items-center group">
                        <button
                          onClick={() => setActiveChat(channel._id || channel.id)}
                          className={`flex-1 flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                            activeChat === (channel._id || channel.id)
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {channel.name}
                        </button>
                        {/* Show delete icon only if current user is creator, on hover, with confirmation dialog */}
                        {currentUserId && channel.creator === currentUserId && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="ml-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={e => {
                                  e.stopPropagation();
                                  setPendingDeleteId(channel._id || channel.id);
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Channel</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the channel "{channel.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel asChild>
                                  <Button variant="outline">Cancel</Button>
                                </AlertDialogCancel>
                                <AlertDialogAction asChild>
                                  <Button
                                    variant="destructive"
                                    onClick={async () => {
                                      await handleDeleteChannel(channel._id || channel.id);
                                      setPendingDeleteId(null);
                                    }}
                                    disabled={deletingChannelId === (channel._id || channel.id)}
                                  >
                                    {deletingChannelId === (channel._id || channel.id) ? 'Deleting...' : 'Delete'}
                                  </Button>
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    ))}
                </>
              )}
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Direct Messages
              </h3>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {loading ? (
                <div>Loading users...</div>
              ) : (
                <>
                  {directMessages
                    .filter(user => (user.username || user.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((user) => {
                      const userId = getUserId(user);
                      return (
                        <button
                          key={userId}
                          onClick={() => handleSetActiveChat(userId)}
                          className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                            activeChat === userId
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="relative mr-3 flex items-center">
                            <Avatar className="h-6 w-6">
                              <AvatarImage 
                                src={user.profilePicture} 
                                alt={user.displayName || user.username} 
                              />
                              <AvatarFallback className="text-xs">
                                {(user.displayName || user.username || '').split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white ${userStatus[userId] === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          </div>
                          <span className="flex-1 truncate">{user.displayName || user.username || user.name}</span>
                          {unreadCounts[userId] > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white min-w-[20px]">
                              {unreadCounts[userId]}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-gray-100 flex items-center gap-3 bg-white sticky bottom-0">
          <Avatar className="h-9 w-9 bg-blue-100 text-blue-700">
            <AvatarImage 
              src={currentUserProfile?.profilePicture} 
              alt={currentUserProfile?.displayName || currentUserProfile?.username} 
            />
            <AvatarFallback className="font-bold">
              {(currentUserProfile?.displayName || currentUserProfile?.username || currentUser?.username || 'U')
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-800 truncate">
              {currentUserProfile?.displayName || currentUserProfile?.username || currentUser?.username || 'User'}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {currentUserProfile?.status || 'Hey there! I am using ChatSpark.'}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleProfileSettingsOpen}
            className="h-8 w-8 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-white border-b border-gray-200 flex flex-col justify-center px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {(() => {
                    const channel = channels.find(c => (c._id || c.id) === activeChat);
                    if (channel) {
                      return (
                        <h2 className="text-lg font-semibold text-gray-900">
                          {channel.name}
                        </h2>
                      );
                    }
                    const user = directMessages.find(u => (u._id || u.id) === activeChat);
                    if (user) {
                      return (
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-3">
                            <AvatarImage 
                              src={user.profilePicture} 
                              alt={user.displayName || user.username} 
                            />
                            <AvatarFallback>
                              {(user.displayName || user.username || '').split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                              {user.displayName || user.username || user.name}
                            </h2>
                            {typingUser && typingUser !== currentUserId ? (
                              <p className="text-sm text-blue-500 animate-pulse">
                                {(() => {
                                  const typingUserData = directMessages.find(u => (u._id || u.id) === typingUser);
                                  const username = typingUserData ? (typingUserData.displayName || typingUserData.username || typingUserData.name) : typingUser;
                                  return `${username} is typing...`;
                                })()}
                              </p>
                            ) : user.status ? (
                              <p className="text-sm text-gray-500">{user.status}</p>
                            ) : null}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {messagesLoading ? (
                  <div className="flex justify-center items-center h-24">
                    <Loader2 className="animate-spin h-6 w-6 text-gray-400" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-gray-400 text-center">No messages yet.</div>
                ) : (
                  messages.map((msg) => {
                    const isCurrentUser = msg.sender?._id === currentUserId;
                    const channel = channels.find(c => (c._id || c.id) === activeChat);
                    const roomId = channel 
                      ? channel._id || channel.id 
                      : activeChat && currentUserId 
                        ? [currentUserId, activeChat].sort().join('-')
                        : '';
                    
                    return (
                      <MessageItem
                        key={msg._id || msg.id}
                        message={msg}
                        isCurrentUser={isCurrentUser}
                        onMessageEdit={handleMessageEdit}
                        onMessageDelete={handleMessageDelete}
                        roomId={roomId}
                        socket={socketRef.current}
                      />
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <Input
                    value={message}
                    onChange={handleInputChange}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage(e)}
                    onBlur={() => {
                      // Stop typing when input loses focus
                      if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                      }
                      const roomId = getCurrentRoomId();
                      if (roomId && currentUserId) {
                        socketRef.current?.emit('stopTyping', { roomId, sender: currentUserId });
                      }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 h-12"
                  />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={handleImageButtonClick}
                      disabled={uploadingImage}
                      variant="outline"
                      className="h-12 w-12 p-0"
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upload image (max 10MB)</p>
                  </TooltipContent>
                </Tooltip>
                <Button
                  type="submit"
                  disabled={!message.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              {/* Hidden file input for image upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center">
              <svg width="64" height="64" fill="none" viewBox="0 0 64 64" className="mb-4">
                <rect width="64" height="64" rx="16" fill="#e0e7ff"/>
                <path d="M20 44h24M24 28h16M28 36h8" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="32" cy="24" r="4" fill="#6366f1"/>
              </svg>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to ChatSpark!</h2>
              <p className="text-gray-500 mb-4 text-center max-w-md">
                Select a channel or a user from the sidebar to start chatting.<br/>
                You can create new channels, send direct messages, and chat in real time.<br/>
                <span className="text-indigo-500 font-medium">Enjoy your conversations!</span>
              </p>
            </div>
          </div>
        )}
      </div>
      <audio ref={audioRef} src="/sent-sound.mp3" preload="auto" style={{ display: 'none' }} />
      
      {/* Upload Progress Indicator */}
      {uploadingImage && (
        <UploadProgress
          progress={uploadProgress}
          status={uploadStatus}
          fileName={uploadFileName}
          errorMessage={uploadError}
        />
      )}

      {/* Image Preview Modal */}
      {showImagePreview && selectedFile && (
        <ImagePreview
          file={selectedFile}
          compressedFile={compressedFile}
          onConfirm={handleImagePreviewConfirm}
          onCancel={handleImagePreviewCancel}
          isCompressing={isCompressing}
        />
      )}

      {/* Profile Settings Modal */}
      <ProfileSettings
        isOpen={showProfileSettings}
        onClose={handleProfileSettingsClose}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
};

export default ChatDashboard;
