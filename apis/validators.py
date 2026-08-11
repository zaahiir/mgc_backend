"""Upload validation for user-supplied files.

The FileField/ImageField columns accepted anything at any size, so a caller
could store .php/.svg/.html under MEDIA_ROOT — served back from the same
origin, that is stored XSS at best and code execution if the web server ever
hands the directory to an interpreter. Extension, sniffed content type and
size are all checked here.
"""

import os

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible

# Byte signatures, so a .php renamed to .jpg is rejected on content.
_MAGIC = {
    b'\xff\xd8\xff': 'jpg',
    b'\x89PNG\r\n\x1a\n': 'png',
    b'GIF87a': 'gif',
    b'GIF89a': 'gif',
    b'%PDF-': 'pdf',
}

_WEBP_PREFIX = b'RIFF'
_WEBP_TAG = b'WEBP'


def _sniff(header):
    for magic, kind in _MAGIC.items():
        if header.startswith(magic):
            return kind
    if header.startswith(_WEBP_PREFIX) and header[8:12] == _WEBP_TAG:
        return 'webp'
    return None


@deconstructible
class ValidatedUpload:
    """Reject uploads by extension, sniffed type, or size."""

    def __init__(self, allowed=None, max_bytes=None, kind='file'):
        self.allowed = [a.lower() for a in (allowed or [])]
        self.max_bytes = max_bytes
        self.kind = kind

    @property
    def _limit(self):
        return self.max_bytes or getattr(settings, 'MAX_UPLOAD_SIZE', 5 * 1024 * 1024)

    def __call__(self, value):
        name = getattr(value, 'name', '') or ''
        ext = os.path.splitext(name)[1].lower().lstrip('.')

        allowed = self.allowed or getattr(settings, 'ALLOWED_IMAGE_EXTENSIONS', [])
        if ext not in allowed:
            raise ValidationError(
                f'Unsupported {self.kind} type "{ext or "unknown"}". '
                f'Allowed: {", ".join(allowed)}.'
            )

        size = getattr(value, 'size', None)
        if size is not None and size > self._limit:
            raise ValidationError(
                f'File is too large ({size // 1024} KB). '
                f'Maximum is {self._limit // 1024} KB.'
            )

        # Read the header without disturbing the caller's stream position.
        try:
            pos = value.tell()
            value.seek(0)
            header = value.read(16)
            value.seek(pos)
        except Exception:
            return

        sniffed = _sniff(header)
        if sniffed is None:
            raise ValidationError('File content does not match a supported image or PDF format.')

        # jpg/jpeg are the same bytes; everything else must agree.
        normalised = {'jpeg': 'jpg'}.get(ext, ext)
        if sniffed != normalised:
            raise ValidationError(
                f'File content ({sniffed}) does not match its .{ext} extension.'
            )


validate_image_upload = ValidatedUpload(
    allowed=['jpg', 'jpeg', 'png', 'gif', 'webp'], kind='image'
)

validate_document_upload = ValidatedUpload(
    allowed=['pdf', 'jpg', 'jpeg', 'png', 'webp'], kind='document'
)
