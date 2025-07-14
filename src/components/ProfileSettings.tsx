import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Camera, 
  Save, 
  X, 
  User, 
  MessageSquare, 
  Info,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  uploadProfilePicture, 
  updateProfile, 
  fetchCurrentUserProfile,
  getCurrentUserId 
} from '@/services/api';
import { compressImage, validateImageFile } from '@/utils/imageCompression';

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate?: (user: any) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ 
  isOpen, 
  onClose, 
  onProfileUpdate 
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [about, setAbout] = useState('');
  const [status, setStatus] = useState('');
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const currentUserId = getCurrentUserId();

  // Fetch current user profile on mount
  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchProfile();
    }
  }, [isOpen, currentUserId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const userProfile = await fetchCurrentUserProfile();
      setProfile(userProfile);
      setDisplayName(userProfile.displayName || userProfile.username || '');
      setAbout(userProfile.about || '');
      setStatus(userProfile.status || 'Hey there! I am using Whispr.');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    setUploadingPicture(true);
    setUploadProgress(0);

    try {
      // Compress image
      const compressedFile = await compressImage(file, {
        maxSizeMB: 0.5, // Smaller for profile pictures
        maxWidthOrHeight: 400,
        quality: 0.8,
      });

      // Upload with progress tracking
      const { profilePictureUrl } = await uploadProfilePicture(compressedFile, (progress) => {
        setUploadProgress(progress);
      });

      // Update local state
      setProfile(prev => ({ ...prev, profilePicture: profilePictureUrl }));
      
      toast({
        title: 'Success',
        description: 'Profile picture updated successfully',
      });

      // Notify parent component
      if (onProfileUpdate) {
        onProfileUpdate({ ...profile, profilePicture: profilePictureUrl });
      }

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload profile picture',
        variant: 'destructive',
      });
    } finally {
      setUploadingPicture(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUserId) return;

    setSaving(true);
    try {
      const updatedUser = await updateProfile(currentUserId, {
        displayName: displayName.trim(),
        about: about.trim(),
        status: status.trim(),
      });

      setProfile(updatedUser);
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });

      // Notify parent component
      if (onProfileUpdate) {
        onProfileUpdate(updatedUser);
      }

      // Close the modal after successful save
      onClose();

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePictureButtonClick = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Profile Settings</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Profile Picture Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Profile Picture
                </CardTitle>
                <CardDescription>
                  Upload a profile picture to personalize your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage 
                        src={profile?.profilePicture} 
                        alt={profile?.displayName || profile?.username} 
                      />
                      <AvatarFallback className="text-lg">
                        {(profile?.displayName || profile?.username || 'U')
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {uploadingPicture && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-1"></div>
                          <p className="text-xs">{Math.round(uploadProgress)}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Button
                      onClick={handlePictureButtonClick}
                      disabled={uploadingPicture}
                      variant="outline"
                      className="w-full"
                    >
                      {uploadingPicture ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="h-4 w-4 mr-2" />
                          Change Picture
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Recommended: Square image, max 5MB
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  style={{ display: 'none' }}
                />
              </CardContent>
            </Card>

            <Separator />

            {/* Profile Information Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Display Name
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500">
                    {displayName.length}/50 characters
                  </p>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Status
                  </Label>
                  <Input
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    placeholder="What's on your mind?"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500">
                    {status.length}/100 characters
                  </p>
                </div>

                {/* About */}
                <div className="space-y-2">
                  <Label htmlFor="about" className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    About
                  </Label>
                  <Textarea
                    id="about"
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-500">
                    {about.length}/200 characters
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveProfile}
                disabled={saving}
                className="min-w-[100px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSettings; 