import logging
from django.core.exceptions import RawPostDataException
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

class RequestParsingMiddleware(MiddlewareMixin):
    """
    Middleware to handle RawPostDataException and other request parsing issues
    """
    
    def process_request(self, request):
        """
        Process the request before it reaches the view
        """
        # Log request details for debugging
        logger.debug(f"Request method: {request.method}")
        logger.debug(f"Content type: {request.content_type}")
        logger.debug(f"Content length: {request.META.get('CONTENT_LENGTH', 'unknown')}")
        
        return None
    
    def process_exception(self, request, exception):
        """
        Handle exceptions that occur during request processing
        """
        # Handle RawPostDataException specifically
        if isinstance(exception, RawPostDataException):
            logger.error(f"RawPostDataException caught: {str(exception)}")
            logger.error(f"Request method: {request.method}")
            logger.error(f"Content type: {request.content_type}")
            logger.error(f"Content length: {request.META.get('CONTENT_LENGTH', 'unknown')}")
            
            return JsonResponse({
                'status': 'error',
                'message': 'Request data stream error. Please ensure your form submission is valid.',
                'debug_info': {
                    'error_type': 'RawPostDataException',
                    'error_message': str(exception),
                    'request_method': request.method,
                    'content_type': request.content_type,
                    'content_length': request.META.get('CONTENT_LENGTH', 'unknown')
                }
            }, status=400)
        
        # Handle other parsing-related exceptions
        if 'parsing' in str(exception).lower() or 'parse' in str(exception).lower():
            logger.error(f"Parsing exception caught: {str(exception)}")
            
            return JsonResponse({
                'status': 'error',
                'message': 'Request parsing error. Please check your form submission format.',
                'debug_info': {
                    'error_type': type(exception).__name__,
                    'error_message': str(exception),
                    'request_method': request.method,
                    'content_type': request.content_type
                }
            }, status=400)
        
        # Let other exceptions pass through
        return None
