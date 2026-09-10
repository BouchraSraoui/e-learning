
import apps.accounts.managers
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='Department',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120, unique=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Team',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120)),
                ('department', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='teams', to='accounts.department')),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('first_name', models.CharField(blank=True, max_length=150, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=150, verbose_name='last name')),
                ('is_staff', models.BooleanField(default=False, help_text='Designates whether the user can log into this admin site.', verbose_name='staff status')),
                ('is_active', models.BooleanField(default=True, help_text='Designates whether this user should be treated as active. Unselect this instead of deleting accounts.', verbose_name='active')),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                ('email', models.EmailField(max_length=254, unique=True, verbose_name='email address')),
                ('role', models.CharField(choices=[('learner', 'Learner'), ('trainer', 'Trainer'), ('manager', 'Manager'), ('admin', 'Administrator')], default='learner', max_length=16)),
                ('job_title', models.CharField(blank=True, max_length=120)),
                ('phone', models.CharField(blank=True, max_length=40)),
                ('location', models.CharField(blank=True, max_length=120)),
                ('bio', models.TextField(blank=True, max_length=280)),
                ('avatar', models.ImageField(blank=True, null=True, upload_to='avatars/')),
                ('language', models.CharField(choices=[('fr', 'Français'), ('ar', 'العربية'), ('en', 'English')], default='fr', max_length=2)),
                ('email_notifications', models.BooleanField(default=True)),
                ('courses_in_progress', models.PositiveIntegerField(default=0)),
                ('courses_completed', models.PositiveIntegerField(default=0)),
                ('certificates_count', models.PositiveIntegerField(default=0)),
                ('learning_minutes', models.PositiveIntegerField(default=0)),
                ('avg_quiz_score', models.PositiveIntegerField(default=0)),
                ('streak_days', models.PositiveIntegerField(default=0)),
                ('points', models.PositiveIntegerField(default=0)),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups')),
                ('manager', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reports', to=settings.AUTH_USER_MODEL)),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions')),
                ('department', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='members', to='accounts.department')),
                ('team', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='members', to='accounts.team')),
            ],
            options={
                'ordering': ['first_name', 'last_name'],
            },
            managers=[
                ('objects', apps.accounts.managers.UserManager()),
            ],
        ),
    ]
