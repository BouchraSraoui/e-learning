import mimetypes
import os
import re

from django.http import HttpResponse, StreamingHttpResponse
from django.utils.http import content_disposition_header
from rest_framework_simplejwt.authentication import JWTAuthentication

RANGE_RE = re.compile(r'bytes=(\d+)-(\d*)', re.IGNORECASE)
_CHUNK = 8192


def resolve_media_user(request):
    user = getattr(request, 'user', None)
    if user and user.is_authenticated:
        return user
    raw = request.GET.get('token')
    if not raw:
        return None
    try:
        auth = JWTAuthentication()
        validated = auth.get_validated_token(raw)
        return auth.get_user(validated)
    except Exception:
        return None


def _file_iterator(fileobj, length):
    remaining = length
    try:
        while remaining > 0:
            data = fileobj.read(min(_CHUNK, remaining))
            if not data:
                break
            remaining -= len(data)
            yield data
    finally:
        fileobj.close()


def range_file_response(request, filefield, as_attachment=False):
    size = filefield.size
    content_type = mimetypes.guess_type(filefield.name)[0] or 'application/octet-stream'
    match = RANGE_RE.match(request.headers.get('Range', '') or '')

    if match:
        start = int(match.group(1))
        end = int(match.group(2)) if match.group(2) else size - 1
        end = min(end, size - 1)
        if start > end or start >= size:
            resp = HttpResponse(status=416)
            resp['Content-Range'] = f'bytes */{size}'
            return resp
        length = end - start + 1
        fh = filefield.open('rb')
        fh.seek(start)
        resp = StreamingHttpResponse(
            _file_iterator(fh, length), status=206, content_type=content_type
        )
        resp['Content-Range'] = f'bytes {start}-{end}/{size}'
        resp['Content-Length'] = str(length)
    else:
        fh = filefield.open('rb')
        resp = StreamingHttpResponse(
            _file_iterator(fh, size), content_type=content_type
        )
        resp['Content-Length'] = str(size)

    resp['Accept-Ranges'] = 'bytes'
    # Inline by default so browsers render PDFs/media in-page (an embedded viewer
    # without it may fall back to downloading as "download.pdf"); as_attachment=True
    # forces a save (used for explicit ?download=1 requests, on-net only). Either way
    # the real filename is preserved.
    disposition = content_disposition_header(
        as_attachment=as_attachment, filename=os.path.basename(filefield.name)
    )
    if disposition:
        resp['Content-Disposition'] = disposition
    return resp
