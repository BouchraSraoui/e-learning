import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.assessments.models import Answer, Question, Quiz
from apps.courses.models import Category, Course, Lesson, Module

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def learner(db):
    return User.objects.create_user(
        email='amir@gmail.com', password='password123',
        first_name='Amir', last_name='R', role=Role.USER,
    )


@pytest.fixture
def trainer(db):
    return User.objects.create_user(
        email='manager@gmail.com', password='password123',
        first_name='Yas', last_name='B', role=Role.MANAGER,
    )


@pytest.fixture
def category(db):
    return Category.objects.create(name='Commercial', accent='primary')


@pytest.fixture
def course(category, trainer):
    return Course.objects.create(
        title='Consultative Selling', summary='Sell with value.',
        category=category, level='intermediate', primary_format='video',
        is_published=False, author=trainer,
    )


@pytest.fixture
def module(course):
    return Module.objects.create(course=course, title='Discovery', order=0)



def test_trainer_creates_course(client, trainer, category):
    client.force_authenticate(trainer)
    resp = client.post('/api/courses/', {
        'title': 'New Course', 'summary': 'A summary', 'category': category.id,
        'level': 'beginner', 'primary_format': 'video', 'objectives': ['Learn X'],
    }, format='json')
    assert resp.status_code == 201, resp.data
    course = Course.objects.get(title='New Course')
    assert course.author_id == trainer.id
    assert course.is_published is False


def test_learner_cannot_create_course(client, learner, category):
    client.force_authenticate(learner)
    resp = client.post('/api/courses/', {'title': 'X', 'summary': 'Y'}, format='json')
    assert resp.status_code == 403


def test_trainer_publishes_and_deletes_course(client, trainer, course):
    client.force_authenticate(trainer)
    resp = client.patch(f'/api/courses/{course.slug}/', {'is_published': True}, format='json')
    assert resp.status_code == 200
    course.refresh_from_db()
    assert course.is_published is True

    resp = client.delete(f'/api/courses/{course.slug}/')
    assert resp.status_code == 204
    assert not Course.objects.filter(pk=course.pk).exists()



def test_trainer_creates_and_lists_modules(client, trainer, course):
    client.force_authenticate(trainer)
    resp = client.post('/api/modules/', {
        'course': course.id, 'title': 'Chapter 1', 'order': 0,
    }, format='json')
    assert resp.status_code == 201, resp.data
    resp = client.get(f'/api/modules/?course={course.id}')
    assert resp.status_code == 200
    assert len(resp.data) == 1
    assert resp.data[0]['title'] == 'Chapter 1'


def test_learner_cannot_create_module(client, learner, course):
    client.force_authenticate(learner)
    resp = client.post('/api/modules/', {'course': course.id, 'title': 'X'}, format='json')
    assert resp.status_code == 403



def test_trainer_creates_text_lesson(client, trainer, module):
    client.force_authenticate(trainer)
    resp = client.post('/api/lessons/', {
        'module': module.id, 'title': 'Reading', 'content_type': 'text',
        'rich_text': '<p>Hello <script>alert(1)</script></p>', 'order': 0,
    }, format='json')
    assert resp.status_code == 201, resp.data
    lesson = Lesson.objects.get(title='Reading')
    assert 'script' not in lesson.rich_text


def test_text_lesson_rejects_file(client, trainer, module):
    client.force_authenticate(trainer)
    upload = SimpleUploadedFile('a.pdf', b'%PDF-1.4 test', content_type='application/pdf')
    resp = client.post('/api/lessons/', {
        'module': module.id, 'title': 'Bad', 'content_type': 'text', 'file': upload,
    }, format='multipart')
    assert resp.status_code == 400


def test_lesson_upload_rejects_executable(client, trainer, module):
    client.force_authenticate(trainer)
    evil = SimpleUploadedFile('malware.exe', b'MZ evil', content_type='application/octet-stream')
    resp = client.post('/api/lessons/', {
        'module': module.id, 'title': 'Evil', 'content_type': 'pdf', 'file': evil,
    }, format='multipart')
    assert resp.status_code == 400


