export function extractPublicId(url: string): string {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) throw new Error('Invalid Cloudinary URL');
    let publicIdWithExt = parts.slice(uploadIndex + 1).join('/');

    if (/^v\d+\//.test(publicIdWithExt)) {
      publicIdWithExt = publicIdWithExt.replace(/^v\d+\//, '');
    }
    return publicIdWithExt.replace(/\.[^/.]+$/, '');
  } catch {
    throw new Error('Failed to extract public_id from URL');
  }
}

export const uploadToCloudinaryClient = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'my_preset');
  
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/dzebbxo0l/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    return data.secure_url; 
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    throw error;
  }
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    const response = await fetch(`http://localhost:3001/api/delete-image?public_id=${publicId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete image: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.message !== 'Image deleted successfully') {
      throw new Error('Cloudinary deletion failed');
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};