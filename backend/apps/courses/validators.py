from __future__ import annotations

import os

import nh3
from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible

MB = 1024 * 1024

BLOCKED_EXTENSIONS = frozenset({
    '.exe', '.msi', '.bat', '.cmd', '.com', '.scr', '.pif', '.sh', '.bash',
    '.ps1', '.psm1', '.vbs', '.vbe', '.js', '.jse', '.jar', '.py', '.pyc',
    '.rb', '.pl', '.php', '.php3', '.php4', '.php5', '.phtml', '.asp', '.aspx',
    '.jsp', '.cgi', '.dll', '.so', '.dylib', '.app', '.deb', '.rpm', '.apk',
    '.htaccess', '.svg', '.svgz', '.html', '.htm', '.xhtml', '.hta', '.wsf',
})

IMAGE_EXTENSIONS = frozenset({'.jpg', '.jpeg', '.png', '.webp', '.gif'})
VIDEO_EXTENSIONS = frozenset({'.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v'})
AUDIO_EXTENSIONS = frozenset({'.mp3', '.m4a', '.aac', '.wav', '.oga'})
DOCUMENT_EXTENSIONS = frozenset({'.pdf'})
SLIDE_EXTENSIONS = frozenset({'.pdf', '.ppt', '.pptx', '.key', '.odp'})
RESOURCE_EXTENSIONS = frozenset({
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odp', '.ods',
    '.odt', '.txt', '.csv', '.zip', '.png', '.jpg', '.jpeg',
})

CONTENT_TYPE_EXTENSIONS = {
    'video': VIDEO_EXTENSIONS,
    'audio': AUDIO_EXTENSIONS,
    'pdf': DOCUMENT_EXTENSIONS,
    'slides': SLIDE_EXTENSIONS,
    'text': frozenset(),
}


def _extension(name: str) -> str:
    return os.path.splitext(name)[1].lower()


@deconstructible
class FileValidator:

    def __init__(self, allowed_extensions, max_mb: int):
        self.allowed_extensions = frozenset(e.lower() for e in allowed_extensions)
        self.max_mb = max_mb

    def __call__(self, file):
        ext = _extension(getattr(file, 'name', '') or '')

        if ext in BLOCKED_EXTENSIONS:
            raise ValidationError(
                'Executable and script files are not allowed.', code='blocked_type'
            )
        if ext not in self.allowed_extensions:
            allowed = ', '.join(sorted(e.lstrip('.') for e in self.allowed_extensions))
            raise ValidationError(
                f'Unsupported file type “{ext or "?"}”. Allowed: {allowed}.',
                code='unsupported_type',
            )

        size = getattr(file, 'size', None)
        if size is not None and size > self.max_mb * MB:
            raise ValidationError(
                f'File is too large (max {self.max_mb} MB).', code='too_large'
            )

    def __eq__(self, other):
        return (
            isinstance(other, FileValidator)
            and self.allowed_extensions == other.allowed_extensions
            and self.max_mb == other.max_mb
        )


LESSON_EXTENSIONS = VIDEO_EXTENSIONS | AUDIO_EXTENSIONS | DOCUMENT_EXTENSIONS | SLIDE_EXTENSIONS

validate_thumbnail = FileValidator(IMAGE_EXTENSIONS, max_mb=5)
validate_resource_file = FileValidator(RESOURCE_EXTENSIONS, max_mb=50)
validate_lesson_file = FileValidator(LESSON_EXTENSIONS, max_mb=500)


def validate_lesson_file_for_type(file, content_type: str) -> None:
    allowed = CONTENT_TYPE_EXTENSIONS.get(content_type, frozenset())
    caps = {'video': 500, 'audio': 100, 'pdf': 50, 'slides': 50}
    FileValidator(allowed, max_mb=caps.get(content_type, 50))(file)



_ALLOWED_TAGS = {
    'p', 'br', 'hr', 'span', 'div', 'strong', 'b', 'em', 'i', 'u', 's',
    'blockquote', 'code', 'pre', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3',
    'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
}
_ALLOWED_ATTRS = {
    'a': {'href', 'title', 'target'},
    'span': {'class'},
    'div': {'class'},
    'code': {'class'},
    'th': {'colspan', 'rowspan', 'scope'},
    'td': {'colspan', 'rowspan'},
}


def sanitize_html(value: str) -> str:
    if not value:
        return value
    return nh3.clean(
        value,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRS,
        link_rel='noopener noreferrer nofollow',
        url_schemes={'http', 'https', 'mailto'},
    )
