import pytest
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.assessments.grading import grade
from apps.assessments.models import Answer, Question, Quiz
from apps.courses.models import Category, Course, Lesson, Module
from apps.progress.models import Certificate, Enrollment

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
def category(db):
    return Category.objects.create(name='Compliance', accent='amber')


def make_course(category, *, lessons=0, published=True, title='Course'):
    course = Course.objects.create(
        title=title, summary='s', category=category, is_published=published
    )
    if lessons:
        module = Module.objects.create(course=course, title='M', order=0)
        for i in range(lessons):
            Lesson.objects.create(module=module, title=f'L{i}', content_type='video', order=i)
    return course


def make_quiz(course, *, pass_score=70, max_attempts=0):
    quiz = Quiz.objects.create(
        course=course, title='Q', pass_score=pass_score, max_attempts=max_attempts
    )
    q1 = Question.objects.create(quiz=quiz, text='single?', type='single', order=0)
    a_ok = Answer.objects.create(question=q1, text='right', is_correct=True, order=0)
    Answer.objects.create(question=q1, text='wrong', is_correct=False, order=1)

    q2 = Question.objects.create(quiz=quiz, text='multiple?', type='multiple', order=1)
    b1 = Answer.objects.create(question=q2, text='c1', is_correct=True, order=0)
    b2 = Answer.objects.create(question=q2, text='c2', is_correct=True, order=1)
    Answer.objects.create(question=q2, text='wrong', is_correct=False, order=2)

    q3 = Question.objects.create(quiz=quiz, text='tf?', type='true_false', order=2)
    tt = Answer.objects.create(question=q3, text='True', is_correct=True, order=0)
    ff = Answer.objects.create(question=q3, text='False', is_correct=False, order=1)

    ids = {'q1': q1, 'a_ok': a_ok, 'q2': q2, 'b1': b1, 'b2': b2, 'q3': q3, 't': tt, 'f': ff}
    return quiz, ids


def all_correct(ids):
    return {
        str(ids['q1'].id): [ids['a_ok'].id],
        str(ids['q2'].id): [ids['b1'].id, ids['b2'].id],
        str(ids['q3'].id): [ids['t'].id],
    }



def test_quiz_requires_exactly_one_owner(category):
    course = make_course(category)
    with pytest.raises(ValidationError):
        Quiz(course=None, module=None, title='x').clean()



def test_grade_all_correct(category):
    quiz, ids = make_quiz(make_course(category))
    score, review = grade(quiz, all_correct(ids))
    assert score == 100
    assert all(r['correct'] for r in review)


def test_grade_multiple_requires_exact_set(category):
    quiz, ids = make_quiz(make_course(category))
    score, review = grade(quiz, {str(ids['q2'].id): [ids['b1'].id]})
    q2 = next(r for r in review if r['question_id'] == ids['q2'].id)
    assert q2['correct'] is False


def test_grade_true_false(category):
    quiz, ids = make_quiz(make_course(category))
    _, review = grade(quiz, {str(ids['q3'].id): [ids['f'].id]})
    q3 = next(r for r in review if r['question_id'] == ids['q3'].id)
    assert q3['correct'] is False



def test_quiz_requires_enrollment(client, learner, category):
    quiz, _ = make_quiz(make_course(category))
    client.force_authenticate(learner)
    assert client.get(f'/api/quizzes/{quiz.id}/').status_code == 403


def test_quiz_hides_is_correct(client, learner, category):
    course = make_course(category)
    quiz, _ = make_quiz(course)
    Enrollment.objects.create(user=learner, course=course)
    client.force_authenticate(learner)
    resp = client.get(f'/api/quizzes/{quiz.id}/')
    assert resp.status_code == 200
    answer = resp.data['questions'][0]['answers'][0]
    assert 'is_correct' not in answer


def test_attempt_requires_enrollment(client, learner, category):
    quiz, _ = make_quiz(make_course(category))
    client.force_authenticate(learner)
    resp = client.post(f'/api/quizzes/{quiz.id}/attempts/', {'responses': {}}, format='json')
    assert resp.status_code == 403


