import pytest

from apps.accounts.models import Department, Role, User
from apps.courses.models import Category, Course
from apps.progress.models import Assignment, Enrollment

pytestmark = pytest.mark.django_db


@pytest.fixture
def category(db):
    return Category.objects.create(name='General', accent='blue')


def make_user(email, department=None, role=Role.USER, is_active=True):
    return User.objects.create_user(
        email=email, password='password123', first_name='X', last_name='Y',
        role=role, department=department, is_active=is_active,
    )


def make_course(category, **kwargs):
    kwargs.setdefault('summary', 's')
    kwargs.setdefault('level', 'beginner')
    kwargs.setdefault('primary_format', 'video')
    return Course.objects.create(category=category, **kwargs)


def test_general_course_assigns_and_enrols_all_active_users(category):
    u1 = make_user('a@gmail.com')
    u2 = make_user('b@gmail.com')
    course = make_course(category, title='Security Awareness',
                         audience=Course.Audience.GENERAL, is_published=True)
    for u in (u1, u2):
        assert Assignment.objects.filter(user=u, course=course).exists()
        assert Enrollment.objects.filter(user=u, course=course).exists()


def test_general_draft_not_assigned(category):
    make_user('a@gmail.com')
    course = make_course(category, title='Draft',
                         audience=Course.Audience.GENERAL, is_published=False)
    assert not Assignment.objects.filter(course=course).exists()


def test_open_course_not_auto_assigned(category):
    make_user('a@gmail.com')
    course = make_course(category, title='Catalog',
                         audience=Course.Audience.OPEN, is_published=True)
    assert not Assignment.objects.filter(course=course).exists()


def test_department_course_assigns_only_its_members(category):
    eng = Department.objects.create(name='Engineering')
    sales = Department.objects.create(name='Sales')
    dev = make_user('dev@gmail.com', department=eng)
    rep = make_user('rep@gmail.com', department=sales)
    no_dept = make_user('nomad@gmail.com')
    course = make_course(category, title='Eng Onboarding',
                         audience=Course.Audience.DEPARTMENT, department=eng, is_published=True)
    assert Assignment.objects.filter(user=dev, course=course).exists()
    assert not Assignment.objects.filter(user=rep, course=course).exists()
    assert not Assignment.objects.filter(user=no_dept, course=course).exists()


def test_new_user_inherits_general_and_department_courses(category):
    eng = Department.objects.create(name='Engineering')
    sales = Department.objects.create(name='Sales')
    general = make_course(category, title='Company 101',
                          audience=Course.Audience.GENERAL, is_published=True)
    eng_course = make_course(category, title='Eng Deep Dive',
                             audience=Course.Audience.DEPARTMENT, department=eng, is_published=True)
    sales_course = make_course(category, title='Sales Deep Dive',
                               audience=Course.Audience.DEPARTMENT, department=sales, is_published=True)

    newbie = make_user('new@gmail.com', department=eng)  # created after the courses
    assert Assignment.objects.filter(user=newbie, course=general).exists()
    assert Assignment.objects.filter(user=newbie, course=eng_course).exists()
    assert not Assignment.objects.filter(user=newbie, course=sales_course).exists()


def test_inactive_user_excluded(category):
    inactive = make_user('inactive@gmail.com', is_active=False)
    course = make_course(category, title='Sec',
                         audience=Course.Audience.GENERAL, is_published=True)
    assert not Assignment.objects.filter(user=inactive, course=course).exists()


def test_resave_is_idempotent(category):
    u1 = make_user('a@gmail.com')
    course = make_course(category, title='Sec',
                         audience=Course.Audience.GENERAL, is_published=True)
    course.summary = 'updated'
    course.save()
    assert Assignment.objects.filter(user=u1, course=course).count() == 1
    assert Enrollment.objects.filter(user=u1, course=course).count() == 1


# --- transition-gated behavior --------------------------------------------

def test_publish_transition_assigns(category):
    u = make_user('a@gmail.com')
    course = make_course(category, title='Draft General',
                         audience=Course.Audience.GENERAL, is_published=False)
    assert not Assignment.objects.filter(course=course).exists()
    course.is_published = True
    course.save()
    assert Assignment.objects.filter(user=u, course=course).exists()


def test_audience_change_from_open_assigns(category):
    u = make_user('a@gmail.com')
    course = make_course(category, title='Catalog',
                         audience=Course.Audience.OPEN, is_published=True)
    assert not Assignment.objects.filter(course=course).exists()
    course.audience = Course.Audience.GENERAL
    course.save()
    assert Assignment.objects.filter(user=u, course=course).exists()


def test_department_move_assigns_user(category):
    eng = Department.objects.create(name='Engineering')
    dept_course = make_course(category, title='Eng',
                              audience=Course.Audience.DEPARTMENT, department=eng, is_published=True)
    u = make_user('a@gmail.com')  # created with no department
    assert not Assignment.objects.filter(user=u, course=dept_course).exists()
    u.department = eng
    u.save()
    assert Assignment.objects.filter(user=u, course=dept_course).exists()


def test_reactivation_assigns_user(category):
    general = make_course(category, title='Gen',
                          audience=Course.Audience.GENERAL, is_published=True)
    u = make_user('a@gmail.com', is_active=False)
    assert not Assignment.objects.filter(user=u, course=general).exists()
    u.is_active = True
    u.save()
    assert Assignment.objects.filter(user=u, course=general).exists()


def test_trivial_course_edit_skips_fanout(category, django_assert_max_num_queries):
    # With 10 users, a re-fan would be O(users) queries; the transition guard
    # must make a no-transition edit O(1)-ish (snapshot + update, no per-user loop).
    for i in range(10):
        make_user(f'u{i}@gmail.com')
    course = make_course(category, title='Gen',
                         audience=Course.Audience.GENERAL, is_published=True)
    course.summary = 'changed'
    with django_assert_max_num_queries(4):
        course.save()
