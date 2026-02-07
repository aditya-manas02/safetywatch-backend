import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './.env' });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadApk = async () => {
  const apkPath = '../android/app/build/outputs/apk/debug/SafetyWatch-v1.4.0-debug.apk';
  console.log(`Uploading ${apkPath} to Cloudinary...`);
  
  try {
    const result = await cloudinary.uploader.upload(apkPath, {
      resource_type: 'raw',
      public_id: 'SafetyWatch',
      use_filename: true,
      unique_filename: false,
      overwrite: true
    });
    
    console.log('Upload successful!');
    console.log('File URL:', result.secure_url);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};

uploadApk();
