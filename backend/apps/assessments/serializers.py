from django.db import transaction
from rest_framework import serializers

from .models import Answer, Question, QuestionType, Quiz, QuizAttempt


class QuizRefSerializer(serializers.ModelSerializer):

    question_count = serializers.SerializerMethodField()
    scope = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'pass_score', 'max_attempts', 'question_count', 'module', 'scope']

    def get_question_count(self, obj) -> int:
        return obj.questions.count()

    def get_scope(self, obj) -> str:
        return 'module' if obj.module_id else 'course'


class TakeAnswerSerializer(serializers.ModelSerializer):

    class Meta:
        model = Answer
        fields = ['id', 'text', 'order']


class TakeQuestionSerializer(serializers.ModelSerializer):
    answers = TakeAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'type', 'order', 'points', 'answers']


class QuizSerializer(serializers.ModelSerializer):

    questions = TakeQuestionSerializer(many=True, read_only=True)
    course_slug = serializers.SerializerMethodField()
    attempts_used = serializers.SerializerMethodField()
    attempts_left = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'pass_score', 'max_attempts',
            'course_slug', 'attempts_used', 'attempts_left', 'questions',
        ]

    def get_course_slug(self, obj) -> str | None:
        ref = obj.course_ref
        return ref.slug if ref else None

    def _used(self, obj) -> int:
        user = self.context['request'].user
        return obj.attempts.filter(user=user).count()

    def get_attempts_used(self, obj) -> int:
        return self._used(obj)

    def get_attempts_left(self, obj) -> int | None:
        if not obj.max_attempts:
            return None
        return max(0, obj.max_attempts - self._used(obj))


class AttemptSubmitSerializer(serializers.Serializer):

    responses = serializers.DictField(
        child=serializers.ListField(child=serializers.IntegerField()), allow_empty=True
    )


class AttemptResultSerializer(serializers.ModelSerializer):

    review = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = ['id', 'attempt_number', 'score', 'passed', 'submitted_at', 'responses', 'review']

    def get_review(self, obj):
        return getattr(obj, 'review', None)



class AnswerWriteSerializer(serializers.ModelSerializer):

    id = serializers.IntegerField(required=False)

    class Meta:
        model = Answer
        fields = ['id', 'text', 'is_correct', 'order']


class QuestionWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    answers = AnswerWriteSerializer(many=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'type', 'order', 'points', 'answers']

    def validate(self, attrs):
        answers = attrs.get('answers', [])
        if len(answers) < 2:
            raise serializers.ValidationError('A question needs at least two answers.')
        correct = [a for a in answers if a.get('is_correct')]
        if not correct:
            raise serializers.ValidationError('Mark at least one answer correct.')
        qtype = attrs.get('type')
        if qtype in (QuestionType.SINGLE, QuestionType.DROPDOWN) and len(correct) != 1:
            raise serializers.ValidationError('Single-choice questions need exactly one correct answer.')
        if qtype == QuestionType.TRUE_FALSE and len(answers) != 2:
            raise serializers.ValidationError('True/false questions need exactly two answers.')
        return attrs


class QuizWriteSerializer(serializers.ModelSerializer):

    questions = QuestionWriteSerializer(many=True, required=False)
    scope = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            'id', 'course', 'module', 'title', 'description', 'pass_score',
            'max_attempts', 'is_published', 'scope', 'question_count', 'questions',
        ]

    def get_scope(self, obj) -> str:
        return 'module' if obj.module_id else 'course'

    def get_question_count(self, obj) -> int:
        return obj.questions.count()

    def validate(self, attrs):
        course = attrs.get('course', getattr(self.instance, 'course', None))
        module = attrs.get('module', getattr(self.instance, 'module', None))
        if bool(course) == bool(module):
            raise serializers.ValidationError(
                'A quiz must belong to exactly one of course or module.'
            )
        return attrs

    def _write_questions(self, quiz, questions):
        for qi, q in enumerate(questions):
            answers = q.pop('answers', [])
            q.pop('id', None)
            q.setdefault('order', qi)
            question = Question.objects.create(quiz=quiz, **q)
            Answer.objects.bulk_create([
                Answer(
                    question=question,
                    text=a['text'],
                    is_correct=a.get('is_correct', False),
                    order=a.get('order', ai),
                )
                for ai, a in enumerate(answers)
            ])

    @transaction.atomic
    def create(self, validated_data):
        questions = validated_data.pop('questions', [])
        quiz = Quiz.objects.create(**validated_data)
        self._write_questions(quiz, questions)
        return quiz

    @transaction.atomic
    def update(self, instance, validated_data):
        questions = validated_data.pop('questions', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if questions is not None:
            instance.questions.all().delete()
            self._write_questions(instance, questions)
        return instance