def test_trainer_updates_and_deletes_lesson(client, trainer, module):
    lesson = Lesson.objects.create(module=module, title='Old', content_type='video', order=0)
    client.force_authenticate(trainer)
    resp = client.patch(f'/api/lessons/{lesson.id}/', {'title': 'New'}, format='json')
    assert resp.status_code == 200
    lesson.refresh_from_db()
    assert lesson.title == 'New'
    assert client.delete(f'/api/lessons/{lesson.id}/').status_code == 204



def test_trainer_adds_resource_by_url(client, trainer, course):
    client.force_authenticate(trainer)
    resp = client.post('/api/resources/', {
        'course': course.id, 'title': 'Cheat sheet', 'external_url': 'https://intra.icosnet.com/x.pdf',
    }, format='json')
    assert resp.status_code == 201, resp.data


def test_resource_requires_file_or_url(client, trainer, course):
    client.force_authenticate(trainer)
    resp = client.post('/api/resources/', {'course': course.id, 'title': 'Empty'}, format='json')
    assert resp.status_code == 400



def _quiz_payload(course_id):
    return {
        'course': course_id, 'title': 'Final Quiz', 'pass_score': 70, 'max_attempts': 0,
        'is_published': True,
        'questions': [
            {
                'text': 'Capital of Algeria?', 'type': 'single', 'points': 1, 'order': 0,
                'answers': [
                    {'text': 'Algiers', 'is_correct': True, 'order': 0},
                    {'text': 'Oran', 'is_correct': False, 'order': 1},
                ],
            },
            {
                'text': 'Pick the primary colors', 'type': 'multiple', 'points': 2, 'order': 1,
                'answers': [
                    {'text': 'Red', 'is_correct': True, 'order': 0},
                    {'text': 'Green', 'is_correct': False, 'order': 1},
                    {'text': 'Blue', 'is_correct': True, 'order': 2},
                ],
            },
        ],
    }


def test_trainer_authors_quiz_with_questions(client, trainer, course):
    client.force_authenticate(trainer)
    resp = client.post('/api/admin/quizzes/', _quiz_payload(course.id), format='json')
    assert resp.status_code == 201, resp.data
    quiz = Quiz.objects.get(title='Final Quiz')
    assert quiz.questions.count() == 2
    assert Answer.objects.filter(question__quiz=quiz, is_correct=True).count() == 3


def test_admin_quiz_read_includes_correctness(client, trainer, course):
    client.force_authenticate(trainer)
    created = client.post('/api/admin/quizzes/', _quiz_payload(course.id), format='json').data
    resp = client.get(f'/api/admin/quizzes/{created["id"]}/')
    assert resp.status_code == 200
    assert resp.data['questions'][0]['answers'][0]['is_correct'] is True


def test_quiz_rejects_single_with_two_correct(client, trainer, course):
    client.force_authenticate(trainer)
    payload = _quiz_payload(course.id)
    payload['questions'][0]['answers'][1]['is_correct'] = True
    resp = client.post('/api/admin/quizzes/', payload, format='json')
    assert resp.status_code == 400


def test_trainer_authors_dropdown_question(client, trainer, course):
    client.force_authenticate(trainer)
    payload = _quiz_payload(course.id)
    payload['questions'] = [
        {
            'text': 'Which is a video format?', 'type': 'dropdown', 'points': 1, 'order': 0,
            'answers': [
                {'text': 'MP4', 'is_correct': True, 'order': 0},
                {'text': 'DOCX', 'is_correct': False, 'order': 1},
                {'text': 'XLSX', 'is_correct': False, 'order': 2},
            ],
        },
    ]
    resp = client.post('/api/admin/quizzes/', payload, format='json')
    assert resp.status_code == 201, resp.data
    assert resp.data['questions'][0]['type'] == 'dropdown'


