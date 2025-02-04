from cryptography.fernet import Fernet
from django.conf import settings
from django.core.mail import send_mail
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from django.contrib.auth.hashers import make_password


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
