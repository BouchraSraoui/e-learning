import nh3
from rest_framework import serializers

from .models import FaqEntry


def _clean_text(value: str) -> str:
    return nh3.clean(value or '', tags=set(), attributes={}).strip()


class FaqEntrySerializer(serializers.ModelSerializer):

    keywords = serializers.ListField(
        child=serializers.CharField(max_length=60, allow_blank=True),
        required=False,
        default=list,
    )

    class Meta:
        model = FaqEntry
        fields = [
            'id', 'question', 'answer', 'category', 'keywords',
            'language', 'order', 'is_published', 'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']

    def validate_question(self, value):
        cleaned = _clean_text(value)
        if not cleaned:
            raise serializers.ValidationError('Question cannot be empty.')
        return cleaned

    def validate_answer(self, value):
        cleaned = _clean_text(value)
        if not cleaned:
            raise serializers.ValidationError('Answer cannot be empty.')
        return cleaned

    def validate_category(self, value):
        return _clean_text(value)

    def validate_keywords(self, value):
        seen, out = set(), []
        for raw in value:
            kw = _clean_text(raw).lower()
            if kw and kw not in seen:
                seen.add(kw)
                out.append(kw)
        return out