def test_dropdown_rejects_two_correct(client, trainer, course):
    client.force_authenticate(trainer)
    payload = _quiz_payload(course.id)
    payload['questions'] = [
        {
            'text': 'Pick one', 'type': 'dropdown', 'points': 1, 'order': 0,
            'answers': [
                {'text': 'A', 'is_correct': True, 'order': 0},
                {'text': 'B', 'is_correct': True, 'order': 1},
            ],
        },
    ]
    resp = client.post('/api/admin/quizzes/', payload, format='json')
    assert resp.status_code == 400


def test_quiz_rejects_question_without_correct(client, trainer, course):
    client.force_authenticate(trainer)
    payload = _quiz_payload(course.id)
    for a in payload['questions'][0]['answers']:
        a['is_correct'] = False
    resp = client.post('/api/admin/quizzes/', payload, format='json')
    assert resp.status_code == 400


def test_quiz_must_target_exactly_one_of_course_or_module(client, trainer, course, module):
    client.force_authenticate(trainer)
    payload = _quiz_payload(course.id)
    payload['module'] = module.id
    resp = client.post('/api/admin/quizzes/', payload, format='json')
    assert resp.status_code == 400


def test_quiz_update_replaces_questions(client, trainer, course):
    client.force_authenticate(trainer)
    created = client.post('/api/admin/quizzes/', _quiz_payload(course.id), format='json').data
    resp = client.patch(f'/api/admin/quizzes/{created["id"]}/', {
        'questions': [
            {
                'text': 'Only one now', 'type': 'true_false', 'points': 1, 'order': 0,
                'answers': [
                    {'text': 'True', 'is_correct': True, 'order': 0},
                    {'text': 'False', 'is_correct': False, 'order': 1},
                ],
            },
        ],
    }, format='json')
    assert resp.status_code == 200, resp.data
    quiz = Quiz.objects.get(pk=created['id'])
    assert quiz.questions.count() == 1
    assert quiz.questions.first().text == 'Only one now'


def test_learner_cannot_author_quiz(client, learner, course):
    client.force_authenticate(learner)
    resp = client.post('/api/admin/quizzes/', _quiz_payload(course.id), format='json')
    assert resp.status_code == 403



@pytest.fixture
def other_manager(db):
    return User.objects.create_user(
        email='other.manager@gmail.com', password='password123',
        first_name='Other', last_name='M', role=Role.MANAGER,
    )


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email='admin@gmail.com', password='password123',
        first_name='Sofia', last_name='M', role=Role.ADMIN,
    )


def test_manager_cannot_edit_others_course(client, other_manager, trainer, category):
    owned = Course.objects.create(
        title='Owned by trainer', summary='x', category=category,
        is_published=True, author=trainer,
    )
    client.force_authenticate(other_manager)
    assert client.patch(
        f'/api/courses/{owned.slug}/', {'is_published': False}, format='json'
    ).status_code == 403
    assert client.delete(f'/api/courses/{owned.slug}/').status_code == 403
    owned.refresh_from_db()
    assert owned.is_published is True


def test_manager_cannot_add_module_to_others_course(client, other_manager, course):
    client.force_authenticate(other_manager)
    resp = client.post('/api/modules/', {'course': course.id, 'title': 'Sneaky'}, format='json')
    assert resp.status_code == 403
    assert not Module.objects.filter(title='Sneaky').exists()


def test_manager_overview_lists_only_own(client, other_manager, trainer, course):
    Course.objects.create(title='Other Course', summary='x', author=other_manager)
    client.force_authenticate(other_manager)
    titles = [c['title'] for c in client.get('/api/courses/?mine=true').data['results']]
    assert 'Other Course' in titles
    assert 'Consultative Selling' not in titles


def test_admin_can_edit_any_course(client, admin, course):
    client.force_authenticate(admin)
    assert client.patch(
        f'/api/courses/{course.slug}/', {'is_published': True}, format='json'
    ).status_code == 200
    course.refresh_from_db()
    assert course.is_published is True
    assert client.delete(f'/api/courses/{course.slug}/').status_code == 204
