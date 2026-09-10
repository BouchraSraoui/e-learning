from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None

    data = response.data
    code = getattr(exc, 'default_code', None) or 'error'
    envelope = {'code': code}

    if isinstance(data, dict) and 'detail' in data:
        envelope['detail'] = str(data['detail'])
    elif isinstance(data, dict):
        envelope['detail'] = 'Validation failed.'
        envelope['errors'] = data
    else:
        envelope['detail'] = str(data)

    response.data = envelope
    return response
