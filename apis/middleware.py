import logging

from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class RequestParsingMiddleware(MiddlewareMixin):
    """Turn request-parsing failures into a plain 400.

    Earlier revisions returned a ``debug_info`` object containing the
    exception class, its message and request metadata. That is reconnaissance
    material for a caller who is deliberately sending malformed bodies, so it
    now goes to the log only.
    """

    def process_request(self, request):
        return None

    def process_exception(self, request, exception):
        # Matched on the exception type, not on its text. Substring matching
        # for "parse"/"json"/"request" also caught unrelated errors such as
        # DRF's throttling response and downgraded them to 400.
        from json import JSONDecodeError

        from django.core.exceptions import SuspiciousOperation
        from rest_framework.exceptions import ParseError, UnsupportedMediaType

        if isinstance(exception, (ParseError, UnsupportedMediaType, JSONDecodeError,
                                  SuspiciousOperation)):
            logger.warning(
                'Parsing error on %s %s (content-type=%s): %s',
                request.method, request.path, request.content_type, exception,
            )
            return JsonResponse({
                'status': 'error',
                'message': 'Invalid request format. Please check your submission and try again.',
            }, status=400)

        return None
