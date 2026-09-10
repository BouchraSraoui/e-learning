import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.courses.models import Category, Course, Lesson, Module
from apps.engagement.models import Badge, Comment, Feedback, Reaction, UserBadge
from apps.engagement.services import evaluate_badges, sync_badge_catalog
from apps.progress.models import Enrollment, LessonProgress
from apps.progress.services import recompute_enrollment

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
def other(db):
    return User.objects.create_user(
        email='nadia@gmail.com', password='password123',
        first_name='Nadia', last_name='Sahli', role=Role.USER,
    )


@pytest.fixture
def trainer(db):
    return User.objects.create_user(
        email='yasmine@gmail.com', password='password123',
        first_name='Yasmine', last_name='Belkacem', role=Role.MANAGER,
    )


@pytest.fixture
def category(db):
    return Category.objects.create(name='Commercial', accent='primary')


@pytest.fixture
def badges(db):
    sync_badge_catalog()
    return Badge.objects.all()


def make_course(category, *, lessons=2, published=True, mandatory=False, title='Course', **kwargs):
    course = Course.objects.create(
        title=title, summary='s', category=category, level='beginner',
        primary_format='video', is_published=published, is_mandatory=mandatory, **kwargs,
    )
    module = Module.objects.create(course=course, title='M1', order=0)
    made = [
        Lesson.objects.create(module=module, title=f'L{i}', content_type='video',
                              duration_minutes=10, order=i)
        for i in range(lessons)
    ]
    return course, made


def complete_course(user, course, lessons):
    enr, _ = Enrollment.objects.get_or_create(user=user, course=course)
    for lesson in lessons:
        LessonProgress.objects.update_or_create(
            enrollment=enr, lesson=lesson, defaults={'completed': True},
        )
    return recompute_enrollment(enr)



def test_list_comments_requires_course(client, learner, category):
    make_course(category)
    client.force_authenticate(learner)
    resp = client.get('/api/comments/')
    assert resp.status_code == 200 and resp.data == []


def test_create_and_list_comment(client, learner, category, badges):
    course, _ = make_course(category)
    client.force_authenticate(learner)
    resp = client.post('/api/comments/', {'course': course.slug, 'body': 'Great course!'}, format='json')
    assert resp.status_code == 201
    listed = client.get('/api/comments/', {'course': course.slug})
    assert listed.status_code == 200 and len(listed.data) == 1
    assert listed.data[0]['body'] == 'Great course!'
    assert listed.data[0]['author_name'] == 'Amir Rahmani'


def test_cannot_comment_on_draft_course(client, learner, category):
    course, _ = make_course(category, published=False, slug='')
    client.force_authenticate(learner)
    resp = client.post('/api/comments/', {'course': course.slug, 'body': 'hi'}, format='json')
    assert resp.status_code == 400


def test_empty_comment_rejected(client, learner, category):
    course, _ = make_course(category)
    client.force_authenticate(learner)
    resp = client.post('/api/comments/', {'course': course.slug, 'body': '   '}, format='json')
    assert resp.status_code == 400


def test_comment_strips_html(client, learner, category):
    course, _ = make_course(category)
    client.force_authenticate(learner)
    resp = client.post(
        '/api/comments/',
        {'course': course.slug, 'body': 'Nice <script>alert(1)</script> work'},
        format='json',
    )
    assert resp.status_code == 201
    assert '<script>' not in resp.data['body'] and 'alert(1)' not in resp.data['body']


def test_delete_own_comment(client, learner, category):
    course, _ = make_course(category)
    comment = Comment.objects.create(course=course, author=learner, body='mine')
    client.force_authenticate(learner)
    resp = client.delete(f'/api/comments/{comment.id}/')
    assert resp.status_code == 204 and not Comment.objects.filter(id=comment.id).exists()


def test_cannot_delete_others_comment(client, learner, other, category):
    course, _ = make_course(category)
    comment = Comment.objects.create(course=course, author=other, body='not yours')
    client.force_authenticate(learner)
    resp = client.delete(f'/api/comments/{comment.id}/')
    assert resp.status_code == 403 and Comment.objects.filter(id=comment.id).exists()


def test_moderator_hides_comment_and_learner_cannot_see(client, learner, other, trainer, category):
    course, _ = make_course(category)
    comment = Comment.objects.create(course=course, author=other, body='spam')
    client.force_authenticate(trainer)
    mod = client.post(f'/api/comments/{comment.id}/moderate/', {'hidden': True}, format='json')
    assert mod.status_code == 200 and mod.data['is_hidden'] is True
    client.force_authenticate(learner)
    listed = client.get('/api/comments/', {'course': course.slug})
    assert all(not c['is_hidden'] for c in listed.data) and len(listed.data) == 0


def test_learner_cannot_moderate(client, learner, other, category):
    course, _ = make_course(category)
    comment = Comment.objects.create(course=course, author=other, body='x')
    client.force_authenticate(learner)
    resp = client.post(f'/api/comments/{comment.id}/moderate/', {'hidden': True}, format='json')
    assert resp.status_code == 403



