import io

import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient


from apps.accounts.models import Role, User
from apps.courses.models import (
    Category,
    Course,
    LearningPath,
    LearningPathItem,
    Lesson,
    Module,
)
from apps.courses.validators import (
    FileValidator,
    sanitize_html,
    validate_lesson_file_for_type,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def learner(db):
    return User.objects.create_user(
        email='amir@gmail.com', password='password123',
        first_name='Amir', last_name='Rahmani', role=Role.USER,
    )


@pytest.fixture
def trainer(db):
    return User.objects.create_user(
        email='manager@gmail.com', password='password123',
        first_name='Yasmine', last_name='Belkacem', role=Role.MANAGER,
    )


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email='admin@gmail.com', password='password123',
        first_name='Sofia', last_name='Mansouri', role=Role.ADMIN,
    )


@pytest.fixture
def category(db):
    return Category.objects.create(name='Commercial', accent='primary')


def make_course(category, **kwargs):
    defaults = dict(
        title='Consultative Selling',
        summary='Sell with value.',
        category=category,
        level='intermediate',
        primary_format='video',
        duration_minutes=145,
        is_published=True,
    )
    defaults.update(kwargs)
    course = Course.objects.create(**defaults)
    module = Module.objects.create(course=course, title='Discovery', order=0)
    Lesson.objects.create(module=module, title='Intro', content_type='video', duration_minutes=12, order=0)
    Lesson.objects.create(module=module, title='Handout', content_type='pdf', duration_minutes=8, order=1)
    return course



def test_catalog_requires_auth(client, category):
    make_course(category)
    assert client.get('/api/courses/').status_code == 401


def test_learner_lists_published_courses(client, learner, category):
    make_course(category)
    client.force_authenticate(learner)
    resp = client.get('/api/courses/')
    assert resp.status_code == 200
    assert resp.data['count'] == 1
    row = resp.data['results'][0]
    assert row['module_count'] == 1 and row['lesson_count'] == 2
    assert row['category_name'] == 'Commercial'


def test_draft_visibility_by_role(client, learner, trainer, admin, category):
    make_course(category, title='Published one', is_published=True)
    make_course(category, title='Secret draft', slug='', is_published=False)
    make_course(category, title='My draft', slug='', is_published=False, author=trainer)

    client.force_authenticate(learner)
    titles = {c['title'] for c in client.get('/api/courses/').data['results']}
    assert 'Secret draft' not in titles and 'My draft' not in titles

    client.force_authenticate(admin)
    titles = {c['title'] for c in client.get('/api/courses/').data['results']}
    assert 'Secret draft' in titles and 'My draft' in titles

    client.force_authenticate(trainer)
    titles = {c['title'] for c in client.get('/api/courses/').data['results']}
    assert 'My draft' in titles and 'Secret draft' not in titles


def test_course_detail_by_slug_nested(client, learner, category):
    course = make_course(category)
    client.force_authenticate(learner)
    resp = client.get(f'/api/courses/{course.slug}/')
    assert resp.status_code == 200
    assert resp.data['title'] == course.title
    assert len(resp.data['modules']) == 1
    assert len(resp.data['modules'][0]['lessons']) == 2
    assert 'objectives' in resp.data


def test_detail_hides_media_for_non_preview_lessons(client, learner, category):
    course = make_course(category)
    lesson = Lesson.objects.filter(module__course=course).first()
    lesson.is_preview = False
    lesson.external_url = 'https://cdn.example.com/x.mp4'
    lesson.file = SimpleUploadedFile('x.mp4', b'data', content_type='video/mp4')
    lesson.save()
    client.force_authenticate(learner)
    resp = client.get(f'/api/courses/{course.slug}/')
    lessons = resp.data['modules'][0]['lessons']
    non_preview = next(le for le in lessons if not le['is_preview'])
    assert non_preview['file'] is None
    assert non_preview['external_url'] == ''


def test_detail_shows_media_for_preview_lessons(client, learner, category):
    course = make_course(category)
    lesson = Lesson.objects.filter(module__course=course).first()
    lesson.is_preview = True
    lesson.external_url = 'https://cdn.example.com/preview.mp4'
    lesson.save()
    client.force_authenticate(learner)
    resp = client.get(f'/api/courses/{course.slug}/')
    lessons = resp.data['modules'][0]['lessons']
    preview = next(le for le in lessons if le['is_preview'])
    assert preview['external_url'] == 'https://cdn.example.com/preview.mp4'



def test_search_by_title(client, learner, category):
    make_course(category, title='Consultative Selling', slug='')
    make_course(category, title='Networking Fundamentals', slug='')
    client.force_authenticate(learner)
    resp = client.get('/api/courses/?search=networking')
    assert resp.data['count'] == 1
    assert resp.data['results'][0]['title'] == 'Networking Fundamentals'


def test_filter_by_level_and_category(client, learner, category):
    other = Category.objects.create(name='Technical', accent='emerald')
    make_course(category, title='A', slug='', level='beginner')
    make_course(other, title='B', slug='', level='advanced')
    client.force_authenticate(learner)
    assert client.get('/api/courses/?level=advanced').data['count'] == 1
    assert client.get(f'/api/courses/?category={category.id}').data['count'] == 1


def test_filter_by_duration_bucket(client, learner, category):
    make_course(category, title='Short', slug='', duration_minutes=20)
    make_course(category, title='Long', slug='', duration_minutes=200)
    client.force_authenticate(learner)
    assert client.get('/api/courses/?duration=short').data['count'] == 1
    assert client.get('/api/courses/?duration=long').data['count'] == 1
    assert client.get('/api/courses/?duration=medium').data['count'] == 0


