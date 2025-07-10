import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Check, 
  X,
  Loader2,
  AlertTriangle,
  FileText,
  FileArchive,
  FileSpreadsheet,
  File,
  Smile
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ImageLightbox from './ImageLightbox';
import { editMessage, deleteMessage, reactToMessage } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface MessageItemProps {
  message: {
    _id?: string;
    id?: string;
    content: string;
    messageType?: 'text' | 'image' | 'file';
    imageUrl?: string;
    isDeleted?: boolean;
    isEdited?: boolean;
    editedAt?: string;
    sender?: {
      _id?: string;
      id?: string;
      username?: string;
      displayName?: string;
      profilePicture?: string;
    };
    createdAt: string;
    fileUrl?: string;
    fileType?: string;
    fileName?: string;
    fileSize?: number;
    deliveredTo?: string[];
    readBy?: string[];
    type?: 'direct' | 'group';
    recipient?: string;
    reactions?: Array<{ emoji: string; user: { _id: string; username?: string; displayName?: string; profilePicture?: string } }>;
  };
  isCurrentUser: boolean;
  onMessageEdit?: (messageId: string, newContent: string) => void;
  onMessageDelete?: (messageId: string) => void;
  roomId?: string;
  socket?: any;
  currentUserId: string;
}

const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  isCurrentUser, 
  onMessageEdit, 
  onMessageDelete,
  roomId,
  socket,
  currentUserId
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [reactionPopover, setReactionPopover] = useState<string | null>(null);
  const { toast } = useToast();

  // Group reactions by emoji
  const groupedReactions = React.useMemo(() => {
    const map: Record<string, { emoji: string; users: any[] }> = {};
    (message.reactions || []).forEach(r => {
      if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, users: [] };
      map[r.emoji].users.push(r.user);
    });
    return Object.values(map);
  }, [message.reactions]);

  // Handle reaction click (socket preferred, fallback to REST)
  const handleReaction = async (messageId: string, emoji: string) => {
    setShowEmojiBar(false);
    // Optimistic update: handled by parent via socket event, but fallback for REST
    if (socket && roomId) {
      socket.emit('reactToMessage', { messageId, emoji, roomId });
    } else {
      try {
        await reactToMessage(messageId, emoji);
        // No local update here; parent should update message list
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    }
  };

  // List of emojis for reactions
  const emojiList = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const handleImageClick = () => {
    if (message.messageType === 'image' && message.imageUrl) {
      setIsLightboxOpen(true);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditContent(message.content);
    setShowMenu(false);
  };

  const handleEditSave = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      // Call the API
      const updatedMessage = await editMessage(message._id || message.id || '', editContent);
      
      // Emit WebSocket event
      if (socket && roomId) {
        socket.emit('editMessage', {
          messageId: message._id || message.id,
          content: editContent,
          roomId
        });
      }

      // Update local state
      if (onMessageEdit) {
        onMessageEdit(message._id || message.id || '', editContent);
      }

      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Message edited successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to edit message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
    setShowMenu(false);
  };

  const handleDeleteConfirm = async () => {
    setIsLoading(true);
    try {
      // Call the API
      await deleteMessage(message._id || message.id || '');
      
      // Emit WebSocket event
      if (socket && roomId) {
        socket.emit('deleteMessage', {
          messageId: message._id || message.id,
          roomId
        });
      }

      // Update local state
      if (onMessageDelete) {
        onMessageDelete(message._id || message.id || '');
      }

      setShowDeleteDialog(false);
      toast({
        title: 'Success',
        description: 'Message deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If message is deleted, show deletion message
  if (message.isDeleted) {
    return (
      <div className={`flex items-end ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
        {!isCurrentUser && (
          <Avatar className="h-8 w-8 mr-2">
            <AvatarImage 
              src={message.sender?.profilePicture} 
              alt={message.sender?.displayName || message.sender?.username} 
            />
            <AvatarFallback>
              {(message.sender?.displayName || message.sender?.username || '?')
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
        )}
        <div
          className={`max-w-xs sm:max-w-md md:max-w-lg px-4 py-2 rounded-2xl shadow-sm text-sm break-words
            ${isCurrentUser
              ? 'bg-gray-100 text-gray-500 rounded-br-md ml-8 border border-gray-200'
              : 'bg-gray-50 text-gray-400 rounded-bl-md mr-8 border border-gray-100'}
          `}
        >
          <div className="flex items-center gap-2">
            <Trash2 className="h-3 w-3 text-gray-400" />
            <span className="italic text-xs">This message was deleted</span>
          </div>
        </div>
        {isCurrentUser && (
          <Avatar className="h-8 w-8 ml-2">
            <AvatarImage 
              src={message.sender?.profilePicture} 
              alt={message.sender?.displayName || message.sender?.username} 
            />
            <AvatarFallback>
              {(message.sender?.displayName || message.sender?.username || '?')
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={`flex items-end ${isCurrentUser ? 'justify-end' : 'justify-start'} group`}
      >
        {!isCurrentUser && (
          <Avatar className="h-8 w-8 mr-2">
            <AvatarImage 
              src={message.sender?.profilePicture} 
              alt={message.sender?.displayName || message.sender?.username} 
            />
            <AvatarFallback>
              {(message.sender?.displayName || message.sender?.username || '?')
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
        )}
        <div
          className={`max-w-xs sm:max-w-md md:max-w-lg px-4 py-2 rounded-2xl shadow-sm text-sm break-words relative
            ${isCurrentUser
              ? 'bg-[#c4ffc5] text-gray-900 rounded-br-md ml-8 hover:bg-[#b0eeb1] transition-colors duration-200'
              : 'bg-gray-200 text-gray-900 rounded-bl-md mr-8 hover:bg-gray-300 transition-colors duration-200'}
          `}
        >
          {/* Emoji Bar (floating, only if showEmojiBar) */}
          {showEmojiBar && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white border border-gray-200 rounded-full shadow-lg px-3 py-1 animate-fade-in">
              {emojiList.map((emoji) => (
                <button
                  key={emoji}
                  className="text-xl hover:scale-125 transition-transform duration-100 focus:outline-none"
                  onClick={() => handleReaction(message._id || message.id || '', emoji)}
                  tabIndex={0}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          {/* Reactions display */}
          {groupedReactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {groupedReactions.map(gr => (
                <div
                  key={gr.emoji}
                  className={`relative flex items-center px-2 py-0.5 rounded-full text-xs font-medium border cursor-pointer select-none transition-all
                    ${gr.users.some(u => u?._id === currentUserId) ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'bg-gray-100 border-gray-300 text-gray-700'}`}
                  onClick={() => handleReaction(message._id || message.id || '', gr.emoji)}
                  onMouseEnter={() => setReactionPopover(gr.emoji)}
                  onMouseLeave={() => setReactionPopover(null)}
                >
                  <span className="mr-1">{gr.emoji}</span>
                  <span>{gr.users.length}</span>
                  {/* Popover for user list */}
                  {reactionPopover === gr.emoji && gr.users.length > 0 && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-30 bg-white border border-gray-300 rounded shadow-lg px-3 py-2 text-xs whitespace-nowrap min-w-[100px]">
                      <div className="font-semibold mb-1 text-gray-700">Reacted by:</div>
                      {gr.users.map((u, idx) => (
                        <div key={u?._id || idx} className="flex items-center gap-2 py-0.5">
                          {u?.profilePicture && (
                            <img src={u.profilePicture} alt={u.displayName || u.username || 'User'} className="w-4 h-4 rounded-full" />
                          )}
                          <span>{u?.displayName || u?.username || 'User'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mb-1 relative">
            <span className="font-semibold text-xs">
              {isCurrentUser ? 'You' : message.sender?.displayName || message.sender?.username || 'Unknown'}
            </span>
            <span className="text-[10px] opacity-70">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {/* Blue tick logic for direct messages sent by current user */}
            {isCurrentUser && message.type === 'direct' && message.recipient && (
              <span className="ml-1 flex items-center">
                {/* Single tick: not delivered */}
                {!(message.deliveredTo && message.deliveredTo.includes(message.recipient)) ? (
                  <Check className="h-3 w-3 text-white/70" />
                ) :
                /* Double tick: delivered but not read */
                !(message.readBy && message.readBy.includes(message.recipient)) ? (
                  <>
                    <Check className="h-3 w-3 text-white/70 -mr-1" />
                    <Check className="h-3 w-3 text-white/70" />
                  </>
                ) :
                /* Double tick, dark blue: read */
                (
                  <>
                    <Check className="h-3 w-3 text-[#1e3a8a] -mr-1" />
                    <Check className="h-3 w-3 text-[#1e3a8a]" />
                  </>
                )}
              </span>
            )}
            {message.isEdited && (
              <span className="text-[10px] opacity-70 bg-black/10 px-1.5 py-0.5 rounded-full">edited</span>
            )}
            {/* Three-dot menu for current user's messages - always visible, right of time, smaller */}
            {isCurrentUser && !isEditing && (
              <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-1 p-0 h-5 w-5 min-w-0 min-h-0 flex items-center justify-center rounded-full shadow-none bg-transparent hover:bg-black/10 focus:bg-black/10"
                    tabIndex={0}
                    aria-label="More options"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem 
                    onClick={handleEditClick} 
                    disabled={isLoading}
                    className="cursor-pointer hover:bg-blue-50"
                  >
                    <Edit className="h-4 w-4 mr-2 text-blue-600" />
                    <span>Edit Message</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleDeleteClick} 
                    disabled={isLoading}
                    className="cursor-pointer hover:bg-red-50 text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    <span>Delete Message</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {/* React Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-1 p-0 h-5 w-5 min-w-0 min-h-0 flex items-center justify-center rounded-full shadow-none bg-transparent hover:bg-yellow-100 focus:bg-yellow-100"
              tabIndex={0}
              aria-label="React to message"
              onClick={() => setShowEmojiBar((prev) => !prev)}
            >
              <Smile className="h-4 w-4 text-yellow-500" />
            </Button>
          </div>
          
          {/* Message Content */}
          {message.messageType === 'image' && message.imageUrl ? (
            <div className="mt-2">
              <img
                src={message.imageUrl}
                alt="Shared image"
                className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handleImageClick}
                style={{ maxHeight: '300px' }}
              />
              {message.content && (
                <div className="mt-2 text-sm">
                  {isEditing ? (
                    <div className="space-y-3">
                      <Input
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className={`${isCurrentUser ? 'text-gray-900 bg-white' : 'text-gray-900 bg-white'} border-2 focus:border-blue-500`}
                        disabled={isLoading}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleEditSave}
                          disabled={isLoading || !editContent.trim()}
                          className="h-7 px-3 bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          <span className="ml-1 text-xs">Save</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleEditCancel}
                          disabled={isLoading}
                          className="h-7 px-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          <X className="h-3 w-3" />
                          <span className="ml-1 text-xs">Cancel</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>{message.content}</div>
                  )}
                </div>
              )}
            </div>
          ) : message.messageType === 'file' && message.fileUrl ? (
            <div className="mt-2 flex items-center gap-3">
              {/* File icon based on type */}
              {(() => {
                if (message.fileType?.includes('pdf')) return <FileText className="h-7 w-7 text-red-500" />;
                if (message.fileType?.includes('word')) return <FileText className="h-7 w-7 text-blue-600" />;
                if (message.fileType?.includes('spreadsheet') || message.fileType?.includes('excel') || message.fileType?.includes('sheet')) return <FileSpreadsheet className="h-7 w-7 text-green-600" />;
                if (message.fileType?.includes('zip')) return <FileArchive className="h-7 w-7 text-yellow-600" />;
                if (message.fileType?.includes('text')) return <FileText className="h-7 w-7 text-gray-600" />;
                return <File className="h-7 w-7 text-gray-400" />;
              })()}
              <div className="flex flex-col">
                <a
                  href={message.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={message.fileName}
                  className="font-medium text-blue-700 hover:underline break-all"
                >
                  {message.fileName || 'Download file'}
                </a>
                <span className="text-xs text-gray-500">{message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : ''}</span>
              </div>
            </div>
          ) : (
            <div>
              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className={`${isCurrentUser ? 'text-gray-900 bg-white' : 'text-gray-900 bg-white'} border-2 focus:border-blue-500`}
                    disabled={isLoading}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleEditSave}
                      disabled={isLoading || !editContent.trim()}
                      className="h-7 px-3 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      <span className="ml-1 text-xs">Save</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEditCancel}
                      disabled={isLoading}
                      className="h-7 px-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <X className="h-3 w-3" />
                      <span className="ml-1 text-xs">Cancel</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div>{message.content}</div>
              )}
            </div>
          )}

        </div>
        {isCurrentUser && (
          <Avatar className="h-8 w-8 ml-2">
            <AvatarImage 
              src={message.sender?.profilePicture} 
              alt={message.sender?.displayName || message.sender?.username} 
            />
            <AvatarFallback>
              {(message.sender?.displayName || message.sender?.username || '?')
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Message
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete this message? This action cannot be undone and the message will be removed for everyone in this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isLoading}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lightbox for image preview */}
      {message.messageType === 'image' && message.imageUrl && (
        <ImageLightbox
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          imageUrl={message.imageUrl}
          alt="Shared image"
        />
      )}
    </>
  );
};

export default MessageItem; 