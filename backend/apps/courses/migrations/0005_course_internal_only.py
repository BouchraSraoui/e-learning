from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0004_course_audience_course_department'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='internal_only',
            field=models.BooleanField(default=False),
        ),
    ]
