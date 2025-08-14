from cryptography.fernet import Fernet
from django.conf import settings
from django.core.mail import send_mail
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from django.contrib.auth.hashers import make_password
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import traceback


class PasswordManager:
    def __init__(self):
        # Generate a key from settings.ENCRYPTION_KEY
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'static_salt',  # In production, use a secure random salt
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(settings.ENCRYPTION_KEY.encode()))
        self.cipher_suite = Fernet(key)

    def encrypt_password(self, password: str) -> tuple[str, str]:
        """
        Encrypts password and returns both encrypted and hashed versions
        """
        # Encrypt for storage (can be decrypted for email)
        encrypted = self.cipher_suite.encrypt(password.encode())
        encrypted_str = base64.urlsafe_b64encode(encrypted).decode()

        # Hash for authentication (cannot be decrypted)
        hashed = make_password(password)

        return encrypted_str, hashed

    def decrypt_password(self, encrypted_password: str) -> str:
        """
        Decrypts the encrypted password
        """
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_password.encode())
            decrypted = self.cipher_suite.decrypt(encrypted_bytes)
            return decrypted.decode()
        except Exception as e:
            print(f"Decryption error: {e}")
            return None


def custom_exception_handler(exc, context):
    """
    Custom exception handler to catch parsing errors and other exceptions
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # If it's a parsing error or similar request data error
    if hasattr(exc, 'detail') and any(error_type in str(exc.detail).lower() for error_type in ['parse', 'json', 'request']):
        return Response({
            'status': 'error',
            'message': 'Request data stream error. Please ensure your form submission is valid.',
            'debug_info': {
                'error_type': type(exc).__name__,
                'error_message': str(exc.detail),
                'request_method': getattr(context.get('request'), 'method', 'unknown'),
                'content_type': getattr(context.get('request'), 'content_type', 'unknown')
            }
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # If it's a JSON parsing error
    if hasattr(exc, 'detail') and 'JSON parse error' in str(exc.detail):
        return Response({
            'status': 'error',
            'message': 'Invalid request format. Please ensure the request contains valid form data.',
            'debug_info': {
                'error_type': 'JSONParseError',
                'error_message': str(exc.detail)
            }
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # If it's a parsing error
    if hasattr(exc, 'detail') and 'parsing error' in str(exc.detail).lower():
        return Response({
            'status': 'error',
            'message': 'Request parsing error. Please check your form submission format.',
            'debug_info': {
                'error_type': 'ParsingError',
                'error_message': str(exc.detail)
            }
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Return the default response for other exceptions
    return response
