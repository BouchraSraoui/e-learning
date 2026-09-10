
import apps.courses.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120, unique=True)),
                ('slug', models.SlugField(blank=True, max_length=140, unique=True)),
                ('accent', models.CharField(choices=[('primary', 'Primary'), ('brand', 'Brand'), ('violet', 'Violet'), ('emerald', 'Emerald'), ('amber', 'Amber'), ('rose', 'Rose')], default='primary', max_length=16)),
                ('description', models.CharField(blank=True, max_length=280)),
                ('order', models.PositiveIntegerField(default=0)),
            ],
            options={
                'verbose_name_plural': 'categories',
                'ordering': ['order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='LearningPath',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('slug', models.SlugField(blank=True, max_length=220, unique=True)),
                ('description', models.TextField(blank=True)),
                ('is_published', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['title'],
            },
        ),
        migrations.CreateModel(
            name='Course',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('slug', models.SlugField(blank=True, max_length=220, unique=True)),
                ('summary', models.CharField(help_text='One-line catalog blurb.', max_length=300)),
                ('description', models.TextField(blank=True)),
                ('objectives', models.JSONField(blank=True, default=list, help_text='List of learning objectives.')),
                ('level', models.CharField(choices=[('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced')], default='beginner', max_length=16)),
                ('primary_format', models.CharField(choices=[('video', 'Video'), ('audio', 'Audio'), ('pdf', 'PDF'), ('slides', 'Presentation'), ('text', 'Rich text')], default='video', max_length=16)),
                ('duration_minutes', models.PositiveIntegerField(default=0)),
                ('is_mandatory', models.BooleanField(default=False)),
                ('is_published', models.BooleanField(default=False)),
                ('thumbnail', models.ImageField(blank=True, null=True, upload_to='course_thumbnails/', validators=[apps.courses.validators.FileValidator(frozenset(['.gif', '.jpeg', '.jpg', '.png', '.webp']), max_mb=5)])),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('author', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='authored_courses', to=settings.AUTH_USER_MODEL)),
                ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='courses', to='courses.category')),
                ('prerequisites', models.ManyToManyField(blank=True, related_name='required_for', to='courses.course')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='LearningPathItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(default=0)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='path_items', to='courses.course')),
                ('path', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='courses.learningpath')),
            ],
            options={
                'ordering': ['order', 'id'],
            },
        ),
        migrations.AddField(
            model_name='learningpath',
            name='courses',
            field=models.ManyToManyField(blank=True, related_name='learning_paths', through='courses.LearningPathItem', to='courses.course'),
        ),
        migrations.CreateModel(
            name='Module',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('summary', models.CharField(blank=True, max_length=300)),
                ('order', models.PositiveIntegerField(default=0)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='modules', to='courses.course')),
            ],
            options={
                'ordering': ['order', 'id'],
            },
        ),
        migrations.CreateModel(
            name='Lesson',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('content_type', models.CharField(choices=[('video', 'Video'), ('audio', 'Audio'), ('pdf', 'PDF'), ('slides', 'Presentation'), ('text', 'Rich text')], default='video', max_length=16)),
                ('file', models.FileField(blank=True, null=True, upload_to='lesson_files/')),
                ('external_url', models.URLField(blank=True)),
                ('rich_text', models.TextField(blank=True)),
                ('duration_minutes', models.PositiveIntegerField(default=0)),
                ('order', models.PositiveIntegerField(default=0)),
                ('is_preview', models.BooleanField(default=False, help_text='Viewable in the catalog before enrolling.')),
                ('module', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lessons', to='courses.module')),
            ],
            options={
                'ordering': ['order', 'id'],
            },
        ),
        migrations.CreateModel(
            name='Resource',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('file', models.FileField(blank=True, null=True, upload_to='resources/', validators=[apps.courses.validators.FileValidator(frozenset(['.csv', '.doc', '.docx', '.jpeg', '.jpg', '.odp', '.ods', '.odt', '.pdf', '.png', '.ppt', '.pptx', '.txt', '.xls', '.xlsx', '.zip']), max_mb=50)])),
                ('external_url', models.URLField(blank=True)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='resources', to='courses.course')),
            ],
            options={
                'ordering': ['id'],
            },
        ),
        migrations.AddIndex(
            model_name='course',
            index=models.Index(fields=['is_published'], name='courses_cou_is_publ_4b99b9_idx'),
        ),
        migrations.AddIndex(
            model_name='course',
            index=models.Index(fields=['level'], name='courses_cou_level_bf0a39_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='learningpathitem',
            unique_together={('path', 'course')},
        ),
    ]