def test_filter_by_content_type(client, learner, category):
    make_course(category, title='HasPdf', slug='')
    audio_only = make_course(category, title='AudioOnly', slug='', primary_format='audio')
    Lesson.objects.filter(module__course=audio_only).update(content_type='audio')
    client.force_authenticate(learner)
    resp = client.get('/api/courses/?content_type=pdf')
    titles = {c['title'] for c in resp.data['results']}
    assert 'HasPdf' in titles and 'AudioOnly' not in titles



def test_categories_list_with_counts(client, learner, category):
    make_course(category)
    client.force_authenticate(learner)
    resp = client.get('/api/categories/')
    assert resp.status_code == 200
    row = next(c for c in resp.data if c['name'] == 'Commercial')
    assert row['course_count'] == 1
    assert row['accent'] == 'primary'



def test_learner_cannot_create_course(client, learner, category):
    client.force_authenticate(learner)
    resp = client.post('/api/courses/', {'title': 'X', 'summary': 'y', 'category': category.id}, format='json')
    assert resp.status_code == 403


def test_trainer_creates_course_sets_author(client, trainer, category):
    client.force_authenticate(trainer)
    resp = client.post('/api/courses/', {
        'title': 'New Course', 'summary': 'A summary', 'category': category.id,
        'level': 'beginner', 'primary_format': 'video', 'objectives': ['Learn a thing'],
    }, format='json')
    assert resp.status_code == 201, resp.data
    course = Course.objects.get(title='New Course')
    assert course.author == trainer
    assert course.slug


def test_create_sanitizes_description(client, trainer, category):
    client.force_authenticate(trainer)
    resp = client.post('/api/courses/', {
        'title': 'XSS test', 'summary': 's', 'category': category.id,
        'description': '<p>ok</p><script>alert(1)</script>',
    }, format='json')
    assert resp.status_code == 201, resp.data
    course = Course.objects.get(title='XSS test')
    assert '<script>' not in course.description
    assert '<p>ok</p>' in course.description



def test_file_validator_blocks_executables():
    exe = SimpleUploadedFile('malware.exe', b'MZ', content_type='application/octet-stream')
    with pytest.raises(ValidationError):
        FileValidator({'.pdf'}, max_mb=5)(exe)


def test_lesson_file_type_mismatch_rejected():
    fake = SimpleUploadedFile('notes.txt', b'hello', content_type='text/plain')
    with pytest.raises(ValidationError):
        validate_lesson_file_for_type(fake, 'video')


def test_lesson_file_size_cap():
    big = SimpleUploadedFile('clip.mp3', b'x' * 5, content_type='audio/mpeg')
    big.size = 200 * 1024 * 1024
    with pytest.raises(ValidationError):
        validate_lesson_file_for_type(big, 'audio')


def test_sanitize_html_strips_dangerous_markup():
    dirty = '<p>Keep</p><script>bad()</script><a href="javascript:evil()">x</a>'
    clean = sanitize_html(dirty)
    assert '<script>' not in clean
    assert 'javascript:' not in clean
    assert '<p>Keep</p>' in clean


def test_lesson_save_sanitizes_rich_text(category):
    course = make_course(category)
    module = course.modules.first()
    lesson = Lesson.objects.create(
        module=module, title='Notes', content_type='text',
        rich_text='<p>Fine</p><script>alert(1)</script>', order=99,
    )
    lesson.refresh_from_db()
    assert '<script>' not in lesson.rich_text


def test_course_save_sanitizes_description(category):
    course = Course.objects.create(
        title='Desc', summary='s', category=category,
        description='<p>ok</p><script>bad()</script>',
    )
    course.refresh_from_db()
    assert '<script>' not in course.description
    assert '<p>ok</p>' in course.description


def test_lesson_file_model_validator_blocks_executable(category):
    module = make_course(category).modules.first()
    lesson = Lesson(
        module=module, title='x', content_type='video', order=5,
        file=SimpleUploadedFile('malware.exe', b'MZ'),
    )
    with pytest.raises(ValidationError):
        lesson.full_clean()



def _path_with_draft(category):
    pub = make_course(category, title='Pub course', slug='')
    draft = make_course(category, title='Secret draft', slug='', is_published=False)
    path = LearningPath.objects.create(title='Track', is_published=True)
    LearningPathItem.objects.create(path=path, course=pub, order=0)
    LearningPathItem.objects.create(path=path, course=draft, order=1)
    return path


def test_learning_path_hides_draft_courses_from_learner(client, learner, category):
    path = _path_with_draft(category)
    client.force_authenticate(learner)
    resp = client.get(f'/api/learning-paths/{path.slug}/')
    assert resp.status_code == 200
    titles = {c['title'] for c in resp.data['courses']}
    assert 'Pub course' in titles and 'Secret draft' not in titles
    card = next(c for c in resp.data['courses'] if c['title'] == 'Pub course')
    assert card['module_count'] == 1 and card['lesson_count'] == 2


def test_learning_path_shows_drafts_to_staff(client, admin, category):
    path = _path_with_draft(category)
    client.force_authenticate(admin)
    resp = client.get(f'/api/learning-paths/{path.slug}/')
    titles = {c['title'] for c in resp.data['courses']}
    assert 'Secret draft' in titles


def test_detail_hides_draft_prerequisite_from_learner(client, learner, admin, category):
    draft = make_course(category, title='Draft prereq', slug='', is_published=False)
    pub = make_course(category, title='Has prereq', slug='')
    pub.prerequisites.add(draft)

    client.force_authenticate(learner)
    resp = client.get(f'/api/courses/{pub.slug}/')
    assert [p['title'] for p in resp.data['prerequisites']] == []

    client.force_authenticate(admin)
    resp = client.get(f'/api/courses/{pub.slug}/')
    assert [p['title'] for p in resp.data['prerequisites']] == ['Draft prereq']
