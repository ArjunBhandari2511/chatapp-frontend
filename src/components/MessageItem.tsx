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
  AlertTriangle
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
import { editMessage, deleteMessage } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface MessageItemProps {
  message: {
    _id?: string;
    id?: string;
    content: string;
    messageType?: 'text' | 'image';
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
  };
  isCurrentUser: boolean;
  onMessageEdit?: (messageId: string, newContent: string) => void;
  onMessageDelete?: (messageId: string) => void;
  roomId?: string;
  socket?: any;
}

const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  isCurrentUser, 
  onMessageEdit, 
  onMessageDelete,
  roomId,
  socket
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { toast } = useToast();

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
              ? 'bg-blue-600 text-white rounded-br-md ml-8 hover:bg-blue-700 transition-colors duration-200'
              : 'bg-gray-200 text-gray-900 rounded-bl-md mr-8 hover:bg-gray-300 transition-colors duration-200'}
          `}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-xs">
              {isCurrentUser ? 'You' : message.sender?.displayName || message.sender?.username || 'Unknown'}
            </span>
            <span className="text-[10px] opacity-70">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {message.isEdited && (
              <span className="text-[10px] opacity-70 bg-black/10 px-1.5 py-0.5 rounded-full">edited</span>
            )}
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

          {/* Three-dot menu for current user's messages */}
          {isCurrentUser && !isEditing && (
            <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-1/2 right-[-18px] -translate-y-1/2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/10 rounded-full shadow"
                  tabIndex={0}
                  aria-label="More options"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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