def test_react_toggle(client, learner, category):
    course, _ = make_course(category)
    comment = Comment.objects.create(course=course, author=learner, body='x')
    client.force_authenticate(learner)
    add = client.post(f'/api/comments/{comment.id}/react/', {'emoji': '👍'}, format='json')
    assert add.status_code == 200
    reactions = {r['emoji']: r for r in add.data['reactions']}
    assert reactions['👍']['count'] == 1 and reactions['👍']['reacted'] is True
    remove = client.post(f'/api/comments/{comment.id}/react/', {'emoji': '👍'}, format='json')
    assert all(r['emoji'] != '👍' for r in remove.data['reactions'])


def test_react_rejects_unknown_emoji(client, learner, category):
    course, _ = make_course(category)
    comment = Comment.objects.create(course=course, author=learner, body='x')
    client.force_authenticate(learner)
    resp = client.post(f'/api/comments/{comment.id}/react/', {'emoji': '🤡'}, format='json')
    assert resp.status_code == 400



def test_feedback_upsert_and_summary(client, learner, other, category):
    course, _ = make_course(category)
    client.force_authenticate(learner)
    first = client.post(f'/api/courses/{course.slug}/feedback/',
                        {'rating': 4, 'comment': 'good'}, format='json')
    assert first.status_code == 200 and first.data['rating'] == 4
    client.post(f'/api/courses/{course.slug}/feedback/', {'rating': 5, 'comment': 'great'}, format='json')
    assert Feedback.objects.filter(user=learner, course=course).count() == 1

    client.force_authenticate(other)
    client.post(f'/api/courses/{course.slug}/feedback/', {'rating': 3}, format='json')
    summary = client.get(f'/api/courses/{course.slug}/feedback/')
    assert summary.data['count'] == 2 and summary.data['average'] == 4.0
    assert summary.data['mine']['rating'] == 3



def test_badge_catalog_earned_flag(client, learner, category, badges):
    client.force_authenticate(learner)
    resp = client.get('/api/badges/')
    assert resp.status_code == 200 and len(resp.data) == len(badges)
    assert all(b['earned'] is False for b in resp.data)


def test_completing_course_awards_badges(client, learner, category, badges):
    course, lessons = make_course(category, lessons=2)
    complete_course(learner, course, lessons)
    codes = set(UserBadge.objects.filter(user=learner).values_list('badge__code', flat=True))
    assert {'first-steps', 'getting-started', 'course-complete', 'certified'} <= codes
    learner.refresh_from_db()
    assert learner.badge_points > 0


def test_leaderboard_ranks_by_total_points(client, learner, other, category):
    learner.points = 100
    learner.badge_points = 50
    learner.save(update_fields=['points', 'badge_points'])
    other.points = 500
    other.save(update_fields=['points'])
    client.force_authenticate(learner)
    resp = client.get('/api/leaderboard/')
    assert resp.status_code == 200
    names = [r['name'] for r in resp.data['results']]
    assert names[0] == 'Nadia Sahli'
    assert resp.data['me']['rank'] == 2 and resp.data['me']['is_me'] is True



def test_react_toggles_off_when_reaction_exists(client, learner, category):
    course, _ = make_course(category)
    comment = Comment.objects.create(course=course, author=learner, body='x')
    Reaction.objects.create(comment=comment, user=learner, emoji='👍')
    client.force_authenticate(learner)
    resp = client.post(f'/api/comments/{comment.id}/react/', {'emoji': '👍'}, format='json')
    assert resp.status_code == 200
    assert not Reaction.objects.filter(comment=comment, user=learner, emoji='👍').exists()


def test_comment_list_rejects_non_numeric_lesson(client, learner, category):
    course, _ = make_course(category)
    client.force_authenticate(learner)
    resp = client.get('/api/comments/', {'course': course.slug, 'lesson': 'abc'})
    assert resp.status_code == 400


def test_comment_list_hides_when_course_unpublished(client, learner, trainer, category):
    course, _ = make_course(category)
    Comment.objects.create(course=course, author=learner, body='visible while published')
    course.is_published = False
    course.save(update_fields=['is_published'])
    client.force_authenticate(learner)
    assert client.get('/api/comments/', {'course': course.slug}).data == []
    client.force_authenticate(trainer)
    assert len(client.get('/api/comments/', {'course': course.slug}).data) == 1


def test_leaderboard_department_scope_empty_without_department(client, learner):
    learner.department = None
    learner.save(update_fields=['department'])
    client.force_authenticate(learner)
    resp = client.get('/api/leaderboard/', {'scope': 'department'})
    assert resp.status_code == 200 and resp.data['scope'] == 'department'
    assert resp.data['results'] == []


def test_leaderboard_my_rank_agrees_on_tie(client, learner, other):
    learner.points = 500
    learner.save(update_fields=['points'])
    other.points = 500
    other.save(update_fields=['points'])
    client.force_authenticate(learner)
    resp = client.get('/api/leaderboard/')
    my_row = next(r for r in resp.data['results'] if r['is_me'])
    assert resp.data['me']['rank'] == my_row['rank']
