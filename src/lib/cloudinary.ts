import { v2 as cloudinary } from 'cloudinary';

// Verify environment variables are loaded
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary credentials missing! Check your .env file');
  console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✓' : '✗');
  console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✓' : '✗');
  console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✓' : '✗');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (file: File, folder: string = 'quiz-media') => {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    return new Promise((resolve, reject) => {
      // Don't pass api_key in options - it's already in config
      // This prevents signature issues
      const uploadOptions: any = {
        resource_type: 'auto',
        folder: folder,
        // Use timestamp to ensure unique signature
        use_filename: false,
        unique_filename: true,
      };

      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(buffer);
    });
  } catch (error) {
    console.error('Upload to Cloudinary failed:', error);
    throw new Error('Failed to upload file to Cloudinary');
  }
};

export const deleteFromCloudinary = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new Error('Failed to delete file from Cloudinary');
  }
};

// Extract public ID from Cloudinary URL
export const extractPublicId = (url: string): string | null => {
  try {
    if (!url) return null;
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{folder}/{public_id}.{extension}
    // or: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{folder}/{public_id}.{extension}
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    
    const pathAfterUpload = parts[1];
    // Remove version if present (starts with v followed by numbers)
    const withoutVersion = pathAfterUpload.replace(/^v\d+\//, '');
    
    // Remove file extension
    const lastDotIndex = withoutVersion.lastIndexOf('.');
    const withoutExtension = lastDotIndex > 0 ? withoutVersion.substring(0, lastDotIndex) : withoutVersion;
    
    return withoutExtension;
  } catch (error) {
    console.error('Error extracting public ID from URL:', url, error);
    return null;
  }
};

export default cloudinary;
