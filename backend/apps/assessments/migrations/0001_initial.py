
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
            name='Question',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.CharField(max_length=500)),
                ('type', models.CharField(choices=[('single', 'Single choice'), ('multiple', 'Multiple choice'), ('true_false', 'True / false')], default='single', max_length=16)),
                ('order', models.PositiveIntegerField(default=0)),
                ('points', models.PositiveSmallIntegerField(default=1)),
            ],
            options={
                'ordering': ['order', 'id'],
            },
        ),
        migrations.CreateModel(
            name='Answer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.CharField(max_length=300)),
                ('is_correct', models.BooleanField(default=False)),
                ('order', models.PositiveIntegerField(default=0)),
                ('question', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='answers', to='assessments.question')),
            ],
            options={
                'ordering': ['order', 'id'],
            },
        ),
        migrations.CreateModel(
            name='Quiz',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('description', models.CharField(blank=True, max_length=300)),
                ('pass_score', models.PositiveSmallIntegerField(default=70, help_text='Percent needed to pass.')),
                ('max_attempts', models.PositiveSmallIntegerField(default=0, help_text='0 = unlimited.')),
                ('is_published', models.BooleanField(default=True)),
                ('course', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='quizzes', to='courses.course')),
                ('module', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='quizzes', to='courses.module')),
            ],
            options={
                'verbose_name_plural': 'quizzes',
                'ordering': ['id'],
            },
        ),
        migrations.AddField(
            model_name='question',
            name='quiz',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='questions', to='assessments.quiz'),
        ),
        migrations.CreateModel(
            name='QuizAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('attempt_number', models.PositiveIntegerField(default=1)),
                ('score', models.PositiveSmallIntegerField(default=0)),
                ('passed', models.BooleanField(default=False)),
                ('responses', models.JSONField(blank=True, default=dict)),
                ('submitted_at', models.DateTimeField(auto_now_add=True)),
                ('quiz', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attempts', to='assessments.quiz')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quiz_attempts', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-submitted_at'],
                'indexes': [models.Index(fields=['user', 'quiz'], name='assessments_user_id_f9b0e9_idx')],
            },
        ),
    ]
