import os
import base64
import hashlib
import hmac
from app.config import settings

# Master key derived from JWT_SECRET
master_secret = getattr(settings, "JWT_SECRET", "aihos_super_secret_jwt_key_2026_luxury_palace")
MASTER_KEY = hashlib.sha256(master_secret.encode('utf-8')).digest()

def encrypt_credential(plain_text: str) -> str:
    """
    Encrypts sensitive OTA credentials (API keys, secrets) using AES-style HMAC-SHA256 authenticated cipher.
    Returns base64 encoded string: salt + iv + ciphertext + tag.
    """
    if not plain_text:
        return ""
    
    salt = os.urandom(16)
    iv = os.urandom(16)
    
    # Derive encryption key and HMAC key
    key = hashlib.pbkdf2_hmac('sha256', MASTER_KEY, salt, 10000, 32)
    hmac_key = hashlib.pbkdf2_hmac('sha256', MASTER_KEY, salt + b'mac', 10000, 32)
    
    # Keystream generation using CTR-mode SHA256 blocks
    plain_bytes = plain_text.encode('utf-8')
    keystream = bytearray()
    counter = 0
    while len(keystream) < len(plain_bytes):
        counter_bytes = counter.to_bytes(4, 'big')
        block = hashlib.sha256(key + iv + counter_bytes).digest()
        keystream.extend(block)
        counter += 1
        
    cipher_bytes = bytes(p ^ k for p, k in zip(plain_bytes, keystream[:len(plain_bytes)]))
    
    # Authenticate ciphertext
    tag = hmac.new(hmac_key, iv + cipher_bytes, hashlib.sha256).digest()[:16]
    
    # Payload = salt (16) + iv (16) + tag (16) + cipher_bytes
    payload = salt + iv + tag + cipher_bytes
    return base64.urlsafe_b64encode(payload).decode('utf-8')


def decrypt_credential(cipher_text: str) -> str:
    """
    Decrypts base64 encoded encrypted OTA credentials.
    Returns plain_text string or empty string on tampering.
    """
    if not cipher_text:
        return ""
    try:
        raw_payload = base64.urlsafe_b64decode(cipher_text.encode('utf-8'))
        if len(raw_payload) < 48:
            return ""
        
        salt = raw_payload[:16]
        iv = raw_payload[16:32]
        tag = raw_payload[32:48]
        cipher_bytes = raw_payload[48:]
        
        key = hashlib.pbkdf2_hmac('sha256', MASTER_KEY, salt, 10000, 32)
        hmac_key = hashlib.pbkdf2_hmac('sha256', MASTER_KEY, salt + b'mac', 10000, 32)
        
        # Verify MAC tag
        expected_tag = hmac.new(hmac_key, iv + cipher_bytes, hashlib.sha256).digest()[:16]
        if not hmac.compare_digest(tag, expected_tag):
            return "[DECRYPTION_ERROR_TAMPERED]"
            
        keystream = bytearray()
        counter = 0
        while len(keystream) < len(cipher_bytes):
            counter_bytes = counter.to_bytes(4, 'big')
            block = hashlib.sha256(key + iv + counter_bytes).digest()
            keystream.extend(block)
            counter += 1
            
        plain_bytes = bytes(c ^ k for c, k in zip(cipher_bytes, keystream[:len(cipher_bytes)]))
        return plain_bytes.decode('utf-8')
    except Exception:
        return "[DECRYPTION_ERROR]"
