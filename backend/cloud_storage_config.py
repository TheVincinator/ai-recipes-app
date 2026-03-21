# cloud_storage_config.py
import os
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

class CloudStorage:
    def __init__(self):
        self.use_cloud = os.getenv('USE_CLOUD_STORAGE', 'false').lower() == 'true'

        if self.use_cloud:
            self.client = boto3.client(
                's3',
                aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
                region_name=os.getenv('R2_REGION', 'auto'),
                endpoint_url=os.getenv('R2_ENDPOINT_URL') or None
            )
            self.bucket_name = os.getenv('R2_BUCKET_NAME')
            self.cdn_url = os.getenv('CDN_URL', '')
        else:
            # Local storage fallback for development
            self.local_base_path = './ingredient_icon_generator/assets'
    
    def upload_image(self, file_obj, key, content_type='image/png'):
        """Upload image to cloud storage or save locally"""
        if self.use_cloud:
            try:
                self.client.upload_fileobj(
                    file_obj,
                    self.bucket_name,
                    key,
                    ExtraArgs={
                        'ContentType': content_type,
                        'CacheControl': 'max-age=31536000',  # 1 year cache
                    }
                )
                return True
            except ClientError:
                return False
        else:
            # Local storage
            local_path = os.path.join(self.local_base_path, key)
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            file_obj.seek(0)
            with open(local_path, 'wb') as f:
                f.write(file_obj.read())
            return True
    
    def exists(self, key):
        """Check if file exists in storage"""
        if self.use_cloud:
            try:
                self.client.head_object(Bucket=self.bucket_name, Key=key)
                return True
            except ClientError:
                return False
        else:
            return os.path.exists(os.path.join(self.local_base_path, key))
    
    def delete(self, key):
        """Delete file from storage"""
        if self.use_cloud:
            try:
                self.client.delete_object(Bucket=self.bucket_name, Key=key)
                return True
            except ClientError:
                return False
        else:
            local_path = os.path.join(self.local_base_path, key)
            if os.path.exists(local_path):
                os.remove(local_path)
                return True
            return False
    
    def get_url(self, key):
        """Get public URL for the file"""
        if self.use_cloud:
            if self.cdn_url:
                return f"{self.cdn_url}/{key}"
            else:
                raise ValueError("CDN_URL must be set when using Cloudflare R2")
        else:
            # Return local API endpoint
            return f"/api/assets/{key}"

# Initialize singleton
storage = CloudStorage()