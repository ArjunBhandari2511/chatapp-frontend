const API_BASE_URL = 'https://chatapp-backend-tp00.onrender.com/api';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

export const loginUser = async (data: LoginData): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Login failed');
  }
  return {
    success: true,
    message: resData.message || 'Login successful',
    data: resData,
  };
};

export const registerUser = async (data: RegisterData): Promise<ApiResponse> => {
  const payload = { ...data, username: data.name };
  delete payload.name;
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Registration failed');
  }
  return {
    success: true,
    message: resData.message || 'Registration successful',
    data: resData,
  };
};

export const getAuthToken = () => localStorage.getItem('token');

export const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const fetchChannels = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/channels`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
  });
  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to fetch channels');
  }
  return resData.channels;
};

export const fetchUsers = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
  });
  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to fetch users');
  }
  return resData.users;
};

export const createChannel = async (name: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/channels`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to create channel');
  }
  return resData.channel;
};

export const deleteChannel = async (id: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/channels/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
  });
  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to delete channel');
  }
  return resData;
};

export const getCurrentUserId = (): string | null => {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || null;
  } catch {
    return null;
  }
};

export const fetchChannelMessages = async (channelId: string): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/messages/channel/${channelId}`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
  });
  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to fetch channel messages');
  }
  return resData.messages;
};

export const sendChannelMessage = async (channelId: string, content: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/messages/channel/${channelId}`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to send channel message');
  }
  return resData.message;
};

export const fetchDirectMessages = async (userId: string): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/messages/direct/${userId}`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
  });
  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to fetch direct messages');
  }
  return resData.messages;
};

export const sendDirectMessage = async (userId: string, content: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/messages/direct/${userId}`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to send direct message');
  }
  return resData.message;
};

export const editMessage = async (messageId: string, content: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to edit message');
  }
  return resData.message;
};

export const deleteMessage = async (messageId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
  });
  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to delete message');
  }
  return resData.message;
};

export const uploadImage = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ imageUrl: string; publicId: string }> => {
  const formData = new FormData();
  formData.append('image', file);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resData = JSON.parse(xhr.responseText);
          resolve({
            imageUrl: resData.imageUrl,
            publicId: resData.publicId,
          });
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        try {
          const resData = JSON.parse(xhr.responseText);
          reject(new Error(resData.message || 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('POST', `${API_BASE_URL}/upload/image`);
    
    // Add auth headers
    const token = getAuthToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.send(formData);
  });
};

// Profile API functions
export const uploadProfilePicture = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ profilePictureUrl: string; publicId: string }> => {
  const formData = new FormData();
  formData.append('profilePicture', file);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resData = JSON.parse(xhr.responseText);
          resolve({
            profilePictureUrl: resData.profilePictureUrl,
            publicId: resData.publicId,
          });
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        try {
          const resData = JSON.parse(xhr.responseText);
          reject(new Error(resData.message || 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('POST', `${API_BASE_URL}/profile/upload`);
    
    // Add auth headers
    const token = getAuthToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.send(formData);
  });
};

export const updateProfile = async (userId: string, profileData: {
  displayName?: string;
  about?: string;
  status?: string;
}): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/profile/${userId}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to update profile');
  }
  return resData.user;
};

export const fetchUserProfile = async (userId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/profile/${userId}`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to fetch profile');
  }
  return resData.user;
};

export const fetchCurrentUserProfile = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/profile/me/profile`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to fetch profile');
  }
  return resData.user;
};

export const uploadFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ fileUrl: string; fileName: string; fileSize: number; fileType: string; publicId: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resData = JSON.parse(xhr.responseText);
          resolve({
            fileUrl: resData.fileUrl,
            fileName: resData.fileName,
            fileSize: resData.fileSize,
            fileType: resData.fileType,
            publicId: resData.publicId,
          });
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        try {
          const resData = JSON.parse(xhr.responseText);
          reject(new Error(resData.message || 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('POST', `${API_BASE_URL}/upload/files/upload`);
    // Add auth headers
    const token = getAuthToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  });
};
