
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
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('enrollment', 'Enrollment'), ('certificate', 'Certificate'), ('badge', 'Badge'), ('comment_reply', 'Comment reply'), ('new_course', 'New course'), ('reminder', 'Reminder'), ('deadline', 'Deadline')], max_length=20)),
                ('title', models.CharField(max_length=200)),
                ('body', models.CharField(blank=True, max_length=400)),
                ('url', models.CharField(blank=True, max_length=300)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['recipient', 'is_read'], name='notificatio_recipie_4e3567_idx')],
            },
        ),
    ]
