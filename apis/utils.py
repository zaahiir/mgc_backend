"""Shared helpers.

The former ``PasswordManager`` lived here. It encrypted member passwords with
Fernet so they could be decrypted and mailed back in cleartext, which meant
read access to a member row was equivalent to knowing the password. Passwords
are now stored only as one-way hashes (``django.contrib.auth.hashers``), and
the class has been removed rather than deprecated so nothing can call it.
"""

import logging

from rest_framework import status
from rest_framework.exceptions import ParseError, UnsupportedMediaType
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """Return a client-safe error body.

    Two things were wrong with the original. It attached a ``debug_info`` blob
    carrying the exception type, its message and request metadata to the
    response — detail that belongs in the log. And it decided what counted as
    a parsing failure by searching the exception text for "parse"/"json"/
    "request", which also matched DRF's own "Request was throttled…" and
    rewrote genuine 429s into 400s. The type is checked instead.
    """
    response = exception_handler(exc, context)

    if isinstance(exc, (ParseError, UnsupportedMediaType)):
        logger.warning(
            'Request parsing error on %s: %s',
            getattr(context.get('request'), 'path', 'unknown'),
            exc,
        )
        return Response(
            {
                'status': 'error',
                'message': 'Invalid request format. Please check your submission and try again.',
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if response is None:
        # Unhandled exception: log it in full, tell the client nothing.
        logger.exception('Unhandled exception: %s', exc)

    return response
