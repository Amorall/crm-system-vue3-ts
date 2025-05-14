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