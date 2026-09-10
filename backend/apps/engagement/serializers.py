import nh3
from rest_framework import serializers

from apps.courses.models import Course, Lesson

from .models import Badge, Comment, Feedback


def _clean_text(value: str) -> str:
    return nh3.clean(value or '', tags=set(), attributes={}).strip()


class CommentSerializer(serializers.ModelSerializer):
    course = serializers.CharField(source='course.slug', read_only=True)
    lesson = serializers.PrimaryKeyRelatedField(read_only=True)
    author = serializers.PrimaryKeyRelatedField(read_only=True)
    author_name = serializers.SerializerMethodField()
    author_avatar = serializers.SerializerMethodField()
    author_role = serializers.CharField(source='author.role', read_only=True)
    parent = serializers.PrimaryKeyRelatedField(read_only=True)
    reactions = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'course', 'lesson', 'author', 'author_name', 'author_avatar',
            'author_role', 'parent', 'body', 'is_hidden', 'reactions',
            'created_at', 'updated_at',
        ]

    def get_author_name(self, obj) -> str:
        return obj.author.full_name or obj.author.email

    def get_author_avatar(self, obj) -> str | None:
        if not obj.author.avatar:
            return None
        request = self.context.get('request')
        url = obj.author.avatar.url
        return request.build_absolute_uri(url) if request else url

    def get_reactions(self, obj):
        user = self.context['request'].user
        summary: dict[str, dict] = {}
        for r in obj.reactions.all():
            entry = summary.setdefault(r.emoji, {'emoji': r.emoji, 'count': 0, 'reacted': False})
            entry['count'] += 1
            if r.user_id == user.id:
                entry['reacted'] = True
        return list(summary.values())


class CommentCreateSerializer(serializers.Serializer):
    course = serializers.SlugRelatedField(
        slug_field='slug', queryset=Course.objects.filter(is_published=True)
    )
    lesson = serializers.PrimaryKeyRelatedField(
        queryset=Lesson.objects.all(), required=False, allow_null=True
    )
    parent = serializers.PrimaryKeyRelatedField(
        queryset=Comment.objects.all(), required=False, allow_null=True
    )
    body = serializers.CharField(max_length=2000)

    def validate_body(self, value):
        cleaned = _clean_text(value)
        if not cleaned:
            raise serializers.ValidationError('Comment cannot be empty.')
        return cleaned

    def validate(self, attrs):
        course = attrs['course']
        lesson = attrs.get('lesson')
        parent = attrs.get('parent')
        if lesson and lesson.module.course_id != course.id:
            raise serializers.ValidationError({'lesson': 'Lesson is not part of this course.'})
        if parent and parent.course_id != course.id:
            raise serializers.ValidationError({'parent': 'Parent comment is on another course.'})
        return attrs


class ReactionInputSerializer(serializers.Serializer):
    emoji = serializers.CharField(max_length=8)

    def validate_emoji(self, value):
        allowed = {'👍', '❤️', '🎉', '💡', '🔥', '👏'}
        if value not in allowed:
            raise serializers.ValidationError('Unsupported reaction.')
        return value


class FeedbackSerializer(serializers.ModelSerializer):
    course = serializers.CharField(source='course.slug', read_only=True)
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = ['id', 'course', 'rating', 'comment', 'author_name', 'created_at', 'updated_at']

    def get_author_name(self, obj) -> str:
        return obj.user.full_name or obj.user.email


class FeedbackWriteSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(max_length=1000, required=False, allow_blank=True, default='')

    def validate_comment(self, value):
        return _clean_text(value)


class BadgeSerializer(serializers.ModelSerializer):
    earned = serializers.SerializerMethodField()
    earned_at = serializers.SerializerMethodField()

    class Meta:
        model = Badge
        fields = ['id', 'code', 'name', 'description', 'icon', 'accent', 'points',
                  'order', 'earned', 'earned_at']

    def _map(self) -> dict:
        return self.context.get('earned_map', {})

    def get_earned(self, obj) -> bool:
        return obj.id in self._map()

    def get_earned_at(self, obj):
        return self._map().get(obj.id)