def test_pass_quiz_completes_course_and_issues_certificate(client, learner, category):
    course = make_course(category)
    quiz, ids = make_quiz(course)
    Enrollment.objects.create(user=learner, course=course)
    client.force_authenticate(learner)
    resp = client.post(
        f'/api/quizzes/{quiz.id}/attempts/', {'responses': all_correct(ids)}, format='json'
    )
    assert resp.status_code == 201
    assert resp.data['score'] == 100 and resp.data['passed'] is True
    assert len(resp.data['review']) == 3
    assert Certificate.objects.filter(user=learner, course=course).exists()
    enrollment = Enrollment.objects.get(user=learner, course=course)
    assert enrollment.status == 'completed'


def test_failing_quiz_does_not_pass(client, learner, category):
    course = make_course(category)
    quiz, ids = make_quiz(course, pass_score=70)
    Enrollment.objects.create(user=learner, course=course)
    client.force_authenticate(learner)
    responses = {str(ids['q1'].id): [ids['a_ok'].id]}
    resp = client.post(f'/api/quizzes/{quiz.id}/attempts/', {'responses': responses}, format='json')
    assert resp.data['score'] == 33 and resp.data['passed'] is False
    assert not Certificate.objects.filter(user=learner, course=course).exists()


def test_retake_respects_max_attempts(client, learner, category):
    course = make_course(category)
    quiz, ids = make_quiz(course, max_attempts=1)
    Enrollment.objects.create(user=learner, course=course)
    client.force_authenticate(learner)
    first = client.post(f'/api/quizzes/{quiz.id}/attempts/', {'responses': {}}, format='json')
    assert first.status_code == 201
    second = client.post(f'/api/quizzes/{quiz.id}/attempts/', {'responses': {}}, format='json')
    assert second.status_code == 403


def test_my_attempts_list(client, learner, category):
    course = make_course(category)
    quiz, ids = make_quiz(course)
    Enrollment.objects.create(user=learner, course=course)
    client.force_authenticate(learner)
    client.post(f'/api/quizzes/{quiz.id}/attempts/', {'responses': all_correct(ids)}, format='json')
    resp = client.get(f'/api/quizzes/{quiz.id}/attempts/')
    assert resp.status_code == 200 and len(resp.data) == 1


def test_review_withholds_answer_key_while_retakes_remain(client, learner, category):
    course = make_course(category)
    quiz, ids = make_quiz(course)
    Enrollment.objects.create(user=learner, course=course)
    client.force_authenticate(learner)

    fail = client.post(f'/api/quizzes/{quiz.id}/attempts/', {'responses': {}}, format='json')
    assert fail.data['passed'] is False
    assert all(item['correct_answer_ids'] == [] for item in fail.data['review'])
    assert all('correct' in item for item in fail.data['review'])

    win = client.post(
        f'/api/quizzes/{quiz.id}/attempts/', {'responses': all_correct(ids)}, format='json'
    )
    assert win.data['passed'] is True
    assert any(item['correct_answer_ids'] for item in win.data['review'])


def test_review_reveals_answer_key_when_no_attempts_left(client, learner, category):
    course = make_course(category)
    quiz, ids = make_quiz(course, max_attempts=1)
    Enrollment.objects.create(user=learner, course=course)
    client.force_authenticate(learner)
    fail = client.post(f'/api/quizzes/{quiz.id}/attempts/', {'responses': {}}, format='json')
    assert fail.data['passed'] is False
    assert any(item['correct_answer_ids'] for item in fail.data['review'])


def test_course_detail_surfaces_quiz(client, learner, category):
    course = make_course(category)
    make_quiz(course)
    client.force_authenticate(learner)
    resp = client.get(f'/api/courses/{course.slug}/')
    assert len(resp.data['quizzes']) == 1
    assert resp.data['quizzes'][0]['question_count'] == 3
