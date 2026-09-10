
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0002_alter_lesson_file'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='issues_certificate',
            field=models.BooleanField(default=True),
        ),
    ]
