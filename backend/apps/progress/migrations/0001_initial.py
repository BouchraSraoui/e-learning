
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('courses', '0002_alter_lesson_file'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Enrollment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('not_started', 'Not started'), ('in_progress', 'In progress'), ('completed', 'Completed')], default='not_started', max_length=16)),
                ('progress', models.PositiveSmallIntegerField(default=0, help_text='0–100 percent.')),
                ('enrolled_at', models.DateTimeField(auto_now_add=True)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='enrollments', to='courses.course')),
                ('last_lesson', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='courses.lesson')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='enrollments', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-enrolled_at'],
            },
        ),
        migrations.CreateModel(
            name='LessonProgress',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('completed', models.BooleanField(default=False)),
                ('resume_position_seconds', models.PositiveIntegerField(default=0)),
                ('time_spent_seconds', models.PositiveIntegerField(default=0)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('last_viewed_at', models.DateTimeField(auto_now=True)),
                ('enrollment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lesson_progress', to='progress.enrollment')),
                ('lesson', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='progress_records', to='courses.lesson')),
            ],
            options={
                'ordering': ['lesson__order', 'id'],
            },
        ),
        migrations.CreateModel(
            name='Certificate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(editable=False, max_length=20, unique=True)),
                ('holder_name', models.CharField(max_length=200)),
                ('course_title', models.CharField(max_length=200)),
                ('issued_at', models.DateTimeField(auto_now_add=True)),
                ('signature', models.CharField(blank=True, editable=False, max_length=64)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='certificates', to='courses.course')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='certificates', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-issued_at'],
                'unique_together': {('user', 'course')},
            },
        ),
        migrations.AddIndex(
            model_name='enrollment',
            index=models.Index(fields=['user', 'status'], name='progress_en_user_id_1eff5a_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='enrollment',
            unique_together={('user', 'course')},
        ),
        migrations.AlterUniqueTogether(
            name='lessonprogress',
            unique_together={('enrollment', 'lesson')},
        ),
    ]
